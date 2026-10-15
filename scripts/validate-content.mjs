#!/usr/bin/env node
// Validates a deck (or partials) against the question schema and quality invariants.
// Usage: node scripts/validate-content.mjs [path ...]
// Defaults to content/decks/partials/*.json + content/decks/architect-foundations.json
// Exit code 1 on any error. Warnings are printed but do not fail unless --strict.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const STRICT = process.argv.includes('--strict');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/**
 * Coverage expectations come from content/decks/manifest.json, which is
 * generated from the exam guides. That keeps a single source of truth for
 * domains, weights, and the objectives each domain is measured against.
 */
function loadExpectations() {
  const manifestPath = join(ROOT, 'content', 'decks', 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const byDeck = new Map();
    for (const deck of manifest.decks ?? []) {
      byDeck.set(deck.deckId, {
        source: deck.source,
        domains: (deck.domains ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          objectives: (d.objectives ?? []).map((o) => o.id),
        })),
      });
    }
    return byDeck;
  } catch (e) {
    console.log(`WARN could not read manifest.json: ${e.message}`);
    return null;
  }
}

const EXPECTATIONS = loadExpectations();

function deckIdFromFile(file) {
  let id = basename(file).replace(/\.json$/, '');
  // Partials are named "<deckId>-d<N>.json"; map them back to their deck.
  id = id.replace(/-d\d+$/, '');
  return id.replace(/\.partial$/, '');
}

function gatherPaths() {
  if (args.length) return args;
  // Validate the shipped decks when they exist; otherwise validate the authored
  // partials (which is what content authors run before merging).
  const decksDir = join(ROOT, 'content', 'decks');
  const shipped = existsSync(decksDir)
    ? readdirSync(decksDir)
        .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
        .map((f) => join(decksDir, f))
    : [];
  if (shipped.length) return shipped;
  const partialsDir = join(decksDir, 'partials');
  if (existsSync(partialsDir)) {
    return readdirSync(partialsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => join(partialsDir, f));
  }
  return [];
}

const errors = [];
const warnings = [];
const allQuestions = [];

function err(file, msg) { errors.push(`[${basename(file)}] ${msg}`); }
function warn(file, msg) { warnings.push(`[${basename(file)}] ${msg}`); }
const isBlank = (s) => typeof s !== 'string' || s.trim().length === 0;

function validateQuestion(file, q, seenIds, deck) {
  const where = q?.id ?? '(no id)';
  // id
  if (isBlank(q.id)) err(file, `question missing id`);
  else if (seenIds.has(q.id)) err(file, `duplicate id "${q.id}"`);
  else seenIds.add(q.id);

  // domain / taskStatement
  const known = deck?.domains.find((d) => d.id === q.domain);
  if (deck) {
    if (!known) {
      err(file, `${where}: domain "${q.domain}" is not a domain of ${deckIdFromFile(file)}`);
    } else if (q.taskStatement && !known.objectives.includes(String(q.taskStatement))) {
      warn(
        file,
        `${where}: taskStatement "${q.taskStatement}" is not listed for domain ${q.domain} in the manifest`,
      );
    }
  }
  if (isBlank(q.taskStatement)) err(file, `${where}: missing taskStatement`);

  // mode / type
  if (!['swipe', 'challenge'].includes(q.mode)) err(file, `${where}: invalid mode "${q.mode}"`);
  if (!['single', 'multiple'].includes(q.type)) err(file, `${where}: invalid type "${q.type}"`);
  if (q.type === 'multiple' && q.mode !== 'challenge')
    err(file, `${where}: multiple-response must be mode "challenge"`);

  // prompt / concept
  if (isBlank(q.prompt)) err(file, `${where}: missing prompt`);
  if (isBlank(q.concept)) err(file, `${where}: missing concept`);

  // options
  const opts = Array.isArray(q.options) ? q.options : [];
  if (![2, 3, 4].includes(opts.length))
    err(file, `${where}: must have 2-4 options, got ${opts.length}`);
  opts.forEach((o) => {
    if (isBlank(o?.id)) err(file, `${where}: option missing id`);
    if (isBlank(o?.text)) err(file, `${where}: option "${o?.id}" missing text`);
    if (typeof o?.isCorrect !== 'boolean') err(file, `${where}: option "${o?.id}" missing boolean isCorrect`);
  });
  const ids = opts.map((o) => o.id);
  if (new Set(ids).size !== ids.length) err(file, `${where}: duplicate option ids`);
  const norm = opts.map((o) => (o.text || '').trim().toLowerCase());
  if (new Set(norm).size !== norm.length) err(file, `${where}: duplicate option text`);

  // correctness counts
  const correct = opts.filter((o) => o.isCorrect);
  if (q.type === 'single') {
    if (correct.length !== 1) err(file, `${where}: single must have exactly 1 correct, got ${correct.length}`);
    if (q.correctCount !== 1) err(file, `${where}: single correctCount must be 1, got ${q.correctCount}`);
  } else if (q.type === 'multiple') {
    if (correct.length < 2 || correct.length > 3)
      err(file, `${where}: multiple must have 2-3 correct, got ${correct.length}`);
    if (q.correctCount !== correct.length)
      err(file, `${where}: correctCount (${q.correctCount}) != actual correct (${correct.length})`);
  }

  // option count rationale
  if (isBlank(q.optionCountRationale)) err(file, `${where}: missing optionCountRationale`);

  // distractorRationale + whyWrong for every incorrect option
  for (const o of opts.filter((x) => !x.isCorrect)) {
    const dr = q.distractorRationale?.[o.id];
    const ww = q.explanation?.whyWrong?.[o.id];
    if (isBlank(dr)) err(file, `${where}: distractorRationale missing for "${o.id}"`);
    else if (dr.trim().length < 15) warn(file, `${where}: distractorRationale for "${o.id}" is very short`);
    if (isBlank(ww)) err(file, `${where}: explanation.whyWrong missing for "${o.id}"`);
    else if (ww.trim().length < 15) warn(file, `${where}: whyWrong for "${o.id}" is very short`);
  }

  // explanation core
  if (isBlank(q.explanation?.correct)) err(file, `${where}: explanation.correct missing`);
  if (isBlank(q.explanation?.takeaway)) err(file, `${where}: explanation.takeaway missing`);

  // source
  if (isBlank(q.source?.document)) err(file, `${where}: source.document missing`);
  if (isBlank(q.source?.section)) err(file, `${where}: source.section missing`);

  // reviewStatus
  if (!['verified', 'needs-review'].includes(q.reviewStatus))
    err(file, `${where}: reviewStatus must be verified|needs-review`);

  // ---- answer-revealing heuristics (warnings; per-file aggregate below) ----
  if (correct.length === 1) {
    const c = correct[0];
    const cLen = (c.text || '').length;
    const others = opts.filter((o) => !o.isCorrect).map((o) => (o.text || '').length);
    const avgOther = others.reduce((a, b) => a + b, 0) / (others.length || 1);
    if (cLen > avgOther * 1.5 + 10)
      warn(file, `${where}: correct option notably longer than distractors (possible length tell)`);
    if (cLen < avgOther * 0.6)
      warn(file, `${where}: correct option notably shorter than distractors (possible length tell)`);
    const pos = opts.findIndex((o) => o.id === c.id);
    if (pos === 0) warn(file, `${where}: correct option is first in array (position tell risk)`);
    if (pos === opts.length - 1) warn(file, `${where}: correct option is last in array (position tell risk)`);
  }
}

