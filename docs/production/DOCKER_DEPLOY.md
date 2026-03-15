# Docker Deploy — Barmi Backend

## Build Image
From repo root:
```bash
docker build -t barmi-backend:local .
```

## Run with Docker Compose
```bash
docker compose up --build
```

## Environment Variables
Required (set in your shell or .env):
- DB_NAME
- DB_USER
- DB_PASSWORD
- JWT_SECRET (required, no default)
- MP_WEBHOOK_SECRET (required, no default)

Optional:
- STORE_BASE_DOMAIN
- DEFAULT_CURRENCY
- OBSERVABILITY_OUTBOX_BACKLOG_THRESHOLD

Recommended:
- Create a real .env from the example:
```bash
cp .env.example .env
```

Generate strong secrets:
```bash
openssl rand -base64 48
```

Example:
```bash
export DB_NAME=barmi
export DB_USER=barmi
export DB_PASSWORD=change-me-strong-db-pass
export JWT_SECRET=example-jwt-secret-change-this-to-a-strong-random-value-32-bytes-min
export MP_WEBHOOK_SECRET=example-mp-webhook-secret-change-this-to-a-strong-random-value-32-bytes-min
export STORE_BASE_DOMAIN=example.com
export DEFAULT_CURRENCY=ARS
export OBSERVABILITY_OUTBOX_BACKLOG_THRESHOLD=1000
```

## Health Checks
Liveness:
```bash
curl -s http://localhost:8080/actuator/health/liveness
```

Readiness (includes DB):
```bash
curl -s http://localhost:8080/actuator/health/readiness
```

Metrics:
```bash
curl -s http://localhost:8080/actuator/metrics
```
