import http from 'node:http';
import { spawn } from 'node:child_process';

let calls=0;
const mock=http.createServer(async(req,res)=>{
  if(req.url==='/api/chat'&&req.method==='POST'){
    calls++;
    let body='';for await(const chunk of req)body+=chunk;
    const payload=JSON.parse(body);
    res.setHeader('content-type','application/json');
    if(calls===1){
      res.end(JSON.stringify({message:{role:'assistant',content:'',tool_calls:[{function:{name:'save_memory',arguments:{characterId:'luna',text:'CI tool memory',memoryType:'Fakt'}}}]},done:true}));
    }else{
      const hasTool=Array.isArray(payload.messages)&&payload.messages.some(x=>x.role==='tool'&&String(x.content).includes('CI tool memory'));
      res.end(JSON.stringify({message:{role:'assistant',content:hasTool?'TOOL-LOOP-OK':'TOOL-LOOP-MISSING'},done:true}));
    }
    return;
  }
  if(req.url==='/api/tags'){res.setHeader('content-type','application/json');res.end(JSON.stringify({models:[{name:'qwen3:0.6b-q4_K_M'}]}));return;}
  res.statusCode=404;res.end();
});
await new Promise(resolve=>mock.listen(11434,'127.0.0.1',resolve));
const env={...process.env,PORT:'3000',LLM_PROVIDER:'ollama',OLLAMA_BASE_URL:'http://127.0.0.1:11434',OLLAMA_MODEL:'qwen3:0.6b-q4_K_M',AI2_NATIVE_BINARY:'/nonexistent'};
const server=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',d=>output+=String(d));server.stderr.on('data',d=>output+=String(d));
try{
  for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:3000/api/health');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const r=await fetch('http://127.0.0.1:3000/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({characterId:'luna',message:'Please remember that CI tool memory is important.',ageConfirmed:true})});
  const d=await r.json();
  if(!r.ok||d.reply!=='TOOL-LOOP-OK')throw new Error(`Unexpected orchestrator response: ${JSON.stringify(d)}\n${output}`);
  const memories=await (await fetch('http://127.0.0.1:3000/api/memory?characterId=luna')).json();
  if(!memories.some(x=>x.text==='CI tool memory'))throw new Error('Tool did not persist memory');
  console.log('Ollama tool orchestration: PASS');
}finally{
  server.kill('SIGTERM');mock.close();
}
