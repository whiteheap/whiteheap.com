/**
 * The hero field: a grid of bright tiles on the right that breaks apart
 * into drifting particles toward the left, drawn in black and white one
 * cell (2 CSS px) at a time, after the Whiteheap cover image.
 *
 * The canvas holds one pixel per cell and CSS scales it up with
 * `image-rendering: pixelated`. It redraws on every display frame (60 Hz,
 * or 120 Hz on a fast screen), stops while off screen or in a hidden tab,
 * and draws a single still frame when the reader prefers reduced motion.
 *
 * To fit a frame in a few milliseconds, `layout` works out everything that
 * does not move once per canvas size: which tile cells show, how bright
 * each one is, and where the grain sits. A frame then blends a coarse
 * noise lattice for the drifting texture, hashes only the cells whose
 * state is in doubt, and moves the particles.
 *
 * Motion is continuous. The sparkle keeps the rate it had when the field
 * drew at 15 fps: each cell re-rolls 15 times a second (the grain in the
 * dark bands 3.75 times), each at its own phase, so the shimmer never
 * ticks in step.
 */

const CELL = 2;
/** How often each cell re-rolls its sparkle, per second. */
const SPARKLE_HZ = 15;
const ROWS = 6;

function hash(x: number, y: number, z: number): number {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

type Particle = {
  x: number;
  y: number;
  originX: number;
  vx: number;
  vy: number;
  reach: number;
  size: number;
  hollow: boolean;
  bright: number;
};

type Layout = {
  w: number;
  h: number;
  cols: number;
  rows: number;
  tile: number;
  rowTop: number[];
  frontier: number[];
  dissolve: number;
  /** The tile region: cell columns i0 to cols, cell rows j0 to j0 + rh. */
  i0: number;
  j0: number;
  rw: number;
  rh: number;
  /**
   * Per region cell, row-major: the cell is lit when this exceeds
   * 0.54 * drift noise + 0.16 * sparkle. Zero or less means never lit.
   */
  threshold: Float64Array;
  /** Per region cell: its color when lit. */
  lit: Uint32Array;
  /** Per region cell: when in each sparkle period it re-rolls, 0 to 1. */
  phase: Float32Array;
  /** Grain cells in the dark bands and gaps, as pixel indices. */
  grain: Int32Array;
  grainPhase: Float32Array;
  dust: Int32Array;
  dustTone: Uint8Array;
  particles: Particle[];
  particlePhase: Float32Array;
  /** Drift noise scratch, refilled per frame. */
  colX: Int32Array;
  colU: Float64Array;
  rowY: Int32Array;
  rowV: Float64Array;
  /** Lattice values, refilled only when the drift crosses a lattice line. */
  lattice: Float64Array;
  latW: number;
  latX: number;
  latY: number;
};

const gray = (v: number) => {
  const g = Math.max(0, Math.min(255, v | 0));
  return 0xff000000 | (g << 16) | (g << 8) | g;
};

function layout(w: number, h: number, seed: number): Layout {
  const cols = Math.max(1, Math.ceil(w / CELL));
  const rows = Math.max(1, Math.ceil(h / CELL));
  // Narrow screens keep the grid in the upper part, so the tagline can
  // sit below it instead of under the tiles.
  const narrow = w / h < 1.15;
  const span = narrow ? h * 0.5 : h * 0.86;
  const tile = span / 7.64;
  const gap = tile * 0.16;
  const band = tile * 0.62;
  const period = tile + gap;
  const top = narrow ? h * 0.07 : (h - span) / 2;
  const rowTop: number[] = [];
  let y = top;
  for (let r = 0; r < ROWS; r++) {
    rowTop.push(y);
    y += tile + (r % 2 === 0 ? gap : band);
  }
  const reach = narrow
    ? [0.4, 0.4, 0.36, 0.36, 0.24, 0.24]
    : [0.745, 0.745, 0.735, 0.735, 0.63, 0.63];
  const frontier = reach.map((f, r) => w * f + (hash(r, 1, seed) - 0.5) * tile * 0.4);
  const rowBright = [0.88, 0.84, 0.79, 0.74, 0.62, 0.55];
  const dissolve = tile * 2.4;
  const right = w + tile * 0.35;

  const cellRow = new Int8Array(rows).fill(-1);
  for (let j = 0; j < rows; j++) {
    const py = (j + 0.5) * CELL;
    for (let r = 0; r < ROWS; r++) {
      if (py >= rowTop[r] && py < rowTop[r] + tile) {
        cellRow[j] = r;
        break;
      }
    }
  }
  // Per cell column: the tile column (0 = rightmost) it falls in, or -1 in a gap.
  const cellCol = new Int16Array(cols).fill(-1);
  for (let i = 0; i < cols; i++) {
    const u = right - (i + 0.5) * CELL;
    if (u < 0) continue;
    const k = Math.floor(u / period);
    if (u - k * period >= gap) cellCol[i] = k;
  }

  const regionX = Math.max(0, Math.min(...frontier) - dissolve);
  const i0 = Math.min(cols, Math.floor(regionX / CELL));
  const j0 = Math.max(0, Math.floor((rowTop[0] - gap) / CELL));
  const j1 = Math.min(rows, Math.ceil((rowTop[ROWS - 1] + tile + gap) / CELL));
  const rw = cols - i0;
  const rh = Math.max(0, j1 - j0);

  // Everything about the tiles that does not move.
  const threshold = new Float64Array(rw * rh);
  const lit = new Uint32Array(rw * rh);
  const phase = new Float32Array(rw * rh);
  const grain: number[] = [];
  const grainPhase: number[] = [];
  for (let jj = 0; jj < rh; jj++) {
    const j = j0 + jj;
    const r = cellRow[j];
    const py = (j + 0.5) * CELL;
    for (let ii = 0; ii < rw; ii++) {
      const i = i0 + ii;
      const px = (i + 0.5) * CELL;
      const k = cellCol[i];
      if (r < 0 || k < 0) {
        // The dark bands and gaps between tiles carry a fine grain.
        const density = 0.13 * smoothstep(regionX, regionX + dissolve + tile, px);
        if (hash(i, j, seed + 21) < density) {
          grain.push(j * cols + i);
          grainPhase.push(hash(i, j, seed + 31));
        }
        continue;
      }
      const edge = frontier[r];
      const d = px >= edge ? 0 : Math.min(1, (edge - px) / dissolve);
      if (d >= 1) continue;
      if (d > 0 && noise(px / (tile * 0.17), py / (tile * 0.17), seed + 5) < d * 1.05) continue;
      const centre = right - k * period - gap - tile / 2;
      const across = 0.5 + 0.5 * smoothstep(edge, edge + tile * 3, centre);
      const jitter = 0.92 + 0.16 * hash(r, k, seed + 7);
      const b = rowBright[r] * across * jitter * Math.pow(1 - d, 1.25);
      const c = jj * rw + ii;
      threshold[c] = b - 0.3 * hash(i, j, seed + 4);
      lit[c] = gray(110 + 145 * b);
      phase[c] = hash(i, j, seed + 31);
    }
  }

  // Faint dust over the whole field, denser toward the grid.
  const dust: number[] = [];
  const tones: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = i * CELL;
      const density = 0.003 + 0.016 * smoothstep(w * 0.3, w, px);
      if (hash(i, j, seed + 11) < density) {
        dust.push(j * cols + i);
        tones.push(30 + 80 * hash(i, j, seed + 12));
      }
    }
  }

  const count = Math.round(Math.min(520, Math.max(140, (w * h) / 2600)));
  const particles: Particle[] = [];
  const particlePhase = new Float32Array(count);
  for (let n = 0; n < count; n++) {
    const p = spawn(n, seed, w, tile, rowTop, frontier, dissolve);
    // Start the field already populated: most particles near the grid.
    const travel = Math.pow(hash(n, 3, seed), 1.7) * p.reach;
    p.x -= travel;
    p.y += p.vy * (travel / -p.vx);
    particles.push(p);
    particlePhase[n] = hash(n, 13, seed);
  }

  // The drift noise has one lattice line every 2.5 cells; two spare lines
  // on each axis cover the neighbours of the last cell.
  const latW = Math.ceil(rw * CELL * 0.2) + 3;
  const latH = Math.ceil(rh * CELL * 0.2) + 3;

  return {
    w,
    h,
    cols,
    rows,
    tile,
    rowTop,
    frontier,
    dissolve,
    i0,
    j0,
    rw,
    rh,
    threshold,
    lit,
    phase,
    grain: Int32Array.from(grain),
    grainPhase: Float32Array.from(grainPhase),
    dust: Int32Array.from(dust),
    dustTone: Uint8Array.from(tones),
    particles,
    particlePhase,
    colX: new Int32Array(rw),
    colU: new Float64Array(rw),
    rowY: new Int32Array(rh),
    rowV: new Float64Array(rh),
    lattice: new Float64Array(latW * latH),
    latW,
    latX: Number.NaN,
    latY: Number.NaN,
  };
}

