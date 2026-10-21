/**
 * explainer-studio CLI (es): one storyboard, eight hand-made visual styles.
 *
 *   es styles                                   list visual styles
 *   es init "topic" --slug slug [--style id]    create output/<slug>/
 *   es set-style <slug> <style>                 change the project's main style
 *   es styleframes <slug> [--styles a,b|all] [--scenes 1,4,6]
 *                                               same scenes rendered in several styles + contact sheet
 *   es tts <slug> --tts edge|sapi|cmd|silent [--scenes scene-06]
 *   es validate|preview|render|build <slug> [--style id] [--tts ...] [--clip 0:6] [--mvp]
 *
 * --style different from the storyboard's style writes to output/<slug>/variants/<style>/
 * so one storyboard can ship in several looks without overwriting each other.
 */
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Storyboard, resolveArrowTargets } from "./storyboard/schema.js";
import { projectPaths, ensureDirs, saveJson } from "./project.js";
import { resolveProvider } from "./tts/index.js";
import { decodeToPcm, writeWav, startEncoder, probeVideo, SAMPLE_RATE } from "./media/ffmpeg.js";
import { frame, cover, loadAssets, textFitIssues } from "./render/engine.js";
import { STYLES, resolveStyleId } from "./render/styles/index.js";
import { font } from "./render/core.js";
import { STICKER_STYLE_PROMPT } from "./config.js";
import { makeSubtitles } from "./subtitles.js";
import { validateBoard } from "./validation.js";
import { time } from "./timing.js";
import { scriptMarkdown, sourcesMarkdown, publishMarkdown } from "./docs.js";

const args = process.argv.slice(2);
const cmd = args[0], name = args[1];
const opt = (k: string, d = "") => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const has = (k: string) => args.includes(k);
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p: string, s: string) => fs.writeFileSync(p, s, "utf8");
const stamp = (n: number) => {
  const ms = Math.round(n * 1000);
  return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map((x) => String(x).padStart(2, "0")).join(":") + "," + String(ms % 1000).padStart(3, "0");
};

function template(topic: string, style: string) {
  // A 3-scene starter that already uses the full frame: result first, a 4-step process, a chart with a callout.
  // Replace every text, keep the layout, and only add numbers you can source (research/sources.json).
  const title = (text: string) => ({ id: "title", type: "text", role: "title", x: 120, y: 140, w: 1400, h: 90, text, fontSize: 64 });
  const steps = [0, 1, 2, 3];
  return {
    version: 1, title: topic, topic, style, language: /[\uac00-\ud7a3]/.test(topic) ? "ko" : "en", canvas: { width: 1920, height: 1080 }, stickers: [],
    scenes: [
      { id: "scene-01", section: "hook", layout: "free", duration: 0,
        narration: "Open with the result in one clear sentence. Then say in a second sentence why it matters to the viewer.",
        elements: [title(topic),
          { id: "before", type: "rectangle", x: 120, y: 280, w: 700, h: 340, fill: "grey", label: "Before: the problem", labelSize: 46 },
          { id: "arrow", type: "arrow", from: [830, 440], to: [1060, 440] },
          { id: "after", type: "rectangle", x: 1100, y: 280, w: 700, h: 340, fill: "yellow", label: "After: the result", labelSize: 46 },
          { id: "i1", type: "icon", icon: "warning", x: 400, y: 670, w: 130, h: 130 },
          { id: "i2", type: "icon", icon: "check", x: 1385, y: 670, w: 130, h: 130 },
          { id: "hl", type: "highlight", target: "after", style: "circle" }],
        drawOrder: ["title", "before", "arrow", "after", "i1", "i2", "hl"] },
      { id: "scene-02", section: "structure", layout: "free", duration: 0,
        narration: "Explain how it works in four short steps. Keep each step to a few words on screen.",
        elements: [title("How it works"),
          ...steps.map((k) => ({ id: "s" + k, type: "rectangle", x: 120 + k * 430, y: 290, w: 360, h: 260, fill: (["blue", "green", "yellow", "red"] as const)[k], label: `${k + 1} step`, labelSize: 44 })),
          ...steps.slice(0, 3).map((k) => ({ id: "a" + k, type: "arrow", from: [485 + k * 430, 420], to: [545 + k * 430, 420] })),
          ...steps.map((k) => ({ id: "ic" + k, type: "icon", icon: (["search", "gear", "document", "check"] as const)[k], x: 235 + k * 430, y: 610, w: 130, h: 130 }))],
        drawOrder: ["title", "s0", "a0", "s1", "a1", "s2", "a2", "s3", "ic0", "ic1", "ic2", "ic3"] },
      { id: "scene-03", section: "example", layout: "free", duration: 0,
        narration: "Show one real number from a source you checked. Then say what it means for the viewer.",
        elements: [title("One number that matters"),
          { id: "chart", type: "chart", chartType: "bar", x: 140, y: 270, w: 1000, h: 560, data: [{ label: "before", value: 1, color: "grey" }, { label: "after", value: 3, color: "blue" }] },
          { id: "call", type: "rectangle", x: 1240, y: 300, w: 560, h: 260, fill: "yellow", label: "Replace with a sourced takeaway", labelSize: 40 },
          { id: "ar", type: "arrow", from: [1240, 520], to: [1000, 600] },
          { id: "bulb", type: "icon", icon: "lightbulb", x: 1460, y: 620, w: 130, h: 130 },
          { id: "hb", type: "highlight", x: 720, y: 270, w: 380, h: 600, style: "circle" },
          { id: "src", type: "text", role: "caption", x: 140, y: 870, w: 1300, h: 50, text: "source: replace me", fontSize: 30 }],
        drawOrder: ["title", "chart", "call", "ar", "bulb", "src", "hb"] },
    ],
  };
}

