# Tracking verification

## Executed checks

- `npm test`: **24 passed, 0 failed** under WSL Node 24.16.0.
- `npm run tracking:check`: expected integration present in **12 workflows and six agent-role skill mappings**.
- `node --check`: CLI, engine, GitHub provider and installer parse successfully.
- Native GSD manifest and loop-role contract validation pass for the optional project-tracking manifest.
- Vendored `query agent-skills` resolved tracker-awareness for planner, executor and verifier alongside their existing skills. A warning about global defaults being superseded by project configuration was observed; no global settings were changed.
- Independent read-only review through GitHub Copilot CLI (GPT-5.4), no tool access, reviewed source supplied in prompt. Findings were reproduced with failing tests, fixed, and re-reviewed. Final parsed verdict: passed; no outstanding security/logic findings in reviewed paths.

## Real GitHub execution

Repository: https://github.com/JTantra/ghcp-gsd-sp (private).

The implemented CLI created the delivery milestone and work items below:

- https://github.com/JTantra/ghcp-gsd-sp/milestone/1
- https://github.com/JTantra/ghcp-gsd-sp/issues/1 — provider-neutral core
- https://github.com/JTantra/ghcp-gsd-sp/issues/2 — GitHub provider
- https://github.com/JTantra/ghcp-gsd-sp/issues/3 — GSD integration

Repeated apply preserved the IDs; a subsequent plan returned zero operations. Status/check read actual GitHub objects and reported no scope drift. Resolve returned the actual linked requirement/acceptance criteria. Repeated evidence publication returned the same adapter-owned comment ID. Attempting milestone closure while work remained open returned nonzero and did not close the milestone.

The live run exposed collection-list lag after issue creation. A regression test was added; known identities now use direct reads and uncertain creates are journaled before writes. Pending operations are retained for ambiguous transport failures and cleared for definite rejected writes. Recovery tests include a lost response and a still-empty collection listing.

Issues remain open for acceptance; a reported test result is not a user acceptance decision.

## Controlled tests, not live service claims

In-memory provider tests use opaque nonnumeric IDs to exercise the same engine without GitHub assumptions. A trusted local module is loaded through the CLI to prove provider substitution. GitHub HTTP fixtures test request/response normalization, pagination, error redaction and rejecting cross-origin continuation links. These fixtures are synthetic and are not described as live Jira or network results.

Additional regression coverage: human edits, spoofed marker/comment handling, explicit import/rebind, invalid keys, scope expansion with closed work, all-remote-items milestone checks, explicit write authorization, local locking, project identity mismatch, installer repeatability and missing integration detection.

## Not established

- A production Jira adapter or a Jira tenant round trip.
- Interactive GSD/Copilot end-to-end obedience to the new workflow instructions, native overlay consent on another machine, or headless coding-agent execution.
- Distributed locking, globally transactional synchronization, GitHub Projects automation, continuous PR/CI monitoring, automatic merge or deployment.
- Repository branch protection merely because CI is checked in.

Run the tests again after modifying code or upgrading GSD. CI results on GitHub are additional evidence, not implied by local execution.
