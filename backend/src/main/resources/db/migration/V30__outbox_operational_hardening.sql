ALTER TABLE outbox_events
  ADD COLUMN status TEXT,
  ADD COLUMN attempt_count INTEGER,
  ADD COLUMN next_attempt_at TIMESTAMPTZ,
  ADD COLUMN claimed_at TIMESTAMPTZ NULL,
  ADD COLUMN claimed_by TEXT NULL,
  ADD COLUMN last_attempt_at TIMESTAMPTZ NULL,
  ADD COLUMN last_error TEXT NULL,
  ADD COLUMN failed_at TIMESTAMPTZ NULL;

UPDATE outbox_events
SET status = CASE WHEN published_at IS NULL THEN 'PENDING' ELSE 'PUBLISHED' END,
    attempt_count = 0,
    next_attempt_at = COALESCE(occurred_at, NOW());

ALTER TABLE outbox_events
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN attempt_count SET NOT NULL,
  ALTER COLUMN next_attempt_at SET NOT NULL;

ALTER TABLE outbox_events
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ALTER COLUMN attempt_count SET DEFAULT 0,
  ALTER COLUMN next_attempt_at SET DEFAULT NOW();

ALTER TABLE outbox_events
  ADD CONSTRAINT chk_outbox_events_status
  CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'));

ALTER TABLE outbox_events
  ADD CONSTRAINT chk_outbox_events_scope
  CHECK (scope IN ('STORE', 'ECOSYSTEM'));

ALTER TABLE outbox_events
  ADD CONSTRAINT chk_outbox_events_attempt_count
  CHECK (attempt_count >= 0);

CREATE INDEX idx_outbox_dispatch_claim
  ON outbox_events(status, next_attempt_at, occurred_at)
  WHERE published_at IS NULL;

CREATE INDEX idx_outbox_processing_claimed_at
  ON outbox_events(status, claimed_at)
  WHERE status = 'PROCESSING';

CREATE INDEX idx_outbox_failed_failed_at
  ON outbox_events(status, failed_at)
  WHERE status = 'FAILED';
