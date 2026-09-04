import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const dbFile = path.join(root, 'data', 'payments.json');
const db = JSON.parse(await fs.readFile(dbFile, 'utf8').catch(() => '{"customers":{},"subscriptions":{},"payments":{},"events":{},"refunds":{}}'));
const userId = `test-user-${Date.now()}`;
const now = new Date().toISOString();
const paymentId = `test_payment_${Date.now()}`;
const refundId = `test_refund_${Date.now()}`;

db.customers[userId] = { userId, email: `${userId}@example.test`, stripeCustomerId: `cus_test_${Date.now()}`, createdAt: now, updatedAt: now };
db.subscriptions[`test_sub_${Date.now()}`] = { id: `test_sub_${Date.now()}`, userId, planId: 'plus', status: 'active', stripeCustomerId: db.customers[userId].stripeCustomerId, currentPeriodEnd: new Date(Date.now()+30*86400000).toISOString(), cancelAtPeriodEnd: false, updatedAt: now };
db.payments[paymentId] = { id: paymentId, userId, planId: 'plus', mode: 'subscription', status: 'paid', stripeCustomerId: db.customers[userId].stripeCustomerId, subscriptionId: Object.keys(db.subscriptions).at(-1), paymentIntentId: `pi_test_${Date.now()}`, amountPaid: 999, currency: 'eur', createdAt: now, updatedAt: now, test: true };
db.refunds[refundId] = { id: refundId, paymentId, userId, paymentIntentId: db.payments[paymentId].paymentIntentId, status: 'succeeded', amount: 999, currency: 'eur', reason: 'requested_by_customer', createdAt: now, test: true };
db.payments[paymentId].refundedAmount = 999;
db.payments[paymentId].refundStatus = 'succeeded';

db.events[`test_event_${Date.now()}`] = { id: `test_event_${Date.now()}`, type: 'invoice.paid', createdAt: now, test: true };
await fs.mkdir(path.dirname(dbFile), { recursive: true });
await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8');
console.log(JSON.stringify({ ok: true, test: true, userId, paymentId, refundId, amount: '€9.99', status: 'paid', refund: 'succeeded' }, null, 2));
