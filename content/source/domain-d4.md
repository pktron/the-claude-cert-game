Domain 4: Prompt Engineering & Structured Output
Task Statement 4.1: Design prompts with explicit criteria to improve precision and
reduce false positives
Knowledge of:
•The importance of explicit criteria over vague instructions (e.g., "ﬂag comments only when claimed
behavior contradicts actual code behavior" vs "check that comments are accurate")
•How general instructions like "be conservative" or "only report high-conﬁdence ﬁndings" fail to
improve precision compared to speciﬁc categorical criteria
•The impact of false positive rates on developer trust: high false positive categories undermine
conﬁdence in accurate categories
Skills in:
•Writing speciﬁc review criteria that deﬁne which issues to report (bugs, security) versus skip
(minor style, local patterns) rather than relying on conﬁdence-based ﬁltering
•Temporarily disabling high false-positive categories to restore developer trust while improving
prompts for those categories
•Deﬁning explicit severity criteria with concrete code examples for each severity level to achieve
consistent classiﬁcation
Task Statement 4.2: Apply few-shot prompting to improve output consistency and
quality
Knowledge of:
•Few-shot examples as the most effective technique for achieving consistently formatted,
actionable output when detailed instructions alone produce inconsistent results
•The role of few-shot examples in demonstrating ambiguous-case handling (e.g., tool selection for
ambiguous requests, branch-level test coverage gaps)
•How few-shot examples enable the model to generalize judgment to novel patterns rather than
matching only pre-speciﬁed cases
•The effectiveness of few-shot examples for reducing hallucination in extraction tasks (e.g., handling
informal measurements, varied document structures)
Claude Certification Program Exam guide

===== PAGE 17 =====
Skills in:
•Creating 2-4 targeted few-shot examples for ambiguous scenarios that show reasoning for why one
action was chosen over plausible alternatives
•Including few-shot examples that demonstrate speciﬁc desired output format (location, issue,
severity, suggested ﬁx) to achieve consistency
•Providing few-shot examples distinguishing acceptable code patterns from genuine issues to
reduce false positives while enabling generalization
•Using few-shot examples to demonstrate correct handling of varied document structures (inline
citations vs bibliographies, methodology sections vs embedded details)
•Adding few-shot examples showing correct extraction from documents with varied formats to
address empty/null extraction of required ﬁelds
Task Statement 4.3: Enforce structured output using tool use and JSON schemas
Knowledge of:
•Tool use (tool_use) with JSON schemas as the most reliable approach for guaranteed schema-
compliant structured output, eliminating JSON syntax errors
•The distinction between tool_choice: "auto" (model may return text instead of calling a tool), "any"
(model must call a tool but can choose which), and forced tool selection (model must call a speciﬁc
named tool)
•That strict JSON schemas via tool use eliminate syntax errors but do not prevent semantic errors
(e.g., line items that don't sum to total, values in wrong ﬁelds)
•Schema design considerations: required vs optional ﬁelds, enum ﬁelds with "other" + detail string
patterns for extensible categories
Skills in:
•Deﬁning extraction tools with JSON schemas as input parameters and extracting structured data
from the tool_use response
•Setting tool_choice: "any" to guarantee structured output when multiple extraction schemas exist
and the document type is unknown
•Forcing a speciﬁc tool with tool_choice: {"type": "tool", "name": "extract_metadata"} to ensure a
particular extraction runs before enrichment steps
•Designing schema ﬁelds as optional (nullable) when source documents may not contain the
information, preventing the model from fabricating values to satisfy required ﬁelds
•Adding enum values like "unclear" for ambiguous cases and "other" + detail ﬁelds for extensible
categorization
Claude Certification Program Exam guide

===== PAGE 18 =====
•Including format normalization rules in prompts alongside strict output schemas to handle
inconsistent source formatting
Task Statement 4.4: Implement validation, retry, and feedback loops for extraction
quality
Knowledge of:
•Retry-with-error-feedback: appending speciﬁc validation errors to the prompt on retry to guide the
model toward correction
•The limits of retry: retries are ineffective when the required information is simply absent from the
source document (vs format or structural errors)
•Feedback loop design: tracking which code constructs trigger ﬁndings (detected_pattern ﬁeld) to
enable systematic analysis of dismissal patterns
•The difference between semantic validation errors (values don't sum, wrong ﬁeld placement) and
schema syntax errors (eliminated by tool use)
Skills in:
•Implementing follow-up requests that include the original document, the failed extraction, and
speciﬁc validation errors for model self-correction
•Identifying when retries will be ineffective (e.g., information exists only in an external document not
provided) versus when they will succeed (format mismatches, structural output errors)
•Adding detected_pattern ﬁelds to structured ﬁndings to enable analysis of false positive patterns
when developers dismiss ﬁndings
•Designing self-correction validation ﬂows: extracting "calculated_total" alongside "stated_total" to
ﬂag discrepancies, adding "conﬂict_detected" booleans for inconsistent source data
Task Statement 4.5: Design efﬁcient batch processing strategies
Knowledge of:
•The Message Batches API: 50% cost savings, up to 24-hour processing window, no guaranteed
latency SLA
•Batch processing is appropriate for non-blocking, latency-tolerant workloads (overnight reports,
weekly audits, nightly test generation) and inappropriate for blocking workﬂows (pre-merge
checks)
•The batch API does not support multi-turn tool calling within a single request (cannot execute tools
mid-request and return results)
•custom_id ﬁelds for correlating batch request/response pairs
Claude Certification Program Exam guide

===== PAGE 19 =====
Skills in:
•Matching API approach to workﬂow latency requirements: synchronous API for blocking pre-merge
checks, batch API for overnight/weekly analysis
•Calculating batch submission frequency based on SLA constraints (e.g., 4-hour windows to
guarantee 30-hour SLA with 24-hour batch processing)
•Handling batch failures: resubmitting only failed documents (identiﬁed by custom_id) with
appropriate modiﬁcations (e.g., chunking documents that exceeded context limits)
•Using prompt reﬁnement on a sample set before batch-processing large volumes to maximize ﬁrst-
pass success rates and reduce iterative resubmission costs
Task Statement 4.6: Design multi-instance and multi-pass review architectures
Knowledge of:
•Self-review limitations: a model retains reasoning context from generation, making it less likely to
question its own decisions in the same session
•Independent review instances (without prior reasoning context) are more effective at catching
subtle issues than self-review instructions or extended thinking
•Multi-pass review: splitting large reviews into per-ﬁle local analysis passes plus cross-ﬁle
integration passes to avoid attention dilution and contradictory ﬁndings
Skills in:
•Using a second independent Claude instance to review generated code without the generator's
reasoning context
•Splitting large multi-ﬁle reviews into focused per-ﬁle passes for local issues plus separate
integration passes for cross-ﬁle data ﬂow analysis
•Running veriﬁcation passes where the model self-reports conﬁdence alongside each ﬁnding to
enable calibrated review routing