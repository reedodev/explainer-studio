/**
 * A visual style = everything about HOW a storyboard looks and moves.
 * storyboard.json only says WHAT appears WHERE and WHEN; any style can render it.
 * Add a style: implement StyleDef in src/render/styles/<id>.ts, register it in index.ts,
 * and document it in styles/<id>/STYLE.md.
 */
import type { Ctx, Pt, Cnv } from "../core.js";

export type Token = "black" | "yellow" | "blue" | "green" | "red" | "grey" | "white";
export type Role = "title" | "heading" | "body" | "label" | "caption";

export interface Env {
  W: number;
  H: number;
  /** Seconds since the scene started. */
  t: number;
  sceneIndex: number;
  sceneCount: number;
  duration: number;
  board: any;
  scene: any;
}

export interface StrokeOpts {
  seed: number;
  color: string;
  /** Semantic kind lets a style vary weight: outlines heavier than icon details, etc. */
  kind: "outline" | "line" | "arrow" | "head" | "icon" | "underline" | "deco";
  width?: number;
  dashed?: boolean;
  env: Env;
}

export interface ShapeSpec {
  kind: "rect" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: Token;
  stroke?: Token;
  seed: number;
}

export interface LaidLine {
  text: string;
  x: number;
  /** Baseline y. */
  y: number;
  width: number;
}
export interface TextLayout {
  lines: LaidLine[];
  size: number;
  family: string;
  lineH: number;
  box: { x: number; y: number; w: number; h: number };
}
export interface TextOpts {
  color: string;
  role: Role;
  seed: number;
  env: Env;
}

export interface StyleDef {
  id: string;
  name: string;
  nameKo: string;
  /** One-line description (Korean). */
  summary: string;
  /** Topics this style suits (Korean). */
  bestFor: string;
  /** Font family + size multiplier for a text role. */
  font(role: Role): { family: string; scale: number };
  /** Line / outline colour for an optional stroke token. */
  ink(token: Token | undefined, env: Env): string;
  /** Text colour. `onFill` is the fill token of the containing shape, if any. */
  textColor(env: Env, onFill?: Token): string;
  background(c: Ctx, env: Env): void;
  /** Progressive stroke of a polyline (p = 0..1). */
  stroke(c: Ctx, pts: Pt[], p: number, o: StrokeOpts): void;
  /** Rectangle / ellipse including fill and outline, progressive. */
  shape(c: Ctx, s: ShapeSpec, p: number, env: Env): void;
  arrow?(c: Ctx, from: Pt, to: Pt, p: number, o: StrokeOpts): void;
  text(c: Ctx, layout: TextLayout, p: number, o: TextOpts): void;
  highlight(c: Ctx, box: { x: number; y: number; w: number; h: number; rect?: boolean }, p: number, variant: string, fill: Token | undefined, env: Env, seed: number): void;
  image(c: Ctx, img: any, box: { x: number; y: number; w: number; h: number }, p: number, env: Env, key: string): void;
  subtitle(c: Ctx, text: string, env: Env): void;
  /** Full-frame finishing pass (grain, scanlines, vignette...). */
  post?(c: Ctx, env: Env, cv?: Cnv): void;
  /** Scene-in transition drawn over the first `dur` seconds, using the previous scene's final frame. */
  transition?: { dur: number; draw(c: Ctx, prev: Cnv, q: number, env: Env): void };
  cover(c: Ctx, W: number, H: number, lines: string[], env: Env): void;
}
