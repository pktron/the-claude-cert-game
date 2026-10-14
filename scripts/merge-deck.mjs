#!/usr/bin/env node
// Merges content/decks/partials/<deckId>-d<N>.json into content/decks/<deckId>.json
// for every deck that has authored partials. Run: node scripts/merge-deck.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const partialsDir = join(ROOT, 'content', 'decks', 'partials');
const decksDir = join(ROOT, 'content', 'decks');
const manifestPath = join(decksDir, 'manifest.json');

if (!existsSync(partialsDir)) {
  console.error('No partials directory. Run the content authors first.');
  process.exit(1);
}
if (!existsSync(manifestPath)) {
  console.error('No manifest.json. Run: python scripts/slice_sources.py');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const byDeck = new Map(manifest.decks.map((d) => [d.deckId, d]));

const files = readdirSync(partialsDir).filter((f) => f.endsWith('.json')).sort();

// Group partials by deck.
const groups = new Map();
for (const f of files) {
  const deckId = f.replace(/\.json$/, '').replace(/-d\d+$/, '');
  if (!groups.has(deckId)) groups.set(deckId, []);
  groups.get(deckId).push(join(partialsDir, f));
}

let anyMerged = false;

for (const [deckId, paths] of groups) {
  const meta = byDeck.get(deckId);
  if (!meta) {
    console.error(`SKIP unknown deck "${deckId}" (not in manifest.json)`);
    continue;
  }

  const questions = [];
  const seenIds = new Set();
  for (const p of paths) {
    const arr = JSON.parse(readFileSync(p, 'utf8'));
    for (const q of arr) {
      if (seenIds.has(q.id)) {
        console.error(`Duplicate id ${q.id} in ${deckId}`);
        process.exit(1);
      }
      seenIds.add(q.id);
      questions.push(q);
    }
    console.log(`  + ${p.split(/[\\/]/).pop()}: ${arr.length}`);
  }

  // Stable order: domain, then objective, then id.
  questions.sort((a, b) => {
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
    const ta = parseFloat(a.taskStatement);
    const tb = parseFloat(b.taskStatement);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const deck = {
    deckId,
    title: meta.title,
    shortName: meta.shortName,
    examCode: meta.examCode,
    generatedFrom: [meta.source],
    disclaimer:
      'Practice questions authored from the official exam guide. These are NOT official exam items.',
    domains: meta.domains.map((d) => ({ id: d.id, name: d.name, weight: d.weight })),
    questions,
  };

  writeFileSync(join(decksDir, `${deckId}.json`), JSON.stringify(deck, null, 2), 'utf8');
  console.log(`Merged ${questions.length} questions -> content/decks/${deckId}.json\n`);
  anyMerged = true;
}

if (!anyMerged) {
  console.log('No partials found to merge.');
  process.exit(1);
}
