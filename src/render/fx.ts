/**
 * Optional "board fx" layer (storyboard.fx). Everything here is OFF unless a storyboard sets `fx`,
 * and it only applies when rendering the project's main style, so other styles/variants are unchanged.
 *
 *   fx.board     off-white board colour (hex) with a faint paper grain, replacing the style background
 *   fx.hand      pencil-holding hand image whose pencil tip follows the stroke/text currently being drawn
 *   fx.font      one font family for every text role (e.g. Gaegu Bold for phone readability)
 *   fx.karaoke   bottom subtitles with the currently spoken word boxed (proportional timing, not forced alignment)
 * Scene / element options used with fx (also harmless without it):
 *   scene.backdrop          full-frame photo behind the scene (slow push-in)
 *   image.frame = "card"     photo pinned on the board as a bordered card with tape and a soft shadow
 *   image.tilt               card rotation in degrees
 *   rectangle.paper          opaque paper note under a drawn rectangle (readable on photos)
 *   element.hand = false     never show the hand for this element
 */
import { cachedTexture, clamp01, easeInOutCubic, easeOutCubic, ellipsePts, font, hexRgb, paintMottled, rectPts, type Ctx, type Pt } from "./core.js";
import { iconPaths } from "./icons.js";
import { targetBox } from "../storyboard/schema.js";
import type { Env, TextLayout } from "./styles/types.js";

export interface BoardFx {
  board?: string;
  hand?: { src: string; tip: Pt; width?: number; tiltDeg?: number };
  karaoke?: { color?: string; size?: number; family?: string; band?: string; ink?: string };
  /** true = element start/end in the storyboard were set from measured audio; the CLI timing step leaves them alone. */
  manualTiming?: boolean;
}
export interface CaptionTiming {
  start: number;
  end: number;
  /** Global time (s) of this frame. */
  now: number;
}

export function boardBackground(c: Ctx, env: Env, color: string) {
  const tex = cachedTexture("fx-board-" + color, env.W, env.H, (cc, W, H) => paintMottled(cc, W, H, hexRgb(color), 0.012, 7, 0.0022, 5));
  c.drawImage(tex, 0, 0);
}

/** Cover-fit photo filling the frame, with a slow push-in over the scene. */
export function drawBackdrop(c: Ctx, img: any, env: Env, bd: any) {
  const [z0, z1] = bd.zoom ?? [1.0, 1.06];
  const q = env.duration > 0 ? clamp01(env.t / env.duration) : 1;
  const z = z0 + (z1 - z0) * easeInOutCubic(q);
  const [fx, fy] = bd.focus ?? [0.5, 0.5];
  const s = Math.max(env.W / img.width, env.H / img.height) * z;
  const w = img.width * s, h = img.height * s;
  const x = (env.W - w) * fx, y = (env.H - h) * fy;
  c.drawImage(img, x, y, w, h);
  if (bd.dim) {
    c.fillStyle = `rgba(0,0,0,${bd.dim})`;
    c.fillRect(0, 0, env.W, env.H);
  }
}

/** Opaque paper note with a soft shadow and a strip of tape (drawn before the style's rectangle). */
export function paperNote(c: Ctx, b: { x: number; y: number; w: number; h: number }, p: number, color = "#fbf8f1") {
  const a = clamp01(p * 3);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  c.shadowColor = "rgba(0,0,0,0.28)";
  c.shadowBlur = 18;
  c.shadowOffsetY = 6;
  c.fillStyle = color;
  c.fillRect(b.x, b.y, b.w, b.h);
  c.shadowColor = "rgba(0,0,0,0)";
  tape(c, b.x + b.w / 2, b.y + 2, Math.min(150, b.w * 0.3), -2);
  c.restore();
}

function tape(c: Ctx, cx: number, cy: number, w: number, deg: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate((deg * Math.PI) / 180);
  c.fillStyle = "rgba(236,226,196,0.82)";
  c.fillRect(-w / 2, -16, w, 32);
  c.restore();
}

