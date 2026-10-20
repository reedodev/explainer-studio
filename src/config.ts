import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUTPUT_ROOT = path.join(PROJECT_ROOT, "output");
export const FONT_DIR = path.join(PROJECT_ROOT, "assets", "fonts");

/** Default video spec. Every coordinate in storyboard.json lives in this space. */
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  targetMinSec: 120,
  targetMaxSec: 180,
} as const;

/** Excalidraw-like limited palette. Storyboards reference these by NAME, never by hex. */
export const PALETTE = {
  black: "#1b1b1b",
  yellow: "#ffec99",
  blue: "#a5d8ff",
  green: "#b2f2bb",
  red: "#ffc9c9",
  grey: "#e9ecef",
  white: "#ffffff",
} as const;
export type PaletteName = keyof typeof PALETTE;
export const PALETTE_NAMES = Object.keys(PALETTE) as PaletteName[];

/** Safe areas (1920x1080 reference). */
export const SAFE = {
  /** Everything with y >= subtitleTop is reserved for subtitles. */
  subtitleTop: 960,
  /** Top-right brand / watermark box. */
  watermark: { x: 1920 - 320, y: 0, w: 320, h: 130 },
  /** Outer margin used by autofix when clamping elements back on canvas. */
  margin: 40,
} as const;

export const LIMITS = {
  minFontSize: 28,
  maxElementsPerScene: 12,
  maxStaticSec: 10,
  /** Drawing should keep going until at least this fraction of the narration. */
  minDrawCoverage: 0.6,
  /** Overlap ratio (intersection / smaller area) that triggers a warning. */
  overlapWarnRatio: 0.15,
  sceneMin: 6,
  sceneMax: 8,
  subtitleMaxChars: 24,
} as const;

export const TIMING = {
  headPadSec: 0.4,
  tailPadSec: 0.8,
  sentenceGapSec: 0.28,
  transitionSec: 0.4,
  gapBetweenElementsSec: 0.15,
} as const;

export const STICKER_STYLE_PROMPT =
  "Whiteboard sticker illustration in Excalidraw hand-drawn style: thick, slightly wobbly black marker outlines, flat pastel fills using ONLY these colours: pale yellow #ffec99, pale blue #a5d8ff, pale green #b2f2bb, pale red #ffc9c9, light grey #e9ecef, plus black lines. Simple proportions, clean and readable at small size, isolated subject centred on a PURE FLAT WHITE background #FFFFFF with nothing else. No shadow, no ground line, no texture, no gradient, no text, no letters, no numerals, no logos, no watermark, no border, no photorealism, no 3D.";
