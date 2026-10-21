/**
 * Style-agnostic frame engine. It walks a scene's drawOrder, computes each element's progress
 * at time t, lays out text with the style's fonts, and delegates every mark to the StyleDef.
 * The storyboard never changes between styles.
 */
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chartLayout, elementBox, targetBox } from "../storyboard/schema.js";
import { clamp01, registerFonts, type Cnv, type Pt } from "./core.js";
import { getStyle, resolveStyleId, type StyleDef } from "./styles/index.js";
import { layoutText, styledIcon } from "./styles/shared.js";
import type { Env, Role, TextLayout, Token } from "./styles/types.js";
import { applyCamera, cameraAt } from "./camera.js";
import { boardBackground, drawBackdrop, drawHand, gridPanel, handPose, karaokeSubtitle, paperNote, photoCard, tipOf, type BoardFx, type CaptionTiming } from "./fx.js";

registerFonts();

const images = new Map<string, any>();
/** Stickers are generated on flat white: key out near-white so no off-white box shows. */
function keyOutWhite(im: any) {
  const cv = createCanvas(im.width, im.height), c = cv.getContext("2d");
  c.drawImage(im, 0, 0);
  const d = c.getImageData(0, 0, im.width, im.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const m = Math.min(a[i], a[i + 1], a[i + 2]);
    if (m >= 238) a[i + 3] = 0;
    else if (m >= 222) a[i + 3] = Math.round((a[i + 3] * (238 - m)) / 16);
  }
  c.putImageData(d, 0, 0);
  return cv;
}
export async function loadAssets(board: any, dir: string) {
  const extra = [board.fx?.hand?.src, ...board.scenes.map((s: any) => s.backdrop?.src)].filter(Boolean);
  for (const src of extra) {
    const p = path.join(dir, src);
    if (images.has(p)) continue;
    try {
      images.set(p, await loadImage(p));
    } catch {
      /* missing optional fx asset: skipped */
    }
  }
  for (const s of board.scenes)
    for (const e of s.elements)
      if (e.type === "image" || e.type === "sticker") {
        const p = path.join(dir, e.src || "stickers/" + e.sticker + ".png");
        if (images.has(p)) continue;
        try {
          const im = await loadImage(p);
          images.set(p, e.type === "sticker" ? keyOutWhite(im) : im);
        } catch {
          /* missing asset -> placeholder */
        }
      }
}

const roleOf = (e: any): Role => (e.role as Role) || "body";
function envFor(board: any, scene: any, t: number, W: number, H: number): Env {
  const sceneIndex = Math.max(0, board.scenes.indexOf(scene));
  return { W, H, t, sceneIndex, sceneCount: board.scenes.length, duration: scene.duration || 0, board, scene };
}

/** Text layout for a text element or a shape label, using the style's font for that role. */
export function textLayoutFor(style: StyleDef, c: any, e: any, all: any[], label = false): TextLayout | null {
  if (label) {
    if (!e.label) return null;
    const f = style.font("label");
    const inset = e.type === "circle" ? { x: e.x + e.w * 0.14 + 10, y: e.y + e.h * 0.14, w: e.w * 0.72 - 20, h: e.h * 0.72 } : { x: e.x + 22, y: e.y + 18, w: e.w - 44, h: e.h - 36 };
    if (e.labelSize) return layoutText(c, e.label, f.family, e.labelSize * f.scale, inset, e.align || "center", e.valign || "middle");
    // No labelSize: grow the label with the box (42 px up to 64 px) and step down until it fits.
    let px = Math.round(Math.max(42, Math.min(64, inset.h * 0.3, inset.w * 0.14)));
    for (;;) {
      const L = layoutText(c, e.label, f.family, px * f.scale, inset, e.align || "center", e.valign || "middle");
      const fits = Math.max(...L.lines.map((l) => l.width)) <= inset.w && L.lines.length * L.lineH <= inset.h + L.size * 0.3;
      if (fits || px <= 42) return L;
      px -= 4;
    }
  }
  const parent = all.find((q: any) => q.id === (e.parent || e.container));
  const f = style.font(roleOf(e));
  const size = (e.fontSize || 52) * f.scale;
  const box = parent ? { x: parent.x + 20, y: parent.y + 20, w: parent.w - 40, h: parent.h - 40 } : { x: e.x, y: e.y, w: e.w, h: e.h };
  return layoutText(c, e.text, f.family, size, box, e.align || (parent ? "center" : "left"), e.valign || (parent ? "middle" : "top"));
}

