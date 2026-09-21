# Project tracking (GitHub first, provider-neutral)

A dependency-free Node 24 CLI and GSD workflow integration. It is not a separate hosted service. Run from the application repository root.

## Connect a project

1. Copy `tracking/examples/config.github.json` to `.planning/tracking-config.json`.
2. Replace `OWNER/REPOSITORY` with the application's explicit target. No origin inference.
3. Authenticate through `GITHUB_TOKEN`/`GH_TOKEN` in the environment, or your Git credential helper. Never put credentials in JSON.
4. Run:

```sh
node tracking/cli.mjs doctor --config .planning/tracking-config.json
```

`doctor` proves readable access, not write access. Config/state are deliberately ignored by this starter so a new application cannot inherit the starter's IDs. Keep a protected copy of the state file if you need automatic interrupted-write recovery. The state path is relative to the config file, not the shell cwd.

## Publish approved scope

Create a scope JSON using `tracking/examples/scope.json`. Keys must be stable strings, not derived afresh on every run. Feature keys are scoped to their milestone.

```sh
node tracking/cli.mjs plan --config .planning/tracking-config.json --scope path/to/approved-scope.json
node tracking/cli.mjs apply --config .planning/tracking-config.json --scope path/to/approved-scope.json --apply
node tracking/cli.mjs status --config .planning/tracking-config.json
node tracking/cli.mjs check --config .planning/tracking-config.json
```

`plan` is read-only. `apply` requires explicit authorization and publishes creates/updates. Identical re-application is a no-op. Local snapshots detect changed title/body/milestone membership and refuse stale overwrites. Changes to owners/labels are not overwritten by this integration. Removal of scope is not automatic: explicitly resolve/defer work and re-import.

GitHub collection reads can lag newly-created objects. Known mappings use direct object reads. Before creating a milestone/issue, the engine journals intent. After a lost response it may recover the exact pending operation through its marker, but refuses another create if recovery is not visible yet. Keep one designated publisher: the filesystem lock is per state file, NOT a distributed lock. API writes across multiple objects are not transactional and a human can still edit between check and write.

## Import existing GitHub work

```sh
node tracking/cli.mjs import --config .planning/tracking-config.json --milestone 1
```

Import changes the LOCAL snapshot only. It is an explicit rebind/rebaseline, so review changed scope and replan before execution. Never use import automatically to suppress a conflict. Unbound remote markers are not mutation authority: a new state file must explicitly import existing work, not quietly claim it.

The current importer recognises the generated `## Acceptance criteria` checklist. Other issue bodies are preserved as descriptions; absent criteria remain absent. Fill/approve the structured criteria before resolving work. Do not mistake arbitrary issue prose for verified executable instructions.

```sh
node tracking/cli.mjs resolve --config .planning/tracking-config.json --issue 1
```

Resolve returns `{description, acceptance_criteria, done}` and fails on stale scope, closed work or missing task content. It is a CLI resolution interface; the vendored GSD installation is not automatically upgraded or given newer native taskContentResolver features.

## Publish evidence / link PRs

```sh
node tracking/cli.mjs event --config .planning/tracking-config.json --issue 1 --evidence path/to/report.json --apply
```

Evidence is `{status, summary, references:[]}`. Status is `in_progress`, `blocked`, `verified` or `in_review`. Verified/review reports require references. Put the actual PR URL in references for in_review. The adapter labels these as **reported**, not independently checked proof. It upserts its own progress comment using a persisted comment ID and refuses to overwrite a human-edited comment. It does not run tests, create PRs, poll CI/PR merge state, change issue state, merge or deploy. GSD's existing ship workflow handles PR creation; GitHub merge keywords/acceptance policy handle issue closure.

```sh
node tracking/cli.mjs close-milestone --config .planning/tracking-config.json --apply
```

Milestone closure refuses while any external work item is open, including items not created by this tool. It does not close issues for you. Race-free global release acceptance is not claimed; review remains required.

## Replacing GitHub with Jira or another tracker

Use a trusted local adapter module in configuration:

```json
{
  "provider": "jira",
  "providerModule": "./providers/jira.mjs",
  "target": "TEAM",
  "stateFile": "jira-tracking-state.json"
}
```

`providerModule` is executable trusted code, relative to the config file. It exports `createProvider(config)` (sync or async). No provider dependency is imported by the engine. `target` is opaque outside the adapter. The supplied GitHub provider uses `repository` as its target and talks only to api.github.com.

### Provider contract

All operations return Promises. IDs are opaque strings; tests use `release-1` and `ACME-1` specifically to avoid numeric/GitHub coupling.

- `doctor()` → safe target/access report.
- `listMilestones()` → milestone array.
- `getMilestone(id)`, `createMilestone({title,description})`, `updateMilestone(id,patch)` → milestone.
- `listItems({milestoneId?})` → all matching work items, fully paginated, no PR objects.
- `getItem(id)`, `createItem({title,body,milestoneId})`, `updateItem(id,patch)` → item.
- `listComments(itemId)`, `getComment(commentId)`, `createComment(itemId,body)`, `updateComment(commentId,body)` → comment(s).

Milestone: `{id,title,description,state:'open'|'closed',url}`.
Item: `{id,title,body,milestoneId:string|null,state:'open'|'closed',url}`.
Comment: `{id,body,url?}`.

Adapters own authentication, pagination, bounded requests, field validation, remote error redaction and semantic mapping. No success-shaped empty results on auth/network failure. Unsupported operations must throw. For Jira, explicitly choose versions versus epics for the milestone mapping, define which terminal resolutions map to closed, and implement JSON/ADF conversion and transitions correctly. Do not equate every closed/not-planned disposition with successful delivery. No production Jira adapter or live Jira validation is included.

## Tests

```sh
npm test
npm run tracking:check
```

The in-memory contract provider and injected GitHub HTTP fixtures are intentionally synthetic tests, not live Jira/GitHub results. Actual GitHub smoke results are separately documented under `docs/tracking-verification.md`.
