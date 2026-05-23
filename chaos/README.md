# Chaos Engineering — HomelabARR CE

Resilience experiments proving R1-R11 security controls hold when infrastructure fails.

## Experiments

| # | Name | Fault | Key control tested |
|---|------|-------|--------------------|
| 01 | Pod kill backend | `docker kill backend` | R6 audit continuity, R10 honey pipeline |
| 02 | Disk pressure | Fill tmpfs to 95% | R6 audit write, R8 backup |
| 03 | Network partition | `iptables` drop between backend and nginx | User-facing 502, R6 audit buffer |
| 04 | Memory exhaustion | `stress-ng --vm` to cgroup limit | OOMKill behavior, R7 secret leak in crash |
| 05 | Time skew | `date -s +1h` in container | JWT exp, rate-limit windows, audit timestamps |
| 06 | Rapid restart | Kill/restart 5x in 60s | R6 chain continuity, R7 secrets in env |
| 07 | Cold cache burst | 50 req/s to /api/auth/login | R1 rate-limit, R6 persistent store |
| 08 | Crash log scan | Post-mortem scan of docker logs | R7 secret leak detection |

## Running

```sh
# Single experiment
bash chaos/experiments/01-pod-kill-backend.sh

# All experiments (30 min)
for f in chaos/experiments/0*.sh; do bash "$f"; done
```

## Evidence

After each experiment, run `bash compliance/collect-evidence.sh` and diff against the pre-chaos evidence bundle.
