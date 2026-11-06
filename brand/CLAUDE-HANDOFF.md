# Whiteheap logo kit — Claude handoff

## What this is
Assets for the Whiteheap mark from the current public X profile [@whiteheaphq](https://x.com/whiteheaphq).

Two families:

1. **CLEAN geometric SVG** — flat black/white cells, no grain.
2. **X TEXTURED** — the distressed spray/speckle look on X.

## Geometry (all clean + textured recreations)
- Three centered tiers, each **2 rows** of square cells
- Columns: **top 5 · middle 7 · bottom 11**
- Master unit grid: `CELL=7`, `GUTTER=1`, `TIER_GAP=6`
- Flat pure black/white only — **no gradients**

## X textured family (the effect on X)

| File | What it is |
|------|------------|
| `x-textured-original-1024.jpg` | **Exact** current X avatar raster, native **1024×1024** (not upscaled) |
| `x-textured-original-1024.png` | Lossless PNG conversion of the same native 1024 |
| `x-textured-original-400.jpg` | Exact current X profile download, native **400×400** |
| `x-textured-original-1024.raster.svg` | SVG wrapper **embedding** the 1024 PNG — **NOT** pure vector, **NOT** infinitely scalable |
| `whiteheap-avatar-textured-scalable.svg` | **Particle/dither recreation** (deterministic white square dots). Approximates dusty halo + distressed cells. Scalable, but **not pixel-exact** to X |
| `whiteheap-avatar-textured-scalable-{1024,2048,4096}.png` | Renders from the scalable particle SVG (true vector renders, not low-res upscales) |
| `header-logo-textured.svg` | Optional textured header mark (does **not** replace clean `header-logo.svg`) |
| `og-textured-optional.png` | Optional OG with textured header mark (does **not** replace clean `og.png`) |

`whiteheap-avatar-textured-approx.svg` is **deprecated** (stub pointing to scalable).

## Clean family (unchanged role)
- `whiteheap-mark-master.svg`, black/white marks, `whiteheap-avatar-white-on-black.svg`
- `header-logo.svg`, `header-logo-lockup.svg`
- `favicon.svg` (simplified solid bars), `apple-touch-icon.png` **180×180** — stay **clean** for tiny readability
- `og.png` — clean header-mark composite

## Fidelity rules
- Exact X grain = **ORIGINAL jpg/png/raster.svg only**
- Scalable textured = **approximation** via particles (no gradients/blur glow)
- Do not label ORIGINAL upscales or raster-embedded SVG as “pure vector”
- Do not invent brand rules beyond B/W + this geometry

## Live site note
whiteheap.com header/favicon/apple/OG still used an older fragmented mark when inspected; this kit targets the **current X pyramid + grain**.
