#!/usr/bin/env node
// Merges content/decks/partials/d*.json into content/decks/architect-foundations.json.
// Run: node scripts/merge-deck.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const partialsDir = join(ROOT, 'content', 'decks', 'partials');
const outPath = join(ROOT, 'content', 'decks', 'architect-foundations.json');

const domains = [
  { id: 'd1', name: 'Agentic Architecture & Orchestration', weight: 27 },
  { id: 'd2', name: 'Tool Design & MCP Integration', weight: 18 },
  { id: 'd3', name: 'Claude Code Configuration & Workflows', weight: 20 },
  { id: 'd4', name: 'Prompt Engineering & Structured Output', weight: 20 },
  { id: 'd5', name: 'Context Management & Reliability', weight: 15 },
];

if (!existsSync(partialsDir)) {
  console.error('No partials directory. Run the content authors first.');
  process.exit(1);
}

const questions = [];
const files = readdirSync(partialsDir).filter((f) => /^d\d\.json$/.test(f)).sort();
for (const f of files) {
  const arr = JSON.parse(readFileSync(join(partialsDir, f), 'utf8'));
  questions.push(...arr);
  console.log(`+ ${f}: ${arr.length}`);
}

// Stable order: domain, then task statement, then id.
questions.sort((a, b) => {
  if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
  const ta = parseFloat(a.taskStatement);
  const tb = parseFloat(b.taskStatement);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
});

// Global id uniqueness check.
const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) {
    console.error(`Duplicate id across partials: ${q.id}`);
    process.exit(1);
  }
  ids.add(q.id);
}

const deck = {
  deckId: 'architect-foundations',
  title: 'Claude Certified Architect — Foundations',
  examCode: 'CCAR-F',
  generatedFrom: [
    'Claude-Certified-Architect-Foundations-Exam-Guide.pdf',
  ],
  disclaimer:
    'Practice questions authored from the official exam guide. These are NOT official exam items.',
  domains,
  questions,
};

writeFileSync(outPath, JSON.stringify(deck, null, 2), 'utf8');
console.log(`\nMerged ${questions.length} questions -> ${outPath}`);
