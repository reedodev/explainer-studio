import { existsSync } from "node:fs";
/**
 * Shared geometry, noise, easing and font helpers used by every visual style.
 * Nothing here knows about a particular look; styles live in src/render/styles/.
 */
import path from "node:path";
import { createCanvas, GlobalFonts, type Canvas } from "@napi-rs/canvas";
import { FONT_DIR } from "../config.js";

export type Pt = [number, number];
export type Ctx = any; // SKRSContext2D (kept loose so styles can use the full canvas API)
export type Cnv = Canvas;

/* ------------------------------------------------------------------ fonts */

let fontsDone = false;
/** Registers every bundled OFL font once. Family names are referenced by styles. */
export function registerFonts() {
  if (fontsDone) return;
  fontsDone = true;
  const reg = (file: string, family: string) => {
    try {
      GlobalFonts.registerFromPath(path.join(FONT_DIR, file), family);
    } catch {
      /* missing optional font: canvas falls back to Korean system font */
    }
  };
  reg("Gaegu-Regular.ttf", "WB Hand");
  reg("Gaegu-Bold.ttf", "WB Hand Bold");
  reg("NanumGothic-Bold.ttf", "WB Gothic");
  reg("NanumGothic-ExtraBold.ttf", "WB Gothic XB");
  reg("IBMPlexSansKR-Regular.ttf", "WB Sans");
  reg("IBMPlexSansKR-Medium.ttf", "WB Sans Medium");
  reg("IBMPlexSansKR-Bold.ttf", "WB Sans Bold");
  reg("NanumMyeongjo-Regular.ttf", "WB Serif");
  reg("NanumMyeongjo-Bold.ttf", "WB Serif Bold");
  reg("NanumMyeongjo-ExtraBold.ttf", "WB Serif XB");
  reg("NanumPenScript-Regular.ttf", "WB Pen");
  reg("NanumGothicCoding-Regular.ttf", "WB Mono");
  reg("NanumGothicCoding-Bold.ttf", "WB Mono Bold");
  reg("BlackHanSans-Regular.ttf", "WB Display");
  try {
    for (const sys of ["C:/Windows/Fonts/malgun.ttf", "/System/Library/Fonts/AppleSDGothicNeo.ttc", "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]) { if (existsSync(sys)) { GlobalFonts.registerFromPath(sys, "Korean"); break; } }
  } catch {
    /* non-Windows */
  }
}
export const font = (size: number, family: string) => `${Math.round(size)}px "${family}", "Korean"`;

/* --------------------------------------------------------------- math/ease */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** CSS-style cubic-bezier(x1,y1,x2,y2) easing. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    x = clamp01(x);
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid; else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}
/** "Precise" snap ease used by Swiss-style motion: cubic-bezier(.7,0,.2,1). */
export const snapEase = cubicBezier(0.7, 0, 0.2, 1);

/** Deterministic PRNG (xorshift32). */
export function rng(seed: number) {
  let s = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
export function hash2(x: number, y: number, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth value noise in [0,1]. */
export function noise2(x: number, y: number, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x: number, y: number, oct = 4, seed = 0) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise2(x * f, y * f, seed + i * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

/* ---------------------------------------------------------------- paths */

export function polyLength(pts: Pt[]) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
}
/** Leading part of a polyline covering fraction p of its length. */
export function partialPath(pts: Pt[], p: number): Pt[] {
  if (p >= 1) return pts;
  if (p <= 0 || pts.length < 2) return [];
  const target = polyLength(pts) * p;
  const out: Pt[] = [pts[0]];
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (run + seg >= target) {
      const k = seg ? (target - run) / seg : 0;
      out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
      return out;
    }
    run += seg;
    out.push(pts[i]);
  }
  return out;
}
/** Resample a polyline at a fixed spacing (keeps both endpoints). */
export function resample(pts: Pt[], step: number): Pt[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= seg) {
      const k = d / seg;
      out.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
      d += step;
    }
    carry = seg - (d - step);
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > 0.5) out.push(last);
  return out;
}
export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n = 96, start = -Math.PI / 2, sweep = Math.PI * 2): Pt[] {
  return Array.from({ length: n + 1 }, (_, k) => [cx + rx * Math.cos(start + (sweep * k) / n), cy + ry * Math.sin(start + (sweep * k) / n)] as Pt);
}
/** Closed rounded rectangle, starting at the middle of the left edge and running clockwise over the top. */
export function roundRectPts(x: number, y: number, w: number, h: number, r = 18, step = 8): Pt[] {
  r = Math.max(1, Math.min(r, w / 2, h / 2));
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= 6; k++) pts.push([cx + r * Math.cos(a0 + (k * Math.PI) / 12), cy + r * Math.sin(a0 + (k * Math.PI) / 12)] as Pt);
  };
  corner(x + r, y + r, Math.PI);
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  pts.push([x, y + r] as Pt);
  return resample(pts, step);
}
/**
 * Ring drawn around a highlight box. Normally an ellipse (px / py grow it beyond the box); when the box carries
 * `rect` (a chart bar together with its labels) it is a rounded rectangle hugging the box, so it never cuts through
 * the labels, the neighbouring bars or the footnote the way a narrowing ellipse does.
 */
