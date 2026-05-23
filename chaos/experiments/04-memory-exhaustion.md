# Experiment 04-memory-exhaustion — Memory exhaustion

## Hypothesis (steady state)
Before fault: audit chain integrity = 0 bad events, /api/health = 200, login p95 < 200ms.

## Method
```sh
stress-ng --vm 1 --vm-bytes 700M
```
Time-boxed: 5 minutes maximum. Blast radius: single container.

## Expected behavior under chaos
- R6 audit chain: events may be delayed but not lost; chain validates post-recovery
- R8 backup: unaffected (runs on cron, not during fault window)
- R10 attackTag: honey routes resume emitting on recovery
- User-facing: OOMKill behavior, secret leak in crash logs

## Steady-state recovery check
60s after fault clears:
1. `curl -s https://ce-demo.homelabarr.com/api/health` returns `{"ok":true}`
2. `bash compliance/collect-evidence.sh` produces R6-audit-chain.txt with bad=0
3. Honey probe `curl -s https://ce-demo.homelabarr.com/wp-login.php` returns 9-byte "Not Found"

## Run log
*To be filled after first execution.*
