# Release And Rollback

## Objetivo

Tener deploys trazables y reversibles sin blue/green ni infraestructura extra.

## Traceabilidad mínima

Frontend:

- `VITE_APP_RELEASE_ID`
- `VITE_APP_VERSION`
- `VITE_APP_COMMIT_SHA`
- `VITE_APP_BUILD_TIMESTAMP`

Backend:

- `APP_VERSION`
- `APP_COMMIT_SHA`
- `APP_BUILD_TIMESTAMP`
- startup log `application_started ...`

Contenedores:

- labels OCI con `version`, `revision` y `created`

## Release flow sugerido

1. Setear metadata de release (`APP_*`, `VITE_APP_*`).
2. Correr build/tests obligatorios.
3. Tomar backup de PostgreSQL antes del deploy si hubo migraciones o cambios sensibles.
4. `docker compose -f docker-compose.staging.yml up -d --build`
5. Correr `scripts/smoke-post-deploy.sh`
6. Si falla, rollback inmediato.

## Rollback frontend

1. Volver al commit/tag anterior del frontend.
2. Rebuild/redeploy del servicio `web` y `nginx`.
3. Volver a correr `scripts/smoke-post-deploy.sh`.

## Rollback backend

1. Volver al commit/tag anterior del backend.
2. Rebuild/redeploy del servicio `api`.
3. Verificar startup metadata y `readiness`.
4. Correr `scripts/smoke-post-deploy.sh`.

## Rollback compose

1. Volver al commit del repo que contenía el compose sano.
2. Reaplicar `docker compose ... up -d --build`.
3. Verificar que metadata y smoke coincidan con el release esperado.

## Rollback de DB

Si el release no introdujo migraciones incompatibles:

- preferir rollback de app/frontend sin tocar DB

Si el release sí introdujo cambio de schema/datos incompatible:

1. detener tráfico o dejar el stack en modo técnico
2. restaurar el último backup sano
3. redeploy del backend/frontend compatibles con ese backup
4. correr smoke post-deploy

## Regla práctica

- rollback de app primero
- restore de DB sólo cuando la app anterior ya no puede operar sobre el estado actual

## Limitaciones actuales

- el compose actual builda imágenes locales; la trazabilidad depende del commit, metadata de env y logs del release
- no hay rollback automático
- no hay migraciones reversibles garantizadas por defecto; por eso el backup previo al release sigue siendo obligatorio
