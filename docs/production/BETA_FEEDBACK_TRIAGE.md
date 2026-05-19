# BETA FEEDBACK TRIAGE

## Objetivo

Tener un flujo mínimo, repetible y barato para revisar feedback real de la beta privada sin perder contexto operativo.

## Estados mínimos

- `new`
  - acaba de entrar y todavía no se revisó
- `reviewing`
  - ya se leyó y se está correlacionando con métricas, logs o reproducibilidad
- `fixed`
  - se corrigió o mitigó y queda pendiente validar en siguiente pasada
- `wontfix`
  - no se va a resolver ahora porque no bloquea la beta o porque el costo supera el aprendizaje actual

## Frecuencia

- revisar al menos 1 vez por día hábil
- revisar también después de deploys, restart drills o picos de `checkout_failure`

## Insumos

- `GET /api/admin/beta/summary`
- feedback enviado desde `POST /api/public/beta/feedback`
- logs correlacionados por `X-Request-Id`
- errores de checkout/login visibles en frontend y backend

## Clasificación

- `bug`
  - algo que debería funcionar y falla
  - ejemplos: loop de auth, CTA rota, orden que no avanza, loader infinito
- `ux`
  - hoy se corresponde con categoría `confusing`
  - el flujo existe pero el usuario no entiende qué pasó o qué sigue
- `confusion`
  - usar cuando el problema principal es copy ambiguo, estado poco claro o navegación rara
  - si además hubo fallo real, clasificar como `bug`
- `feature request`
  - hoy se corresponde con categoría `missing`
  - falta algo no bloqueante para operar la beta
- `positive`
  - hoy se corresponde con categoría `love_it`
  - sirve para detectar qué no conviene tocar antes de tiempo

## Priorización

- P0
  - bloquea login, checkout, pago, orders o admin básico
  - rompe recovery post-refresh o deja sesión muerta
  - impacta a más de un usuario o se repite con el mismo `requestId` / flujo
- P1
  - mucha fricción en pasos críticos pero con workaround
  - ejemplos: shipping ambiguo, errores poco accionables, búsqueda vacía difícil de recuperar
- P2
  - molestias no bloqueantes
  - ejemplos: copy mejorable, CTA débil, scroll raro menor
- P3
  - request de mejora o pulido visual sin impacto operativo inmediato

## Rutina de triage

1. abrir resumen beta en admin
2. mirar `checkout_success_rate`, `login_failure_rate`, `payment_initiated`, top búsquedas y feedback por tipo
3. tomar los feedback más recientes y agrupar por ruta
4. asignar estado inicial:
   - recién entró: `new`
   - ya se está investigando: `reviewing`
   - corregido y desplegado: `fixed`
   - no entra en este ciclo: `wontfix`
5. para cada item, decidir:
   - ¿bloquea?
   - ¿es recurrente?
   - ¿tiene correlación con `checkout_failure` o `login_failure`?
6. crear lista corta de acciones:
   - fix inmediato
   - observar 24-48h
   - dejar para aprendizaje posterior

## Señales de escalación

- más de 2 feedback `bug` sobre checkout en un día
- aumento de `payment_initiated` sin crecimiento de `checkout_success`
- top search repetida sin clicks/conversión visibles
- feedback `confusing` repetido sobre el mismo CTA o paso

## Qué no hacer

- no abrir refactors grandes desde feedback aislado
- no convertir cada comentario en feature
- no mezclar bugs de plataforma con pedidos de producto
- no dejar feedback sin estado al final del día
