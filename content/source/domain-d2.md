Domain 2: Tool Design & MCP Integration
Task Statement 2.1: Design effective tool interfaces with clear descriptions and
boundaries
Knowledge of:
•Tool descriptions as the primary mechanism LLMs use for tool selection; minimal descriptions lead
to unreliable selection among similar tools
•The importance of including input formats, example queries, edge cases, and boundary explanations
in tool descriptions
•How ambiguous or overlapping tool descriptions cause misrouting (e.g., analyze_content vs
analyze_document with near-identical descriptions)
•The impact of system prompt wording on tool selection: keyword-sensitive instructions can create
unintended tool associations
Skills in:
•Writing tool descriptions that clearly differentiate each tool's purpose, expected inputs, outputs,
and when to use it versus similar alternatives
•Renaming tools and updating descriptions to eliminate functional overlap (e.g., renaming
analyze_content to extract_web_results with a web-speciﬁc description)
•Splitting generic tools into purpose-speciﬁc tools with deﬁned input/output contracts (e.g., splitting
a generic analyze_document into extract_data_points, summarize_content, and
verify_claim_against_source)
•Reviewing system prompts for keyword-sensitive instructions that might override well-written tool
descriptions
Task Statement 2.2: Implement structured error responses for MCP tools
Knowledge of:
•The MCP isError ﬂag pattern for communicating tool failures back to the agent
•The distinction between transient errors (timeouts, service unavailability), validation errors (invalid
input), business errors (policy violations), and permission errors
Claude Certification Program Exam guide

===== PAGE 10 =====
•Why uniform error responses (generic "Operation failed") prevent the agent from making
appropriate recovery decisions
•The difference between retryable and non-retryable errors, and how returning structured metadata
prevents wasted retry attempts
Skills in:
•Returning structured error metadata including errorCategory (transient/validation/permission),
isRetryable boolean, and human-readable descriptions
•Including retriable: false ﬂags and customer-friendly explanations for business rule violations so the
agent can communicate appropriately
•Implementing local error recovery within subagents for transient failures, propagating to the
coordinator only errors that cannot be resolved locally along with partial results and what was
attempted
•Distinguishing between access failures (needing retry decisions) and valid empty results
(representing successful queries with no matches)
Task Statement 2.3: Distribute tools appropriately across agents and conﬁgure tool
choice
Knowledge of:
•The principle that giving an agent access to too many tools (e.g., 18 instead of 4-5) degrades tool
selection reliability by increasing decision complexity
•Why agents with tools outside their specialization tend to misuse them (e.g., a synthesis agent
attempting web searches)
•Scoped tool access: giving agents only the tools needed for their role, with limited cross-role tools
for speciﬁc high-frequency needs
•tool_choice conﬁguration options: "auto", "any", and forced tool selection ({"type": "tool", "name":
"..."})
Skills in:
•Restricting each subagent's tool set to those relevant to its role, preventing cross-specialization
misuse
•Replacing generic tools with constrained alternatives (e.g., replacing fetch_url with load_document
that validates document URLs)
•Providing scoped cross-role tools for high-frequency needs (e.g., a verify_fact tool for the synthesis
agent) while routing complex cases through the coordinator
Claude Certification Program Exam guide

===== PAGE 11 =====
•Using tool_choice forced selection to ensure a speciﬁc tool is called ﬁrst (e.g., forcing
extract_metadata before enrichment tools), then processing subsequent steps in follow-up turns
•Setting tool_choice: "any" to guarantee the model calls a tool rather than returning conversational
text
Task Statement 2.4: Integrate MCP servers into Claude Code and agent workﬂows
Knowledge of:
•MCP server scoping: project-level (.mcp.json) for shared team tooling vs user-level (~/.claude.json)
for personal/experimental servers
•Environment variable expansion in .mcp.json (e.g., ${GITHUB_TOKEN}) for credential management
without committing secrets
•That tools from all conﬁgured MCP servers are discovered at connection time and available
simultaneously to the agent
•MCP resources as a mechanism for exposing content catalogs (e.g., issue summaries,
documentation hierarchies, database schemas) to reduce exploratory tool calls
Skills in:
•Conﬁguring shared MCP servers in project-scoped .mcp.json with environment variable expansion
for authentication tokens
•Conﬁguring personal/experimental MCP servers in user-scoped ~/.claude.json
•Enhancing MCP tool descriptions to explain capabilities and outputs in detail, preventing the agent
from preferring built-in tools (like Grep) over more capable MCP tools
•Choosing existing community MCP servers over custom implementations for standard integrations
(e.g., Jira), reserving custom servers for team-speciﬁc workﬂows
•Exposing content catalogs as MCP resources to give agents visibility into available data without
requiring exploratory tool calls
Task Statement 2.5: Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob)
effectively
Knowledge of:
•Grep for content search (searching ﬁle contents for patterns like function names, error messages,
or import statements)
•Glob for ﬁle path pattern matching (ﬁnding ﬁles by name or extension patterns)
•Read/Write for full ﬁle operations; Edit for targeted modiﬁcations using unique text matching
Claude Certification Program Exam guide

===== PAGE 12 =====
•When Edit fails due to non-unique text matches, using Read + Write as a fallback for reliable ﬁle
modiﬁcations
Skills in:
•Selecting Grep for searching code content across a codebase (e.g., ﬁnding all callers of a function,
locating error messages)
•Selecting Glob for ﬁnding ﬁles matching naming patterns (e.g., **/*.test.tsx)
•Using Read to load full ﬁle contents followed by Write when Edit cannot ﬁnd unique anchor text
•Building codebase understanding incrementally: starting with Grep to ﬁnd entry points, then using
Read to follow imports and trace ﬂows, rather than reading all ﬁles upfront
•Tracing function usage across wrapper modules by ﬁrst identifying all exported names, then
searching for each name across the codebase