/** Photo card pinned on the board: white border, tape, soft shadow, optional tilt; settles in with a small drop. */
export function photoCard(c: Ctx, img: any, b: { x: number; y: number; w: number; h: number }, p: number, tiltDeg = 0) {
  if (p <= 0) return;
  const e = easeOutCubic(clamp01(p * 3));
  const border = Math.max(10, Math.round(Math.min(b.w, b.h) * 0.035));
  c.save();
  c.globalAlpha = clamp01(p * 6);
  c.translate(b.x + b.w / 2, b.y + b.h / 2 - (1 - e) * 26);
  c.rotate(((tiltDeg + (1 - e) * 3) * Math.PI) / 180);
  const s = 0.94 + 0.06 * e;
  c.scale(s, s);
  c.shadowColor = "rgba(0,0,0,0.30)";
  c.shadowBlur = 22;
  c.shadowOffsetY = 8;
  c.fillStyle = "#fefdfa";
  c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
  c.shadowColor = "rgba(0,0,0,0)";
  // cover-fit the photo inside the border
  const iw = b.w - border * 2, ih = b.h - border * 2;
  const k = Math.max(iw / img.width, ih / img.height);
  const sw = iw / k, sh = ih / k;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -iw / 2, -ih / 2, iw, ih);
  tape(c, -b.w * 0.36, -b.h / 2 + 4, Math.min(130, b.w * 0.22), -14);
  tape(c, b.w * 0.36, -b.h / 2 + 4, Math.min(130, b.w * 0.22), 12);
  c.restore();
}

/* ------------------------------------------------------------- hand tip */

function along(pts: Pt[], p: number): Pt {
  if (pts.length === 1) return pts[0];
  const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0) || 1;
  let d = clamp01(p) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? clamp01(d / segs[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
    }
    d -= segs[i];
  }
  return pts[pts.length - 1];
}
function alongPaths(paths: Pt[][], p: number): Pt {
  const lens = paths.map((q) => q.slice(1).reduce((n, a, i) => n + Math.hypot(a[0] - q[i][0], a[1] - q[i][1]), 0));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = clamp01(p) * total;
  for (let i = 0; i < paths.length; i++) {
    if (d <= lens[i] || i === paths.length - 1) return along(paths[i], lens[i] ? d / lens[i] : 0);
    d -= lens[i];
  }
  return paths[0][0];
}
/** Pen position inside a text layout revealed left-to-right (matches revealText "write"). */
export function textTip(L: TextLayout, p: number): Pt | null {
  const total = L.lines.reduce((n, l) => n + [...l.text].length, 0) || 1;
  let used = 0;
  for (const l of L.lines) {
    const n = [...l.text].length;
    const lp = clamp01((p * total - used) / Math.max(1, n));
    used += n;
    if (lp < 1 || used >= total) return [l.x + l.width * lp, l.y - L.size * 0.3];
  }
  return null;
}

/**
 * Where the pen is for element e at progress p, or null when the element is not "drawn" by hand
 * (images, stickers, charts). `layout(e,label)` returns the text layout the engine uses.
 */
export function tipOf(e: any, p: number, all: any[], layout: (e: any, label: boolean) => TextLayout | null): Pt | null {
  switch (e.type) {
    case "text": {
      const L = layout(e, false);
      return L ? textTip(L, p) : null;
    }
    case "rectangle":
    case "circle": {
      const L = e.label ? layout(e, true) : null;
      if (L && p > 0.62) return textTip(L, clamp01((p - 0.4) / 0.6));
      const pts = e.type === "circle" ? ellipsePts(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 100) : rectPts(e.x, e.y, e.w, e.h);
      return along(pts, clamp01(p / 0.7));
    }
    case "line":
      return along(e.points, p);
    case "arrow":
      return p < 0.8 ? along([e.from, e.to], p / 0.8) : e.to;
    case "icon":
      return alongPaths(iconPaths(e.icon).map((q) => q.map((a) => [e.x + (a[0] / 100) * e.w, e.y + (a[1] / 100) * e.h] as Pt)), p);
    case "highlight": {
      const t = e.target ? targetBox(e.target, all) : null;
      const b = e.w ? e : t;
      if (!b) return null;
      if (e.style === "circle") return along(ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 30, b.h / 2 + 24, 105), p);
      if (e.style === "marker") return [b.x - 10 + (b.w + 20) * p, b.y + b.h * 0.55];
      return [b.x + b.w * p, b.y + b.h + 8];
    }
    default:
      return null;
  }
}

