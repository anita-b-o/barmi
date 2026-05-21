# BETA DAILY MONITORING

## Objetivo

Mirar cada día un set corto de señales para detectar fricción real antes de que se convierta en soporte manual o pérdida de confianza.

## Cuándo revisar

- una vez por la mañana
- una vez después de cada deploy o restart de API
- una vez extra si hubo feedback `bug` repetido o caída visible de checkout/login

## Tablero mínimo

Fuente principal:

- `GET /api/admin/beta/summary`

Fuentes de apoyo:

- feedback beta por pantalla
- logs frontend/backend correlacionados por `X-Request-Id`
- `scripts/smoke-post-deploy.sh`
- `scripts/smoke-https-staging.sh`
- `scripts/smoke-real-payment.sh`
- `scripts/smoke-observability.sh`

## Qué mirar

### UX

- feedback `bug` y `confusing`
- top searches repetidas
- búsquedas repetidas sin resultado útil reportado
- feedback en home, mapa, catálogo, checkout y login

### Auth

- `login_failure_rate`
- feedback de sesión expirada
- que no aparezcan loops de redirect a login
- que el reingreso devuelva al usuario a la pantalla original
- en staging prod-like: confirmar cookie `Secure`, `HttpOnly`, `SameSite` y refresh/logout sobre HTTPS con `scripts/smoke-https-staging.sh`

### Checkout

- `checkout_success_rate`
- `checkout_started`
- `checkout_failure`
- `payment_initiated` versus `checkout_success`
- feedback de “no entendí si la orden quedó creada”
- evidencia de pago real: `intent_id`, `provider_preference_id`, redirect real, `webhook_accepted`, `provider_payment_id` y transición final de orden

### Stability

- picos de `503` durante restart de API y cualquier `502` residual inesperado
- cuánto tarda en recuperarse el frontend después de restart
- errores `network_error` visibles
- `rate_limit_backend_unavailable` o equivalentes en logs si aparecen

### Restart normal vs incidente

- comportamiento esperado en `docker compose -f docker-compose.staging.yml restart api`: `nginx` puede devolver `503 backend_unavailable` durante una ventana corta mientras Spring Boot vuelve a escuchar
- referencia medida el 2026-05-17: recovery visible en ~16s, con readiness `UP` otra vez ~16-17s después del restart y tráfico normal recuperado ~22s después del inicio del drill
- tolerable para beta interna: una sola ventana corta de `503` que se recupera sola y deja `scripts/smoke-post-deploy.sh` en verde dentro de 45s
- tratar como incidente real si aparecen `502`, si la ventana supera 45s, si readiness no vuelve a `UP`, o si login/checkout siguen fallando después de que readiness vuelva

## Umbrales prácticos

- si `login_failure_rate` sube de forma visible respecto del día anterior: revisar auth/session antes de abrir más usuarios
- si `checkout_success_rate` cae o `checkout_failure` sube en el mismo día: revisar checkout antes de tocar discovery
- si hay más de 2 feedback `bug` sobre la misma ruta en un día: tomar acción ese día
- si hay feedback repetido sobre sesión expirada o “me sacó”: revisar refresh/login UX
- si un restart deja más que una reconexión corta y amable o supera 45s hasta readiness: no declarar estabilidad

## Rutina diaria

1. abrir resumen beta en admin
2. revisar auth, checkout, top searches y feedback por tipo
3. mirar si hubo restart o deploy desde la revisión anterior
4. correr `scripts/smoke-post-deploy.sh` si hubo deploy o restart; el script ahora espera readiness con polling claro hasta 45s
5. correr `scripts/smoke-https-staging.sh` después de cambios de dominio, CORS, auth o cookies
6. correr `scripts/smoke-real-payment.sh` después de cambios de checkout, pagos, webhook o reverse proxy público
7. elegir hasta 3 acciones concretas para el día

## Checklist Diario De Beta Interna

Revisar cada día de prueba con usuarios:

- feedback pendiente de clasificar
- feedback repetido por ruta
- `login_failure_rate`
- `checkout_started`, `checkout_success`, `checkout_failure`
- `checkout_abandoned` estimado en admin como checkout iniciado sin éxito ni fallo registrado
- órdenes creadas versus usuarios que reportaron bloqueo
- top searches y búsquedas sin resultado
- rutas con más feedback
- feedback reciente con `requestId`, release y timestamp
- fallos recientes de login/checkout con `requestId`, route, reason y timestamp
- errores frontend visibles en rutas de home, catálogo, mapa, checkout y admin
- errores backend `4xx` inesperados y `5xx`
- rate limits o `429` en navegación normal
- logs de `503` o restarts y duración de recovery
- cualquier `502`, aunque sea breve

Rutina recomendada:

1. abrir `GET /api/admin/beta/summary` desde admin
2. revisar feedback nuevo antes de mirar métricas
3. buscar picos de login/checkout failures
4. revisar si `Search sin resultado` sube y comparar contra `Top búsquedas`
5. abrir las rutas con más feedback y reproducir el flujo
6. copiar el `requestId` de feedback/fallo reciente y buscarlo en logs si hay bloqueo
7. revisar logs de API/nginx desde la última pasada
8. correr `scripts/smoke-post-deploy.sh` si hubo deploy, restart o dudas de salud
9. actualizar una lista corta de acciones para el día

No convertir la rutina diaria en backlog infinito. Si aparecen más de 3 issues, priorizar bloqueos de login, checkout, orden y mobile.

## Cómo Interpretar Las Señales Nuevas

- `Search sin resultado`: mirar si una misma intención aparece varias veces. No significa automáticamente que falte un producto; puede ser typo, filtros activos, copy confuso o expectativa fuera del alcance de la beta.
- `Checkout abandonado`: usarlo como alarma temprana, no como conversión exacta. Es `checkout_started - checkout_success - checkout_failure`, sin unir por sesión ni orden.
- `Feedback reciente`: leerlo junto con route, release y `requestId`. El mensaje puede describir percepción o confusión, no siempre bug.
- `Fallos recientes`: copiar `requestId` y buscar logs de API/nginx/frontend antes de tocar código. `reason` es una pista recortada, no un diagnóstico completo.
- `Rutas con más feedback`: reproducir primero esas pantallas. Si una ruta concentra feedback, revisar flujo/copy/estado vacío antes de ampliar métricas.

Limitaciones best-effort:

- puede perderse telemetría si el browser corta la navegación, bloquea beacon/fetch o queda sin red
- las métricas usan tablas existentes y agregados simples
- rutas se muestran sin query/hash para evitar PII accidental
- búsquedas tipo email, teléfono o token no se rankean como top search
- no usar estas señales para atribución comercial, scoring de usuarios ni análisis enterprise

## Daily Operations Pass

Hacer al menos una pasada diaria corta:

1. login
2. browse home
3. buscar en catálogo
4. abrir mapa
5. entrar a una tienda
6. agregar al carrito
7. checkout
8. orders
9. admin metrics
10. feedback submit

## Qué registrar

- loader molesto o repetitivo
- mensajes poco claros
- pantallas vacías sin salida
- reconexión visible después de restart
- si el restart mostró `503` corto esperable o un patrón más largo/anómalo
- requests duplicados obvios
- cualquier caso donde el usuario no entienda si puede seguir o no

## Salida esperada

Al final del día debería quedar:

- lista corta de issues accionables
- items clasificados en `new`, `reviewing`, `fixed` o `wontfix`
- riesgos abiertos actualizados en `docs/production/BETA_PRIVATE_GO_NO_GO.md`
