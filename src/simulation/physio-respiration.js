// One second of oxygenation and ventilation (P2): FiO2 by device, PaCO2 = 40/vaFrac, alveolar gas equation,
// V/Q (A–a gradient, answers to oxygen) and shunt (does not) mixing with a venous saturation that falls with delivery,
// a lagged oxygen store, respiratory rate and the core GCS. State lives in g.phys; values are game balance on textbook
// relations (docs/PHYSIOLOGY-PLAN.md), not clinical guidance.
import { NORMALS, RESP_TUNING as R } from '../content/physiology-data.js';
import { INJURIES } from '../content/injuries.js';
import { injuryPhysiology } from '../content/injury-physiology.js';
import { activeDrugDefinitions, activeModifiers, respiratoryBurden, pain } from './selectors.js';
import { woundModifiers, bounded } from './modifiers.js';
import { hbOf, scaleOf } from './physio-model.js';
// Severinghaus: PaO2 (mmHg) → saturation 0..1 (60 → .90, 40 → .75, 27 → .50).
export const severinghaus=p=>p<=0?0:1/(1+23400/(p*p*p+150*p));
// Inverse by bracketed Newton on the monotone curve (init, migration, display).
export function invSeveringhaus(s,guess=60){
  s=bounded(s,.001,.9995);let lo=.5,hi=700,p=bounded(guess,lo,hi);
  for(let i=0;i<40;i++){
    const f=severinghaus(p)-s;if(Math.abs(f)<1e-10)break;
    if(f>0)hi=p;else lo=p;
    const d=(severinghaus(p+.01)-severinghaus(p-.01))/.02,next=p-f/d;
    p=d>0&&next>lo&&next<hi?next:(lo+hi)/2;
  }
  return p;
}
// Target arterial saturation 0..1: end-capillary blood from the alveolar gas equation minus the A–a gradient (V/Q,
// answers to FiO2), mixed with shunted venous blood. Sv = Sa − 0.24/(CO·Hb rel.) (Fick), so delivery lowers it; solved
// in closed form, floored at Sv .15. A small dissolved-O2 term lets high FiO2 help a shunt only slightly.
export function arterialSaturation({fio2=R.fio2.air,paco2=NORMALS.paco2,aa=R.aa0,shunt=R.shunt0,co=1,hb=15,hb0=hb}={}){
  hb=Math.max(3,hb);const pc=Math.max(0,fio2*R.patm-paco2/R.rq-aa),sc=severinghaus(pc)+.003*pc/(1.34*hb);
  const qs=bounded(shunt,0,.9),k=R.extraction/(co*hb/hb0);
  return bounded(Math.max(sc-qs/(1-qs)*k,(1-qs)*sc+qs*R.svFloor),0,1);
}
const alpha=tau=>1-Math.exp(-1/tau);
const A_CO2=alpha(R.tauCo2S),A_UP=alpha(R.tauUpS),A_AIR=alpha(R.tauAirS),A_HIGH=alpha(R.tauHighS),A_STORE=alpha(R.tauStoreS),A_SHOWN=alpha(R.tauShownS),A_RR=alpha(R.tauRrS),A_INSULT=alpha(R.insultTauS);
const ALPHA=new Map();const alphaOf=tau=>{let a=ALPHA.get(tau);if(a===undefined)ALPHA.set(tau,a=alpha(tau));return a;};
const lerp=(v,t)=>v?v[0]+(v[1]-v[0])*t:0;
export const bagging=g=>(g.ventilatingUntil>0&&g.ventilatingUntil>=g.elapsed)||Boolean(g.resuscitating);
// Oxygen item = a non-rebreather on a fresh game cylinder; g.oxygenUntil mirrors the litres left for UI and protocol.
export function connectOxygen(g){g.phys.o2={device:'nrb',flowLpm:R.flowLpm,litersLeft:R.cylinderL};g.oxygenUntil=g.elapsed+Math.round(R.cylinderL/R.flowLpm*60);}
const unconsciousInjury=g=>g.injuries.some(i=>INJURIES[i.type]?.unconscious);
const airwayInjury=g=>g.injuries.some(i=>INJURIES[i.type]?.tags.includes('airway')&&!g.airway);
// Core GCS: 15 − the worst deficit of hypoxia (SpO2 bands), hypercapnia, perfusion (class/MAP) and injury deficits
// (an unconscious presentation stays at GCS 6 until the airway is opened, as before P2).
export function gcsOf(g){
  if(g.status==='lost'||g.arrest)return 3;
  const p=g.phys,s=p.sao2*100,loss=p.lostMl/g.profile.ebvMl;
  const hypoxia=s>=85?0:s>=80?1:s>=75?2:s>=70?3:s>=65?5:s>=60?7:s>=50?9:11;
  const hypercapnia=Math.min(12,Math.max(0,(p.paco2-55)/6));
  const perfusion=Math.max(loss>=.4?4:loss>=.3?2:0,p.map<45?7:p.map<55?5:0);
  const injury=(g.initialUnconscious||unconsciousInjury(g))&&!g.airway?9:0;
  return Math.max(3,Math.round(15-Math.max(hypoxia,hypercapnia,perfusion,injury)));
}
export const avpuOf=gcs=>gcs>=14?'A':gcs>=12?'V':gcs>=9?'P':'U';
// Relief of one injury's respiratory components: matching drug, chest seal quality, airway-fluid/irrigation items.
function reliefOf(g,injury,def,resp,drugs){
  let r=1-woundModifiers(injury).oxygenMultiplier;
  for(const d of drugs){if(def.tags.includes(d.relievesTag))r=Math.max(r,d.reliefStrength);if(resp.reliefTag&&d.respiratoryReliefTag===resp.reliefTag)r=Math.max(r,d.respiratoryRelief||0);}
  if(def.tags.includes('chest')&&(injury.treatments??g.body[injury.part].treatments).seal!==undefined)r=Math.max(r,injury.sealQuality??1);
  return bounded(r,0,1);
}
export function respire(g){
  const p=g.phys,dead=Boolean(g.arrest),bvm=bagging(g),o2=p.o2;
  const on=o2.litersLeft>0,fio2=bvm?(on?R.fio2.bvm:R.fio2.air):on?R.fio2.nrb:R.fio2.air;
  if(on){o2.litersLeft=Math.max(0,o2.litersLeft-o2.flowLpm/60);if(o2.litersLeft<=1e-9)Object.assign(o2,{device:'none',flowLpm:0,litersLeft:0});}
  let obstruct=1,va=1,depress=1,aa=R.aa0,shunt=R.shunt0,airwayTagged=false;
  const drugs=activeDrugDefinitions(g);
  for(const injury of g.injuries){
    const resp=injuryPhysiology(injury.type)?.resp;if(!resp)continue;
    const def=INJURIES[injury.type],f=1-reliefOf(g,injury,def,resp,drugs);
    let t=p.respProg[injury.id]||0;
    if(resp.tauS){t+=(f-t)*alphaOf(resp.tauS);p.respProg[injury.id]=t;}
    const opened=g.airway&&def.tags.includes('airway');
    if(def.tags.includes('airway')&&!opened)airwayTagged=true;
    if(resp.obstruct&&!opened)obstruct=Math.min(obstruct,1-(1-lerp(resp.obstruct,t))*f);
    if(resp.va)va*=1-(1-lerp(resp.va,t))*f;
    if(resp.depress)depress*=1-(1-lerp(resp.depress,t))*f;
    if(resp.painVa)va*=1-(1-resp.painVa)*bounded(pain(g)/8,0,1)*f;
    aa+=lerp(resp.aa,t)*f;shunt+=lerp(resp.shunt,t)*f;
  }
  const support=activeModifiers(g).reduce((n,d)=>n+(d.oxygenSupport||0),0);
  if(support>0)aa=Math.max(R.aa0,aa-support*R.supportAaPerUnit);
  depress/=1+R.burdenK*respiratoryBurden(g);
  const gcs=gcsOf(g),soft=!g.airway&&!bvm&&!airwayTagged&&gcs<=8?R.softTissue+(1-R.softTissue)*(gcs-3)/10:1;
  const upper=Math.min(obstruct,soft);
  let vaFrac=dead&&!g.resuscitating?R.apnoeaVa:bvm?va:upper*va*depress;
  vaFrac=bounded(vaFrac,R.vaMin,1.3);
  p.paco2+=(Math.min(R.paco2Max,NORMALS.paco2/vaFrac)-p.paco2)*A_CO2;
  const co=dead?(g.resuscitating?.3*(g.cprBenefit??1):.02):Math.max(.05,p.hr/NORMALS.hr*p.sv/(NORMALS.svMl*scaleOf(g)));
  // Rises follow the store at 20 s; falls are slower when the store was filled with oxygen (up to 90 s).
  p.storeFio2+=(fio2-p.storeFio2)*A_STORE;
  const high=bounded((p.storeFio2-R.fio2.air)/(R.fio2.nrb-R.fio2.air),0,1);
  p.o2Debt*=1-A_INSULT;
  const qs=bounded(shunt,0,.9),target=Math.max(0,arterialSaturation({fio2,paco2:p.paco2,aa,shunt:qs,co,hb:hbOf(g),hb0:g.profile.hb0})-p.o2Debt*(1-.5*bounded((fio2-R.fio2.air)/(R.fio2.nrb-R.fio2.air),0,1)));
  p.sao2+=(target-p.sao2)*(target>p.sao2?A_UP:A_AIR+(A_HIGH-A_AIR)*high);
  p.sao2=bounded(p.sao2,0,1);
  p.pao2=invSeveringhaus(Math.min(p.sao2,.999),p.pao2||60);
  p.spo2Shown+=(p.sao2*100-p.spo2Shown)*A_SHOWN;
  p.fio2=fio2;p.vaFrac=vaFrac;p.shunt=qs;p.aaExtra=aa-R.aa0;
  // RR: drive from pain, hypoxia, hypercapnia, mechanical load and shock (acidosis proxy); central depression blunts
  // the reflex drive (×d²) and the rate (×d³).
  const loss=p.lostMl/g.profile.ebvMl,s=p.sao2*100;
  const reflex=Math.max(0,92-s)*.45+Math.max(0,p.paco2-42)*.2+14*(1-Math.min(1,upper*va))+45*Math.max(0,loss-.12);
  const rr=dead?0:bounded((NORMALS.rr+.6*pain(g)+reflex*depress*depress)*depress*depress*depress,3,48);
  p.rr+=(rr-p.rr)*(dead?1:A_RR);
  p.lowSpo2S=!dead&&s<R.hypoxicArrestSpo2?p.lowSpo2S+1:0;
  g.oxygen=p.sao2*100;
}
export const hypoxicArrestDue=g=>g.phys.lowSpo2S>=R.hypoxicArrestS;
// Fresh respiratory state from a legacy SpO2 value (createGame, v2 migration, scoring fixtures); PaCO2 starts settled.
export function initRespiration(g,oxygen=g.oxygen){
  const p=g.phys,s=bounded((Number.isFinite(oxygen)?oxygen:NORMALS.spo2)/100,0,.995);
  Object.assign(p,{fio2:R.fio2.air,vaFrac:1,paco2:NORMALS.paco2,sao2:s,pao2:invSeveringhaus(s),spo2Shown:s*100,shunt:R.shunt0,aaExtra:0,o2Debt:0,rr:NORMALS.rr,storeFio2:R.fio2.air,lowSpo2S:0,respProg:{},o2:{device:'none',flowLpm:0,litersLeft:0}});
  syncOxygen(g);settleRespiration(g);return p;
}
// Saves written before P2 (v3 without the respiratory fields) gain them from the legacy SpO2 without a version bump.
export function ensureRespiration(g){
  const p=g.phys,s=bounded((Number.isFinite(g.oxygen)?g.oxygen:NORMALS.spo2)/100,0,.995),fresh=p.sao2===undefined;
  p.sao2??=s;p.spo2Shown??=p.sao2*100;p.pao2??=invSeveringhaus(p.sao2);p.paco2??=NORMALS.paco2;p.fio2??=R.fio2.air;p.vaFrac??=1;p.shunt??=R.shunt0;p.aaExtra??=0;p.o2Debt??=0;p.rr??=NORMALS.rr;p.storeFio2??=R.fio2.air;p.lowSpo2S??=0;p.respProg??={};
  if(!p.o2){p.o2={device:'none',flowLpm:0,litersLeft:0};syncOxygen(g);}
  if(fresh&&g.status==='active')settleRespiration(g);
}
const syncOxygen=g=>{const left=Math.max(0,(g.oxygenUntil||0)-g.elapsed);if(left>0)g.phys.o2={device:'nrb',flowLpm:R.flowLpm,litersLeft:left*R.flowLpm/60};};
// PaCO2 and RR start at their targets; saturation keeps its given value (the scenario's presentation).
function settleRespiration(g){
  const p=g.phys,keep={sao2:p.sao2,pao2:p.pao2,spo2Shown:p.spo2Shown,storeFio2:p.storeFio2,respProg:{...p.respProg},o2:{...p.o2},o2Debt:p.o2Debt,lowSpo2S:p.lowSpo2S},oxygen=g.oxygen;
  for(let i=0;i<120;i++){respire(g);Object.assign(p,{sao2:keep.sao2,pao2:keep.pao2,spo2Shown:keep.spo2Shown,storeFio2:keep.storeFio2,respProg:{...keep.respProg},o2:{...keep.o2},o2Debt:keep.o2Debt,lowSpo2S:keep.lowSpo2S});}
  g.oxygen=oxygen;
}
const NUM=n=>Number.isFinite(n)&&n>=0;
export const RESP_KEYS=['fio2','vaFrac','paco2','sao2','pao2','spo2Shown','shunt','aaExtra','o2Debt','rr','storeFio2','lowSpo2S'];
export function validRespiration(p){
  return RESP_KEYS.every(k=>NUM(p[k]))&&p.sao2<=1&&p.fio2<=1&&p.respProg&&typeof p.respProg==='object'&&!Array.isArray(p.respProg)&&Object.values(p.respProg).every(n=>NUM(n)&&n<=1)
    &&p.o2&&typeof p.o2==='object'&&['none','nrb'].includes(p.o2.device)&&NUM(p.o2.flowLpm)&&NUM(p.o2.litersLeft)&&p.o2.litersLeft<=R.cylinderL;
}