function highlightBox(style: StyleDef, c: any, e: any, all: any[]) {
  if (e.target) {
    const tg = all.find((q: any) => q.id === e.target);
    if (tg && tg.type === "text") {
      const L = textLayoutFor(style, c, tg, all);
      if (L && L.lines.length) {
        const x0 = Math.min(...L.lines.map((l) => l.x)), x1 = Math.max(...L.lines.map((l) => l.x + l.width));
        const y0 = L.lines[0].y - L.size * 0.92, y1 = L.lines[L.lines.length - 1].y + L.size * 0.28;
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
    }
    const tb = targetBox(e.target, all);
    if (tb) return tb;
  }
  if (e.x !== undefined && e.y !== undefined && e.w && e.h) return { x: e.x, y: e.y, w: e.w, h: e.h };
  return null;
}

function drawElement(style: StyleDef, c: any, e: any, p: number, env: Env, dir: string, i: number) {
  const all = env.scene.elements;
  const seed = i * 31 + 12 + env.sceneIndex * 1000;
  const ink = style.ink(e.stroke as Token | undefined, env);
  switch (e.type) {
    case "text": {
      const L = textLayoutFor(style, c, e, all);
      const parent = all.find((q: any) => q.id === (e.parent || e.container));
      if (L) style.text(c, L, p, { color: e.color ? style.ink(e.color, env) : style.textColor(env, parent?.fill), role: roleOf(e), seed, env });
      break;
    }
    case "rectangle":
    case "circle": {
      if (e.paper) paperNote(c, { x: e.x, y: e.y, w: e.w, h: e.h }, p);
      style.shape(c, { kind: e.type === "circle" ? "ellipse" : "rect", x: e.x, y: e.y, w: e.w, h: e.h, fill: e.fill, stroke: e.stroke, seed }, clamp01(p / 0.7), env);
      const L = textLayoutFor(style, c, e, all, true);
      if (L) style.text(c, L, clamp01((p - 0.4) / 0.6), { color: style.textColor(env, e.fill), role: "label", seed: seed + 5, env });
      break;
    }
    case "line":
      style.stroke(c, e.points, p, { seed, color: ink, kind: "line", dashed: e.dashed, env });
      break;
    case "arrow": {
      const a = e.from as Pt, b = e.to as Pt;
      if (style.arrow) style.arrow(c, a, b, p, { seed, color: ink, kind: "arrow", env });
      else {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        style.stroke(c, [a, b], clamp01(p / 0.8), { seed, color: ink, kind: "arrow", env });
        const head: Pt[] = [[b[0] - 25 * Math.cos(ang - 0.5), b[1] - 25 * Math.sin(ang - 0.5)], b, [b[0] - 25 * Math.cos(ang + 0.5), b[1] - 25 * Math.sin(ang + 0.5)]];
        style.stroke(c, head, clamp01((p - 0.8) / 0.2), { seed: seed + 1, color: ink, kind: "head", env });
      }
      if (e.label && p > 0.6) {
        const f = style.font("caption");
        const L = layoutText(c, e.label, f.family, (e.labelSize || 32) * f.scale, { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]) - 50, w: Math.abs(b[0] - a[0]) || 200, h: 44 }, "center", "bottom");
        style.text(c, L, clamp01((p - 0.6) / 0.4), { color: style.textColor(env), role: "caption", seed: seed + 3, env });
      }
      break;
    }
    case "icon":
      styledIcon(style, c, e.icon, e.x, e.y, e.w, e.h, p, ink, seed, env);
      break;
    case "highlight": {
      const b = highlightBox(style, c, e, all);
      if (b) style.highlight(c, b, p, e.style || "underline", e.fill, env, seed);
      break;
    }
    case "chart": {
      const n = e.data.length;
      const { bars, baseY } = chartLayout(e);
      const f = style.font("caption");
      const labelSize = Math.max(34, 36 * f.scale); // category and value labels stay >= 34 px
      bars.forEach((bar, k) => {
        const bp = clamp01(p * n - k * 0.6);
        const h = bar.h * bp;
        if (h > 1) style.shape(c, { kind: "rect", x: bar.x, y: baseY - h, w: bar.w, h, fill: bar.color || "blue", seed: seed + k }, 1, env);
        // value above the bar (always shown, with the unit when given), category under the baseline
        const vText = `${bar.value}${e.unit ?? ""}`;
        const V = layoutText(c, vText, f.family, labelSize, { x: bar.slotX, y: baseY - h - 46, w: bar.slotW, h: 42 }, "center", "bottom");
        if (bp > 0.5) style.text(c, V, clamp01((bp - 0.5) / 0.5), { color: style.textColor(env), role: "caption", seed: seed + 80 + k, env });
        const L = layoutText(c, bar.label, f.family, labelSize, { x: bar.slotX + 4, y: baseY + 8, w: bar.slotW - 8, h: 52 }, "center", "top");
        style.text(c, L, bp, { color: style.textColor(env), role: "caption", seed: seed + 50 + k, env });
      });
      break;
    }
    case "image":
    case "sticker": {
      const key = path.join(dir, e.src || "stickers/" + e.sticker + ".png");
      const im = images.get(key);
      const box = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (im && e.frame === "card") photoCard(c, im, box, p, e.tilt ?? 0);
      else if (im && e.frame === "panel") gridPanel(c, im, box, p, { fit: e.fit, caption: e.caption });
      else if (im) style.image(c, im, box, p, env, key);
      else {
        style.stroke(c, [[box.x, box.y], [box.x + box.w, box.y], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h], [box.x, box.y]], p, { seed, color: ink, kind: "outline", dashed: true, env });
        const f = style.font("caption");
        style.text(c, layoutText(c, "PENDING", f.family, 32, { x: box.x + 10, y: box.y + box.h / 2 - 20, w: box.w - 20, h: 40 }, "center", "top"), p, { color: ink, role: "caption", seed, env });
      }
      break;
    }
  }
}

