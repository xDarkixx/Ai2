import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const dataDir=path.join(root,'data');
const tokenFile=path.join(dataDir,'tokens.json');
const app=express();
const port=Number(process.env.AI2_TOKEN_PORT||3010);
const adminToken=String(process.env.AI2_ADMIN_TOKEN||'').trim();
const rateLimit=Math.max(0,Number(process.env.AI2_RATE_LIMIT_PER_MINUTE||120));
const counters=new Map();

app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));

function hashToken(token){return crypto.createHash('sha256').update(token).digest('hex');}
function safeEqual(a,b){const aa=Buffer.from(a,'hex'),bb=Buffer.from(b,'hex');return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
function newToken(){return `ai2_${crypto.randomBytes(32).toString('hex')}`;}
function empty(){return{tokens:[]};}
async function readTokens(){try{const value=JSON.parse(await fs.readFile(tokenFile,'utf8'));return{tokens:Array.isArray(value.tokens)?value.tokens:[]};}catch{return empty();}}
async function writeTokens(value){await fs.mkdir(dataDir,{recursive:true});await fs.writeFile(tokenFile,JSON.stringify(value,null,2),'utf8');}
function cleanExpiry(value){if(value===null||value===undefined||value==='')return null;const d=new Date(value);if(Number.isNaN(d.getTime()))return undefined;return d.toISOString();}
function bearer(req){const h=String(req.get('authorization')||'');if(!h.toLowerCase().startsWith('bearer '))return null;return h.slice(7).trim();}
async function resolveToken(raw){if(!raw)return null;const h=hashToken(raw),s=await readTokens();const item=s.tokens.find(x=>safeEqual(x.tokenHash,h)&&!x.revokedAt);if(!item)return null;if(item.expiresAt&&Date.parse(item.expiresAt)<=Date.now())return null;return item;}
function requireAdmin(req,res,next){if(!adminToken)return res.status(503).json({error:'AI2_ADMIN_TOKEN is not configured'});const supplied=bearer(req)||String(req.get('x-ai2-admin-token')||'');if(!supplied||!safeEqual(hashToken(supplied),hashToken(adminToken)))return res.status(401).json({error:'admin authentication required'});next();}
async function requireApiToken(req,res,next){const raw=bearer(req)||String(req.get('x-ai2-token')||'');const token=await resolveToken(raw);if(!token)return res.status(401).json({error:'valid Ai2 API token required'});if(rateLimit>0){const now=Date.now(),windowStart=now-60000;let c=counters.get(token.id);if(!c||c.startedAt<windowStart)c={startedAt:now,count:0};c.count++;counters.set(token.id,c);res.set('X-Ai2-RateLimit-Limit',String(rateLimit));res.set('X-Ai2-RateLimit-Remaining',String(Math.max(0,rateLimit-c.count)));if(c.count>rateLimit)return res.status(429).json({error:'rate limit exceeded'});}const s=await readTokens();const item=s.tokens.find(x=>x.id===token.id);if(item){item.lastUsedAt=new Date().toISOString();item.requestCount=Number(item.requestCount||0)+1;await writeTokens(s);}req.ai2Token=token;next();}

app.get('/health',(_req,res)=>res.json({ok:true,service:'Ai2 token server',version:'1.0.0',configured:Boolean(adminToken),rateLimitPerMinute:rateLimit}));
app.post('/api/auth/tokens',requireAdmin,async(req,res)=>{const name=String(req.body?.name||'Unnamed client').trim().slice(0,100);const userId=String(req.body?.userId||'local').trim().slice(0,120);const expiresAt=cleanExpiry(req.body?.expiresAt);if(expiresAt===undefined)return res.status(400).json({error:'expiresAt must be a valid date or null'});if(expiresAt&&Date.parse(expiresAt)<=Date.now())return res.status(400).json({error:'expiresAt must be in the future'});const raw=newToken(),now=new Date().toISOString(),item={id:`tok_${crypto.randomUUID()}`,name,userId,tokenHash:hashToken(raw),createdAt:now,expiresAt:expiresAt||null,revokedAt:null,lastUsedAt:null,requestCount:0};const s=await readTokens();s.tokens.push(item);await writeTokens(s);res.status(201).json({token:raw,tokenInfo:{id:item.id,name:item.name,userId:item.userId,createdAt:item.createdAt,expiresAt:item.expiresAt}});});
app.get('/api/auth/tokens',requireAdmin,async(_req,res)=>{const s=await readTokens();res.json(s.tokens.map(({tokenHash,...safe})=>safe));});
app.post('/api/auth/tokens/:id/rotate',requireAdmin,async(req,res)=>{const s=await readTokens(),old=s.tokens.find(x=>x.id===req.params.id);if(!old)return res.status(404).json({error:'token not found'});if(!old.revokedAt)old.revokedAt=new Date().toISOString();const raw=newToken(),now=new Date().toISOString(),item={id:`tok_${crypto.randomUUID()}`,name:String(req.body?.name||old.name).slice(0,100),userId:String(req.body?.userId||old.userId).slice(0,120),tokenHash:hashToken(raw),createdAt:now,expiresAt:old.expiresAt,revokedAt:null,lastUsedAt:null,requestCount:0};s.tokens.push(item);await writeTokens(s);res.status(201).json({token:raw,tokenInfo:{id:item.id,name:item.name,userId:item.userId,createdAt:item.createdAt,expiresAt:item.expiresAt}});});
app.post('/api/auth/tokens/:id/revoke',requireAdmin,async(req,res)=>{const s=await readTokens(),item=s.tokens.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'token not found'});if(!item.revokedAt)item.revokedAt=new Date().toISOString();await writeTokens(s);res.json({ok:true,id:item.id,revokedAt:item.revokedAt});});
app.delete('/api/auth/tokens/:id',requireAdmin,async(req,res)=>{const s=await readTokens(),item=s.tokens.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'token not found'});if(!item.revokedAt)item.revokedAt=new Date().toISOString();await writeTokens(s);res.status(204).end();});
app.get('/api/auth/me',requireApiToken,(req,res)=>res.json({authenticated:true,token:{id:req.ai2Token.id,name:req.ai2Token.name,userId:req.ai2Token.userId,createdAt:req.ai2Token.createdAt,expiresAt:req.ai2Token.expiresAt,lastUsedAt:req.ai2Token.lastUsedAt,requestCount:req.ai2Token.requestCount}}));

app.listen(port,()=>console.log(`Ai2 token server running on http://localhost:${port}`));
