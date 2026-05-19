# BETA PRIVATE RC

## Estado actual

Validado:

- `frontend`: `npm run build`
- `frontend`: `npm test` quedó verde antes del último polish responsive; después del polish final recompiló bien y el smoke funcional siguió pasando
- `backend`: `./gradlew build`
- redeploy limpio reproducible con `docker compose -f docker-compose.staging.yml down` + `up -d --build`
- `smoke-post-deploy.sh` verde
- `smoke-observability.sh` verde
- metadata real consistente entre:
  - labels de imagen Docker
  - bundle frontend servido por staging
  - `actuator/info`
  - startup log `application_started`
- auth operativo:
  - login
  - refresh/bootstrap
  - logout
  - refresh post-logout `401`
- flujo público ecosystem:
  - home
  - catálogo
  - mapa
  - checkout
- flujo store:
  - checkout
  - detalle de orden
- admin básico:
  - `/admin`
  - hubs store/ecosystem
- recovery operativo:
  - restart `api`
  - restart `redis`
  - re-smoke posterior

No validado al nivel de producción pública:

- TLS real / cookies `Secure=true`
- email real SMTP
- operación con tráfico concurrente sostenido
- cero downtime en restart de API

## Hallazgos cerrados

- `smoke-observability.sh` fallaba por dos causas reales:
  - staging levantaba `APP_OBSERVABILITY_SMOKE_ENABLED=false` por falta de propagación efectiva en `.env`/compose
  - `nginx` hacía rewrite incorrecto en `location /` (`proxy_pass .../`) y devolvía `index.html` para `/assets/*`, rompiendo la SPA y la pantalla `__observability`
- metadata frontend degradada:
  - staging quedaba con `unknown` por variables faltantes y fallback inconsistente
  - el compose de staging ahora usa `APP_*` como fuente canónica para FE/BE
- metadata backend no era verificable vía endpoint:
  - `actuator/info` ahora expone `version`, `commitSha`, `buildTimestamp`, `profiles`, `startupDurationMs`, `startupCompletedAt`
- UX mobile admin:
  - había overflow horizontal y sidebar de desktop en `390px`
  - se corrigió el colapso responsive del layout admin

## Riesgos abiertos

- warning Vite CJS sigue presente; no bloquea esta beta, pero queda como deuda de tooling
- hay flakiness local bajo saturación pesada; no la reproduje en staging liviano después del cierre
- restart de `api` produce una ventana corta de `502` antes de recuperar readiness detrás de nginx
- siguen apareciendo logs informativos de Spring Data Redis sobre repositorios JPA; no rompen operación, pero ensucian señal
- la validación visual fue manual/asistida por screenshots sobre staging local; no reemplaza una pasada humana en dispositivo físico real

## Operación

Backup / restore:

- referencia vigente: `docs/production/BACKUP_AND_RECOVERY.md`
- backup/restore real ya habían sido validados previamente

Smoke:

- post deploy: `./scripts/smoke-post-deploy.sh`
- observability: `BASE_URL=http://localhost:8088 ./scripts/smoke-observability.sh`
- flujo amplio: `BASE_URL=http://localhost:8088 STORE_HOST=demo-store.staging.barmi.local ./scripts/smoke-staging.sh`

Rollback:

- referencia vigente: `docs/production/RELEASE_AND_ROLLBACK.md`
- rollback documental ya validado previamente

Observability:

- `X-Request-Id` correlacionado entre header, body y logs
- frontend release:
  - `releaseId=staging-local+116ca6e`
  - `commitSha=116ca6e`
  - `buildTimestamp=2026-05-17T14:58:50Z`
  - `environment=staging`
- backend info:
  - `version=staging-local`
  - `commitSha=116ca6e`
  - `buildTimestamp=2026-05-17T14:58:50Z`
  - `profiles=[staging]`

## Decisión honesta

Beta privada:

- Sí, para despliegue controlado y monitoreado.
- La consistencia de staging quedó demostrada después de redeploy limpio, restart de servicios y re-smoke.
- No veo bloqueantes visibles de UX en home, catálogo, mapa, checkout, login, orders y admin básico después del fix responsive.

Producción pública:

- No.
- Antes de eso faltan al menos:
  - TLS/secure cookies y settings operativos reales
  - resolver la ventana visible de `502` en restart de API si se exige continuidad más dura
  - bajar deuda de tooling/flakiness
  - pasada final en dispositivos reales y dominio final
