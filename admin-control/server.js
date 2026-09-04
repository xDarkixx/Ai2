import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAccess, writeAccess } from '../premium/access-control.js';

const app=express();
const port=Number(process.env.AI2_ADMIN_CONTROL_PORT||3011);
const adminToken=String(process.env.AI2_ADMIN_TOKEN||'');
const subscriptionsFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','premium','subscriptions.json');
app.use(express.json({limit:'32kb'}));

function authorized(req){
  const supplied=String(req.get('x-ai2-admin-token')||req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  return Boolean(adminToken)&&supplied.length===adminToken.length&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(adminToken));
}
function guard(req,res,next){if(!authorized(req))return res.status(401).json({error:'Admin authentication required'});next();}
async function readSubscriptions(){try{return JSON.parse(await fs.readFile(subscriptionsFile,'utf8'));}catch{return {users:{}};}}
async function writeSubscriptions(s){await fs.mkdir(path.dirname(subscriptionsFile),{recursive:true});await fs.writeFile(subscriptionsFile,JSON.stringify(s,null,2));return s;}

app.get('/health',(_q,r)=>r.json({ok:true,service:'Ai2 admin-control'}));
app.get('/api/admin/access',guard,async(_q,r)=>r.json(await readAccess()));
app.patch('/api/admin/access',guard,async(req,res)=>{
  const allowed=['platformEnabled','premiumEnabled','adultModeEnabled','adultMediaEnabled','plansEnabled','requireAgeVerification'];
  const patch={};
  for(const key of allowed)if(req.body?.[key]!==undefined)patch[key]=req.body[key];
  if(typeof patch.adultMediaEnabled==='boolean'&&patch.adultMediaEnabled)patch.adultMediaEnabled=true;
  const state=await writeAccess(patch);
  res.json(state);
});
app.get('/api/admin/plans',guard,async(_q,r)=>{const state=await readAccess();r.json({premiumEnabled:state.premiumEnabled,plansEnabled:state.plansEnabled});});
app.get('/api/admin/subscriptions',guard,async(_q,r)=>r.json(await readSubscriptions()));
app.put('/api/admin/subscriptions/:userId',guard,async(req,res)=>{
  const userId=String(req.params.userId||'').trim();
  const plan=String(req.body?.plan||'free').toLowerCase();
  if(!userId)return res.status(400).json({error:'userId is required'});
  if(!['free','plus','pro'].includes(plan))return res.status(400).json({error:'plan must be free, plus or pro'});
  const s=await readSubscriptions();
  s.users[userId]={plan,adultAccess:Boolean(req.body?.adultAccess),active:req.body?.active!==false,updatedAt:new Date().toISOString()};
  await writeSubscriptions(s);res.json(s.users[userId]);
});
app.delete('/api/admin/subscriptions/:userId',guard,async(req,res)=>{const s=await readSubscriptions();delete s.users[String(req.params.userId)];await writeSubscriptions(s);res.status(204).end();});

app.listen(port,()=>console.log(`Ai2 admin-control running on http://localhost:${port}`));
