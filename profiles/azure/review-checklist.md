# Azure review checklist

Copy into the feature review artifacts, not into another business backlog. For each item record **passed / failed / not-run / not-applicable**, evidence path/URL, reviewer and explanation. Blank, inferred or unavailable is not passed.

| Area | Required evidence |
| --- | --- |
| Sources | Microsoft Learn pages consulted; actual Azure/AI/Terraform guidance result as applicable; explicit tool-access failures |
| Scope | Approved tracker IDs and criterion-to-task/test mapping; no unresolved requirement drift |
| Architecture | Business requirements, WAF trade-offs, service/region/version availability and explicit exceptions |
| Identity | Authentication + authorization tests; managed identity/RBAC scope or approved fallback |
| Data/security | Trust boundaries, isolation, sensitive-data handling, secret scanning and threat review |
| IaC | Build/validate/lint + applicable policy scan; target-scoped plan/what-if before apply; no deployment inferred from validation |
| Reliability | Timeouts/retries/idempotency, health checks and relevant recovery/restore test |
| Operations | Logs/metrics/traces, redaction, alert/runbook ownership |
| Cost | Usage/SKU assumptions, estimate source, scaling bounds and teardown ownership |
| AI (if applicable) | Model suitability, actual evaluation/safety/latency/cost results and tool-abuse tests |
| Delivery | Actual tests and independent review; approved changes; rollback and post-deployment evidence if deployment occurred |

## Decision

- Outcome: blocked / changes-requested / ready-for-review / approved-by-human
- Outstanding items and owners:
- Exceptions, rationale and approver:
- PR / commit / CI references:
- Deployment performed: no / yes (approved target and receipt required)

A checklist or converged specification does not independently establish Azure compliance, human acceptance or production release.
