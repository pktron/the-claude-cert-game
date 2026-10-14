# AUDIT FINDINGS — round 1

Independent review of all 251 questions against their source slices. "the slice" always means
`content/source/<deck-slug>-d<N>.md`, the sole ground truth for that item.

Totals: **12 blocker, ~40 major, ~45 minor.** No invented product behaviour was found in CCAR-F;
the concentration of problems is in the two thin-source decks and in authored rationale text that
contradicts the item it annotates.

## Recurring defect patterns (fix these everywhere, not just where cited)

1. **`optionCountRationale` describes a different item than was authored.** Most common defect.
   Several say "Three options is enough because..." on items that ship four. Always recount the
   shipped options and rewrite the rationale to match reality.
2. **"Correct by absence."** An item whose keyed answer is "the guide does not state X" tests the
   guide's brevity, not the objective, and cannot discriminate when several distractors are
   equally real. Replace with a positive item grounded in what the slice *does* say.
3. **Explanations reaching outside the slice for grounding.** Citing another domain's objectives,
   quoting a "guide sample item" or "answer key", or asserting prompt-caching / sampling mechanics
   that the slice names only as a bare word.
4. **"the slice" leaking into learner-facing text.** `whyWrong` and `explanation.correct` must
   never address the reader as if they had seen the authoring source. Say "objective N.M" or
   "the guide" instead.
5. **Item filed under the wrong objective.** `taskStatement` and `source.section` must match what
   the item actually tests.

---

## content/decks/partials/architect-foundations-d1.json

### d1-3-013 — MAJOR: item tests the source's silence, not objective 1.3
- Problem: key is "the guide is silent on nesting". Unguessable without knowing the guide declines
  to answer; a candidate guessing among three options has a 1-in-3 chance with zero relevant knowledge.
- Evidence: 1.3's Knowledge bullets cover the Task tool / `allowedTools` requirement, explicit context
  passing, AgentDefinition contents, and fork-based session management. Nested delegation is **absent from slice**.
- Fix: replace with an item on what 1.3 does state — e.g. what an AgentDefinition carries
  (descriptions, system prompt, tool restrictions), or that fork-based session management appears
  under 1.3 as the way to explore divergent approaches from a shared baseline. The existing
  `needs-review` flag is justified and should go with the replaced item.

### d1-7-022 — MAJOR: distractor is a practice the slice names; refutation is unsourced
- Problem: option c ("Resume the original session and append a note that some files were modified")
  is marked wrong, but informing a resumed session about file changes is an explicitly named 1.7
  skill, so c is defensible. The refutation ("stale tool results remain in context") is a claim
  about model behaviour the slice never makes.
- Evidence: slice names both "The importance of informing the agent about changes to previously
  analyzed files when resuming sessions" and "Informing a resumed session about specific file
  changes for targeted re-analysis rather than requiring full re-exploration". The only stated
  contrast is "starting a new session with a structured summary is more reliable than resuming
  with stale tool results". The stale-context mechanism is **absent from slice**.
- Fix: replace option c with one the slice clearly rules out — e.g. "Treat the resumed session's
  stored tool results as the authoritative record of what the code did at the time" — and strip
  the context-mechanism claim from `whyWrong.c`, keeping only the slice's decision rule.

### d1-5-018 — MINOR: prompt misstates the slice's example formats
- Problem: prompt frames all three heterogeneous formats as timestamp encodings.
- Evidence: slice says "normalize heterogeneous data formats (Unix timestamps, ISO 8601, numeric
  status codes)". The third is a status code, not a timestamp encoding.
- Fix: rephrase, e.g. "Three MCP tools return timestamps as Unix seconds and ISO 8601, plus
  numeric status codes for state." `explanation.correct` is already correct.

---

## content/decks/partials/architect-foundations-d3.json