function spawn(
  n: number,
  seed: number,
  w: number,
  tile: number,
  rowTop: number[],
  frontier: number[],
  dissolve: number,
): Particle {
  const r = Math.floor(Math.random() * ROWS);
  const originX = frontier[r] - Math.random() * dissolve * 0.6;
  const roll = Math.random();
  const special = hash(n, 9, seed) < 0.035;
  return {
    x: originX,
    y: rowTop[r] + Math.random() * tile,
    originX,
    vx: -(10 + 46 * Math.random()),
    vy: (Math.random() - 0.5) * 7,
    reach: (0.16 + 0.5 * Math.random() * Math.random()) * w * 0.62,
    size: special ? 4 : roll < 0.62 ? 1 : roll < 0.92 ? 2 : 3,
    hollow: special,
    bright: 0.7 + 0.3 * Math.random(),
  };
}

/**
 * Samples the drifting texture noise for the frame: the same value noise
 * as `noise(px * 0.2 + drift, py * 0.2 - drift * 0.6, seed + 3)`, with the
 * per-column and per-row terms worked out once instead of per cell.
 */
function prepareDrift(L: Layout, drift: number, seed: number) {
  const { i0, j0, rw, rh, colX, colU, rowY, rowV, latW } = L;
  const latX = Math.floor((i0 + 0.5) * CELL * 0.2 + drift);
  const latY = Math.floor((j0 + 0.5) * CELL * 0.2 - drift * 0.6);
  if (latX !== L.latX || latY !== L.latY) {
    const latH = L.lattice.length / latW;
    for (let y = 0; y < latH; y++) {
      for (let x = 0; x < latW; x++) {
        L.lattice[y * latW + x] = hash(latX + x, latY + y, seed + 3);
      }
    }
    L.latX = latX;
    L.latY = latY;
  }
  for (let ii = 0; ii < rw; ii++) {
    const x = (i0 + ii + 0.5) * CELL * 0.2 + drift;
    const xi = Math.floor(x);
    const xf = x - xi;
    colX[ii] = xi - latX;
    colU[ii] = xf * xf * (3 - 2 * xf);
  }
  for (let jj = 0; jj < rh; jj++) {
    const y = (j0 + jj + 0.5) * CELL * 0.2 - drift * 0.6;
    const yi = Math.floor(y);
    const yf = y - yi;
    rowY[jj] = (yi - latY) * latW;
    rowV[jj] = yf * yf * (3 - 2 * yf);
  }
}

