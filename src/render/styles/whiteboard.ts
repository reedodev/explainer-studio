/** whiteboard: Excalidraw-like marker drawing on a clean white board (the original look). */
import rough from "roughjs";
import { clamp01, easeInOutCubic, ellipsePts, font, rectPts, strokePoly, type Ctx, type Pt } from "../core.js";
import { PALETTE } from "../../config.js";
import { bandSubtitle, genericCover, popImage, revealText } from "./shared.js";
import type { Env, StyleDef, Token } from "./types.js";

const gen = rough.generator();
const cache = new Map<string, Pt[][]>();

/** Rough.js path turned into sampled polylines so it can be drawn progressively. */
export function roughPolylines(points: Pt[], seed: number, roughness = 1.1, bowing = 1): Pt[][] {
  const key = JSON.stringify(points) + "|" + seed + "|" + roughness;
  let paths = cache.get(key);
  if (paths) return paths;
  const d = gen.linearPath(points as any, { seed: (seed % 2147483646) + 1, roughness, bowing, strokeWidth: 3 });
  paths = [];
  for (const set of d.sets) {
    let cur: number[] = [0, 0];
    let pts: Pt[] = [];
    for (const op of set.ops) {
      if (op.op === "move") {
        if (pts.length) paths.push(pts);
        cur = op.data;
        pts = [[cur[0], cur[1]]];
      } else if (op.op === "lineTo") {
        cur = op.data;
        pts.push([cur[0], cur[1]]);
      } else if (op.op === "bcurveTo") {
        const a = cur, b = op.data;
        for (let k = 1; k <= 12; k++) {
          const t = k / 12, u = 1 - t;
          pts.push([
            u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * b[2] + t * t * t * b[4],
            u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * b[3] + t * t * t * b[5],
          ]);
        }
        cur = [b[4], b[5]];
      }
    }
    if (pts.length) paths.push(pts);
  }
  cache.set(key, paths);
  return paths;
}
/** Progressive draw of several sub-paths in sequence. */
export function drawSequential(c: Ctx, paths: Pt[][], p: number) {
  const lens = paths.map((pts) => pts.slice(1).reduce((n, q, j) => n + Math.hypot(q[0] - pts[j][0], q[1] - pts[j][1]), 0));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let used = 0;
  paths.forEach((pts, j) => {
    const pr = clamp01((p * total - used) / Math.max(1, lens[j]));
    used += lens[j];
    if (pr <= 0) return;
    const n = (pts.length - 1) * pr;
    const out: Pt[] = pts.slice(0, Math.floor(n) + 1);
    const i = Math.floor(n);
    if (i < pts.length - 1) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * (n - i), pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (n - i)]);
    strokePoly(c, out);
  });
}

const pal = PALETTE as Record<string, string>;
const STROKE: Record<string, string> = { red: "#e03131", blue: "#1971c2", green: "#2f9e44", yellow: "#f08c00", grey: "#868e96" };

export const whiteboard: StyleDef = {
  id: "whiteboard",
  name: "Whiteboard Explainer",
  nameKo: "화이트보드",
  summary: "흰 보드 위에 검은 마커로 한 획씩 그리는 Excalidraw 풍 설명 영상",
  bestFor: "개념 설명, 강의, 제품 원리, 비교",
  font: (role) => (role === "caption" ? { family: "WB Hand", scale: 1 } : { family: "WB Hand", scale: 1 }),
  // Excalidraw stroke colours: fills stay pastel, coloured lines use the strong variant.
  ink: (token) => STROKE[token ?? "black"] ?? pal[token ?? "black"] ?? pal.black,
  textColor: () => pal.black,
  background(c, env) {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, env.W, env.H);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    c.save();
    c.strokeStyle = o.color;
    c.lineWidth = o.width ?? (o.kind === "icon" ? 3 : 3.2);
    c.lineCap = "round";
    c.lineJoin = "round";
    if (o.dashed) c.setLineDash([12, 12]);
    drawSequential(c, roughPolylines(pts, o.seed), p);
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    if (s.fill) {
      c.save();
      c.globalAlpha = 0.55 * clamp01(p * 1.4);
      c.fillStyle = pal[s.fill] ?? pal.blue;
      if (s.kind === "ellipse") {
        c.beginPath();
        c.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
        c.fill();
      } else c.fillRect(s.x, s.y, s.w, s.h);
      c.restore();
    }
    const pts = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 100) : rectPts(s.x, s.y, s.w, s.h);
    this.stroke(c, pts, p, { seed: s.seed, color: this.ink(s.stroke, env), kind: "outline", env });
  },
  text(c, L, p, o) {
    revealText(c, L, p, "write", o.color, o.seed);
  },
  highlight(c, b, p, variant, fill, env, seed) {
    if (variant === "marker") {
      c.save();
      c.globalCompositeOperation = "multiply";
      c.fillStyle = pal[fill ?? "yellow"];
      c.fillRect(b.x - 10, b.y + b.h * 0.12, (b.w + 20) * p, b.h * 0.8);
      c.restore();
    } else if (variant === "circle") {
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 30, b.h / 2 + 24, 105), p, { seed, color: pal.black, kind: "deco", env });
    } else {
      this.stroke(c, [[b.x, b.y + b.h + 6], [b.x + b.w * 0.55, b.y + b.h + 10], [b.x + b.w, b.y + b.h + 4]], p, { seed, color: pal.black, kind: "underline", env });
    }
  },
  image: (c, img, box, p) => popImage(c, img, box, p),
  subtitle(c, text, env) {
    bandSubtitle(c, text, env, { band: "#ffffff", color: pal.black, family: "Korean", size: 38 });
  },
  transition: {
    dur: 0.55,
    // Eraser wipe: the previous board is wiped away left-to-right by a soft grey eraser pass.
    draw(c, prev, q, env) {
      const e = easeInOutCubic(q);
      const X = -120 + (env.W + 240) * e;
      c.save();
      c.beginPath();
      c.rect(X, 0, env.W - X, env.H);
      c.clip();
      c.drawImage(prev, 0, 0);
      c.restore();
      const g = c.createLinearGradient(X - 110, 0, X + 10, 0);
      g.addColorStop(0, "rgba(233,236,239,0)");
      g.addColorStop(0.8, "rgba(210,214,218,0.55)");
      g.addColorStop(1, "rgba(233,236,239,0)");
      c.fillStyle = g;
      c.fillRect(X - 110, 0, 120, env.H);
    },
  },
  cover(c, W, H, lines, env) {
    genericCover(this, c, W, H, lines, env, { tag: "WHITEBOARD EXPLAINER" });
  },
};

export function fontFor(size: number) {
  return font(size, "WB Hand");
}
export type { Token, Env };