/**
 * Life after drawing (deterministic, opt out with storyboard.fx.idle=false or element.idle=false):
 * icons bob a few px, highlights breathe ~2%, arrows nudge along their direction. The motion fades
 * in over 0.6 s after an element finishes drawing. Returns true when a save() needs a restore().
 */
function idleTransform(style: StyleDef, c: any, e: any, since: number, i: number, all: any[]): boolean {
  if (since <= 0) return false;
  const ramp = Math.min(1, since / 0.6), ph = i * 1.7, T = since;
  if (e.type === "icon") {
    c.save();
    c.translate(0, -Math.sin((2 * Math.PI * T) / 2.6 + ph) * 5 * ramp);
    return true;
  }
  if (e.type === "highlight") {
    const b = highlightBox(style, c, e, all);
    if (!b) return false;
    const k = 1 + 0.022 * Math.sin((2 * Math.PI * T) / 2.2 + ph) * ramp, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    c.save();
    c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
    return true;
  }
  if (e.type === "arrow" && e.from && e.to) {
    const dx = e.to[0] - e.from[0], dy = e.to[1] - e.from[1], len = Math.hypot(dx, dy) || 1;
    const d = Math.sin((2 * Math.PI * T) / 1.8 + ph) * 4 * ramp;
    c.save();
    c.translate((dx / len) * d, (dy / len) * d);
    return true;
  }
  return false;
}

export interface FrameOpts {
  style?: string | StyleDef;
  /** Final frame of the previous scene, for the style's scene-in transition. */
  prev?: Cnv | null;
  subtitle?: string;
  W?: number;
  H?: number;
  /** Timing of the current caption, used only by storyboard fx.karaoke. */
  caption?: CaptionTiming;
}

/**
 * Per-scene style override (scene.style). It applies only when rendering the project's main style,
 * so `--style <other>` variants and other-style styleframes still render every scene in that one style.
 */
export function styleForScene(board: any, scene: any, requested?: string): StyleDef {
  const main = resolveStyleId(board.style ?? "whiteboard");
  const req = resolveStyleId(requested ?? main);
  const st = getStyle(scene?.style && req === main ? scene.style : req);
  // storyboard.fx.font: one handwriting family for every text role, main style only
  return board.fx?.font && st.id === main ? withFont(st, board.fx.font) : st;
}
const fontStyles = new Map<string, StyleDef>();
function withFont(st: StyleDef, family: string): StyleDef {
  const k = st.id + "|" + family;
  let d = fontStyles.get(k);
  if (!d) {
    d = Object.assign(Object.create(st), { font: (role: Role) => ({ family, scale: st.font(role).scale }) }) as StyleDef;
    fontStyles.set(k, d);
  }
  return d;
}

