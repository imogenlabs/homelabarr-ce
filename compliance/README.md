# Compliance Posture — HomelabARR CE

This directory maps the security controls shipped in HomelabARR CE against three industry frameworks.

## Scope

This attestation covers the code, container images, and runtime configuration shipped by this repository. It does NOT cover:

- Host operating system configuration (operator responsibility)
- Network infrastructure (firewalls, DNS, CDN — operator responsibility)
- Vendor risk management (N/A for open-source)
- Business continuity planning (operator responsibility)
- FIPS cryptographic module certification (out of scope for OSS; Node.js crypto used)
- PCI-DSS, HIPAA, SOC 2 (regulated environments are operator-attested)

## Frameworks Traced

| Framework | File | Controls in Scope |
|-----------|------|-------------------|
| CIS Docker Benchmark v1.6.0 | [cis-docker-v1.6.0.md](cis-docker-v1.6.0.md) | ~25 (Sections 4-5) |
| OWASP ASVS v4.0.3 Level 2 | [owasp-asvs-v4.0.3-L2.md](owasp-asvs-v4.0.3-L2.md) | ~110 requirements |
| NIST CSF 2.0 | [nist-csf-2.0.md](nist-csf-2.0.md) | 6 functions |

## Evidence

Evidence snapshots are collected by `collect-evidence.sh` and stored in `evidence/`. They run:
- Nightly via CI (`.github/workflows/compliance-evidence.yml`)
- On every tagged release
- On demand via `bash compliance/collect-evidence.sh`

## Attestation Chain

This is **self-attested** by the project maintainers. Independent third-party audit is out of scope for the open-source project. Operators deploying under regulated regimes must perform their own attestation using the evidence artifacts provided here.

## Threat Model

See [SECURITY.md](../SECURITY.md) for the full threat model, deployment topologies, and incident response procedures.
