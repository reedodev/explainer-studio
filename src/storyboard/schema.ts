/**
 * Renderer-agnostic storyboard schema.
 *
 * storyboard.json describes WHAT appears on screen, WHERE (1920x1080 reference space)
 * and in WHICH ORDER. It says nothing about stroke rendering, fonts or easing: those
 * belong to a renderer "style" (see src/render/styles). Another style could render
 * the same file (e.g. a clean flat-motion style) without changing the content.
 */
import { z } from "zod";
import { PALETTE_NAMES } from "../config.js";

const Color = z.enum(PALETTE_NAMES as [string, ...string[]]);
const Point = z.tuple([z.number(), z.number()]);

const Base = z.object({
  /** false = no idle motion (bob / breathe / nudge) after this element is drawn. */
  idle: z.boolean().optional(),
  parent: z.string().optional(),
  container: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  valign: z.enum(['top', 'middle', 'bottom']).optional(),
  id: z.string().min(1),
  /** Index of the narration sentence (0-based, within the scene) that should trigger this element. */
  cue: z.number().int().min(0).optional(),
  /** Relative animation weight (1 = type default). */
  weight: z.number().positive().optional(),
  stroke: Color.optional(),
  fill: Color.optional(),
  /** Free-form note for humans; ignored by renderers. */
  note: z.string().optional(),
  /** Allowed to extend into the subtitle band / frame edge (e.g. a character cut at the frame bottom). */
  bleed: z.boolean().optional(),
  /** false = never show the fx pencil hand for this element. */
  hand: z.boolean().optional(),
  /** Optional cap (seconds) on this element's draw window when the CLI derives timing (e.g. a hook that must snap in fast). */
  dur: z.number().positive().optional(),
});

const Box = { x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() };

export const TextEl = Base.extend({
  type: z.literal("text"),
  ...Box,
  text: z.string().min(1),
  fontSize: z.number().positive().default(56),
  /** semantic role: title | heading | body | label | caption. Styles map roles to fonts. */
  role: z.enum(["title", "heading", "body", "label", "caption"]).default("body"),
  align: z.enum(["left", "center", "right"]).optional(),
  color: Color.optional(),
});

export const RectEl = Base.extend({
  type: z.literal("rectangle"),
  ...Box,
  label: z.string().optional(),
  labelSize: z.number().positive().optional(),
  /** Opaque paper note (soft shadow + tape) under the rectangle, readable over photos. */
  paper: z.boolean().optional(),
});

export const CircleEl = Base.extend({
  type: z.literal("circle"),
  ...Box,
  label: z.string().optional(),
  labelSize: z.number().positive().optional(),
});

export const LineEl = Base.extend({
  type: z.literal("line"),
  points: z.array(Point).min(2),
  dashed: z.boolean().optional(),
});

export const ArrowEl = Base.extend({
  type: z.literal("arrow"),
  /** Start and end points. Either may be left out when the matching *Target is given. */
  from: Point.optional(),
  to: Point.optional(),
  /** Aim at another element ("id") or a chart bar ("chart1:blue" by label, "chart1:2" by index from 0). The end stops 10 px before the edge. */
  toTarget: z.string().optional(),
  /** Start next to another element or chart bar; same syntax as toTarget. */
  fromTarget: z.string().optional(),
  /** Perpendicular bend in px for a curved arrow (0 = straight). */
  bend: z.number().optional(),
  label: z.string().optional(),
  labelSize: z.number().positive().optional(),
});

export const ImageEl = Base.extend({
  type: z.literal("image"),
  ...Box,
  /** Path relative to the project output folder. */
  src: z.string(),
  /** "card" = photo pinned on the board with border, tape and shadow; "panel" = colour image in a grid panel with a thin black rule. */
  frame: z.enum(["card", "panel", "none"]).optional(),
  /** panel only: "cover" (default) crops to the box, "contain" letterboxes on white. */
  fit: z.enum(["cover", "contain"]).optional(),
  /** panel only: small tag under the bottom-left corner, e.g. "실제 화면 · 2026-10-08" or "재구성". */
  caption: z.string().optional(),
  /** Card rotation in degrees. */
  tilt: z.number().optional(),
});

export const StickerEl = Base.extend({
  type: z.literal("sticker"),
  ...Box,
  /** Sticker asset id -> stickers/<sticker>.png (see storyboard.stickers). */
  sticker: z.string(),
});

export const IconEl = Base.extend({
  type: z.literal("icon"),
  ...Box,
  /** Built-in hand-drawn icon name (see src/render/styles/icons.ts). */
  icon: z.string(),
});

export const ChartEl = Base.extend({
  type: z.literal("chart"),
  ...Box,
  chartType: z.enum(["bar"]).default("bar"),
  data: z.array(z.object({ label: z.string(), value: z.number(), color: Color.optional() })).min(1),
  /** Optional value suffix, e.g. "%". */
  unit: z.string().optional(),
});

