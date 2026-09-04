# Ai2 Token Server

This directory is the isolated entry point for the Ai2 API-token service.

The implementation lives in `../auth/token-server.js` so the token service can be started independently of the main Ai2 web server.

## Start

From the repository root:

```bash
npm run start:token
```

Default port: `3010` (`AI2_TOKEN_PORT`).

## Security

Set `AI2_ADMIN_TOKEN` before creating or rotating API tokens. API tokens are returned only once and only their SHA-256 hashes are stored.

Supported credentials:

- `Authorization: Bearer <token>`
- `X-Ai2-Token: <token>`
- Admin endpoints additionally accept `X-Ai2-Admin-Token`.

Token data is stored in `data/tokens.json`, outside the main chat store.

## Isolation

The token service does not modify the main Ai2 chat, memory, character or media data. It can be run as a separate process/service and placed behind NGINX.
