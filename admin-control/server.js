import express from 'express';
import crypto from 'node:crypto';
import { readAccess, writeAccess } from '../premium/access-control.js';

const app=express();
const port=Number(process.env.AI2_ADMIN_CONTROL_PORT||3011);
const adminToken=String(process.env.AI2_ADMIN_TOKEN||'');
app.use(express.json({limit:'32kb'}));

function authorized(req){
  const supplied=String(req.get('x-ai2-admin-token')||req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  return Boolean(adminToken)&&supplied.length===adminToken.length&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(adminToken));
}
function guard(req,res,next){if(!authorized(req))return res.status(401).json({error:'Admin authentication required'});next();}

app.get('/health',(_q,r)=>r.json({ok:true,service:'Ai2 admin-control'}));
app.get('/api/admin/access',guard,async(_q,r)=>r.json(await readAccess()));
app.patch('/api/admin/access',guard,async(req,res)=>{
  const allowed=['platformEnabled','premiumEnabled','adultModeEnabled','adultMediaEnabled','plansEnabled','requireAgeVerification'];
  const patch={};
  for(const key of allowed)if(req.body?.[key]!==undefined)patch[key]=req.body[key];
  if(typeof patch.adultMediaEnabled==='boolean'&&patch.adultMediaEnabled){
    // This switch only controls the adult-media feature flag. It never enables graphic sexual generation.
    patch.adultMediaEnabled=true;
  }
  const state=await writeAccess(patch);
  res.json(state);
});
app.get('/api/admin/plans',guard,async(_q,r)=>{
  const state=await readAccess();
  r.json({premiumEnabled:state.premiumEnabled,plansEnabled:state.plansEnabled});
});

app.listen(port,()=>console.log(`Ai2 admin-control running on http://localhost:${port}`));
