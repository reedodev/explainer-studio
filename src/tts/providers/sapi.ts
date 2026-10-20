/**
 * Windows offline TTS through System.Speech (SAPI). Picks an installed voice by culture:
 * ko-KR for Korean lines, en-US otherwise (override with WV_SAPI_VOICE, e.g. "Zira" or "en-GB").
 * Robotic but fully local and free.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { probeDuration } from "../../media/ffmpeg.js";
import type { TtsProvider } from "../types.js";

const hintFor = (text: string) => process.env.WV_SAPI_VOICE || (/[\uac00-\ud7a3]/.test(text) ? "ko-KR" : "en-US");
const RATE = process.env.WV_SAPI_RATE || "1";

function ps(script: string) {
  return spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
}

let voices: string[] | undefined;

function findVoice(hint: string): string | null {
  if (process.platform !== "win32") return null;
  if (!voices) {
  const r = ps(
      "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture }",
  );
  voices = (r.stdout || "").split(/\r?\n/).filter(Boolean);
  }
  const hit = voices.find((l) => l.includes(hint)) ?? null;
  return hit ? hit.split("|")[0] : null;
}

export const sapiProvider: TtsProvider = {
  name: "sapi",
  description: "Windows System.Speech (offline; ko-KR or en-US voice picked per line)",
  async available() {
    return !!(findVoice("ko-KR") || findVoice("en-US") || (process.env.WV_SAPI_VOICE && findVoice(process.env.WV_SAPI_VOICE)));
  },
  async generateSpeech(text, outputPath) {
    const voice = findVoice(hintFor(text));
    if (!voice) throw new Error(`No installed SAPI voice matches "${hintFor(text)}"`);
    const out = outputPath.replace(/\.\w+$/, "") + ".wav";
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const txt = path.join(os.tmpdir(), `wv-sapi-${process.pid}-${Date.now()}.txt`);
    fs.writeFileSync(txt, text, "utf8");
    const script = [
      "Add-Type -AssemblyName System.Speech",
      "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer",
      `$s.SelectVoice('${voice.replace(/'/g, "''")}')`,
      `$s.Rate=${parseInt(RATE, 10) || 0}`,
      `$s.SetOutputToWaveFile('${out.replace(/'/g, "''")}')`,
      `$t=[System.IO.File]::ReadAllText('${txt.replace(/'/g, "''")}',[System.Text.Encoding]::UTF8)`,
      "$s.Speak($t)",
      "$s.Dispose()",
    ].join("; ");
    const r = ps(script);
    fs.rmSync(txt, { force: true });
    if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`SAPI failed: ${r.stderr}`);
    return { path: out, durationSec: probeDuration(out), provider: "sapi", voice };
  },
};
