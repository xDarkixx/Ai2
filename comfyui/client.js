const base=String(process.env.COMFYUI_BASE_URL||'http://127.0.0.1:8188').replace(/\/$/,'');

export async function comfyHealth(){
  const r=await fetch(`${base}/system_stats`);
  if(!r.ok)throw new Error(`ComfyUI health failed: HTTP ${r.status}`);
  return r.json();
}

export async function queueWorkflow(workflow,clientId='ai2'){
  const r=await fetch(`${base}/prompt`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:workflow,client_id:clientId})});
  const body=await r.text();
  if(!r.ok)throw new Error(`ComfyUI queue failed: HTTP ${r.status} ${body.slice(0,500)}`);
  return JSON.parse(body);
}

export async function getHistory(promptId){
  const r=await fetch(`${base}/history/${encodeURIComponent(promptId)}`);
  if(!r.ok)throw new Error(`ComfyUI history failed: HTTP ${r.status}`);
  return r.json();
}

export async function waitForWorkflow(promptId,{timeoutMs=900000,pollMs=1000}={}){
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
    const history=await getHistory(promptId);
    const item=history?.[promptId];
    if(item?.status?.completed || item?.outputs) return item;
    if(item?.status?.status_str==='error') throw new Error('ComfyUI workflow failed');
    await new Promise(resolve=>setTimeout(resolve,pollMs));
  }
  throw new Error('ComfyUI workflow timed out');
}

export function outputUrl(filename,subfolder='',type='output'){
  const q=new URLSearchParams({filename,subfolder,type});
  return `${base}/view?${q}`;
}
