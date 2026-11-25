/* Enantiodromia. Browser-only evidence, no analytics, no external dependencies. */
const $ = s => document.querySelector(s);
const encoder = new TextEncoder();
const storeKey = 'enantiodromia.ledger.v1';
let ledger = {}, current = null, generation = 0;
try { ledger = validateLedger(JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch { ledger = {}; }
function validateLedger(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid ledger.');
  const clean = {};
  for (const [code, v] of Object.entries(data)) {
    if (!/^(M(0[1-9]|1\d|2[0-4])|H0[1-8])$/.test(code) || !v || v.code !== code || !/^[a-f0-9]{24}$/.test(v.id) || !/^[a-f0-9]{32}$/.test(v.receipt) || typeof v.title !== 'string' || typeof v.text !== 'string' || !Array.isArray(v.exits)) throw Error('Invalid witness record.');
    if (v.title.length > 150 || v.text.length > 15000 || v.exits.length > 32) throw Error('Oversized witness record.');
    const exits = v.exits.map(x => {
      if (!/^[a-f0-9]{24}$/.test(x.id) || typeof x.title !== 'string' || x.title.length > 150) throw Error('Invalid corridor.');
      return {id:x.id,title:x.title};
    });
    clean[code] = {code,id:v.id,title:v.title,receipt:v.receipt,text:v.text,exits};
  }
  return clean;
}
function save() {
  try { localStorage.setItem(storeKey, JSON.stringify(ledger)); }
  catch { status('Browser storage unavailable. Export your ledger before leaving.'); }
  updateLedger();
}
function status(message) { $('#status').textContent = message; }
function hex(s) { return Uint8Array.from(s.match(/../g), b => parseInt(b,16)); }
function normalize(s) { return s.trim().toLowerCase().replace(/\s+/gu,' '); }
async function openSeal(seal, answer) {
  const base = await crypto.subtle.importKey('raw',encoder.encode(normalize(answer)), 'PBKDF2', false,['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:hex(seal.salt),iterations:seal.rounds,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const bytes = Uint8Array.from(atob(seal.ciphertext), c => c.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:hex(seal.iv),additionalData:encoder.encode(seal.aad),tagLength:128},key,bytes);
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(clear));
}
function element(tag, text, cls) {
  const e = document.createElement(tag); if(text !== undefined)e.textContent=text;if(cls)e.className=cls;return e;
}
function corridor(x) {
  const a=element('a',x.title,'corridor');a.href='#/w/'+x.id;return a;
}
function updateLedger() {
  const codes=Object.keys(ledger).sort();
  $('#main-count').textContent=String(codes.filter(c=>c.startsWith('M')).length).padStart(2,'0');
  $('#hidden-count').textContent=String(codes.filter(c=>c.startsWith('H')).length).padStart(2,'0');
  const list=$('#witnesses');list.replaceChildren();
  for(const c of codes) {
    const a=corridor(ledger[c]);a.prepend(element('span',c+' ','code'));list.append(a);
  }
  if(!codes.length)list.append(element('p','No witness has returned.','muted'));
  $('#transcript').value=codes.map(c=>c+':'+ledger[c].receipt).join('\n');
}
function showReward(reward) {
  $('#answer-form').hidden=true;
  const region=$('#reward');region.hidden=false;region.replaceChildren();
  region.append(element('p','WITNESSED / '+reward.code,'eyebrow'));
  region.append(element('p',reward.text,'revelation'));
  const receipt=element('div',undefined,'receipt');
  receipt.append(element('span','RECEIPT','eyebrow'),element('code',reward.code+':'+reward.receipt));
  region.append(receipt);
  if(reward.exits.length) {
    const nav=element('nav',undefined,'exits');nav.setAttribute('aria-label','Surviving corridors');
    nav.append(element('p','SURVIVING CORRIDORS','eyebrow'));
    reward.exits.forEach(x=>nav.append(corridor(x)));region.append(nav);
  }
  if(reward.code==='M24' || reward.code==='H08') {
    region.append(element('p','Your evidence remains on this device. Export the ledger to preserve it.','muted'));
  }
}
async function navigate() {
  const g=++generation;
  let route=location.hash.match(/^#\/w\/([a-f0-9]{24})$/);
  const id=route ? route[1] : document.body.dataset.entry;
  current=null;$('#reward').hidden=true;$('#answer-form').hidden=true;$('#assets').replaceChildren();$('#prompt').textContent='';status('');
  $('#chamber-title').textContent='Listening…';
  try {
    if(location.hash && !route && location.hash!=='#')throw Error('This corridor is not an archive address.');
    const response=await fetch('vault/'+id+'.json',{cache:'no-cache'});
    if(!response.ok)throw Error('This corridor is absent. Return to the first witness.');
    const node=await response.json();if(g!==generation)return;
    if(node.id!==id)throw Error('The artifact does not match its address.');
    current=node;
    $('#chamber-code').textContent=node.code+' / '+(node.code.startsWith('H')?'ABSENCE':'WITNESS');
    $('#chamber-title').textContent=node.title;$('#prompt').textContent=node.prompt;
    document.title=node.title+' · aimordoitnane';
    for(const path of node.assets) {
      if(!/^assets\/[a-z0-9.-]+$/.test(path))continue;
      const a=element('a',path.split('/').pop(),'artifact');a.href=path;a.target='_blank';a.rel='noopener';
      a.setAttribute('download','');$('#assets').append(a);
    }
    $('#answer').value='';
    if(ledger[node.code]?.id===id)showReward(ledger[node.code]);
    else $('#answer-form').hidden=false;
    $('#chamber-title').focus({preventScroll:true});
  } catch(e) {
    if(g!==generation)return;
    $('#chamber-title').textContent='A missing corridor';status(e.message);
  }
}
$('#answer-form').addEventListener('submit',async event=> {
  event.preventDefault();if(!current || !$('#answer').value.trim())return;
  const node=current,g=generation,button=$('#submit');button.disabled=true;status('Testing the witness…');
  try {
    if(!crypto.subtle)throw Error('secure-context');
    const result=await openSeal(node.seal,$('#answer').value);
    if(result.code!==node.code)throw Error('mismatch');
    const record={...result,id:node.id,title:node.title};
    validateLedger({[record.code]:record});ledger[record.code]=record;save();
    if(g!==generation)return;
    $('#answer').value='';showReward(record);status('The witness returned.');
  }catch(e) {
    if(g!==generation)return;
    status(e.message==='secure-context' ? 'Web Crypto requires HTTPS or localhost.' : 'The seal remains closed.');
  }finally{button.disabled=false;}
});
$('#ledger-toggle').addEventListener('click',()=>{
  const panel=$('#ledger');panel.hidden=!panel.hidden;$('#ledger-toggle').setAttribute('aria-expanded',String(!panel.hidden));
});
$('#export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({format:'enantiodromia-ledger-v1',witnesses:ledger},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='enantiodromia-ledger.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#import').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>2*1024*1024)throw Error('Ledger is too large.');
    const data=JSON.parse(await file.text());if(data.format!=='enantiodromia-ledger-v1')throw Error('Unrecognized ledger format.');
    ledger={...ledger,...validateLedger(data.witnesses)};save();await navigate();status('Local ledger imported.');
  }catch(e){status('Import failed: '+e.message);}finally{event.target.value='';}
});
window.addEventListener('hashchange',navigate);
updateLedger();navigate();
