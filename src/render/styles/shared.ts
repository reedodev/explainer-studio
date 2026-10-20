/** Helpers shared by style implementations (text reveal modes, image pop, generic cover). */
import { createCanvas } from "@napi-rs/canvas";
import { clamp01, easeOutCubic, font, rng, snapEase, type Ctx, type Pt } from "../core.js";
import { iconPaths } from "../icons.js";
import type { Env, StyleDef, TextLayout, Token } from "./types.js";

/** Word-wrap text inside a box with a given font; returns positioned lines. */
export function layoutText(
  c: Ctx,
  text: string,
  family: string,
  size: number,
  box: { x: number; y: number; w: number; h: number },
  align: "left" | "center" | "right" = "left",
  valign: "top" | "middle" | "bottom" = "top",
  lineGap = 1.25,
): TextLayout {
  c.font = font(size, family);
  const lines: string[] = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const cand = line ? line + " " + word : word;
      if (line && c.measureText(cand).width > box.w) {
        lines.push(line);
        line = word;
      } else line = cand;
    }
    lines.push(line);
  }
  const lineH = size * lineGap;
  const total = lines.length * lineH;
  const top = box.y + (valign === "middle" ? (box.h - total) / 2 : valign === "bottom" ? box.h - total : 0);
  return {
    size,
    family,
    lineH,
    box,
    lines: lines.map((l, i) => {
      const width = c.measureText(l).width;
      const x = box.x + (align === "center" ? (box.w - width) / 2 : align === "right" ? box.w - width : 0);
      return { text: l, x, y: top + i * lineH + size * 0.92, width };
    }),
  };
}

export type RevealMode = "write" | "type" | "rise" | "cut" | "ink" | "fade";

/**
 * Progressive text rendering.
 *  write: left-to-right clip like a pen (whiteboard, sketch)
 *  type : character by character with a block cursor (blueprint, terminal)
 *  rise : each line rises out of a clip rect with a snap ease (swiss)
 *  cut  : letters pop in with a fixed cut-paper jitter (spy titles)
 *  ink  : characters darken in one after another (ink wash)
 *  fade : whole block fades in (shadow theatre)
 */
export function revealText(c: Ctx, L: TextLayout, p: number, mode: RevealMode, color: string, seed = 1, extra: { cursor?: string; shadow?: string; jitter?: number } = {}) {
  if (p <= 0) return;
  c.save();
  c.font = font(L.size, L.family);
  c.fillStyle = color;
  c.textBaseline = "alphabetic";
  const total = L.lines.reduce((n, l) => n + [...l.text].length, 0) || 1;
  if (mode === "write") {
    let used = 0;
    for (const l of L.lines) {
      const n = [...l.text].length;
      const lp = clamp01((p * total - used) / Math.max(1, n));
      used += n;
      if (lp <= 0) continue;
      c.save();
      c.beginPath();
      c.rect(l.x - 4, l.y - L.size * 1.1, l.width * lp + 6, L.lineH + L.size * 0.4);
      c.clip();
      c.fillText(l.text, l.x, l.y);
      c.restore();
    }
  } else if (mode === "type") {
    const shown = Math.floor(p * total + 0.0001);
    let used = 0;
    for (const l of L.lines) {
      const chars = [...l.text];
      const k = Math.max(0, Math.min(chars.length, shown - used));
      used += chars.length;
      if (k <= 0) continue;
      const part = chars.slice(0, k).join("");
      c.fillText(part, l.x, l.y);
      if (p < 1 && k < chars.length + 1 && shown - (used - chars.length) <= chars.length) {
        const w = c.measureText(part).width;
        c.fillStyle = extra.cursor ?? color;
        c.fillRect(l.x + w + 3, l.y - L.size * 0.8, L.size * 0.5, L.size * 0.95);
        c.fillStyle = color;
      }
    }
  } else if (mode === "rise") {
    L.lines.forEach((l, i) => {
      const lp = snapEase(clamp01(p * (1 + L.lines.length * 0.25) - i * 0.25));
      if (lp <= 0) return;
      c.save();
      c.beginPath();
      c.rect(l.x - 6, l.y - L.size * 1.05, l.width + 12, L.size * 1.35);
      c.clip();
      c.fillText(l.text, l.x, l.y + (1 - lp) * L.size * 1.2);
      c.restore();
    });
  } else if (mode === "cut" || mode === "ink") {
    const r = rng(seed);
    let idx = 0;
    for (const l of L.lines) {
      let x = l.x;
      for (const ch of [...l.text]) {
        const w = c.measureText(ch).width;
        const rot = (r() - 0.5) * (extra.jitter ?? 0.03);
        const dy = (r() - 0.5) * (extra.jitter ? L.size * 0.05 : 0);
        const cp = clamp01(p * total * 1.15 - idx);
        idx++;
        if (cp > 0 && ch.trim()) {
          c.save();
          if (mode === "cut") {
            const s = 0.6 + 0.4 * easeOutCubic(cp);
            c.translate(x + w / 2, l.y + dy - L.size * 0.35);
            c.rotate(rot);
            c.scale(s, s);
            c.globalAlpha = clamp01(cp * 3);
            if (extra.shadow) {
              c.fillStyle = extra.shadow;
              c.fillText(ch, -w / 2 + 3, L.size * 0.35 + 3);
              c.fillStyle = color;
            }
            c.fillText(ch, -w / 2, L.size * 0.35);
          } else {
            c.globalAlpha = 0.25 + 0.75 * easeOutCubic(cp);
            if (cp < 1) {
              c.shadowColor = color;
              c.shadowBlur = (1 - cp) * 10;
            }
            c.fillText(ch, x, l.y);
          }
          c.restore();
        }
        x += w;
      }
    }
  } else {
    c.globalAlpha = easeOutCubic(p);
    for (const l of L.lines) c.fillText(l.text, l.x, l.y);
  }
  c.restore();
}