export function frame(board: any, scene: any, t: number, dir: string, subtitle = "", opts: FrameOpts = {}): Cnv {
  const style = typeof opts.style === "object" ? opts.style : styleForScene(board, scene, opts.style);
  const W = opts.W ?? 1920, H = opts.H ?? 1080;
  const cv = createCanvas(W, H);
  const c = cv.getContext("2d");
  const env = envFor(board, scene, t, W, H);
  // storyboard.fx applies only to the main style (variants keep their own look)
  const fx: BoardFx | null = board.fx && style.id === resolveStyleId(board.style ?? "whiteboard") ? board.fx : null;
  if (fx?.board) boardBackground(c, env, fx.board);
  else style.background(c, env);
  if (scene.backdrop?.src) {
    const im = images.get(path.join(dir, scene.backdrop.src));
    if (im) drawBackdrop(c, im, env, scene.backdrop);
  }
  const n = scene.drawOrder.length;
  // board layer: elements (and the optional pencil hand) move with the camera; background,
  // style overlays (post), transitions and subtitles stay fixed
  c.save();
  applyCamera(c, cameraAt(board, scene, style.id, t));
  const idleOn = board.fx?.idle !== false;
  scene.drawOrder.forEach((id: string, i: number) => {
    const e = scene.elements.find((q: any) => q.id === id);
    if (!e) return;
    const start = e.start ?? (i * scene.duration) / n, end = e.end ?? ((i + 1) * scene.duration) / n;
    const p = clamp01((t - start) / Math.max(0.1, end - start));
    if (p <= 0) return;
    const moved = idleOn && e.idle !== false && p >= 1 && idleTransform(style, c, e, t - end, i, scene.elements);
    drawElement(style, c, e, p, env, dir, i);
    if (moved) c.restore();
  });
  if (fx?.hand) {
    const handImg = images.get(path.join(dir, fx.hand.src));
    const pose = handImg && handPose(scene, t, (e, p) => tipOf(e, p, scene.elements, (q, label) => textLayoutFor(style, c, q, scene.elements, label)));
    if (handImg && pose) drawHand(c, handImg, fx.hand, pose.tip, pose.alpha, t);
  }
  c.restore();
  style.post?.(c, env, cv);
  if (opts.prev && style.transition && t < style.transition.dur) style.transition.draw(c, opts.prev, clamp01(t / style.transition.dur), env);
  if (subtitle) {
    if (fx?.karaoke) karaokeSubtitle(c, subtitle, env, fx.karaoke, opts.caption);
    else style.subtitle(c, subtitle, env);
  }
  return cv;
}

/** Split a title into at most two lines at the space closest to the middle (never inside a word). */
export function titleLines(title: string, maxChars = 14): string[] {
  const t = title.trim();
  if (t.length <= maxChars || !t.includes(" ")) return [t];
  let best = -1, bestD = 1e9;
  for (let i = 0; i < t.length; i++)
    if (t[i] === " ") {
      const d = Math.abs(i - t.length / 2);
      if (d < bestD) { bestD = d; best = i; }
    }
  return [t.slice(0, best).trim(), t.slice(best + 1).trim()];
}

export function cover(board: any, vertical = false, styleName?: string): Cnv {
  const style = getStyle(styleName ?? board.style);
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  const cv = createCanvas(W, H);
  const c = cv.getContext("2d");
  const title = board.cover?.title || board.title;
  const env = envFor(board, board.scenes[0], 0, W, H);
  style.cover(c, W, H, titleLines(title, vertical ? 9 : 14), env);
  return cv;
}

/** Real-font text fit check for one style: text wider than its box, or wrapping past its height. */
export function textFitIssues(board: any, styleName?: string) {
  const issues: any[] = [];
  const c = createCanvas(10, 10).getContext("2d");
  for (const s of board.scenes)
    for (const e of s.elements) {
      const style = styleForScene(board, s, styleName);
      let L: TextLayout | null = null, maxW = 0, maxH = 0;
      if (e.type === "text") {
        const parent = s.elements.find((q: any) => q.id === (e.parent || e.container));
        L = textLayoutFor(style, c, e, s.elements);
        maxW = parent ? parent.w - 40 : e.w;
        maxH = parent ? parent.h - 40 : e.h;
      } else if ((e.type === "rectangle" || e.type === "circle") && e.label) {
        L = textLayoutFor(style, c, e, s.elements, true);
        maxW = L?.box.w ?? 0;
        maxH = L?.box.h ?? 0;
      }
      if (!L) continue;
      const widest = Math.max(...L.lines.map((l) => l.width));
      const need = L.lines.length * L.lineH;
      if (widest > maxW + 1) { const chars = [...(e.type === "text" ? e.text : e.label)].length; const fit = Math.max(1, Math.floor((chars * maxW) / widest)); issues.push({ level: "error", scene: s.id, id: e.id, rule: "text wider than box", style: style.id, detail: `${Math.round(widest)}px > ${Math.round(maxW)}px; about ${fit} of ${chars} characters fit per line at this size: widen the box, shorten the text or add a space so it can wrap` }); }
      if (need > maxH + L.size * 0.3) issues.push({ level: "error", scene: s.id, id: e.id, rule: `text clipped (wraps to ${L.lines.length} lines)`, style: style.id, detail: `${Math.round(need)}px > ${Math.round(maxH)}px` });
    }
  return issues;
}
