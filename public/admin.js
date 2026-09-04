const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const adminHeaders=()=>{const t=sessionStorage.getItem('ai2AdminToken')||'';return t?{'x-ai2-admin-token':t}:{}};
async function api(url,opt={}){const r=await fetch(url,{headers:{'content-type':'application/json',...adminHeaders(),...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
async function loadAccess(){
  try{const s=await api('/api/admin/access');
    $('#platformEnabled').checked=Boolean(s.platformEnabled);$('#premiumEnabled').checked=Boolean(s.premiumEnabled);$('#adultModeEnabled').checked=Boolean(s.adultModeEnabled);$('#adultMediaEnabled').checked=Boolean(s.adultMediaEnabled);$('#requireAgeVerification').checked=Boolean(s.requireAgeVerification);
    $('#planFree').checked=s.plansEnabled?.free!==false;$('#planPlus').checked=s.plansEnabled?.plus!==false;$('#planPro').checked=s.plansEnabled?.pro!==false;
    $('#accessStatus').textContent=`Verbunden · zuletzt geändert: ${s.updatedAt||'Standard'}`;
  }catch(e){$('#accessStatus').textContent=`Nicht verbunden: ${e.message}`;}
}
async function saveAccess(){
  try{const s=await api('/api/admin/access',{method:'PATCH',body:JSON.stringify({platformEnabled:$('#platformEnabled').checked,premiumEnabled:$('#premiumEnabled').checked,adultModeEnabled:$('#adultModeEnabled').checked,adultMediaEnabled:$('#adultMediaEnabled').checked,requireAgeVerification:$('#requireAgeVerification').checked,plansEnabled:{free:$('#planFree').checked,plus:$('#planPlus').checked,pro:$('#planPro').checked}})});$('#accessStatus').textContent=`Gespeichert · ${s.updatedAt}`;}
  catch(e){$('#accessStatus').textContent=`Fehler: ${e.message}`;}
}
$('#saveAdminToken').onclick=async()=>{const t=$('#adminToken').value.trim();if(!t)return;sessionStorage.setItem('ai2AdminToken',t);$('#adminToken').value='';await loadAccess();};
$('#saveAccess').onclick=saveAccess;
async function load(){try{const [health,config,chars,media,chats,collection]=await Promise.all([api('/api/health'),api('/api/config'),api('/api/characters'),api('/api/media'),api('/api/chats'),api('/api/collection')]);
$('#systemStatus').textContent=health.ok?'System online':'Systemfehler';
$('#stats').innerHTML=[['Charaktere',chars.length,'verfügbar'],['Chats',chats.length,'gespeichert'],['Medien',media.length,'Aufträge'],['Sammlung',collection.length,'Einträge'],['LLM',config.provider,'aktiver Provider']].map(x=>`<div class="stat-card"><div class="stat-label">${esc(x[0])}</div><div class="stat-value">${esc(x[1])}</div><div class="stat-sub">${esc(x[2])}</div></div>`).join('');
const features=config.features||{};$('#systemGrid').innerHTML=[['LLM Provider',config.provider,'ok'],['Wan 2.5 Cloud',features.wan25?'Aktiv':'Nicht konfiguriert',features.wan25?'ok':'warn'],['Wan2.2 lokal',features.wan22?'Aktiv':'Nicht konfiguriert',features.wan22?'ok':'warn'],['Native Bridge',features.native?'Verfügbar':'Aus',features.native?'ok':'warn'],['Chat',features.chat?'Aktiv':'Aus',features.chat?'ok':'warn'],['Memory',features.memory?'Aktiv':'Aus',features.memory?'ok':'warn'],['Video',features.video?'Aktiv':'Aus',features.video?'ok':'warn'],['Adult Mode',config.adultMode?'18+ bestätigt':'Aus',config.adultMode?'ok':'warn']].map(x=>`<div class="system-item"><strong>${esc(x[0])}</strong><span class="${x[2]}">${esc(x[1])}</span></div>`).join('');
$('#characterTable').innerHTML=chars.map(c=>`<div class="admin-row"><div><strong>${esc(c.emoji)} ${esc(c.name)}</strong><small>${esc(c.tagline||'')}</small></div><span class="badge">${c.id.startsWith('custom-')?'Custom':'System'}</span></div>`).join('');
$('#mediaTable').innerHTML=media.length?media.slice().reverse().map(m=>`<div class="admin-row"><div><strong>${esc(m.provider||'Media')}</strong><small>${esc((m.prompt||'').slice(0,70))}</small></div><span class="badge">${esc(m.status||'UNKNOWN')}</span></div>`).join(''):'<div class="empty">Keine Medien-Aufträge.</div>';
window.ai2Admin={chats,collection};
}catch(e){$('#systemStatus').textContent='Fehler';alert(e.message)}}
$('#charForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/characters',{method:'POST',body:JSON.stringify({ageConfirmed:true,character:{name:f.get('name'),tagline:f.get('tagline'),emoji:f.get('emoji'),personality:f.get('personality'),appearance:f.get('appearance'),greeting:'Hallo! Schön, dich kennenzulernen.'}})});e.target.reset();await load()}catch(err){alert(err.message)}};
$('#loadChats').onclick=async()=>{$('#activityOutput').textContent=JSON.stringify(await api('/api/chats'),null,2)};
$('#loadCollection').onclick=async()=>{$('#activityOutput').textContent=JSON.stringify(await api('/api/collection'),null,2)};
$('#refreshBtn').onclick=async()=>{await load();await loadAccess()};
load();loadAccess();
