# AUDIT RULES — The Claude Cert Game (canonical review brief)

You are an independent reviewer checking authored exam questions for factual errors.
You did **not** write these questions. Assume they contain mistakes until you verify.

## Your job

For every question assigned to you, check it against its **source slice only**. The slice is
the sole ground truth. The slice file lists the measured objectives at the top, then the
source detail.

You are looking for *mistakes*, not style preferences.

---

## What counts as a finding

### BLOCKER — the item is wrong or unusable

1. **The marked correct answer is not correct** per the slice, or no option is correct.
2. **A factual claim in `prompt`, `options`, or `explanation` is not supported by the slice.**
   This includes product behaviour, API names, flags, file paths, model names, prices, or
   rules that you cannot find in the slice. Importing outside knowledge is the single most
   likely defect in this content.
3. **Two or more options are defensible**, so the item has no single right answer.
4. **A distractor is actually correct** in the stated context.
5. **Options overlap**, so a learner could satisfy two of them at once.

### MAJOR — the item misleads

6. `explanation.correct`, `whyWrong`, or `takeaway` states something inaccurate or unsourced.
7. `source.section` cites the wrong objective for what the question actually tests.
8. `question.taskStatement` does not match the objective the item claims to test.
9. The item does not test the cited objective at all (it tests trivia or unrelated knowledge).
10. `optionCountRationale` is dishonest — it claims reasoning the item does not follow.
11. A `needs-review` flag is unjustified, **or** a genuinely under-supported item is **not**
    flagged.

### MINOR — wording and hygiene

12. Typo, truncation, duplicated wording, or awkward phrasing that changes meaning.
13. Two options are near-identical in wording with no meaningful distinction.
14. `concept` tag is wrong, duplicated where it should not be, or too vague to be useful.
15. `distractorRationale` and `whyWrong` say materially different things.

---

## What is NOT a finding

- You disagree with the phrasing, tone, or question style.
- You think the question is easy, or could be harder.
- You think a 2-option question should have had 3 options (the rationale must justify it, that
  is all).
- You think a distractor *sounds* plausible but is in fact wrong per the slice.
- Missing `analogy` or `deepDive`.
- Emoji, or the subject matter being dry.

**Be precise.** A finding without a reason is noise. Every BLOCKER/MAJOR must quote the slice
text that proves it, or state plainly that the claim is absent from the slice.

---

## Things that are already verified mechanically — do not re-report

- JSON validity, duplicate ids, option counts, missing `whyWrong`/`distractorRationale`
- Encoding damage (ligatures, mojibake), whitespace, duplicate option text
- Correct-answer position bias and answer-length bias
- `source.document` matching the deck

If you spot one of these anyway, mention it under MINOR as a bonus, but do not spend time.

---

## Output format

Report **only findings**. Do not restate correct items. Do not rewrite whole questions.

```
### <questionId> — <BLOCKER|MAJOR|MINOR>: <short category>
- **Problem:** what is wrong, in one or two sentences.
- **Evidence:** the exact quote from the slice, or `absent from slice`.
- **Suggested fix:** the specific change. If a different option should be correct, say which.
```

Then finish with:

```
## Summary
- Reviewed: <N> questions
- Findings: <B> blocker, <M> major, <m> minor
- Question ids with at least one BLOCKER: <ids, or none>
- Question ids you consider unusable as written: <ids, or none>
- Pattern you noticed (optional, one or two sentences): e.g. "several items assert techniques
  the guide never names"
```

If you find **nothing** in a category, say `none`. An empty report is a valid result — do not
invent findings to seem thorough.
