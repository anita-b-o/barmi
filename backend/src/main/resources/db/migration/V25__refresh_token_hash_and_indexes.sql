ALTER TABLE refresh_tokens
    ADD COLUMN token_hash TEXT;

UPDATE refresh_tokens
SET token_hash = md5(token)
WHERE token_hash IS NULL;

ALTER TABLE refresh_tokens
    ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX ux_refresh_tokens_token_hash
    ON refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_id_revoked_at
    ON refresh_tokens(user_id, revoked_at);

CREATE INDEX idx_store_fulfillments_store_id_created_at
    ON store_fulfillments(store_id, created_at DESC);

CREATE INDEX idx_payments_scope_operation_status
    ON payments(scope, operation_id, status);

CREATE INDEX idx_outbox_scope_type_published
    ON outbox_events(scope, event_type, published_at);
