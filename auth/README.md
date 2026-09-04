# Ai2 Token Server

Ai2 includes an optional standalone API-token service at `auth/token-server.js`.

## Start

Set a strong secret in the environment:

```text
AI2_ADMIN_TOKEN=change-this-to-a-long-random-secret
AI2_TOKEN_PORT=3010
AI2_RATE_LIMIT_PER_MINUTE=120
```

Then run:

```text
npm run start:token
```

The service listens on port `3010` by default.

## API

- `GET /health` — token-server health.
- `POST /api/auth/tokens` — create an API token. Requires the admin token.
- `GET /api/auth/tokens` — list token metadata. Raw tokens and hashes are never returned.
- `POST /api/auth/tokens/:id/rotate` — revoke the old token and issue a new one.
- `POST /api/auth/tokens/:id/revoke` — revoke a token.
- `DELETE /api/auth/tokens/:id` — revoke a token.
- `GET /api/auth/me` — validate the current API token.

Admin requests use `Authorization: Bearer <AI2_ADMIN_TOKEN>` or `X-Ai2-Admin-Token`.
Client requests use `Authorization: Bearer <issued-token>` or `X-Ai2-Token`.

Only SHA-256 hashes are persisted in `data/tokens.json`. The raw API token is returned only when it is created or rotated, so store it securely.

The token server is intentionally standalone and does not enable authentication on the existing Ai2 application by default. This keeps the current browser UI working. It can be placed in front of Ai2 with NGINX or extended with an authenticated reverse-proxy gateway when full API enforcement is enabled.
