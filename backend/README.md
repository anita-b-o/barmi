# Backend

## Tests

Unit tests (no Docker/Postgres required):

```bash
./gradlew test
```

Integration tests (requires Docker for Testcontainers):

```bash
./gradlew integrationTest
```

If Docker is not running, `integrationTest` will fail. This is expected.

## Baseline validation

Fast backend validation:

```bash
./gradlew baselineCheck
```

Fuller backend validation:

```bash
./gradlew baselineVerify
```

- `baselineCheck` runs the fast backend baseline validation (`test`).
- `baselineVerify` runs `test` + `integrationTest`.
- `integrationTest` requires Docker because it uses Testcontainers.

## API (payments initiation)

Store-scoped payment initiation (requires store context via Host header):

```bash
POST /api/store/payments/initiate
{
  "orderId": "<UUID>",
  "provider": "MERCADOPAGO",
  "returnUrl": "https://frontend.example.com/payment-return"
}
```

Ecosystem payment initiation:

```bash
POST /api/ecosystem/payments/initiate
{
  "ecosystemId": "<UUID>",
  "orderId": "<UUID>",
  "provider": "MERCADOPAGO",
  "returnUrl": "https://frontend.example.com/payment-return"
}
```

## API (auth)

Login:

```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Refresh:

```bash
POST /api/auth/refresh
{
  "refreshToken": "<token>"
}
```

Me:

```bash
GET /api/auth/me
Authorization: Bearer <accessToken>
```

## API (store members admin)

List members for the current store context:

```bash
GET /api/store/members
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

Create or reactivate a membership in the current store:

```bash
POST /api/store/members
Host: demo-store.example.com
Authorization: Bearer <accessToken>
{
  "memberEmail": "staff@example.com",
  "role": "STAFF"
}
```

Update membership role:

```bash
PATCH /api/store/members/{memberId}/role
Host: demo-store.example.com
Authorization: Bearer <accessToken>
{
  "role": "ADMIN"
}
```

Update membership status:

```bash
PATCH /api/store/members/{memberId}/status
Host: demo-store.example.com
Authorization: Bearer <accessToken>
{
  "status": "INACTIVE"
}
```

## API (store admin products)

Store admin products are scoped by the current store tenant resolved from `Host`.

```bash
GET /api/store/products
GET /api/store/products/{productId}
POST /api/store/products
PUT /api/store/products/{productId}
DELETE /api/store/products/{productId}
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

`DELETE` is a deactivation flow (soft delete through the current product active flag). Public catalog and checkout only operate on active products.
STORE products now also expose a simple `stockQuantity` field plus an optional `categoryId` for a single store-scoped category. Public catalog keeps active products visible and marks them unavailable when stock is `0`. Checkout rejects quantities above current stock, and confirmed STORE payments decrement stock once. This is still MVP stock handling: there are no reservations or inventory movements/history.
STORE categories are intentionally simple: one category per product, no hierarchy, no cross-store taxonomy. Admin can list/create/toggle categories through `GET /api/store/categories`, `POST /api/store/categories`, and `PATCH /api/store/categories/{categoryId}/active`. Public store payloads now expose active categories, and public product listing accepts optional `categoryId` filtering.
STORE checkout now also accepts an optional coupon code. Promotion validation and final amount calculation stay backend-authoritative: active state, expiration and usage limits are validated server-side, the resulting discount is persisted on the order, and payment initiation continues using the final discounted `totalAmount`. Coupon validation happens during checkout, but the effective promotion usage is only consumed when payment confirmation succeeds; abandoned or unpaid orders do not increment `usageCount`.
STORE notifications now reuse the existing outbox flow to send simple email updates for order created, payment confirmed, manual cancellation and key fulfillment changes. `buyerEmail` is now persisted on `store_orders`, so guest checkout is covered and later notifications resolve the recipient from the persisted order data. Delivery defaults to `logging`; set `app.notifications.email.mode=smtp` (or `NOTIFICATION_EMAIL_MODE=smtp`) plus `app.notifications.email.from` / `NOTIFICATION_EMAIL_FROM` and the standard Spring Mail properties (`SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, optional SMTP flags) to activate real SMTP sending.
If confirmed STORE payment processing hits insufficient stock, the order is left visible for admin review with an operational stock conflict. This is intentionally manual operational handling, not automatic recovery or refund logic.
STORE order admin now also exposes `GET /api/store/admin/orders` with pagination and optional filters `status`, `hasOperationalConflict` and `hasFulfillment`.
List and detail share the same derived operational indicators from existing persisted records (`store_orders`, `payment_intents`, `payments`, `outbox_events`, `store_fulfillments`): `paymentConfirmed`, `operationalIssue`, `hasFulfillment`, `manuallyCancelled`, `canCancel`, `canRetryProcessing`.
The order state machine is unchanged. Operational conflict remains a derived indicator, not a new persisted order status. Admin detail now includes an operational summary plus timeline, can manually cancel an order if it still has no fulfillment, or retry post-payment stock processing after stock was corrected. Retry is idempotent and will not duplicate fulfillments.
STORE admin now also exposes a minimal promotions surface for coupons and discounts: `GET /api/store/promotions`, `POST /api/store/promotions`, and `PATCH /api/store/promotions/{promotionId}/active`.

## API (ecosystem fulfillment admin)

Ecosystem fulfillment admin is scoped by `ecosystemId` plus active ecosystem membership.

```bash
GET /api/ecosystem/fulfillments?ecosystemId=<UUID>
GET /api/ecosystem/fulfillments/{fulfillmentId}?ecosystemId=<UUID>
POST /api/ecosystem/orders/{orderId}/fulfillment
PATCH /api/ecosystem/fulfillments/{fulfillmentId}/status
Authorization: Bearer <accessToken>
```

This flow is MVP and covers listing, detail, creation from a valid paid order and fulfillment status update.

## API (analytics/reporting)

Administrative analytics expose simple summary/reporting endpoints only.

```bash
GET /api/store/analytics/summary
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

```bash
GET /api/store/analytics/report?range=<today|7d|30d>
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

```bash
GET /api/ecosystem/admin/analytics/summary?ecosystemId=<UUID>
Authorization: Bearer <accessToken>
```

```bash
GET /api/ecosystem/admin/analytics/report?ecosystemId=<UUID>&range=<today|7d|30d>
Authorization: Bearer <accessToken>
```

These endpoints are intentionally limited to simple operational metrics and are not a BI/reporting subsystem.
