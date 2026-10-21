/**
 * spy-titles: a 1960s cut-paper title sequence. Four flat inks, no gradients, each scene on one
 * ground colour; shapes are paper pieces with slightly ragged cut edges, a cut gap and a small
 * paper shadow; they slide in on hard stabs. Type is heavy and re-cut letter by letter.
 */
import { blobPts, cachedTexture, clamp01, easeOutCubic, ellipsePts, fillPoly, font, hash2, partialPath, ribbon, resample, rng, snapEase, type Pt, ringPts } from "../core.js";
import { bandSubtitle, layoutText, processedImage, revealText, styledIcon } from "./shared.js";
import type { Env, StyleDef, Token } from "./types.js";

const BLACK = "#1B1714", CREAM = "#EFE4C9", RED = "#D23A22", MUSTARD = "#E2A52A", TEAL = "#1F6E7E", OLIVE = "#5E7A2A";
const GROUNDS = [CREAM, RED, BLACK, MUSTARD];
const ground = (env: Env) => GROUNDS[env.sceneIndex % GROUNDS.length];
const isDark = (hex: string) => hex === BLACK || hex === RED;
/** Token -> ink, never the same as the ground. */
function inkFor(token: Token | undefined, env: Env): string {
  const g = ground(env);
  const want: Record<string, string> = { yellow: MUSTARD, red: RED, blue: TEAL, green: OLIVE, grey: "#3A322B", black: BLACK, white: CREAM };
  let col = want[token ?? "black"] ?? BLACK;
  if (col === g) col = g === BLACK ? CREAM : g === CREAM ? BLACK : g === RED ? BLACK : BLACK;
  if (col === "#3A322B" && g === BLACK) col = "#9A2A18";
  return col;
}
const contrast = (bg: string) => (isDark(bg) || bg === TEAL || bg === OLIVE || bg === "#3A322B" || bg === "#9A2A18" ? CREAM : BLACK);

function paperPiece(c: any, pts: Pt[], color: string, g: string, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.shadowColor = "rgba(0,0,0,0.32)";
  c.shadowBlur = 5;
  c.shadowOffsetX = 3;
  c.shadowOffsetY = 4;
  c.fillStyle = color;
  fillPoly(c, pts);
  c.restore();
  // cut gap in the ground colour
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = g;
  c.lineWidth = 2.4;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.stroke();
  c.restore();
}

