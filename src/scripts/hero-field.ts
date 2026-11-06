/**
 * The hero field: a grid of bright tiles on the right that breaks apart
 * into drifting particles toward the left, drawn in black and white one
 * cell (2 CSS px) at a time, after the Whiteheap cover image.
 *
 * The canvas holds one pixel per cell and CSS scales it up with
 * `image-rendering: pixelated`, so a frame touches ~0.3M cells at most.
 * It redraws at 15 fps, stops while off screen or in a hidden tab, and
 * draws a single still frame when the reader prefers reduced motion.
 */

const CELL = 2;
const FPS = 15;
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
  period: number;
  gap: number;
  right: number;
  rowTop: number[];
  rowBright: number[];
  frontier: number[];
  dissolve: number;
  /** Per cell row: the tile row it falls in, or -1. */
  cellRow: Int8Array;
  /** Per cell column: the tile column (0 = rightmost) it falls in, or -1 in a gap. */
  cellCol: Int16Array;
  regionX: number;
  regionTop: number;
  regionBottom: number;
  dust: Int32Array;
  dustTone: Uint8Array;
  particles: Particle[];
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
  const cellCol = new Int16Array(cols).fill(-1);
  for (let i = 0; i < cols; i++) {
    const u = right - (i + 0.5) * CELL;
    if (u < 0) continue;
    const k = Math.floor(u / period);
    if (u - k * period >= gap) cellCol[i] = k;
  }

  const minFrontier = Math.min(...frontier);
  const regionX = Math.max(0, minFrontier - dissolve);
  const regionTop = rowTop[0] - gap;
  const regionBottom = rowTop[ROWS - 1] + tile + gap;

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
  for (let n = 0; n < count; n++) {
    const p = spawn(n, seed, w, tile, rowTop, frontier, dissolve);
    // Start the field already populated: most particles near the grid.
    const travel = Math.pow(hash(n, 3, seed), 1.7) * p.reach;
    p.x -= travel;
    p.y += p.vy * (travel / -p.vx);
    particles.push(p);
  }

  return {
    w,
    h,
    cols,
    rows,
    tile,
    period,
    gap,
    right,
    rowTop,
    rowBright,
    frontier,
    dissolve,
    cellRow,
    cellCol,
    regionX,
    regionTop,
    regionBottom,
    dust: Int32Array.from(dust),
    dustTone: Uint8Array.from(tones),
    particles,
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

function draw(L: Layout, pixels: Uint32Array, t: number, frame: number, seed: number) {
  const { cols, rows, tile, period, gap, right, rowTop, rowBright, frontier, dissolve } = L;
  pixels.fill(gray(0));

  for (let n = 0; n < L.dust.length; n++) {
    const idx = L.dust[n];
    const twinkle = 0.55 + 0.45 * Math.sin(t * 0.9 + (idx % 97));
    pixels[idx] = gray(L.dustTone[n] * twinkle);
  }

  const i0 = Math.floor(L.regionX / CELL);
  const j0 = Math.max(0, Math.floor(L.regionTop / CELL));
  const j1 = Math.min(rows, Math.ceil(L.regionBottom / CELL));
  const drift = t * 0.55;
  for (let j = j0; j < j1; j++) {
    const r = L.cellRow[j];
    const py = (j + 0.5) * CELL;
    for (let i = i0; i < cols; i++) {
      const px = (i + 0.5) * CELL;
      const idx = j * cols + i;
      const k = L.cellCol[i];
      if (r < 0 || k < 0) {
        // The dark bands and gaps between tiles carry a fine grain.
        const grain = 0.13 * smoothstep(L.regionX, L.regionX + dissolve + tile, px);
        if (hash(i, j, seed + 21) < grain) {
          pixels[idx] = gray(48 + 46 * hash(i, j, frame >> 2));
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
      const texture =
        0.54 * noise(px * 0.2 + drift, py * 0.2 - drift * 0.6, seed + 3) +
        0.3 * hash(i, j, seed + 4) +
        0.16 * hash(i, j, frame);
      if (b > texture) pixels[idx] = gray(110 + 145 * b);
    }
  }

  for (let n = 0; n < L.particles.length; n++) {
    const p = L.particles[n];
    const travelled = p.originX - p.x;
    const alpha = Math.pow(Math.max(0, 1 - travelled / p.reach), 1.3) * p.bright;
    if (alpha <= 0.02) continue;
    const ci = Math.floor(p.x / CELL);
    const cj = Math.floor(p.y / CELL);
    for (let dy = 0; dy < p.size; dy++) {
      for (let dx = 0; dx < p.size; dx++) {
        if (p.hollow && dx > 0 && dx < p.size - 1 && dy > 0 && dy < p.size - 1) continue;
        const i = ci + dx;
        const j = cj + dy;
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
        if (!p.hollow && alpha < hash(i + n, j, frame) * 0.85) continue;
        pixels[j * cols + i] = gray(255 * Math.min(1, alpha + 0.3));
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
  let frame = 0;

  const render = () => {
    if (!L || !image || !pixels) return;
    draw(L, pixels, t, frame, seed);
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
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    if (dt === 0 || dt >= 1 / FPS) {
      last = now;
      t += dt;
      frame++;
      if (L) advance(L, dt, seed);
      render();
    }
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
