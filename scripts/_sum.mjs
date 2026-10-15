#!/usr/bin/env node
// temp helper: print per-item summary lines for leak scanning
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'content', 'decks', 'partials');
const files = readdirSync(dir).filter((f) => /^architect-foundations-d\d+\.json$/.test(f)).sort();
const mode = process.argv[2] ?? 'summary';
const filt = process.argv[3];
const all = [];
for (const f of files) {
  for (const q of JSON.parse(readFileSync(join(dir, f), 'utf8'))) all.push(q);
}
for (const q of all) {
  if (filt && !q.id.includes(filt)) continue;
  if (mode === 'ts') {
    console.log(`${q.id} [${q.taskStatement}] concept=${q.concept}`);
    console.log(`  PROMPT: ${q.prompt}`);
    for (const o of q.options) console.log(`  ${o.id}${o.isCorrect ? '*' : ' '} ${o.text}`);
    console.log(`  CORRECT: ${q.explanation.correct}`);
    console.log(`  TAKEAWAY: ${q.explanation.takeaway}`);
    console.log('');
  }
}