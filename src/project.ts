import fs from "node:fs";
import path from "node:path";
import { OUTPUT_ROOT } from "./config.js";
import { Storyboard } from "./storyboard/schema.js";

export interface ProjectPaths {
  name: string;
  dir: string;
  storyboard: string;
  timeline: string;
  script: string;
  sourcesJson: string;
  sourcesMd: string;
  publishJson: string;
  publishMd: string;
  srt: string;
  report: string;
  final: string;
  narration: string;
  coverH: string;
  coverV: string;
  audio: string;
  stickers: string;
  preview: string;
  frames: string;
  research: string;
}

export function slugify(topic: string): string {
  const ascii = topic
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return ascii || `video-${Date.now()}`;
}

export function projectPaths(nameOrDir: string): ProjectPaths {
  const looksLikePath = path.isAbsolute(nameOrDir) || /[\\/]/.test(nameOrDir);
  const dir = looksLikePath ? path.resolve(nameOrDir) : path.join(OUTPUT_ROOT, nameOrDir);
  const p = (f: string) => path.join(dir, f);
  return {
    name: path.basename(dir),
    dir,
    storyboard: p("storyboard.json"),
    timeline: p("timeline.json"),
    script: p("script.md"),
    sourcesJson: p("research/sources.json"),
    sourcesMd: p("sources.md"),
    publishJson: p("publish.json"),
    publishMd: p("publish.md"),
    srt: p("subtitles.srt"),
    report: p("validation-report.md"),
    final: p("final.mp4"),
    narration: p("audio/narration.wav"),
    coverH: p("horizontal-cover.png"),
    coverV: p("vertical-cover.png"),
    audio: p("audio"),
    stickers: p("stickers"),
    preview: p("preview"),
    frames: p("frames"),
    research: p("research"),
  };
}

export function ensureDirs(pp: ProjectPaths) {
  for (const d of [pp.dir, pp.audio, pp.stickers, pp.preview, pp.frames, pp.research]) fs.mkdirSync(d, { recursive: true });
}

export function loadStoryboard(pp: ProjectPaths): Storyboard {
  const raw = JSON.parse(fs.readFileSync(pp.storyboard, "utf8"));
  const res = Storyboard.safeParse(raw);
  if (!res.success) {
    const msg = res.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`storyboard.json schema errors:\n${msg}`);
  }
  return res.data;
}

export function saveJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}