/** Hand pose for this frame: the active element's tip; a short hold after a stroke ends; otherwise off-screen. */
export function handPose(scene: any, t: number, tipFor: (e: any, p: number) => Pt | null): { tip: Pt; alpha: number } | null {
  const els = scene.drawOrder.map((id: string) => scene.elements.find((q: any) => q.id === id)).filter(Boolean);
  const n = els.length;
  let active: Pt | null = null;
  let lastTip: Pt | null = null, lastEnd = -Infinity;
  for (let i = 0; i < n; i++) {
    const e = els[i];
    if (e.hand === false) continue;
    const s = e.start ?? (i * scene.duration) / n, en = e.end ?? ((i + 1) * scene.duration) / n;
    const p = clamp01((t - s) / Math.max(0.1, en - s));
    if (p > 0 && p < 1) {
      const tp = tipFor(e, p);
      if (tp) active = tp;
    } else if (p >= 1 && en >= lastEnd) {
      const tp = tipFor(e, 1);
      if (tp) { lastTip = tp; lastEnd = en; }
    }
  }
  if (active) return { tip: active, alpha: 1 };
  if (lastTip && t - lastEnd < 0.7) {
    const q = clamp01((t - lastEnd - 0.25) / 0.45);
    return { tip: [lastTip[0] + q * 520, lastTip[1] + q * 420], alpha: 1 - q };
  }
  return null;
}

export function drawHand(c: Ctx, img: any, hand: NonNullable<BoardFx["hand"]>, tip: Pt, alpha: number, t: number) {
  const w = hand.width ?? 560;
  const s = w / img.width;
  // small deterministic wobble so the hand never looks pasted
  const wx = Math.sin(t * 9.1) * 2.2 + Math.sin(t * 3.7) * 1.4;
  const wy = Math.cos(t * 8.3) * 1.8;
  c.save();
  c.globalAlpha = alpha;
  c.translate(tip[0] + wx, tip[1] + wy);
  c.rotate(((hand.tiltDeg ?? 0) * Math.PI) / 180);
  c.shadowColor = "rgba(0,0,0,0.16)";
  c.shadowBlur = 16;
  c.shadowOffsetX = 10;
  c.shadowOffsetY = 12;
  c.drawImage(img, -hand.tip[0] * s, -hand.tip[1] * s, img.width * s, img.height * s);
  c.restore();
}

/* --------------------------------------------------------- karaoke subs */

/**
 * Bottom subtitle with the current word boxed. The word clock is proportional to characters within the
 * caption's [start, end) window (the engine's existing subtitle timing) - it is not forced alignment.
 */
