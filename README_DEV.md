# Frontend DEV (Sprint 1)

## Host setup
Add this line to /etc/hosts:

127.0.0.1 demo-store.example.com

## Run
From repo root:

1) cd frontend
2) npm install
3) npm run dev

Open in browser:

http://demo-store.example.com:5173

## Backend
Backend must be running on http://localhost:8080

The Vite dev server proxies /api to http://localhost:8080 and preserves the Host header.

## Optional curl check
You can validate Host resolution with:

curl -s -H "Host: demo-store.example.com" "http://localhost:8080/api/store/shipping/quote?postalCode=1900"

## Ecosystem (Sprint 2)
- Endpoints ecosystem usan http://localhost:8080 (sin subdominio).
- Ecosystem ID fijo (seed): aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
- Catálogo seed FE-only porque no hay search público y admin products responde 500.

### Curl examples
Shipping quote:

curl -s "http://localhost:8080/api/ecosystem/shipping/quote?ecosystemId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&postalCode=1900" | jq

Checkout (sin shipping):

curl -s -X POST "http://localhost:8080/api/ecosystem/checkout" -H "Content-Type: application/json" -d '{"ecosystemId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","items":[{"externalProductId":"cccccccc-cccc-cccc-cccc-cccccccccccc","qty":1}]}' | jq

Orders list:

curl -s "http://localhost:8080/api/ecosystem/orders?page=0&size=20" | jq

Order detail:

curl -s "http://localhost:8080/api/ecosystem/orders/d62f6906-7bfd-45c4-bfb8-362adad88819" | jq
