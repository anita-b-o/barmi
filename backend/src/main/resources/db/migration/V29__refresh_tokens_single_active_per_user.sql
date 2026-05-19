UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE revoked_at IS NULL
  AND expires_at < NOW();

WITH ranked_active_tokens AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY user_id
               ORDER BY created_at DESC, id DESC
           ) AS row_num
    FROM refresh_tokens
    WHERE revoked_at IS NULL
)
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE id IN (
    SELECT id
    FROM ranked_active_tokens
    WHERE row_num > 1
);

CREATE UNIQUE INDEX ux_refresh_tokens_single_active_per_user
    ON refresh_tokens(user_id)
    WHERE revoked_at IS NULL;
