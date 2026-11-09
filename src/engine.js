import { BODY_PARTS, LEGACY_PARTS, bodyPart, resolvePart } from './content/body.js';
import { SCENARIOS } from './content/scenarios.js';
import { ITEMS, itemById } from './content/items.js';
import { DIFFICULTIES, difficultyById } from './content/difficulty.js';
import { INJURIES } from './content/injuries.js';
import { IV_PROCEDURE } from './content/procedures.js';
import { EFFECTS, itemUnavailable } from './simulation/effects.js';
import { PROCEDURES } from './simulation/procedures.js';
import { sampleMonitor, HISTORY_LIMIT } from './simulation/monitor.js';
import { tick } from './simulation/physiology.js';
import { examination, vitals } from './simulation/selectors.js';
export { SCENARIOS, ITEMS, itemUnavailable };
export { condition, vitals } from './simulation/selectors.js';
export const ACTIONS = [
  {id:'examine',name:'Zbadaj wybraną okolicę',time:30},
  {id:'vitals',name:'Zmierz parametry',time:20},
  {id:'history',name:'Zbierz wywiad SAMPLE',time:25},
  {id:'transport',name:'Zgłoś ewakuację',time:15},
  {id:'wait30',name:'Obserwuj przez 30 s',time:30},
  {id:'wait60',name:'Obserwuj przez minutę',time:60}
];
export function validateCatalogs() {
  const ids=new Set();
  for(const item of ITEMS) {
    if(ids.has(item.id)) throw new Error(`Duplicate item: ${item.id}`);
    ids.add(item.id);
    if(item.procedure&&!PROCEDURES[item.procedure])throw new Error(`Unregistered procedure: ${item.procedure}`);
    if(!EFFECTS[item.effect]) throw new Error(`Unregistered effect: ${item.effect}`);
    if(item.time<=0 || (item.count!==null && item.count<0)) throw new Error(`Invalid item: ${item.id}`);
  }
  for(const item of ITEMS)if(item.regions?.some(r=>!BODY_PARTS.some(p=>p.id===r||p.group===r)))throw new Error(`Invalid region in ${item.id}`);
  // Scenario content may still use the legacy limb ids; they resolve to a segment.
  for(const c of SCENARIOS) for(const [part,type] of c.injuries) {
    if(!bodyPart(part) || !INJURIES[type]) throw new Error(`Invalid injury in ${c.id}`);
  }
}
validateCatalogs();
export function createGame(index=Math.floor(Math.random()*SCENARIOS.length),random=Math.random,options={}) {
  const c=SCENARIOS[index];
  const difficulty=difficultyById(options?.difficulty), [delayMin,delayMax]=difficulty.transportDelayRange;
  if(!c) throw new Error('Unknown scenario');
  const injuries=c.injuries.map(([part,type],i)=>({id:`injury-${i}`,part:resolvePart(part),type,treatments:{}}));
  if(random()>.65) {
    const available=BODY_PARTS.filter(p=>!injuries.some(i=>i.part===p.id));
    if(available.length) injuries.push({id:'extra',part:available[Math.floor(random()*available.length)].id,type:'contusion',treatments:{}});
  }
  const g={ version:2, scenarioId:c.id, patient:`${['Adam','Michał','Kamil','Piotr','Tomasz'][Math.floor(random()*5)]}, ${22+Math.floor(random()*40)} lat`, elapsed:0, transportDelay:delayMin+Math.floor(random()*((delayMax-delayMin)/60+1))*60, difficulty:difficulty.id, transportAt:null, transportCalledAt:null, status:'active', blood:c.blood, oxygen:c.oxygen, temperature:c.temperature??(injuries.some(i=>INJURIES[i.type].tags.includes('cold'))?35.4:injuries.some(i=>INJURIES[i.type].tags.includes('heat'))?38.6:36.7), fluidSupport:0, respiratoryDepression:0, injuries, body:Object.fromEntries(BODY_PARTS.map(p=>[p.id,{examinedAt:null,note:null,treatments:{},ivAt:null}])), allergies:[...(c.allergies||[])], historyKnown:false, initialUnconscious:injuries.some(i=>INJURIES[i.type].unconscious), airway:false, warm:false, oxygenUntil:0, ventilatingUntil:0, infusions:[], medications:[], arrest:null,vitals:null,monitoring:true,monitorHistory:[],paused:false,speed:1,supports:[],assessments:[], supplies:Object.fromEntries(ITEMS.filter(i=>i.count!==null).map(i=>[i.id,i.count===null?null:Math.max(1,Math.round(i.count*difficulty.supplyMultiplier))])), actions:0, log:[{time:0,text:'Docierasz do poszkodowanego. Masz torbę ratowniczą; zorganizuj ewakuację i rozpocznij ocenę.'}] };
  sampleMonitor(g);return g;
}
export function advanceTime(state,seconds=1){
  if(state.status!=='active'||state.paused||!Number.isFinite(seconds)||seconds<1)return state;
  const g=structuredClone(state);
  for(let i=0;i<Math.min(600,Math.floor(seconds))&&g.status==='active';i++)tick(g);
  return g;
}
export const scenarioFor = g => SCENARIOS.find(c=>c.id===g.scenarioId);
export function act(state,id,target='chest',injuryId=null,procedureInput=null) {
  if(state.status!=='active') return state;
  target=resolvePart(target);
  const item=itemById(id), action=ACTIONS.find(a=>a.id===id);
  if(!item && !action) return state;
  if(injuryId&&!state.injuries.some(i=>i.id===injuryId&&i.part===target))return state;
  if(item && itemUnavailable(state,item,target,injuryId)) return state;
  if(id==='examine' && !state.body[target]) return state;
  if(id==='transport' && state.transportAt!==null) return state;
  const procedure=item?.procedure?PROCEDURES[item.procedure]:null;
  if(procedure&&!procedure.validate(procedureInput))return state;
  const outcome=procedure?.resolve(state,target,procedureInput);
  if(procedure&&!outcome)return state;
  const g=structuredClone(state), spec=item||action;
  if(item && item.count!==null) g.supplies[id]--;
  let message='';
  if(item) {
    message=EFFECTS[item.effect]({g,item,target,injuryId,procedure:outcome});
  }
  if(id==='transport') {g.transportCalledAt=g.elapsed;g.transportAt=g.elapsed+spec.time+g.transportDelay;message=`Zgłoszono ewakuację. Dojazd zespołu: ${g.transportDelay/60} minut od zakończenia zgłoszenia.`;}
  if(id==='history') {g.historyKnown=true;message=scenarioFor(g).history;}
  if(id==='examine') message=examination(g,target);
  if(id==='vitals') message='Wykonano pomiar parametrów.';
  if(id.startsWith('wait')) message=`Obserwacja przez ${spec.time} s zakończona.`;
  g.log.push({time:g.elapsed,text:message});
  g.actions++;
  for(let i=0;i<spec.time && g.status==='active';i++) tick(g);
  g.resuscitating=false;
  if(id==='examine') {g.body[target].examinedAt=g.elapsed;g.body[target].note=examination(g,target);}
  if(id==='vitals'||item?.effect==='monitor'||item?.effect==='aed')sampleMonitor(g,true);
  return g;
}
const IV_PLACEMENT_VALID=p=>IV_PROCEDURE.sites.some(s=>s.id===p.siteId)&&Number.isFinite(p.point?.x)&&p.point.x>=0&&p.point.x<=800&&Number.isFinite(p.point?.y)&&p.point.y>=0&&p.point.y<=300&&Array.isArray(p.position)&&p.position.length===2&&p.position.every(Number.isFinite);
// 0.7 split the seven body parts into segments; legacy limb ids move to their representative segment.
function migrateLegacyParts(g){
  if(g.body&&typeof g.body==='object'&&!Array.isArray(g.body))for(const [old,next] of Object.entries(LEGACY_PARTS)){
    if(!Object.hasOwn(g.body,old))continue;
    const legacy=g.body[old],current=g.body[next];delete g.body[old];
    if(!legacy||typeof legacy!=='object'){g.body[next]=legacy;continue;}
    g.body[next]={examinedAt:null,note:null,ivAt:null,...current,...legacy,treatments:current?.treatments&&legacy.treatments&&typeof legacy.treatments==='object'?{...current.treatments,...legacy.treatments}:legacy.treatments};
  }
  const remap=(list,key)=>{if(Array.isArray(list))for(const e of list)if(e&&typeof e[key]==='string')e[key]=resolvePart(e[key]);};
  remap(g.injuries,'part');remap(g.infusions,'site');remap(g.supports,'target');remap(g.assessments,'part');remap(g.medications,'site');
}
// Versioned saves: old prototypes are deliberately not interpreted as this model.
export function restoreGame(raw) {
  try {
    const g=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
    if(g?.version!==2 || !scenarioFor(g) || !['active','saved','lost'].includes(g.status)) return null;
    for(const key of ['elapsed','blood','oxygen','temperature','fluidSupport','respiratoryDepression','transportDelay','oxygenUntil','ventilatingUntil','actions']) if(!Number.isFinite(g[key]) || g[key]<0) return null;
    if(g.transportDelay<900 || g.transportDelay>1500 || (g.transportAt!==null && !Number.isFinite(g.transportAt))) return null;
    g.difficulty??='normal';
    if(!DIFFICULTIES.some(d=>d.id===g.difficulty))return null;
    g.transportCalledAt??=null;
    if(g.transportCalledAt!==null&&!Number.isFinite(g.transportCalledAt))return null;
    if(!g.body || !g.supplies || typeof g.body!=='object' || typeof g.supplies!=='object' || Array.isArray(g.body) || Array.isArray(g.supplies) || !Object.keys(g.body).length || !Object.keys(g.supplies).length) return null;
    migrateLegacyParts(g);
    // New catalog entries initialize without discarding an existing run.
    for(const p of BODY_PARTS) g.body[p.id]??={examinedAt:null,note:null,treatments:{},ivAt:null};
    for(const i of ITEMS.filter(i=>i.count!==null)) if(!Object.hasOwn(g.supplies,i.id)) g.supplies[i.id]=i.count;
    if(!Array.isArray(g.injuries) || !g.injuries.length || g.injuries.some(i=>!INJURIES[i.type] || !BODY_PARTS.some(p=>p.id===i.part))) return null;
    const validTreatments=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(Number.isFinite);
    for(const part of Object.values(g.body))if(!validTreatments(part.treatments))return null;
    for(const injury of g.injuries) {
      injury.treatments??=Object.fromEntries(Object.entries(g.body[injury.part].treatments).filter(([key])=>['dressing','hemostatic','seal'].includes(key)));
      if(!validTreatments(injury.treatments))return null;
    }
    for(const p of BODY_PARTS) {g.body[p.id].ivAt??=null;if(g.body[p.id].ivAt!==null&&!Number.isFinite(g.body[p.id].ivAt))return null;}
    for(const p of BODY_PARTS){
      const access=g.body[p.id];
      if(access.ivQuality!==undefined&&(!Number.isFinite(access.ivQuality)||access.ivQuality<0||access.ivQuality>1))return null;
      if(access.ivPlacement&&(!IV_PLACEMENT_VALID(access.ivPlacement)))return null;
      if(access.ivAttempts!==undefined&&(!Array.isArray(access.ivAttempts)||access.ivAttempts.some(a=>!Number.isFinite(a.time)||typeof a.success!=='boolean'||!Number.isFinite(a.score))))return null;
    }
    if(g.iv===true && g.body.rightForearm.ivAt===null)g.body.rightForearm.ivAt=g.elapsed;
    delete g.iv;
    for(const infusion of g.infusions||[])infusion.site??='rightForearm';
    if(!Array.isArray(g.log) || !g.log.length || g.log.some(e=>!Number.isFinite(e.time) || typeof e.text!=='string')) return null;
    for(const p of BODY_PARTS) if(!g.body?.[p.id]?.treatments || (g.body[p.id].examinedAt!==null && !Number.isFinite(g.body[p.id].examinedAt))) return null;
    for(const i of ITEMS.filter(i=>i.count!==null)) if(!Number.isInteger(g.supplies?.[i.id]) || g.supplies[i.id]<0) return null;
    if(!Array.isArray(g.medications) || g.medications.some(m=>!itemById(m.id) || !Number.isFinite(m.start) || !Number.isFinite(m.end)||(m.burden!==undefined&&(!Number.isFinite(m.burden)||m.burden<0))||(m.delivery!==undefined&&(!Number.isFinite(m.delivery)||m.delivery<0||m.delivery>1)))) return null;
    if(!Array.isArray(g.infusions) || g.infusions.some(i=>!Number.isFinite(i.end)||!BODY_PARTS.some(p=>p.id===i.site&&p.vascular)) || !Array.isArray(g.allergies)) return null;
    if(g.arrest!==null && (!Number.isFinite(g.arrest?.budget)||!Number.isFinite(g.arrest?.since))) return null;
    if(g.vitals!==null && !Number.isFinite(g.vitals?.time)) return null;
    g.paused??=false;g.speed??=1;g.monitoring??=true;g.monitorHistory??=[];g.supports??=[];g.assessments??=[];
    if(typeof g.paused!=='boolean'||typeof g.monitoring!=='boolean'||![1,2,4].includes(g.speed))return null;
    if(!Array.isArray(g.monitorHistory)||g.monitorHistory.some(v=>!Number.isFinite(v.time)||!Number.isFinite(v.pulse)||!Number.isFinite(v.oxygen)||typeof v.pressure!=='string'))return null;
    if(g.monitorHistory.length>HISTORY_LIMIT)g.monitorHistory=g.monitorHistory.slice(-HISTORY_LIMIT);
    if(!Array.isArray(g.supports)||g.supports.some(s=>!itemById(s.id)||!g.body[s.target]||!Number.isFinite(s.until)))return null;
    if(!Array.isArray(g.assessments)||g.assessments.some(a=>typeof a.text!=='string'||!g.body[a.part]||!Number.isFinite(a.time)))return null;
    if(g.monitoring&&!g.vitals)sampleMonitor(g);
    return structuredClone(g);
  }catch{return null;}
}
