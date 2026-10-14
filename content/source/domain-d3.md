Domain 3: Claude Code Configuration & Workflows
Task Statement 3.1: Conﬁgure CLAUDE.md ﬁles with appropriate hierarchy, scoping,
and modular organization
Knowledge of:
•The CLAUDE.md conﬁguration hierarchy: user-level (~/.claude/CLAUDE.md), project-level
(.claude/CLAUDE.md or root CLAUDE.md), and directory-level (subdirectory CLAUDE.md ﬁles)
•That user-level settings apply only to that user—instructions in ~/.claude/CLAUDE.md are not
shared with teammates via version control
•The @import syntax for referencing external ﬁles to keep CLAUDE.md modular (e.g., importing
speciﬁc standards ﬁles relevant to each package)
•.claude/rules/ directory for organizing topic-speciﬁc rule ﬁles as an alternative to a monolithic
CLAUDE.md
Skills in:
•Diagnosing conﬁguration hierarchy issues (e.g., a new team member not receiving instructions
because they're in user-level rather than project-level conﬁguration)
•Using @import to selectively include relevant standards ﬁles in each package's CLAUDE.md based
on maintainer domain knowledge
•Splitting large CLAUDE.md ﬁles into focused topic-speciﬁc ﬁles in .claude/rules/ (e.g., testing.md,
api-conventions.md, deployment.md)
Claude Certification Program Exam guide

===== PAGE 13 =====
•Using the /memory command to verify which memory ﬁles are loaded and diagnose inconsistent
behavior across sessions
Task Statement 3.2: Create and conﬁgure custom slash commands and skills
Knowledge of:
•Project-scoped commands in .claude/commands/ (shared via version control) vs user-scoped
commands in ~/.claude/commands/ (personal)
•Skills in .claude/skills/ with SKILL.md ﬁles that support frontmatter conﬁguration including context:
fork, allowed-tools, and argument-hint
•The context: fork frontmatter option for running skills in an isolated sub-agent context, preventing
skill outputs from polluting the main conversation
•Personal skill customization: creating personal variants in ~/.claude/skills/ with different names to
avoid affecting teammates
Skills in:
•Creating project-scoped slash commands in .claude/commands/ for team-wide availability via
version control
•Using context: fork to isolate skills that produce verbose output (e.g., codebase analysis) or
exploratory context (e.g., brainstorming alternatives) from the main session
•Conﬁguring allowed-tools in skill frontmatter to restrict tool access during skill execution (e.g.,
limiting to ﬁle write operations to prevent destructive actions)
•Using argument-hint frontmatter to prompt developers for required parameters when they invoke
the skill without arguments
•Choosing between skills (on-demand invocation for task-speciﬁc workﬂows) and CLAUDE.md
(always-loaded universal standards)
Task Statement 3.3: Apply path-speciﬁc rules for conditional convention loading
Knowledge of:
•.claude/rules/ ﬁles with YAML frontmatter paths ﬁelds containing glob patterns for conditional rule
activation
•How path-scoped rules load only when editing matching ﬁles, reducing irrelevant context and token
usage
•The advantage of glob-pattern rules over directory-level CLAUDE.md ﬁles for conventions that span
multiple directories (e.g., test ﬁles spread throughout a codebase)
Claude Certification Program Exam guide

===== PAGE 14 =====
Skills in:
•Creating .claude/rules/ ﬁles with YAML frontmatter path scoping (e.g., paths: ["terraform/**/*"]) so
rules load only when editing matching ﬁles
•Using glob patterns in path-speciﬁc rules to apply conventions to ﬁles by type regardless of
directory location (e.g., **/*.test.tsx for all test ﬁles)
•Choosing path-speciﬁc rules over subdirectory CLAUDE.md ﬁles when conventions must apply to
ﬁles spread across the codebase
Task Statement 3.4: Determine when to use plan mode vs direct execution
Knowledge of:
•Plan mode is designed for complex tasks involving large-scale changes, multiple valid approaches,
architectural decisions, and multi-ﬁle modiﬁcations
•Direct execution is appropriate for simple, well-scoped changes (e.g., adding a single validation
check to one function)
•Plan mode enables safe codebase exploration and design before committing to changes, preventing
costly rework
•The Explore subagent for isolating verbose discovery output and returning summaries to preserve
main conversation context
Skills in:
•Selecting plan mode for tasks with architectural implications (e.g., microservice restructuring,
library migrations affecting 45+ ﬁles, choosing between integration approaches with different
infrastructure requirements)
•Selecting direct execution for well-understood changes with clear scope (e.g., a single-ﬁle bug ﬁx
with a clear stack trace, adding a date validation conditional)
•Using the Explore subagent for verbose discovery phases to prevent context window exhaustion
during multi-phase tasks
•Combining plan mode for investigation with direct execution for implementation (e.g., planning a
library migration, then executing the planned approach)
Task Statement 3.5: Apply iterative reﬁnement techniques for progressive
improvement
Knowledge of:
•Concrete input/output examples as the most effective way to communicate expected
transformations when prose descriptions are interpreted inconsistently
Claude Certification Program Exam guide

===== PAGE 15 =====
•Test-driven iteration: writing test suites ﬁrst, then iterating by sharing test failures to guide
progressive improvement
•The interview pattern: having Claude ask questions to surface considerations the developer may not
have anticipated before implementing
•When to provide all issues in a single message (interacting problems) versus ﬁxing them
sequentially (independent problems)
Skills in:
•Providing 2-3 concrete input/output examples to clarify transformation requirements when natural
language descriptions produce inconsistent results
•Writing test suites covering expected behavior, edge cases, and performance requirements before
implementation, then iterating by sharing test failures
•Using the interview pattern to surface design considerations (e.g., cache invalidation strategies,
failure modes) before implementing solutions in unfamiliar domains
•Providing speciﬁc test cases with example input and expected output to ﬁx edge case handling
(e.g., null values in migration scripts)
•Addressing multiple interacting issues in a single detailed message when ﬁxes interact, versus
sequential iteration for independent issues
Task Statement 3.6: Integrate Claude Code into CI/CD pipelines
Knowledge of:
•The -p (or --print) ﬂag for running Claude Code in non-interactive mode in automated pipelines
•--output-format json and --json-schema CLI ﬂags for enforcing structured output in CI contexts
•CLAUDE.md as the mechanism for providing project context (testing standards, ﬁxture
conventions, review criteria) to CI-invoked Claude Code
•Session context isolation: why the same Claude session that generated code is less effective at
reviewing its own changes compared to an independent review instance
Skills in:
•Running Claude Code in CI with the -p ﬂag to prevent interactive input hangs
•Using --output-format json with --json-schema to produce machine-parseable structured ﬁndings
for automated posting as inline PR comments
•Including prior review ﬁndings in context when re-running reviews after new commits, instructing
Claude to report only new or still-unaddressed issues to avoid duplicate comments
•Providing existing test ﬁles in context so test generation avoids suggesting duplicate scenarios
already covered by the test suite
Claude Certification Program Exam guide

===== PAGE 16 =====
•Documenting testing standards, valuable test criteria, and available ﬁxtures in CLAUDE.md to
improve test generation quality and reduce low-value test output