/** On-screen subtitles use scene.subtitle when present (display spelling such as "오퍼스 5.5"); TTS always reads scene.narration. */
const shownBoard = (b: any) => ({ ...b, scenes: b.scenes.map((s: any) => (s.subtitle ? { ...s, narration: s.subtitle } : s)) });

/**
 * generate -> validate -> fix -> validate. Text is measured with the real font of EVERY style (not only the one being rendered),
 * so a label that fits whiteboard but not spy-titles is caught at build time and the failing style is named.
 */
function validate(b: any, dir: string, style: string) {
  const fit = [style, ...Object.keys(STYLES).filter((k) => k !== style)].flatMap((k) => textFitIssues(b, k));
  return validateBoard(b, dir, makeSubtitles(shownBoard(b))).concat(fit);
}
function fixGeometry(b: any) {
  for (const s of b.scenes)
    for (const e of s.elements) {
      if (e.fontSize) e.fontSize = Math.max(28, e.fontSize);
      if ("x" in e && e.x !== undefined && !e.bleed) {
        e.x = Math.max(40, Math.min(e.x, 1880 - (e.w || 0)));
        e.y = Math.max(140, Math.min(e.y, 930 - (e.h || 0)));
      }
    }
}
/** Shrink text that does not fit with this style's real font (never below 28px). */
function fixTextFit(b: any, issues: any[]) {
  let changed = 0;
  const done = new Set<string>(); // one shrink step per element per round, however many styles flagged it
  for (const is of issues.filter((x) => /text (wider|clipped)/.test(x.rule))) {
    const key = is.scene + "/" + is.id;
    if (done.has(key)) continue;
    done.add(key);
    const s = b.scenes.find((q: any) => q.id === is.scene);
    const e = s?.elements.find((q: any) => q.id === is.id);
    if (!e) continue;
    const size = e.fontSize || 52;
    if (e.type === "text" && size > 28) { e.fontSize = Math.max(28, Math.floor(size * 0.92)); changed++; }
    else if (e.label && e.labelSize > 28) { e.labelSize = Math.max(28, Math.floor(e.labelSize * 0.92)); changed++; } // labels without labelSize already auto-shrink to the floor
  }
  return changed;
}
const count = (list: any[], lvl: string) => list.filter((x) => x.level === lvl).length;
/** Short human list of remaining issues (use --json for the full objects). */
function summary(list: any[], head: string) {
  const e = count(list, "error"), w = count(list, "warning");
  const line = (x: any) => `  ${x.level === "error" ? "ERROR" : "warn "} ${x.scene ?? ""}${x.id ? " / " + x.id : ""}: ${x.rule}${x.detail ? " (" + x.detail + ")" : ""}`;
  const listed = list.filter((x) => x.level === "error" || x.level === "warning");
  const info = list.filter((x) => x.level === "info");
  const expected = info.reduce((n, x) => n + (x.count || 0), 0);
  const items = info.flatMap((x) => (x.items || []).map((i: string) => `${x.scene}: ${i}`));
  const counted = items.length ? `\n  intended overlaps counted (not warnings): ${items.slice(0, 8).join("; ")}${items.length > 8 ? `; +${items.length - 8} more` : ""}` : "";
  const shown = [...listed.filter((x) => x.level === "error"), ...listed.filter((x) => x.level !== "error")].slice(0, 25);
  return [`${head}`, `${e} error(s), ${w} warning(s)` + (expected ? `, ${expected} intended overlap(s) not listed as warnings` : "") + counted + `\n  text fit checked in all ${Object.keys(STYLES).length} styles`, ...shown.map(line), listed.length > shown.length ? `  ... ${listed.length - shown.length} more in validation-report.md` : ""].filter(Boolean).join("\n");
}

