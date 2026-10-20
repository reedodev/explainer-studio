/** Style registry. Folder names match styles/<id>/STYLE.md. */
import { whiteboard } from "./whiteboard.js";
import { swissMotion } from "./swiss-motion.js";
import { blueprint } from "./blueprint.js";
import { inkWash } from "./ink-wash.js";
import { urbanSketch } from "./urban-sketch.js";
import { spyTitles } from "./spy-titles.js";
import { shadowPuppet } from "./shadow-puppet.js";
import { asciiCrt } from "./ascii-crt.js";
import type { StyleDef } from "./types.js";

export const STYLES: Record<string, StyleDef> = Object.fromEntries(
  [whiteboard, swissMotion, blueprint, inkWash, urbanSketch, spyTitles, shadowPuppet, asciiCrt].map((s) => [s.id, s]),
);

/** Aliases users may type (Korean names, short names). */
const ALIASES: Record<string, string> = {
  "화이트보드": "whiteboard", wb: "whiteboard", excalidraw: "whiteboard",
  swiss: "swiss-motion", "스위스": "swiss-motion", "스위스타이포": "swiss-motion", typography: "swiss-motion", "타이포": "swiss-motion",
  "블루프린트": "blueprint", "설계도": "blueprint", "청사진": "blueprint",
  ink: "ink-wash", "수묵": "ink-wash", "수묵화": "ink-wash",
  sketch: "urban-sketch", watercolor: "urban-sketch", "스케치": "urban-sketch", "담채": "urban-sketch", "펜담채": "urban-sketch",
  spy: "spy-titles", "첩보": "spy-titles", "007": "spy-titles",
  puppet: "shadow-puppet", "그림자극": "shadow-puppet", "피영": "shadow-puppet",
  ascii: "ascii-crt", terminal: "ascii-crt", crt: "ascii-crt", "터미널": "ascii-crt",
};

export function resolveStyleId(name?: string): string {
  const n = (name ?? "whiteboard").trim().toLowerCase().replace(/\s+/g, "");
  if (STYLES[n]) return n;
  if (ALIASES[n]) return ALIASES[n];
  throw new Error(`Unknown style "${name}". Available: ${Object.keys(STYLES).join(", ")}`);
}
export function getStyle(name?: string): StyleDef {
  return STYLES[resolveStyleId(name)];
}
export type { StyleDef } from "./types.js";
