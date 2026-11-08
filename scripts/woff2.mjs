// The characters a WOFF2 font holds: each codepoint its cmap maps to a glyph.
// It reads the WOFF2 container (https://www.w3.org/TR/WOFF2/) with Node's own
// Brotli, so the site check needs no font tool. WOFF2 never transforms the
// cmap table, so it is read as stored.

import { brotliDecompressSync } from "node:zlib";

/** A UIntBase128 from the table directory, advancing `at.offset`. */
function base128(bytes, at) {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = bytes[at.offset];
    at.offset += 1;
    if (i === 0 && byte === 0x80) throw new Error("WOFF2: a UIntBase128 with a leading zero");
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error("WOFF2: a UIntBase128 longer than 5 bytes");
}

/** The codepoints a cmap table maps to a glyph other than .notdef. */
function cmapCodepoints(table) {
  const records = Array.from({ length: table.readUInt16BE(2) }, (_, i) => ({
    platform: table.readUInt16BE(4 + i * 8),
    encoding: table.readUInt16BE(6 + i * 8),
    offset: table.readUInt32BE(8 + i * 8),
  }));
  // The subtable a browser reads: full Unicode first, then the BMP only.
  const pick = (platform, encoding) => records.find((r) => r.platform === platform && r.encoding === encoding);
  const record = pick(3, 10) ?? pick(0, 4) ?? pick(3, 1) ?? pick(0, 3);
  if (!record) throw new Error("cmap: no Unicode subtable");
  const sub = table.subarray(record.offset);
  const format = sub.readUInt16BE(0);
  const held = new Set();
  if (format === 12) {
    for (let i = 0; i < sub.readUInt32BE(12); i += 1) {
      const start = sub.readUInt32BE(16 + i * 12);
      const end = sub.readUInt32BE(20 + i * 12);
      const glyph = sub.readUInt32BE(24 + i * 12);
      for (let c = start; c <= end; c += 1) if (glyph + (c - start) !== 0) held.add(c);
    }
  } else if (format === 4) {
    const segments = sub.readUInt16BE(6) / 2;
    const starts = 16 + segments * 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    for (let s = 0; s < segments; s += 1) {
      const end = sub.readUInt16BE(14 + s * 2);
      const start = sub.readUInt16BE(starts + s * 2);
      const delta = sub.readInt16BE(deltas + s * 2);
      const range = sub.readUInt16BE(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c += 1) {
        const index = range === 0 ? c : sub.readUInt16BE(ranges + s * 2 + range + (c - start) * 2);
        const glyph = range !== 0 && index === 0 ? 0 : (index + delta) & 0xffff;
        if (glyph !== 0) held.add(c);
      }
    }
  } else {
    throw new Error(`cmap: format ${format}; this reads formats 4 and 12`);
  }
  return held;
}

/** The set of codepoints the WOFF2 font in `bytes` holds. */
export function woff2Codepoints(bytes) {
  if (bytes.toString("latin1", 0, 4) !== "wOF2") throw new Error("not a WOFF2 file");
  if (bytes.toString("latin1", 4, 8) === "ttcf") throw new Error("WOFF2: a font collection; this reads one font");
  const at = { offset: 48 };
  let stored = 0;
  let cmap;
  for (let i = 0; i < bytes.readUInt16BE(12); i += 1) {
    const flags = bytes[at.offset];
    at.offset += 1;
    let tag = { 0: "cmap", 10: "glyf", 11: "loca" }[flags & 0x3f];
    if ((flags & 0x3f) === 0x3f) {
      tag = bytes.toString("latin1", at.offset, at.offset + 4);
      at.offset += 4;
    }
    const length = base128(bytes, at);
    // glyf and loca are transformed unless their version is 3; any other
    // table is transformed unless its version is 0.
    const version = flags >> 6;
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    const size = transformed ? base128(bytes, at) : length;
    if (tag === "cmap") cmap = { offset: stored, size };
    stored += size;
  }
  if (!cmap) throw new Error("WOFF2: no cmap table");
  const tables = brotliDecompressSync(bytes.subarray(at.offset, at.offset + bytes.readUInt32BE(20)));
  return cmapCodepoints(tables.subarray(cmap.offset, cmap.offset + cmap.size));
}
