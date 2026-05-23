# HomelabARR CE — Threat Model

> For incident response procedures, see [docs/ir/](../ir/README.md).


This directory contains the formal threat model for HomelabARR CE, synthesized from 175+ security findings across R1–R12.

## Documents

| File | Contents |
|------|----------|
| [01-asset-inventory.md](01-asset-inventory.md) | Assets, sensitivity, location, ownership |
| [02-trust-boundaries.md](02-trust-boundaries.md) | Trust boundaries with protocol + auth + control mapping |
| [03-data-flow-diagram.md](03-data-flow-diagram.md) | Mermaid DFD showing all flows |
| [04-stride-per-element.md](04-stride-per-element.md) | STRIDE analysis per DFD element |
| [05-attack-trees.md](05-attack-trees.md) | Attack trees for highest-impact assets |
| [06-control-mapping.md](06-control-mapping.md) | Shipped controls → threats mitigated |
| [07-residual-risk.md](07-residual-risk.md) | Accepted/deferred risks |
| [08-framework-crosswalk.md](08-framework-crosswalk.md) | STRIDE → OWASP Top 10 / CWE / ATT&CK / ASVS |

## How to read

1. Start with **01-asset-inventory** to understand what we're protecting
2. Read **02-trust-boundaries** to see where data crosses security perimeters
3. Look at **03-data-flow-diagram** for the visual overview
4. Deep-dive into **04-stride-per-element** for threat-per-component analysis
5. Check **05-attack-trees** for the highest-impact attack paths
6. Verify **06-control-mapping** to confirm every threat has a control
7. Review **07-residual-risk** for what's NOT covered
8. Use **08-framework-crosswalk** to map our STRIDE work to external frameworks

## Review cadence

- **Quarterly:** full re-read by owner + agent, update residual risk table
- **On every new endpoint or asset:** update 01-asset-inventory.md and 04-stride-per-element.md
- **On every new trust boundary:** update 02-trust-boundaries.md and 03-data-flow-diagram.md
- **On every chaos experiment finding:** update 07-residual-risk.md
- **On every new round (R14+):** check whether any threat-model file needs updating

## Last reviewed

| Date | Reviewer | SHA | Changes |
|------|----------|-----|---------|
| 2026-05-23 | initial commit | R13 | First version |
