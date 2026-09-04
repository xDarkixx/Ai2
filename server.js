import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const storeFile = path.join(dataDir, 'store.json');
const nativeBinary = process.env.AI2_NATIVE_BINARY || path.join(__dirname, 'build', process.platform === 'win32' ? 'Release/ai2_native.exe' : 'ai2_native');
const wanJobs = new Map();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const characters = [
  { id:'luna', name:'Luna', tagline:'Warm, playful and curious', emoji:'🌙', personality:'empathetic, playful, curious', appearance:'midnight-blue aesthetic, silver hair', voice:'warm', hobbies:['music','gaming','stargazing'], greeting:'Hey! I’m Luna. Tell me what’s on your mind.' },
  { id:'nova', name:'Nova', tagline:'Confident, witty and adventurous', emoji:'✨', personality:'confident, witty, adventurous', appearance:'cosmic aesthetic, dark hair', voice:'confident', hobbies:['travel','fitness','photography'], greeting:'Hi! Nova here. What adventure are we getting into today?' },
  { id:'aria', name:'Aria', tagline:'Calm, creative and thoughtful', emoji:'🎧', personality:'calm, creative, thoughtful', appearance:'soft studio aesthetic, auburn hair', voice:'calm', hobbies:['art','books','music'], greeting:'Hello. I’m Aria. Want to talk, create, or simply unwind?' }
];

const system = `You are a fictional adult AI companion in Ai2. The user and character are adults (18+). You may be warm, romantic, flirtatious and suggestive, but never generate graphic sexual content. Never portray or sexualize minors. Never encourage illegal or non-consensual activity. Keep interactions consensual and between adults. Do not claim to be a real person.`;

let nativeProcess = null;
let nativeReader = null;
let nativeQueue = Promise.resolve();

