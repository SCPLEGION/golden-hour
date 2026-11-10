// Save format v3 (g.profile + g.phys in mL). v2 saves migrate here; v3 saves are validated.
import { NORMALS, TUNING } from '../content/physiology-data.js';
import { initPhys, ptsToMl, settleCirculation } from './physio-model.js';
const NUM=(n,min=0,max=Infinity)=>Number.isFinite(n)&&n>=min&&n<=max;
const PHYS_KEYS=['lostMl','hbMassG','crystIvMl','crystInMl','plasmaDeficitMl','hr','svrIdx','map','sbp','dbp','sv','reserve','lowMapS'];
const ledger=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(n=>NUM(n));
export function validProfile(p){
  return Boolean(p&&typeof p==='object'&&['M','F'].includes(p.sex)&&NUM(p.ageY,1,120)&&NUM(p.massKg,30,200)&&NUM(p.heightCm,100,230)&&NUM(p.ebvMl,1500,15000)&&NUM(p.hb0,5,22)&&Number.isInteger(p.seed)&&p.seed>=0);
}
export function validPhys(p){
  return Boolean(p&&typeof p==='object'&&!Array.isArray(p)&&PHYS_KEYS.every(k=>Number.isFinite(p[k]))&&PHYS_KEYS.filter(k=>k!=='hr').every(k=>p[k]>=0)&&p.reserve<=1&&ledger(p.injuryMl)&&ledger(p.boneMl));
}
const hash=text=>{let h=2166136261;for(const c of String(text))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h&0x7fffffff;};
// v2 → v3: lostMl = (100 − blood)·0.5%·EBV, fluid support → intravascular crystalloid, infusions → mL left.
// v2 carried no patient build: a deterministic 80 kg man with the saved age.
export function migrateV2(g){
  const age=Number(/(\d+)\s*lat/.exec(g.patient||'')?.[1]);
  g.profile={sex:'M',ageY:NUM(age,1,120)?age:40,massKg:80,heightCm:178,ebvMl:80*NORMALS.ebvPerKg.M,hb0:NORMALS.hb.M,seed:hash(`${g.scenarioId}|${g.patient}`)};
  initPhys(g,g.blood);
  const cryst=ptsToMl(g,g.fluidSupport||0);g.phys.crystIvMl=cryst;g.phys.crystInMl=cryst;
  for(const infusion of g.infusions||[])if(infusion&&!Number.isFinite(infusion.ml)){
    const left=Math.max(0,Math.min(120,(infusion.end??0)-g.elapsed));
    infusion.ml=left/120*TUNING.bagMl;infusion.end=left>0?g.elapsed+TUNING.infusionMaxS:Math.min(infusion.end??g.elapsed,g.elapsed);
  }
  settleCirculation(g);
  delete g.fluidSupport;g.version=3;
  return g;
}