/** Output locations for a style: the main project folder, or variants/<style>/. */
function outFor(pp: ReturnType<typeof projectPaths>, b: any, style: string) {
  const main = resolveStyleId(b.style ?? "whiteboard") === style;
  const dir = main ? pp.dir : path.join(pp.dir, "variants", style);
  const o = {
    main, dir,
    final: path.join(dir, "final.mp4"),
    preview: path.join(dir, "preview"),
    frames: path.join(dir, "frames"),
    coverH: path.join(dir, "horizontal-cover.png"),
    coverV: path.join(dir, "vertical-cover.png"),
    report: path.join(dir, "validation-report.md"),
    ffprobe: path.join(dir, "ffprobe.json"),
    result: path.join(dir, "build-result.json"),
  };
  for (const d of [o.dir, o.preview, o.frames]) fs.mkdirSync(d, { recursive: true });
  return o;
}

async function contactSheet(tiles: { file: string; label: string }[][], out: string, colLabels: string[]) {
  const tw = 480, th = 270, pad = 10, lw = 230, top = 40;
  const rows = tiles.length, cols = Math.max(...tiles.map((r) => r.length));
  const cv = createCanvas(lw + cols * (tw + pad) + pad, top + rows * (th + pad) + pad);
  const c = cv.getContext("2d");
  c.fillStyle = "#2b2b2b";
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = "#fff";
  c.font = font(22, "WB Sans Bold");
  colLabels.forEach((l, j) => c.fillText(l, lw + pad + j * (tw + pad), 28));
  for (let i = 0; i < rows; i++) {
    c.fillStyle = "#fff";
    c.font = font(22, "WB Sans Bold");
    c.fillText(tiles[i][0]?.label ?? "", 12, top + i * (th + pad) + th / 2);
    for (let j = 0; j < tiles[i].length; j++) {
      const im = await loadImage(tiles[i][j].file);
      c.drawImage(im, lw + pad + j * (tw + pad), top + pad + i * (th + pad), tw, th);
    }
  }
  fs.writeFileSync(out, cv.toBuffer("image/png"));
}

