import { CONDITIONS, CATEGORIES, CONDITION_SCENARIOS, conditionById, conditionScenarioId } from '../content/conditions.js';
import { SCENARIOS } from '../content/scenarios.js';
import { INJURIES } from '../content/injuries.js';
import { ITEMS } from '../content/items.js';
import { bodyPart, resolvePart } from '../content/body.js';
import { tourniquetOver } from './vascular.js';
import { applyInsult } from './physio-model.js';
// Declarative protocol checks/consequences for patient states (content/conditions.js).
// State: g.protocol = {conditionId, pain, steps:{[id]:{deadline, doneAt, missedAt}}}; absent in legacy runs.
const ACTIONS=['examine','vitals','history','transport'];
const list=v=>Array.isArray(v)?v:[v];
const parts=v=>list(v).map(resolvePart);
const usedItem=(g,id)=>g.medications.some(m=>m.id===id)||(g.assessments||[]).some(a=>a.id===id)||(g.supports||[]).some(s=>s.id===id)||Object.values(g.body).some(p=>p.treatments?.[id]!==undefined)||g.injuries.some(i=>i.treatments?.[id]!==undefined);
const treated=(g,i)=>Object.keys(i.treatments||{}).length>0||(bodyPart(i.part)?.limb&&tourniquetOver(g,i.part,.5)!==undefined);
export const CHECKS={
  examined:(g,v,e)=>e?.id==='examine'&&parts(v).includes(resolvePart(e.target)),
  action:(g,v,e)=>e?.id===v||(v==='history'&&g.historyKnown)||(v==='transport'&&g.transportAt!==null),
  item:(g,v,e)=>e?.id===v||usedItem(g,v),
  itemAny:(g,v,e)=>v.some(id=>e?.id===id||usedItem(g,id)),
  treatedInjury:(g,v)=>g.injuries.some(i=>i.type===v&&treated(g,i)),
  treatedAll:(g,v)=>{const found=g.injuries.filter(i=>i.type===v);return found.length>0&&found.every(i=>treated(g,i));},
  transport:g=>g.transportAt!==null,
  warm:g=>g.warm||(g.supports||[]).some(s=>s.id==='warmingPack'),
  airway:g=>g.airway,
  oxygenGiven:(g,v,e)=>g.oxygenUntil>g.elapsed||(g.ventilatingUntil>0&&g.ventilatingUntil>=g.elapsed)||['oxygen','bvm'].includes(e?.id),
  any:(g,v,e)=>v.some(c=>matches(g,c,e))
};
export const CONSEQUENCES={
  worsen:(g,{injury,to})=>{const i=g.injuries.find(i=>i.type===injury);if(i)i.type=to;},
  // Legacy point deltas become insults in real units (blood: points of 0.5% EBV, oxygen: SpO2 scale).
  oxygen:(g,n)=>applyInsult(g,{kind:'oxygen',pts:n}),
  blood:(g,n)=>applyInsult(g,n<0?{kind:'bleed',pts:-n}:{kind:'bleed',ml:0}),
  pain:(g,n)=>{g.protocol.pain=(g.protocol.pain||0)+n;},
  temperature:(g,n)=>applyInsult(g,{kind:'temperature',delta:n}),
  unconscious:g=>{g.initialUnconscious=true;},
  addInjury:(g,[part,type],step)=>{g.injuries.push({id:`protocol-${step.id}`,part:resolvePart(part),type,treatments:{}});}
};
export function matches(g,check,event=null){return Object.entries(check).every(([type,value])=>CHECKS[type]?.(g,value,event));}
// Called before an action's ticks with the action as `event` (it counts from its start) and every tick without one.
export function checkProtocol(g,event=null){
  const p=g.protocol,c=p&&conditionById(p.conditionId);
  if(!c||g.status!=='active')return;
  for(const step of c.protocol){
    const s=p.steps[step.id];
    if(s.doneAt===null&&matches(g,step.check,event))s.doneAt=g.elapsed;
    if(s.doneAt===null&&s.missedAt===null&&g.elapsed>s.deadline){
      s.missedAt=g.elapsed;
      for(const [type,value] of Object.entries(step.consequence))CONSEQUENCES[type](g,value,step);
      g.log.push({time:g.elapsed,text:`Zaniedbano: ${step.label.toLocaleLowerCase('pl')} — stan się pogarsza.`});
    }
  }
}
export function createProtocol(condition,multiplier=1){
  return {conditionId:condition.id,pain:0,steps:Object.fromEntries(condition.protocol.map(s=>[s.id,{deadline:Math.round(s.deadline*multiplier),doneAt:null,missedAt:null}]))};
}
export function protocolStatus(g){
  const p=g.protocol,c=p&&conditionById(p.conditionId);
  if(!c)return [];
  return c.protocol.map(step=>{
    const s=p.steps[step.id],done=s.doneAt!==null;
    return {id:step.id,label:step.label,deadline:s.deadline,doneAt:s.doneAt,late:done&&s.doneAt>s.deadline,onTime:done&&s.doneAt<=s.deadline,missed:!done&&(g.elapsed>s.deadline||g.status!=='active')};
  });
}
// Share of steps done on time (late counts half); 0..1, null without a protocol.
export function protocolShare(g){
  const steps=protocolStatus(g);
  return steps.length?steps.reduce((n,s)=>n+(s.onTime?1:s.late?.5:0),0)/steps.length:null;
}
const FINITE=n=>Number.isFinite(n)&&n>=0;
export function validProtocol(p){
  const c=p&&typeof p==='object'&&!Array.isArray(p)&&conditionById(p.conditionId);
  if(!c||!p.steps||typeof p.steps!=='object'||Array.isArray(p.steps))return false;
  if(p.pain!==undefined&&!FINITE(p.pain))return false;
  const ids=c.protocol.map(s=>s.id);
  if(Object.keys(p.steps).length!==ids.length||ids.some(id=>!p.steps[id]))return false;
  return ids.every(id=>{const s=p.steps[id];return FINITE(s.deadline)&&s.deadline>0&&(s.doneAt===null||FINITE(s.doneAt))&&(s.missedAt===null||FINITE(s.missedAt));});
}
export function validateConditions(){
  const ids=new Set(),scenarioIds=new Set(SCENARIOS.map(s=>s.id));
  for(const s of CONDITION_SCENARIOS)if(scenarioIds.has(s.id))throw new Error(`Condition scenario id clashes: ${s.id}`);
  const scenarioOf=c=>SCENARIOS.find(s=>s.id===conditionScenarioId(c))||CONDITION_SCENARIOS.find(s=>s.id===c.id);
  const itemOk=id=>ITEMS.some(i=>i.id===id),partOk=id=>Boolean(bodyPart(id));
  const checkOk=check=>Object.entries(check).length>0&&Object.entries(check).every(([type,v])=>CHECKS[type]&&(
    type==='examined'?list(v).every(partOk):type==='action'?ACTIONS.includes(v):type==='item'?itemOk(v):type==='itemAny'?Array.isArray(v)&&v.every(itemOk):type==='treatedInjury'||type==='treatedAll'?Boolean(INJURIES[v]):type==='any'?Array.isArray(v)&&v.every(checkOk):v===true));
  const consequenceOk=c=>Object.entries(c).every(([type,v])=>CONSEQUENCES[type]&&(
    type==='worsen'?Boolean(INJURIES[v?.injury]&&INJURIES[v?.to]):type==='addInjury'?partOk(v?.[0])&&Boolean(INJURIES[v?.[1]]):type==='unconscious'?v===true:Number.isFinite(v)));
  for(const c of CONDITIONS){
    if(ids.has(c.id))throw new Error(`Duplicate condition: ${c.id}`);ids.add(c.id);
    if(!CATEGORIES.some(k=>k.id===c.category)||!['lekki','poważny','krytyczny'].includes(c.severity))throw new Error(`Invalid condition: ${c.id}`);
    const s=scenarioOf(c);
    if(!s||!s.title||!s.scene||!s.history||!s.lesson||!Array.isArray(s.injuries)||!s.injuries.length)throw new Error(`Invalid condition scenario: ${c.id}`);
    for(const [part,type] of s.injuries)if(!partOk(part)||!INJURIES[type])throw new Error(`Invalid injury in condition ${c.id}`);
    if(!c.protocol.length||new Set(c.protocol.map(p=>p.id)).size!==c.protocol.length)throw new Error(`Invalid protocol: ${c.id}`);
    for(const step of c.protocol)if(!step.label||!(step.deadline>0)||!checkOk(step.check)||!consequenceOk(step.consequence))throw new Error(`Invalid protocol step: ${c.id}/${step.id}`);
  }
}
