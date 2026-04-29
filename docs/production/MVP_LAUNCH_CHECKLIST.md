# MVP Launch Checklist

Checklist operativo corto para abrir Barmi en un entorno real MVP.

## 1. Configuración crítica

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` definidos para PostgreSQL real.
- `JWT_SECRET` definido con un valor fuerte y no default.
- `MP_WEBHOOK_SECRET` definido y alineado con el emisor real del webhook.
- `STORE_BASE_DOMAIN` definido con el dominio público real.
- `STORE_PUBLIC_SCHEME=https` en ambientes reales.
- `DEFAULT_CURRENCY` validado con la moneda real operativa.
- `NOTIFICATION_EMAIL_MODE` decidido explícitamente:
- `logging` si todavía no se quiere enviar emails reales.
- `smtp` si ya se va a notificar a usuarios reales.
- Si `NOTIFICATION_EMAIL_MODE=smtp`:
- `NOTIFICATION_EMAIL_FROM` definido.
- `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` definidos.
- TLS/auth SMTP revisados.
- `ALLOW_DEV_IDENTITY_HEADER=false` en entorno real.
- Si el backend arranca con perfil `prod`, confirmar que no dispara el guard de readiness por secrets/defaults inseguros.

## 2. Base de datos y arranque

- Backup o snapshot inicial antes de abrir tráfico real.
- `Flyway` corre limpio al arrancar.
- No quedan migraciones pendientes ni fallidas.
- Backend arranca sin warnings críticos de config faltante.
- Frontend apunta al backend real correcto.

## 3. Smoke flows STORE

- Compra STORE completa:
- catálogo público responde
- carrito y checkout crean orden
- payment initiation responde
- webhook confirma pago
- orden queda visible en tracking público

- Cupón STORE:
- cupón válido descuenta en checkout
- orden persiste descuento correcto
- webhook confirma pago sin inconsistencias

- Conflicto de stock STORE:
- simular pago confirmado con stock insuficiente
- admin ve conflicto operativo
- admin puede cancelar o reintentar según corresponda

- Notificaciones STORE:
- buyer email queda persistido en checkout invitado
- llega email de orden creada
- llega email de pago confirmado
- llega email de fulfillment creado o delivered si aplica

## 4. Smoke flows ECOSYSTEM

- Compra ECOSYSTEM completa:
- catálogo público responde
- checkout crea orden
- payment initiation responde
- webhook confirma pago
- tracking público muestra orden

- Cupón ECOSYSTEM:
- descuento visible en checkout
- total final correcto
- consumo real sólo al confirmar pago

## 5. Smoke flows admin / reporting

- Login admin válido.
- STORE admin carga dashboard, orders y fulfillments.
- STORE reporting abre y drill-down navega a listados.
- ECOSYSTEM admin carga orders, fulfillments y reporting.
- Productos/promotions/shipping zones cargan sin errores visibles.

## 6. Verificaciones operativas finales

- `/actuator/health` responde OK.
- No hay backlog inesperado en outbox al terminar los smoke tests.
- Logs sin errores repetitivos de DB, webhook, SMTP o tenant resolution.
- Links públicos generados en emails apuntan al dominio correcto.
- Mercado Pago devuelve al frontend correcto después del pago.

## 7. Go / No-Go

Go si:
- config crítica completa
- migraciones limpias
- smoke STORE y ECOSYSTEM ok
- notificaciones y pagos validados

No-Go si:
- JWT o webhook secret siguen en valores de ejemplo
- emails reales no salen cuando el lanzamiento los requiere
- links públicos usan dominio/scheme incorrecto
- webhook de pagos no confirma end-to-end
