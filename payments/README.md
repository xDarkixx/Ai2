# Ai2 payment server

This is the self-hosted billing service for Ai2. It owns customer mapping, subscription state, payment records and webhook processing. Card/payment credentials are never stored by Ai2; Stripe remains the regulated payment processor.

## Start

```bash
npm run start:payments
```

The service listens on `AI2_PAYMENT_PORT` (default `3020`).

## Required environment

- `AI2_PAYMENT_SECRET` — private server-to-server secret.
- `STRIPE_SECRET_KEY` — Stripe secret API key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook endpoint.
- `STRIPE_PRICE_PLUS` — Stripe recurring Price ID for Plus.
- `STRIPE_PRICE_PRO` — Stripe recurring Price ID for Pro.
- `PAYMENT_SUCCESS_URL` and `PAYMENT_CANCEL_URL` — browser return URLs.

Never put any of these secrets into the browser, repository, or frontend code.

## Endpoints

- `GET /health` — configuration/status check; does not expose secrets.
- `POST /api/payments/checkout` — create a hosted subscription checkout session. Requires `x-ai2-payment-secret`.
- `POST /api/payments/webhook` — receives and verifies Stripe webhooks. This endpoint intentionally does not use the Ai2 internal secret because Stripe signs the request itself.
- `GET /api/payments/status/:userId` — returns the current premium plan/subscription state. Requires the internal secret.
- `POST /api/payments/portal` — creates a hosted billing-portal session for a customer. Requires the internal secret.
- `GET /api/payments/admin/summary` — basic billing counters. Requires the internal secret.

## Webhook events

The server records idempotent event IDs and updates subscription state from `checkout.session.completed` and `customer.subscription.*` events. Subscription state is therefore driven by the payment provider rather than by a browser redirect.

## Storage

Runtime billing data is stored in `data/payments.json`. Back this file up securely and restrict filesystem access. Do not commit it to Git.

## Production

Put the payment server behind HTTPS/reverse proxy, use a long random `AI2_PAYMENT_SECRET`, configure Stripe webhook delivery to `/api/payments/webhook`, restrict the payment service to the Ai2 server network where possible, and keep Stripe secret keys in the deployment secret store.
