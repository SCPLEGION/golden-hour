// Test helper (not a test file): act() that fills a deterministic procedure attempt when none is given.
import { act as engineAct, ITEMS, createGame as engineCreateGame } from '../src/engine.js';
// Physiology and content tests run without the random in-run complications (they have their own tests and the
// balance matrix in reference-care.test.js uses the engine's createGame with them on).
export const createGame=(index,random,options={})=>engineCreateGame(index,random,{complications:false,...options});
import { autoInput } from '../src/simulation/procedures.js';
import { respiratoryInjury } from '../src/content/injury-physiology.js';
// mL/min equivalent of a legacy bleeding rate in points/s for this patient (1 pt = 0.5% EBV).
export const legacyRate=(g,pts)=>pts*1575*g.profile.ebvMl/5250;
// A respiratory injury (RESPIRATORY entry): the care policies give oxygen for it (was the legacy `oxygenLoss` field).
export const respiratory=i=>respiratoryInjury(i.type);
// Test readouts in the old mirror scales (P4 removed g.blood/g.oxygen from the state): 100 = no loss, 0 = 50% EBV incl.
// plasma deficit; SpO2 = SaO2 × 100.
export const bloodIndex=g=>Math.max(0,Math.min(100,100-200*(g.phys.lostMl+g.phys.plasmaDeficitMl)/g.profile.ebvMl));
export const spo2Of=g=>g.phys.sao2*100;
export const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
export const procedureFor=id=>ITEMS.find(i=>i.id===id)?.procedure||null;
// While referenceCare runs, every action is followed by the fixes for complications announced during it (a responder
// reacts to the message before the next planned step).
let responding=false,reacting=false;
export const act=(g,id,part='chest',wound=null,input=undefined)=>{
  const procedure=procedureFor(id);
  const next=engineAct(g,id,part,wound,input!==undefined?input:procedure==='iv'?perfectIV:procedure?autoInput(procedure,g,part):null);
  if(!responding||reacting||next===g)return next;
  reacting=true;try{return respondToComplications(next);}finally{reacting=false;}
};
// ---- Reference policy (plan: referenceCare): a competent, not perfect, responder with the minigames off.
// Calls transport, stops life threats first, meets every protocol step in deadline order, then keeps the
// patient going until handover. Every scenario and patient state must survive it (tests/reference-care.test.js).
import { advanceTime, conditionFor } from '../src/engine.js';
import { INJURIES } from '../src/content/injuries.js';
import { bodyPart, matchesRegion, proximalTourniquetSite } from '../src/content/body.js';
import { injuryBleeding, isMissing, isConscious, circulation, canSwallow, visibleInjuries } from '../src/simulation/selectors.js';
import { difficultyById } from '../src/content/difficulty.js';
import { tourniquetOver, ivSiteFor } from '../src/simulation/vascular.js';
import { clinicalSnapshot } from '../src/simulation/physio-model.js';
import { drugEffects } from '../src/simulation/physio-pharmacology.js';
const tagsOf=i=>INJURIES[i.type].tags,has=(g,tag)=>g.injuries.some(i=>tagsOf(i).includes(tag));
const itemOf=id=>ITEMS.find(i=>i.id===id);
const SITES=['head','chest','abdomen','rightUpperArm','leftUpperArm','rightThigh','leftThigh'];
// Where an item goes: on the injury it treats (wound scope) or on the first allowed, intact site.
export function useItem(g,id){
  const it=itemOf(id);
  if(id==='tourniquet'){const i=g.injuries.find(i=>tagsOf(i).includes('massive')&&bodyPart(i.part).limb);return i?act(g,id,tagsOf(i).includes('amputation')?proximalTourniquetSite(i.part):i.part):g;}
  if(id==='splint'){const i=g.injuries.find(i=>tagsOf(i).includes('fracture')&&bodyPart(i.part).limb);return i?act(g,id,i.part):g;}
  if(it.treatsTags||id==='seal'){
    const wanted=it.treatsTags||['chest'];
    const i=g.injuries.find(i=>wanted.some(t=>tagsOf(i).includes(t))&&(!it.regions||matchesRegion(it.regions,i.part))&&!i.treatments?.[id]);
    return i?act(g,id,i.part,i.id):g;
  }
  const site=SITES.find(p=>(!it.regions||matchesRegion(it.regions,p))&&!isMissing(g,p));
  if(it.requires==='iv'&&!ivSiteFor(g,site))g=act(g,'iv',site.startsWith('left')?'leftForearm':'rightForearm');
  return act(g,id,site);
}
function woundCare(g,injury){
  const d=INJURIES[injury.type],limb=bodyPart(injury.part).limb;
  if(d.tags.includes('massive')&&limb)return act(g,'tourniquet',d.tags.includes('amputation')?proximalTourniquetSite(injury.part):injury.part);
  if(d.tags.includes('chest'))return act(g,'seal',injury.part,injury.id);
  if(d.tags.includes('wound')&&(injury.treatments||{}).hemostatic===undefined&&(injury.treatments||{}).dressing===undefined)return act(g,g.supplies.hemostatic>0?'hemostatic':'dressing',injury.part,injury.id);
  return g;
}
// Maps a declarative protocol check to the action(s) that satisfy it.
export function solveCheck(g,check){
  const [type,value]=Object.entries(check)[0];
  if(type==='any')return solveCheck(g,value[0]);
  if(type==='examined')return act(g,'examine',Array.isArray(value)?value[0]:value);
  if(type==='action')return act(g,value);
  if(type==='transport')return g.transportAt===null?act(g,'transport'):g;
  if(type==='item')return useItem(g,value);
  if(type==='itemAny')return useItem(g,value[0]);
  if(type==='treatedInjury'||type==='treatedAll'){for(const i of g.injuries.filter(i=>i.type===value))g=woundCare(g,i);return g;}
  if(type==='warm')return act(g,'blanket','chest');
  if(type==='airway')return has(g,'airwayFluid')?useItem(g,'suction'):act(g,'airway','head');
  if(type==='oxygenGiven')return act(g,'oxygen','head');
  throw new Error(type);
}
const ivArm=g=>['rightArm','leftArm'].find(a=>!isMissing(g,a)&&tourniquetOver(g,a,.5)===undefined);
// A drug is still working: active or still rising (physio-pharmacology.js).
export const working=(g,id)=>drugEffects(g).some(e=>e.id===id&&(e.active||e.pending));
const goodCPR={intervalsMs:Array(14).fill(545),depths:Array(15).fill(.7),aborted:false};
const MEDICAL=[['bronchospasm','salbutamol'],['anaphylaxis','adrenaline'],['opioidOd','naloxone'],['glucoseLow','glucoseGel'],['heat','coolingMat'],['cold','warmingPack'],['spine','cervicalCollar'],['airwayFluid','suction']];
// Complications (0.9): fixes the open events with the existing items — re-tightens a slipped tourniquet, covers or packs
// a wound again, clears the airway after vomiting, finds a deteriorating hidden injury, settles a pain spike, replaces a
// lost IV, puts the mask back on and insulates against the cold.
const openComplications=g=>(g.complications?.log||[]).filter(e=>e.resolvedAt===null);
export function respondToComplications(g){
  for(const e of openComplications(g)){
    if(g.status!=='active'||e.resolvedAt!==null)continue;
    const injury=g.injuries.find(i=>i.id===e.target);
    if(e.id==='tourniquetSlip')g=act(g,'tourniquet',e.target);
    else if((e.id==='dressingSoak'||e.id==='clotBreak')&&injury){
      const pack=['hemostatic','woundPacking'].find(id=>g.supplies[id]>0&&injury.treatments?.[id]===undefined);
      g=act(g,pack||'dressing',injury.part,injury.id);
    }
    else if(e.id==='vomiting')g=useItem(g,'suction');
    else if(e.id==='hiddenWorsens'&&injury)g=act(g,'examine',injury.part);
    else if(e.id==='painSpike'){const id=['lidocaineSpray',...(canSwallow(g)?['paracetamol','metamizole']:[])].find(id=>g.supplies[id]>0);if(id)g=act(g,id,id==='lidocaineSpray'?'head':'head');}
    else if(e.id==='ivDislodged'){const arm=ivArm(g);if(arm&&g.supplies.iv>0)g=act(g,'iv',arm);}
    else if(e.id==='maskDisplaced')g=act(g,'oxygen','head');
    else if(e.id==='shivering')g=g.warm||g.supplies.blanket<=0?act(g,'warmingPack','chest'):act(g,'blanket','chest');
  }
  return g;
}
// Advances up to `seconds`, stopping early (10-s steps) when a new complication is announced.
function observe(g,seconds){
  const n=g.complications?.log.length??0;
  for(let t=0;t<seconds&&g.status==='active';t+=10){g=advanceTime(g,10);if((g.complications?.log.length??0)!==n)break;}
  return g;
}
// On a `hideVisible` level the responder examines every segment with an injury it cannot see yet.
function revealHidden(g){
  if(!difficultyById(g.difficulty).hideVisible)return g;
  for(const part of [...new Set(g.injuries.map(i=>i.part))])if(g.status==='active'&&g.body[part].examinedAt===null&&g.injuries.some(i=>i.part===part&&INJURIES[i.type].visible&&!visibleInjuries(g,part).includes(i)))g=act(g,'examine',part);
  return g;
}
export function referenceCare(g,options={}){
  responding=true;try{return referenceCarePolicy(g,options);}finally{responding=false;}
}
function referenceCarePolicy(g,{trace=null}={}){
  if(g.transportAt===null)g=act(g,'transport');
  for(const i of g.injuries.filter(i=>tagsOf(i).includes('massive')&&bodyPart(i.part).limb))g=woundCare(g,i);
  if(has(g,'airwayFluid'))g=useItem(g,'suction');
  if(has(g,'airway')&&!g.airway)g=act(g,'airway','head');
  // Expert starts without the monitor (it only shows readings; the policy reads the snapshot).
  if(!g.monitorAttached)g=act(g,'monitor','chest');
  g=revealHidden(g);
  const c=conditionFor(g);
  if(c)for(const step of [...c.protocol].sort((a,b)=>g.protocol.steps[a.id].deadline-g.protocol.steps[b.id].deadline))if(g.protocol.steps[step.id].doneAt===null)g=solveCheck(g,step.check);
  for(const i of [...g.injuries].sort((a,b)=>injuryBleeding(g,b)-injuryBleeding(g,a)))g=woundCare(g,i);
  for(const [tag,id] of MEDICAL)if(has(g,tag)&&!g.injuries.some(i=>i.treatments?.[id]!==undefined)&&!g.medications.some(m=>m.id===id))g=useItem(g,id);
  if(has(g,'foreignBody'))g=useItem(g,'impaledSupport');
  // P4: the binder acts only on the pelvis (hidden pelvic loss, pelvic crush/internal bleeding).
  if(g.injuries.some(i=>tagsOf(i).some(t=>t==='internal'||t==='crush'||t==='fracture')&&i.part==='pelvis'))g=useItem(g,'pelvicBinder');
  for(const i of g.injuries.filter(i=>tagsOf(i).includes('fracture')&&bodyPart(i.part).limb))g=act(g,g.supplies.splint>0?'splint':'armSling',i.part,g.supplies.splint>0?null:i.id);
  const bleeding=has(g,'internal')||has(g,'massive')||clinicalSnapshot(g).lossFrac>.2,arm=ivArm(g);
  if(bleeding&&arm){g=act(g,'iv',arm);g=act(g,'txa',arm);if(circulation(g)<75)g=act(g,'fluid',arm);}
  if(g.injuries.some(respiratory))g=act(g,'oxygen','head');
  g=act(g,'blanket','chest');
  while(g.status==='active'){
    g=respondToComplications(g);if(g.status!=='active')break;
    if(g.arrest){g=act(g,'airway','head');g=act(g,'oxygen','head');g=act(g,'cpr','chest',null,goodCPR);continue;}
    // The second cylinder is saved until the saturation falls (it would run out before a 25-minute handover).
    if(g.oxygenUntil<=g.elapsed&&g.supplies.oxygen>0&&g.injuries.some(respiratory)&&clinicalSnapshot(g).spo2<92)g=act(g,'oxygen','head');
    // A bronchodilator that wore off is repeated (another one when the first runs out).
    if(has(g,'bronchospasm')&&!working(g,'salbutamol')&&!working(g,'ipratropium')&&g.supplies.salbutamol+g.supplies.ipratropium>0)g=useItem(g,g.supplies.salbutamol>0?'salbutamol':'ipratropium');
    // Anaphylaxis can return when adrenaline wears off: a second porcja.
    if(has(g,'anaphylaxis')&&!working(g,'adrenaline')&&g.supplies.adrenaline>0)g=useItem(g,'adrenaline');
    const site=ivArm(g)&&ivSiteFor(g,ivArm(g));
    if(site&&circulation(g)<65&&g.supplies.fluid>0&&!g.infusions.some(i=>i.end>g.elapsed))g=act(g,'fluid',site);
    trace?.push({time:g.elapsed,...clinicalSnapshot(g),arrest:Boolean(g.arrest)});
    g=observe(g,60);
  }
  trace?.push({time:g.elapsed,...clinicalSnapshot(g),arrest:Boolean(g.arrest)});
  return g;
}
// Margin summary of a trace: how close the run came to the arrest criteria.
export function margins(trace){
  const min=k=>Math.min(...trace.map(s=>s[k])),max=k=>Math.max(...trace.map(s=>s[k]));
  return {maxLoss:max('lossFrac'),minReserve:min('reserve'),minMap:min('map'),minSpo2:min('spo2'),minPerfusion:min('perfusion'),arrested:trace.some(s=>s.arrest)};
}
export function marginReport(rows){
  const f=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
  return rows.map(r=>`${r.id.padEnd(22)} ${r.config.padEnd(12)} ${r.status.padEnd(6)} loss ${f(r.maxLoss)} reserve ${f(r.minReserve)} MAP ${f(r.minMap,0)} SpO2 ${f(r.minSpo2,0)}${r.arrested?' ARREST':''}`).join('\n');
}
// ---- Balance matrix (reference-care*.test.js): every scenario and patient state at the level's longest delay
// (random ()=>.99 also gives the most extra injuries), complications on (engine createGame).
export const PROFILES={heavy:{sex:'M',massKg:95},light:{sex:'F',massKg:52}};
export function rescueMatrix(difficulty,profile,{scenarios,conditions,create}){
  return [
    ...scenarios.map((s,i)=>[s.id,()=>create(i,()=>.99,{difficulty,profile})]),
    ...conditions.map(c=>[`§${c.id}`,()=>create(0,()=>.99,{conditionId:c.id,difficulty,profile})])
  ].map(([id,make])=>{
    const start=make(),trace=[],g=referenceCare(start,{trace});
    return {id,start,g,status:g.status,end:trace.at(-1),...margins(trace),complications:g.complications.log};
  });
}