### d3-2-002 — BLOCKER: two defensible options
- Problem: the skill "analyses the codebase and prints a long report" — no required parameters, no
  destructive action — so nothing makes `argument-hint` mandatory and nothing forbids omitting
  `allowed-tools`. Both option a (fork only) and option c (fork + argument-hint) are permitted.
  The item's own `deepDive` asserts "A well-configured skill combines all three", which the slice
  does not state and which option c does not even follow.
- Evidence: slice states only the general purposes of the three frontmatter fields, including
  "argument-hint frontmatter to prompt developers for required parameters when they invoke the
  skill without arguments" and "allowed-tools in skill frontmatter to restrict tool access ... to
  prevent destructive actions". Nowhere does it require a given skill to set all three.
- Fix: rewrite the scenario so both correct capabilities are forced (the skill takes a required
  directory argument **and** is permitted to write files), or drop option a. If option a is kept
  it must be made actually wrong by the slice.

### d3-4-002 — MAJOR: `whyWrong.d` contradicts the slice's description of Explore
- Problem: the rebuttal rests on "Delivering that output back into the main session does not
  preserve context" — but returning summarised output to the main conversation is exactly what the
  slice credits the Explore subagent with.
- Evidence: "The Explore subagent for isolating verbose discovery output and returning summaries to
  preserve main conversation context". The sound distinction available is fork's stated purpose:
  "running skills in an isolated sub-agent context, preventing skill outputs from polluting the main conversation".
- Fix: rewrite `whyWrong.d` to argue only from fork's stated purpose.

---

## content/decks/partials/architect-foundations-d4.json

### d4-3-004 — MINOR: garbled sentence in `explanation.correct`
- Problem: splices two bullet fragments into ungrammatical text: 'enum fields with "other" plus a
  detail string patterns'.
- Evidence: slice bullets read 'enum fields with "other" + detail string patterns for extensible
  categories' and 'enum values like "unclear" for ambiguous cases and "other" + detail fields'.
- Fix: "The guide calls for enum fields with 'other' plus a detail string for extensible
  categories, and enum values like 'unclear' for ambiguous cases, so the schema absorbs
  categories you did not anticipate."

---

## content/decks/partials/architect-foundations-d5.json

### d5-5-002 — MAJOR: `distractorRationale.a` contradicts the slice and the item's own key
- Problem: the rationale says the low-confidence band "is exactly the band the guide says must be
  sampled". The guide says the **high-confidence** band. `whyWrong.a` is correct, so rationale and
  explanation also disagree.
- Evidence: "Stratified random sampling for measuring error rates in **high-confidence extractions**".
- Fix: "Probes the belief that errors concentrate at the low-confidence end — the guide's point is
  that the trusted, rarely-inspected high-confidence band is where undetected errors hide."

### d5-2-001 — MINOR: distractor rejection relies on wording the option does not supply
- Problem: option b ("The case has several steps, even though policy clearly covers the request") is
  rejected because "clear policy plus a capable agent means resolve autonomously", but the slice
  conditions resolving on the issue being **straightforward**, and several steps does not establish that.
- Evidence: "escalating immediately when a customer explicitly demands it versus offering to resolve when the issue is straightforward".
- Fix: tighten option b, e.g. "The case is complex, but policy clearly covers the request and the agent can complete it."

---

## content/decks/partials/architect-professional-d1.json

### p1-2-003 — MAJOR: correct only by absence; item tests the guide's terseness, not 1.2
- Problem: prompt asks "how much is stated about the feedback loops"; only option b can be right
  because a and c are inventions. `deepDive` compounds this by calling the slice "deliberately terse",
  an unsourced claim about the guide's design intent.
- Evidence: the full 1.2 line is `Design end-to-end architectures (input → processing → output → feedback loops)`.
- Fix: replace with a positive 1.2 item — e.g. which stages bound the flow (input and feedback loops),
  or what "end-to-end" adds over a single call. Drop the "deliberately terse" framing.

---

## content/decks/partials/architect-professional-d2.json

