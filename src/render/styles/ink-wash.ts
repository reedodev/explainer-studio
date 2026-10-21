/**
 * ink-wash: xieyi ink painting on warm rice paper. Pressure-tapered brush strokes with dry-brush
 * streaks, pale ink washes with bled edges, serif type that darkens in like soaking ink,
 * a vermilion seal as the only colour accent, and ink blooms as scene transitions.
 */
import { blobPts, cachedTexture, clamp01, easeInOutCubic, easeOutCubic, ellipsePts, fbm, fillPoly, font, hash2, hexRgb, paintMottled, partialPath, rectPts, resample, ribbon, rng, vignette, type Pt, ringPts } from "../core.js";
import { bandSubtitle, genericCover, layoutText, processedImage, revealText } from "./shared.js";
import type { StyleDef, Token } from "./types.js";

const PAPER = "#F2ECDE", INK = "#1A1714", SEAL = "#B8322A";
// washes: five ink tones plus light 花青 / 藤黄 / 朱 tints
const WASH: Record<string, [string, number]> = {
  yellow: ["#d9a514", 0.5], blue: ["#1f5fae", 0.55], green: ["#3f8a2c", 0.48], red: ["#c4321f", 0.45], grey: ["#1a1714", 0.1], black: ["#1a1714", 0.55], white: ["#f2ecde", 0],
};

const strokeCache = new Map<string, { pts: Pt[]; seed: number }>();

