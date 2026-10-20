#!/usr/bin/env node
/**
 * demo-grid.mjs - put the same storyboard rendered in all 8 styles side by side.
 *
 *   node tools/demo-grid.mjs <projectDir> <out.mp4> [--gif out.gif] [--gif-width 1200] [--gif-seconds 16] [--gif-start 0]
 *
 * Expects <projectDir>/final.mp4 (main style) and <projectDir>/variants/<style>/final.mp4,
 * i.e. run `npm run es -- render <projectDir> --style <id>` for each style first.
 * Output: a 2x4 grid (1920x540) with a style label on every tile.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const [dir, out] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!dir || !out) { console.error('usage: node tools/demo-grid.mjs <projectDir> <out.mp4> [--gif out.gif]'); process.exit(2); }

const STYLES = ['whiteboard', 'swiss-motion', 'blueprint', 'ink-wash', 'urban-sketch', 'spy-titles', 'shadow-puppet', 'ascii-crt'];
const sb = JSON.parse(fs.readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
const main = sb.style || 'whiteboard';
const files = STYLES.map((s) => (s === main ? path.join(dir, 'final.mp4') : path.join(dir, 'variants', s, 'final.mp4')));
const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) { console.error('missing renders:\n' + missing.join('\n')); process.exit(1); }

const font = path.join(root, 'assets', 'fonts', 'NanumGothic-ExtraBold.ttf').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
const tiles = STYLES.map((s, i) => `[${i}:v]scale=480:270,setsar=1,drawbox=x=0:y=0:w=iw:h=34:color=black@0.62:t=fill,drawtext=fontfile='${font}':text='${s}':x=12:y=7:fontsize=20:fontcolor=white[v${i}]`);
const layout = '0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0';
const filter = tiles.join(';') + ';' + STYLES.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=8:layout=${layout}:shortest=1[g]`;
const ff = (a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { encoding: 'utf8' }); if (r.status !== 0) { console.error(r.stderr); process.exit(1); } };
ff([...files.flatMap((f) => ['-i', f]), '-filter_complex', filter, '-map', '[g]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out]);
console.log('grid: ' + out + ` (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);

const gif = opt('--gif');
if (gif) {
  const w = Number(opt('--gif-width', '1200')), sec = Number(opt('--gif-seconds', '16')), fps = Number(opt('--gif-fps', '10'));
  const ss = Number(opt('--gif-start', '0'));
  ff(['-ss', String(ss), '-t', String(sec), '-i', out, '-vf', `fps=${fps},scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, '-loop', '0', gif]);
  console.log('gif: ' + gif + ` (${(fs.statSync(gif).size / 1048576).toFixed(1)} MB)`);
}
