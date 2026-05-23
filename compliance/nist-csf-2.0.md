# NIST CSF 2.0 — HomelabARR CE Alignment

Scope: code shipped in this repository. Operator-responsibility items (BCP, vendor mgmt, awareness training) are NOT in scope and are explicitly delegated to the deploying operator.

## GV — GOVERN

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| GV.OC-01 Organizational mission | [N/A] | OSS project, no org |
| GV.RM-01 Risk strategy | [Met] | SECURITY.md states risk posture |
| GV.PO-01 Cybersecurity policy | [Met] | SECURITY.md + .well-known/security.txt |
| GV.SC-01 Supply chain risk mgmt | [Met] | R5 SBOM + cosign + dependabot + SHA-pinned actions |

## ID — IDENTIFY

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| ID.AM-01 Hardware inventory | [N/A] | Containerized |
| ID.AM-02 Software inventory | [Met] | SBOM via syft attached to releases |
| ID.RA-01 Vulnerabilities identified | [Met] | Trivy weekly, OSV-Scanner, Dependabot daily |
| ID.RA-05 Threats identified | [Met] | R10 ATT&CK matrix coverage (16 techniques) |

## PR — PROTECT

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| PR.AA-01 Identities issued | [Met] | R3 user management with MFA |
| PR.AA-03 Authentication enforced | [Met] | requireAuth middleware, R10 T1078 atomic |
| PR.AA-05 Access permissions managed | [Met] | requireRole middleware, admin gates (R9.6) |
| PR.DS-01 Data at rest protected | [Met] | R7 SQLCipher AES-256 |
| PR.DS-02 Data in transit protected | [Met] | TLS 1.2+ via Cloudflare, HSTS preload |
| PR.IR-01 Resources protected | [Met] | R4 container hardening (cap-drop, read-only, pids-limit) |
| PR.PS-01 Configuration management | [Met] | Compose pinned, R5 SHA-pinned actions |
| PR.PS-02 Software maintained | [Met] | Dependabot + weekly scans |

## DE — DETECT

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| DE.CM-01 Network monitored | [Met] | Honey routes (R10.7) emit T1595.002 audit events |
| DE.CM-03 Personnel activity monitored | [Met] | R6 hash-chained audit log |
| DE.CM-09 Computing hardware monitored | [N/A] | Containerized; no host-level agent |
| DE.AE-02 Adverse events analyzed | [Met] | attackTag middleware (R10.5) — mitre_tid on events |
| DE.AE-03 Information correlated | [Met] | Hash-chained audit log (R6) — tamper-evident |
| DE.AE-06 Threat intelligence used | [Partial] | ATT&CK mapping done; no live STIX/TAXII feed |

## RS — RESPOND

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| RS.MA-01 Incident response plan | [Met] | docs/INCIDENT-RESPONSE.md |
| RS.MA-02 Reports triaged | [Met] | security.txt with disclosure policy (R6) |
| RS.AN-03 Forensics performed | [Met] | Audit log chain provides timeline |
| RS.CO-02 Stakeholders notified | [Partial] | Webhook alerts (R6) — manual escalation |

## RC — RECOVER

| Subcategory | Status | Evidence |
|-------------|--------|----------|
| RC.RP-01 Recovery plan executed | [Partial] | R8 backup.sh + restore drill spec; no recorded drill |
| RC.RP-02 Recovery actions taken | [Met] | backup.completed / restore.drill audit events |
| RC.RP-03 Integrity verified | [Met] | Audit chain verification on boot (R6) |
