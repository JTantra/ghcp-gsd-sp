---
name: azure-engineering
description: Apply the enabled Azure engineering profile during research, planning, implementation and review of Azure workloads.
---

Read profiles/azure/engineering-standards.md and profiles/azure/review-checklist.md before Azure design/code/operations. The active profile is recorded in profiles/active.json. If Azure is not relevant, do not force a cloud rewrite or make Azure calls.

Consult Microsoft Learn through mslearn. Discover Azure MCP's available guidance tools through azure; get general best practices before Azure work, AI application best practices for ANY AI component, and Terraform-specific guidance before Terraform. Never guess a tool name: inspect the server's schema. Record consulted URLs and actual tool results in the feature's planning/review artifacts. If the required guidance is unavailable, report the blocker; do not claim it was consulted.

The shipped Azure MCP is read-only and restricted to an explicit guidance-tool allowlist. It cannot deploy the application. Keep user confirmation enabled. Do not bypass it through shell/CLI or add other resource namespaces without explicit scoped approval. Tools available to the parent may not be inherited by subagents: verify actual lookup in the agent session; absent tools are a visible blocker for the affected Azure task.

Planning: document alternatives, identity/data boundaries, WAF trade-offs and costs; prefer supported GA capabilities, explain exceptions. Execution: use the approved design, test-first changes, no secrets in source, explicit environment targets. Review: evaluate actual tests/configuration, not checkbox assertions. Use the checklist with passed/failed/not-run/not-applicable verdicts and reasons. Missing evidence is not a pass.

The framework owns orchestration. This skill does not spawn an independent competing agent loop. Publication/acceptance/deployment remain separate human decisions.
