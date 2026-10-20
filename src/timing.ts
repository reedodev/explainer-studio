/**
 * Element draw windows.
 *
 * Default: every element of a scene is fully drawn by DRAW_BY of the scene (or 8 s before the
 * end on very long scenes), so most of each scene shows the complete composition instead of a
 * half-drawn one. Elements with an explicit `cue` still start on their narration sentence.
 * storyboard.drawBy (0.3-0.97) overrides the default; fx.manualTiming keeps hand-set windows.
 */
export const DRAW_BY = 0.65;

export function time(b: any) {
  if (b.fx?.manualTiming) return;
  for (const s of b.scenes) {
    const sentences = s.narration.match(/[^.!?]+[.!?]?/g) || [s.narration];
    const weights = sentences.map((x: string) => x.length), total = weights.reduce((a: number, c: number) => a + c, 0) || 1;
    const D = s.duration, n = s.drawOrder.length || 1;
    const frac = Math.min(0.97, Math.max(0.3, Number(b.drawBy) || DRAW_BY));
    const drawEnd = Math.min(D - 0.1, Math.max(D * frac, D - 8));
    // very short scenes (silent tests, one-word cards): shrink the minimum window so windows stay inside the scene
    const minWin = Math.min(0.3, Math.max(0.05, (D - 0.1) / n));
    // Opening: a leading title types fast (about 1 s) while the first visual starts at ~2% of the
    // scene in parallel, so a scene never opens on a lone typing title.
    const first = s.elements.find((q: any) => q.id === s.drawOrder[0]);
    const titleLead = n > 1 && first && first.type === "text" && first.cue === undefined;
    const lead = titleLead ? Math.min(D * 0.02, 0.4) : 0;
    const rest = titleLead ? n - 1 : n;
    const share = (drawEnd - lead) / (rest || 1);
    let prior = 0;
    for (let i = 0; i < s.drawOrder.length; i++) {
      const e = s.elements.find((q: any) => q.id === s.drawOrder[i]);
      const cued = e.cue !== undefined;
      if (titleLead && i === 0) {
        e.start = 0;
        e.end = Math.min(D - 0.1, Math.max(minWin, Math.min(1.0, D * 0.12)));
        if (e.dur) e.end = Math.min(e.end, Math.max(minWin, e.dur));
        prior = lead;
        continue;
      }
      const k = titleLead ? i - 1 : i;
      const cueAt = cued ? (weights.slice(0, e.cue).reduce((a: number, c: number) => a + c, 0) / total) * D * 0.92 : lead + k * share;
      e.start = Math.max(prior, Math.min(cueAt, D - 0.4));
      e.end = Math.min(D - 0.1, Math.max(e.start + minWin, cued ? e.start + share : lead + (k + 1) * share));
      if (e.dur) e.end = Math.min(e.end, e.start + Math.max(minWin, e.dur)); // opt-in fast reveal
      if (e.start > e.end - 0.05) e.start = Math.max(0, e.end - 0.05);
      prior = e.end;
    }
  }
}
