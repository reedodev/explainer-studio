/**
 * blueprint: engineering drawing on cyanotype paper. Pale blue-white line work on Prussian blue,
 * drawn in drafting order (faint construction line first, then the inked line), 45° hatching
 * for fills, typed monospace annotations, and one stamp red used sparingly.
 */
import { clamp01, easeInOutCubic, ellipsePts, font, hexRgb, paintMottled, cachedTexture, partialPath, rectPts, strokePoly, vignette, type Pt } from "../core.js";
import { roughPolylines, drawSequential } from "./whiteboard.js";
import { bandSubtitle, genericCover, processedImage, revealText } from "./shared.js";
import type { StyleDef } from "./types.js";

const BG = "#173F6D", LINE = "#E7F0F9", RED = "#E0624F";
const HATCH_COL: Record<string, string> = { red: "rgba(240,110,90,0.9)", yellow: "rgba(255,212,90,0.85)", green: "rgba(120,230,140,0.8)", blue: "rgba(70,170,255,1)" };
const HATCH: Record<string, [number, number]> = { yellow: [45, 10], blue: [-45, 16], green: [45, 22], red: [45, 8], grey: [0, 18], black: [45, 6], white: [0, 999] };

export const blueprint: StyleDef = {
  id: "blueprint",
  name: "Blueprint",
  nameKo: "블루프린트 설계도",
  summary: "청사진 종이 위 흰 선. 보조선 → 본선 순서로 제도하고, 주석은 타자처럼 찍히는 공학 도면",
  bestFor: "시스템 구조, 아키텍처, 작동 원리, 제품 해부",
  font: (role) => (role === "title" || role === "heading" ? { family: "WB Mono Bold", scale: 0.92 } : { family: "WB Mono", scale: 0.9 }),
  ink: (token) => (token === "red" ? RED : LINE),
  textColor: () => LINE,
  background(c, env) {
    const tex = cachedTexture("blueprint-bg", env.W, env.H, (tc, W, H) => {
      paintMottled(tc, W, H, hexRgb(BG), 0.07, 11, 0.0022, 6);
      tc.strokeStyle = "rgba(231,240,249,0.07)";
      tc.lineWidth = 1;
      for (let x = 0; x <= W; x += 24) { tc.beginPath(); tc.moveTo(x + 0.5, 0); tc.lineTo(x + 0.5, H); tc.stroke(); }
      for (let y = 0; y <= H; y += 24) { tc.beginPath(); tc.moveTo(0, y + 0.5); tc.lineTo(W, y + 0.5); tc.stroke(); }
      tc.strokeStyle = "rgba(231,240,249,0.14)";
      for (let x = 0; x <= W; x += 120) { tc.beginPath(); tc.moveTo(x + 0.5, 0); tc.lineTo(x + 0.5, H); tc.stroke(); }
      for (let y = 0; y <= H; y += 120) { tc.beginPath(); tc.moveTo(0, y + 0.5); tc.lineTo(W, y + 0.5); tc.stroke(); }
      // drawing-sheet border
      tc.strokeStyle = "rgba(231,240,249,0.55)";
      tc.lineWidth = 3;
      tc.strokeRect(24, 24, W - 48, H - 48);
      tc.lineWidth = 1;
      tc.strokeRect(34, 34, W - 68, H - 68);
      vignette(tc, W, H, "#06162b", 0.45);
    });
    c.drawImage(tex, 0, 0);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    // 1) construction line: faint, dashed, runs ahead of the ink
    if (o.kind !== "icon" && o.kind !== "head") {
      c.strokeStyle = "rgba(231,240,249,0.28)";
      c.lineWidth = 1;
      c.setLineDash([34, 7, 6, 7]);
      strokePoly(c, partialPath(pts, clamp01(p * 1.6)));
      c.setLineDash([]);
    }
    // 2) inked line, a touch of hand wobble
    c.strokeStyle = o.color;
    c.lineWidth = o.width ?? (o.kind === "outline" ? 3.2 : o.kind === "icon" ? 2.4 : 2.6);
    if (o.dashed) c.setLineDash([11, 7]);
    c.shadowColor = "rgba(231,240,249,0.35)";
    c.shadowBlur = 3;
    drawSequential(c, roughPolylines(pts, o.seed, 0.35, 0.3), clamp01((p - 0.15) / 0.85));
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    const pts: Pt[] = s.kind === "ellipse" ? ellipsePts(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 100) : rectPts(s.x, s.y, s.w, s.h);
    // hatching (section fill) after the outline is mostly drawn
    const hp = clamp01((p - 0.45) / 0.55);
    if (s.fill && s.fill !== "white" && hp > 0) {
      const [ang, gap] = HATCH[s.fill] ?? [45, 14];
      c.save();
      c.beginPath();
      if (s.kind === "ellipse") c.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
      else c.rect(s.x, s.y, s.w, s.h);
      c.clip();
      c.strokeStyle = HATCH_COL[s.fill] ?? "rgba(231,240,249,0.32)";
      c.lineWidth = HATCH_COL[s.fill] ? 1.8 : 1.2;
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, R = Math.hypot(s.w, s.h) / 2 + 4;
      const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
      const n = Math.ceil((2 * R) / gap);
      const shown = Math.floor(n * hp);
      for (let i = 0; i < shown; i++) {
        const off = -R + i * gap;
        const ox = cx - dy * off, oy = cy + dx * off;
        c.beginPath();
        c.moveTo(ox - dx * R, oy - dy * R);
        c.lineTo(ox + dx * R, oy + dy * R);
        c.stroke();
      }
      c.restore();
    }
    this.stroke(c, pts, p, { seed: s.seed, color: this.ink(s.stroke ?? (s.fill === "red" ? "red" : undefined), env), kind: "outline", env });
    // corner ticks like dimension marks on rectangles
    if (s.kind === "rect" && p > 0.9) {
      c.save();
      c.strokeStyle = "rgba(231,240,249,0.6)";
      c.lineWidth = 1;
      for (const [x, y] of [[s.x, s.y], [s.x + s.w, s.y], [s.x, s.y + s.h], [s.x + s.w, s.y + s.h]]) {
        c.beginPath();
        c.moveTo(x - 12, y); c.lineTo(x + 12, y);
        c.moveTo(x, y - 12); c.lineTo(x, y + 12);
        c.stroke();
      }
      c.restore();
    }
  },
  text(c, L, p, o) {
    revealText(c, L, p, "type", o.color, o.seed, { cursor: "rgba(231,240,249,0.8)" });
  },
  highlight(c, b, p, variant, _fill, env, seed) {
    if (variant === "circle" || variant === "marker") {
      // revision cloud / stamp circle in red
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 28, b.h / 2 + 22, 100), p, { seed, color: RED, kind: "deco", width: 3, env });
    } else {
      // dimension line under the text: |<------>|
      const y = b.y + b.h + 12;
      this.stroke(c, [[b.x, y], [b.x + b.w, y]], p, { seed, color: LINE, kind: "underline", width: 1.6, env });
      if (p > 0.8) {
        c.save();
        c.strokeStyle = LINE;
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(b.x, y - 10); c.lineTo(b.x, y + 10);
        c.moveTo(b.x + b.w, y - 10); c.lineTo(b.x + b.w, y + 10);
        c.stroke();
        c.restore();
      }
    }
  },
  image(c, img, box, p, _env, key) {
    const a = easeInOutCubic(clamp01(p * 2.5));
    if (a <= 0) return;
    // stickers become white line-art prints on the blue sheet
    const g = processedImage(key, img, "lineart", LINE);
    c.save();
    c.globalAlpha = a;
    c.drawImage(g, box.x, box.y, box.w, box.h);
    c.restore();
    c.save();
    c.strokeStyle = "rgba(231,240,249,0.5)";
    c.setLineDash([6, 6]);
    c.strokeRect(box.x - 8, box.y - 8, box.w + 16, box.h + 16);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = "rgba(9,30,56,0.9)";
    c.fillRect(0, 960, env.W, 120);
    bandSubtitle(c, text, env, { color: LINE, family: "WB Mono", size: 36 });
  },
  transition: {
    dur: 0.6,
    // Scan line: a bright horizontal line sweeps down, the old sheet remains below it.
    draw(c, prev, q, env) {
      const Y = env.H * easeInOutCubic(q);
      c.save();
      c.beginPath();
      c.rect(0, Y, env.W, env.H - Y);
      c.clip();
      c.drawImage(prev, 0, 0);
      c.restore();
      c.fillStyle = "rgba(231,240,249,0.85)";
      c.fillRect(0, Y - 1.5, env.W, 3);
      c.fillStyle = "rgba(231,240,249,0.12)";
      c.fillRect(0, Y - 30, env.W, 30);
    },
  },
  cover(c, W, H, lines, env) {
    genericCover(this, c, W, H, lines, env, { tag: "DWG. NO. 01 · SYSTEM EXPLAINED", accentFill: "white" });
    c.save();
    c.font = font(26, "WB Mono");
    c.fillStyle = "rgba(231,240,249,0.7)";
    c.fillText("SCALE 1:1   SHEET 1/1", 60, H - 60);
    c.restore();
  },
};
