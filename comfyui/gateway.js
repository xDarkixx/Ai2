import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comfyHealth, queueWorkflow, waitForWorkflow, outputUrl } from './client.js';
import { assertSafePrompt, buildTextToImageWorkflow } from './workflow-builder.js';

const app=express();
const port=Number(process.env.COMFYUI_GATEWAY_PORT||3020);
const dataDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','data','comfyui');
const jobs=new Map();
app.use(express.json({limit:'64kb'}));

function adminGuard(req,res,next){
  const configured=String(process.env.AI2_ADMIN_TOKEN||'');
  if(!configured)return res.status(503).json({error:'AI2_ADMIN_TOKEN is not configured'});
  const supplied=String(req.get('x-ai2-admin-token')||req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(supplied.length!==configured.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(configured)))return res.status(401).json({error:'Admin authentication required'});
  next();
}

app.get('/health',async(_req,res)=>{try{const stats=await comfyHealth();res.json({ok:true,service:'Ai2 ComfyUI gateway',comfyui:true,stats});}catch(error){res.status(503).json({ok:false,service:'Ai2 ComfyUI gateway',comfyui:false,error:error.message});}});

app.post('/api/comfyui/image',adminGuard,async(req,res)=>{
  try{
    if(String(process.env.COMFYUI_ENABLED||'true').toLowerCase()==='false')return res.status(503).json({error:'ComfyUI is disabled'});
    const prompt=assertSafePrompt(req.body?.prompt);
    const workflow=buildTextToImageWorkflow({prompt,negativePrompt:req.body?.negativePrompt,checkpoint:req.body?.checkpoint||process.env.COMFYUI_CHECKPOINT,seed:req.body?.seed,width:req.body?.width,height:req.body?.height,steps:req.body?.steps,cfg:req.body?.cfg});
    const queued=await queueWorkflow(workflow,`ai2-${crypto.randomUUID()}`);
    const promptId=queued?.prompt_id;
    if(!promptId)throw new Error('ComfyUI did not return a prompt_id');
    const id=crypto.randomUUID();
    const job={id,promptId,type:'image',status:'PENDING',createdAt:new Date().toISOString()};
    jobs.set(id,job);
    waitForWorkflow(promptId).then(item=>{job.status='COMPLETED';job.outputs=item.outputs||{};job.resultUrls=[];for(const output of Object.values(item.outputs||{})){for(const image of output.images||[]){job.resultUrls.push(outputUrl(image.filename,image.subfolder,image.type));}}}).catch(error=>{job.status='ERROR';job.error=error.message;});
    await fs.mkdir(dataDir,{recursive:true});
    await fs.writeFile(path.join(dataDir,`${id}.json`),JSON.stringify(job,null,2));
    res.status(202).json(job);
  }catch(error){res.status(400).json({error:error.message});}
});

app.get('/api/comfyui/jobs/:id',adminGuard,(req,res)=>{const job=jobs.get(String(req.params.id));if(!job)return res.status(404).json({error:'Job not found'});res.json(job);});

app.listen(port,'127.0.0.1',()=>console.log(`Ai2 ComfyUI gateway running on http://127.0.0.1:${port}`));
