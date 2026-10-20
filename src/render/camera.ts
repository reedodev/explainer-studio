/**
 * Deterministic gentle camera for the board layer (elements only; background, style overlays,
 * transitions and subtitles never move).
 *
 * Modes (scene.camera, else storyboard.camera, else the style default):
 *   push       slow push-in 1.00 -> up to 1.04 toward the content centre (default for most styles)
 *   pan-left   content drifts left ~36 px at 1.025 scale
 *   pan-right  content drifts right ~36 px at 1.025 scale
 *   still      no camera (default for swiss-motion and ascii-crt, whose look is grid-locked)
 *
 * The zoom is clamped per scene so the scaled content box stays inside the frame and above the
 * subtitle band (y <= 962), so a camera move can never push a shape into the captions.
 */
import { elementBox } from "../storyboard/schema.js";

export type CameraMode = "push" | "pan-left" | "pan-right" | "still";
export const CAMERA_MODES: CameraMode[] = ["push", "pan-left", "pan-right", "still"];
export const STILL_STYLES = new Set(["swiss-motion", "ascii-crt"]);
/** Content must stay inside this rectangle at the camera's maximum zoom. */
export const CAMERA_SAFE = { x0: 30, y0: 30, x1: 1890, y1: 962 };
const PUSH = 0.04, PAN_SCALE = 0.025, PAN_PX = 36;

export interface Cam { s: number; fx: number; fy: number; dx: number }
export const IDENTITY: Cam = { s: 1, fx: 960, fy: 540, dx: 0 };

const ease = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

export function cameraMode(board: any, scene: any, styleId: string): CameraMode {
  const m = scene?.camera ?? board?.camera;
  if (CAMERA_MODES.includes(m)) return m;
  return STILL_STYLES.has(styleId) ? "still" : "push";
}

/** Union of the scene's element boxes (highlights included through their targets). */
export function contentBox(scene: any) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of scene.elements) {
    if (e.bleed) continue;
    const b = elementBox(e, scene.elements);
    if (!b) continue;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

/** Largest extra scale a (a = s-1) about focus f that keeps [lo, hi] inside [min, max]. */
function room(lo: number, hi: number, f: number, min: number, max: number) {
  let a = Infinity;
  if (hi > f) a = Math.min(a, (max - f) / (hi - f) - 1);
  if (lo < f) a = Math.min(a, (f - min) / (f - lo) - 1);
  return Math.max(0, a);
}

const cache = new WeakMap<object, { key: string; cam: { a: number; fx: number; fy: number; pan: number } }>();
function sceneCamera(board: any, scene: any, styleId: string) {
  const key = styleId + "|" + (scene.camera ?? board.camera ?? "");
  const hit = cache.get(scene);
  if (hit && hit.key === key) return hit.cam;
  const mode = cameraMode(board, scene, styleId);
  const box = contentBox(scene);
  let cam = { a: 0, fx: 960, fy: 540, pan: 0 };
  if (mode !== "still" && box) {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    // focus drifts 60% of the way from the frame centre toward the content centre
    const fx = 960 + (cx - 960) * 0.6, fy = 540 + (cy - 540) * 0.6;
    const S = CAMERA_SAFE;
    const pan = mode === "pan-left" ? -PAN_PX : mode === "pan-right" ? PAN_PX : 0;
    const want = mode === "push" ? PUSH : PAN_SCALE;
    // pans shift the box sideways too: reserve that room before scaling
    const lo = box.x0 + Math.min(0, pan), hi = box.x1 + Math.max(0, pan);
    const a = Math.min(want, room(lo, hi, fx, S.x0, S.x1), room(box.y0, box.y1, fy, S.y0, S.y1));
    cam = { a, fx, fy, pan: a > 0 || pan ? pan : 0 };
    // a pan that would leave the safe area is dropped rather than clipped
    if (pan && (box.x0 + pan < S.x0 || box.x1 + pan > S.x1)) cam.pan = 0;
  }
  cache.set(scene, { key, cam });
  return cam;
}

/** Camera at time t of the scene. */
export function cameraAt(board: any, scene: any, styleId: string, t: number): Cam {
  if (board?.fx?.camera === false) return IDENTITY;
  const c = sceneCamera(board, scene, styleId);
  if (!c.a && !c.pan) return IDENTITY;
  const u = ease(t / Math.max(0.1, scene.duration || 1));
  return { s: 1 + c.a * u, fx: c.fx, fy: c.fy, dx: c.pan * u };
}

export function applyCamera(c: any, cam: Cam) {
  if (cam === IDENTITY || (cam.s === 1 && !cam.dx)) return;
  c.translate(cam.fx + cam.dx, cam.fy);
  c.scale(cam.s, cam.s);
  c.translate(-cam.fx, -cam.fy);
}

/** Where a board point lands on screen under the camera (for tests and validation). */
export function project(cam: Cam, x: number, y: number): [number, number] {
  return [cam.fx + cam.dx + (x - cam.fx) * cam.s, cam.fy + (y - cam.fy) * cam.s];
}
