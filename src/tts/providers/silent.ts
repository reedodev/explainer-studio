/**
 * Silent provider: writes silence whose length is estimated from the text
 * (Korean ~6.5 syllables/s, English ~2.6 words/s). Used for Phase-1 layout tests and CI.
 */
import fs from "node:fs";
import path from "node:path";
import { SAMPLE_RATE, writeWav } from "../../media/ffmpeg.js";
import type { TtsProvider } from "../types.js";

export function estimateSpeechSec(text: string) {
  // Korean ~6.5 syllables/s; other scripts ~2.6 words/s (about 155 words per minute).
  if (/[\uac00-\ud7a3]/.test(text)) return Math.max(0.8, text.replace(/\s+/g, "").length / 6.5 + 0.2);
  return Math.max(0.8, text.trim().split(/\s+/).length / 2.6 + 0.2);
}

export const silentProvider: TtsProvider = {
  name: "silent",
  description: "No voice. Duration estimated from character count.",
  async available() {
    return true;
  },
  async generateSpeech(text, outputPath) {
    const out = outputPath.replace(/\.\w+$/, "") + ".wav";
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const sec = estimateSpeechSec(text);
    // Tiny non-zero noise floor so silence trimming keeps the whole estimated length.
    const pcm = new Int16Array(Math.round(sec * SAMPLE_RATE)).fill(400);
    writeWav(out, pcm);
    return { path: out, durationSec: sec, provider: "silent" };
  },
};
