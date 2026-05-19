# Beta Release Checklist

## Build And Tests

- `frontend`: `npm run build`
- `frontend`: `npm test`
- `backend`: `./gradlew build`
- Confirmar que Flyway aplica limpio en el entorno objetivo

## Backup And Restore

- Confirmar backup pre-release disponible y verificable
- Confirmar procedimiento de restore validado
- Si hay migraciones sensibles, tomar backup nuevo justo antes del deploy

## Deploy And Smoke

- Deploy con metadata de release completa (`APP_*`, `VITE_APP_*`)
- Ejecutar `scripts/smoke-post-deploy.sh`
- Validar frontend reachability (`/auth/login`)
- Validar backend readiness (`/actuator/health/readiness`)
- Validar login, home pública y metadata de release en bundle

## Staging Validation

- Validar home pública del ecosystem
- Validar catálogo
- Validar mapa de tiendas
- Validar checkout store
- Validar checkout ecosystem
- Validar login/logout
- Validar órdenes y detalle de órdenes
- Validar mobile básico

## Session Validation

- Confirmar bootstrap con refresh cookie válido
- Confirmar degradación a login cuando refresh token expira o queda revocado
- Confirmar logout
- Confirmar `refresh` post-logout responde `401`
- Confirmar limpieza de cookie de refresh en logout y refresh inválido

## Restart Validation

- Reiniciar backend y repetir smoke crítico
- Reiniciar Redis y repetir smoke crítico
- Confirmar que el sistema vuelve a `readiness=UP|DEGRADED`

## Observability Validation

- Confirmar request IDs en respuestas críticas
- Confirmar metadata de release visible en frontend y backend
- Ejecutar smoke de observability si está habilitado
- Verificar que errores visibles quedan correlacionables

## Rollback Notes

- Confirmar pasos de rollback de frontend
- Confirmar pasos de rollback de backend
- Confirmar criterio de restore de DB sólo si la app anterior no tolera el schema/dato actual
- Tener a mano `docs/production/RELEASE_AND_ROLLBACK.md`

## Deploy Notes

- Registrar commit/tag liberado
- Registrar `releaseId`, `commitSha` y timestamp
- Registrar ventana de validación post-deploy
- Registrar issues aceptados para beta privada
