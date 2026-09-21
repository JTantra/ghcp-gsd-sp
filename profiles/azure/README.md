# Azure engineering profile

Framework-independent policy, shared by the GSD and Spec Kit starters. Active by default in these starters, applicable only to Azure-related work. No account/subscription is selected and no resources are deployed.

- `engineering-standards.md`: documentation-first engineering standards and approval boundaries.
- `review-checklist.md`: evidence template; not certification or automatic acceptance.
- `profile.json`: our manifest, not a native GSD/Spec Kit schema.
- `mcp/servers.template.json`: pinned Azure MCP 2.0.5, read-only, explicit guidance-tool allowlist; Microsoft Learn HTTP MCP.
- `skills/azure-engineering/SKILL.md`: shared skill; materialized under `.github/skills/azure-engineering/` for Copilot discovery.

Run `npm run profile:install`, then `npm run profile:check`. Installer preflights and preserves unrelated config; conflicting existing server settings fail visibly for manual review. It changes no global config, signs in nowhere and makes no network calls. It merges project `.mcp.json`, `.github/mcp.json` and `.vscode/mcp.json`; host-specific loading must still be checked in the actual Copilot session. `AGENTS.md` and Copilot instructions reference the policy. GSD additionally injects the skill and grants the scoped `azure/*` server to selected roles. Spec Kit uses its installed engineering preset and extension.

## Verified scope

A real stdio MCP probe of the exact template exposed only the eight allowlisted guidance tools. AI best-practice retrieval succeeded. Microsoft Learn MCP initialization returned HTTP 200. This proves protocol/tool availability in the test environment, NOT subagent inheritance, user authentication to Azure resources, deployment readiness, or agent obedience. Tests and CI check installation/wiring, not application compliance.

No resource-operation or secret-reading tools are exposed by this profile. Read-only alone was not treated as sufficient: an explicit tool allowlist is used. Azure resource inspection/deployment requires a separate scoped configuration, identity and authorization. Do not bypass these boundaries with shell tools.

Azure MCP's observed npm `latest` was a 3.0 beta; this starter deliberately pins stable 2.0.5. Spec Kit is separately pinned. Upgrade pins deliberately, inspect upstream changes and repeat tool-list/protocol tests. The installer is not a blanket overwrite/upgrader for conflicting configurations.

## Portability

Copy `profiles/azure/`, `skills/azure-engineering/` and `scripts/install-profile.mjs` into a consumer repository; merge the npm scripts appropriate to its framework (`--framework gsd` or `--framework speckit`). Keep credentials, deployment targets and customer-specific evidence outside these shared policy files. Removing this profile requires deliberate removal of its marked instruction blocks, role mappings and MCP entries; no destructive uninstall is provided.
