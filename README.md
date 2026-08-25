# ghcp-gsd-sp

GSD Core as the orchestrator, Superpowers as the craft standards, on GitHub Copilot CLI.
Both installed **project-local** — nothing is written to `~/.copilot/`.

## Layout

| Path | What |
|---|---|
| `.github/skills/` | 71 GSD skills (`/gsd-*` commands) |
| `.github/agents/*.agent.md` | GSD's purpose-built subagents |
| `.github/gsd-core/bin/gsd-tools.cjs` | GSD CLI backend |
| `.github/hooks/gsd-session.json` | Copilot `sessionStart` hook |
| `skills/` | 11 vendored Superpowers skills |
| `.planning/config.json` | Workflow toggles + `agent_skills` injection map |
| `AGENTS.md` | Copilot primary instructions (GSD-generated) |

## The composition

GSD owns **dispatch topology** — the Discuss → Plan → Execute → Verify → Ship loop,
dependency-analysed parallel waves, orchestrator context budgeting, and the durable
artifacts (`STATE.md`, `CONTEXT.md`, roadmaps, phase dirs).

Superpowers supplies **prompt content** — the standards each GSD agent codes to,
injected at spawn time via `agent_skills`.

This works because Superpowers' specialisation lives in prompts while GSD's lives in
agent identity, so the content slots into the identity with no contest over dispatch.

### Injection map

| GSD agent | Superpowers skills |
|---|---|
| `gsd-executor` | test-driven-development, testing-anti-patterns, condition-based-waiting, verification-before-completion |
| `gsd-planner` | preserving-productive-tensions, when-stuck |
| `gsd-code-reviewer` | requesting-code-review, receiving-code-review |
| `gsd-verifier` | verification-before-completion, defense-in-depth |
| `gsd-debugger` | systematic-debugging, root-cause-tracing |
| `gsd-code-fixer` | root-cause-tracing, test-driven-development |

## Deliberately NOT ported

`subagent-driven-development` is a *dispatch strategy*, not a standard — sequential,
one subagent per task, review gate between every task. GSD already has a strictly more
capable one (dependency waves + worktree isolation + orchestrator context budgeting).
Installing both would put two orchestrators in contest for the same turn.

Need Superpowers' sequential shape? GSD does it natively:
`/gsd-execute-phase --interactive`.

## Runtime caveat

GSD's `global:<plugin>:<skill>` injection form is **Claude Code only** — on every other
runtime the entry is skipped with a warning. That is why Superpowers is vendored into
`skills/` and referenced by project-relative path, which resolves on all runtimes.

Consequence: updating Superpowers is a manual re-vendor, not a plugin update.

## Verify

```bash
node .github/gsd-core/bin/gsd-tools.cjs query agent-skills gsd-executor
```

Expect an `<agent_skills>` block listing the four `@skills/...` includes.
A path that does not resolve prints `[agent-skills] WARNING: Skill not found`.

## Start

```bash
copilot          # then:
/gsd-new-project # greenfield
/gsd-onboard     # existing codebase
```


## Per-agent model routing

Each `.github/agents/*.agent.md` carries a `model:` frontmatter line, so agents
run on different models by role:

| Tier | Count | Agents |
|---|---|---|
| `Claude Opus 5 (copilot)` | 20 | planning, research, synthesis, debugging, doc authoring |
| `GPT-5.3-Codex (copilot)` | 11 | executor, code-fixer, code-reviewer, verifier, checkers, auditors |
| `Gemini 3.1 Pro (Preview) (copilot)` | 3 | ui-researcher, ui-checker, ui-auditor |

Reasoning-heavy work goes to Opus, mechanical implementation/verification to
Codex, visual work to Gemini.

Alternative (provider-neutral, no file edits) — `.planning/config.json`:

```json
{ "model_profile": "balanced",
  "model_overrides": { "gsd-executor": "opus", "gsd-planner": "haiku" } }
```

`model_overrides` accepts `opus`/`sonnet`/`haiku`/`inherit` or a fully-qualified
model ID. v1.42+ also has `model_policy` with provider presets. Frontmatter is
used here to match the ghcp-gsd convention and pin exact Copilot model names.

## MCP persistence

`.mcp.json` registers project-local MCP servers. Agents opt in via the `tools:`
frontmatter array, which accepts MCP glob patterns — the shipped agents already
use this for context7.

```
tools: ['read', 'edit', ..., 'atlassian/*', 'mcp__atlassian__*']
```

Granted to the four doc agents only (`gsd-doc-writer`, `gsd-doc-synthesizer`,
`gsd-doc-classifier`, `gsd-doc-verifier`) — least privilege: the executor has no
reason to write to a wiki.

Flow: `/gsd-docs-update` → `gsd-doc-writer` explores the codebase, writes the
doc, then pushes it via the Atlassian MCP tools in the same turn.

The `gsd` MCP server is also registered, exposing `gsd_invoke_command`,
`gsd_read_state`, `gsd_write_state` so an MCP-capable host can drive GSD
directly.

**Auth caveat:** the Atlassian entry uses `mcp-remote`, which opens a browser
OAuth flow on first use. Run it once interactively before relying on it in an
unattended run.

## Cloud (Copilot coding agent) caveat

Everything here is repo-committed, and `agent_skills` has an agent-side
self-load path (ADR-1866) that works without orchestrator injection — so the
composition reaches cloud agents.

What does not port: GSD's phase gates use `AskUserQuestion`, and the cloud agent
has no human to answer. For unattended runs:

```bash
gsd config-set workflow.skip_discuss true
gsd config-set workflow.text_mode true
gsd config-set workflow.auto_advance true
```

Practical split: **plan locally** (needs your decisions), **execute in cloud**
from a pre-approved plan. See `docs/how-to/drive-gsd-from-a-tracker-issue.md`.
