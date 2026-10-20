import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
export const SAMPLE_RATE = 48000;

export function checkFfmpeg(): string {
  const r = spawnSync(FFMPEG, ["-version"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg not found (${FFMPEG}). Install FFmpeg or set FFMPEG_PATH.`);
  return r.stdout.split("\n")[0];
}

export function probeDuration(file: string): number {
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe failed for ${file}: ${r.stderr}`);
  const d = parseFloat(r.stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`ffprobe returned no duration for ${file}`);
  return d;
}

export function probeVideo(file: string) {
  const r = spawnSync(
    FFPROBE,
    ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size", "-of", "json", file],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** Decode any audio file to mono 16-bit PCM @48k (raw samples). */
export function decodeToPcm(file: string): Int16Array {
  const r = spawnSync(FFMPEG, ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "-"], {
    maxBuffer: 1024 * 1024 * 512,
  });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed for ${file}: ${r.stderr?.toString()}`);
  const buf = r.stdout as Buffer;
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
}

/** Trim leading/trailing near-silence so sentence timing reflects actual speech. */
export function trimSilence(pcm: Int16Array, threshold = 350, keepSec = 0.04): Int16Array {
  let a = 0;
  let b = pcm.length - 1;
  while (a < pcm.length && Math.abs(pcm[a]) < threshold) a++;
  while (b > a && Math.abs(pcm[b]) < threshold) b--;
  const keep = Math.round(keepSec * SAMPLE_RATE);
  a = Math.max(0, a - keep);
  b = Math.min(pcm.length - 1, b + keep);
  return pcm.slice(a, b + 1);
}

export function writeWav(file: string, pcm: Int16Array, sampleRate = SAMPLE_RATE) {
  const dataBytes = pcm.length * 2;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(dataBytes, 40);
  fs.writeFileSync(file, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, dataBytes)]));
}

export interface EncoderHandle {
  write(frame: Buffer): Promise<void>;
  finish(): Promise<void>;
}

/** Start an ffmpeg process that encodes raw RGBA frames (+ optional audio) to H.264 MP4. */
export function startEncoder(opts: { out: string; width: number; height: number; fps: number; audio?: string; crf?: number; preset?: string }): EncoderHandle {
  const args = ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${opts.width}x${opts.height}`, "-r", String(opts.fps), "-i", "-"];
  if (opts.audio) args.push("-i", opts.audio);
  args.push(
    "-map", "0:v:0",
    ...(opts.audio ? ["-map", "1:a:0", "-c:a", "aac", "-b:a", "192k"] : []),
    "-c:v", "libx264",
    "-preset", opts.preset ?? "medium",
    "-crf", String(opts.crf ?? 18),
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-r", String(opts.fps),
    "-movflags", "+faststart",
    ...(opts.audio ? ["-shortest"] : []),
    opts.out,
  );
  const proc = spawn(FFMPEG, args, { stdio: ["pipe", "inherit", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr += d.toString()));
  const done = new Promise<void>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))));
  });
  return {
    write(frame: Buffer) {
      return new Promise((resolve, reject) => {
        const ok = proc.stdin.write(frame, (err) => (err ? reject(err) : undefined));
        if (ok) resolve();
        else proc.stdin.once("drain", () => resolve());
      });
    },
    async finish() {
      proc.stdin.end();
      await done;
    },
  };
}
