# Runbook — Barmi Backend

## Start / Stop
Gradle (dev/test):
- Start: ./backend/gradlew -p backend bootRun
- Stop: CTRL+C

Jar (prod):
- Start: java -jar backend/build/libs/barmi-backend.jar
- Stop: SIGTERM

Minimum required variables:
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET
- MP_WEBHOOK_SECRET

## Quick Debug
Webhook failures:
- Check logs for payment_confirm_noop_race, payment_mismatch
- Verify MP_WEBHOOK_SECRET matches upstream
- Verify provider_payment_id and webhook_event_id in payload

Outbox backlog:
- Check /actuator/health for outbox_pending_events
- Check /actuator/metrics/barmi_outbox_pending_events

Payment mismatches:
- Check /actuator/metrics/barmi_payments_mismatch_total
- Inspect order totals vs received payload

## Incident Investigation Procedure
1) Logs
- Search for: payment_confirmed, payment_mismatch, payment_confirm_noop_race

2) Metrics
- barmi_payments_confirmed_total
- barmi_payments_mismatch_total
- barmi_outbox_pending_events

3) DB Queries (examples)
- Pending outbox:
  SELECT count(*) FROM outbox_events WHERE published_at IS NULL;
- Recent mismatches:
  SELECT * FROM outbox_events WHERE event_type IN ('STORE_ORDER_PAYMENT_MISMATCH','ECOSYSTEM_ORDER_PAYMENT_MISMATCH') ORDER BY occurred_at DESC LIMIT 20;
- Confirmed payments by scope:
  SELECT scope, count(*) FROM payments WHERE status='CONFIRMED' GROUP BY scope;

## What to do if
Outbox backlog > threshold:
- Confirm dispatcher is running (scheduler enabled)
- Check DB connectivity and performance
- Consider scaling dispatcher worker

Payments mismatch spikes:
- Verify upstream amounts/currency
- Check recent pricing/config changes
- Audit orders and payment payloads

Webhook floods:
- Ensure processed_events table grows normally
- Validate webhook_event_id uniqueness upstream
- Temporarily rate-limit at edge if needed
