UPDATE refresh_tokens
SET token = token_hash
WHERE token IS DISTINCT FROM token_hash;
