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

### Checkout

- `checkout_success_rate`
- `checkout_started`
- `checkout_failure`
- `payment_initiated` versus `checkout_success`
- feedback de “no entendí si la orden quedó creada”

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
5. elegir hasta 3 acciones concretas para el día

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
