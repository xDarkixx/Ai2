import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'..','data','admin-audit.jsonl');

export async function audit(action,details={}){
  const entry={id:crypto.randomUUID(),at:new Date().toISOString(),action,details};
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.appendFile(file,JSON.stringify(entry)+'\n');
  return entry;
}

export async function listAudit(limit=100){
  try{
    const text=await fs.readFile(file,'utf8');
    return text.split(/\n/).filter(Boolean).slice(-Math.min(Math.max(Number(limit)||100,1),500)).reverse().map(x=>JSON.parse(x));
  }catch{return [];}
}