export const HighlightEl = Base.extend({
  type: z.literal("highlight"),
  /** Highlight another element's bounding box, or give an explicit box. */
  target: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  style: z.enum(["underline", "circle", "marker"]).default("underline"),
});

export const Element = z.discriminatedUnion("type", [
  TextEl, RectEl, CircleEl, LineEl, ArrowEl, ImageEl, StickerEl, IconEl, ChartEl, HighlightEl,
]);

export const Scene = z.object({
  id: z.string(),
  /** Script section: hook | question | concept | structure | example | limits | summary | outro */
  section: z.string().optional(),
  narration: z.string().min(1),
  /** Optional on-screen subtitle text (same sentences as narration, display spelling). Speech always uses narration. */
  subtitle: z.string().optional(),
  /** Seconds. 0 = derive from TTS audio. Written back by the timing step. */
  duration: z.number().min(0).default(0),
  layout: z.string().default("free"),
  /** Optional per-scene style override (e.g. a spy-titles opening in a whiteboard video). Used only when rendering the main style. */
  style: z.string().optional(),
  /** Camera for this scene: push (default) | pan-left | pan-right | still. Board layer only. */
  camera: z.enum(["push", "pan-left", "pan-right", "still"]).optional(),
  /** Full-frame photo behind this scene's elements (cover fit, slow push-in). */
  backdrop: z.object({ src: z.string(), zoom: z.tuple([z.number(), z.number()]).optional(), focus: z.tuple([z.number(), z.number()]).optional(), dim: z.number().min(0).max(1).optional() }).optional(),
  elements: z.array(Element).min(1),
  drawOrder: z.array(z.string()).default([]),
});

export const StickerSpec = z.object({
  id: z.string(),
  /** Subject description; the global sticker style prompt is appended automatically. */
  subject: z.string(),
});

export const Storyboard = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  topic: z.string(),
  language: z.string().default("ko"),
  canvas: z.object({ width: z.number(), height: z.number() }).default({ width: 1920, height: 1080 }),
  cover: z
    .object({ title: z.string().optional(), subtitle: z.string().optional(), sticker: z.string().optional() })
    .default({}),
  brand: z.string().optional(),
  /** Visual style id (see styles/README.md). The same storyboard renders in any style. */
  style: z.string().optional(),
  stickers: z.array(StickerSpec).default([]),
  /** Default camera for every scene (scene.camera wins). Styles swiss-motion and ascii-crt default to still. */
  camera: z.enum(["push", "pan-left", "pan-right", "still"]).optional(),
  /** Share of each scene by which all elements are drawn (default 0.65). */
  drawBy: z.number().min(0.3).max(0.97).optional(),
  /** Optional bottom-subtitle font size in px for band subtitles (style default, usually 38, when absent). */
  subtitleSize: z.number().min(28).max(56).optional(),
  /** Optional board effects for the main style: off-white board, pencil hand following the stroke, karaoke subtitles. */
  fx: z
    .object({
      board: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      /** Font family for every text role of the main style (e.g. "WB Hand Bold"). */
      font: z.string().optional(),
      hand: z.object({ src: z.string(), tip: z.tuple([z.number(), z.number()]), width: z.number().positive().optional(), tiltDeg: z.number().optional() }).optional(),
      karaoke: z.object({ color: z.string().optional(), size: z.number().min(28).optional(), family: z.string().optional(), band: z.string().optional(), ink: z.string().optional() }).optional(),
      /** true = element start/end were set from measured audio by a project tool; `es tts/validate/render` keep them. */
      manualTiming: z.boolean().optional(),
      /** false = no idle motion after drawing; camera false = no camera moves at all. */
      idle: z.boolean().optional(),
      camera: z.boolean().optional(),
    })
    .optional(),
  scenes: z.array(Scene).min(1),
});

export type Storyboard = z.infer<typeof Storyboard>;
export type Scene = z.infer<typeof Scene>;
export type Element = z.infer<typeof Element>;
export type ElementType = Element["type"];
export type Box = { x: number; y: number; w: number; h: number };

