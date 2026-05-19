# BETA PRIVATE GO / NO-GO

## Estado

Go condicionado para beta privada interna real.

No-Go para exposición pública abierta.

## Qué está validado

- builds frontend/backend verdes cuando el repo queda consistente
- smoke técnico y runbooks ya existen para post-deploy, observability, backup/restore y rollback
- auth base, checkout base, orders y admin básico ya tienen cobertura automatizada y operación previa validada
- telemetría beta mínima y feedback flow existen y ahora el resumen admin muestra señales más accionables
- frontend ahora degrada mejor frente a restart corto del backend con retry liviano y estado de reconexión
- expiración de sesión tiene mensaje más claro y preserva mejor el retorno post-login

## Qué no está validado completamente

- pasada humana larga en dispositivos físicos reales y navegación prolongada
- staging con TLS real y cookies `Secure=true`
- Sentry/DSN real con ingest externo operativo
- operación con tráfico concurrente sostenido
- restart sin ventana visible de indisponibilidad
- pasada manual larga en dispositivos físicos reales después de esta tanda de cambios

## Riesgos abiertos

- warning Vite CJS sigue abierto
- restart de API todavía expone una ventana real de indisponibilidad; ahora `nginx` la degrada como `503 backend_unavailable` y no como `502` crudo, pero la ventana medida sigue siendo ~16s de readiness caída
- telemetría sigue siendo best-effort
- auth cliente sigue dependiendo de sesión frontend local + refresh cookie; falta endurecimiento real con dominio/TLS final
- search sigue siendo simple; mejora UX, no ranking avanzado

## Métricas a monitorear

- `checkout_success_rate`
- `checkout_failure`
- `payment_initiated`
- `login_failure_rate`
- `topSearches`
- feedback `bug` y `confusing`
- `502` / `503` alrededor de restart
- quejas de sesión expirada

## Incidentes esperables

- usuarios que no entienden si la orden se crea antes o después del pago
- búsquedas vacías o demasiado específicas
- sesiones expiradas después de inactividad
- pequeños cortes de UX durante restart de API
- feedback que revele copy ambiguo entre ecosystem, tienda y carrito

## Qué hacer si algo falla

- checkout/login:
  - correlacionar `X-Request-Id`
  - revisar `checkout_failure` / `login_failure`
  - reintentar smoke post-deploy si hubo restart o deploy reciente
- restart/redeploy:
  - correr `scripts/smoke-post-deploy.sh`
  - si hubo degradación, seguir `docs/production/RELEASE_AND_ROLLBACK.md`
- feedback repetido:
  - usar `docs/production/BETA_FEEDBACK_TRIAGE.md`

## Lectura honesta

- usable para beta privada interna: sí, si se sostiene monitoreo diario y correcciones rápidas
- restart de API: riesgo aceptable para beta interna sólo si se mantiene la ventana corta actual, `smoke-post-deploy.sh` sigue recuperando en menos de 45s y no aparecen `502` residuales
- listo para “dejarlo solo”: no
- lo primero que probablemente se rompa con usuarios reales:
  - fricción de checkout/envío/pago
  - expiración de sesión en bordes largos o con cookies reales distintas a staging actual
  - búsquedas sin resultado útiles pero todavía poco satisfactorias
  - recovery visible si el restart del backend dura más de la ventana corta prevista
