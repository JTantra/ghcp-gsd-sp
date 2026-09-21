<!-- GSD Configuration — managed by gsd-core installer -->
# Instructions for GSD

- Use the gsd-core skill when the user asks for GSD or uses a `gsd-*` command.
- Treat `/gsd-...` or `gsd-...` as command invocations and load the matching file from `.github/skills/gsd-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply GSD workflows unless the user explicitly asks for them.
- After completing any `gsd-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
<!-- /GSD Configuration -->

<!-- azure-profile:begin -->
## Azure engineering profile
For Azure work, read skills/azure-engineering/SKILL.md and profiles/azure/engineering-standards.md before planning or code changes. Use Microsoft Learn and the configured read-only Azure guidance MCP; report unavailable tools rather than silently skipping required guidance. Apply profiles/azure/review-checklist.md with real evidence. Azure is the preferred cloud for an agreed Azure workload, not permission to migrate unrelated applications. No cloud writes, auth changes or secret reads are authorized by installing this profile.
<!-- azure-profile:end -->
