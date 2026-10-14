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

const DOMAIN_TASK_COUNT = { d1: 7, d2: 5, d3: 6, d4: 6, d5: 6 };

function gatherPaths() {
  if (args.length) return args;
  // Validate the shipped deck when it exists; otherwise validate the authored
  // partials (which is what content authors run before merging).
  const merged = join(ROOT, 'content', 'decks', 'architect-foundations.json');
  if (existsSync(merged)) return [merged];
  const partialsDir = join(ROOT, 'content', 'decks', 'partials');
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

function validateQuestion(file, q, seenIds) {
  const where = q?.id ?? '(no id)';
  // id
  if (isBlank(q.id)) err(file, `question missing id`);
  else if (seenIds.has(q.id)) err(file, `duplicate id "${q.id}"`);
  else seenIds.add(q.id);

  // domain / taskStatement
  if (!DOMAIN_TASK_COUNT[q.domain]) err(file, `${where}: invalid domain "${q.domain}"`);
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
  const firstCount = questions.filter((q) => q.type === 'single' && q.options?.find((o) => o.isCorrect)?.id === q.options?.[0]?.id).length;
  const lastCount = questions.filter((q) => q.type === 'single' && (() => { const o = q.options; const i = o.findIndex((x) => x.isCorrect); return i === o.length - 1; })()).length;
  const singles = questions.filter((q) => q.type === 'single').length || 1;
  if (firstCount / singles > 0.4) warn(file, `aggregate: correct answer first in ${firstCount}/${singles} items (>40%)`);
  if (lastCount / singles > 0.4) warn(file, `aggregate: correct answer last in ${lastCount}/${singles} items (>40%)`);
}

function checkCoverage(file, questions) {
  const byDomain = {};
  for (const q of questions) {
    byDomain[q.domain] ??= new Set();
    byDomain[q.domain].add(String(q.taskStatement).replace('.', '-'));
  }
  for (const [dom, expected] of Object.entries(DOMAIN_TASK_COUNT)) {
    if (!byDomain[dom]) { warn(file, `coverage: no items for domain ${dom}`); continue; }
    for (let i = 1; i <= expected; i++) {
      const ts = `${dom.split('')[1]}-${i}`;
      if (!byDomain[dom].has(ts)) warn(file, `coverage: domain ${dom} missing task statement ${i}`);
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
  for (const q of questions) validateQuestion(f, q, seenIds);
  checkAggregateBias(f, questions);
  checkCoverage(f, questions);
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
