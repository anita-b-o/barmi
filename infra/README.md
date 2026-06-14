# Infra (VPS) — Nginx Reverse Proxy

This folder contains an Nginx reverse-proxy template that supports:

- Ecosystem domain: `example.com`
- Store subdomains: `*.example.com`

## How routing works

- Requests to `/api/*` go to the **Spring API**.
- All other paths go to the **React web**.

Your backend also receives the `Host` header and resolves the store slug from it.

## Security expectations

- Keep `client_max_body_size` aligned with backend HTTP limits. The shipped Nginx template uses `256k`, matching the default backend JSON/form body cap.
- Replace proxy headers at the edge. Do not forward client-supplied `X-Forwarded-*` chains. The shipped template sets `X-Forwarded-For` from `$remote_addr`, sets `X-Forwarded-Host` from `$host`, and clears the RFC `Forwarded` header.
- Terminate HTTPS at the public edge and forward `X-Forwarded-Proto`.
- Do not expose the backend container directly when `TRUST_PROXY_HEADERS=true`; only the reverse proxy should be reachable publicly.

## TLS (Let's Encrypt)
For MVP you can start with HTTP only, then add TLS. Two common options:

- **Certbot + Nginx** (manual / few domains)
- **Caddy / Traefik** (easier automation for many domains)

This repo ships placeholders for certbot volumes, but doesn't force an opinion.

## Next steps on VPS
1. Point DNS `A` record for `example.com` to the VPS.
2. (Optional) Add wildcard `*.example.com` to also point to the VPS.
3. Run:
   ```bash
   docker compose --profile prod up -d --build
   ```

## Observability alerting

Staging carga reglas Prometheus versionadas desde `infra/prometheus/rules/barmi-alerts.yml`.

Las alertas son MVP para beta privada y evitan ruido por eventos aislados:

- API down
- high 5xx rate
- checkout failures spike
- payment mismatch
- webhook failures
- outbox failed/stuck
- DB pool pressure
- rate limit abuse

Grafana provisiona el contact point `Barmi Alerts Webhook` en `infra/grafana/provisioning/alerting/`. El valor local por defecto de `GRAFANA_ALERT_WEBHOOK_URL` es un webhook dummy seguro (`http://127.0.0.1:9/barmi-alerts-placeholder`). Para beta real, definir `GRAFANA_ALERT_WEBHOOK_URL` y `OBSERVABILITY_REQUIRE_ALERTS=true`; `scripts/validate-env.sh staging` rechaza placeholders y loopback.

Canales:

- Discord/Slack: usar webhook entrante directo si acepta el payload de Grafana, o un adapter externo liviano.
- Telegram: usar un adapter/bot externo que reciba el webhook de Grafana y llame a la Bot API.
- No versionar URLs secretas; usar `.env`, secrets del host o el mecanismo del deploy.

Validaciones útiles:

- `docker compose -f docker-compose.staging.yml config`
- `docker compose -f docker-compose.staging.yml exec prometheus promtool check config /etc/prometheus/prometheus.yml`
- `CHECK_MODE=static ./scripts/smoke-observability.sh`
- `./scripts/smoke-observability.sh` para validar Prometheus target/rules, Grafana datasource/dashboard/contact point y metadata de release contra staging.
- `EXPECT_ALERT_WEBHOOK=true ./scripts/smoke-observability.sh` exige webhook real configurado sin enviar una notificacion; el envio real se prueba desde el boton `Test` de Grafana.
