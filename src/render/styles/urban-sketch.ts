/**
 * urban-sketch: a sketchbook page. Fine sepia fineliner that wobbles, overshoots and leaves small
 * gaps; loose transparent watercolour dropped on top, slightly off the lines, spreading in after
 * the ink; handwritten notes; watercolour bleeds as transitions.
 */
import { blobPts, cachedTexture, clamp01, easeInOutCubic, easeOutCubic, ellipsePts, fbm, fillPoly, hexRgb, paintMottled, partialPath, rectPts, resample, rng, strokePoly, vignette, type Pt } from "../core.js";
import { bandSubtitle, genericCover, processedImage, revealText } from "./shared.js";
import type { StyleDef, Token } from "./types.js";

const PAPER = "#F5EEDE", INK = "#2B2520";
const WASH: Record<string, string> = { yellow: "#E8C35E", blue: "#86B3D6", green: "#A9BF5A", red: "#E1907E", grey: "#BDB5A6", black: "#4a4038", white: "#F5EEDE" };

const wobbleCache = new Map<string, Pt[]>();
/** Pen line: resampled centreline with low-frequency wobble and an overshoot past both ends. */
function penLine(pts: Pt[], seed: number): Pt[] {
  const key = JSON.stringify(pts) + seed;
  let out = wobbleCache.get(key);
  if (out) return out;
  const r = rng(seed);
  const s = resample(pts, 6);
  const n = s.length;
  const ext = (a: Pt, b: Pt, k: number): Pt => {
    const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1;
    return [a[0] + (dx / d) * k, a[1] + (dy / d) * k];
  };
  const over1 = 3 + r() * 6, over2 = 3 + r() * 6;
  const core = s.map((q, i) => {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = (fbm(i * 0.11, seed * 0.37, 3, seed) - 0.5) * 6.5;
    return [q[0] - dy * w, q[1] + dx * w] as Pt;
  });
  out = n > 1 ? [ext(core[0], core[1], over1), ...core, ext(core[n - 1], core[n - 2], over2)] : core;
  wobbleCache.set(key, out);
  return out;
}

function watercolor(c: any, kind: "rect" | "ellipse", x: number, y: number, w: number, h: number, token: Token, p: number, seed: number) {
  if (token === "white" || p <= 0) return;
  const col = WASH[token] ?? WASH.grey;
  const e = easeOutCubic(p);
  const r = rng(seed);
  const ox = (r() - 0.3) * 10, oy = (r() - 0.3) * 8; // colour sits slightly off the lines
  const cx = x + w / 2 + ox, cy = y + h / 2 + oy;
  c.save();
  c.globalCompositeOperation = "multiply";
  for (let layer = 0; layer < 3; layer++) {
    const pts = blobPts(kind, x + ox + 4, y + oy + 4, w - 8, h - 8, 6 + layer * 5, seed + layer * 31, 0.025);
    const sc = 0.55 + 0.45 * e;
    c.fillStyle = col;
    c.globalAlpha = (layer === 0 ? 0.42 : 0.18) * e;
    const P = pts.map(([px, py]) => [cx + (px - cx) * sc, cy + (py - cy) * sc] as Pt);
    fillPoly(c, P);
    if (layer === 0 && e > 0.6) {
      // dried pigment edge
      c.strokeStyle = col;
      c.globalAlpha = 0.35 * (e - 0.6) / 0.4;
      c.lineWidth = 2;
      c.beginPath();
      P.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.closePath();
      c.stroke();
    }
  }
  c.restore();
}