export function ringPts(b: { x: number; y: number; w: number; h: number; rect?: boolean }, px: number, py: number, n = 96, start = -Math.PI / 2, sweep = Math.PI * 2): Pt[] {
  if (b.rect) {
    const pad = 4;
    return roundRectPts(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 18);
  }
  return ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + px, b.h / 2 + py, n, start, sweep);
}
export function strokePoly(c: Ctx, pts: Pt[]) {
  if (pts.length < 2) return;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}
export function fillPoly(c: Ctx, pts: Pt[]) {
  if (pts.length < 3) return;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
}
/** Closed outline of a rect / ellipse, perturbed by noise (for paper, wash and ink blobs). */
export function blobPts(kind: "rect" | "ellipse", x: number, y: number, w: number, h: number, amp: number, seed: number, freq = 0.02): Pt[] {
  const base: Pt[] = kind === "ellipse" ? ellipsePts(x + w / 2, y + h / 2, w / 2, h / 2, 140).slice(0, -1) : resample(rectPts(x, y, w, h), 10).slice(0, -1);
  const cx = x + w / 2, cy = y + h / 2;
  return base.map(([px, py]) => {
    const n = (fbm(px * freq, py * freq, 3, seed) - 0.5) * 2 * amp;
    const d = Math.hypot(px - cx, py - cy) || 1;
    return [px + ((px - cx) / d) * n, py + ((py - cy) / d) * n] as Pt;
  });
}
/** Offset polyline to a ribbon polygon with a per-point half-width function. */
export function ribbon(pts: Pt[], half: (i: number, n: number) => number): Pt[] {
  const L: Pt[] = [], R: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = half(i, n);
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return L.concat(R.reverse());
}

/* ---------------------------------------------------------------- texture */

const texCache = new Map<string, Cnv>();
/** Cached full-frame texture produced by `paint` (per key). */
export function cachedTexture(key: string, W: number, H: number, paint: (c: Ctx, W: number, H: number) => void): Cnv {
  const k = `${key}:${W}x${H}`;
  let cv = texCache.get(k);
  if (!cv) {
    cv = createCanvas(W, H);
    paint(cv.getContext("2d"), W, H);
    texCache.set(k, cv);
  }
  return cv;
}
/** Paints fbm mottling into an ImageData-backed canvas: colour(r,g,b) ± amp. */
export function paintMottled(c: Ctx, W: number, H: number, rgb: [number, number, number], amp: number, seed: number, scale = 0.0025, grain = 0) {
  const img = c.createImageData(W, H);
  const d = img.data;
  const step = 4; // compute noise on a coarse grid then fill blocks for speed
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const n = (fbm(x * scale, y * scale, 4, seed) - 0.5) * 2 * amp;
      for (let yy = y; yy < Math.min(H, y + step); yy++) {
        for (let xx = x; xx < Math.min(W, x + step); xx++) {
          const g = grain ? (hash2(xx, yy, seed) - 0.5) * grain : 0;
          const i = (yy * W + xx) * 4;
          d[i] = Math.max(0, Math.min(255, rgb[0] * (1 + n) + g));
          d[i + 1] = Math.max(0, Math.min(255, rgb[1] * (1 + n) + g));
          d[i + 2] = Math.max(0, Math.min(255, rgb[2] * (1 + n) + g));
          d[i + 3] = 255;
        }
      }
    }
  }
  c.putImageData(img, 0, 0);
}
export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function vignette(c: Ctx, W: number, H: number, color: string, strength: number) {
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)");
  const [r, gg, b] = hexRgb(color);
  g.addColorStop(1, `rgba(${r},${gg},${b},${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}
