Domain 5: Context Management & Reliability
Task Statement 5.1: Manage conversation context to preserve critical information
across long interactions
Knowledge of:
•Progressive summarization risks: condensing numerical values, percentages, dates, and customer-
stated expectations into vague summaries
Claude Certification Program Exam guide

===== PAGE 20 =====
•The "lost in the middle" effect: models reliably process information at the beginning and end of long
inputs but may omit ﬁndings from middle sections
•How tool results accumulate in context and consume tokens disproportionately to their relevance
(e.g., 40+ ﬁelds per order lookup when only 5 are relevant)
•The importance of passing complete conversation history in subsequent API requests to maintain
conversational coherence
Skills in:
•Extracting transactional facts (amounts, dates, order numbers, statuses) into a persistent "case
facts" block included in each prompt, outside summarized history
•Extracting and persisting structured issue data (order IDs, amounts, statuses) into a separate
context layer for multi-issue sessions
•Trimming verbose tool outputs to only relevant ﬁelds before they accumulate in context (e.g.,
keeping only return-relevant ﬁelds from order lookups)
•Placing key ﬁndings summaries at the beginning of aggregated inputs and organizing detailed
results with explicit section headers to mitigate position effects
•Requiring subagents to include metadata (dates, source locations, methodological context) in
structured outputs to support accurate downstream synthesis
•Modifying upstream agents to return structured data (key facts, citations, relevance scores)
instead of verbose content and reasoning chains when downstream agents have limited context
budgets
Task Statement 5.2: Design effective escalation and ambiguity resolution patterns
Knowledge of:
•Appropriate escalation triggers: customer requests for a human, policy exceptions/gaps (not just
complex cases), and inability to make meaningful progress
•The distinction between escalating immediately when a customer explicitly demands it versus
offering to resolve when the issue is straightforward
•Why sentiment-based escalation and self-reported conﬁdence scores are unreliable proxies for
actual case complexity
•How multiple customer matches require clariﬁcation (requesting additional identiﬁers) rather than
heuristic selection
Skills in:
•Adding explicit escalation criteria with few-shot examples to the system prompt demonstrating
when to escalate versus resolve autonomously
Claude Certification Program Exam guide

===== PAGE 21 =====
•Honoring explicit customer requests for human agents immediately without ﬁrst attempting
investigation
•Acknowledging frustration while offering resolution when the issue is within the agent's capability,
escalating only if the customer reiterates their preference
•Escalating when policy is ambiguous or silent on the customer's speciﬁc request (e.g., competitor
price matching when policy only addresses own-site adjustments)
•Instructing the agent to ask for additional identiﬁers when tool results return multiple matches,
rather than selecting based on heuristics
Task Statement 5.3: Implement error propagation strategies across multi-agent systems
Knowledge of:
•Structured error context (failure type, attempted query, partial results, alternative approaches) as
enabling intelligent coordinator recovery decisions
•The distinction between access failures (timeouts needing retry decisions) and valid empty results
(successful queries with no matches)
•Why generic error statuses ("search unavailable") hide valuable context from the coordinator
•Why silently suppressing errors (returning empty results as success) or terminating entire
workﬂows on single failures are both anti-patterns
Skills in:
•Returning structured error context including failure type, what was attempted, partial results, and
potential alternatives to enable coordinator recovery
•Distinguishing access failures from valid empty results in error reporting so the coordinator can
make appropriate decisions
•Having subagents implement local recovery for transient failures and only propagate errors they
cannot resolve, including what was attempted and partial results
•Structuring synthesis output with coverage annotations indicating which ﬁndings are well-
supported versus which topic areas have gaps due to unavailable sources
Task Statement 5.4: Manage context effectively in large codebase exploration
Knowledge of:
•Context degradation in extended sessions: models start giving inconsistent answers and
referencing "typical patterns" rather than speciﬁc classes discovered earlier
•The role of scratchpad ﬁles for persisting key ﬁndings across context boundaries
Claude Certification Program Exam guide

===== PAGE 22 =====
•Subagent delegation for isolating verbose exploration output while the main agent coordinates high-
level understanding
•Structured state persistence for crash recovery: each agent exports state to a known location, and
the coordinator loads a manifest on resume
Skills in:
•Spawning subagents to investigate speciﬁc questions (e.g., "ﬁnd all test ﬁles," "trace refund ﬂow
dependencies") while the main agent preserves high-level coordination
•Having agents maintain scratchpad ﬁles recording key ﬁndings, referencing them for subsequent
questions to counteract context degradation
•Summarizing key ﬁndings from one exploration phase before spawning sub-agents for the next
phase, injecting summaries into initial context
•Designing crash recovery using structured agent state exports (manifests) that the coordinator
loads on resume and injects into agent prompts
•Using /compact to reduce context usage during extended exploration sessions when context ﬁlls
with verbose discovery output
Task Statement 5.5: Design human review workﬂows and conﬁdence calibration
Knowledge of:
•The risk that aggregate accuracy metrics (e.g., 97% overall) may mask poor performance on speciﬁc
document types or ﬁelds
•Stratiﬁed random sampling for measuring error rates in high-conﬁdence extractions and detecting
novel error patterns
•Field-level conﬁdence scores calibrated using labeled validation sets for routing review attention
•The importance of validating accuracy by document type and ﬁeld segment before automating high-
conﬁdence extractions
Skills in:
•Implementing stratiﬁed random sampling of high-conﬁdence extractions for ongoing error rate
measurement and novel pattern detection
•Analyzing accuracy by document type and ﬁeld to verify consistent performance across all
segments before reducing human review
•Having models output ﬁeld-level conﬁdence scores, then calibrating review thresholds using
labeled validation sets
•Routing extractions with low model conﬁdence or ambiguous/contradictory source documents to
human review, prioritizing limited reviewer capacity
Claude Certification Program Exam guide

===== PAGE 23 =====
Task Statement 5.6: Preserve information provenance and handle uncertainty in multi-
source synthesis
Knowledge of:
•How source attribution is lost during summarization steps when ﬁndings are compressed without
preserving claim-source mappings
•The importance of structured claim-source mappings that the synthesis agent must preserve and
merge when combining ﬁndings
•How to handle conﬂicting statistics from credible sources: annotating conﬂicts with source
attribution rather than arbitrarily selecting one value
•Temporal data: requiring publication/collection dates in structured outputs to prevent temporal
differences from being misinterpreted as contradictions
Skills in:
•Requiring subagents to output structured claim-source mappings (source URLs, document names,
relevant excerpts) that downstream agents preserve through synthesis
•Structuring reports with explicit sections distinguishing well-established ﬁndings from contested
ones, preserving original source characterizations and methodological context
•Completing document analysis with conﬂicting values included and explicitly annotated, letting the
coordinator decide how to reconcile before passing to synthesis
•Requiring subagents to include publication or data collection dates in structured outputs to enable
correct temporal interpretation
•Rendering different content types appropriately in synthesis outputs—ﬁnancial data as tables,
news as prose, technical ﬁndings as structured lists—rather than converting everything to a
uniform format