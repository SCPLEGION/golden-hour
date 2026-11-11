// Complications during a run (data: src/content/complications.js). A seeded deterministic stream lives in the state —
// g.complications = {seed, next, log:[{id, at, target, resolvedAt, …}]} — so ticks never call Math.random and a save
// resumes the same sequence. At `next` (game seconds) one applicable event is drawn by weight, applied, logged in Polish
// and the next draw is scheduled `mean·(0.5..1.5)` later; with nothing applicable the draw retries after RETRY_S.
// The rate comes from the level (`difficulty.complications`: first, mean, max; null = none). Open events are checked
// every second and marked controlled (`resolvedAt`) once the player has fixed them.
import { COMPLICATIONS, DETERIORATION, ANALGESICS, complicationById } from '../content/complications.js';
import { INJURIES } from '../content/injuries.js';
import { difficultyById } from '../content/difficulty.js';
import { bodyPart } from '../content/body.js';
import { injuryPhysiology } from '../content/injury-physiology.js';
import { isMissing, visibleInjuries } from './selectors.js';
import { accessSites } from './vascular.js';
import { clinicalSnapshot, applyInsult } from './physio-model.js';
export const RETRY_S=60;
const LOG_LIMIT=50;
// mulberry32 on the stored 32-bit state.
export function nextRandom(c){
  let t=c.seed=(c.seed+0x6D2B79F5)>>>0;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
// Derived from the patient seed, so creating a game draws nothing extra (legacy sequences stay intact).
export const complicationSeed=seed=>Math.imul(((seed>>>0)^0x5bd1e995)>>>0,0x27d4eb2d)>>>0;
export function createComplications(g,from=0){
  const rate=difficultyById(g.difficulty).complications,c={seed:complicationSeed(g.profile.seed),next:null,log:[]};
  if(rate)c.next=Math.max(from,0)+Math.round(rate.first*(.75+.5*nextRandom(c)));
  return c;
}
const tagsOf=i=>INJURIES[i.type]?.tags||[];
const injuryById=(g,id)=>g.injuries.find(i=>i.id===id);
const supply=(g,...ids)=>ids.some(id=>(g.supplies[id]??0)>0);
const revealed=(g,i)=>visibleInjuries(g,i.part).includes(i);
const woundOpen=i=>tagsOf(i).includes('wound')&&!tagsOf(i).includes('amputation');
const rateOf=i=>injuryPhysiology(i.type)?.rate||0;
const packed=i=>i.treatments?.hemostatic!==undefined||i.treatments?.woundPacking!==undefined;
// Preconditions: each returns the possible targets (injury ids, segment ids or 'patient'); empty = not applicable.
export const WHEN={
  // A tight tourniquet over a wound that would bleed again.
  tourniquet:g=>Object.keys(g.body).filter(id=>bodyPart(id)?.tourniquet&&!isMissing(g,id)&&Number.isFinite(g.body[id].treatments.tourniquet)&&(g.body[id].tourniquetQuality??1)>=.75&&g.injuries.some(i=>tagsOf(i).includes('external')&&bodyPart(i.part)?.group===bodyPart(id).group&&bodyPart(i.part).order>=bodyPart(id).order&&rateOf(i)>0)),
  // A plain pressure dressing on a wound that still has a nominal flow; a new dressing or gauze is in the bag.
  dressedWound:g=>supply(g,'dressing','hemostatic','woundPacking')?g.injuries.filter(i=>woundOpen(i)&&i.treatments?.dressing!==undefined&&!packed(i)&&tagsOf(i).includes('external')&&rateOf(i)>=10).map(i=>i.id):[],
  // A holding clot (P4 haemostasis) in a wound that can still be packed.
  holdingClot:g=>supply(g,'hemostatic','woundPacking')?g.injuries.filter(i=>woundOpen(i)&&!packed(i)&&g.phys.clotMap?.[i.id]!==undefined).map(i=>i.id):[],
  // Reduced consciousness without a protected airway; suction is available.
  vomitRisk:g=>!g.airway&&!g.arrest&&supply(g,'suction')&&!g.injuries.some(i=>tagsOf(i).includes('airwayFluid'))&&clinicalSnapshot(g).gcs<=12?['head']:[],
  // An injury the player has not found yet (segment not examined, not visible on this level).
  hiddenInjury:g=>g.injuries.filter(i=>DETERIORATION[i.type]&&g.body[i.part]?.examinedAt===null&&!revealed(g,i)&&!g.complications.log.some(e=>e.id==='hiddenWorsens'&&e.target===i.id)).map(i=>i.id),
  conscious:g=>!g.arrest&&clinicalSnapshot(g).gcs>=13&&supply(g,...ANALGESICS)?['patient']:[],
  // A placed IV while another cannula is left in the bag.
  ivAccess:g=>supply(g,'iv')?accessSites(g):[],
  // A mask on a cylinder with at least four minutes left.
  oxygenOn:g=>g.phys.o2?.device==='nrb'&&g.phys.o2.litersLeft>=60?['head']:[],
  // Cold or wet surroundings, no insulation yet and a blanket or warming pack in the bag.
  coldExposure:g=>(g.phys.env?.tempC??20)<12&&!g.warm&&!(g.supports||[]).some(s=>s.id==='warmingPack'&&s.until>g.elapsed)&&g.temperature<37&&supply(g,'blanket','warmingPack')?['patient']:[]
};
// Changes applied to the run (they mutate the tick's working state only).
export const APPLY={
  tourniquetSlip:(g,e,value)=>{const part=g.body[e.target];e.value=Math.round((part.tourniquetQuality??1)*value*1000)/1000;part.tourniquetQuality=e.value;},
  removeDressing:(g,e)=>{
    const i=injuryById(g,e.target);delete i.treatments.dressing;
    if(!g.injuries.some(o=>o.part===i.part&&o.treatments?.dressing!==undefined))delete g.body[i.part].treatments.dressing;
    if(g.phys.clot?.[i.id])g.phys.clot[i.id]*=.5;delete g.phys.clotMap?.[i.id];
  },
  breakClot:(g,e)=>{g.phys.clot[e.target]=(g.phys.clot[e.target]||0)*.5;delete g.phys.clotMap[e.target];},
  aspiration:(g,e)=>{e.injuryId=`complication-${g.complications.log.length}`;g.injuries.push({id:e.injuryId,part:'head',type:'aspiration',treatments:{},at:g.elapsed});},
  deteriorate:(g,e)=>{
    const i=injuryById(g,e.target),d=DETERIORATION[i.type];
    if(d.bleedPts)applyInsult(g,{kind:'bleed',pts:d.bleedPts});
    if(d.addInjury)g.injuries.push({id:`complication-${g.complications.log.length}`,part:i.part,type:d.addInjury,treatments:{},at:g.elapsed});
    if(d.to)i.type=d.to;
  },
  pain:(g,e,pts,effect)=>{e.pain=pts;e.until=g.elapsed+effect.durationS;},
  durationS:()=>{},
  removeIV:(g,e)=>{const part=g.body[e.target];part.ivAt=null;delete part.ivQuality;delete part.ivPlacement;for(const f of g.infusions)if(f.site===e.target&&f.end>g.elapsed)f.end=g.elapsed;},
  maskOff:g=>{Object.assign(g.phys.o2,{device:'none',flowLpm:0});g.oxygenUntil=g.elapsed;},
  temperature:(g,e,delta)=>applyInsult(g,{kind:'temperature',delta})
};
// Controlled when the fix is in place.
export const RESOLVED={
  tourniquet:(g,e)=>(g.body[e.target]?.tourniquetQuality??1)>e.value+.05,
  woundCovered:(g,e)=>{const i=injuryById(g,e.target);return !i||['dressing','hemostatic','woundPacking'].some(k=>i.treatments?.[k]!==undefined);},
  clotOrPacking:(g,e)=>{const i=injuryById(g,e.target);return !i||packed(i)||g.phys.clotMap?.[e.target]!==undefined;},
  airway:g=>g.airway,
  examined:(g,e)=>{const i=injuryById(g,e.target);return !i||g.body[i.part]?.examinedAt!==null;},
  analgesia:(g,e)=>g.medications.some(m=>ANALGESICS.includes(m.id)&&m.at>=e.at),
  newIV:(g,e)=>accessSites(g).some(s=>g.body[s].ivAt>=e.at),
  oxygen:g=>g.phys.o2?.device==='nrb'||g.ventilatingUntil>=g.elapsed,
  warm:g=>g.warm||(g.supports||[]).some(s=>s.id==='warmingPack'&&s.until>g.elapsed)
};
export function resolveComplications(g){
  for(const e of g.complications.log)if(e.resolvedAt===null&&RESOLVED[complicationById(e.id).resolve](g,e))e.resolvedAt=g.elapsed;
}
// One second (physiology.js, after the protocol check).
export function stepComplications(g){
  const c=g.complications;if(!c)return;
  if(c.log.length)resolveComplications(g);
  if(c.next===null||g.elapsed<c.next||g.status!=='active')return;
  const rate=difficultyById(g.difficulty).complications;
  if(!rate||c.log.length>=Math.min(rate.max,LOG_LIMIT)){c.next=null;return;}
  if(g.arrest){c.next=g.elapsed+RETRY_S;return;}
  const open=new Set(c.log.filter(e=>e.resolvedAt===null).map(e=>e.id));
  const pool=COMPLICATIONS.filter(k=>!open.has(k.id)).map(k=>[k,WHEN[k.when](g)]).filter(([,t])=>t.length);
  if(!pool.length){c.next=g.elapsed+RETRY_S;return;}
  let roll=nextRandom(c)*pool.reduce((n,[k])=>n+k.weight,0),[kind,targets]=pool[pool.length-1];
  for(const entry of pool){roll-=entry[0].weight;if(roll<0){[kind,targets]=entry;break;}}
  applyComplication(g,kind.id,targets[Math.min(targets.length-1,Math.floor(nextRandom(c)*targets.length))]);
  c.next=g.elapsed+Math.round(rate.mean*(.5+nextRandom(c)));
}
// Applies one event to a target its precondition lists (the scheduler above; tests force a specific one). Returns the
// log entry, or null when the event is not applicable to that target now.
export function applyComplication(g,id,target=null){
  const kind=complicationById(id),targets=kind?WHEN[kind.when](g):[];
  target??=targets[0];if(!targets.includes(target))return null;
  const e={id,at:g.elapsed,target,resolvedAt:null};
  for(const [key,value] of Object.entries(kind.effect))APPLY[key](g,e,value,kind.effect);
  g.complications.log.push(e);g.log.push({time:g.elapsed,text:kind.text});
  return e;
}
// Active pain of open pain spikes (selectors.pain reads the same fields inline).
export const complicationPain=g=>(g.complications?.log||[]).reduce((n,e)=>n+(e.pain&&e.resolvedAt===null&&g.elapsed<e.until?e.pain:0),0);
// {total, controlled} for the debrief.
export function complicationSummary(g){const log=g.complications?.log||[];return {total:log.length,controlled:log.filter(e=>e.resolvedAt!==null).length};}
const NUM=n=>Number.isFinite(n)&&n>=0;
export function validComplications(c){
  return Boolean(c&&typeof c==='object'&&!Array.isArray(c)&&Number.isInteger(c.seed)&&c.seed>=0&&c.seed<2**32&&(c.next===null||NUM(c.next))&&Array.isArray(c.log)&&c.log.length<=LOG_LIMIT
    &&c.log.every(e=>e&&typeof e==='object'&&complicationById(e.id)&&NUM(e.at)&&typeof e.target==='string'&&e.target.length<80&&(e.resolvedAt===null||NUM(e.resolvedAt))&&['value','pain','until'].every(k=>e[k]===undefined||NUM(e[k]))&&(e.injuryId===undefined||typeof e.injuryId==='string')));
}
// Catalog check (engine.validateCatalogs).
export function validateComplications(){
  const ids=new Set();
  for(const k of COMPLICATIONS){
    if(ids.has(k.id))throw new Error(`Duplicate complication: ${k.id}`);ids.add(k.id);
    if(!WHEN[k.when]||!RESOLVED[k.resolve]||!(k.weight>0)||!k.text||!Object.keys(k.effect).length||Object.keys(k.effect).some(e=>!APPLY[e]))throw new Error(`Invalid complication: ${k.id}`);
  }
  for(const [type,d] of Object.entries(DETERIORATION))if(!INJURIES[type]||(d.addInjury&&!INJURIES[d.addInjury])||(d.to&&!INJURIES[d.to]))throw new Error(`Invalid deterioration: ${type}`);
}
