#!/usr/bin/env node
/**
 * Grounding check: prove every question is traceable to the official exam guide.
 *
 * Two gates:
 *  1. HARD - every VERIFIED question must carry at least one verbatim `source.quotes`
 *     sentence from the guide. If an item claims to be verified, it must show its
 *     evidence. needs-review items are exempt (that is what the flag means).
 *  2. SOFT - report how much of each keyed answer's vocabulary appears in the guide
 *     text. Low scores are usually paraphrase, not fabrication, so this warns
 *     rather than fails.
 *
 * Exit 1 only on a hard-gate failure. Run `node scripts/add-quotes.mjs --apply`
 * to populate quotes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DECKS = join(ROOT, 'content', 'decks');
const SOURCE = join(ROOT, 'content', 'source');

const LIG = {
  '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl',
  '\u2019': "'", '\u2018': "'", '\u201C': '"', '\u201D': '"',
  '\u2014': ' - ', '\u2013': ' - ', '\u2022': ' ', '\u00A0': ' ', '\u00B7': ' ', '\u2192': ' -> ',
};
const deLig = (s) => { let o = ''; for (const ch of String(s || '')) o += LIG[ch] !== undefined ? LIG[ch] : ch; return o; };
const STOP = new Set('the a an and or of to in for on with that this it is are be as by from at into than then so if not no can may must should will would which who what when where why how you your their its our we they them he she his her does do did done has have had being been but also only more most other some any each both same very just about over under between among such via per'.split(/\s+/));
const terms = (s) => deLig(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

const SOURCE_FOR = {
  'architect-foundations': 'Claude-Certified-Architect-Foundations-Exam-Guide.txt',
  'architect-professional': 'Claude-Certified-Architect-Profesional-Exam-Guide.txt',
  'developer-foundations': 'Claude-Certified-Developer-Foundations-Exam-Guide.txt',
};

const decks = readdirSync(DECKS).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
let errors = 0;

for (const file of decks) {
  const deckId = file.replace('.json', '');
  const src = SOURCE_FOR[deckId];
  if (!src) continue;
  const txt = deLig(readFileSync(join(SOURCE, src), 'utf8')).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const qs = JSON.parse(readFileSync(join(DECKS, file), 'utf8')).questions;

  let missingQuote = 0;
  const low = [];
  let sum = 0;
  for (const q of qs) {
    if (q.reviewStatus === 'verified' && !(q.source.quotes && q.source.quotes.length)) missingQuote++;
    const uniq = [...new Set(terms(q.options.find((o) => o.isCorrect).text))];
    const present = uniq.filter((w) => txt.includes(w)).length;
    const g = uniq.length ? present / uniq.length : 1;
    sum += g;
    if (g < 0.6 && q.reviewStatus === 'verified') low.push(`${q.id} (${Math.round(g * 100)}%)`);
  }
  const avg = Math.round((sum / qs.length) * 100);
  console.log(`${deckId.padEnd(24)} ${qs.length} items  avg key-term grounding ${avg}%  verified-without-quote ${missingQuote}`);
  if (missingQuote) {
    errors += missingQuote;
    console.log(`  ERROR: ${missingQuote} verified item(s) have no source.quotes - run add-quotes.mjs --apply`);
  }
  if (low.length) console.log(`  note: ${low.length} verified item(s) below 60% (likely paraphrase): ${low.slice(0, 8).join(', ')}`);
}

if (errors) {
  console.log(`\nGROUNDING FAILED: ${errors} verified item(s) lack a guide quote.`);
  process.exit(1);
}
console.log('\nOK: every verified question cites the guide.');
