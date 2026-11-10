// Consciousness and glucose (P3). GCS = 15 − the worst deficit of: hypoxia (SpO2 bands), hypercapnia, perfusion,
// glucose, core temperature, drug sedation and injury deficits (an unconscious presentation stays at GCS 6 until the
// airway is opened; recovering deficits such as the post-ictal state fade with their own τ). AVPU follows the GCS.
// Glucose is held in mmol/L. Game balance on textbook relations (docs/PHYSIOLOGY-PLAN.md), not clinical guidance.
import { GLUCOSE, NEURO } from '../content/physiology-data.js';
import { INJURIES } from '../content/injuries.js';
import { NEURO_INJURY } from '../content/injury-physiology.js';
import { activeDrugDefinitions } from './selectors.js';
const band=(table,v)=>{for(const [lo,d] of table)if(v>=lo)return d;return table.at(-1)[1];};
export const glucoseDeficit=mmol=>band(NEURO.glucose,mmol);
export const coldDeficit=tc=>band(NEURO.cold,tc);
export const heatDeficit=tc=>{for(const [hi,d] of NEURO.heat)if(tc<=hi)return d;return NEURO.heat.at(-1)[1];};
export const sedationOf=g=>{if(!g.medications.length)return 0;let n=0;for(const d of activeDrugDefinitions(g))n+=d.sedation||0;return n;};
const unconsciousInjury=g=>g.injuries.some(i=>INJURIES[i.type]?.unconscious);
const lerp=(v,t)=>v[0]+(v[1]-v[0])*t;
function injuryDeficit(g){
  let worst=!g.airway&&(g.initialUnconscious||unconsciousInjury(g))?9:0;
  for(const i of g.injuries){const n=NEURO_INJURY[i.type];if(n)worst=Math.max(worst,lerp(n.gcs,n.tauS?g.phys.neuroProg?.[i.id]||0:0));}
  return worst;
}
// Each deficit by name (tests, debrief); gcsOf takes the worst.
export function gcsComponents(g){
  const p=g.phys,s=p.sao2*100,loss=p.lostMl/g.profile.ebvMl,tc=g.temperature;
  return {
    hypoxia:s>=85?0:s>=80?1:s>=75?2:s>=70?3:s>=65?5:s>=60?7:s>=50?9:11,
    hypercapnia:Math.min(12,Math.max(0,(p.paco2-55)/6)),
    perfusion:Math.max(loss>=.4?4:loss>=.3?2:0,p.map<45?7:p.map<55?5:0),
    glucose:glucoseDeficit(p.glucose??GLUCOSE.normal),
    temperature:Math.max(coldDeficit(tc),heatDeficit(tc)),
    sedation:Math.min(12,sedationOf(g)),
    injury:injuryDeficit(g)
  };
}
export function gcsOf(g){
  if(g.status==='lost'||g.arrest)return 3;
  const c=gcsComponents(g);
  return Math.max(3,Math.round(15-Math.max(c.hypoxia,c.hypercapnia,c.perfusion,c.glucose,c.temperature,c.sedation,c.injury)));
}
export const avpuOf=gcs=>gcs>=14?'A':gcs>=12?'V':gcs>=9?'P':'U';
const A_GLU=1-Math.exp(-1/GLUCOSE.tauS),A_HYPO=1-Math.exp(-1/GLUCOSE.hypoTauS);
const ALPHA=new Map();const alphaOf=tau=>{let a=ALPHA.get(tau);if(a===undefined)ALPHA.set(tau,a=1-Math.exp(-1/tau));return a;};
export const hypoglycaemic=g=>g.injuries.some(i=>INJURIES[i.type]?.tags.includes('glucoseLow'));
// One second: the glucose baseline drifts (slowly falling in hypoglycaemia), absorbed glucose adds on top;
// recovering injury deficits progress.
export function stepNeuro(g){
  const p=g.phys,hypo=hypoglycaemic(g);
  p.glucoseBase+=((hypo?GLUCOSE.hypoFloor:GLUCOSE.normal)-p.glucoseBase)*(hypo?A_HYPO:A_GLU);
  p.glucose=p.glucoseBase+activeDrugDefinitions(g).reduce((n,d)=>n+(d.glucoseRise||0),0);
  for(const i of g.injuries){const n=NEURO_INJURY[i.type];if(n?.tauS&&(g.airway||!INJURIES[i.type].unconscious)){const t=p.neuroProg[i.id]||0;p.neuroProg[i.id]=t+(1-t)*alphaOf(n.tauS);}}
}
export function initNeuro(g){
  const p=g.phys;p.glucoseBase=hypoglycaemic(g)?GLUCOSE.hypoStart:GLUCOSE.normal;p.glucose=p.glucoseBase;p.neuroProg={};
}
// Saves written before P3 gain the fields without a version bump.
export function ensureNeuro(g){
  const p=g.phys;if(p.glucoseBase===undefined)initNeuro(g);p.glucose??=p.glucoseBase;p.neuroProg??={};
}
const NUM=n=>Number.isFinite(n)&&n>=0;
export const validNeuro=p=>NUM(p.glucoseBase)&&NUM(p.glucose)&&p.glucose<=40&&p.neuroProg&&typeof p.neuroProg==='object'&&!Array.isArray(p.neuroProg)&&Object.values(p.neuroProg).every(n=>NUM(n)&&n<=1);