/** Quick scale-in for images and stickers. */
export function popImage(c: Ctx, img: any, box: { x: number; y: number; w: number; h: number }, p: number) {
  const s = Math.min(1, easeOutCubic(p * 4) * 1.04);
  if (s <= 0) return;
  const w = box.w * s, h = box.h * s;
  c.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

const tintCache = new Map<string, any>();
/**
 * Recolour an image once per style: `mode` "silhouette" (solid colour where opaque),
 * "gray" (luminance only), "multiply" (image × colour).
 */
export function processedImage(key: string, img: any, mode: "silhouette" | "gray" | "multiply" | "lineart", color = "#000000") {
  const k = `${key}|${mode}|${color}`;
  let out = tintCache.get(k);
  if (out) return out;
  const cv = createCanvas(img.width, img.height);
  const c = cv.getContext("2d");
  c.drawImage(img, 0, 0);
  if (mode === "silhouette") {
    c.globalCompositeOperation = "source-in";
    c.fillStyle = color;
    c.fillRect(0, 0, img.width, img.height);
  } else {
    const d = c.getImageData(0, 0, img.width, img.height);
    const a = d.data;
    const [tr, tg, tb] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    for (let i = 0; i < a.length; i += 4) {
      if (mode === "gray") {
        const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2];
        a[i] = a[i + 1] = a[i + 2] = l;
      } else if (mode === "lineart") {
        // dark marks become `color`, light areas transparent (for dark grounds)
        const l = (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255;
        const ink = Math.max(0, Math.min(1, (0.92 - l) * 1.6)) * (a[i + 3] / 255);
        a[i] = tr; a[i + 1] = tg; a[i + 2] = tb; a[i + 3] = Math.round(ink * 255);
      } else {
        a[i] = (a[i] * tr) / 255;
        a[i + 1] = (a[i + 1] * tg) / 255;
        a[i + 2] = (a[i + 2] * tb) / 255;
      }
    }
    c.putImageData(d, 0, 0);
  }
  tintCache.set(k, cv);
  return cv;
}

/** Draws an icon through the style's own stroke, so icons inherit the look. */
export function styledIcon(style: StyleDef, c: Ctx, name: string, x: number, y: number, w: number, h: number, p: number, color: string, seed: number, env: Env) {
  const paths = iconPaths(name);
  const lens = paths.map((q) => q.slice(1).reduce((n, a, i) => n + Math.hypot(a[0] - q[i][0], a[1] - q[i][1]), 0));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let spent = 0;
  paths.forEach((q, i) => {
    const pr = clamp01((p * total - spent) / (lens[i] || 1));
    spent += lens[i];
    if (pr <= 0) return;
    style.stroke(c, q.map((a) => [x + (a[0] / 100) * w, y + (a[1] / 100) * h] as Pt), pr, { seed: seed + i, color, kind: "icon", env });
  });
}

/** Generic cover: style background, framed title block, three icons joined by arrows. */
export function genericCover(style: StyleDef, c: Ctx, W: number, H: number, lines: string[], env: Env, o: { tag?: string; accentFill?: Token } = {}) {
  const vertical = H > W;
  style.background(c, env);
  const size = vertical ? 92 : 104;
  const role = "title" as const;
  const f = style.font(role);
  const lineH = size * f.scale * 1.3;
  const blockH = lines.length * lineH + 70;
  const top = H * (vertical ? 0.28 : 0.24);
  style.shape(c, { kind: "rect", x: 70, y: top - 24, w: W - 140, h: blockH, fill: o.accentFill ?? "yellow", seed: 3 }, 1, env);
  lines.forEach((l, i) => {
    const L = layoutText(c, l, f.family, size * f.scale, { x: 100, y: top + 12 + i * lineH, w: W - 200, h: lineH }, "center", "top");
    style.text(c, L, 1, { color: style.textColor(env, o.accentFill ?? "yellow"), role, seed: 7 + i, env });
  });
  const iy = top + blockH + (vertical ? 120 : 64);
  const is = vertical ? 170 : 130, gap = vertical ? 80 : 120;
  const names = ["chat", "loop", "robot"];
  const totalW = names.length * is + (names.length - 1) * gap;
  const ink = style.ink(undefined, env);
  names.forEach((n, k) => {
    const ix = (W - totalW) / 2 + k * (is + gap);
    styledIcon(style, c, n, ix, iy, is, is, 1, ink, 20 + k * 7, env);
    if (k < names.length - 1) {
      const a: Pt = [ix + is + gap * 0.15, iy + is / 2], b: Pt = [ix + is + gap * 0.85, iy + is / 2];
      if (style.arrow) style.arrow(c, a, b, 1, { seed: 40 + k, color: ink, kind: "arrow", env });
      else {
        style.stroke(c, [a, b], 1, { seed: 40 + k, color: ink, kind: "arrow", env });
        style.stroke(c, [[b[0] - 22, b[1] - 13], b, [b[0] - 22, b[1] + 13]], 1, { seed: 60 + k, color: ink, kind: "head", env });
      }
    }
  });
  if (o.tag) {
    const ly = iy + is + (vertical ? 130 : 70);
    const cf = style.font("caption");
    const L = layoutText(c, o.tag, cf.family, (vertical ? 44 : 38) * cf.scale, { x: 100, y: ly, w: W - 200, h: 60 }, "center", "top");
    style.text(c, L, 1, { color: ink, role: "caption", seed: 99, env });
  }
  style.post?.(c, env);
}

/** Standard bottom subtitle band. */
export function bandSubtitle(c: Ctx, text: string, env: Env, o: { band?: string; color: string; family: string; size?: number; align?: "center" | "left"; prefix?: string }) {
  if (!text) return;
  const top = 960;
  if (o.band) {
    c.fillStyle = o.band;
    c.fillRect(0, top, env.W, env.H - top);
  }
  c.save();
  // storyboard.subtitleSize (opt-in, e.g. 48 for phone readability) overrides the style's size; spacing scales with it
  const size: number = env.board?.subtitleSize ?? o.size ?? 38;
  const big = size > 40;
  c.font = font(size, o.family);
  c.fillStyle = o.color;
  c.textAlign = o.align ?? "center";
  const x = o.align === "left" ? 96 : env.W / 2;
  text.split("\n").forEach((l, i, arr) => {
    const y = big ? (arr.length === 1 ? 1020 + size * 0.36 : 960 + size * 0.98 + i * Math.round(size * 1.18)) : arr.length === 1 ? 1030 : 1004 + i * 46;
    c.fillText((i === 0 && o.prefix ? o.prefix : "") + l, x, y);
  });
  c.restore();
}
