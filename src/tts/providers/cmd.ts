/**
 * Generic command-line TTS provider. Plug in any local engine (Piper, Coqui, macOS `say`,
 * your own licensed voice...) without code changes:
 *
 *   WV_TTS_CMD='piper --model en_US-amy-medium.onnx --output_file {out} --text {text}'
 *   npx tsx src/cli.ts build my-topic --tts cmd
 *
 * {text} is replaced with a shell-quoted narration line, {out} with the target .wav path.
 * Only use voices you are allowed to use; never clone someone's voice without consent.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { probeDuration } from "../../media/ffmpeg.js";
import type { TtsProvider } from "../types.js";

const quote = (s: string) => (process.platform === "win32" ? `"${s.replace(/"/g, '""')}"` : `'${s.replace(/'/g, `'\\''`)}'`);

export const cmdProvider: TtsProvider = {
  name: "cmd",
  description: "Any local TTS command from WV_TTS_CMD ({text}, {out} placeholders)",
  async available() {
    return !!process.env.WV_TTS_CMD && process.env.WV_TTS_CMD.includes("{out}");
  },
  async generateSpeech(text, outputPath) {
    const tpl = process.env.WV_TTS_CMD;
    if (!tpl) throw new Error("Set WV_TTS_CMD, e.g. 'mytts --text {text} --out {out}'");
    const out = outputPath.replace(/\.\w+$/, "") + ".wav";
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const cmd = tpl.replace(/\{text\}/g, quote(text)).replace(/\{out\}/g, quote(out));
    const r = spawnSync(cmd, { shell: true, encoding: "utf8", timeout: 180000 });
    if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`WV_TTS_CMD failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-400)}`);
    return { path: out, durationSec: probeDuration(out), provider: "cmd" };
  },
};