export const spyTitles: StyleDef = {
  id: "spy-titles",
  name: "60s Spy Title Sequence",
  nameKo: "60년대 첩보영화 오프닝",
  summary: "네 가지 잉크(검정·크림·빨강·머스터드)의 컷페이퍼, 장면마다 바뀌는 바탕색, 금관 스탭처럼 치고 들어오는 조각과 글자",
  bestFor: "반전·미스터리형 도입, 비교·대결 구도, 이벤트 오프닝, 예고편",
  font: (role) => (role === "caption" ? { family: "WB Sans Bold", scale: 0.95 } : { family: "WB Display", scale: 0.98 }),
  ink: (token, env) => inkFor(token, env),
  textColor: (env, onFill) => (onFill ? contrast(inkFor(onFill, env)) : contrast(ground(env))),
  background(c, env) {
    const g = ground(env);
    c.fillStyle = g;
    c.fillRect(0, 0, env.W, env.H);
    const tex = cachedTexture("spy-grain", env.W, env.H, (tc, W, H) => {
      const r = rng(3);
      for (let i = 0; i < 9000; i++) {
        const v = r();
        tc.fillStyle = v < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
        tc.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
      }
      tc.fillStyle = "rgba(255,255,255,0.025)";
      for (let y = 0; y < H; y += 7 + Math.floor(r() * 9)) tc.fillRect(0, y, W, 1);
    });
    c.drawImage(tex, 0, 0);
    // one bold diagonal slash per scene, the sequence's recurring motif
    c.save();
    c.fillStyle = isDark(g) ? "rgba(239,228,201,0.07)" : "rgba(27,23,20,0.07)";
    const off = (env.sceneIndex * 380) % env.W;
    fillPoly(c, [[off - 200, env.H], [off + 120, 0], [off + 300, 0], [off - 20, env.H]]);
    c.restore();
  },
  stroke(c, pts, p, o) {
    if (p <= 0 || pts.length < 2) return;
    // strips of cut paper, grown along their length with a hard ease
    const part = partialPath(resample(pts, 4), o.kind === "icon" ? p : snapEase(p));
    if (part.length < 2) return;
    const w = o.width ?? (o.kind === "icon" ? 6 : o.kind === "outline" ? 7 : 9);
    const r = rng(o.seed);
    const jag = part.map(() => (r() - 0.5) * 1.2);
    c.save();
    c.fillStyle = o.color;
    fillPoly(c, ribbon(part, (i) => w / 2 + jag[i]));
    c.restore();
  },
  shape(c, s, p, env) {
    if (p <= 0) return;
    const col = inkFor(s.fill ?? "black", env);
    const e = snapEase(clamp01(p * 1.6));
    const r = rng(s.seed);
    const from = r() < 0.5 ? -1 : 1;
    const dx = (1 - e) * from * 220; // short stab: long slides crossed other pieces mid-flight
    const rot = (1 - e) * from * 0.12 + (r() - 0.5) * 0.02; // rests slightly off-true, like hand-placed paper
    const pts = blobPts(s.kind, s.x, s.y, s.w, s.h, 1.8, s.seed, 0.09);
    c.save();
    c.translate(s.x + s.w / 2 + dx, s.y + s.h / 2);
    c.rotate(rot);
    c.translate(-(s.x + s.w / 2), -(s.y + s.h / 2));
    paperPiece(c, pts, col, ground(env));
    c.restore();
  },
  arrow(c, a, b, p, o) {
    if (p <= 0) return;
    const e = snapEase(p);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * e;
    c.save();
    c.translate(a[0], a[1]);
    c.rotate(ang);
    const pts: Pt[] = [[0, -6], [L - 30, -6], [L - 30, -18], [L, 0], [L - 30, 18], [L - 30, 6], [0, 6]];
    paperPiece(c, pts, o.color, ground(o.env));
    c.restore();
  },
  text(c, L, p, o) {
    revealText(c, L, p, "cut", o.color, o.seed, { jitter: 0.035, shadow: "rgba(0,0,0,0.25)" });
  },
  highlight(c, b, p, variant, fill, env, seed) {
    const e = snapEase(clamp01(p * 1.5));
    if (e <= 0) return;
    const g = ground(env);
    const col = fill ? inkFor(fill, env) : g === RED ? MUSTARD : RED;
    if (variant === "circle") {
      this.stroke(c, ringPts(b, 26, 22, 90), p, { seed, color: col, kind: "deco", width: 8, env });
      return;
    }
    // a paper strip slid under the words. A block marker only works on a light ground (dark words, multiply);
    // on a red or dark ground the words are light, a block would swallow them, so it becomes a thin underline.
    const block = variant === "marker" && g !== RED && !isDark(g);
    const y = block ? b.y + b.h * 0.55 : b.y + b.h + 4;
    const h = block ? b.h * 0.45 : 12;
    c.save();
    c.globalCompositeOperation = isDark(g) ? "source-over" : "multiply";
    c.globalAlpha = block ? 0.55 : 1;
    paperPiece(c, blobPts("rect", b.x - 10, y, (b.w + 20) * e, h, 1.2, seed, 0.1), col, g);
    c.restore();
  },
  image(c, img, box, p, env, key) {
    const e = snapEase(clamp01(p * 2));
    if (e <= 0) return;
    const g = ground(env);
    const sil = processedImage(key, img, "silhouette", g === BLACK ? CREAM : BLACK);
    const dx = (1 - e) * -env.W * 0.5;
    c.save();
    c.shadowColor = "rgba(0,0,0,0.3)";
    c.shadowBlur = 5;
    c.shadowOffsetX = 3;
    c.shadowOffsetY = 4;
    c.drawImage(sil, box.x + dx, box.y, box.w, box.h);
    c.restore();
  },
  subtitle(c, text, env) {
    if (!text) return;
    c.fillStyle = BLACK;
    c.fillRect(0, 960, env.W, 120);
    bandSubtitle(c, text, env, { color: CREAM, family: "WB Sans Bold", size: 38 });
  },
  transition: {
    dur: 0.45,
    // Diagonal slash: the next ground cuts in on a sharp diagonal, old scene falls away behind it.
    draw(c, prev, q, env) {
      const e = snapEase(q);
      const X = -env.W * 0.4 + env.W * 1.8 * e;
      c.save();
      c.beginPath();
      c.moveTo(X, 0);
      c.lineTo(env.W, 0);
      c.lineTo(env.W, env.H);
      c.lineTo(X - env.H * 0.45, env.H);
      c.closePath();
      c.clip();
      c.drawImage(prev, 0, 0);
      c.restore();
      c.save();
      c.shadowColor = "rgba(0,0,0,0.35)";
      c.shadowBlur = 8;
      c.fillStyle = ground(env) === RED ? MUSTARD : RED;
      fillPoly(c, [[X - 16, 0], [X, 0], [X - env.H * 0.45, env.H], [X - env.H * 0.45 - 16, env.H]]);
      c.restore();
    },
  },
  cover(c, W, H, lines, env0) {
    const env = { ...env0, sceneIndex: 2 }; // black ground
    const vertical = H > W;
    this.background(c, env);
    const size = vertical ? 118 : 132;
    // red keyhole-ish slab + title re-cut in cream
    const slab = blobPts("rect", 70, H * (vertical ? 0.2 : 0.16), W - 140, lines.length * size * 1.25 + 90, 2, 5, 0.06);
    paperPiece(c, slab, RED, BLACK);
    const f = this.font("title");
    lines.forEach((l, i) => {
      const L = layoutText(c, l, f.family, size, { x: 110, y: H * (vertical ? 0.2 : 0.16) + 40 + i * size * 1.25, w: W - 220, h: size * 1.25 }, "center", "top");
      revealText(c, L, 1, "cut", CREAM, 11 + i, { jitter: 0.05, shadow: "rgba(0,0,0,0.35)" });
    });
    const iy = H * (vertical ? 0.2 : 0.16) + lines.length * size * 1.25 + (vertical ? 220 : 150);
    const is = vertical ? 200 : 150;
    const names = ["search", "lock", "robot"];
    names.forEach((n, k) => {
      const cx = W / 2 + (k - 1) * (is + (vertical ? 60 : 120));
      paperPiece(c, blobPts("ellipse", cx - is * 0.62, iy - is * 0.12, is * 1.24, is * 1.24, 2, 30 + k, 0.08), [MUSTARD, CREAM, MUSTARD][k], BLACK);
      styledIcon(this, c, n, cx - is / 2, iy, is, is, 1, BLACK, 50 + k, env);
    });
    c.save();
    c.font = font(vertical ? 40 : 34, "WB Sans Bold");
    c.fillStyle = MUSTARD;
    c.textAlign = "center";
    c.fillText("TOP SECRET · 설명 영상", W / 2, H - (vertical ? 180 : 90));
    c.restore();
    void hash2; void easeOutCubic; void bandSubtitle;
  },
};
