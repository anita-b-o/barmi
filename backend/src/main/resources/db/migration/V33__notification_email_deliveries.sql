CREATE TABLE notification_email_deliveries (
  idempotency_key TEXT PRIMARY KEY,
  event_id        UUID NOT NULL,
  template        TEXT NOT NULL,
  recipient       TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_email_deliveries_event_id
  ON notification_email_deliveries(event_id);

CREATE INDEX idx_notification_email_deliveries_sent_at
  ON notification_email_deliveries(sent_at);
