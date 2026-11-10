// Test helper (not a test file): act() that fills a deterministic procedure attempt when none is given.
import { act as engineAct, ITEMS } from '../src/engine.js';
import { autoInput } from '../src/simulation/procedures.js';
// mL/min equivalent of a legacy bleeding rate in points/s for this patient (1 pt = 0.5% EBV).
export const legacyRate=(g,pts)=>pts*1575*g.profile.ebvMl/5250;
export const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
export const procedureFor=id=>ITEMS.find(i=>i.id===id)?.procedure||null;
export const act=(g,id,part='chest',wound=null,input=undefined)=>{
  const procedure=procedureFor(id);
  return engineAct(g,id,part,wound,input!==undefined?input:procedure==='iv'?perfectIV:procedure?autoInput(procedure,g,part):null);
};
// ---- Reference policy (plan: referenceCare): a competent, not perfect, responder with the minigames off.
// Calls transport, stops life threats first, meets every protocol step in deadline order, then keeps the
// patient going until handover. Every scenario and patient state must survive it (tests/reference-care.test.js).
import { advanceTime, conditionFor } from '../src/engine.js';
import { INJURIES } from '../src/content/injuries.js';
import { bodyPart, matchesRegion, proximalTourniquetSite } from '../src/content/body.js';
import { injuryBleeding, isMissing, isConscious, circulation } from '../src/simulation/selectors.js';
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
  return act(g,id,SITES.find(p=>(!it.regions||matchesRegion(it.regions,p))&&!isMissing(g,p)));
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
export function referenceCare(g,{trace=null}={}){
  if(g.transportAt===null)g=act(g,'transport');
  for(const i of g.injuries.filter(i=>tagsOf(i).includes('massive')&&bodyPart(i.part).limb))g=woundCare(g,i);
  if(has(g,'airwayFluid'))g=useItem(g,'suction');
  if(has(g,'airway')&&!g.airway)g=act(g,'airway','head');
  const c=conditionFor(g);
  if(c)for(const step of [...c.protocol].sort((a,b)=>g.protocol.steps[a.id].deadline-g.protocol.steps[b.id].deadline))if(g.protocol.steps[step.id].doneAt===null)g=solveCheck(g,step.check);
  for(const i of [...g.injuries].sort((a,b)=>injuryBleeding(g,b)-injuryBleeding(g,a)))g=woundCare(g,i);
  for(const [tag,id] of MEDICAL)if(has(g,tag)&&!g.injuries.some(i=>i.treatments?.[id]!==undefined)&&!g.medications.some(m=>m.id===id))g=useItem(g,id);
  if(has(g,'foreignBody'))g=useItem(g,'impaledSupport');
  if(g.injuries.some(i=>tagsOf(i).some(t=>t==='internal'||t==='crush')&&['abdomen','pelvis'].includes(i.part)))g=useItem(g,'pelvicBinder');
  for(const i of g.injuries.filter(i=>tagsOf(i).includes('fracture')&&bodyPart(i.part).limb))g=act(g,g.supplies.splint>0?'splint':'armSling',i.part,g.supplies.splint>0?null:i.id);
  const bleeding=has(g,'internal')||has(g,'massive')||clinicalSnapshot(g).lossFrac>.2,arm=ivArm(g);
  if(bleeding&&arm){g=act(g,'iv',arm);g=act(g,'txa',arm);if(circulation(g)<75)g=act(g,'fluid',arm);}
  if(g.injuries.some(i=>INJURIES[i.type].oxygenLoss))g=act(g,'oxygen','head');
  g=act(g,'blanket','chest');
  while(g.status==='active'){
    if(g.arrest){g=act(g,'airway','head');g=act(g,'oxygen','head');g=act(g,'cpr','chest',null,goodCPR);continue;}
    if(g.oxygenUntil<=g.elapsed&&g.supplies.oxygen>0&&g.injuries.some(i=>INJURIES[i.type].oxygenLoss))g=act(g,'oxygen','head');
    // A bronchodilator that wore off is repeated (another one when the first runs out).
    if(has(g,'bronchospasm')&&!working(g,'salbutamol')&&!working(g,'ipratropium')&&g.supplies.salbutamol+g.supplies.ipratropium>0)g=useItem(g,g.supplies.salbutamol>0?'salbutamol':'ipratropium');
    // Anaphylaxis can return when adrenaline wears off: a second porcja.
    if(has(g,'anaphylaxis')&&!working(g,'adrenaline')&&g.supplies.adrenaline>0)g=useItem(g,'adrenaline');
    const site=ivArm(g)&&ivSiteFor(g,ivArm(g));
    if(site&&circulation(g)<65&&g.supplies.fluid>0&&!g.infusions.some(i=>i.end>g.elapsed))g=act(g,'fluid',site);
    trace?.push({time:g.elapsed,...clinicalSnapshot(g),arrest:Boolean(g.arrest)});
    g=advanceTime(g,60);
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
