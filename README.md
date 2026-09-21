# ghcp-gsd-sp

## Shared Azure engineering profile

The Azure profile is now installed under `profiles/azure/`, with the shared `skills/azure-engineering/` skill, selected GSD role wiring and an idempotent installer. Microsoft Learn is registered separately from pinned Azure MCP **2.0.5**. Azure MCP uses `--read-only` and an explicit eight-tool guidance/template allowlist: it does not expose deployment, resource enumeration, secret reads or account changes.

```sh
npm run profile:install
npm run profile:check
npm test
```

See [profile standards and activation](profiles/azure/README.md), [review checklist](profiles/azure/review-checklist.md) and [verification](docs/azure-profile-verification.md). Application-specific Azure targets and credentials are deliberately absent. The profile prefers Azure for an agreed Azure workload; it does not authorize migrating unrelated applications.

The separate [ghcp-speckit-sp starter](https://github.com/JTantra/ghcp-speckit-sp) uses the same Azure policy and tracking engine, with Spec Kit-native extension/preset integration instead of GSD. Shared code is copied, not automatically synchronized. Original selected Superpowers skill license: [MIT notice](licenses/superpowers-skills-LICENSE).

## Pluggable project tracking

GitHub milestones and feature issues can now be linked to GSD execution through a provider-neutral Node 24 CLI. GitHub is implemented; Jira/other tools plug in through a local adapter contract, without rewriting the engine or workflow instructions.

- [Tracking quick start and provider contract](tracking/README.md)
- [GSD integration and installation](docs/tracking-integration.md)
- [Architecture and acceptance criteria](docs/tracking-architecture.md)
- [Verification results and boundaries](docs/tracking-verification.md)

```sh
npm test
npm run tracking:check
```

Use `/tracker-connect`, `/tracker-sync`, `/tracker-status` in Copilot, or run the documented `node tracking/cli.mjs` commands directly. Tracking is OFF until an application-specific `.planning/tracking-config.json` is created. No credentials, external IDs or starter runtime state should be copied to another application.

The integration adds marked instructions to 12 workflows, tracker-awareness to six agent-role skill mappings, and three new skills. Selected Superpowers practices remain unchanged. Native capability metadata is optional; the tested installer wiring does not depend on machine-local capability consent. Interactive agent obedience and headless execution still require rehearsal.

---

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


## Agent frontmatter schema

GitHub Copilot's `.agent.md` front matter defines exactly four properties:

| Property | Required | Notes |
|---|---|---|
| `name` | No | Display name in the agent picker; defaults to filename |
| `description` | **Yes** | Shown on hover |
| `model` | No | Falls back to the model picker selection |
| `tools` | No | **Omitting it enables ALL tools** — an empty-ish list is not the safe default |

All 34 agents here conform to exactly these four. `color:` was removed — GSD's
Copilot converter emits it, but it is a Claude-ism with no meaning in Copilot
(GSD itself strips `color` when converting for Cursor and OpenCode).

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

## MCP servers

`.mcp.json` (Copilot CLI) and `.vscode/mcp.json` (VS Code) register four servers:

| Server | Type | Purpose |
|---|---|---|
| `context7` | http | Library/framework API docs — real signatures, not recalled ones |
| `mslearn` | http | Azure / Microsoft service docs and best practices |
| `playwright` | stdio | Real-browser visual testing (`--caps=vision --browser=msedge --isolated`) |
| `gsd` | stdio | GSD's own server: `gsd_invoke_command`, `gsd_read_state`, `gsd_write_state` |
| `atlassian` | *(add when needed)* | Confluence/Jira publishing |

**`--isolated` is deliberate.** GSD runs execution waves in parallel, and browser
MCP servers hold an exclusive lock on their profile dir — a second instance dies
with "browser is already running". GSD cannot fix this for you; the flag belongs
on your MCP registration.

## Per-agent MCP grants

Grants follow the work, not the org chart — an agent gets a server only if its
job needs the outside world.

| Grant | Agents | Why |
|---|---|---|
| context7 + mslearn | planner, executor, all researchers, framework-selector, debugger, security-auditor, intel-updater | Writing/planning against real APIs; wrong signatures are the expensive failure |
| context7 only | code-fixer, code-reviewer, verifier, integration-checker, eval-planner | Verify code against real contracts; no need for MS service docs |
| mslearn only | roadmapper | Capability/sequencing questions, not API-level |
| playwright | ui-checker, ui-auditor, ui-researcher | Only agents that should drive a browser |
| atlassian | doc-writer, doc-synthesizer, doc-classifier, doc-verifier | Only agents that should write to a wiki |
| **none** | codebase-mapper, pattern-mapper, plan-checker, research-synthesizer, assumptions-analyzer, nyquist-auditor, eval-auditor, mempalace-curator, user-profiler, debug-session-manager | Read the repo or other agents' output — external fetch is latency and injection surface with no upside |

Least privilege is the point: `gsd-executor` cannot publish to Confluence,
`gsd-doc-writer` cannot drive a browser, and the ten local-only agents cannot
reach the network at all.

### Two upstream bugs fixed here

`gsd-nyquist-auditor` and `gsd-security-auditor` shipped with
`tools: ['- read']` — a stray list dash inside a YAML flow sequence, which
parses as one tool literally named `- read`. Both agents were effectively
tool-less: nyquist-auditor is *supposed* to write and run tests, and
security-auditor to grep the codebase. Repaired to real tool lists.

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