### p2-2-012 — BLOCKER: explanation invents source provenance
- Problem: `explanation.correct` and `deepDive` assert the guide contains a Domain 2 sample item with
  an answer key plus a "Section 8" stating this rationale, and that "the other three options are the
  plausible alternatives the rationale explicitly rules out". None of that exists in the slice.
- Evidence: **absent from slice**. The whole slice is `•Implement prompt reuse strategies (caching, modular prompts, Skills)`.
- Fix: delete the sample-item / answer-key / Section 8 framing entirely. Ground the item on 2.5's
  parenthetical only, and state plainly that prefix-ordering behaviour is standard prompt-caching
  practice rather than guide text.

### p2-2-012 — MAJOR: caching mechanics asserted as guide content while marked `verified`
- Problem: option a and the `takeaway` ("lowers cost and time-to-first-token together") assert prefix
  ordering, prefix reuse and TTFT effects that 2.5 does not state — it names `caching` as one word.
- Fix: set `reviewStatus: "needs-review"` with a note that the slice names caching without defining
  prefix reuse, prefix ordering, or TTFT effects; move the TTFT claim out of `takeaway`.

### p2-2-013 — MAJOR: unsourced caching prefix semantics in a `verified` item
- Problem: option b ("Prompt caching, which reuses a repeated prefix across requests") and
  `whyWrong.b` build the modular-vs-caching distinction on prefix semantics the slice never states,
  and assert a product mechanism (caching "leaves the prompt content duplicated").
- Fix: flag `needs-review`, or reword the caching option so it is wrong on the slice's own terms
  (a reuse strategy the team does not maintain by hand) rather than on prefix mechanics.

### p2-2-011 — MAJOR: `whyWrong.a` cites objective numbers absent from the slice
- Problem: says "Chunking and indexing belong to 3.5 and retrieval to 3.6". The slice covers Domain 2
  only; 3.5 and 3.6 appear nowhere, so the learner is taught the guide's structure as fact.
- Fix: "Chunking, indexing, and retrieval tuning are not named in 2.5's reuse list."

### p2-2-006 — MAJOR: unsourced cross-domain attribution in `whyWrong`
- Problem: claims "Retrieval is a pipeline concern (Domain 3) and fine-tuning is a model concern".
  The slice supports neither the Domain 3 attribution nor fine-tuning as a topic. Item is `verified`.
- Evidence: 2.3 reads only `Apply prompt engineering techniques (zero-shot, few-shot, chain-of-thought)`.
- Fix: "Only few-shot appears alongside them; the objective names zero-shot, few-shot and
  chain-of-thought and nothing else."

### p2-2-004 — MAJOR: unsourced Domain 3 claim in `whyWrong` and `optionCountRationale`
- Problem: `whyWrong.b` asserts "chunking and retrieval belong to Domain 3"; the rationale says the
  distractors borrow sets "named elsewhere in Domain 2 and Domain 3".
- Fix: "Model choice is 2.1's, and 2.2 names only system prompts, templates and guardrails."
  Also recount the options in the rationale (pattern 1).

### p2-2-003 — MINOR: prompt asks for a named model, no option names one
- Problem: "which specific Claude model should an architect select" cannot be answered as posed; the
  keyed option is a description, not a model.
- Fix: reword to "Which basis for model selection does objective 2.1 give?" The `needs-review`
  flag itself is justified and should stay.

---

## content/decks/partials/architect-professional-d3.json

### p3-3-008 — BLOCKER: distractor defensible; `takeaway` describes an option that does not exist
- Problem: the item asserts monitoring "at scale" must preserve per-run detail, so "aggregate totals
  only" is wrong. The slice names no signals, granularity or cardinality policy; aggregate metrics
  are a legitimate strategy at scale, and the item's own `distractorRationale.b` concedes a real
  rationale for it. Separately the `takeaway` ("has to keep both") describes an answer absent from
  the option set (a is per-run only, b is aggregate only).
- Evidence: `•Analyze observability challenges and select monitoring strategies at scale` — no
  mention of traces, per-run attribution, aggregates or cardinality.
