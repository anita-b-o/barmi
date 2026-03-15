# Healthcheck Runbook

## Clean rebuild (avoid stale image/jar)

```
docker compose down -v
docker compose build --no-cache backend
docker compose up -d
```

## Health verification

```
curl -s http://localhost:8080/actuator/health | jq
curl -s http://localhost:8080/actuator/health/readiness | jq
curl -s http://localhost:8080/actuator/health/liveness | jq
```

## Symptoms and likely causes

- If `/actuator/health` lacks `components` or `details`: likely stale image/jar or `application-prod.yml` not loaded.
- If Redis connects to `localhost`: missing `spring.data.redis.*` mapping or env not applied.

## Expected JSON shape

- Default `/actuator/health` should include `db` and `redis` (and `readinessState`/`livenessState`).
- `readiness` should include `db` + `redis` and show `status: UP`.
- `liveness` should show `livenessState: UP`.

## Evidence (build-time)

From `backend/` (host/workspace):

```
./gradlew clean bootJar
jar tf build/libs/*.jar | grep application
```

Expected:

- application.yml
- application-local.yml
- application-prod.yml

## Runtime limitation (by design)

The runtime container is slim and does not include `jar`/`unzip`/`bsdtar`/`strings`.
It is not possible to extract `BOOT-INF/classes/application-prod.yml` from `/app/app.jar` at runtime.
Evidence is captured at build-time (section above).
