.PHONY: up down restart logs backup restore-drill encrypt-db rotate-jwt rotate-sqlcipher danger-wipe evidence compliance-binder verify

up:              ; docker compose up -d
down:            ; docker compose down
restart:         ; docker compose restart
logs:            ; docker compose logs -f --tail 200
backup:          ; bash scripts/backup.sh
restore-drill:   ; bash scripts/restore-drill.sh
encrypt-db:      ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key
rotate-jwt:      ; bash scripts/rotate-jwt-key.sh
rotate-sqlcipher: ; bash scripts/rotate-sqlcipher-key.sh

evidence:        ; bash compliance/collect-evidence.sh
compliance-binder: ; bash compliance/build-binder.sh
verify:
	@jq -e '.bad == 0' compliance/evidence/R6-audit-chain.txt > /dev/null 2>&1 || { echo "FAIL: audit chain broken"; exit 1; }
	@grep -qi "verified" compliance/evidence/R5-cosign.txt 2>/dev/null || { echo "FAIL: cosign verify failed"; exit 1; }
	@echo "verify: OK"

danger-wipe:
	@echo "WARNING: This will DELETE all Docker volumes — DB, audit history, config."
	@echo "Have you backed up ./secrets/ and the latest DB snapshot OFF-HOST? (yes/NO)"
	@read CONFIRM; [ "$$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }
	docker compose down -v