/** Brush ribbon for the first fraction p of a centreline. */
function brush(c: any, pts: Pt[], p: number, width: number, color: string, seed: number, dry = 0.35) {
  const key = JSON.stringify(pts.slice(0, 3)) + pts.length + "|" + seed;
  let s = strokeCache.get(key);
  if (!s) {
    s = { pts: resample(pts, 3), seed };
    strokeCache.set(key, s);
  }
  const all = s.pts;
  const n = Math.max(2, Math.floor(all.length * clamp01(p)));
  if (n < 2) return;
  const part = all.slice(0, n);
  const N = all.length;
  const half = (i: number) => {
    const u = i / Math.max(1, N - 1);
    const press = Math.min(1, u / 0.08) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (u > 0.85 ? 1 - (u - 0.85) / 0.15 * 0.8 : 1);
    return (width / 2) * (0.35 + 0.65 * press) * (0.85 + 0.3 * fbm(i * 0.08, seed, 2, seed));
  };
  c.save();
  c.fillStyle = color;
  c.globalAlpha = 0.92;
  fillPoly(c, ribbon(part, (i) => half(i)));
  // dry-brush: paper-coloured streaks along the stroke ("flying white")
  if (dry > 0 && width > 3) {
    c.strokeStyle = PAPER;
    c.lineCap = "round";
    const r = rng(seed * 7 + 3);
    const lanes = 3;
    for (let k = 0; k < lanes; k++) {
      const off = (r() - 0.5) * width * 0.7;
      const start = Math.floor(part.length * (0.45 + r() * 0.3));
      if (start >= part.length - 2) continue;
      c.globalAlpha = dry * (0.5 + r() * 0.5);
      c.lineWidth = Math.max(0.8, width * 0.12);
      c.beginPath();
      for (let i = start; i < part.length; i++) {
        const a = part[Math.max(0, i - 1)], b = part[Math.min(part.length - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        const x = part[i][0] - dy * off, y = part[i][1] + dx * off;
        if (i === start) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  c.restore();
}

function wash(c: any, kind: "rect" | "ellipse", x: number, y: number, w: number, h: number, token: Token, p: number, seed: number) {
  const [col, alpha] = WASH[token] ?? WASH.grey;
  if (!alpha || p <= 0) return;
  const e = easeOutCubic(p);
  const cx = x + w / 2, cy = y + h / 2;
  c.save();
  c.globalCompositeOperation = "multiply";
  for (let layer = 0; layer < 2; layer++) {
    const pts = blobPts(kind, x + 6, y + 6, w - 12, h - 12, 10 + layer * 6, seed + layer * 13, 0.018);
    const sc = 0.7 + 0.3 * e;
    c.fillStyle = col;
    c.globalAlpha = alpha * e * (layer ? 0.55 : 1);
    fillPoly(c, pts.map(([px, py]) => [cx + (px - cx) * sc, cy + (py - cy) * sc] as Pt));
  }
  c.restore();
}

export const inkWash: StyleDef = {
  id: "ink-wash",
  name: "Ink Wash",
  nameKo: "수묵화",
  summary: "화선지 위 붓 한 획. 굵기가 변하는 붓선, 번지는 먹 담채, 먹이 스며드는 명조 글씨, 붉은 낙관",
  bestFor: "철학·태도·인사이트, 동양적 주제, 차분한 성찰형 메시지",
  font: (role) => (role === "title" || role === "heading" ? { family: "WB Serif XB", scale: 1 } : { family: "WB Serif Bold", scale: 0.95 }),
  ink: (token) => (token === "red" ? SEAL : INK),
  textColor: (_env, onFill) => (onFill === "black" ? PAPER : INK),
  background(c, env) {
    const tex = cachedTexture("ink-paper", env.W, env.H, (tc, W, H) => {
      paintMottled(tc, W, H, hexRgb(PAPER), 0.05, 5, 0.0014, 5);
      // long thin fibres
      const r = rng(77);
      tc.strokeStyle = "rgba(255,255,255,0.35)";
      tc.lineWidth = 0.7;
      for (let i = 0; i < 900; i++) {
        const x = r() * W, y = r() * H, a = r() * Math.PI, L = 8 + r() * 30;
        tc.beginPath();
        tc.moveTo(x, y);
        tc.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        tc.stroke();
      }
      tc.fillStyle = "rgba(60,45,30,0.05)";
      for (let i = 0; i < 1400; i++) tc.fillRect(r() * W, r() * H, 1.5, 1.5);
      vignette(tc, W, H, "#b8a47e", 0.22);
    });
    c.drawImage(tex, 0, 0);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    const w = o.width ?? (o.kind === "outline" ? 9 : o.kind === "icon" ? 5.5 : o.kind === "underline" ? 10 : 7.5);
    brush(c, pts, p, w, o.color, o.seed, o.kind === "icon" ? 0.15 : 0.4);
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    wash(c, s.kind, s.x, s.y, s.w, s.h, s.fill ?? "grey", clamp01((p - 0.2) / 0.8), s.seed);
    // broken outline: thick-thin strokes that don't fully close
    const pts: Pt[] = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 120, -Math.PI / 2 + 0.2, Math.PI * 2 - 0.35) : rectPts(s.x, s.y, s.w, s.h);
    if (s.kind === "rect") {
      // two strokes: top+right, bottom+left, each lifting off before the corner
      const a: Pt[] = [[s.x + 6, s.y + 2], [s.x + s.w - 4, s.y - 1], [s.x + s.w + 1, s.y + s.h - 14]];
      const b: Pt[] = [[s.x + s.w - 10, s.y + s.h + 1], [s.x + 3, s.y + s.h - 2], [s.x - 1, s.y + 16]];
      this.stroke(c, a, clamp01(p * 2), { seed: s.seed, color: this.ink(s.stroke, env), kind: "outline", env });
      this.stroke(c, b, clamp01(p * 2 - 1), { seed: s.seed + 1, color: this.ink(s.stroke, env), kind: "outline", env });
    } else this.stroke(c, pts, p, { seed: s.seed, color: this.ink(s.stroke, env), kind: "outline", env });
  },
  text(c, L, p, o) {
    revealText(c, L, p, "ink", o.color, o.seed);
  },
  highlight(c, b, p, variant, _fill, env, seed) {
    if (variant === "underline") {
      this.stroke(c, [[b.x - 6, b.y + b.h + 10], [b.x + b.w * 0.5, b.y + b.h + 16], [b.x + b.w + 10, b.y + b.h + 8]], p, { seed, color: INK, kind: "underline", env });
      return;
    }
    if (variant === "circle") {
      this.stroke(c, ringPts(b, 30, 24, 110, -Math.PI / 2, Math.PI * 1.86), p, { seed, color: INK, kind: "deco", width: 7, env });
      return;
    }
    // marker -> vermilion seal stamped beside the words
    const s = Math.min(90, b.h * 1.1);
    const x = b.x + b.w + 18, y = b.y + (b.h - s) / 2;
    const e = clamp01(p * 3);
    if (e <= 0) return;
    c.save();
    c.globalAlpha = e;
    c.translate(x + s / 2, y + s / 2);
    c.rotate(-0.05);
    c.scale(1.25 - 0.25 * easeOutCubic(e), 1.25 - 0.25 * easeOutCubic(e));
    c.fillStyle = SEAL;
    fillPoly(c, blobPts("rect", -s / 2, -s / 2, s, s, 2.5, seed, 0.08));
    c.fillStyle = PAPER;
    c.font = font(s * 0.36, "WB Serif XB");
    c.textAlign = "center";
    c.fillText("核", 0, -s * 0.02);
    c.fillText("心", 0, s * 0.36);
    c.restore();
  },
  image(c, img, box, p, _env, key) {
    const e = easeOutCubic(clamp01(p * 2.5));
    if (e <= 0) return;
    const g = processedImage(key, img, "gray");
    c.save();
    c.globalAlpha = 0.85 * e;
    c.globalCompositeOperation = "multiply";
    c.drawImage(g, box.x, box.y, box.w, box.h);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = "rgba(242,236,222,0.92)";
    c.fillRect(0, 960, env.W, 120);
    bandSubtitle(c, text, env, { color: INK, family: "WB Serif Bold", size: 38 });
  },
  transition: {
    dur: 0.8,
    // Ink bloom: a drop of ink spreads over the old picture, then thins out to reveal the new one.
    draw(c, prev, q, env) {
      const cx = env.W * 0.5, cy = env.H * 0.45;
      if (q < 0.5) {
        c.drawImage(prev, 0, 0);
        const r = easeInOutCubic(q * 2) * Math.hypot(env.W, env.H) * 0.6;
        c.fillStyle = INK;
        c.globalAlpha = 0.93;
        fillPoly(c, blobPts("ellipse", cx - r, cy - r, r * 2, r * 2, r * 0.18 + 6, 9, 0.004));
        c.globalAlpha = 1;
      } else {
        const a = 1 - easeInOutCubic((q - 0.5) * 2);
        c.fillStyle = `rgba(26,23,20,${0.93 * a})`;
        c.fillRect(0, 0, env.W, env.H);
      }
    },
  },
  cover(c, W, H, lines, env) {
    this.background(c, env);
    const vertical = H > W;
    const f = this.font("title");
    // big wash mountain + brush title in the empty space
    wash(c, "ellipse", W * 0.05, H * (vertical ? 0.62 : 0.55), W * 0.9, H * 0.55, "black", 1, 4);
    wash(c, "ellipse", W * 0.35, H * (vertical ? 0.55 : 0.45), W * 0.7, H * 0.5, "grey", 1, 8);
    const size = vertical ? 96 : 110;
    lines.forEach((l, i) => {
      const L = layoutText(c, l, f.family, size, { x: 90, y: H * (vertical ? 0.16 : 0.14) + i * size * 1.3, w: W - 180, h: size * 1.3 }, vertical ? "center" : "left", "top");
      revealText(c, L, 1, "fade", INK, 1);
    });
    this.stroke(c, [[90, H * (vertical ? 0.16 : 0.14) + lines.length * size * 1.3 + 20], [W * 0.62, H * (vertical ? 0.16 : 0.14) + lines.length * size * 1.3 + 34]], 1, { seed: 3, color: INK, kind: "underline", width: 16, env });
    this.highlight(c, { x: W - 260, y: H * 0.8, w: 60, h: 110 }, 1, "marker", undefined, env, 12);
    void hash2; void genericCover; void partialPath;
  },
};
