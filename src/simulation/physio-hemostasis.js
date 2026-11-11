// Lethal triad and haemostasis (P4). Lactate rises while O2 delivery is below the anaerobic threshold (and a little from
// limbs under a tourniquet) and clears with t½ ~60 min once perfused; pH is a proxy from lactate and PaCO2. Coagulation
// `coag` 0..1 = dilution × temperature × acidosis × consumption and scales every open bleeding source and clot growth.
// Each wound grows a clot while its residual flow is low; a holding clot (≥ .8) cuts the flow and withstands MAP up to
// its formation pressure + 15·clot — above that it halves and the wound bleeds again (permissive hypotension).
// State lives in g.phys (lactate, ph, coag, ledgers clot/clotMap). Game balance on textbook relations, not guidance.
import { HEMOSTASIS as H, METABOLIC as M, NORMALS, RESP_TUNING } from '../content/physiology-data.js';
import { activeDrugDefinitions } from './selectors.js';
import { bounded } from './modifiers.js';
import { hbOf, scaleOf } from './physio-model.js';
const LN2=Math.LN2;
// O2 delivery relative to normal: cardiac output × Hb × SaO2 (CPR gives a fraction).
export function o2Delivery(g){
  const p=g.phys;if(g.arrest)return g.resuscitating?.25*(g.cprBenefit??1):0;
  return p.hr/NORMALS.hr*p.sv/(NORMALS.svMl*scaleOf(g))*Math.min(1.2,hbOf(g)/g.profile.hb0)*Math.min(1,p.sao2/RESP_TUNING.reserveSpo2);
}
export const phOf=(lactate,paco2=NORMALS.paco2)=>bounded(7.4-M.phPerLac*(lactate-M.lactate0)-M.phPerCo2*(paco2-NORMALS.paco2),M.phMin,M.phMax);
export const initialLactate=lossFrac=>M.lactate0+M.initialPerLoss*Math.max(0,lossFrac-.15);
// The four factors of the coagulopathy (each 0..1).
export function coagParts(g){
  const p=g.phys,native=Math.max(1,g.profile.ebvMl-p.lostMl);
  return {
    dilution:native/(native+p.crystIvMl),
    cold:bounded(1-H.coldPerC*Math.max(0,H.coldFromC-g.temperature),0,1),
    acidosis:bounded(1-H.acidPerPh*Math.max(0,H.acidPh-(p.ph??7.4)),0,1),
    consumption:bounded(1-H.consumptionPer*Math.max(0,p.lostMl/g.profile.ebvMl-H.consumptionFrom),0,1)
  };
}
export function coagOf(g){const c=coagParts(g);return bounded(c.dilution*c.cold*c.acidosis*c.consumption,H.coagMin,1);}
// Antifibrinolysis of the drugs (TXA's `bleeding` channel; below-1 bleeding multipliers only).
export const antifibrinolysis=g=>activeDrugDefinitions(g).reduce((n,d)=>n+Math.max(0,1-(d.bleedingMultiplier??1)),0);
const CLOTTING=new Set(['arterial','mixed','venous','capillary']);
export const coagBleedFactor=g=>1+H.coagBleedGain*(1-(g.phys.coag??1));
// Present flow multiplier of a wound's clot (pure; UI and tests).
export const clotFactor=(g,injury)=>g.phys.clotMap?.[injury.id]!==undefined?1-H.clotEffect*(g.phys.clot[injury.id]||0):1;
// One second of one wound's haemostasis; `mlMin` = its residual flow after treatment and pressure. Returns the multiplier
// (coagulopathy × holding clot) for this second and updates the clot ledgers.
export function woundHemostasis(g,injury,vessel,mlMin){
  const p=g.phys,coag=p.coag??1,gain=coagBleedFactor(g);
  if(!(mlMin>0)||!CLOTTING.has(vessel))return gain;
  const id=injury.id,flow=mlMin*gain;let s=p.clot[id]||0;
  if(p.clotMap[id]!==undefined&&p.map>p.clotMap[id]+H.holdMarginMmHg*s){
    s*=H.rebleedKeep;delete p.clotMap[id];
    if(g.log.at(-1)?.time!==g.elapsed||!/ponownie przesiąka/.test(g.log.at(-1)?.text))g.log.push({time:g.elapsed,text:'Opatrunek ponownie przesiąka.'});
  }else if(flow<H.clotFlowMlMin*scaleOf(g)&&(vessel!=='capillary'||coag>H.capillaryCoag)&&(vessel!=='arterial'||p.map<=H.arterialClotMap)){
    s+=(1-s)*coag*(1+H.txaClotGain*antifibrinolysis(g))/H.clotTauS[vessel];
    if(s>=H.clotHold&&p.clotMap[id]===undefined)p.clotMap[id]=p.map;
  }else if(p.clotMap[id]===undefined)s*=1-1/H.washTauS;
  p.clot[id]=Math.min(1,s);
  return gain*clotFactor(g,injury);
}
// One second of the metabolic side of the triad: lactate, pH, coagulation.
export function stepHemostasis(g){
  const p=g.phys,d=o2Delivery(g);
  let produce=M.lacPerMin*Math.max(0,M.do2Crit-d)/M.do2Crit;
  for(const k in g.body){const b=g.body[k];if(Number.isFinite(b.treatments.tourniquet)&&(b.tourniquetQuality??1)>=.5)produce+=M.tourniquetLacMin;}
  const clear=d>M.do2Crit?Math.max(0,p.lactate-M.lactate0)*(LN2/(M.clearHalfMin*60))*bounded((d-M.do2Crit)/(M.do2Clear-M.do2Crit),0,1):0;
  p.lactate=Math.max(.5,p.lactate+produce/60-clear);
  p.ph=phOf(p.lactate,p.paco2);p.coag=coagOf(g);
}
export function initHemostasis(g){
  const p=g.phys;p.lactate=initialLactate(p.lostMl/g.profile.ebvMl);p.ph=phOf(p.lactate,p.paco2);p.clot={};p.clotMap={};p.coag=coagOf(g);
}
// Saves written before P4 gain the fields without a version bump.
export function ensureHemostasis(g){
  const p=g.phys;p.lactate??=initialLactate(p.lostMl/g.profile.ebvMl);p.ph??=phOf(p.lactate,p.paco2);p.clot??={};p.clotMap??={};p.coag??=coagOf(g);
}
const NUM=(n,lo=0,hi=Infinity)=>Number.isFinite(n)&&n>=lo&&n<=hi;
const ledger=(v,hi=Infinity)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(n=>NUM(n,0,hi));
export const validHemostasis=p=>NUM(p.lactate,0,40)&&NUM(p.ph,M.phMin,M.phMax)&&NUM(p.coag,0,1)&&ledger(p.clot,1)&&ledger(p.clotMap);
