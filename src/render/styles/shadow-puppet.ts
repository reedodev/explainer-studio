/**
 * shadow-puppet: shadow theatre. A cotton screen lit from behind by an oil lamp; shapes are
 * translucent dyed hide with dark carved outlines, lace holes and rivets; puppets tremble a
 * little in the hand; the lamp dims and relights between scenes.
 */
import { blobPts, cachedTexture, clamp01, easeInOutCubic, easeOutCubic, ellipsePts, fillPoly, font, hexRgb, noise2, partialPath, rectPts, resample, ribbon, rng, strokePoly, vignette, type Pt } from "../core.js";
import { bandSubtitle, layoutText, processedImage, revealText, styledIcon } from "./shared.js";
import type { Env, StyleDef } from "./types.js";

const INK = "#1A100A", LIGHT = "#F6E3B4";
const DYE: Record<string, string> = { yellow: "#DC9D1E", red: "#B8211A", blue: "#22647E", green: "#2F8A5C", grey: "#E2BD80", black: "#3a2415", white: "#E2BD80" };
const darkDye = (t?: string) => t === "red" || t === "blue" || t === "green" || t === "black";

/** Small hand tremble shared by everything in a scene (puppets are held on sticks). */
function tremble(env: Env, seed: number): [number, number] {
  const t = env.t * 1.7;
  return [(noise2(t, seed, 3) - 0.5) * 2.2, (noise2(seed, t, 5) - 0.5) * 1.6];
}