export const urbanSketch: StyleDef = {
  id: "urban-sketch",
  name: "Urban Sketch · Pen & Wash",
  nameKo: "펜 담채 스케치",
  summary: "크림색 스케치북에 세피아 펜선, 선을 살짝 벗어나 번지는 투명 수채, 손글씨 메모",
  bestFor: "일상·경험담, 여행·공간, 따뜻한 에세이형 설명, 라이프스타일",
  font: (role) => (role === "caption" ? { family: "WB Pen", scale: 1.25 } : { family: "WB Pen", scale: 1.3 }),
  ink: (token) => (token === "red" ? "#A2412E" : INK),
  textColor: () => INK,
  background(c, env) {
    const tex = cachedTexture("sketch-paper", env.W, env.H, (tc, W, H) => {
      paintMottled(tc, W, H, hexRgb(PAPER), 0.045, 21, 0.0011, 9);
      vignette(tc, W, H, "#d8c9a6", 0.25);
    });
    c.drawImage(tex, 0, 0);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    const line = penLine(pts, o.seed);
    const part = partialPath(line, p);
    c.save();
    c.strokeStyle = o.color;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = o.width ?? (o.kind === "outline" ? 2.6 : o.kind === "icon" ? 2.2 : 2.4);
    c.globalAlpha = 0.95;
    if (o.dashed) c.setLineDash([10, 9]);
    // one small lift of the pen on longer strokes
    const r = rng(o.seed + 5);
    if (part.length > 30 && r() < 0.6) {
      const g = Math.floor(part.length * (0.35 + r() * 0.3));
      strokePoly(c, part.slice(0, g));
      strokePoly(c, part.slice(g + 1));
    } else strokePoly(c, part);
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    const pts: Pt[] = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 110, -Math.PI / 2, Math.PI * 2.06) : rectPts(s.x, s.y, s.w, s.h);
    this.stroke(c, pts, clamp01(p / 0.6), { seed: s.seed, color: this.ink(s.stroke, env), kind: "outline", env });
    watercolor(c, s.kind, s.x, s.y, s.w, s.h, s.fill ?? "grey", clamp01((p - 0.45) / 0.55), s.seed);
  },
  text(c, L, p, o) {
    revealText(c, L, p, "write", o.color, o.seed);
  },
  highlight(c, b, p, variant, fill, env, seed) {
    if (variant === "marker") {
      watercolor(c, "rect", b.x - 12, b.y + b.h * 0.15, b.w + 24, b.h * 0.85, fill ?? "yellow", p, seed);
    } else if (variant === "circle") {
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 30, b.h / 2 + 22, 110, -Math.PI / 2, Math.PI * 2.1), p, { seed, color: INK, kind: "deco", env });
    } else {
      this.stroke(c, [[b.x, b.y + b.h + 8], [b.x + b.w, b.y + b.h + 5]], p, { seed, color: INK, kind: "underline", env });
      this.stroke(c, [[b.x + b.w * 0.1, b.y + b.h + 16], [b.x + b.w * 0.95, b.y + b.h + 13]], clamp01(p * 1.3 - 0.3), { seed: seed + 1, color: INK, kind: "underline", width: 1.6, env });
    }
  },
  image(c, img, box, p, _env, key) {
    const e = easeOutCubic(clamp01(p * 3));
    if (e <= 0) return;
    c.save();
    c.globalAlpha = e;
    c.globalCompositeOperation = "multiply";
    c.drawImage(processedImage(key, img, "multiply", "#f3e7cf"), box.x, box.y, box.w, box.h);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = "rgba(245,238,222,0.94)";
    c.fillRect(0, 960, env.W, 120);
    bandSubtitle(c, text, env, { color: INK, family: "WB Pen", size: 50 });
  },
  transition: {
    dur: 0.7,
    // Watercolour bleed: a wet wash spreads from the corner and the new page shows through it.
    draw(c, prev, q, env) {
      const e = easeInOutCubic(q);
      const R = Math.hypot(env.W, env.H) * 1.05 * e;
      const blob = blobPts("ellipse", -R, env.H - R, R * 2, R * 2, R * 0.12 + 4, 17, 0.003);
      c.save();
      c.beginPath();
      c.rect(0, 0, env.W, env.H);
      blob.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.clip("evenodd");
      c.drawImage(prev, 0, 0);
      c.restore();
      if (q < 1) {
        c.save();
        c.strokeStyle = "rgba(134,179,214,0.55)";
        c.lineWidth = 10;
        c.beginPath();
        blob.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.stroke();
        c.restore();
      }
    },
  },
  cover(c, W, H, lines, env) {
    genericCover(this, c, W, H, lines, env, { tag: "sketchbook notes", accentFill: "yellow" });
  },
};
