# AUTHORING RULES — The Claude Cert Game (canonical brief)

You are authoring certification study questions for **The Claude Cert Game**, a swipe-to-learn
study app for the **Claude Certified Architect - Foundations** exam (CCAR-F).

These rules are the single source of truth. Every content author must follow them exactly so that
questions produced independently still feel like one coherent, rigorous deck.

---

## 0. Ground truth

- Your ONLY source is the exam guide slice you were given
  (`content/source/domain-dN.md`, extracted verbatim from
  `Claude-Certified-Architect-Foundations-Exam-Guide.pdf`).
- Every factual claim in `prompt`, `options`, and `explanation` must be supported by that slice.
- **Never invent** certification requirements, flags, API names, file paths, or product features.
- If the slice is ambiguous, silent, or insufficient to support a defensible correct answer, either
  write a different question or mark `"reviewStatus": "needs-review"` and say what is missing in the
  rationale. **Never present speculation as authoritative.**
- These are PRACTICE questions authored from the guide. They are NOT official exam items. Do not
  claim or imply otherwise anywhere in the text.

## 1. Coverage

- Cover **every Task Statement** in your domain at least once (the validator checks coverage).
- Target volume per domain (see your assignment). Prefer 2-4 items per task statement, weighted
  toward task statements that carry the domain's exam weight.
- Mix item kinds:
  - **Conceptual** — "What is X / What does X do?"
  - **Distinguishing similar concepts** — two related terms that are easy to mix up.
  - **Scenario/application** — the guide's six scenarios
    (`customer-support`, `code-gen`, `multi-agent-research`, `dev-productivity`, `cicd`,
    `data-extraction`). Prefer these; the real exam is scenario-based.
  - **Best-choice under constraints** — "given X, which option is best and why?"
- At least a few items should test a **misconception** the guide explicitly names
  (e.g. sentiment-based escalation, self-reported confidence, larger context windows solving
  attention problems, batch results being unordered).

## 2. Adaptive option count (2, 3, or 4)

Choose the count per question based on the learning objective:

- **2 options** — simple binary distinctions; introductory concepts; "which of these two".
- **3 options** — the DEFAULT for most questions. Three well-designed options beat four padded
  with weak filler.
- **4 options** — when the extra option tests a meaningful distinction, a common misconception, or
  a realistic architectural alternative.

Rules:
- Never add an option just to reach a fixed number.
- Every incorrect option must earn its place: a plausible misconception, a confusion between
  related concepts, a realistic-but-wrong architectural approach, or (occasionally) a memorable
  absurd distractor.
- Avoid options that are obviously ridiculous; humor may aid recall but must not replace rigor.
- Record the decision in `optionCountRationale` (one or two sentences on why this count fits).

## 3. No answer-revealing tells

The app randomizes answer-to-swipe-direction mapping at runtime, but the authored array must
still not leak the answer:

- Do NOT make the correct option consistently the longest, shortest, first, or last in the array.
- Do NOT use hedging words ("might", "could be", "sometimes") only in distractors — that is a tell.
- Keep option lengths and syntactic form comparable.
- Randomize the position of the correct option across your items.
- The validator flags systematic length/position bias; fix flagged items.

## 4. Explanations and feedback

`explanation` must contain:
- `correct` — a concise, direct explanation of why the correct answer is right.
- `whyWrong[id]` — for EACH incorrect option, explain the misconception (never just "incorrect").
- `takeaway` — exactly one memorable key sentence.
- `analogy` (optional) — a concrete analogy or practical example when it genuinely aids recall.
- `deepDive` (optional) — extra depth for the expandable "more" section.

`distractorRationale[id]` states the *learning purpose* of each distractor: what misconception or
confusion it probes. This is separate from `whyWrong` (which explains the error itself).

## 5. Multiple-response items (Challenge mode only)

- Use `type:"multiple"`, `mode:"challenge"`, with 2 or 3 correct options.
- The prompt must make clear that **more than one answer is correct** (e.g. "Select all that apply").
- Each incorrect option must still be genuinely wrong in the stated context.

## 6. Output format

Write a single JSON file: an array of Question objects (see `content/schema/README.md`) matching your
assigned partial path. The file must be valid JSON (no comments, no trailing commas).

- `id`: `"<domainId>-<taskStatement>-<seq>"`, e.g. `"d1-1-001"` (task statement without the dot, zero-padded 3-digit sequence, globally unique within the domain).
- `concept`: reusable kebab-case tag (e.g. `"agentic-loop-stop-reason"`). Reuse the SAME tag across
  items that test the same underlying concept so spaced repetition can vary them.
- Keep option text concise (a card, not a paragraph): typically under ~140 characters.

## 7. Style

- Clear, professional, technically precise. Plain English, no marketing tone.
- The app shows one question per card; keep prompts focused and scannable.
- Emoji are allowed sparingly in the guide's own examples but are not required.

## 8. Self-check before you finish

For every question, confirm:
- [ ] A defensible correct answer exists in the source slice.
- [ ] Every distractor is genuinely incorrect in the stated context.
- [ ] Options are distinct and non-overlapping.
- [ ] Option count (2/3/4) suits the learning objective, and is justified.
- [ ] Correct answer is not inferable from length, wording, or array position.
- [ ] `correct`, `whyWrong`, `takeaway`, `optionCountRationale`, and `distractorRationale` are all filled with meaningful text.
- [ ] `source.section` names the real task statement.
- [ ] Unsupported content is marked `needs-review`, not invented.

Report back: the file path you wrote, the item count, the per-task-statement breakdown, and any
item you flagged `needs-review` with the reason.