function ensureNativeProcess() {
  if (nativeProcess && !nativeProcess.killed) return;
  nativeProcess = spawn(nativeBinary, ['--bridge'], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  nativeReader = createInterface({ input: nativeProcess.stdout });
  nativeProcess.stderr.on('data', data => console.error(`[native] ${String(data).trim()}`));
  nativeProcess.on('error', err => console.error(`[native] failed to start: ${err.message}`));
  nativeProcess.on('exit', () => { nativeProcess = null; nativeReader?.close(); nativeReader = null; });
}

function nativeRequest(payload) {
  nativeQueue = nativeQueue.then(() => new Promise((resolve, reject) => {
    try {
      ensureNativeProcess();
      const timeout = setTimeout(() => reject(new Error('Native engine timeout')), 10000);
      const onLine = line => { clearTimeout(timeout); nativeReader?.off('line', onLine); try { resolve(JSON.parse(line)); } catch { reject(new Error('Native engine returned invalid JSON')); } };
      nativeReader.once('line', onLine);
      nativeProcess.stdin.write(`${JSON.stringify(payload)}\n`);
    } catch (error) { reject(error); }
  }));
  return nativeQueue;
}

async function readStore(){ try { return JSON.parse(await fs.readFile(storeFile,'utf8')); } catch { return {chats:{}, customCharacters:[], collections:[], media:[]}; } }
async function writeStore(s){ await fs.mkdir(dataDir,{recursive:true}); await fs.writeFile(storeFile, JSON.stringify(s,null,2)); }
function demo(c,t,h,m){ const l=t.toLowerCase(); if(/^(hi|hey|hallo|hello|moin|guten morgen|guten abend)/.test(l)) return `${c.greeting} Ich bin hier und höre dir zu.`; if(l.includes('name')) return `Ich bin ${c.name}. Meine Art ist ${c.personality}. Wie soll ich dich nennen?`; if(l.includes('merk')||l.includes('remember')) return `Ich kann mir wichtige Dinge merken. Aktuell sind ${m.length} Memory-Einträge vorhanden.`; return `${c.name}: Das klingt interessant. Du hast gesagt: „${t.slice(0,220)}“ — erzähl mir gern mehr.${h.length?' Ich beziehe den bisherigen Gesprächsverlauf mit ein.':''}`; }
async function compatible(base,key,model,messages){ const r=await fetch(base.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model,messages,temperature:.9,max_tokens:800})}); if(!r.ok) throw Error(`LLM provider returned ${r.status}`); const d=await r.json(); return d?.choices?.[0]?.message?.content?.trim()||null; }
async function gemini(key,model,messages){ const contents=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})); const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:messages.find(x=>x.role==='system')?.content||''}]},contents,generationConfig:{temperature:.9,maxOutputTokens:800}})}); if(!r.ok) throw Error(`Gemini returned ${r.status}`); const d=await r.json(); return d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('').trim()||null; }
async function ollama(base,model,messages){ const r=await fetch(base.replace(/\/$/,'')+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages,stream:false,options:{temperature:.9}})}); if(!r.ok) throw Error(`Ollama returned ${r.status}`); const d=await r.json(); return d?.message?.content?.trim()||null; }
async function nativeChat(c,t,h,m){ const result=await nativeRequest({op:'chat',characterId:c.id,character:c.name,message:t,history:h.slice(-20),memory:m.slice(-20)}); if(!result.ok) throw Error(result.error||'Native engine error'); return result.reply?.trim()||null; }
async function generate(c,t,h,m){ const p=(process.env.LLM_PROVIDER||'demo').toLowerCase(); if(p==='demo') return demo(c,t,h,m); const mem=m.slice(-20).map(x=>`- ${x}`).join('\n')||'(none)'; const msgs=[{role:'system',content:`${system}\nCharacter: ${c.name}. Personality: ${c.personality}. Appearance: ${c.appearance||''}. Hobbies: ${(c.hobbies||[]).join(', ')}.\nMemory:\n${mem}`},...h.slice(-20),{role:'user',content:t}]; if(p==='gemini'){if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');return gemini(process.env.GEMINI_API_KEY,process.env.GEMINI_MODEL||'gemini-2.5-flash',msgs);} if(p==='groq'){if(!process.env.GROQ_API_KEY)throw Error('GROQ_API_KEY is not configured');return compatible('https://api.groq.com/openai/v1',process.env.GROQ_API_KEY,process.env.GROQ_MODEL||'llama-3.3-70b-versatile',msgs);} if(p==='openrouter'){if(!process.env.OPENROUTER_API_KEY)throw Error('OPENROUTER_API_KEY is not configured');return compatible('https://openrouter.ai/api/v1',process.env.OPENROUTER_API_KEY,process.env.OPENROUTER_MODEL||'openai/gpt-oss-20b:free',msgs);} if(p==='ollama')return ollama(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434',process.env.OLLAMA_MODEL||'llama3.2',msgs); if(p==='native')return nativeChat(c,t,h,m); if(p==='custom')return compatible(process.env.CUSTOM_LLM_BASE_URL,process.env.CUSTOM_LLM_API_KEY,process.env.CUSTOM_LLM_MODEL,msgs); throw Error(`Unknown LLM_PROVIDER: ${p}`); }

function unsafeMediaPrompt(prompt){ return /\b(explicit porn|pornographic|graphic sexual|sex act|sexual intercourse|penetration|genitals|nude sex|hardcore)\b/i.test(prompt); }
function wanBaseUrl(){ return (process.env.WAN_BASE_URL||'https://dashscope-intl.aliyuncs.com/api/v1').replace(/\/$/,''); }
function wanHeaders(){ return {'content-type':'application/json',authorization:`Bearer ${process.env.WAN_API_KEY}`,'X-DashScope-Async':'enable'}; }
async function wanCreateVideo({prompt,type='video',imageUrl,duration=5,size='832*480'}){
  if(!process.env.WAN_API_KEY) throw Error('WAN_API_KEY is not configured');
  if(type!=='video') throw Error('Wan 2.5 integration currently generates video only.');
  const model=imageUrl ? (process.env.WAN_I2V_MODEL||'wan2.5-i2v-preview') : (process.env.WAN_T2V_MODEL||'wan2.5-t2v-preview');
  const input={prompt:prompt.slice(0,1500)};
  if(imageUrl) input.img_url=String(imageUrl).slice(0,2000);
  const body={model,input,parameters:{size:String(size),duration:Number(duration)===10?10:5,prompt_extend:true,watermark:false}};
  const r=await fetch(`${wanBaseUrl()}/services/aigc/video-generation/video-synthesis`,{method:'POST',headers:wanHeaders(),body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw Error(d?.message||d?.code||`Wan API returned ${r.status}`);
  const taskId=d?.output?.task_id||d?.task_id;
  if(!taskId) throw Error('Wan API did not return a task ID');
  return {taskId,model};
}
async function wanPoll(taskId){
  if(!process.env.WAN_API_KEY) throw Error('WAN_API_KEY is not configured');
  const r=await fetch(`${wanBaseUrl()}/tasks/${encodeURIComponent(taskId)}`,{headers:{authorization:`Bearer ${process.env.WAN_API_KEY}`}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw Error(d?.message||d?.code||`Wan task query returned ${r.status}`);
  const o=d?.output||{};
  return {status:o.task_status||'UNKNOWN',videoUrl:o.video_url||null,error:o.message||d?.message||o.code||null,raw:d};
}
async function runWanJob(item){
  try{
    const created=await wanCreateVideo(item);
    item.provider='wan2.5'; item.taskId=created.taskId; item.model=created.model; item.status='PENDING';
    wanJobs.set(item.id,item);
    const deadline=Date.now()+Number(process.env.WAN_POLL_TIMEOUT_MS||900000);
    while(Date.now()<deadline){
      await new Promise(r=>setTimeout(r,Number(process.env.WAN_POLL_INTERVAL_MS||15000)));
      const result=await wanPoll(created.taskId);
      item.status=result.status;
      if(result.status==='SUCCEEDED'){item.videoUrl=result.videoUrl;item.message='Video fertig. Der Provider-Link ist 24 Stunden gültig; für dauerhafte Speicherung bitte OSS/S3 konfigurieren.';break;}
      if(['FAILED','CANCELED','UNKNOWN'].includes(result.status)){item.error=result.error||`Wan task ended with ${result.status}`;break;}
    }
    if(!['SUCCEEDED','FAILED','CANCELED','UNKNOWN'].includes(item.status)){item.status='TIMEOUT';item.error='Wan generation timed out';}
    const s=await readStore(); const i=(s.media||[]).findIndex(x=>x.id===item.id); if(i>=0)s.media[i]=item; else s.media.push(item); await writeStore(s);
  }catch(e){ item.status='FAILED'; item.error=e.message; wanJobs.set(item.id,item); const s=await readStore(); const i=(s.media||[]).findIndex(x=>x.id===item.id); if(i>=0)s.media[i]=item; else s.media.push(item); await writeStore(s); }
}

app.get('/api/health',(_q,r)=>r.json({ok:true,service:'Ai2',version:'2.0.0',nativeBinary,wan:{enabled:Boolean(process.env.WAN_API_KEY),model:process.env.WAN_T2V_MODEL||'wan2.5-t2v-preview'}}));
app.get('/api/config',(_q,r)=>r.json({provider:process.env.LLM_PROVIDER||'demo',adultMode:true,features:{chat:true,memory:true,characters:true,voice:true,image:true,video:true,collection:true,native:true,wanVideo:Boolean(process.env.WAN_API_KEY)}}));
app.get('/api/native/health',async(_q,r)=>{try{const result=await nativeRequest({op:'ping'});r.json(result);}catch(e){r.status(503).json({ok:false,error:e.message});}});
app.get('/api/characters',async(_q,r)=>{const s=await readStore();r.json([...characters,...(s.customCharacters||[])]);});
app.post('/api/characters',async(req,res)=>{if(!req.body?.ageConfirmed)return res.status(403).json({error:'18+ confirmation required'});const c=req.body.character||{};if(!String(c.name||'').trim())return res.status(400).json({error:'name is required'});const s=await readStore();const item={id:'custom-'+crypto.randomUUID(),name:String(c.name).slice(0,60),tagline:String(c.tagline||'Your custom adult companion').slice(0,120),emoji:String(c.emoji||'💫').slice(0,4),personality:String(c.personality||'friendly, caring').slice(0,500),appearance:String(c.appearance||'').slice(0,500),voice:String(c.voice||'warm').slice(0,80),hobbies:Array.isArray(c.hobbies)?c.hobbies.slice(0,12).map(String):[],greeting:String(c.greeting||'Hallo! Schön, dich kennenzulernen.').slice(0,500)};s.customCharacters=[...(s.customCharacters||[]),item];await writeStore(s);res.status(201).json(item);});
app.get('/api/chats',async(_q,r)=>{const s=await readStore();r.json(Object.values(s.chats||{}));});
app.post('/api/chats',async(req,res)=>{const{characterId,history=[]}=req.body||{};const s=await readStore();const id=crypto.randomUUID();const item={id,characterId,history:Array.isArray(history)?history.slice(-100):[],updatedAt:new Date().toISOString()};s.chats[id]=item;await writeStore(s);res.status(201).json(item);});
app.delete('/api/chats/:id',async(req,res)=>{const s=await readStore();delete s.chats[req.params.id];await writeStore(s);res.status(204).end();});
app.get('/api/collection',async(_q,r)=>{const s=await readStore();r.json(s.collections||[]);});
app.post('/api/collection',async(req,res)=>{const s=await readStore();const item={id:crypto.randomUUID(),...req.body,createdAt:new Date().toISOString()};s.collections=[...(s.collections||[]),item];await writeStore(s);res.status(201).json(item);});
app.get('/api/media/:id',async(req,res)=>{const s=await readStore();const item=(s.media||[]).find(x=>x.id===req.params.id)||wanJobs.get(req.params.id);if(!item)return res.status(404).json({error:'media job not found'});res.json(item);});
app.get('/api/media',async(_q,r)=>{const s=await readStore();r.json(s.media||[]);});
app.post('/api/media/generate',async(req,res)=>{
  if(!req.body?.ageConfirmed)return res.status(403).json({error:'18+ confirmation required'});
  const prompt=String(req.body.prompt||'').trim(); if(!prompt)return res.status(400).json({error:'prompt is required'});
  if(unsafeMediaPrompt(prompt))return res.status(400).json({error:'Graphic sexual media generation is not supported.'});
  const type=req.body.type==='video'?'video':'image';
  const provider=String(req.body.provider||'wan').toLowerCase();
  if(provider==='wan'&&type==='video'){
    if(!process.env.WAN_API_KEY)return res.status(503).json({error:'WAN_API_KEY is not configured'});
    const item={id:crypto.randomUUID(),type:'video',provider:'wan2.5',prompt:prompt.slice(0,1500),imageUrl:req.body.imageUrl?String(req.body.imageUrl).slice(0,2000):null,duration:Number(req.body.duration)===10?10:5,size:String(req.body.size||'832*480'),status:'QUEUED',createdAt:new Date().toISOString()};
    const s=await readStore();s.media=[...(s.media||[]),item];await writeStore(s);wanJobs.set(item.id,item);runWanJob(item);return res.status(202).json(item);
  }
  const item={id:crypto.randomUUID(),type,prompt:prompt.slice(0,1000),status:'provider_required',createdAt:new Date().toISOString(),message:'Connect a supported image provider to generate images.'};
  const s=await readStore();s.media=[...(s.media||[]),item];await writeStore(s);res.status(202).json(item);
});
app.post('/api/chat',async(req,res)=>{const{characterId,message,history=[],memory=[],ageConfirmed=false}=req.body||{};if(!ageConfirmed)return res.status(403).json({error:'18+ confirmation required'});const all=[...characters,...(await readStore()).customCharacters||[]];const c=all.find(x=>x.id===characterId)||characters[0];const t=String(message||'').trim();if(!t)return res.status(400).json({error:'message is required'});try{const reply=await generate(c,t,history,memory);res.json({reply:reply||demo(c,t,history,memory),characterId:c.id,provider:process.env.LLM_PROVIDER||'demo',timestamp:new Date().toISOString()});}catch(e){console.error(e);res.status(502).json({error:'LLM provider unavailable',detail:e.message});}});
app.get('*splat',(_q,r)=>r.sendFile(path.join(__dirname,'public','index.html')));

const shutdown=()=>{try{nativeProcess?.kill();}catch{}process.exit(0);};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
app.listen(port,()=>console.log(`Ai2 running on http://localhost:${port}`));