function draw(L: Layout, pixels: Uint32Array, t: number, seed: number) {
  const { cols, rows, i0, j0, rw, rh, threshold, lit, phase, lattice, latW } = L;
  const { colX, colU, rowY, rowV } = L;
  const sparkle = t * SPARKLE_HZ;
  pixels.fill(gray(0));

  for (let n = 0; n < L.dust.length; n++) {
    const idx = L.dust[n];
    const twinkle = 0.55 + 0.45 * Math.sin(t * 0.9 + (idx % 97));
    pixels[idx] = gray(L.dustTone[n] * twinkle);
  }

  // The grain re-rolls at a quarter of the sparkle rate.
  for (let n = 0; n < L.grain.length; n++) {
    const idx = L.grain[n];
    const j = (idx / cols) | 0;
    const i = idx - j * cols;
    const roll = (sparkle / 4 + L.grainPhase[n]) | 0;
    pixels[idx] = gray(48 + 46 * hash(i, j, roll));
  }

  prepareDrift(L, t * 0.55, seed);
  for (let jj = 0; jj < rh; jj++) {
    const out = (j0 + jj) * cols + i0;
    const row = jj * rw;
    const ly = rowY[jj];
    const v = rowV[jj];
    for (let ii = 0; ii < rw; ii++) {
      const s = threshold[row + ii];
      if (s <= 0) continue;
      // The texture term is at most 0.54 + 0.16, so a brighter cell always shows.
      if (s <= 0.7) {
        const p = ly + colX[ii];
        const a = lattice[p];
        const b = lattice[p + 1];
        const c = lattice[p + latW];
        const d = lattice[p + latW + 1];
        const u = colU[ii];
        const drift = 0.54 * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
        if (s <= drift) continue;
        if (s <= drift + 0.16) {
          const roll = (sparkle + phase[row + ii]) | 0;
          if (s <= drift + 0.16 * hash(i0 + ii, j0 + jj, roll)) continue;
        }
      }
      pixels[out + ii] = lit[row + ii];
    }
  }

  for (let n = 0; n < L.particles.length; n++) {
    const p = L.particles[n];
    const travelled = p.originX - p.x;
    const alpha = Math.pow(Math.max(0, 1 - travelled / p.reach), 1.3) * p.bright;
    if (alpha <= 0.02) continue;
    const ci = Math.floor(p.x / CELL);
    const cj = Math.floor(p.y / CELL);
    const roll = (sparkle + L.particlePhase[n]) | 0;
    const color = gray(255 * Math.min(1, alpha + 0.3));
    for (let dy = 0; dy < p.size; dy++) {
      for (let dx = 0; dx < p.size; dx++) {
        if (p.hollow && dx > 0 && dx < p.size - 1 && dy > 0 && dy < p.size - 1) continue;
        const i = ci + dx;
        const j = cj + dy;
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
        if (!p.hollow && alpha < hash(i + n, j, roll) * 0.85) continue;
        pixels[j * cols + i] = color;
      }
    }
  }
}

