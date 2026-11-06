// The Whiteheap mark, as on the X avatar (x.com/whiteheaphq): a heap of square
// tiles in three tiers of two rows, each tier wider than the one above by the
// same step on both sides. The header logo and /favicon.svg both draw from here.

const TILE = 6;
const GAP = 1;
/** Space between tiers. */
const BAND = 5;
const PITCH = TILE + GAP;

/** Columns per tier, top to bottom, and the opacity of each of its two rows. */
const TIERS = [
  { columns: 5, rows: [1, 0.94] },
  { columns: 8, rows: [0.9, 0.84] },
  { columns: 11, rows: [0.8, 0.74] },
] as const;

const WIDEST = 11;
const TIER_HEIGHT = 2 * TILE + GAP;

export const markWidth = WIDEST * PITCH - GAP;
export const markHeight = TIERS.length * TIER_HEIGHT + (TIERS.length - 1) * BAND;

export interface MarkTile {
  x: number;
  y: number;
  opacity: number;
}

export const markTiles: MarkTile[] = TIERS.flatMap((tier, t) => {
  const left = ((WIDEST - tier.columns) * PITCH) / 2;
  const top = t * (TIER_HEIGHT + BAND);
  return tier.rows.flatMap((opacity, r) =>
    Array.from({ length: tier.columns }, (_, c) => ({
      x: left + c * PITCH,
      y: top + r * PITCH,
      opacity,
    })),
  );
});

/** The tiles as SVG rects, filled with `fill`, shifted by (dx, dy). */
export function markRects(fill: string, dx = 0, dy = 0): string {
  return markTiles
    .map(
      (tile) =>
        `<rect x="${tile.x + dx}" y="${tile.y + dy}" width="${TILE}" height="${TILE}" fill="${fill}" fill-opacity="${tile.opacity}"/>`,
    )
    .join("");
}
