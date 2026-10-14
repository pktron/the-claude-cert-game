#!/usr/bin/env node
/**
 * Mechanical QA over the shipped decks. Catches the objective problems a
 * semantic reviewer should not have to spend time on: encoding damage, id
 * drift, duplicate options, answer-revealing length/position bias, and
 * explanation/option mismatches.
 *
 * Usage: node scripts/audit-decks.mjs [--strict]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DECKS = join(ROOT, 'content', 'decks');

const problems = [];
const add = (deck, level, id, msg) => problems.push({ deck, level, id, msg });

// Characters that indicate the PDF extraction damaged the text.
const MOJIBAKE = [
  [/ﬁ/g, 'ﬁ ligature'],
  [/ﬂ/g, 'ﬂ ligature'],
  [/ﬀ/g, 'ﬀ ligature'],
  [/ﬃ/g, 'ﬃ ligature'],
  [/ﬄ/g, 'ﬄ ligature'],
  [/ /g, 'non-breaking space'],
  [/�/g, 'replacement char'],
  [/\bteh\b/g, 'teh typo'],
  [/\s{3,}/g, 'runs of whitespace'],
];

const ID_PATTERNS = {
  'architect-foundations': /^d\d-\d+-\d{3}$/,
  'architect-professional': /^p\d-[\d.]+-\d{3}$/,
  'developer-foundations': /^v\d-[\d.]+-\d{3}$/,
};

const files = readdirSync(DECKS).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort();
const decks = files.map((f) => JSON.parse(readFileSync(join(DECKS, f), 'utf8')));

const stats = [];

for (const deck of decks) {
  const idPattern = ID_PATTERNS[deck.deckId];
  const seenIds = new Set();
  let first = 0, last = 0, lenTell = 0, needsReview = 0;
  const concepts = new Map();

  for (const q of deck.questions) {
    const where = q.id ?? '(no id)';

    // --- id hygiene -------------------------------------------------
    if (seenIds.has(q.id)) add(deck.deckId, 'error', where, 'duplicate id');
    seenIds.add(q.id);
    if (idPattern && !idPattern.test(q.id)) {
      add(deck.deckId, 'warn', where, `id does not match ${deck.deckId} convention ${idPattern}`);
    }

    // --- encoding damage --------------------------------------------
    const haystack = JSON.stringify(q);
    for (const [re, label] of MOJIBAKE) {
      if (re.test(haystack)) add(deck.deckId, 'error', where, `contains ${label}`);
      re.lastIndex = 0;
    }

    // --- option hygiene ---------------------------------------------
    const texts = q.options.map((o) => (o.text || '').trim().toLowerCase());
    if (new Set(texts).size !== texts.length) add(deck.deckId, 'error', where, 'duplicate option text');
    for (const o of q.options) {
      if ((o.text || '').trim().length < 8) add(deck.deckId, 'warn', where, `option "${o.id}" is very short`);
    }

    // --- explanation coverage ---------------------------------------
    for (const o of q.options.filter((x) => !x.isCorrect)) {
      if (!q.explanation?.whyWrong?.[o.id]) add(deck.deckId, 'error', where, `whyWrong missing for ${o.id}`);
      if (!q.distractorRationale?.[o.id]) add(deck.deckId, 'error', where, `distractorRationale missing for ${o.id}`);
    }
    if (!q.explanation?.analogy && q.reviewStatus !== 'needs-review') {
      // Not an error, just noting depth.
    }
    if (q.reviewStatus === 'needs-review') needsReview++;

    // --- source citation --------------------------------------------
    if (!q.source?.section || q.source.section.trim().length < 3)
      add(deck.deckId, 'error', where, 'source.section missing or too short');
    if (q.source?.document && !deck.generatedFrom?.includes(q.source.document))
      add(deck.deckId, 'error', where, `source.document "${q.source.document}" is not this deck's source`);
    if (q.taskStatement && q.source?.section && !q.source.section.includes(q.taskStatement))
      add(deck.deckId, 'warn', where, `source.section "${q.source.section}" does not mention objective ${q.taskStatement}`);

    // --- answer-revealing signals -----------------------------------
    if (q.type === 'single') {
      const ci = q.options.findIndex((o) => o.isCorrect);
      if (ci === 0) first++;
      if (ci === q.options.length - 1) last++;
      const cLen = q.options[ci].text.length;
      const avg = q.options.filter((o) => !o.isCorrect).reduce((a, o) => a + o.text.length, 0) / Math.max(1, q.options.length - 1);
      if (cLen > avg * 1.5 + 10 || cLen < avg * 0.6) lenTell++;
    }

    // --- concept tags ------------------------------------------------
    if (q.concept) {
      const key = q.concept.toLowerCase();
      if (!concepts.has(key)) concepts.set(key, []);
      concepts.get(key).push(q.id);
    }
  }

  const singles = deck.questions.filter((q) => q.type === 'single').length || 1;
  stats.push({
    exam: deck.examCode,
    total: deck.questions.length,
    needsReview,
    correctFirstPct: Math.round((first / singles) * 100),
    correctLastPct: Math.round((last / singles) * 100),
    lengthTells: lenTell,
  });
}

console.log('\n=== DECK SUMMARY ===');
for (const s of stats) {
  console.log(
    `${s.exam.padEnd(7)} ${String(s.total).padStart(4)} questions  ` +
    `needs-review ${String(s.needsReview).padStart(2)} (${Math.round((s.needsReview / s.total) * 100)}%)  ` +
    `correct-first ${String(s.correctFirstPct).padStart(3)}%  correct-last ${String(s.correctLastPct).padStart(3)}%  ` +
    `length-tells ${s.lengthTells}`,
  );
}

const byDeck = new Map();
for (const p of problems) {
  if (!byDeck.has(p.deck)) byDeck.set(p.deck, []);
  byDeck.get(p.deck).push(p);
}

console.log('\n=== MECHANICAL FINDINGS ===');
if (problems.length === 0) {
  console.log('none');
} else {
  for (const [deck, list] of byDeck) {
    const errors = list.filter((p) => p.level === 'error');
    const warns = list.filter((p) => p.level === 'warn');
    console.log(`\n${deck}: ${errors.length} error(s), ${warns.length} warning(s)`);
    for (const p of errors) console.log(`  ERROR  ${p.id}: ${p.msg}`);
    for (const p of warns.slice(0, 25)) console.log(`  WARN   ${p.id}: ${p.msg}`);
    if (warns.length > 25) console.log(`  ... ${warns.length - 25} more warnings`);
  }
}

process.exit(problems.some((p) => p.level === 'error') ? 1 : 0);
