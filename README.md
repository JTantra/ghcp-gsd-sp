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
