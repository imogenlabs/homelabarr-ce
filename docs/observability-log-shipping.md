# Log Shipping (Optional)

HomelabARR CE emits structured JSON logs to stdout (backend) and rotated JSONL audit files to `/app/server/activity-data/`.

To ship these to a centralized log backend (Loki, OpenSearch, etc.), add a log forwarder as a sidecar:

## Example: Vector → Loki

Add to `docker-compose.override.yml`:

```yaml
services:
  vector:
    image: timberio/vector:0.41-alpine
    user: "1000:1000"
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    volumes:
      - ./vector.toml:/etc/vector/vector.toml:ro
      - homelabarr-activity:/audit:ro
    networks:
      - homelabarr-internal
```

Configure `vector.toml` to read from Docker container logs and the JSONL audit files, then sink to your Loki/OpenSearch instance.

This is optional and not required for HomelabARR CE to function.
