# Azure profile verification

## Executed

- Node 24.16.0 on WSL Ubuntu: **28 tests passed** (existing tracker/GSD coverage plus Azure installer/config regressions).
- `npm run profile:check`: pass; repeat installation and check are idempotent.
- `npm run tracking:check`: pass; existing 12-workflow / six-tracking-role integration retained.
- Planner skill query returned the shared Azure skill alongside existing craft/tracker skills.
- Existing GitHub target doctor probe: readable; no new GSD issue publication was required.
- Real Azure MCP 2.0.5 stdio initialization and tools/list matched exactly the eight configured guidance/template tools. AI application best-practices invocation returned guidance successfully. No Azure resources, credentials, subscriptions or secrets were queried or changed.
- Microsoft Learn MCP initialize handshake: HTTP 200.
- Shared profile/installer/skill and tracker CLI/engine/provider parity with ghcp-speckit-sp checked by SHA-256 (ten files identical).
- Independent source review passed after regression-tested fixes; see engineering-review.json.

The profile registers Microsoft Learn separately and adds a pinned, read-only, explicit-tool allowlisted Azure MCP server. Namespace filtering alone did not expose the intended general guidance API in the initial probe; the final allowlist was tested against live tool discovery. Broad read-only discovery alone was not used as the safety boundary.

## Reproduce local checks

```sh
npm test
npm run profile:check
npm run tracking:check
node .github/gsd-core/bin/gsd-tools.cjs query agent-skills gsd-planner
```

Actual GitHub Actions run status is on this repository's Actions tab. Tests/checks are deterministic; live MCP availability depends on the host/network and tool consent.

## Not established

No Azure deployment, subscription access, resource-policy compliance scan, live Jira adapter, full application-level Copilot/GSD rehearsal or guarantee of agent obedience. Prompt instructions and role grants are not an independent sandbox. Consuming repositories must apply their own protected-branch/review and deployment approval policies. No credentials, application targets or active tracker state should be copied from this checkout.