async function main() {
  if (cmd === "styles" || cmd === "help" || !cmd) {
    console.log("Styles (styles/<id>/STYLE.md):");
    for (const s of Object.values(STYLES)) console.log(`  ${s.id.padEnd(15)} ${s.name} - ${s.summary}\n  ${"".padEnd(15)} best for: ${s.bestFor}`);
    console.log('\nes init "topic" --slug slug [--style id] | set-style slug id | styleframes slug [--styles a,b|all] [--scenes 1,4,6]\n   tts|validate|preview|render|build slug [--style id] [--tts edge|sapi|cmd|silent] [--scenes ids] [--clip a:b] [--mvp] | stickers slug');
    return;
  }
  if (cmd === "init") {
    const p = projectPaths(opt("--slug", name.replace(/\s+/g, "-")));
    if (fs.existsSync(p.storyboard)) throw Error("Project exists");
    ensureDirs(p);
    saveJson(p.storyboard, template(name, resolveStyleId(opt("--style", "whiteboard"))));
    saveJson(p.sourcesJson, { claims: [] });
    saveJson(p.publishJson, {});
    console.log(p.dir);
    console.log(`next: edit ${p.storyboard} (layout recipes: skills/explainer-studio/reference/storyboard-recipes.md), then run: npm run es -- build ${p.dir} --tts silent`);
    return;
  }
  if (cmd === "narrate") {
    // Narration for non-whiteboard engines (Remotion / HyperFrames / Blender):
    // <dir>/narration.json = [{ "id": "s01", "text": "..." }, ...] -> audio/<id>.wav, narration.wav, durations.json
    const dir = path.resolve(name);
    const lines: { id: string; text: string }[] = read(path.join(dir, "narration.json"));
    const engine = await resolveProvider(opt("--tts", "auto"));
    const only = opt("--scenes", "").split(",").filter(Boolean);
    const gap = Number(opt("--gap", "0.25"));
    fs.mkdirSync(path.join(dir, "audio"), { recursive: true });
    const pcm: Buffer[] = [];
    const out: any[] = [];
    let t = 0;
    for (const l of lines) {
      const target = path.join(dir, "audio", l.id + ".wav");
      const res = only.length && !only.includes(l.id) && fs.existsSync(target) ? { path: target, provider: "cached" } : await engine.generateSpeech(l.text, target);
      const data = decodeToPcm(res.path);
      const pad = new Int16Array(Math.round(gap * SAMPLE_RATE));
      const dur = data.length / SAMPLE_RATE;
      out.push({ id: l.id, start: +t.toFixed(3), duration: +dur.toFixed(3), frames30: Math.round(dur * 30), text: l.text, provider: res.provider });
      pcm.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength), Buffer.from(pad.buffer));
      t += dur + gap;
      console.log(l.id, dur.toFixed(3), res.provider);
    }
    const joined = Buffer.concat(pcm);
    writeWav(path.join(dir, "narration.wav"), new Int16Array(joined.buffer, joined.byteOffset, joined.length / 2));
    saveJson(path.join(dir, "durations.json"), { total: +t.toFixed(3), fps: 30, lines: out });
    console.log(`total ${t.toFixed(2)}s -> ${path.join(dir, "durations.json")}`);
    return;
  }
  const pp = projectPaths(name || "example");
  ensureDirs(pp);
  const b: any = read(pp.storyboard);
  Storyboard.parse(b);
  resolveArrowTargets(b);

  if (cmd === "set-style") {
    b.style = resolveStyleId(args[2]);
    saveJson(pp.storyboard, b);
    console.log(`${pp.name}: style = ${b.style}`);
    return;
  }
  if (cmd === "stickers") {
    saveJson(path.join(pp.stickers, "requests.json"), b.stickers.map((s: any) => ({ ...s, prompt: STICKER_STYLE_PROMPT + "\nSubject: " + s.subject, output: s.id + ".png", provider: "manual" })));
    console.log("Manual requests written. Drop authorised PNGs into stickers/.");
    return;
  }
  if (cmd === "styleframes") {
    const list = opt("--styles", "all") === "all" ? Object.keys(STYLES) : opt("--styles").split(",").map(resolveStyleId);
    const sceneNums = opt("--scenes", "").split(",").filter(Boolean).map(Number);
    const picks = sceneNums.length ? sceneNums.map((n) => n - 1) : [0, Math.floor(b.scenes.length / 2), b.scenes.length - 1];
    await loadAssets(b, pp.dir);
    const rows: { file: string; label: string }[][] = [];
    for (const st of list) {
      const dir = path.join(pp.dir, "styleframes", st);
      fs.mkdirSync(dir, { recursive: true });
      const row: { file: string; label: string }[] = [];
      for (const i of picks) {
        const s = b.scenes[i];
        const f = path.join(dir, `scene-${String(i + 1).padStart(2, "0")}.png`);
        fs.writeFileSync(f, frame(b, s, s.duration || 10, pp.dir, "", { style: st }).toBuffer("image/png"));
        row.push({ file: f, label: STYLES[st].name });
      }
      const fit = textFitIssues(b, st);
      console.log(st.padEnd(15), fit.length ? `${fit.length} text-fit issue(s): ${fit.map((x) => x.scene + "/" + x.id).join(", ")}` : "ok");
      rows.push(row);
    }
    const sheet = path.join(pp.dir, "styleframes", "contact-sheet.png");
    await contactSheet(rows, sheet, picks.map((i) => `scene ${i + 1}`));
    console.log(sheet);
    return;
  }

  const style = resolveStyleId(opt("--style", b.style ?? "whiteboard"));
  const out = outFor(pp, b, style);
  const started = Date.now();
  let provider = "cached";

  if (cmd === "build" || cmd === "tts") {
    const engine = await resolveProvider(opt("--tts", "auto"));
    provider = engine.name;
    if (provider === "silent" && !has("--mvp") && opt("--tts", "auto") !== "silent") throw Error("No speech engine available (auto fell back to silent). Pass --tts silent explicitly for a captioned silent cut, or set up edge/sapi/cmd.");
    if (provider === "silent") console.warn("Note: --tts silent writes no voice. Scene lengths are estimated from the text.");
    const pcm: Buffer[] = [];
    const only = opt("--scenes", "").split(",").filter(Boolean);
    for (const s of b.scenes) {
      const target = path.join(pp.audio, s.id + ".wav");
      const result = only.length && !only.includes(s.id) && fs.existsSync(target) ? { path: target, provider: "cached" } : await engine.generateSpeech(s.narration, target);
      let data = decodeToPcm(result.path);
      if (has("--mvp")) data = new Int16Array(Math.round((24 / b.scenes.length) * SAMPLE_RATE));
      s.duration = data.length / SAMPLE_RATE;
      pcm.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
      console.log(s.id, s.duration.toFixed(3), result.provider);
    }
    const joined = Buffer.concat(pcm);
    writeWav(pp.narration, new Int16Array(joined.buffer, joined.byteOffset, joined.length / 2));
    time(b);
    saveJson(pp.storyboard, b);
    if (cmd === "tts") return;
  }

  // generate -> validate -> fix -> validate
  const before = validate(b, pp.dir, style);
  fixGeometry(b);
  let after = validate(b, pp.dir, style);
  for (let round = 0; round < 8 && fixTextFit(b, after); round++) after = validate(b, pp.dir, style);
  time(b);
  after = validate(b, pp.dir, style);
  saveJson(pp.storyboard, b);
  write(out.report, `# Validation report (${style})\n\nBefore: ${count(before, "error")} errors, ${count(before, "warning")} warnings.\n\nAfter: ${count(after, "error")} errors, ${count(after, "warning")} warnings.\n\n` + JSON.stringify({ before, after }, null, 2));
  if (after.some((x) => x.level === "error")) { console.error(summary(after, `Validation failed for style ${style}; render refused.`)); throw Error(`Validation failed for style ${style}; final render refused. Full report: ${out.report}`); }
  if (cmd === "validate") { console.log(has("--json") ? JSON.stringify(after, null, 2) : summary(after, `validate ${style}: estimated ${b.scenes.reduce((m: number, s: any) => m + (s.duration || 0), 0).toFixed(1)} s` + (b.targetSeconds ? ` (target ${b.targetSeconds} s)` : ""))); return; }

  await loadAssets(b, pp.dir);
  const captions = makeSubtitles(shownBoard(b));
  write(pp.srt, captions.map((s: any, i: number) => [i + 1, stamp(s.start) + " --> " + stamp(s.end), s.text, ""].join("\n")).join("\n"));
  for (let i = 0; i < b.scenes.length; i++) fs.writeFileSync(path.join(out.preview, "scene-" + String(i + 1).padStart(2, "0") + ".png"), frame(b, b.scenes[i], b.scenes[i].duration, pp.dir, "", { style }).toBuffer("image/png"));
  if (cmd === "preview") { console.log(out.preview); return; }

  if (cmd === "build" || cmd === "render") {
    const clip = opt("--clip", "");
    const [c0, c1] = clip ? clip.split(":").map(Number) : [0, Infinity];
    const target = clip ? path.join(out.dir, `clip-${c0}-${c1}.mp4`) : out.final;
    const enc = startEncoder({ out: target, width: 1920, height: 1080, fps: 30, audio: clip ? undefined : pp.narration, preset: "veryfast", crf: 21 });
    let offset = 0, n = 0;
    for (let si = 0; si < b.scenes.length; si++) {
      const s = b.scenes[si];
      const frames = Math.round(s.duration * 30);
      if (offset + s.duration <= c0 || offset >= c1) { offset += s.duration; continue; }
      const prevScene = si > 0 ? b.scenes[si - 1] : null;
      const prev = prevScene ? frame(b, prevScene, prevScene.duration, pp.dir, "", { style }) : null;
      for (let k = 0; k < frames; k++) {
        const t = k / 30, gt = offset + t;
        if (gt < c0 || gt >= c1) continue;
        const capObj = captions.find((c: any) => gt >= c.start && gt < c.end);
        const cap = capObj?.text || "";
        const cv = frame(b, s, t, pp.dir, cap, { style, prev, caption: capObj ? { start: capObj.start, end: capObj.end, now: gt } : undefined });
        if (k === Math.floor(frames / 2)) fs.writeFileSync(path.join(out.frames, s.id + "-mid.png"), cv.toBuffer("image/png"));
        if (k === 6 && prev) fs.writeFileSync(path.join(out.frames, s.id + "-transition.png"), cv.toBuffer("image/png"));
        await enc.write(cv.data());
        n++;
      }
      offset += s.duration;
      console.log("rendered", style, s.id, n);
    }
    await enc.finish();
    if (clip) { console.log(target); return; }
    saveJson(out.ffprobe, probeVideo(out.final));
  }
  if (cmd === "build" && !has("--clip")) {
    // one frame at 70 % of every scene, so weak scenes show up without extracting frames by hand
    const tiles: { file: string; label: string }[][] = [];
    const dir70 = path.join(out.dir, "contact-70");
    fs.mkdirSync(dir70, { recursive: true });
    for (let i = 0; i < b.scenes.length; i += 3) {
      const row: { file: string; label: string }[] = [];
      for (let k = i; k < Math.min(i + 3, b.scenes.length); k++) {
        const s = b.scenes[k], f = path.join(dir70, "scene-" + String(k + 1).padStart(2, "0") + ".png");
        fs.writeFileSync(f, frame(b, s, s.duration * 0.7, pp.dir, "", { style }).toBuffer("image/png"));
        row.push({ file: f, label: "scenes " + (i + 1) + "-" + Math.min(i + 3, b.scenes.length) });
      }
      tiles.push(row);
    }
    const sheet70 = path.join(out.dir, "contact-sheet.png");
    await contactSheet(tiles, sheet70, ["first", "second", "third"]);
    console.log("contact sheet (one frame at 70% per scene): " + sheet70);
  }
  fs.writeFileSync(out.coverH, cover(b, false, style).toBuffer("image/png"));
  fs.writeFileSync(out.coverV, cover(b, true, style).toBuffer("image/png"));
  write(pp.script, scriptMarkdown(b));
  write(pp.sourcesMd, sourcesMarkdown(fs.existsSync(pp.sourcesJson) ? read(pp.sourcesJson) : { claims: [] }));
  write(pp.publishMd, publishMarkdown(fs.existsSync(pp.publishJson) ? read(pp.publishJson) : {}, b));
  const result = { style, provider, duration: b.scenes.reduce((m: number, s: any) => m + s.duration, 0), elapsedSec: (Date.now() - started) / 1000, before: before.length, after };
  saveJson(out.result, result);
  if (has("--json")) console.log(JSON.stringify({ ...result, output: out.dir }, null, 2));
  else console.log(summary(after, `${style} done: ${result.duration.toFixed(1)} s video in ${result.elapsedSec.toFixed(0)} s -> ${out.final}`));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

