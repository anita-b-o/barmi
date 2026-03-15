# Production Runbook

## Identity Header

`X-User-Email` is a dev/test-only mechanism for simulating identity.

- In production, identity must be derived from JWT claims (or the configured auth provider).
- The property `app.security.allowDevIdentityHeader` must remain `false` in production.