export function karaokeSubtitle(c: Ctx, text: string, env: Env, k: NonNullable<BoardFx["karaoke"]>, timing?: CaptionTiming) {
  if (!text) return;
  const size = k.size ?? 44;
  const family = k.family ?? "WB Gothic XB";
  const top = 960;
  c.save();
  c.fillStyle = k.band ?? "rgba(251,249,243,0.94)";
  c.fillRect(0, top, env.W, env.H - top);
  c.fillStyle = "rgba(27,27,27,0.10)";
  c.fillRect(0, top, env.W, 2);
  c.font = font(size, family);
  c.textBaseline = "alphabetic";
  const lines = text.split("\n");
  const words: { line: number; text: string }[] = [];
  lines.forEach((l, i) => l.split(/\s+/).filter(Boolean).forEach((w) => words.push({ line: i, text: w })));
  const weights = words.map((w) => [...w.text].length + 0.6);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let cur = -1;
  if (timing && timing.end > timing.start) {
    const q = clamp01((timing.now - timing.start) / (timing.end - timing.start)) * total;
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      acc += weights[i];
      if (q < acc) { cur = i; break; }
    }
    if (cur < 0) cur = words.length - 1;
  }
  const gap = c.measureText(" ").width;
  const lineH = size * 1.22;
  // 44px keeps the original baselines; larger sizes move up so two lines stay inside the 120px band
  const grow = Math.max(0, size - 44);
  const baseY = lines.length === 1 ? 1036 + grow * 0.4 : 1008 - grow * 0.75;
  let wi = 0;
  lines.forEach((_l, li) => {
    const ws = words.filter((w) => w.line === li);
    const widths = ws.map((w) => c.measureText(w.text).width);
    const lw = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, ws.length - 1);
    let x = (env.W - lw) / 2;
    const y = baseY + li * lineH;
    ws.forEach((w, j) => {
      const isCur = wi === cur;
      if (isCur) {
        const pad = 7;
        c.fillStyle = "rgba(224,49,49,0.10)";
        c.fillRect(x - pad, y - size * 0.95, widths[j] + pad * 2, size * 1.22);
        c.strokeStyle = k.color ?? "#e03131";
        c.lineWidth = 4;
        c.lineJoin = "round";
        c.strokeRect(x - pad, y - size * 0.95, widths[j] + pad * 2, size * 1.22);
      }
      c.fillStyle = k.ink ?? "#1b1b1b";
      c.fillText(w.text, x, y);
      x += widths[j] + gap;
      wi++;
    });
  });
  c.restore();
}


/* ---------------------------------------------------------- grid panel */

/**
 * image.frame = "panel": colour photo / screen capture inside a grid-aligned panel with a thin black rule
 * (swiss-motion evidence panels). Snap wipe from the top, no shadow, no rounding, no fade.
 * image.fit = "contain" letterboxes on white instead of cover-cropping. image.caption is a small tag under the
 * panel's bottom-left corner (e.g. "실제 화면 · 2026-10-08" or "재구성").
 */
export function gridPanel(
  c: Ctx,
  img: any,
  b: { x: number; y: number; w: number; h: number },
  p: number,
  o: { fit?: "cover" | "contain"; caption?: string; rule?: number; captionFamily?: string } = {},
) {
  if (p <= 0) return;
  const q = clamp01(p * 2);
  const e = q < 1 ? 1 - Math.pow(1 - q, 3) * (1 - q) : 1; // fast snap-out, settles without overshoot
  c.save();
  c.beginPath();
  c.rect(b.x - 4, b.y - 4, b.w + 8, (b.h + 8) * e);
  c.clip();
  c.fillStyle = "#FFFFFF";
  c.fillRect(b.x, b.y, b.w, b.h);
  const k = o.fit === "contain" ? Math.min(b.w / img.width, b.h / img.height) : Math.max(b.w / img.width, b.h / img.height);
  const dw = img.width * k, dh = img.height * k;
  c.beginPath();
  c.rect(b.x, b.y, b.w, b.h);
  c.clip();
  c.drawImage(img, b.x + (b.w - dw) / 2, b.y + (b.h - dh) / 2, dw, dh);
  c.restore();
  const r = o.rule ?? 2;
  if (r > 0) {
    c.save();
    c.strokeStyle = "#111111";
    c.lineWidth = r;
    c.strokeRect(b.x - r / 2, b.y - r / 2, b.w + r, (b.h + r) * e);
    c.restore();
  }
  if (o.caption && e >= 1) {
    c.save();
    c.font = font(28, o.captionFamily ?? "WB Sans Medium");
    const tw = c.measureText(o.caption).width;
    c.fillStyle = "#111111";
    c.fillRect(b.x, b.y + b.h, tw + 24, 40);
    c.fillStyle = "#FFFFFF";
    c.textBaseline = "middle";
    c.fillText(o.caption, b.x + 12, b.y + b.h + 21);
    c.restore();
  }
}
