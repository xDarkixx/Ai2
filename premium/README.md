# Ai2 Premium / Abo

This module defines the subscription layer without coupling billing to the main chat engine.

## Tiers

- `free` — basic chat, selected characters and limited media jobs.
- `plus` — higher chat/media limits, larger memory allowance and priority jobs.
- `pro` — highest configured limits, advanced local-model routing and priority processing.

The subscription state should be attached to an authenticated user/token, not trusted from the browser.

## Billing adapter

Keep payment-provider code behind a separate adapter (for example `premium/billing/`). The main Ai2 server should only consume normalized events such as `subscription.active`, `subscription.updated` and `subscription.canceled`.

Do not store card numbers or payment secrets in the Ai2 repository. Provider webhook signatures must be verified server-side.

## Adult access

Ai2 may expose adult-only, non-graphic romance/suggestive features to verified adults when enabled by the deployment. Adult access must never permit minors. The existing server-side media filter remains in force.
