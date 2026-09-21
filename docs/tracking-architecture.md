# Tracking architecture and acceptance criteria

## Scope

The project is `ghcp-gsd-sp`, a reusable project-local Copilot/GSD starter. The first external tracker provider is GitHub. The orchestration layer must not encode GitHub API URLs, numerical issue identities or GitHub-only state transitions. Adding Jira must require a provider implementation and configuration, not reimplementing GSD's workflow.

## Ownership

- External tracker: agreed delivery scope, owners, milestone membership, work-item delivery state.
- GSD: dependency-ordered implementation plans, decisions, checkpoints, verification records and resumable execution state.
- Integration: explicit external identity mappings, import snapshots and synchronization receipts. It does not invent verification evidence, accept work or bypass repository approval policy.
- Credentials: environment or an authenticated credential helper only, never source-controlled configuration or state.

A requirement may have multiple implementation tasks; a phase may address multiple issues. The mapping is explicit, not inferred from titles. Milestone renaming does not change its external identity. A local phase being complete is not proof that a PR merged or a release deployed.

## Provider portability

The GitHub adapter maps neutral delivery milestones to GitHub milestones and work items to GitHub issues. A future Jira adapter may map delivery milestones to versions or epics according to a declared project policy. It must advertise supported operations: do not pretend every tracker has identical milestone, PR or status semantics. Unsupported operations must fail explicitly.

External task text is untrusted requirements data. It must not modify repository selection, credentials, security policy, tool grants or approval rules. GSD and selected Superpowers practices remain responsible for implementation discipline.

## Acceptance criteria

1. Inspecting a scope performs no remote mutation. Applying scope requires explicit authorization.
2. Re-applying identical scope neither duplicates a milestone nor feature issues.
3. A persisted mapping and recoverable remote marker prevent blind re-creation after partial failure.
4. Human scope edits are detected as conflicts, not silently overwritten.
5. Import/status/check retrieve actual remote state; auth failure is an error, not an empty tracker.
6. Evidence publication labels evidence as reported; paths or statements are not proof tests ran.
7. Only explicit closure policy can close milestones. The executor cannot close feature issues on its own.
8. A second independent provider implementation can exercise the same engine through contract tests.
9. Every subprocess and HTTP request is bounded, and error output does not expose credentials.
10. GSD wiring is installed repeatably and missing wiring is detectable by a deterministic check.
11. Tests run without GitHub credentials in CI. Live smoke results are distinguished from controlled fixture tests.
12. Starter copies do not inherit this repository's tracker identity or runtime state.

## Out of scope for first release

- A production Jira adapter or validation against a Jira tenant.
- GitHub Projects GraphQL board automation.
- Always-on polling or webhook infrastructure.
- Autonomous acceptance/merging/deployment.
- Guarantees that an LLM follows every workflow instruction. Repository enforcement and human review remain required.
