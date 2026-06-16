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

## Operational hardening

Rate-limited JSON endpoints cache request bodies with a hard cap before parsing rate-limit keys. Configure it with `RATE_LIMIT_MAX_CACHED_BODY_BYTES` or `app.rateLimit.maxCachedBodyBytes`; the default is `262144` bytes. Requests above the cap return `413 Payload Too Large` and do not reach business handlers.

HTTP connector limits are explicit in application config:

- `HTTP_MAX_FORM_POST_SIZE` / `server.tomcat.max-http-form-post-size`, default `256KB`
- `HTTP_MAX_SWALLOW_SIZE` / `server.tomcat.max-swallow-size`, default `256KB`
- `HTTP_MAX_REQUEST_HEADER_SIZE` / `server.max-http-request-header-size`, default `16KB`
- `HTTP_MULTIPART_MAX_FILE_SIZE` / `spring.servlet.multipart.max-file-size`, default `256KB`
- `HTTP_MULTIPART_MAX_REQUEST_SIZE` / `spring.servlet.multipart.max-request-size`, default `256KB`

Production readiness rejects unbounded or unexpectedly large HTTP body/header limits. Keep the reverse proxy body limit aligned with the app defaults.

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

Response body returns only the short-lived access token. The refresh token is stored in an `HttpOnly` cookie on `/api/auth`.

Refresh:

```bash
POST /api/auth/refresh
Cookie: barmi_refresh_token=<refresh-token>
```

Refresh rotates the cookie and returns a new access token. Reused or revoked refresh tokens return `401 invalid_refresh_token`. Expired refresh tokens return `401 refresh_token_expired`.

Logout:

```bash
POST /api/auth/logout
Cookie: barmi_refresh_token=<refresh-token>
```

Logout always returns `200 OK`, revokes the refresh token server-side when present, and clears the cookie with the same attributes.

Refresh token cleanup is not part of the login/refresh/logout request path. Expired or revoked rows are purged by a scheduled cleanup job controlled by `REFRESH_CLEANUP_INITIAL_DELAY` and `REFRESH_CLEANUP_FIXED_DELAY`.

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
STORE notifications now reuse the existing outbox flow to send simple email updates for order created, payment confirmed, manual cancellation and key fulfillment changes. Critical Phase 1 emails include buyer payment success, buyer fulfillment updates and a "new paid order" alert for active STORE `OWNER`/`ADMIN` members. `buyerEmail` is persisted on `store_orders`, so guest checkout is covered and later notifications resolve the recipient from persisted order data. Delivery defaults to `logging`; set `app.notifications.email.mode=smtp` (or `NOTIFICATION_EMAIL_MODE=smtp`) plus `app.notifications.email.from` / `NOTIFICATION_EMAIL_FROM` and the standard Spring Mail properties (`SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, optional SMTP flags) to activate real SMTP sending. Staging/prod fail startup when `smtp` is selected without the required mail settings. Email deliveries are recorded with idempotency keys per outbox event/template/normalized-recipient to avoid app-level duplicates during reprocessing. Delivery remains at-least-once: if the process exits after SMTP accepts a message but before `notification_email_deliveries` is committed, a later retry may send that same email again.
Transactional email metrics:

- `barmi_notification_email_attempts_total{template,result,mode}` with `result=sent|skipped_duplicate|skipped_invalid_recipient|failure`
- `barmi_notification_email_latency_seconds{template,mode}`

Labels are intentionally low-cardinality. Do not add recipient, email, order, store or event IDs as metric tags. Current template fixtures live in `docs/transactional-email-templates.md`.
If confirmed STORE payment processing hits insufficient stock, the order is left visible for admin review with an operational stock conflict. This is intentionally manual operational handling, not automatic recovery or refund logic.
Outbox dispatch is database-backed and at-least-once. Pending events are claimed in bounded batches, retried with backoff, and moved to `FAILED` after the configured max attempts. Do not manually delete order-related outbox rows: order timelines, analytics and operational diagnostics read from `outbox_events`. After fixing the root cause of a failed event, requeue it explicitly with `UPDATE outbox_events SET status = 'PENDING', next_attempt_at = NOW(), claimed_at = NULL, claimed_by = NULL, failed_at = NULL, last_error = NULL WHERE event_id = '<event-id>' AND status = 'FAILED';`.
STORE order admin now also exposes `GET /api/store/admin/orders` with pagination and optional filters `status`, `hasOperationalConflict` and `hasFulfillment`.
List and detail share the same derived operational indicators from existing persisted records (`store_orders`, `payment_intents`, `payments`, `outbox_events`, `store_fulfillments`): `paymentConfirmed`, `operationalIssue`, `hasFulfillment`, `manuallyCancelled`, `canCancel`, `canRetryProcessing`.
The order state machine is unchanged. Operational conflict remains a derived indicator, not a new persisted order status. Admin detail now includes an operational summary plus timeline, can manually cancel an order if it still has no fulfillment, or retry post-payment stock processing after stock was corrected. Retry is idempotent and will not duplicate fulfillments.
STORE admin now also exposes a minimal promotions surface for coupons and discounts: `GET /api/store/promotions`, `POST /api/store/promotions`, and `PATCH /api/store/promotions/{promotionId}/active`.
STORE appearance presets are scoped by the current store tenant and only affect presentation. Admins can read/update them with `GET /api/store/appearance` and `PUT /api/store/appearance` using `{ "preset": "MODERN" }`. Supported values are `MODERN`, `CLASSIC`, `LOCAL_BUSINESS` and `PORTFOLIO`; new stores default to `MODERN`.

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
GET /api/store/analytics/products?range=7d
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

```bash
GET /api/store/analytics/commerce?range=7d
Host: demo-store.example.com
Authorization: Bearer <accessToken>
```

Store commerce analytics are tenant-scoped to the current store and summarize paid orders from the last 7 days.

```bash
GET /api/ecosystem/admin/analytics/summary?ecosystemId=<UUID>
Authorization: Bearer <accessToken>
```

```bash
GET /api/ecosystem/admin/analytics/report?ecosystemId=<UUID>&range=<today|7d|30d>
Authorization: Bearer <accessToken>
```

These endpoints are intentionally limited to simple operational/product-funnel metrics and are not a BI/reporting subsystem.
