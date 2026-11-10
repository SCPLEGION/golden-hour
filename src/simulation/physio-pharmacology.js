// Drugs as doses (P3): every administration is a dose {id, at, amount (= delivery 0..1), route, site}. Each medicine has a
// one-compartment model with first-order absorption (depot → plasma, ka by route), first-order elimination (ke by half-life
// category) and an effect site (ke0); channel effects follow Emax/Hill curves of the effect-site level Ce. Doses add up
// linearly in the depot, so repeated porcje stack and overdose emerges from the curves rather than from a flat penalty.
// Everything is analytic in time, so a save holds only the dose list. Values are game balance (content/physiology-data.js).
import { PK_ROUTES, HALF_LIFE_MIN, PHARMACOLOGY, PK_TUNING } from '../content/physiology-data.js';
import { itemById, MEDICINES } from '../content/items.js';
import { bounded } from './modifiers.js';
const LN2=Math.LN2;
const hill=(c,ec50,n)=>c<=0?0:1/(1+Math.pow(ec50/c,n));
// Unit-dose effect-site curve for rates ka, ke, ke0 (1/s): Ce(t) = ka·ke0·Σ e^(−λi t)/Π(λj − λi).
export function effectCurve(ka,ke,ke0){
  if(Math.abs(ka-ke)<1e-9)ka*=1.001;if(Math.abs(ke0-ke)<1e-9)ke0*=1.003;if(Math.abs(ke0-ka)<1e-9)ke0*=1.007;
  const a=1/((ke-ka)*(ke0-ka)),b=1/((ka-ke)*(ke0-ke)),c=1/((ka-ke0)*(ke-ke0)),k=ka*ke0;
  return t=>t<=0?0:Math.max(0,k*(a*Math.exp(-ka*t)+b*Math.exp(-ke*t)+c*Math.exp(-ke0*t)));
}
// Peak time and value of a curve (coarse scan, then a fine one around the best sample).
export function peakOf(curve,horizonS){
  let best=0,bestT=0;const step=Math.max(1,horizonS/4000);
  for(let t=step;t<=horizonS;t+=step){const v=curve(t);if(v>best){best=v;bestT=t;}}
  for(let t=Math.max(0,bestT-step);t<=bestT+step;t+=step/40){const v=curve(t);if(v>best){best=v;bestT=t;}}
  return {t:bestT,value:best};
}
// Item value each channel scales (single full porcja at its peak = this value), when the channel has no explicit emax.
const LEGACY={analgesia:d=>d.painRelief||0,relief:()=>1,respDepression:d=>d.respiratoryBurden||0,antagonism:d=>d.respiratoryRelief??1,hr:d=>d.pulseIncrease||0,volume:d=>d.circulationSupport||0,oxygen:d=>d.oxygenSupport||0,bleeding:d=>1-(d.bleedingMultiplier??1),sedation:()=>0,glucose:()=>0};
export const CHANNELS=Object.keys(LEGACY);
const CAPPED=new Set(['relief','antagonism']);
const PROFILES=new Map();
// Resolved kinetics of one medicine, or null for an unprofiled (extension) drug, which keeps the legacy onset/duration window.
export function profileOf(id){
  if(PROFILES.has(id))return PROFILES.get(id);
  const def=itemById(id),pk=PHARMACOLOGY[id];
  if(!def||!pk){if(!pk&&def)return null;PROFILES.set(id,null);return null;}
  const route=PK_ROUTES[def.route]||PK_ROUTES.IV;
  const ka=LN2/(pk.absHalfS??route.absHalfS),ke=LN2/(HALF_LIFE_MIN[pk.half]*60),ke0=LN2/pk.ke0HalfS,lagS=pk.lagS??route.lagS;
  const curve=effectCurve(ka,ke,ke0),peak=peakOf(curve,Math.min(172800,12*Math.max(1/ka,1/ke,1/ke0)));
  const channels=Object.entries(pk.channels).map(([name,c])=>{
    const at1=c.linear?1:hill(1,c.ec50,c.n);
    return {name,linear:Boolean(c.linear),ec50:c.ec50,n:c.n,emax:c.emax??LEGACY[name](def)/at1,cap:CAPPED.has(name)};
  });
  const profile={id,ka,ke,ke0,lagS,curve,norm:1/peak.value,peakS:lagS+peak.t,channels,primary:channels[0]};
  PROFILES.set(id,profile);return profile;
}
// Normalised effect-site level (one full porcja peaks at 1) of drug `id` at time t, before the shock factor.
export function levelAt(g,id,t=g.elapsed,profile=profileOf(id)){
  let ce=0;
  for(const d of g.medications)if(d.id===id&&t>d.at)ce+=(d.amount??1)*profile.curve(t-d.at-profile.lagS);
  return ce*profile.norm;
}
// Shock shrinks the distribution volume: Ce × (1 + gain·s), s = 0 below 20% loss, 1 at 40%.
export const shockFactor=g=>1+PK_TUNING.shockGain*bounded((g.phys.lostMl/g.profile.ebvMl-.2)/.2,0,1);
const channelValue=(c,ce)=>{const v=c.linear?c.emax*ce:c.emax*hill(ce,c.ec50,c.n);return c.cap?Math.min(1,v):v;};
const fractionOf=(c,ce)=>c.linear?Math.min(1,ce):hill(ce,c.ec50,c.n);
// Legacy window for drugs without a profile (extension content, written before P3): full effect from at+onset for duration.
function windowEffect(g,id,def,t){
  const doses=g.medications.filter(d=>d.id===id&&t>=d.at+(def.onset??0)&&t<d.at+(def.onset??0)+(def.duration??0));
  const pendingDose=g.medications.some(d=>d.id===id&&t<d.at+(def.onset??0));
  return {amount:doses.length?Math.max(...doses.map(d=>d.amount??1)):0,pending:pendingDose};
}
const MEMO=new WeakMap();
// Every drug given so far, with its level, channel values, first-channel fraction, activity and phase. Memoised per tick.
export function drugEffects(g){
  const key=g.elapsed,meds=g.medications,hit=MEMO.get(g);
  if(hit&&hit.key===key&&hit.meds===meds&&hit.n===meds.length)return hit.value;
  const value=computeEffects(g);MEMO.set(g,{key,meds,n:meds.length,value});return value;
}
function computeEffects(g){
  const out=[],t=g.elapsed,ids=[...new Set(g.medications.map(d=>d.id))],shock=shockFactor(g);
  for(const id of ids){
    const def=itemById(id);if(!def)continue;
    const profile=profileOf(id);
    if(!profile){
      const w=windowEffect(g,id,def,t),values={};
      for(const name of CHANNELS)values[name]=w.amount?(CAPPED.has(name)?Math.min(1,w.amount):LEGACY[name](def)*w.amount):0;
      values.relief=w.amount?Math.min(1,w.amount):0;
      out.push({id,def,level:w.amount,values,fraction:w.amount?1:0,active:w.amount>0,pending:w.pending,phase:w.amount?'szczyt':w.pending?'narasta':'słabnie',legacy:true});
      continue;
    }
    const raw=levelAt(g,id,t,profile),ce=raw*shock,values={};
    for(const name of CHANNELS)values[name]=0;
    for(const c of profile.channels)values[c.name]=channelValue(c,ce);
    const next=levelAt(g,id,t+600,profile),fraction=fractionOf(profile.primary,ce);
    const phase=next>raw*1.03?'narasta':next<raw*.97?'słabnie':'szczyt';
    const active=fraction>PK_TUNING.activeFrac,pending=!active&&phase==='narasta';
    out.push({id,def,level:ce,values,fraction,active,pending,phase,legacy:false,profile});
  }
  return out;
}
// Drug definitions with their current channel values in the legacy item fields (selectors.activeDrugDefinitions).
// Drugs below 2% of their first channel no longer contribute.
export function drugDefinitions(g){
  return drugEffects(g).filter(e=>e.active||e.fraction>.02).map(({def,values,fraction})=>({...def,
    painRelief:values.analgesia,reliefStrength:values.relief,respiratoryRelief:values.antagonism,pulseIncrease:values.hr,
    circulationSupport:values.volume,oxygenSupport:values.oxygen,bleedingMultiplier:Math.max(0,1-values.bleeding),
    burden:values.respDepression,sedation:values.sedation,glucoseRise:values.glucose,fraction}));
}
// Qualitative status for the UI: first-channel fraction relative to one porcja at its peak (≥ 1 = at or above one porcja).
export function drugStatus(g){
  return drugEffects(g).filter(e=>e.active||e.pending).map(e=>{
    const one=e.legacy?1:fractionOf(e.profile.primary,1);
    return {id:e.id,name:e.def.name,phase:e.phase,active:e.active,pending:e.pending,strength:e.legacy?e.fraction:e.fraction/one};
  });
}
export const PHASE_LABEL={narasta:'działanie narasta',szczyt:'szczyt działania',słabnie:'działanie słabnie'};
// Qualitative card text derived from the profile (no seconds or doses): onset speed and length of action.
export function drugProfileText(id){
  const p=profileOf(id),def=itemById(id);
  if(!p)return {onset:def?.onset!==undefined?`${def.onset} s`:'—',length:def?.duration!==undefined?`${Math.round(def.duration/60)} min`:'—'};
  const onset=p.peakS<600?'szybkie':p.peakS<1800?'stopniowe':'powolne';
  const half=PHARMACOLOGY[id].half,length=PHARMACOLOGY[id].ke0HalfS>=7200?'po wielu godzinach':['veryShort','short'].includes(half)?'krótkie':half==='medium'?'średnie':'długie';
  return {onset,length};
}
// Called once per tick: onset/offset log lines and a single warning when stacked doses become excessive.
export function stepPharmacology(g){
  const p=g.phys,was=p.drugActive||(p.drugActive={});
  if(!g.medications.length)return;
  let burden=0,sedation=0;
  for(const e of drugEffects(g)){
    if(e.active&&!was[e.id]){was[e.id]=1;g.log.push({time:g.elapsed,text:`Lek zaczyna działać: ${e.def.name}.`});}
    else if(!e.active&&was[e.id]){delete was[e.id];g.log.push({time:g.elapsed,text:`Kończy się działanie leku: ${e.def.name}.`});}
    burden+=e.values.respDepression;sedation+=e.values.sedation;
  }
  const excess=burden>=PK_TUNING.excessBurden||sedation>=PK_TUNING.excessSedation;
  if(excess&&!p.drugExcess){p.drugExcess=1;g.log.push({time:g.elapsed,text:'Nadmierne działanie leków: pacjent jest senny, oddech zwalnia. Kolejne porcje kumulują się — oceń oddech i drożność.'});}
  else if(!excess&&p.drugExcess&&burden<PK_TUNING.excessBurden*.7&&sedation<PK_TUNING.excessSedation*.7)p.drugExcess=0;
}
// Dose record validation and the P1/P2 → P3 conversion ({start, end, delivery} → {at, amount}); `legacyOnset` is the
// onset the item had before P3 (start = given + onset).
const LEGACY_ONSET={paracetamol:90,morphine:30,txa:60,salbutamol:45,ketamine:25,fentanyl:15,adrenaline:20,glucoseGel:35,naloxone:20,ondansetron:35,ipratropium:75,hydrocortisone:180,ibuprofen:120,chlorphenamine:150,lidocaineSpray:40,metamizole:100};
export function migrateDose(m){
  if(!m||typeof m!=='object')return false;
  if(m.at===undefined&&Number.isFinite(m.start)){
    if(!Number.isFinite(m.end)||(m.burden!==undefined&&(!Number.isFinite(m.burden)||m.burden<0))||(m.delivery!==undefined&&!(Number.isFinite(m.delivery)&&m.delivery>=0&&m.delivery<=1)))return false;
    const def=itemById(m.id);
    m.at=Math.max(0,m.start-(LEGACY_ONSET[m.id]??def?.onset??0));m.amount=m.delivery??1;m.route=def?.route??null;
    delete m.start;delete m.end;delete m.delivery;delete m.burden;
  }
  return Boolean(itemById(m.id))&&Number.isFinite(m.at)&&m.at>=0&&Number.isFinite(m.amount)&&m.amount>=0&&m.amount<=1&&(m.site===undefined||m.site===null||typeof m.site==='string');
}
export function validatePharmacology(){
  for(const id of Object.keys(PHARMACOLOGY))if(!MEDICINES.some(m=>m.id===id))throw new Error(`Pharmacology for unknown medicine: ${id}`);
  for(const m of MEDICINES){
    const pk=PHARMACOLOGY[m.id];
    if(!pk)throw new Error(`Missing pharmacology: ${m.id}`);
    if(!PK_ROUTES[m.route]||!HALF_LIFE_MIN[pk.half]||!(pk.ke0HalfS>0)||!Object.keys(pk.channels).length)throw new Error(`Invalid pharmacology: ${m.id}`);
    for(const [name,c] of Object.entries(pk.channels))if(!CHANNELS.includes(name)||!(c.linear?Number.isFinite(c.emax):c.ec50>0&&c.n>0))throw new Error(`Invalid channel ${name}: ${m.id}`);
    PROFILES.delete(m.id);
    const p=profileOf(m.id);if(!(p.norm>0&&Number.isFinite(p.norm)))throw new Error(`Degenerate kinetics: ${m.id}`);
  }
}
