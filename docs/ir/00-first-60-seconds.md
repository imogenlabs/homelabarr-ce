# First 60 seconds

You just got paged or saw a red light. Before you do anything else:

1. **Acknowledge** the alert so it doesn't keep paging.
2. **Identify the trigger.** What sensor fired?
   - R6 audit-chain bad > 0 → [PB-01](playbooks/PB-01-audit-chain-break.md)
   - R10 honey emission → [PB-02](playbooks/PB-02-honey-route-hit.md)
   - Cosign verify fail → [PB-03](playbooks/PB-03-cosign-verify-fail.md)
   - Auth burst / rate limit → [PB-04](playbooks/PB-04-rate-limit-burst.md)
   - SLO burn → [PB-05](playbooks/PB-05-slo-error-budget-burn.md)
   - Container restart storm → [PB-06](playbooks/PB-06-container-restart-storm.md)
   - Backup/restore fail → [PB-07](playbooks/PB-07-backup-restore-fail.md)
   - External disclosure → [PB-08](playbooks/PB-08-disclosed-vuln.md)
   - Secret leak → [PB-09](playbooks/PB-09-credential-leak.md)
   - Time skew → [PB-10](playbooks/PB-10-time-skew-detected.md)
   - Unknown → default to "Investigating"
3. **Open the incident channel:** write "INCIDENT START <UTC time> — <trigger> — investigating"
4. **Don't fix yet. Observe.** What is the user-visible impact right now?
5. **Snapshot evidence BEFORE changing state:**
   ```sh
   docker ps -a > /tmp/inc-$(date +%s)-ps.txt
   bash compliance/collect-evidence.sh
   ```
6. **Pick a playbook.** Open the corresponding PB-NN file.

Do NOT restart containers, rotate credentials, or block IPs in the first 60 seconds.
