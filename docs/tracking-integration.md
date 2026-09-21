# GSD integration

## Installed path

This starter's existing GSD runtime reports version 1.11.0. It has not been replaced with an untested latest release.

`npm run tracking:install` installs marked, idempotent instruction blocks into twelve existing project-local workflows and AGENTS.md, and merges `skills/tracker-awareness` into six agent skill mappings. `npm run tracking:check` verifies the exact expected blocks and mappings; it fails if a GSD update removed or changed them. Existing instructions/settings outside our blocks are preserved. The installer preflights all required files before writing. It never changes global Copilot configuration or publishes to a tracker.

Workflows: onboard, new-project, new-milestone, discuss-phase, plan-phase, execute-phase, verify-work, ship, progress, resume-project, audit-milestone and complete-milestone. Capture follow-up policy is in AGENTS.md. Agents: roadmapper, planner, plan-checker, executor, verifier and code-reviewer. Existing Superpowers skill content is unchanged.

The three new Copilot skills are `tracker-connect`, `tracker-sync` and `tracker-status`. Existing GSD commands read the workflow blocks; users need not learn a second orchestration loop. Publishing still requires explicit authorization. Automatic acceptance, issue closure and deployment are deliberately absent.

## Why not rely exclusively on capability hooks?

`.gsd/capabilities/project-tracking/capability.json` supplies an OPTIONAL native context-contribution overlay. It is validated against the vendored GSD manifest and loop-role contract. Native overlay activation/consent is machine-local and is NOT assumed or forged by this starter. The installed marked workflow path is the baseline integration, so missing overlay consent does not silently remove our lifecycle instructions.

Native contributions are contextual instructions, not extra remote writers. When both paths are active they reference the same tracker-awareness contract. Milestone/onboarding/resume lack all of the normal five-step loop extension points, hence the maintained installer blocks. Re-run the installer and its check after a GSD upgrade; never blindly overwrite upstream workflows wholesale.

A newer upstream native taskContentResolver seam exists, but this starter does not pretend it is installed or compatible merely because documentation exists. Use the tested `tracking/cli.mjs resolve` entry point from the installed workflow instructions. A future runtime upgrade can bind that CLI through the new resolver seam after compatibility tests.

## Per-application setup

Keep the application in its own repo. Install GSD locally, copy the integration components (`tracking/`, `scripts/install-tracking.mjs`, `skills/tracker-awareness/`, `.github/skills/tracker-*/`, optional capability), then run the installer from that application root. Preserve existing `.planning/config.json`; never copy another project's requirements/state. Merge the npm test/installation scripts if the application already has package.json. Use Node 24.

Configure `.planning/tracking-config.json` for that application's tracker. No configuration means no remote calls. Do not ship the starter's .runtime or tracking-state files with an application. After `/gsd-onboard`, approve the scope and use tracker-connect/sync before executing linked work. GitHub issues may be imported or approved GSD requirements may be published. Features are not forced to equal phases or atomic coding tasks.

GitHub is the first provider only. All workflow instructions call the same CLI using the configured provider; Jira-specific identities, REST endpoints and transitions belong in a provider adapter, not these workflows. See `tracking/README.md` for the contract.

## Verification boundaries

- Automated tests exercise the CLI, provider contract, GitHub request mapping, state persistence, conflict detection and repeatable installer.
- Direct live GitHub reads/writes exercise the first provider separately.
- Agent skill resolution can be checked using the vendored GSD query command.
- We do NOT claim an interactive Copilot/GSD session or headless coding-agent run has faithfully executed every new instruction. Model choices, tool grants and machine-local capability consent still need a rehearsal.
- CI checks wiring and test behaviour. It is not a branch-protection rule and does not independently enforce human acceptance. Configure required checks and reviews for the application repository.
- No distributed publisher locking, webhook daemon, PR/CI polling, production Jira adapter or Projects board automation is included.
