#!/usr/bin/env node
/**
 * Attach a verbatim quote from the official exam guide to every question.
 *
 * Why: the app should let a learner verify a question is grounded in the source
 * rather than trusting the authoring process. This finds the guide sentence(s)
 * that best match the fact an item tests and stores them as `source.quotes`.
 *
 * The match is mechanical: content-word overlap between the keyed answer plus its
 * explanation, and each candidate sentence/bullet in the guide text. It is a
 * retrieval aid, not a proof - a wrong quote is visible to the reader, which is
 * the point.
 *
 * Deterministic: re-running produces identical output. Run with --apply to write.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PARTIALS = join(ROOT, 'content', 'decks', 'partials');
const SOURCE = join(ROOT, 'content', 'source');
const APPLY = process.argv.includes('--apply');

const LIG = {
  '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl',
  '\u2019': "'", '\u2018': "'", '\u201C': '"', '\u201D': '"',
  '\u2014': ' - ', '\u2013': ' - ', '\u2022': '\n', '\u00A0': ' ', '\u00B7': ' ', '\u2192': ' -> ',
};
const deLig = (s) => {
  let out = '';
  for (const ch of String(s || '')) out += LIG[ch] !== undefined ? LIG[ch] : ch;
  return out;
};

const STOP = new Set(
  'the a an and or of to in for on with that this it is are be as by from at into than then so if not no can may must should will would which who what when where why how you your their its our we they them he she his her does do did done has have had being been but also only more most other some any each both same very just about over under between among such via per'.split(/\s+/),
);
const terms = (s) =>
  deLig(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

const SOURCE_FOR = {
  'architect-foundations': 'Claude-Certified-Architect-Foundations-Exam-Guide.txt',
  'architect-professional': 'Claude-Certified-Architect-Profesional-Exam-Guide.txt',
  'developer-foundations': 'Claude-Certified-Developer-Foundations-Exam-Guide.txt',
};
const deckOf = (f) =>
  f.startsWith('architect-foundations') ? 'architect-foundations'
    : f.startsWith('architect-professional') ? 'architect-professional'
    : f.startsWith('developer-foundations') ? 'developer-foundations' : null;

/** Candidate quote units: bullets and sentences from the guide, headings filtered out. */
function units(txt) {
  let t = deLig(txt).replace(/=====\s*PAGE[^=]*=====/gi, '\n').replace(/\r/g, '');
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const merged = [];
  for (const l of lines) {
    const prev = merged[merged.length - 1];
    if (prev && !/[.:;]$/.test(prev) && !/^[A-Z0-9]/.test(l) && !/^[•-]/.test(l)) {
      merged[merged.length - 1] = prev + ' ' + l;
    } else merged.push(l.replace(/^[•\-]\s*/, ''));
  }
  const out = [];
  for (const p of merged) {
    for (const s of p.split(/(?<=[.:;])\s+(?=[A-Z0-9])/)) {
      const q = s.trim();
      if (q.length < 35) continue;
      if (/\d+(\.\d+)?%/.test(q)) continue; // headings/weights
      if (terms(q).length < 4) continue;
      if (!/[a-z]/.test(q)) continue;
      out.push(q);
    }
  }
  return out;
}

/**
 * Split the guide into per-domain sections keyed by domain number ("1".."8").
 * A domain can appear twice (blueprint summary, then the detailed section); keep
 * the longest. Matching inside the question's own domain prevents a fact that
 * merely shares vocabulary with another domain from being quoted (e.g. a 5.1
 * question matching a 2.2 sentence that also says "guardrails").
 */
function domainSections(txt) {
  const clean = deLig(txt).replace(/=====\s*PAGE[^=]*=====/gi, '\n');
  const re = /^Domain\s+(\d+)\s*:/gm;
  const marks = [];
  let m;
  while ((m = re.exec(clean))) marks.push({ num: m[1], start: m.index });
  const sections = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : clean.length;
    const body = clean.slice(marks[i].start, end);
    if (!sections[marks[i].num] || body.length > sections[marks[i].num].length) sections[marks[i].num] = body;
  }
  return sections;
}

function bestQuotes(question, candidates) {
  const target = new Set(
    terms(
      question.options.find((o) => o.isCorrect).text +
        ' ' +
        (question.explanation?.correct || '') +
        ' ' +
        (question.explanation?.deepDive || ''),
    ),
  );
  const scored = candidates.map((c) => {
    const t = [...new Set(terms(c))];
    const hit = t.filter((w) => target.has(w)).length;
    return { c, score: t.length ? hit / Math.sqrt(t.length) : 0, hit };
  });
  scored.sort((a, b) => b.score - a.score || b.hit - a.hit);
  const nearDup = (c) =>
    picked.some((p) => {
      const a = new Set(terms(p));
      const b = terms(c);
      const inter = b.filter((w) => a.has(w)).length;
      return inter / Math.max(1, Math.min(a.size, b.length)) > 0.6;
    });

  const picked = [];
  const first = scored[0];
  if (!first || first.hit < 2) return picked;
  picked.push(first.c);

  // A second quote only if it is nearly as strong as the first. A weak runner-up
  // is usually an unrelated sentence that shares incidental vocabulary.
  const second = scored.slice(1).find((s) => s.hit >= Math.max(4, first.hit - 1) && s.score >= 0.6 * first.score && !nearDup(s.c));
  if (second) picked.push(second.c);
  return picked;
}

const files = readdirSync(PARTIALS).filter((f) => f.endsWith('.json')).sort();
const cache = {};
let filled = 0, missed = [];

for (const f of files) {
  const deck = deckOf(f);
  if (!deck) continue;
  const path = join(PARTIALS, f);
  const qs = JSON.parse(readFileSync(path, 'utf8'));
  if (!cache[deck]) {
    const txt = readFileSync(join(SOURCE, SOURCE_FOR[deck]), 'utf8');
    const byDomain = domainSections(txt);
    cache[deck] = {
      whole: units(txt),
      byDomain: Object.fromEntries(Object.entries(byDomain).map(([n, body]) => [n, units(body)])),
    };
  }
  let changed = false;
  for (const q of qs) {
    const num = String(q.domain).replace(/^d/, '');
    const scoped = cache[deck].byDomain[num];
    const pool = scoped && scoped.length ? scoped : cache[deck].whole;
    const quotes = bestQuotes(q, pool);
    if (quotes.length) {
      if (JSON.stringify(q.source.quotes) !== JSON.stringify(quotes)) changed = true;
      q.source.quotes = quotes;
      filled++;
    } else {
      missed.push(q.id);
    }
  }
  if (APPLY && changed) writeFileSync(path, JSON.stringify(qs, null, 2) + '\n', 'utf8');
}

console.log(`${APPLY ? 'Wrote' : 'Would write'} quotes for ${filled} question(s).`);
if (missed.length) console.log(`No confident quote for ${missed.length}: ${missed.join(', ')}`);
