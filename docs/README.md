# Documentation Structure

This directory contains project documentation organized by purpose. Use the subdirectories below to keep materials discoverable and consistent.

# Architecture Decision Records (ADR)

Architecture Decision Records must be stored in `/docs/adr`.

Format: `ADR-XXX-title.md`

# Production / Launch

Operational launch material should live in `/docs/production`.

Useful starting points:
- `CONFIGURATION.md`
- `RUNBOOK.md`
- `MVP_LAUNCH_CHECKLIST.md`

# Definition of Done

- Every DB change requires Flyway migration
- Critical invariants require unit tests
- Integration tests required for transactional flows
- Idempotency must be verified for payment/webhook flows
- Outbox events must be emitted for domain state changes
- All endpoints must return consistent HTTP error codes
- Constraints and indexes must be explicitly defined in migrations
