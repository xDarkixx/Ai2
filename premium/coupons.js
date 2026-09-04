import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'coupons.json');

async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return {coupons:{}};}}
async function write(data){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2));return data;}
function normalizeCode(code){return String(code||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');}

export async function listCoupons(){const d=await read();return Object.values(d.coupons||{}).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
export async function createCoupon(input={}){
  const code=normalizeCode(input.code)||`AI2-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  if(code.length<4||code.length>40)throw new Error('Invalid coupon code');
  const d=await read();
  if(d.coupons?.[code])throw new Error('Coupon already exists');
  const type=input.type==='percent'?'percent':'fixed';
  const value=Number(input.value);
  if(!Number.isFinite(value)||value<=0)throw new Error('Coupon value must be greater than 0');
  if(type==='percent'&&value>100)throw new Error('Percent discount cannot exceed 100');
  const maxUses=input.maxUses==null||input.maxUses===''?null:Math.max(1,Math.floor(Number(input.maxUses)));
  const coupon={id:crypto.randomUUID(),code,type,value,plan:input.plan&&['free','plus','pro'].includes(input.plan)?input.plan:null,maxUses,used:0,expiresAt:input.expiresAt?new Date(input.expiresAt).toISOString():null,active:input.active!==false,createdAt:new Date().toISOString()};
  d.coupons[code]=coupon;await write(d);return coupon;
}
export async function updateCoupon(code,patch={}){
  const key=normalizeCode(code);const d=await read();const c=d.coupons?.[key];if(!c)throw new Error('Coupon not found');
  if(patch.active!==undefined)c.active=Boolean(patch.active);
  if(patch.maxUses!==undefined)c.maxUses=patch.maxUses==null||patch.maxUses===''?null:Math.max(1,Math.floor(Number(patch.maxUses)));
  if(patch.expiresAt!==undefined)c.expiresAt=patch.expiresAt?new Date(patch.expiresAt).toISOString():null;
  d.coupons[key]=c;await write(d);return c;
}
export async function deleteCoupon(code){const key=normalizeCode(code);const d=await read();if(!d.coupons?.[key])throw new Error('Coupon not found');delete d.coupons[key];await write(d);}
export async function validateCoupon(code,plan='free'){
  const key=normalizeCode(code);const d=await read();const c=d.coupons?.[key];if(!c||!c.active)return {valid:false,error:'Invalid coupon'};
  if(c.plan&&c.plan!==plan)return {valid:false,error:'Coupon is not valid for this plan'};
  if(c.expiresAt&&Date.now()>=Date.parse(c.expiresAt))return {valid:false,error:'Coupon has expired'};
  if(c.maxUses!==null&&c.used>=c.maxUses)return {valid:false,error:'Coupon usage limit reached'};
  return {valid:true,coupon:c};
}
export async function redeemCoupon(code,plan='free'){
  const result=await validateCoupon(code,plan);if(!result.valid)throw new Error(result.error);const d=await read();const c=d.coupons[normalizeCode(code)];c.used+=1;await write(d);return c;
}