- Fix: replace option b with one the slice excludes (e.g. "stop logging entirely once volume is
  stable"), and make the takeaway match an option that exists.

### p3-3-001 — MAJOR: unsourced appeal to a "Domain 3 sample item" and "least-privilege rationale"
- Problem: `optionCountRationale` and `deepDive` assert what "the guide's own rationale" and "its
  Domain 3 sample item" say. The slice has one bullet; the phrase "least privilege" does not appear.
- Fix: remove the appeals to a guide sample; state the role-fit framing as an inference
  ("reading 'bloat' as unrequired capability") rather than as guide text.

### p3-3-002 — MAJOR: same unsourced appeal, plus two contradictory section references
- Problem: `deepDive` cites "Section 3 sample item"; `reviewNote` cites "Section 8 sample". Neither
  exists in the slice, and the two references contradict each other.
- Fix: drop both or name one consistently.

### p3-3-011 — MAJOR: `deepDive` asserts guide content the slice does not contain
- Problem: claims "The guide illustrates the symptom elsewhere: confident-but-wrong answers after a
  refresh, with model and latency unchanged".
- Fix: delete the sentence; the objective-attribution argument stands on the slice alone.

### p3-3-014 — MAJOR: item tests the blueprint's silence rather than objective 3.7
- Problem: prompt asks "What does the CCAR-P blueprint tell you?" and the key is a statement of
  absence. "Evaluate connection protocols and select the appropriate integration mechanism" is
  never tested. (Pattern 2.)
- Fix: reframe as "Objective 3.7 names three mechanisms. Which of the following is one of them?"
  with the three named mechanisms as the load-bearing content.

### p3-3-016 — MAJOR: option b (2.4) is defensible; the explanation concedes the overlap
- Problem: "Preloading every tool's documentation into the system prompt versus loading it only when
  needed" is 3.8's literal contrast, but 2.4 ("Optimize context windows and manage token usage")
  covers the same decision, and `whyWrong.b` openly says "It overlaps in concern" while ruling it out.
- Evidence: d3 `•Evaluate progressive discovery vs. monolithic context strategy`; d2 `•Optimize context windows and manage token usage`.
- Fix: sharpen the scenario so 2.4 is unavailable (e.g. the token budget is fixed and irrelevant; the
  disagreement is whether the agent can discover capabilities at all), or replace option b.

### p3-3-004 — MINOR: prompt says identity check, correct option is worded as authorization
- Fix: "The endpoint performs no authentication or authorization of its own, so network reachability is treated as trust."

### p3-3-009 — MINOR: `optionCountRationale` miscounts the distractors ("three" for two)
- Fix: change to "the two distractors".

### p3-3-010 — MINOR: option a is a defensible chunking constraint
- Fix: replace option a with something the slice excludes (e.g. "A chunk size chosen by the number of users hitting the index").

### p3-3-012 — MINOR: attribution of "index refresh cadence" to 3.5 is unsourced
- Fix: narrow to "chunk size and indexing, which 3.5 names" and drop refresh cadence.

### p3-3-013 — MINOR: `whyWrong.a` mischaracterises GraphQL/gRPC as HTTP variants
- Fix: "REST, GraphQL, and gRPC are wire-level API styles; the objective names its three mechanisms explicitly in parentheses."

### p3-3-015 — MINOR: `whyWrong.c` asserts index-type vocabulary the slice never uses
- Fix: "indexing choices concern the store 3.5 builds, not how much context arrives — that is 3.8."

---

## content/decks/partials/architect-professional-d4.json

### p4-4.2-003 — BLOCKER: key names a specific trio of methodologies absent from the slice
- Problem: option c asserts 4.2 asks for "Human judgment, automated scoring, and production A/B test
  results". The slice says only "mixed methodologies", enumerates nothing, and does not place
  production A/B data in 4.2 (4.3 owns A/B testing). Only "more than one method" is grounded, and
  no option expresses it.
- Evidence: `•Design evaluation datasets and test frameworks using mixed methodologies`.
- Fix: rewrite option c as "More than one evaluation method, combined in a single framework"; make
  a/b/d variants of single-method designs. Delete the trio from `deepDive`.

### p4-4.1-002 — MAJOR: `source.section` and `taskStatement` cite 4.1 for an item answering 4.6
- Evidence: d4 `•Monitor system performance using logging and observability tools` (4.6) vs `•Define evaluation metrics ...` (4.1).
- Fix: change `taskStatement` and `source.section` to 4.6.

### p4-4.2-001 — MAJOR: `optionCountRationale` is dishonest (pattern 1)
- Problem: opens "Three options" and refers to "a fourth", but the item ships four.
- Fix: rewrite to match four options.

### p4-4.4-003 — MAJOR: source-silence question; option a is a real procedure (pattern 2)
- Fix: replace with a category-discrimination item, e.g. which of the three named categories a
  given symptom falls under. Move the needs-review justification from `deepDive` to a `reviewNote`.

### p4-4.2-003 — MINOR: needs-review justification lives in `deepDive` instead of `reviewNote`
### p4-4.4-003 — MINOR: same inconsistency
- Fix: move the flag text to a `reviewNote` field, matching the rest of the deck.

### p3-3-001 / p3-3-002 — MINOR: inconsistent `reviewStatus` on an identical premise
- 002 is flagged `needs-review` for the same imported definition of capability bloat that 001 uses while marked `verified`.
- Fix: align the two statuses.

### p4-4.2-002 — MINOR: option d ambiguous
- Fix: "Running an A/B test and iterating on whichever variant underperformed".

### p4-4.5-001 / p4-4.5-002 — MINOR: near-duplicate `concept` tags
- Fix: use distinct tags, e.g. "objective-attribution-cost-fix" and "measurement-vs-change".

---

## content/decks/partials/architect-professional-d5.json

### p5-5.1-001 / p5-5.2-001 / p5-5.3-001 / p5-5.5-001 — MAJOR: dishonest `optionCountRationale` (pattern 1)
All four open by describing a three-option item while shipping four, and several enumerate three
verbs/lists for four options.
- Fix: rewrite each to describe four options and justify the fourth honestly. p5-5.2-001 and
  p5-5.5-001 must also acknowledge that one distractor is imported from Domain 4.

### p5-5.1-003 — MAJOR: correct only by absence; three defensible distractors (pattern 2)
Input filtering, output moderation and PII redaction are all genuine guardrail techniques;
nothing in the item distinguishes them, and the key teaches only that the guide is thin.
- Evidence: the entire 5.1 detail is `•Implement guardrails and safety controls`.
- Fix: replace with a 5.1-vs-5.3 or 5.1-vs-5.4 scope item. Keep the `needs-review` flag on the replacement.

### p5-5.4-003 — MAJOR: correct only by absence; three defensible distractors (pattern 2)
Each distractor states a genuine requirement of one of the three named regulations, so "What does it
require of an LLM system?" has three defensible answers.
- Fix: replace with a compliance-vs-controls boundary item. Do not attempt regulatory content from this slice.

### p5-5.2-002 — MINOR: garbled `distractorRationale.b`
- Problem: "...for controls, which are controls regardless of who reviews output."
- Fix: "...substituting human validation (5.3) for the missing controls; who performs the review does not change that controls are absent."

---

## content/decks/partials/architect-professional-d6.json

### p6-63-001 — BLOCKER: distractor is defensible and the rejection is circular
- Problem: option a ("The delivery date of the first working release") is a commitment the architect
  must manage under 6.3; "(including SLAs)" is inclusive. `whyWrong.a` concedes the objective covers
  expectation alignment, then dismisses a schedule expectation anyway.
- Evidence: `•Manage stakeholder feedback loops and expectation alignment (including SLAs)`.
- Fix: tighten the stem to "Which of these is a service-level expectation…" or drop option a.

### p6-62-002 — MAJOR: `source.section` and `taskStatement` cite 6.2 for an item answering 6.3
- Evidence: 6.3 `•Manage stakeholder feedback loops and expectation alignment (including SLAs)`; 6.2 `•Communicate architectural decisions and trade-offs`.
- Fix: re-file under 6.3, or re-aim the item at 6.2.

### p6-61-003 — MINOR: key names a technique the slice does not
- Problem: "Interviewing stakeholders to surface what they actually need"; the slice names "structured
  discovery and requirement gathering", not interviews as a method. Not flagged.
- Fix: reword to "Eliciting requirements from stakeholders", or add the flag.

### p6-62-003 — MINOR: key introduces a "cost" axis absent from slice and prompt
- Fix: drop "cost" from the key option and from `whyWrong.b`.

### p6-61-001 / p6-64-002 / p6-63-002 / p7-71-001 — MINOR: authoring jargon in learner-facing text (pattern 4)
- Problem: `whyWrong` text says "the slice names neither model size nor context window", "Nothing in
  the slice restricts decision communication…", "the slice assigns…", "the slice names nothing about it".
- Fix: replace "the slice" with "objective N.M" or "the guide", and make each sentence teach something
  rather than assert a bare negative.

### p6-63-001 / p6-63-002 — MINOR: duplicated `concept` tag "sla-expectation-alignment"
- Fix: retag one, e.g. "expectation-vs-capability-anchoring".

---

## content/decks/partials/architect-professional-d7.json

### p7-73-001 — covered by pattern 4
- Also flagged `needs-review`; the flag is justified and should stay.

---

## content/decks/partials/developer-foundations-d1.json

### v1-1-005 — BLOCKER: unsourced "objective 3.1" claim
Option b, `distractorRationale.b` and `whyWrong.b` assert that session management is "listed under
3.1". The d1 slice contains only 1.1-1.3 and says nothing about Claude Code.
- Fix: strip the objective label from option b, make it a slice-neutral distractor, and drop "3.1" from the rationale and whyWrong.

### v1-1-006 — BLOCKER: unsourced 3.1 named-component list
"Rules, Skills, Commands, and Agent Memory" is asserted as the 3.1 Claude Code component list.
Neither the list nor 3.1 is in the slice.
- Fix: replace option c with a group 1.2 actually rules out, e.g. "Provider model families and
  context-window token limits"; delete all "3.1" attributions.

### v1-1-007 — BLOCKER: unsourced 3.1 claim in option text
- Fix: replace option c with a mechanism the slice names under a different objective, e.g.
  "Sub-agents, a design pattern listed under 1.3".

### v1-1-009 — BLOCKER: unsourced 3.1 named-component list
- Fix: swap option c for "Tool-use loops, sub-agents, and memory (the patterns named under 1.3)".

### v1-1-010 — BLOCKER: rationale asserts the guide contains categories it does not
"Both distractors correspond to real categories elsewhere in the guide" — neither slice has model selection.
- Fix: remove that claim; replace distractor b with an in-slice wrong framing, e.g. "Tasks where a
  single tool call and no workflow are sufficient".

### v1-1-007 — MAJOR: `whyWrong` overstates the slice
- Problem: "A custom agent loop is **explicitly** a place where the agent decides what to do next";
  the slice never characterises custom agent loops.
- Fix: "The guide does not offer agent loops as the deterministic mechanism; hooks are the named one for deterministic actions."

### v1-1-005 / v1-1-007 — MINOR: duplicate concept tag "hooks-deterministic-actions"; both test the identical fact
- Fix: retag v1-1-007 (e.g. "deterministic-vs-model-decided") or convert it to a different 1.2 fact.

### v1-1-005 / v1-1-007 — MINOR: options embed their own objective numbers, so the item is answerable by number-matching
- Fix: remove parenthetical objective labels from option texts; keep attribution in the rationale.

### v1-1-008 — MINOR: options a and b differ only by framework name
- Fix: replace option b with a different kind of wrong item, e.g. "A manager/supervisor hierarchy, which 1.1 names as an architectural structure".

---

## content/decks/partials/developer-foundations-d2.json

### v2-24-001 — BLOCKER: a distractor is also correct
- Problem: prompt asks "Which group of practices does objective 2.4 name?" Option a ("REST APIs and
  JSON interchange") is named in 2.4 just as much as option c. `whyWrong.a` concedes this and
  rejects it only for being "smaller", a distinction the prompt never asks for;
  `distractorRationale.a` claims it "belongs to a different objective", which is false.
- Evidence: 2.4 names "REST APIs, JSON, asynchronous programming, version control, SDLC integration, code review, and small- and large-scale refactoring".
- Fix: replace option a with a group 2.4 does not name, or reword the prompt to "Which group contains
  only practices 2.4 names that 2.3 does not" and add a 2.3 group as the new distractor.

### v2-24-003 — BLOCKER: unsourced "realtime call path" claim and SDLC expansion
- Problem: option b, its rationale and `whyWrong.b` assert "2.3 owns the realtime call path"; the slice
  names "realtime" only as one side of a selection tradeoff, never a "call path". Separately the key
  rests entirely on expanding "SDLC", which the slice never does.
- Fix: repoint the distractor at the real 2.2/2.4 lifecycle overlap; for the key, drop the word
  "explicitly" or reword to avoid relying on the expansion.

### v2-21-002 — MINOR: `optionCountRationale` counts wrong
- Fix: "Three options: the two inputs the slice names as the basis, plus two plausible discovery sources that match neither stated input."

### v2-26-002 — MINOR: rationale claims the slice "states" topic pairs it never pairs
- Fix: "Two author-assembled pairs drawn from neighbouring objectives, so the item tests pairing each concern with its objective."

### v2-26-002 — MINOR: option a asserts a purpose for vision the slice does not give ("multimodal requests")
- Fix: "Streaming and vision" — drop the purpose clause.

### v2-26-003 — MINOR: internal review note left in learner-facing copy
- Problem: `deepDive` begins "NEEDS REVIEW — …", shipping a maintainer note to the learner.
- Fix: remove the "NEEDS REVIEW —" clause; keep only the caution.

### v2-26-003 — MINOR: broken sentence in `distractorRationale.c`; inconsistent `needs-review` flag
- Problem: "...which the slice assigns to 2.4's practices instead" has no antecedent; and this item is
  flagged while v2-26-001/002 test the same CLAUDE.md/settings.json facts and are marked `verified`.
- Fix: reword the rationale; align the three items' `reviewStatus`.

---

## content/decks/partials/developer-foundations-d4.json

### v4-4-001 / v4-4-002 — MINOR: cross-slice justification (pattern 3)
Both justify distractors by appealing to objective 1.3, which verifies in ccdvf-d1.md but is not part
of the cited 4.1 slice and is not referenced in `source.section`.
- Fix: keep the options but make `whyWrong`/`distractorRationale` self-contained against 4.1 ("the
  slice names error type identification, recovery strategy selection, trace analysis and origin
  isolation; neither term is among them"), and add the 1.3 cross-reference to `source.section`.

### v4-4-002 — MINOR: `deepDive` mischaracterises one of the four named techniques
- Problem: claims all four are "about locating and classifying failures"; recovery strategy selection is about choosing a remedy.
- Fix: "...are about understanding and then answering a failure — three locate and classify, and one selects the remedy."

### v4-4-002 — MINOR: `optionCountRationale` overstates the case for two options
- Problem: claims "a third option would have to be invented"; the slice names two further techniques that could have supplied distractors.
- Fix: delete the first sentence and let the 4.1-techniques-vs-1.3-patterns argument carry it.

---

## content/decks/partials/developer-foundations-d5.json

### v5-51-001 — MAJOR: explanation asserts a mechanism not in the slice
- Problem: `explanation.correct` explains the variation as next-token generation "under sampling rather
  than retrieved from a fixed stored answer". The slice names the terms and defines none of them.
- Evidence: 5.1 is `Basic understanding of LLMs (tokens, context windows, sampling, non-determinism, next-token generation)`.
- Fix: keep the item (the answer is derivable from the named term) but cut the mechanism clause, and
  set `reviewStatus: "needs-review"`.

### v5-51-003 — MAJOR: `takeaway` mischaracterises non-determinism
- Problem: "sampling and non-determinism describe the choices made while building it" — non-determinism
  is a property of repeated runs on identical input, not a choice during one run. Also imports a
  definition of *sampling* the slice does not give.
- Fix: "Next-token generation is how the answer is built; the slice lists sampling and non-determinism
  as separate fundamentals." Flag `needs-review`.

### v5-53-001 — MINOR: options import terms absent from the slice
- Problem: "cache hit rate" in an option; `whyWrong.c` asserts "Sampling temperature and prompt length are per-request choices".
- Fix: swap for in-slice terms, or strip the per-request claim.

### v5-54-001 — MINOR: distractor asserts an unsourced classification
- Problem: classifies "model routing, retry policies, and rate limiting" as "resilience concerns"; neither "rate limiting" nor "resilience" appears in the slice.
- Fix: "5.4 names usage tracking, cost modeling and caching only."

---

## content/decks/partials/developer-foundations-d6.json

### v6-62-001 — MINOR: option renames a slice term
- Problem: option a reads "Token caching and cost modeling"; the slice term is **prompt caching**, and the item's own rationale says "Prompt caching."
- Fix: change option a to "Prompt caching and cost modeling."

### v6-62-002 — MINOR: distractor asserts an unsourced classification
- Problem: `whyWrong.a` asserts "selecting benchmarks and deploying are release activities, not prompt iteration" — no release/benchmark/deployment concept appears in the slice.
- Fix: "None of the three appears in 6.2's list of methods."

---

## content/decks/partials/developer-foundations-d7.json

### v7-71-001 — MINOR: rationale asserts content outside the slice
- Problem: "routing, caching, and token budgets are named elsewhere in the guide" — the slice mentions none of them; `whyWrong.a` handles it correctly, so the two also disagree.
- Fix: "Probes treating efficiency topics as security topics; the objective names none of them under 7.1."

### v7-71-002 — MINOR: mechanism language in `distractorRationale.c`
- Problem: "the runtime interception mechanism named under 7.3"; the slice names hooks only as a means of guardrails.
- Fix: "the control named under 7.3, Claude Hooks."

### v7-74-002 — MINOR: prompt's surface cues point the wrong way
- Problem: the boundary is genuinely resolvable (7.4's three activities map one-to-one onto the prompt's three components), but the `cicd` scenario and "Before a release" framing invoke deployment, which is 7.2's territory, so the item is solvable mainly by phrase-matching.
- Fix: drop the release/CI/CD framing (e.g. "During an access review, the team must confirm…") and
  tighten option b so it is visibly the weaker match. **No change to the key.**

---

## content/decks/partials/developer-foundations-d8.json

### v8-83-002 — MAJOR: unsourced claim in `explanation.whyWrong.c`
- Problem: asserts "Agents and vector stores come from other objectives in the guide"; neither appears in the d8 slice. The companion `distractorRationale.c` is already correct.
- Fix: "Neither Agents nor vector stores is among the four options 8.3 names; 8.3 names built-in Tools, custom Tools, Skills, and MCPs."

### v8-83-003 — MAJOR: item is tagged to the wrong objective
- Problem: the item asks which objective carries the 2.1% weight (answer 8.2), but `taskStatement` is "8.3" and `source.section` reads "Objective 8.3: Agentic Customization". It is domain-weight trivia and tests no 8.3 content. No other item tests weights.
- Fix: either re-tag to 8.2 / "Objective 8.2: MCP Server Development", or drop the item and fold the
  weights into an existing item's `deepDive` (e.g. v8-81-001).
