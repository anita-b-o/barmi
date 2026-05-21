# BETA INTERNAL RC SUMMARY

## Estado Actual

Release candidate interno para beta privada.

Estado al 2026-05-21:

- beta interna lista para testers
- HTTPS staging validado con subdominios reales locales sobre `staging.127.0.0.1.sslip.io`
- Auth, CORS, cookies `Secure`/`HttpOnly`/`SameSite` y refresh/logout validados en staging HTTPS
- backend `./gradlew build` verde
- frontend `npm run validate:frontend` verde
- smokes staging críticos verdes
- tests Gradle aislados de `.env` staging
- loop operativo beta disponible desde admin home

## Qué Quedó Validado

- `./gradlew build`
- `npm run validate:frontend`
- `./scripts/smoke-https-staging.sh`
- `./scripts/smoke-staging.sh`
- `./scripts/smoke-post-deploy.sh`
- `BetaTelemetryFlowTest`
- `AuthIntegrationTest` aislado de variables `.env` staging
- staging local prod-like con HTTPS y subdominios
- admin home renderizando métricas beta mínimas
- rutas beta sin query/hash en resumen admin
- top searches sin emails/teléfonos/tokens evidentes

## Qué NO Quedó Validado

- pago real Mercado Pago end to end
- webhook real Mercado Pago desde una URL pública confiable
- `scripts/smoke-real-payment.sh` con `MP_ACCESS_TOKEN` real/sandbox
- carga con testers simultáneos
- monitoreo de varios días con señales reales de usuarios

## Cómo Correr La Validación

Backend:

```bash
cd backend
./gradlew build
```

Frontend:

```bash
cd frontend
npm run validate:frontend
```

Staging HTTPS:

```bash
./scripts/staging-up.sh
./scripts/smoke-https-staging.sh
./scripts/smoke-staging.sh
./scripts/smoke-post-deploy.sh
```

Loop operativo beta:

```bash
cd backend
./gradlew test --tests 'com.barmi.api.BetaTelemetryFlowTest'
```

Pago real, pendiente hasta tener token:

```bash
MP_ACCESS_TOKEN=<real-or-sandbox-access-token> \
MP_PUBLIC_BASE_URL=https://<public-staging-host> \
WAIT_FOR_WEBHOOK=true \
./scripts/smoke-real-payment.sh
```

## Señales Operativas Disponibles

Admin home muestra:

- búsquedas sin resultado
- checkout abandonment aproximado
- feedback reciente
- rutas con feedback
- fallos recientes con route, requestId, release y reason

Interpretación:

- `Search sin resultado` apunta a fricción de discovery, no prueba demanda real.
- `Checkout abandonado` es estimado global, no funnel exacto.
- `requestId` es la entrada para buscar logs antes de tocar código.
- feedback beta puede ser percepción/confusión, no necesariamente bug técnico.

## Riesgos Abiertos

- Mercado Pago real sigue pendiente por falta de token y URL pública confiable.
- métricas beta son best-effort y pueden perder eventos por red, browser o cierre de pestaña
- abandono de checkout no une eventos por sesión/orden
- `.env` local contiene valores staging-local y no debe commitearse como secreto/config real
- `tmp-qa-shots/` y `tmp-payment-evidence/` son artefactos locales, no parte del RC

## Go / No-Go

Go interno para testers si:

- no se incluye `.env` real en commit/PR
- no se incluyen certificados generados ni evidencia temporal
- backend/frontend/smokes siguen verdes en la máquina de RC
- el equipo acepta que pago real queda explícitamente fuera del alcance hasta tener credenciales

No-Go si:

- aparece un secreto real en diff
- fallan auth/session/cors/smokes HTTPS
- admin no puede ver señales beta mínimas
- checkout básico o navegación pública falla en smoke staging

## Próximos Pasos

1. limpiar del commit `.env`, certificados y artefactos temporales
2. abrir PR de RC interno con los cambios de producto, scripts, tests y docs
3. correr la validación final en CI o runner dedicado
4. habilitar testers internos
5. monitorear primero checkout, login, feedback reciente y búsquedas sin resultado
6. cuando haya `MP_ACCESS_TOKEN` y URL pública confiable, ejecutar smoke real Mercado Pago
