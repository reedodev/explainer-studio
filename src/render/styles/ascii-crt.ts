/**
 * ascii-crt: everything is a character on a monospace grid, lit by amber phosphor on an old
 * monochrome CRT. Lines and outlines are rasterised to box-drawing glyphs cell by cell, fills
 * are dither characters, stickers become ASCII art, text types in with a block cursor.
 */
import { createCanvas } from "@napi-rs/canvas";
import { cachedTexture, clamp01, easeInOutCubic, ellipsePts, font, rectPts, resample, rng, vignette, type Pt } from "../core.js";
import { bandSubtitle, layoutText, revealText, styledIcon } from "./shared.js";
import type { StyleDef } from "./types.js";

const GLASS = "#0B0805", AMBER = "#FFB33A", DIM = "rgba(255,179,58,0.38)", ALT = "#9CFFB5";
const CW = 14, CH = 26; // cell size (1:~2)
const FAMILY = "WB Mono";

type Cell = [number, number, string];
const cellCache = new Map<string, Cell[]>();

/** Rasterise a polyline to grid cells with direction-aware box glyphs. */
function cells(pts: Pt[], key: string): Cell[] {
  let out = cellCache.get(key);
  if (out) return out;
  out = [];
  const s = resample(pts, 5);
  let last = "";
  for (let i = 0; i < s.length; i++) {
    const col = Math.round(s[i][0] / CW), row = Math.round(s[i][1] / CH);
    const k = col + ":" + row;
    if (k === last) continue;
    last = k;
    const a = s[Math.max(0, i - 2)], b = s[Math.min(s.length - 1, i + 2)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const ang = Math.abs(Math.atan2(dy, dx));
    let g = "─";
    if (ang > Math.PI * 0.375 && ang < Math.PI * 0.625) g = "│";
    else if (ang >= Math.PI * 0.125 && ang <= Math.PI * 0.375) g = dy * dx > 0 ? "╲" : "╱";
    else if (ang >= Math.PI * 0.625 && ang <= Math.PI * 0.875) g = dy * dx > 0 ? "╲" : "╱";
    out.push([col, row, g]);
  }
  cellCache.set(key, out);
  return out;
}
/**
 * Box-drawing, shade and arrow glyphs are drawn as vectors inside the cell: the bundled Korean
 * mono font has no corners/shades, and vector glyphs also join seamlessly cell to cell.
 */
function vectorGlyph(c: any, ch: string, x: number, y: number): boolean {
  const l = x - CW / 2, r = x + CW / 2, t = y - CH / 2, b = y + CH / 2;
  const seg = (pts: number[][]) => {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
    c.stroke();
  };
  switch (ch) {
    case "─": seg([[l, y], [r, y]]); return true;
    case "│": seg([[x, t], [x, b]]); return true;
    case "┌": seg([[r, y], [x, y], [x, b]]); return true;
    case "┐": seg([[l, y], [x, y], [x, b]]); return true;
    case "└": seg([[x, t], [x, y], [r, y]]); return true;
    case "┘": seg([[x, t], [x, y], [l, y]]); return true;
    case "╭": c.beginPath(); c.moveTo(r, y); c.quadraticCurveTo(x, y, x, b); c.stroke(); return true;
    case "╮": c.beginPath(); c.moveTo(l, y); c.quadraticCurveTo(x, y, x, b); c.stroke(); return true;
    case "╰": c.beginPath(); c.moveTo(x, t); c.quadraticCurveTo(x, y, r, y); c.stroke(); return true;
    case "╯": c.beginPath(); c.moveTo(x, t); c.quadraticCurveTo(x, y, l, y); c.stroke(); return true;
    case "╱": seg([[l, b], [r, t]]); return true;
    case "╲": seg([[l, t], [r, b]]); return true;
    case "▀": c.fillRect(l, t + 2, CW, CH / 2 - 2); return true;
    case "░": case "▒": case "▓": {
      const step = ch === "░" ? 4 : ch === "▒" ? 3 : 2;
      for (let yy = t + 1; yy < b; yy += step) for (let xx = l + ((yy / step) % 2 ? 0 : step / 2); xx < r; xx += step) c.fillRect(xx, yy, 1.4, 1.4);
      return true;
    }
    case "►": case "◄": case "▲": case "▼": {
      const s = CW * 0.9;
      const pts = ch === "►" ? [[x + s, y], [x - s * 0.6, y - s], [x - s * 0.6, y + s]] : ch === "◄" ? [[x - s, y], [x + s * 0.6, y - s], [x + s * 0.6, y + s]] : ch === "▲" ? [[x, y - s], [x - s, y + s * 0.6], [x + s, y + s * 0.6]] : [[x, y + s], [x - s, y - s * 0.6], [x + s, y - s * 0.6]];
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      c.lineTo(pts[1][0], pts[1][1]);
      c.lineTo(pts[2][0], pts[2][1]);
      c.closePath();
      c.fill();
      return true;
    }
  }
  return false;
}
function drawCells(c: any, list: Cell[], n: number, color: string) {
  c.save();
  c.font = font(CH * 0.9, FAMILY);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 2.2;
  c.lineCap = "square";
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (let i = 0; i < Math.min(n, list.length); i++) {
    const [col, row, ch] = list[i];
    if (!vectorGlyph(c, ch, col * CW, row * CH)) c.fillText(ch, col * CW, row * CH);
  }
  c.restore();
}

const asciiCache = new Map<string, Cell[]>();
function asciiArt(img: any, key: string, cols: number, rows: number): Cell[] {
  const k = `${key}|${cols}x${rows}`;
  let out = asciiCache.get(k);
  if (out) return out;
  const cv = createCanvas(cols, rows);
  const c = cv.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, cols, rows);
  c.drawImage(img, 0, 0, cols, rows);
  const d = c.getImageData(0, 0, cols, rows).data;
  const ramp = " .:-=+*#%@";
  out = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      const ch = ramp[Math.min(ramp.length - 1, Math.floor((1 - lum) * ramp.length))];
      if (ch !== " ") out.push([x, y, ch]);
    }
  asciiCache.set(k, out);
  return out;
}