export const shadowPuppet: StyleDef = {
  id: "shadow-puppet",
  name: "Shadow Puppetry",
  nameKo: "그림자극",
  summary: "등잔불이 비치는 천 스크린 위, 물들인 가죽 인형처럼 빛이 비치는 도형과 새김 윤곽선, 조금씩 떨리는 움직임",
  bestFor: "이야기·우화형 설명, 역사·유래, 명절·전통, 따뜻한 스토리텔링",
  font: (role) => (role === "title" || role === "heading" ? { family: "WB Serif XB", scale: 1 } : { family: "WB Serif Bold", scale: 0.95 }),
  ink: (token) => (token === "red" ? "#6d140f" : INK),
  textColor: (_env, onFill) => (onFill && darkDye(onFill) ? LIGHT : INK),
  background(c, env) {
    const tex = cachedTexture("puppet-screen", env.W, env.H, (tc, W, H) => {
      const g = tc.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.45, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, "#FBE3A6");
      g.addColorStop(0.45, "#F0B866");
      g.addColorStop(0.8, "#B8692C");
      g.addColorStop(1, "#6A3514");
      tc.fillStyle = g;
      tc.fillRect(0, 0, W, H);
      // cotton weave
      tc.globalAlpha = 0.07;
      tc.strokeStyle = "#5a3413";
      tc.lineWidth = 1;
      for (let x = 0; x < W; x += 3) { tc.beginPath(); tc.moveTo(x + 0.5, 0); tc.lineTo(x + 0.5, H); tc.stroke(); }
      for (let y = 0; y < H; y += 3) { tc.beginPath(); tc.moveTo(0, y + 0.5); tc.lineTo(W, y + 0.5); tc.stroke(); }
      tc.globalAlpha = 1;
      vignette(tc, W, H, "#4a220c", 0.55);
    });
    c.drawImage(tex, 0, 0);
    // oil-lamp flicker
    // slow, stepped flicker (changes every 4 frames): per-frame full-screen changes bloated the H.264 file ~5x
    const f = (noise2(Math.floor(env.t * 7.5) * 0.35, 1, 9) - 0.5) * 0.035;
    c.fillStyle = f > 0 ? `rgba(255,236,190,${f})` : `rgba(60,25,5,${-f})`;
    c.fillRect(0, 0, env.W, env.H);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    const [tx, ty] = tremble(o.env, o.seed);
    const part = partialPath(resample(pts, 4), p);
    if (part.length < 2) return;
    const w = o.width ?? (o.kind === "outline" ? 4 : o.kind === "icon" ? 4.4 : 5);
    c.save();
    c.translate(tx, ty);
    c.fillStyle = o.color;
    fillPoly(c, ribbon(part, () => w / 2));
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    const e = easeOutCubic(p);
    const [tx, ty] = tremble(env, s.seed);
    const lift = (1 - e) * 60; // the puppet is raised onto the screen from below
    const col = DYE[s.fill ?? "grey"] ?? DYE.grey;
    c.save();
    c.translate(tx, ty + lift);
    c.globalAlpha = e;
    const pts = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 100) : rectPts(s.x, s.y, s.w, s.h);
    // translucent dyed hide: lamp light shows through
    c.fillStyle = col;
    c.globalAlpha = 0.78 * e;
    fillPoly(c, pts);
    // carved lace holes along the inner border
    c.globalAlpha = 0.55 * e;
    c.fillStyle = "#FFE9B0";
    const inner = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2 - 14, s.h / 2 - 14, 100) : rectPts(s.x + 14, s.y + 14, s.w - 28, s.h - 28);
    for (const [hx, hy] of resample(inner, 26).slice(0, -1)) {
      c.beginPath();
      c.arc(hx, hy, 3.4, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = e;
    // carved outline + rivets
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.stroke();
    const rivets: Pt[] = s.kind === "ellipse" ? [[s.x + s.w / 2, s.y + 10]] : [[s.x + 10, s.y + 10], [s.x + s.w - 10, s.y + 10]];
    for (const [rx, ry] of rivets) {
      c.fillStyle = INK;
      c.beginPath(); c.arc(rx, ry, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#E9C98A";
      c.beginPath(); c.arc(rx, ry, 2.2, 0, Math.PI * 2); c.fill();
    }
    // short control-stick stub under the piece, fading out (long sticks crossed the text)
    const sx = s.x + s.w * 0.5, sy = s.y + s.h;
    const g = c.createLinearGradient(sx, sy, sx, sy + 70);
    g.addColorStop(0, "rgba(26,16,10,0.55)");
    g.addColorStop(1, "rgba(26,16,10,0)");
    c.strokeStyle = g;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + 6, sy + 70);
    c.stroke();
    c.restore();
  },
  text(c, L, p, o) {
    const [tx, ty] = tremble(o.env, o.seed);
    c.save();
    c.translate(tx * 0.5, ty * 0.5);
    revealText(c, L, p, "fade", o.color, o.seed);
    c.restore();
  },
  highlight(c, b, p, variant, fill, env, seed) {
    const e = easeOutCubic(p);
    if (variant === "circle") {
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 28, b.h / 2 + 22, 100), p, { seed, color: INK, kind: "deco", env });
      return;
    }
    if (variant === "marker") {
      // a strip of dyed hide slid under the words (multiply keeps the carved letters dark)
      c.save();
      c.globalCompositeOperation = "multiply";
      c.globalAlpha = 0.85;
      c.fillStyle = DYE[fill ?? "yellow"] ?? DYE.yellow;
      fillPoly(c, blobPts("rect", b.x - 12, b.y + b.h * 0.5, (b.w + 24) * e, b.h * 0.5, 1.5, seed, 0.08));
      c.restore();
      return;
    }
    this.stroke(c, [[b.x, b.y + b.h + 8], [b.x + b.w, b.y + b.h + 8]], p, { seed, color: DYE[fill ?? "red"], kind: "underline", width: 7, env });
  },
  image(c, img, box, p, env, key) {
    const e = easeOutCubic(clamp01(p * 2));
    if (e <= 0) return;
    const [tx, ty] = tremble(env, 99);
    c.save();
    c.translate(tx, ty + (1 - e) * 60);
    c.globalAlpha = e;
    c.globalCompositeOperation = "multiply";
    c.drawImage(processedImage(key, img, "multiply", "#e0a45a"), box.x, box.y, box.w, box.h);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = "rgba(26,16,10,0.86)";
    c.fillRect(0, 960, env.W, 120);
    bandSubtitle(c, text, env, { color: LIGHT, family: "WB Serif Bold", size: 38 });
  },
  post(c, env) {
    void env;
    void c;
  },
  transition: {
    dur: 0.8,
    // Lamp dims to dark on the old scene, then relights on the new one.
    draw(c, prev, q, env) {
      if (q < 0.5) {
        c.drawImage(prev, 0, 0);
        c.fillStyle = `rgba(20,8,2,${0.92 * easeInOutCubic(q * 2)})`;
      } else {
        c.fillStyle = `rgba(20,8,2,${0.92 * (1 - easeInOutCubic((q - 0.5) * 2))})`;
      }
      c.fillRect(0, 0, env.W, env.H);
    },
  },
  cover(c, W, H, lines, env) {
    const vertical = H > W;
    this.background(c, { ...env, t: 0 });
    const f = this.font("title");
    const size = vertical ? 100 : 112;
    const top = H * (vertical ? 0.18 : 0.14);
    this.shape(c, { kind: "rect", x: 80, y: top - 30, w: W - 160, h: lines.length * size * 1.3 + 70, fill: "red", seed: 2 }, 1, { ...env, t: 0 });
    lines.forEach((l, i) => {
      const L = layoutText(c, l, f.family, size, { x: 110, y: top + 5 + i * size * 1.3, w: W - 220, h: size * 1.3 }, "center", "top");
      revealText(c, L, 1, "fade", LIGHT, 1);
    });
    const iy = top + lines.length * size * 1.3 + (vertical ? 200 : 120);
    const is = vertical ? 220 : 170;
    ["lightbulb", "robot", "chat"].forEach((n, k) => {
      const cx = W / 2 + (k - 1) * (is + (vertical ? 50 : 110));
      this.shape(c, { kind: "ellipse", x: cx - is * 0.65, y: iy - is * 0.15, w: is * 1.3, h: is * 1.3, fill: (["yellow", "blue", "green"] as const)[k], seed: 10 + k }, 1, { ...env, t: 0 });
      styledIcon(this, c, n, cx - is / 2, iy, is, is, 1, INK, 30 + k, { ...env, t: 0 });
    });
    c.save();
    c.font = font(vertical ? 40 : 34, "WB Serif Bold");
    c.fillStyle = LIGHT;
    c.textAlign = "center";
    c.fillText("그림자극으로 보는 설명", W / 2, H - (vertical ? 170 : 80));
    c.restore();
    void blobPts; void hexRgb; void rng; void strokePoly;
  },
};
