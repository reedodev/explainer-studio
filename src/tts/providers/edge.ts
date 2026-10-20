/**
 * Microsoft Edge "Read Aloud" neural voices via the `msedge-tts` npm package (MIT).
 * Needs internet. This is an unofficial endpoint used by the Edge browser: before monetised
 * publication, check Microsoft's terms or switch to the official Azure Speech service.
 */
import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { probeDuration } from "../../media/ffmpeg.js";
import { escapeXml, type TtsProvider } from "../types.js";

/** Voice: WV_EDGE_VOICE, otherwise per line (Korean text -> ko-KR-SunHiNeural, anything else -> en-US-AndrewNeural). */
const voiceFor = (text: string) => process.env.WV_EDGE_VOICE || (/[\uac00-\ud7a3]/.test(text) ? "ko-KR-SunHiNeural" : "en-US-AndrewNeural");
const VOICE = process.env.WV_EDGE_VOICE || "auto (ko-KR-SunHiNeural / en-US-AndrewNeural)";
const RATE = process.env.WV_EDGE_RATE || "+0%";

let cachedAvailable: boolean | null = null;

async function synth(text: string, outputPath: string) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceFor(text), OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), { rate: RATE });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("edge-tts timeout")), 30000);
      audioStream.on("data", (d: Buffer) => chunks.push(d));
      audioStream.on("close", () => { clearTimeout(timer); resolve(); });
      audioStream.on("end", () => { clearTimeout(timer); resolve(); });
      audioStream.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
    });
    const buf = Buffer.concat(chunks);
    if (buf.length < 1000) throw new Error(`edge-tts returned ${buf.length} bytes`);
    fs.writeFileSync(outputPath, buf);
  } finally {
    tts.close();
  }
}

export const edgeProvider: TtsProvider = {
  name: "edge",
  description: `msedge-tts (${VOICE}), online neural voice`,
  async available() {
    if (cachedAvailable !== null) return cachedAvailable;
    try {
      const tmp = path.join(process.env.TEMP || ".", `wv-edge-probe-${process.pid}.mp3`);
      await synth("test", tmp);
      fs.rmSync(tmp, { force: true });
      cachedAvailable = true;
    } catch {
      cachedAvailable = false;
    }
    return cachedAvailable;
  },
  async generateSpeech(text, outputPath) {
    const out = outputPath.replace(/\.\w+$/, "") + ".mp3";
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await synth(text, out);
        return { path: out, durationSec: probeDuration(out), provider: "edge", voice: voiceFor(text) };
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    throw new Error(`edge-tts failed after 3 attempts: ${String(lastErr)}`);
  },
};
