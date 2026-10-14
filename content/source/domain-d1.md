Domain 1: Agentic Architecture & Orchestration
Task Statement 1.1: Design and implement agentic loops for autonomous task execution
Knowledge of:
•The agentic loop lifecycle: sending requests to Claude, inspecting stop_reason ("tool_use" vs
"end_turn"), executing requested tools, and returning results for the next iteration
•How tool results are appended to conversation history so the model can reason about the next
action
•The distinction between model-driven decision-making (Claude reasons about which tool to call
next based on context) and pre-conﬁgured decision trees or tool sequences
Skills in:
•Implementing agentic loop control ﬂow that continues when stop_reason is "tool_use" and
terminates when stop_reason is "end_turn"
•Adding tool results to conversation context between iterations so the model can incorporate new
information into its reasoning
•Avoiding anti-patterns such as parsing natural language signals to determine loop termination,
setting arbitrary iteration caps as the primary stopping mechanism, or checking for assistant text
content as a completion indicator
Task Statement 1.2: Orchestrate multi-agent systems with coordinator-subagent
patterns
Knowledge of:
•Hub-and-spoke architecture where a coordinator agent manages all inter-subagent communication,
error handling, and information routing
•How subagents operate with isolated context—they do not inherit the coordinator's conversation
history automatically
•The role of the coordinator in task decomposition, delegation, result aggregation, and deciding
which subagents to invoke based on query complexity
Claude Certification Program Exam guide

===== PAGE 6 =====
•Risks of overly narrow task decomposition by the coordinator, leading to incomplete coverage of
broad research topics
Skills in:
•Designing coordinator agents that analyze query requirements and dynamically select which
subagents to invoke rather than always routing through the full pipeline
•Partitioning research scope across subagents to minimize duplication (e.g., assigning distinct
subtopics or source types to each agent)
•Implementing iterative reﬁnement loops where the coordinator evaluates synthesis output for gaps,
re-delegates to search and analysis subagents with targeted queries, and re-invokes synthesis until
coverage is sufﬁcient
•Routing all subagent communication through the coordinator for observability, consistent error
handling, and controlled information ﬂow
Task Statement 1.3: Conﬁgure subagent invocation, context passing, and spawning
Knowledge of:
•The Task tool as the mechanism for spawning subagents, and the requirement that allowedTools
must include "Task" for a coordinator to invoke subagents
•That subagent context must be explicitly provided in the prompt—subagents do not automatically
inherit parent context or share memory between invocations
•The AgentDeﬁnition conﬁguration including descriptions, system prompts, and tool restrictions for
each subagent type
•Fork-based session management for exploring divergent approaches from a shared analysis
baseline
Skills in:
•Including complete ﬁndings from prior agents directly in the subagent's prompt (e.g., passing web
search results and document analysis outputs to the synthesis subagent)
•Using structured data formats to separate content from metadata (source URLs, document names,
page numbers) when passing context between agents to preserve attribution
•Spawning parallel subagents by emitting multiple Task tool calls in a single coordinator response
rather than across separate turns
•Designing coordinator prompts that specify research goals and quality criteria rather than step-by-
step procedural instructions, to enable subagent adaptability
Claude Certification Program Exam guide

===== PAGE 7 =====
Task Statement 1.4: Implement multi-step workﬂows with enforcement and handoff
patterns
Knowledge of:
•The difference between programmatic enforcement (hooks, prerequisite gates) and prompt-based
guidance for workﬂow ordering
•When deterministic compliance is required (e.g., identity veriﬁcation before ﬁnancial operations),
prompt instructions alone have a non-zero failure rate
•Structured handoff protocols for mid-process escalation that include customer details, root cause
analysis, and recommended actions
Skills in:
•Implementing programmatic prerequisites that block downstream tool calls until prerequisite steps
have completed (e.g., blocking process_refund until get_customer has returned a veriﬁed customer
ID)
•Decomposing multi-concern customer requests into distinct items, then investigating each in
parallel using shared context before synthesizing a uniﬁed resolution
•Compiling structured handoff summaries (customer ID, root cause, refund amount, recommended
action) when escalating to human agents who lack access to the conversation transcript
Task Statement 1.5: Apply Agent SDK hooks for tool call interception and data
normalization
Knowledge of:
•Hook patterns (e.g., PostToolUse) that intercept tool results for transformation before the model
processes them
•Hook patterns that intercept outgoing tool calls to enforce compliance rules (e.g., blocking refunds
above a threshold)
•The distinction between using hooks for deterministic guarantees versus relying on prompt
instructions for probabilistic compliance
Skills in:
•Implementing PostToolUse hooks to normalize heterogeneous data formats (Unix timestamps, ISO
8601, numeric status codes) from different MCP tools before the agent processes them
•Implementing tool call interception hooks that block policy-violating actions (e.g., refunds exceeding
$500) and redirect to alternative workﬂows (e.g., human escalation)
•Choosing hooks over prompt-based enforcement when business rules require guaranteed
compliance
Claude Certification Program Exam guide

===== PAGE 8 =====
Task Statement 1.6: Design task decomposition strategies for complex workﬂows
Knowledge of:
•When to use ﬁxed sequential pipelines (prompt chaining) versus dynamic adaptive decomposition
based on intermediate ﬁndings
•Prompt chaining patterns that break reviews into sequential steps (e.g., analyze each ﬁle
individually, then run a cross-ﬁle integration pass)
•The value of adaptive investigation plans that generate subtasks based on what is discovered at
each step
Skills in:
•Selecting task decomposition patterns appropriate to the workﬂow: prompt chaining for
predictable multi-aspect reviews, dynamic decomposition for open-ended investigation tasks
•Splitting large code reviews into per-ﬁle local analysis passes plus a separate cross-ﬁle integration
pass to avoid attention dilution
•Decomposing open-ended tasks (e.g., "add comprehensive tests to a legacy codebase") by ﬁrst
mapping structure, identifying high-impact areas, then creating a prioritized plan that adapts as
dependencies are discovered
Task Statement 1.7: Manage session state, resumption, and forking
Knowledge of:
•Named session resumption using --resume <session-name> to continue a speciﬁc prior
conversation
•fork_session for creating independent branches from a shared analysis baseline to explore
divergent approaches
•The importance of informing the agent about changes to previously analyzed ﬁles when resuming
sessions after code modiﬁcations
•Why starting a new session with a structured summary is more reliable than resuming with stale
tool results
Skills in:
•Using --resume with session names to continue named investigation sessions across work sessions
•Using fork_session to create parallel exploration branches (e.g., comparing two testing strategies or
refactoring approaches from a shared codebase analysis)
•Choosing between session resumption (when prior context is mostly valid) and starting fresh with
injected summaries (when prior tool results are stale)
Claude Certification Program Exam guide

===== PAGE 9 =====
•Informing a resumed session about speciﬁc ﬁle changes for targeted re-analysis rather than
requiring full re-exploration