function advance(L: Layout, dt: number, seed: number) {
  for (let n = 0; n < L.particles.length; n++) {
    const p = L.particles[n];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.originX - p.x > p.reach || p.x < -8) {
      L.particles[n] = spawn(n, seed, L.w, L.tile, L.rowTop, L.frontier, L.dissolve);
    }
  }
}

export function start(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  const seed = 1 + Math.floor(Math.random() * 1e6);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let L: Layout | null = null;
  let image: ImageData | null = null;
  let pixels: Uint32Array | null = null;
  let visible = true;
  let raf = 0;
  let last = 0;
  let t = 0;

  const render = () => {
    if (!L || !image || !pixels) return;
    draw(L, pixels, t, seed);
    ctx.putImageData(image, 0, 0);
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    if (w === 0 || h === 0 || (L && L.w === w && L.h === h)) return;
    L = layout(w, h, seed);
    canvas.width = L.cols;
    canvas.height = L.rows;
    image = ctx.createImageData(L.cols, L.rows);
    pixels = new Uint32Array(image.data.buffer);
    render();
  };

  const tick = (now: number) => {
    raf = 0;
    if (!visible || still.matches || document.hidden) return;
    // A long gap (a dropped frame, a stalled tab) moves the field at most 0.1 s.
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    if (L) advance(L, dt, seed);
    render();
    raf = requestAnimationFrame(tick);
  };

  const run = () => {
    if (raf || !visible || still.matches || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  new ResizeObserver(() => {
    resize();
  }).observe(canvas);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    run();
  }).observe(canvas);
  document.addEventListener("visibilitychange", run);
  still.addEventListener("change", () => {
    render();
    run();
  });
  resize();
  run();
}
