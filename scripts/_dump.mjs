#!/usr/bin/env node
// temp helper: dump questions by id (or all matching a substring) across partials
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'content', 'decks', 'partials');
const files = readdirSync(dir).filter((f) => /^architect-foundations-d\d+\.json$/.test(f)).sort();
const want = process.argv.slice(2);
const all = [];
for (const f of files) {
  const qs = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const q of qs) all.push(q);
}
const sel = want.length
  ? all.filter((q) => want.some((w) => q.id === w || q.id.startsWith(w)))
  : all;
for (const q of sel) {
  console.log('='.repeat(80));
  console.log(JSON.stringify(q, null, 2));
}
console.log('---', sel.length, 'of', all.length);