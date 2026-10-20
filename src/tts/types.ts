export interface SpeechResult {
  path: string;
  /** Real duration in seconds, measured from the written file. */
  durationSec: number;
  provider: string;
  voice?: string;
}

export interface TtsProvider {
  name: string;
  /** Human readable note (voice, licence caveats...). */
  description: string;
  /** True if the engine can actually run here (checked, not assumed). */
  available(): Promise<boolean>;
  generateSpeech(text: string, outputPath: string): Promise<SpeechResult>;
}

export function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
