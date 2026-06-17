# Frontend DEV

## Stack local oficial

Desde la raíz del repo:

```bash
./scripts/dev-up.sh
```

Esto levanta Postgres, Redis, backend con `SPRING_PROFILES_ACTIVE=local` y frontend Vite sin editar `docker-compose.yml`.

URLs:

- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- Store demo: http://demo-store.localhost:5173/public/demo-store

Si `5173` está ocupado:

```bash
LOCAL_FRONTEND_PORT=5174 ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174,http://demo-store.localhost:5174 ./scripts/dev-up.sh
```

## Host setup
Para el flujo nuevo no hace falta tocar `/etc/hosts`: `demo-store.localhost` resuelve localmente.

Si usás el host legacy `demo-store.example.com`, agregá esta línea:

127.0.0.1 demo-store.example.com

## Run
From repo root:

1) cd frontend
2) npm install
3) npm run dev

Open in browser:

http://demo-store.example.com:5173

## Validación mínima recomendada del baseline

Desde la raíz del repo:

```bash
./scripts/validate-baseline.sh fast
```

Esto corre:
- frontend: `npm run validate:baseline`
- backend: `./gradlew baselineCheck`

## Validación más completa

```bash
./scripts/validate-baseline.sh full
```

Esto agrega:
- frontend build
- backend `integrationTest`

`full` requiere un entorno más pesado; en backend implica Docker disponible para Testcontainers.

## Backend
Backend must be running on http://localhost:8080

The Vite dev server proxies /api to http://localhost:8080 and preserves the Host header.

## Demo data recomendada

Desde la raíz del repo:

```bash
curl -s http://localhost:8080/api/admin/dev/seeds | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/all | jq
```

Esto deja una base demo coherente para QA/manual review con escenarios oficiales idempotentes:

- `ecommerce`: Casa Roja, preset online store, appearance local business, 20 productos, 3 categorias, 2 promociones, 3 zonas de envio, pedidos paid, fulfillments y readiness 100%.
- `services`: Estudio Fernandez, preset services, perfil/contacto completos, sin productos, checkout ni envios.
- `portfolio`: Ana Fotografia, appearance portfolio, descripcion extensa y contacto, sin ecommerce.
- `new-store`: Mi nueva tienda, casi vacia, readiness 0% para First Run Experience.
- `ecosystem`: Ecosystem demo, 10 stores variadas, categorias, productos, promociones y pedidos para discovery/catalog/analytics.
- `all`: ejecuta todos los escenarios.

Endpoints disponibles solo con perfiles `local`/`dev` y perfiles de test:

```bash
curl -s http://localhost:8080/api/admin/dev/seeds | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/ecommerce | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/services | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/portfolio | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/new-store | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/ecosystem | jq
curl -s -X POST http://localhost:8080/api/admin/dev/seeds/all | jq
```

La respuesta incluye contadores de lo creado en esa corrida:

```json
{
  "success": true,
  "createdStores": 14,
  "createdProducts": 80,
  "createdOrders": 35,
  "createdPromotions": 14,
  "createdEcosystems": 1
}
```

Para regenerar demo data, ejecutá otra vez el mismo `POST`: reutiliza slugs conocidos, actualiza datos y no duplica registros.

El script SQL historico sigue disponible para QA manual de bajo nivel:

```bash
./scripts/load-demo-data.sh
```

Si usás otra conexión local de Postgres para el script SQL:

```bash
DB_HOST=localhost DB_PORT=5434 DB_NAME=barmi DB_USER=barmi DB_PASSWORD=barmi123 ./scripts/load-demo-data.sh
```

La carga SQL no requiere una DB vacía, pero los slugs/IDs demo quedan reservados para ese dataset.

## Optional curl check
You can validate Host resolution with:

curl -s -H "Host: demo-store.example.com" "http://localhost:8080/api/store/shipping/quote?postalCode=1900"

## Ecosystem
- Endpoints ecosystem usan http://localhost:8080 (sin subdominio).
- En desarrollo, el flujo admin ecosystem requiere una membership activa y `ecosystemId` válido.
- El catálogo/admin ecosystem ya no debe considerarse “FE-only”: usar el backend real disponible y los contratos vigentes del repo.

### Curl examples
Shipping quote:

curl -s "http://localhost:8080/api/ecosystem/shipping/quote?ecosystemId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&postalCode=1900" | jq

Checkout (sin shipping):

curl -s -X POST "http://localhost:8080/api/ecosystem/checkout" -H "Content-Type: application/json" -d '{"ecosystemId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","items":[{"externalProductId":"cccccccc-cccc-cccc-cccc-cccccccccccc","qty":1}]}' | jq

Orders list:

curl -s "http://localhost:8080/api/ecosystem/orders?page=0&size=20" | jq

Order detail:

curl -s "http://localhost:8080/api/ecosystem/orders/d62f6906-7bfd-45c4-bfb8-362adad88819" | jq

## Verificación rápida después de cargar demo data

Store público:

```bash
curl -s -H "Host: demo-store.example.com" "http://localhost:8080/api/public/stores/demo-store" | jq
curl -s -H "Host: demo-store.example.com" "http://localhost:8080/api/public/stores/demo-store/products" | jq
curl -s -H "Host: demo-store.example.com" "http://localhost:8080/api/store/shipping/quote?postalCode=1900" | jq
```

Ecosystem público:

```bash
curl -s "http://localhost:8080/api/public/ecosystems/demo-ecosystem/home" | jq
curl -s "http://localhost:8080/api/public/ecosystems/demo-ecosystem/products?deliverySupported=true" | jq
curl -s "http://localhost:8080/api/ecosystem/shipping/quote?ecosystemId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&postalCode=1900" | jq
```

Auth demo:

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret"}' | jq
```

## Nota de higiene local

No se deben versionar artefactos generados de desarrollo como `frontend/node_modules`, `frontend/dist`, `backend/build`, `backend/bin` o `backend/.gradle`.