/** Bounding box of any element (used by validation and highlight). */
export function elementBox(el: Element, all?: Element[]): Box | null {
  switch (el.type) {
    case "line": {
      const xs = el.points.map((p) => p[0]);
      const ys = el.points.map((p) => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(1, Math.max(...xs) - Math.min(...xs)), h: Math.max(1, Math.max(...ys) - Math.min(...ys)) };
    }
    case "arrow": {
      const pad = 20;
      const [fx, fy] = el.from ?? el.to ?? [0, 0], [tx, ty] = el.to ?? el.from ?? [0, 0];
      const x = Math.min(fx, tx) - pad;
      const y = Math.min(fy, ty) - pad - Math.abs(el.bend ?? 0);
      return { x, y, w: Math.abs(tx - fx) + pad * 2, h: Math.abs(ty - fy) + pad * 2 + Math.abs(el.bend ?? 0) * 2 };
    }
    case "highlight": {
      if (el.target && all) {
        const b = targetBox(el.target, all);
        if (b) return b;
      }
      if (el.x !== undefined && el.y !== undefined && el.w && el.h) return { x: el.x, y: el.y, w: el.w, h: el.h };
      return null;
    }
    default:
      return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
}



/** Bar geometry of a chart (shared by drawing, highlight/arrow targets and validation). */
export const CHART_LABEL_H = 68; // category label strip under the bars (>= 34 px text)
export const CHART_VALUE_H = 58; // value label above the tallest bar (>= 38 px text)
export type ChartBar = { label: string; value: number; color?: string; x: number; y: number; w: number; h: number; slotX: number; slotW: number };
export function chartLayout(el: { x: number; y: number; w: number; h: number; data: { label: string; value: number; color?: string }[] }): { bars: ChartBar[]; baseY: number; plotH: number } {
  const n = el.data.length, slot = el.w / n, bw = slot * (n <= 4 ? 0.8 : 0.72); // few bars: wide, tightly spaced
  const baseY = el.y + el.h - CHART_LABEL_H, plotH = Math.max(40, el.h - CHART_LABEL_H - CHART_VALUE_H);
  const max = Math.max(...el.data.map((d) => d.value), 1e-9);
  // A bar never gets thinner than 12 % of the plot, so 4 vs 60 is still a visible bar (the value label tells the truth).
  const minH = plotH * 0.12;
  const bars = el.data.map((d, k) => {
    const h = d.value <= 0 ? 0 : Math.min(plotH, Math.max(minH, (d.value / max) * plotH));
    return { label: d.label, value: d.value, color: d.color, x: el.x + k * slot + (slot - bw) / 2, y: baseY - h, w: bw, h, slotX: el.x + k * slot, slotW: slot };
  });
  return { bars, baseY, plotH };
}

/** Box of a target: "id" for any element, "chartId:label" or "chartId:index" for one chart bar ("chartId:label+labels" adds its two labels). */
export function targetBox(target: string, all: Element[]): Box | null {
  const whole = all.find((e) => e.id === target);
  if (whole && whole.type !== "highlight") return elementBox(whole, all);
  const k = target.indexOf(":");
  if (k < 0) return null;
  const ch = all.find((e) => e.id === target.slice(0, k));
  if (!ch || ch.type !== "chart") return null;
  let key = target.slice(k + 1).trim();
  // "chart:blue+labels" also covers the value label above and the category label below the bar
  const withLabels = key.endsWith("+labels");
  if (withLabels) key = key.slice(0, -7).trim();
  const { bars, baseY } = chartLayout(ch as any);
  const bar = /^\d+$/.test(key) ? bars[Number(key)] : bars.find((b) => b.label.toLowerCase() === key.toLowerCase());
  if (!bar) return null;
  // 10 % wider than the slot, so a circle around it clears the category label at its narrow bottom
  if (withLabels) return { x: bar.slotX + bar.slotW * 0.02, y: bar.y - 54, w: bar.slotW * 0.96, h: baseY + 64 - (bar.y - 54) };
  return { x: bar.x, y: bar.y, w: bar.w, h: bar.h };
}

/** Point on the rectangle (grown by gap) where a straight line from `from` to the rectangle's centre enters it. */
export function edgePoint(from: [number, number], b: Box, gap = 10): [number, number] {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = from[0] - cx, dy = from[1] - cy;
  const hw = b.w / 2 + gap, hh = b.h / 2 + gap;
  if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) return [cx, cy];
  const s = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  return [Math.round(cx + dx * s), Math.round(cy + dy * s)];
}

/** Fill in arrow ends from toTarget/fromTarget. Call once after parsing; everything downstream sees plain from/to. */
export function resolveArrowTargets(sb: { scenes: { id: string; elements: Element[] }[] }) {
  for (const s of sb.scenes)
    for (const e of s.elements) {
      if (e.type !== "arrow") continue;
      const tb = e.toTarget ? targetBox(e.toTarget, s.elements) : null, fb = e.fromTarget ? targetBox(e.fromTarget, s.elements) : null;
      if (e.toTarget && !tb) throw new Error(`scene ${s.id}, arrow ${e.id}: toTarget "${e.toTarget}" is not an element id or a chart bar ("chartId:label")`);
      if (e.fromTarget && !fb) throw new Error(`scene ${s.id}, arrow ${e.id}: fromTarget "${e.fromTarget}" is not an element id or a chart bar ("chartId:label")`);
      const centre = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];
      // fromTarget / toTarget always win over a stored from / to, so moving the target moves the arrow
      if (fb) e.from = edgePoint(tb ? centre(tb) : (e.to ?? centre(fb)), fb);
      if (tb) e.to = edgePoint(e.from ?? centre(tb), tb);
      if (!e.from || !e.to) throw new Error(`scene ${s.id}, arrow ${e.id}: needs from and to (or fromTarget/toTarget)`);
    }
  return sb;
}
