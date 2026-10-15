#!/usr/bin/env node
/**
 * Redistributes which ARRAY POSITION holds the correct answer, per question.
 *
 * Why this is safe: the app never presents array order. `presentationRows()` derives
 * the displayed order from the randomised direction assignment, so the array index
 * is invisible to the learner. The index matters only as a pattern in the stored
 * data, which this removes. Option ids, text and ordering of ids are untouched.
 *
 * Deterministic: a question's key position is assigned from a stable hash of its id,
 * so re-running changes nothing. Run with --apply to write.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PARTIALS = join(ROOT, 'content', 'decks', 'partials');
const APPLY = process.argv.includes('--apply');

/** Stable 32-bit hash, same family as the app's seeded RNG. */
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Redistribute key positions evenly within each DECK.
 *
 * Questions are grouped by option count (a 2-option item can only key #0 or #1),
 * ordered deterministically by an id hash, then dealt round-robin so each target
 * position is used about equally often.
 *
 * Balance is computed per DECK, not per file. A deck is authored as several
 * partial files, and per-file balancing cannot reach deck-level balance when
 * each file holds fewer items than it has positions - CCDV-F is 8 files of
 * ~7 items, so per-file balancing left 53% of keys on index 0.
 */
function spread(questions) {
  const groups = new Map();
  for (const q of questions) {
    if (q.type !== 'single') continue;
    const n = q.options.length;
    if (n < 2) continue;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(q);
  }

  let moved = 0;
  for (const [n, items] of groups) {
    // Deterministic order, independent of current positions.
    items.sort((a, b) => hashSeed(a.id) - hashSeed(b.id));
    items.forEach((q, i) => {
      const target = i % n;
      const current = q.options.findIndex((o) => o.isCorrect);
      if (target === current) return;
      const opts = q.options.slice();
      const [correct] = opts.splice(current, 1);
      opts.splice(target, 0, correct);
      q.options = opts;
      moved++;
    });
  }
  return moved;
}

const files = readdirSync(PARTIALS).filter((f) => f.endsWith('.json')).sort();

/** Which shipped deck a partial belongs to. Balance must be per deck, not per file. */
function deckOf(file) {
  if (file.startsWith('architect-foundations')) return 'architect-foundations';
  if (file.startsWith('architect-professional')) return 'architect-professional';
  if (file.startsWith('developer-foundations')) return 'developer-foundations';
  return file;
}

// Load every partial, then spread each DECK as one population.
const byDeck = new Map();
const loaded = [];
for (const f of files) {
  const path = join(PARTIALS, f);
  const qs = JSON.parse(readFileSync(path, 'utf8'));
  loaded.push({ f, path, qs });
  const key = deckOf(f);
  if (!byDeck.has(key)) byDeck.set(key, []);
  byDeck.get(key).push(...qs);
}

const beforeByDeck = new Map();
for (const [deck, qs] of byDeck) {
  beforeByDeck.set(
    deck,
    qs.filter((q) => q.type === 'single').map((q) => q.options.findIndex((o) => o.isCorrect)),
  );
}
let totalMoved = 0;
for (const qs of byDeck.values()) totalMoved += spread(qs);

const dist = (arr) => {
  const c = {};
  for (const i of arr) c[i] = (c[i] || 0) + 1;
  return Object.keys(c)
    .sort()
    .map((k) => `#${k}:${c[k]}`)
    .join(' ');
};

for (const [deck, qs] of byDeck) {
  const after = qs
    .filter((q) => q.type === 'single')
    .map((q) => q.options.findIndex((o) => o.isCorrect));
  console.log(
    `${deck.padEnd(24)} ${dist(beforeByDeck.get(deck))}  ->  ${dist(after)}`,
  );
}

if (APPLY) {
  for (const { path, qs } of loaded) {
    writeFileSync(path, JSON.stringify(qs, null, 2) + '\n', 'utf8');
  }
}

console.log(
  `\n${APPLY ? 'Applied' : 'Would move'} ${totalMoved} correct-answer positions across ${byDeck.size} decks (${files.length} files).`,
);
if (!APPLY) console.log('Re-run with --apply to write the changes.');
