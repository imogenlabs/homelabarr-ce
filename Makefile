.PHONY: up down restart logs backup restore-drill encrypt-db rotate-jwt rotate-sqlcipher danger-wipe

up:              ; docker compose up -d
down:            ; docker compose down
restart:         ; docker compose restart
logs:            ; docker compose logs -f --tail 200
backup:          ; bash scripts/backup.sh
restore-drill:   ; bash scripts/restore-drill.sh
encrypt-db:      ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key
rotate-jwt:      ; bash scripts/rotate-jwt-key.sh
rotate-sqlcipher: ; bash scripts/rotate-sqlcipher-key.sh

danger-wipe:
	@echo "WARNING: This will DELETE all Docker volumes — DB, audit history, config."
	@echo "Have you backed up ./secrets/ and the latest DB snapshot OFF-HOST? (yes/NO)"
	@read CONFIRM; [ "$$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }
	docker compose down -v
