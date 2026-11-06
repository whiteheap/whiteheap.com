import type { APIRoute } from "astro";
import { markHeight, markRects, markWidth } from "../lib/mark";

// The mark in white on a black rounded square, so it stays visible on light browser chrome.
const SIZE = 96;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="18" fill="#000"/>${markRects(
  "#fff",
  (SIZE - markWidth) / 2,
  (SIZE - markHeight) / 2,
)}</svg>`;

export const GET: APIRoute = () =>
  new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
