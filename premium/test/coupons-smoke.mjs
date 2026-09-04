import assert from 'node:assert/strict';
import { createCoupon, listCoupons, validateCoupon } from '../coupons.js';

const original=process.env.AI2_COUPON_TEST_CODE;
const code=`TEST-${Date.now()}`;
const c=await createCoupon({code,type:'percent',value:20,plan:'plus',maxUses:2});
assert.equal(c.code,code);
assert.equal((await validateCoupon(code,'plus')).valid,true);
assert.equal((await validateCoupon(code,'pro')).valid,false);
assert.ok((await listCoupons()).some(x=>x.code===code));
console.log('Coupon smoke test: PASS');
// Test data is intentionally left in the local data file only; remove it in a real deployment if desired.
if(original)process.env.AI2_COUPON_TEST_CODE=original;
