import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(root,'..','data');
const file=path.join(dataDir,'access-control.json');

const defaults={
  platformEnabled:true,
  premiumEnabled:true,
  adultModeEnabled:true,
  adultMediaEnabled:false,
  plansEnabled:{free:true,plus:true,pro:true},
  requireAgeVerification:true,
  updatedAt:null
};

export async function readAccess(){
  try{return {...defaults,...JSON.parse(await fs.readFile(file,'utf8'))};}
  catch{return {...defaults};}
}

export async function writeAccess(patch={}){
  const current=await readAccess();
  const next={...current,...patch,updatedAt:new Date().toISOString()};
  await fs.mkdir(dataDir,{recursive:true});
  await fs.writeFile(file,JSON.stringify(next,null,2));
  return next;
}

export function planAllows(plan,limits){
  const p=String(plan||'free').toLowerCase();
  return limits?.[p]!==false;
}
