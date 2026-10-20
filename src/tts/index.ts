/**
 * TTS provider registry.
 *
 * Every provider implements generateSpeech(text, outputPath) and returns the REAL duration
 * of the written file (measured with ffprobe), so timing never relies on estimates when a
 * real voice is used. Add a new engine by implementing TtsProvider and registering it below.
 */
import { edgeProvider } from "./providers/edge.js";
import { sapiProvider } from "./providers/sapi.js";
import { silentProvider } from "./providers/silent.js";
import { cmdProvider } from "./providers/cmd.js";
import type { TtsProvider, SpeechResult } from "./types.js";

export type { TtsProvider, SpeechResult } from "./types.js";

export const PROVIDERS: Record<string, TtsProvider> = {
  edge: edgeProvider,
  sapi: sapiProvider,
  silent: silentProvider,
  cmd: cmdProvider,
};

/** Order used by `--tts auto`. */
const AUTO_ORDER = ["edge", "sapi", "silent"];

export async function resolveProvider(name = process.env.WV_TTS || "auto"): Promise<TtsProvider> {
  if (name !== "auto") {
    const p = PROVIDERS[name];
    if (!p) throw new Error(`Unknown TTS provider "${name}". Available: ${Object.keys(PROVIDERS).join(", ")}`);
    if (!(await p.available())) throw new Error(`TTS provider "${name}" is not available in this environment.`);
    return p;
  }
  for (const n of AUTO_ORDER) {
    const p = PROVIDERS[n];
    if (await p.available()) return p;
  }
  return silentProvider;
}

/** Convenience wrapper matching the documented interface: generateSpeech(text, outputPath). */
export async function generateSpeech(text: string, outputPath: string, provider?: TtsProvider): Promise<SpeechResult> {
  const p = provider ?? (await resolveProvider());
  return p.generateSpeech(text, outputPath);
}
