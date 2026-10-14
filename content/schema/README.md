# Question Bank Schema — The Claude Cert Game

A deck is a JSON object. A question is embedded in `questions`.

```jsonc
{
  "deckId": "architect-foundations",
  "title": "Claude Certified Architect - Foundations",
  "examCode": "CCAR-F",
  "domains": [
    { "id": "d1", "name": "Agentic Architecture & Orchestration", "weight": 27 }
  ],
  "questions": [ /* Question[] */ ]
}
```

## Question

```jsonc
{
  "id": "d1-1-001",                  // "<domainId>-<taskStatementNumber>-<seq>"
  "domain": "d1",
  "taskStatement": "1.1",
  "scenario": "customer-support",    // optional scenario slug (see below) or null
  "concept": "agentic-loop-stop-reason",  // kebab-case concept tag, reused across items
  "mode": "swipe",                   // "swipe" | "challenge"
  "type": "single",                  // "single" | "multiple" (multiple only allowed in challenge)
  "prompt": "....?",
  "options": [                       // 2..4, distinct; for single exactly one isCorrect:true
    { "id": "a", "text": "...", "isCorrect": true }
  ],
  "correctCount": 1,                 // 1 for single; 2..3 for multiple
  "optionCountRationale": "Why 2 vs 3 vs 4 for this learning objective",
  "distractorRationale": {           // required for EVERY incorrect option; why it is wrong + what misconception it probes
    "b": "..."
  },
  "explanation": {
    "correct": "Concise why the correct option is correct",
    "whyWrong": { "b": "..." },      // required for every incorrect option
    "analogy": "optional memorable analogy / practical example",
    "takeaway": "One key sentence to remember",
    "deepDive": "optional expandable extra depth"
  },
  "source": {
    "document": "Claude-Certified-Architect-Foundations-Exam-Guide.pdf",
    "section": "Task Statement 1.1",
    "page": 5                       // optional int
  },
  "reviewStatus": "verified"         // "verified" | "needs-review"
}
```

## Invariants (enforced by `scripts/validate-content.mjs`)

1. `options.length` is 2, 3, or 4.
2. Options are pairwise distinct (case/whitespace-insensitive).
3. `type:"single"` => exactly one option has `isCorrect:true` and `correctCount===1`.
   `type:"multiple"` => 2..3 correct options and `correctCount` matches; `mode` must be `"challenge"`.
4. Every incorrect option id appears in BOTH `distractorRationale` and `explanation.whyWrong`, with non-trivial text.
5. `optionCountRationale` is non-empty (the adaptive-count decision is justified).
6. `explanation.correct` and `explanation.takeaway` are non-empty.
7. `source.document` and `source.section` are non-empty.
8. Answer-revealing heuristics: the correct option must not be systematically longer, must not be the first/last position in the authored array, and `reviewStatus` flags anything suspicious. (Direction/position randomization happens in the app; the authored array order must still not encode correctness.)
9. `id` is unique across the deck.

## Scenario slugs

`customer-support`, `code-gen`, `multi-agent-research`, `dev-productivity`, `cicd`, `data-extraction`, or `null` for conceptual items.
