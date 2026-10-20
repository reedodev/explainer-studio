/** Markdown renderers for script.md, sources.md and publish.md (content stays in JSON). */

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

export function scriptMarkdown(b: any): string {
  const parts = [`# ${b.title}`, '', `주제: ${b.topic}`, ''];
  let t = 0;
  b.scenes.forEach((s: any, i: number) => {
    const start = t;
    t += s.duration || 0;
    parts.push(`## ${i + 1}. ${s.section ?? s.id} (${fmt(start)}–${fmt(t)})`, '');
    const sentences: string[] = s.narration.match(/[^.!?]+[.!?]?/g)?.map((x: string) => x.trim()).filter(Boolean) ?? [s.narration];
    for (const x of sentences) parts.push(`- ${x}`);
    if (s.claimIds?.length) parts.push('', `근거: ${s.claimIds.join(', ')}`);
    parts.push('');
  });
  parts.push(`총 길이: ${fmt(t)} (${t.toFixed(1)}초)`);
  return parts.join('\n');
}

export function sourcesMarkdown(src: any): string {
  const claims: any[] = src?.claims ?? [];
  const parts = ['# Sources', '', `주제: ${src?.topic ?? ''}`, `확인 시각: ${src?.checked_at ?? ''}`, ''];
  parts.push('| ID | 상태 | 출처 | 확인 시각 |', '|---|---|---|---|');
  for (const c of claims) parts.push(`| ${c.id} | ${c.status ?? 'unknown'} | [${c.source}](${c.url}) | ${c.checked_at} |`);
  parts.push('');
  for (const c of claims) {
    parts.push(`## ${c.id}`, '', `- claim: ${c.claim}`, `- source: ${c.source}`, `- URL: ${c.url}`, `- checked_at: ${c.checked_at}`);
    if (c.section) parts.push(`- section: ${c.section}`);
    if (c.status) parts.push(`- status: ${c.status}`);
    if (c.quote) parts.push(`- 원문: "${c.quote}"`);
    if (c.note) parts.push(`- note: ${c.note}`);
    parts.push('');
  }
  const unverified = claims.filter((c) => c.status && c.status !== 'verified');
  if (unverified.length) parts.push('## 미확인 주장', '', ...unverified.map((c) => `- ${c.id}: ${c.claim}`), '');
  if (src?.notes?.length) parts.push('## 메모', '', ...list(src.notes).map((n) => `- ${n}`), '');
  return parts.join('\n');
}

export function publishMarkdown(pub: any, b: any): string {
  const p: string[] = ['# 게시 준비 문안 (자동 게시 안 함)', '', '> 이 문서는 검토용입니다. 업로드는 사용자가 직접 승인한 뒤 진행하세요.', ''];
  p.push('## 제목 후보 5개', '', ...list(pub.titles).map((t, i) => `${i + 1}. ${t}`), '');
  if (pub.youtube) p.push('## YouTube', '', `**제목:** ${pub.youtube.title}`, '', '**설명:**', '', pub.youtube.description ?? '', '');
  if (pub.instagram) p.push('## Instagram', '', pub.instagram, '');
  if (pub.threads) p.push('## Threads', '', pub.threads, '');
  if (pub.linkedin) p.push('## LinkedIn', '', pub.linkedin, '');
  if (pub.hashtags) p.push('## 해시태그', '', list(pub.hashtags).map((h) => '#' + h.replace(/^#/, '')).join(' '), '');
  if (pub.summary) p.push('## 영상 핵심 요약', '', ...list(pub.summary).map((s) => `- ${s}`), '');
  if (pub.sourcesNotice) p.push('## 출처 안내', '', pub.sourcesNotice, '');
  if (pub.commentQuestion) p.push('## 댓글용 질문', '', pub.commentQuestion, '');
  const total = b.scenes.reduce((n: number, s: any) => n + (s.duration || 0), 0);
  p.push('---', '', `영상 길이: ${fmt(total)} / 장면 ${b.scenes.length}개`);
  return p.join('\n');
}

function fmt(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
