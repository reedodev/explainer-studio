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
  from: Point,
  to: Point,
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
      const x = Math.min(el.from[0], el.to[0]) - pad;
      const y = Math.min(el.from[1], el.to[1]) - pad - Math.abs(el.bend ?? 0);
      return { x, y, w: Math.abs(el.to[0] - el.from[0]) + pad * 2, h: Math.abs(el.to[1] - el.from[1]) + pad * 2 + Math.abs(el.bend ?? 0) * 2 };
    }
    case "highlight": {
      if (el.target && all) {
        const t = all.find((e) => e.id === el.target);
        if (t && t.type !== "highlight") return elementBox(t, all);
      }
      if (el.x !== undefined && el.y !== undefined && el.w && el.h) return { x: el.x, y: el.y, w: el.w, h: el.h };
      return null;
    }
    default:
      return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
}