export const asciiCrt: StyleDef = {
  id: "ascii-crt",
  name: "ASCII / CRT Terminal",
  nameKo: "ASCII 터미널",
  summary: "호박색 인광 CRT 화면. 선과 도형이 전부 문자 격자로 찍히고, 글자는 커서와 함께 타이핑되는 터미널 룩",
  bestFor: "AI·개발·자동화 주제, 로그/프로세스 설명, 해커·레트로 감성",
  font: (role) => (role === "title" || role === "heading" ? { family: "WB Mono Bold", scale: 0.95 } : { family: FAMILY, scale: 0.9 }),
  ink: (token) => (token === "red" ? ALT : AMBER),
  textColor: () => AMBER,
  background(c, env) {
    c.fillStyle = GLASS;
    c.fillRect(0, 0, env.W, env.H);
    c.fillStyle = "rgba(255,179,58,0.03)";
    c.fillRect(0, 0, env.W, env.H);
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    const list = cells(pts, JSON.stringify(pts));
    drawCells(c, list, Math.ceil(list.length * p), o.color);
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    {
      // rectangles use square corners, ellipses use rounded ones (circles read badly as diagonal glyphs)
      const round = s.kind === "ellipse";
      const [tl, tr, br, bl] = round ? ["╭", "╮", "╯", "╰"] : ["┌", "┐", "┘", "└"];
      const c0 = Math.round(s.x / CW), r0 = Math.round(s.y / CH), c1 = Math.round((s.x + s.w) / CW), r1 = Math.round((s.y + s.h) / CH);
      const key = `box${c0},${r0},${c1},${r1},${round}`;
      let per = cellCache.get(key);
      if (!per) {
        per = [[c0, r0, tl]];
        for (let x = c0 + 1; x < c1; x++) per.push([x, r0, "─"]);
        per.push([c1, r0, tr]);
        for (let y = r0 + 1; y < r1; y++) per.push([c1, y, "│"]);
        per.push([c1, r1, br]);
        for (let x = c1 - 1; x > c0; x--) per.push([x, r1, "─"]);
        per.push([c0, r1, bl]);
        for (let y = r1 - 1; y > r0; y--) per.push([c0, y, "│"]);
        cellCache.set(key, per);
      }
      const fillP = clamp01((p - 0.55) / 0.45);
      if (s.fill && s.fill !== "white" && fillP > 0) {
        const glyph = s.fill === "yellow" ? "▒" : s.fill === "red" ? "▒" : "░";
        c.save();
        c.globalAlpha = s.fill === "yellow" || s.fill === "red" ? 0.3 : 0.22;
        const inner: Cell[] = [];
        for (let y = r0 + 1; y < r1; y++) for (let x = c0 + 1; x < c1; x++) inner.push([x, y, glyph]);
        drawCells(c, inner, Math.ceil(inner.length * fillP), s.fill === "red" ? ALT : AMBER);
        c.restore();
      }
      drawCells(c, per, Math.ceil(per.length * clamp01(p / 0.6)), this.ink(s.stroke ?? (s.fill === "red" ? "red" : undefined), env));
    }
  },
  arrow(c, a, b, p, o) {
    if (p <= 0) return;
    this.stroke(c, [a, b], clamp01(p / 0.85), o);
    if (p > 0.85) {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const g = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? (Math.cos(ang) > 0 ? "►" : "◄") : Math.sin(ang) > 0 ? "▼" : "▲";
      drawCells(c, [[Math.round(b[0] / CW), Math.round(b[1] / CH), g]], 1, o.color);
    }
  },
  text(c, L, p, o) {
    revealText(c, L, p, "type", o.color, o.seed, { cursor: AMBER });
  },
  highlight(c, b, p, variant, _fill, env, seed) {
    if (variant === "marker") {
      // inverse video block behind the words
      const e = clamp01(p * 2);
      c.save();
      c.fillStyle = "rgba(255,179,58,0.3)";
      c.fillRect(b.x - 8, b.y, (b.w + 16) * e, b.h);
      c.restore();
    } else if (variant === "circle") {
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 30, b.h / 2 + 24, 90), p, { seed, color: ALT, kind: "deco", env });
    } else {
      const list: Cell[] = [];
      for (let x = Math.round(b.x / CW); x <= Math.round((b.x + b.w) / CW); x++) list.push([x, Math.round((b.y + b.h) / CH) + 1, "▀"]);
      drawCells(c, list, Math.ceil(list.length * p), ALT);
    }
  },
  image(c, img, box, p, _env, key) {
    const cols = Math.max(4, Math.round(box.w / CW)), rows = Math.max(2, Math.round(box.h / CH));
    const art = asciiArt(img, key, cols, rows);
    const shownRows = Math.ceil(rows * clamp01(p * 2.5));
    const c0 = Math.round(box.x / CW), r0 = Math.round(box.y / CH);
    drawCells(c, art.filter((q) => q[1] < shownRows).map((q) => [c0 + q[0], r0 + q[1], q[2]] as Cell), 1e9, AMBER);
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = GLASS;
    c.fillRect(0, 960, env.W, 120);
    c.fillStyle = "rgba(255,179,58,0.25)";
    c.fillRect(0, 960, env.W, 2);
    bandSubtitle(c, text, env, { color: AMBER, family: FAMILY, size: 36, align: "left", prefix: "> " });
  },
  post(c, env, cv) {
    // phosphor bloom (cheap blur: downscale x6 then upscale) + scanlines + glass vignette
    if (cv) {
      const sw = Math.ceil(env.W / 6), sh = Math.ceil(env.H / 6);
      const small = createCanvas(sw, sh);
      const sc = small.getContext("2d");
      sc.imageSmoothingEnabled = true;
      sc.drawImage(cv, 0, 0, sw, sh);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.55;
      c.imageSmoothingEnabled = true;
      c.drawImage(small, 0, 0, env.W, env.H);
      c.restore();
    }
    const lines = cachedTexture("crt-scan", env.W, env.H, (tc, W, H) => {
      tc.fillStyle = "rgba(0,0,0,0.28)";
      for (let y = 0; y < H; y += 3) tc.fillRect(0, y, W, 1);
      vignette(tc, W, H, "#000000", 0.7);
    });
    c.drawImage(lines, 0, 0);
  },
  transition: {
    dur: 0.5,
    // `clear`: the old screen is erased row by row from the top.
    draw(c, prev, q, env) {
      const rows = Math.ceil(env.H / CH);
      const k = Math.floor(rows * easeInOutCubic(q));
      c.save();
      c.beginPath();
      c.rect(0, k * CH, env.W, env.H - k * CH);
      c.clip();
      c.drawImage(prev, 0, 0);
      c.restore();
      if (q < 1) {
        c.fillStyle = AMBER;
        c.fillRect(96, k * CH + 2, CW, CH - 4);
      }
    },
  },
  cover(c, W, H, lines, env) {
    const vertical = H > W;
    this.background(c, env);
    const f = this.font("title");
    const size = vertical ? 84 : 92;
    let y = H * (vertical ? 0.16 : 0.14);
    const pr = layoutText(c, "user@studio:~$ ./explain --topic", FAMILY, vertical ? 34 : 32, { x: 96, y, w: W - 192, h: 50 }, "left", "top");
    revealText(c, pr, 1, "type", DIM, 1);
    y += 90;
    this.shape(c, { kind: "rect", x: 84, y: y - 10, w: W - 168, h: lines.length * size * 1.3 + 70, fill: "yellow", seed: 1 }, 1, env);
    lines.forEach((l, i) => {
      const L = layoutText(c, l, f.family, size, { x: 120, y: y + 20 + i * size * 1.3, w: W - 240, h: size * 1.3 }, "left", "top");
      revealText(c, L, 1, "type", AMBER, 1);
    });
    const iy = y + lines.length * size * 1.3 + (vertical ? 200 : 130);
    const is = vertical ? 190 : 150;
    ["robot", "gear", "check"].forEach((n, k) => styledIcon(this, c, n, W / 2 - is / 2 + (k - 1) * (is + 100), iy, is, is, 1, k === 2 ? ALT : AMBER, 5 + k, env));
    const tail = layoutText(c, "[ OK ] 설명 준비 완료_", FAMILY, vertical ? 40 : 34, { x: 96, y: H - (vertical ? 240 : 150), w: W - 192, h: 60 }, "left", "top");
    revealText(c, tail, 1, "type", ALT, 1);
    this.post!(c, env, c.canvas);
    void rectPts; void rng;
  },
};
