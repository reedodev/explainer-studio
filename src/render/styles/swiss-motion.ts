/**
 * swiss-motion: International Typographic Style in motion.
 * White paper, black type and bars, light greys, ONE signal red. Everything wipes or snaps
 * with cubic-bezier(.7,0,.2,1); nothing bounces, nothing fades, no texture.
 */
import { clamp01, ellipsePts, font, partialPath, snapEase, strokePoly } from "../core.js";
import { bandSubtitle, layoutText, processedImage, revealText, styledIcon } from "./shared.js";
import type { StyleDef, Token } from "./types.js";

const INK = "#111111", RED = "#E30613", PAPER = "#FFFFFF", GRID = "#ECEBE7";
const FILL: Record<string, string> = { yellow: INK, red: RED, blue: "#CFCEC9", green: "#E2E1DC", grey: "#EAE9E5", white: PAPER, black: INK };
const dark = (t?: Token) => t === "yellow" || t === "red" || t === "black";

export const swissMotion: StyleDef = {
  id: "swiss-motion",
  name: "Swiss Motion Graphics",
  nameKo: "스위스 모션 타이포",
  summary: "12단 그리드, 검정 글자와 막대, 단 하나의 빨강. 모든 요소가 그리드에 스냅되는 정밀한 타이포 모션",
  bestFor: "메시지형 콘텐츠, 원칙·규칙 정리, 브랜드 선언, 스레드 글 영상화",
  font: (role) => (role === "title" || role === "heading" ? { family: "WB Sans Bold", scale: 1.02 } : role === "caption" ? { family: "WB Sans Medium", scale: 0.95 } : { family: "WB Sans Medium", scale: 0.95 }),
  ink: (token) => (token === "red" ? RED : INK),
  textColor: (_env, onFill) => (dark(onFill) ? PAPER : INK),
  background(c, env) {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, env.W, env.H);
    // 12-column frame grid, 96px margins, 24px gutters; drawn in as a faint system.
    c.strokeStyle = GRID;
    c.lineWidth = 1;
    const col = (env.W - 96 * 2 - 24 * 11) / 12;
    for (let i = 0; i <= 12; i++) {
      for (const x of [96 + i * (col + 24) - (i ? 24 : 0), 96 + i * (col + 24)]) {
        if (x > env.W - 95) continue;
        c.beginPath();
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, env.H);
        c.stroke();
      }
    }
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    c.save();
    c.strokeStyle = o.color;
    c.lineWidth = o.width ?? (o.kind === "icon" ? 5 : o.kind === "deco" ? 3 : 8);
    c.lineCap = o.kind === "icon" ? "round" : "butt";
    c.lineJoin = "miter";
    if (o.dashed) c.setLineDash([2, 14]);
    strokePoly(c, partialPath(pts, p)); // lines grow linearly along their length
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    const e = snapEase(p);
    c.save();
    c.fillStyle = FILL[s.fill ?? "grey"] ?? FILL.grey;
    if (s.kind === "ellipse") {
      // circles are revealed by a vertical wipe, like the paper
      c.beginPath();
      c.rect(s.x - 2, s.y - 2, s.w + 4, (s.h + 4) * e);
      c.clip();
      c.beginPath();
      c.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
      c.fill();
      if (!dark(s.fill)) {
        c.strokeStyle = INK;
        c.lineWidth = 3;
        c.stroke();
      }
    } else {
      // blocks wipe in from the top on the snap curve
      c.fillRect(s.x, s.y, s.w, s.h * e);
      if (!dark(s.fill)) {
        c.fillStyle = INK;
        c.fillRect(s.x, s.y, s.w * e, 6); // black rule on top of light blocks
      }
    }
    c.restore();
    void env;
  },
  arrow(c, a, b, p, o) {
    if (p <= 0) return;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const e = snapEase(p);
    c.save();
    c.translate(a[0], a[1]);
    c.rotate(ang);
    c.fillStyle = o.color;
    const L = len * e;
    c.fillRect(0, -4, Math.max(0, L - 22), 8);
    if (e > 0.85) {
      c.beginPath();
      c.moveTo(L, 0);
      c.lineTo(L - 26, -15);
      c.lineTo(L - 26, 15);
      c.closePath();
      c.fill();
    }
    c.restore();
  },
  text(c, L, p, o) {
    revealText(c, L, p, "rise", o.color, o.seed);
  },
  highlight(c, b, p, variant, _fill, env, seed) {
    const e = snapEase(p);
    if (variant === "circle") {
      this.stroke(c, ellipsePts(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 26, b.h / 2 + 20, 100), p, { seed, color: RED, kind: "deco", width: 5, env });
    } else if (variant === "marker") {
      // signal-red bar under the words: the one exception on the page
      c.fillStyle = RED;
      c.fillRect(b.x - 8, b.y + b.h - 4, (b.w + 16) * e, 14);
    } else {
      c.fillStyle = RED;
      c.fillRect(b.x, b.y + b.h + 4, b.w * e, 8);
    }
  },
  image(c, img, box, p, _env, key) {
    const e = snapEase(clamp01(p * 2));
    if (e <= 0) return;
    const g = processedImage(key, img, "gray");
    c.save();
    c.beginPath();
    c.rect(box.x, box.y, box.w, box.h * e);
    c.clip();
    c.globalCompositeOperation = "multiply";
    c.drawImage(g, box.x, box.y, box.w, box.h);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = PAPER;
    c.fillRect(0, 960, env.W, 120);
    c.fillStyle = INK;
    if (!text.includes("\n")) c.fillRect(96, 972, 60, 5); // rule only when it cannot touch a 2-line caption
    bandSubtitle(c, text, env, { color: INK, family: "WB Sans Medium", size: 38, align: "left" });
  },
  transition: {
    dur: 0.5,
    // Knife cut: a red line strikes across, the previous page is cut away behind it.
    draw(c, prev, q, env) {
      const e = snapEase(q);
      const X = env.W * e;
      c.save();
      c.beginPath();
      c.rect(X, 0, env.W - X, env.H);
      c.clip();
      c.drawImage(prev, 0, 0);
      c.restore();
      if (q < 1) {
        c.fillStyle = RED;
        c.fillRect(X - 6, 0, 12, env.H);
      }
    },
  },
  cover(c, W, H, lines, env) {
    const vertical = H > W;
    this.background(c, env);
    const f = this.font("title");
    const size = vertical ? 104 : 118;
    // big flush-left title on a red rule, caption row with a hairline above
    const top = H * (vertical ? 0.2 : 0.2);
    c.fillStyle = RED;
    c.fillRect(96, top - 40, W - 192, 14);
    lines.forEach((l, i) => {
      const L = layoutText(c, l, f.family, size, { x: 96, y: top + i * size * 1.18, w: W - 192, h: size * 1.2 }, "left", "top", 1.1);
      revealText(c, L, 1, "rise", INK, 1);
    });
    const by = top + lines.length * size * 1.18 + (vertical ? 120 : 60);
    const bw = vertical ? W - 192 : 520;
    c.fillStyle = INK;
    c.fillRect(96, by, bw * 0.62, vertical ? 300 : 210);
    c.fillStyle = RED;
    c.beginPath();
    const r = vertical ? 170 : 125;
    c.arc(96 + bw * 0.62 + (vertical ? -40 : 30), by + (vertical ? 300 : 210) - 10, r, 0, Math.PI * 2);
    c.fill();
    styledIcon(this, c, "robot", 130, by + 30, vertical ? 200 : 140, vertical ? 200 : 140, 1, PAPER, 5, env);
    const cy = H - (vertical ? 260 : 170);
    c.fillStyle = INK;
    c.fillRect(96, cy, W - 192, 2);
    c.font = font(vertical ? 34 : 30, "WB Sans Medium");
    c.fillText("SWISS MOTION · 설명 영상", 96, cy + (vertical ? 56 : 48));
  },
};
