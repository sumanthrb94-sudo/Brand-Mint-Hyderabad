# Quarantined agents

Vendored so nothing is hidden, but **not loaded** — Claude Code only reads
`.claude/agents/`. Each of these either instructs the agent to act without
human approval, or demands an API key we will never supply (CLAUDE.md §4:
never collect a credential).

The tool grant already defuses most of the risk — none of these can reach
Bash or an MCP server — but a prompt that says "never ask for permission"
has no business in a repo that touches production.

To un-quarantine one, read it end to end first, then:

    git mv .claude/agents-quarantined/<file> .claude/agents/

## `marketing-carousel-growth-engine.md`

line 41 reads "Zero Confirmation: Run the entire pipeline without asking for user approval between steps". It also auto-publishes to TikTok/Instagram and self-schedules its next run. Needs GEMINI_API_KEY + UPLOADPOST_TOKEN.

## `specialized-chief-of-staff.md`

line 160: "if the boss seems depleted, lighten the day's load without asking permission". An agent deciding on its own what not to tell you is the opposite of what this studio needs.

## `agents-orchestrator.md`

same as specialized-agents-orchestrator.md (name varies upstream).

## `marketing-multi-platform-publisher.md`

requires Wechatsync / xhs-mcp / biliup credentials. CLAUDE.md section 4: never collect a credential.

## `marketing-x-twitter-intelligence-analyst.md`

declares a services: block requiring API keys.

## `design-ui-finish-gate-reviewer.md`

declares a services: block requiring API keys.

Upstream: msitarzewski/agency-agents@c89557f
