# Compliance Posture — Update Cadence

- **Quarterly review:** Full re-trace against current versions of CIS Docker, ASVS, NIST CSF. Owner: maintainer.
- **Per-release:** `collect-evidence.sh` runs on every `release: published`. Evidence stored as workflow artifact + tagged in releases page.
- **Per-PR:** Pentest harness (R10.5) blocks merge if any control regresses. Compliance traces are descriptive — the harness is enforcing.
- **External attestation:** This is self-attested. Independent audit is OUT OF SCOPE for the OSS project. Operators deploying under regulated regimes must perform their own attestation.