// cross-question position/length bias (aggregate within a file)
function checkAggregateBias(file, questions) {
  const singles = questions.filter((q) => q.type === 'single');
  if (!singles.length) return;
  const n = singles.length;

  // Distribution of the correct answer across array positions. A key that piles up
  // on one position is a pattern a learner could learn.
  //
  // The expected count per index is NOT n/nPositions: a 2-option item can only
  // ever key index 0 or 1. Each item contributes 1/options.length of probability
  // to each index it can reach, so expected[i] is summed per item. Comparing a
  // flat count against 50% made this gate blind to exactly the case it exists to
  // catch - CCDV-F is 13 two-option items, so index 0 was legitimately common.
  const perIndex = {};
  const expected = {};
  let longer = 0;
  for (const q of singles) {
    const nOpts = q.options.length;
    const i = q.options.findIndex((o) => o.isCorrect);
    perIndex[i] = (perIndex[i] || 0) + 1;
    const share = 1 / nOpts;
    for (let k = 0; k < nOpts; k++) expected[k] = (expected[k] || 0) + share;
    const c = q.options[i].text.length;
    const avg = q.options
      .filter((o) => !o.isCorrect)
      .reduce((a, o) => a + o.text.length, 0) / Math.max(1, q.options.length - 1);
    if (c > avg * 1.5 + 10 || c < avg * 0.6) longer += 1;
  }
  for (const [idx, count] of Object.entries(perIndex)) {
    const exp = expected[idx] || 1;
    const ratio = count / exp;
    // Needs enough items for the distribution to mean anything; below ~10 items a
    // large deviation is reachable by chance alone.
    if (n >= 10 && (ratio > 1.5 || ratio < 0.6)) {
      warn(
        file,
        `aggregate: the correct answer sits at index ${idx} in ${count}/${n} single-answer items, against an expected ${exp.toFixed(1)} (${ratio.toFixed(2)}x). Keys should be spread across positions.`,
      );
    }
  }
  if (longer / n > 0.3) {
    warn(file, `aggregate: ${longer}/${n} single-answer items have a correct option notably longer or shorter than its distractors.`);
  }
}

function checkCoverage(file, questions, deck) {
  if (!deck) return;
  const byDomain = new Map();
  for (const q of questions) {
    if (!byDomain.has(q.domain)) byDomain.set(q.domain, new Set());
    byDomain.get(q.domain).add(String(q.taskStatement));
  }
  for (const d of deck.domains) {
    const seen = byDomain.get(d.id) ?? new Set();
    if (seen.size === 0) {
      warn(file, `coverage: no items for domain ${d.id} (${d.name})`);
      continue;
    }
    for (const obj of d.objectives) {
      if (!seen.has(obj)) warn(file, `coverage: domain ${d.id} missing objective ${obj}`);
    }
  }
}

const seenIds = new Set();
const files = gatherPaths();
if (files.length === 0) {
  console.log('No deck files found. Nothing to validate.');
  process.exit(0);
}

for (const f of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    err(f, `invalid JSON: ${e.message}`);
    continue;
  }
  const questions = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(questions)) { err(f, 'expected an array or an object with a "questions" array'); continue; }
  const deck = EXPECTATIONS?.get(deckIdFromFile(f)) ?? null;
  for (const q of questions) validateQuestion(f, q, seenIds, deck);
  checkAggregateBias(f, questions);
  checkCoverage(f, questions, deck);
  allQuestions.push(...questions);
}

// cross-file duplicate concept/id sanity is handled by global seenIds above.

console.log(`Validated ${files.length} file(s), ${allQuestions.length} question(s).`);
if (warnings.length) {
  console.log(`\n--- ${warnings.length} warning(s) ---`);
  for (const w of warnings) console.log('WARN ' + w);
}
if (errors.length) {
  console.log(`\n--- ${errors.length} error(s) ---`);
  for (const e of errors) console.log('ERR  ' + e);
  process.exit(1);
}
if (warnings.length && STRICT) process.exit(1);
console.log('\nOK: content valid.');
