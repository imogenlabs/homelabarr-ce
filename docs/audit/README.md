# Security Audit Rounds

> For incident response, see [docs/ir/](../ir/README.md).


| Round | Topic | Findings | Status |
|-------|-------|----------|--------|
| R1 | Server auth, defaults, headers | 32 | shipped |
| R2 | Frontend XSS / CSP | 14 | shipped |
| R2.5 | Auth migration drift | 3 | shipped |
| R3 | Auth lifecycle | 12 | shipped |
| R4 | Container hardening | 14 | shipped |
| R5 | Supply chain | 13 | shipped |
| R6 | Observability + audit log | 12 | shipped |
| R7 | Secrets + encryption-at-rest | 12 | shipped |
| R8 | Deployment runbook | 13 | shipped |
| R9 | DAST + ZAP baseline | 13 | shipped |
| R9.5 | DAST completion | 10 | shipped |
| R9.6 | Final route gating | 5 | shipped |
| R9.7 | Deploy-branch meta | resolved | closed |
| R10 | Pentest harness + ATT&CK | 15 atomics | shipped |
| R10.5 | CI gate + MITRE + honey | 3 | shipped |
| R10.6 | Honey events not emitting | 3 | shipped |
| R10.7 | Remove nginx interception | 1 | shipped |
| R11 | Compliance posture | 5 files | shipped |
| R11.5 | Evidence script gaps | 2 | shipped |
| R12 | Chaos engineering | 8 experiments | shipped |
| R13 | Threat-model formalization | 9 files | shipped |
| R14 | Incident response runbook | 10 playbooks | shipped |
| R15 | Dependency & supply-chain freshness governance | 7 | shipped |
| R16 | Continuous-evidence binder rebuild | 9 | shipped |
| R17 | Public-disclosure surface audit | 10 | shipped |
| R17.5 | Redeploy correction | 0 (deploy gap) | shipped |
| R18 | Wiki + public docs surface audit | 9 | shipped |
| R19 | Runtime contract + build-time hardening | 8 | shipped |

**Total findings shipped to production: 218+**
