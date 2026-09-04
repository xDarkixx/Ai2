import { spawn } from 'node:child_process';

const children=[
  ['server.js','Ai2'],
  ['auth/token-server.js','Ai2 token-server'],
  ['admin-control/server.js','Ai2 admin-control'],
  ['comfyui/gateway.js','Ai2 ComfyUI gateway']
];
const procs=children.map(([file,label])=>{
  const p=spawn(process.execPath,[file],{stdio:'inherit',windowsHide:false});
  p.on('exit',(code,signal)=>console.log(`${label} stopped (${signal||code})`));
  return p;
});
function stop(){for(const p of procs)try{p.kill('SIGTERM')}catch{}setTimeout(()=>process.exit(0),250);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
