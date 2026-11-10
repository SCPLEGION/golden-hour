// One second of heat balance (P3): dT/dt = (Qmet + shivering + active warming − Qloss − sweating − burns − cold fluids)
// / (m·3.47 kJ/kg/°C). Qloss = BSA (Mosteller)·h·(33 − env)·(1 + 0.1·wind)·(1 + 3·wet)·exposure·(1 − insulation).
// g.temperature stays the core temperature (saved field); the environment comes from the scenario. Game balance on
// textbook relations (docs/PHYSIOLOGY-PLAN.md), not clinical guidance.
import { THERMAL as T, DEFAULT_ENVIRONMENT, NORMALS, RESP_TUNING } from '../content/physiology-data.js';
import { INJURIES } from '../content/injuries.js';
import { supportDefinitions, bounded } from './modifiers.js';
import { activeDrugDefinitions } from './selectors.js';
import { hbOf, scaleOf } from './physio-model.js';
export const bsaOf=profile=>Math.sqrt(profile.heightCm*profile.massKg/3600);
const NUM=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export const validEnvironment=e=>Boolean(e&&typeof e==='object'&&NUM(e.tempC,-40,50)&&NUM(e.wet,0,1)&&NUM(e.wind,0,30));
export const environmentOf=scenario=>validEnvironment(scenario?.environment)?{...DEFAULT_ENVIRONMENT,...scenario.environment}:{...DEFAULT_ENVIRONMENT};
const anhidrosis=g=>g.injuries.some(i=>i.type==='heatStroke');
// O2 delivery relative to normal (cardiac output × Hb × SaO2), the scale of metabolic heat.
function deliveryOf(g){
  const p=g.phys;if(g.arrest)return g.resuscitating?.25:.1;
  const co=p.hr/NORMALS.hr*p.sv/(NORMALS.svMl*scaleOf(g));
  return co*Math.min(1.2,hbOf(g)/g.profile.hb0)*Math.min(1,p.sao2/RESP_TUNING.reserveSpo2);
}
// Heat flows in W at the current state (exported for tests and the guide numbers).
export function heatFlows(g){
  const p=g.phys,env=p.env||DEFAULT_ENVIRONMENT,tc=g.temperature,m=g.profile.massKg;
  const delivery=bounded(deliveryOf(g),.1,1.1),met=T.metWPerKg*m*(g.arrest?delivery:bounded(delivery,.3,1.1));
  // Shivering: full from 36.5 → 34 °C, fading to none at 32 °C; blunted by shock (delivery) and sedating drugs.
  let sedation=0;if(g.medications.length)for(const d of activeDrugDefinitions(g))sedation+=(d.sedation||0)+(d.drugTags?.includes('opioid')&&d.painRelief>0?1:0);
  const drive=tc>=T.shiverStartC?0:tc>=T.shiverFullC?(T.shiverStartC-tc)/(T.shiverStartC-T.shiverFullC):tc>T.shiverStopC?(tc-T.shiverStopC)/(T.shiverFullC-T.shiverStopC):0;
  const shiver=g.arrest?0:T.shiverWPerKg*m*drive*bounded((delivery-.4)/.5,0,1)/(1+.5*sedation);
  let seen=0,parts=0;for(const k in g.body){parts++;if(g.body[k].examinedAt!==null)seen++;}
  const examined=seen/Math.max(1,parts);
  const exposure=1+T.examExposure*examined,insulation=g.warm?T.blanketInsulation:0;
  const loss=bsaOf(g.profile)*T.hW*(T.skinC-env.tempC)*(1+T.windK*env.wind)*(1+T.wetK*env.wet)*exposure*(1-insulation);
  const sweat=anhidrosis(g)||g.arrest?0:Math.min(T.sweatMaxW,Math.max(0,tc-T.sweatStartC)*T.sweatWPerC);
  let burns=0;for(const i of g.injuries)if(INJURIES[i.type]?.tags.includes('burn'))burns+=T.burnW;
  const active=g.supports?.length?supportDefinitions(g).reduce((n,s)=>n+(s.heatW||0),0):0;
  const fluid=(p.infusedMl||0)*T.waterKJ*(tc-T.fluidC); // J this second (mL × 4.18 J/mL/°C × ΔT)
  return {met,shiver,loss,sweat,burns,active,fluid,net:met+shiver+active-loss-sweat-burns-fluid};
}
export function stepThermal(g){
  const f=heatFlows(g);
  g.temperature=bounded(g.temperature+f.net/(g.profile.massKg*T.cpKJ*1000),T.minC,T.maxC);
  return f;
}
export const hypothermicVF=g=>g.temperature<T.vfC;
