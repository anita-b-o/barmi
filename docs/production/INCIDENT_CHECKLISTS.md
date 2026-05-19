# Incident Checklists

## Deploy failed

1. Revisar `docker compose ps`.
2. Revisar logs de `api`, `web` y `nginx`.
3. Verificar `readiness` y `scripts/smoke-post-deploy.sh`.
4. Si el stack no levanta rápido, volver al commit/release anterior.

## Redis unavailable

1. Revisar salud del contenedor `redis`.
2. Confirmar si backend quedó operativo en fail-open.
3. Reiniciar `redis`.
4. Confirmar `readiness` del backend.
5. Correr smoke post-deploy.

## Postgres unavailable

1. Revisar salud del contenedor `postgres`.
2. Revisar volumen y credenciales.
3. Reiniciar `postgres`.
4. Confirmar que el backend vuelva a `readiness`.
5. Si no vuelve, restaurar último backup sano sobre DB limpia.

## Auth flood

1. Revisar logs de auth y rate limit.
2. Confirmar si el problema es credencial inválida masiva o refresh inválido repetido.
3. Verificar salud de Redis.
4. Si aplica, cortar exposición temporal o ajustar acceso operativo.

## Checkout failure

1. Buscar `requestId`.
2. Revisar logs de checkout y payment initiation.
3. Confirmar si el error fue stock, timeout de vendor o mismatch.
4. Validar que el resto del smoke siga sano.

## Webhook stuck

1. Revisar logs de webhook y confirmación de pago.
2. Verificar si hubo invalid signature, replay o timeout.
3. Confirmar que Redis y Postgres estén sanos.
4. Si aplica, reprocesar operativamente el evento desde el proveedor o vía acción manual controlada.
