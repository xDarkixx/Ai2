import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAccess, writeAccess } from '../premium/access-control.js';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '../premium/coupons.js';
import { audit, listAudit } from './audit.js';

const app=express();
const port=Number(process.env.AI2_ADMIN_CONTROL_PORT||3011);
const adminToken=String(process.env.AI2_ADMIN_TOKEN||'');
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const subscriptionsFile=path.join(root,'premium','subscriptions.json');
app.use(express.json({limit:'32kb'}));
function authorized(req){const supplied=String(req.get('x-ai2-admin-token')||req.get('authorization')||'').replace(/^Bearer\s+/i,'');return Boolean(adminToken)&&supplied.length===adminToken.length&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(adminToken));}
function guard(req,res,next){if(!authorized(req))return res.status(401).json({error:'Admin authentication required'});next();}
async function readSubscriptions(){try{return JSON.parse(await fs.readFile(subscriptionsFile,'utf8'));}catch{return {users:{}};}}
async function writeSubscriptions(s){await fs.mkdir(path.dirname(subscriptionsFile),{recursive:true});await fs.writeFile(subscriptionsFile,JSON.stringify(s,null,2));return s;}

app.get('/health',(_q,r)=>r.json({ok:true,service:'Ai2 admin-control'}));
app.get('/api/admin/access',guard,async(_q,r)=>r.json(await readAccess()));
app.patch('/api/admin/access',guard,async(req,res)=>{const allowed=['platformEnabled','premiumEnabled','adultModeEnabled','adultMediaEnabled','comfyuiEnabled','plansEnabled','requireAgeVerification'];const patch={};for(const key of allowed)if(req.body?.[key]!==undefined)patch[key]=req.body[key];const state=await writeAccess(patch);await audit('access.updated',{keys:Object.keys(patch)});res.json(state);});
app.get('/api/admin/plans',guard,async(_q,r)=>{const state=await readAccess();r.json({premiumEnabled:state.premiumEnabled,plansEnabled:state.plansEnabled,comfyuiEnabled:state.comfyuiEnabled});});
app.get('/api/admin/subscriptions',guard,async(_q,r)=>r.json(await readSubscriptions()));
app.put('/api/admin/subscriptions/:userId',guard,async(req,res)=>{const userId=String(req.params.userId||'').trim();const plan=String(req.body?.plan||'free').toLowerCase();if(!userId)return res.status(400).json({error:'userId is required'});if(!['free','plus','pro'].includes(plan))return res.status(400).json({error:'plan must be free, plus or pro'});const s=await readSubscriptions();s.users[userId]={plan,adultAccess:Boolean(req.body?.adultAccess),active:req.body?.active!==false,updatedAt:new Date().toISOString()};await writeSubscriptions(s);await audit('subscription.updated',{userId,plan,active:s.users[userId].active});res.json(s.users[userId]);});
app.delete('/api/admin/subscriptions/:userId',guard,async(req,res)=>{const userId=String(req.params.userId);const s=await readSubscriptions();delete s.users[userId];await writeSubscriptions(s);await audit('subscription.deleted',{userId});res.status(204).end();});
app.get('/api/admin/coupons',guard,async(_q,r)=>r.json({coupons:await listCoupons()}));
app.post('/api/admin/coupons',guard,async(req,res)=>{try{const c=await createCoupon(req.body||{});await audit('coupon.created',{code:c.code,plan:c.plan,type:c.type});res.status(201).json(c);}catch(e){res.status(400).json({error:e.message});}});
app.patch('/api/admin/coupons/:code',guard,async(req,res)=>{try{const c=await updateCoupon(req.params.code,req.body||{});await audit('coupon.updated',{code:c.code,active:c.active});res.json(c);}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/admin/coupons/:code',guard,async(req,res)=>{try{await deleteCoupon(req.params.code);await audit('coupon.deleted',{code:String(req.params.code).toUpperCase()});res.status(204).end();}catch(e){res.status(404).json({error:e.message});}});
app.get('/api/admin/audit',guard,async(req,res)=>res.json({entries:await listAudit(req.query.limit)}));
app.get('/api/admin/stats',guard,async(_req,res)=>{const subscriptions=await readSubscriptions();const users=Object.values(subscriptions.users||{});const coupons=await listCoupons();res.json({subscriptions:{total:users.length,active:users.filter(x=>x.active!==false).length,free:users.filter(x=>x.plan==='free').length,plus:users.filter(x=>x.plan==='plus').length,pro:users.filter(x=>x.plan==='pro').length},coupons:{total:coupons.length,active:coupons.filter(x=>x.active).length,redemptions:coupons.reduce((n,x)=>n+Number(x.used||0),0)},runtime:{node:process.version,platform:process.platform,uptimeSeconds:Math.round(process.uptime())}});});
app.listen(port,()=>console.log(`Ai2 admin-control running on http://localhost:${port}`));
