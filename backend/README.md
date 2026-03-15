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
