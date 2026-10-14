# The Claude Cert Game

A swipe-to-learn study app for the **Claude Certified Architect — Foundations** exam (CCAR-F).

Short questions, adaptive 2/3/4 answer options, gestures in four directions, immediate
explanations that address the *misconception*, and spaced repetition that brings back what
you have not seen in a while.

> **Practice material.** Every question is authored from the official Anthropic exam guide
> in this repository. These are study aids, not official exam items.

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

```bash
pnpm verify       # lint + typecheck + unit tests + content validation + build
pnpm test:e2e     # Playwright e2e against the production build
```

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serve `dist/` (mirrors the GitHub Pages layout) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Vitest unit + component tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm validate:content` | Validates the question bank |
| `pnpm extract:pdf` | Re-extract source text from the PDFs |
| `pnpm verify` | Everything CI runs |

## The learning loop

**Swipe & Discover** — one concept per card. Options are assigned to swipe directions at
runtime, re-randomised on every presentation, so the correct answer is never tied to a
direction, a position, or the length of the text. A 2-, 3-, or 4-option question simply uses
2, 3, or 4 of the four directions; the unused direction does nothing.

**Challenge** — certification-style questions including select-all-that-apply. Multiple-response
items are guaranteed to appear in a Challenge session (they are rare in the deck and would
otherwise almost never show up).

**Recall** — Leitner-style spaced repetition (`1 → 3 → 7 → 16 → 35` days). An incorrect answer
returns tomorrow; repeated correct answers widen the gap. Missing a day never erases anything.

### Design rules worth keeping

- **XP is awarded per correctly answered item and is independent of option count**, so changing
  the number of options cannot distort progress or scoring.
- A wrong answer is never a punishment: it explains the misconception and returns sooner.
- Streaks are per-session; a **personal best** is kept and is never reset by time.
- Tap, arrow keys, and gestures all select the same answer. Gestures are never the only input.
- Motion is optional and honours the OS `prefers-reduced-motion` setting.

## Content pipeline

Educational content is fully separated from application logic.

```
content/
  source/                     extracted from the PDFs (gitignored except the guide text)
    Claude-...-Exam-Guide.txt
    domain-d1.md ... d5.md    one slice per exam domain
  decks/
    architect-foundations.json the shipped deck
    partials/                 per-domain drafts (gitignored)
  schema/README.md            the Question schema
  AUTHORING_RULES.md          canonical authoring brief
scripts/
  extract-pdf.ps1             PDFs -> text -> per-domain slices
  validate-content.mjs        schema + quality gate
  merge-deck.mjs              partials -> architect-foundations.json
```

A question records its `domain`, `taskStatement`, `concept`, `prompt`, `options`,
`correctCount`, `optionCountRationale`, a `distractorRationale` for **every** wrong option, a
full `explanation` (correct / why-wrong / analogy / takeaway / deep dive), and its `source`
document and section. The validator enforces the schema, rejects duplicated or mismatched
options, requires a justification for the chosen option count, and flags answer-revealing
tells such as the correct option being systematically longer, first, or last.

Regenerate the source text with:

```bash
pnpm extract:pdf
```

## Architecture

```
src/
  domain/      pure TypeScript, no framework: types, rng, schedule, session,
               scoring, grade, progress, labels  (+ unit tests)
  content/     deck loading
  storage/     versioned localStorage persistence, settings, export/import
  hooks/       useSwipe (pointer events), useReducedMotion
  components/  SwipeCard, OptionRow, FeedbackPanel, BottomNav
  screens/     Home, SessionScreen, Summary, Review, Stats, Settings, ComingSoon
e2e/           Playwright specs
```

All progress lives in the browser's `localStorage`. There is no account, no server, and no
network call. Settings export/import to JSON for backup.

## Accessibility

- Lighthouse accessibility and best-practices score 100
- Every answer is reachable by tap, keyboard, and gesture
- Live-region announcements for feedback, `aria-pressed` on multi-select options
- Reduced-motion and higher-contrast toggles, plus OS-level `prefers-reduced-motion` support
- Verified with real pointer input, not just synthetic click events

## Deployment

`.github/workflows/deploy.yml` runs lint, typecheck, unit tests, content validation, and the
build on every push to `main`, then deploys `dist/` to GitHub Pages.

The build uses `base: './'` and hash routing, so it works from a repository subpath such as
`https://<user>.github.io/claude-cert/` without further configuration, and refreshing any
in-app route will not 404.

## Roadmap

- Architect · Professional (CCAR-P) and Developer · Foundations (CCDV-F) decks, authored the
  same way from their exam guides (shown as "Coming soon" in the app).
