import { difficultyById } from '../content/difficulty.js';
import { INJURIES } from '../content/injuries.js';
import { BODY_PARTS, bodyPart, resolvePart, splintReach } from '../content/body.js';
import { tourniquetOver, tourniquetQuality } from './vascular.js';
import { supportDefinitions, woundModifiers, bounded } from './modifiers.js';
import { itemById } from '../content/items.js';
import { TOURNIQUET_PROCEDURE } from '../content/procedures.js';
import { injuryPhysiology } from '../content/injury-physiology.js';
import { clinicalSnapshot, scaleOf, noise } from './physio-model.js';
import { drugDefinitions, drugEffects } from './physio-pharmacology.js';
import { clotFactor, coagBleedFactor } from './physio-hemostasis.js';
import { spo2Signal } from './physio-sensors.js';
import { TUNING } from '../content/physiology-data.js';
// Amputation injuries remove their segment and every more distal segment of the same limb.
// Per-state memo for hot per-tick selectors; the key lists everything that may change in place.
export function memoized(store,g,key,compute){const hit=store.get(g);if(hit&&hit.key.length===key.length&&hit.key.every((v,i)=>v===key[i]))return hit.value;const value=compute();store.set(g,{key,value});return value;}
const MISSING=new WeakMap(),DRUGS=new WeakMap(),SPLINTS=new WeakMap(),PAIN=new WeakMap();
// Treatments change only inside act() (before `actions` increments), so elapsed+actions keys them.
const structureKey=g=>[g.actions,g.injuries?.length,g.injuries];
const stateKey=g=>[g.elapsed,g.actions,g.injuries.length,g.medications.length,(g.supports||[]).length,g.protocol?.pain,g.status];
export function missingSegments(g){return memoized(MISSING,g,structureKey(g),()=>computeMissing(g));}
function computeMissing(g){
  const out=new Set();
  for(const i of g.injuries||[])if(INJURIES[i.type]?.tags.includes('amputation')){const p=bodyPart(i.part);if(p?.limb)for(const s of BODY_PARTS)if(s.group===p.group&&s.order>=p.order)out.add(s.id);}
  return [...out];
}
export const isMissing=(g,id)=>missingSegments(g).includes(resolvePart(id));
// Perfusion index 0..100 derived from effective volume (legacy circulation scale; see physio-model.js).
export const circulation=g=>clinicalSnapshot(g).perfusion;
// Doses (physio-pharmacology.js) of drugs whose first channel is above 10% of its Emax.
export const activeMedicines = g => {const on=new Set(drugEffects(g).filter(e=>e.active).map(e=>e.id));return g.medications.filter(m=>on.has(m.id));};
// Drug definitions carrying their current channel values in the item fields (painRelief, reliefStrength, burden, …).
export const activeDrugDefinitions = g => memoized(DRUGS,g,[g.elapsed,g.medications.length,g.medications],()=>drugDefinitions(g));
export const activeModifiers=g=>[...activeDrugDefinitions(g),...supportDefinitions(g)];
// Respiratory burden of the drugs (central depression input of physio-respiration): each drug's depression channel,
// reduced by the antagonism of a drug whose `respiratoryReliefTag` matches its tags (naloxone → opioids).
export function respiratoryBurden(g){
  const defs=activeDrugDefinitions(g),reliefs=[...defs,...supportDefinitions(g)].filter(d=>d.respiratoryRelief);
  return defs.reduce((n,d)=>{
    if(!d.burden)return n;
    const tags=d.drugTags||[],relief=bounded(reliefs.filter(r=>!r.respiratoryReliefTag||tags.includes(r.respiratoryReliefTag)).reduce((sum,r)=>sum+r.respiratoryRelief,0),0,1);
    return n+d.burden*(1-relief);
  },0);
}
export const isConscious = g => clinicalSnapshot(g).conscious;
// GCS gates: oral routes need GCS ≥ 14, an oropharyngeal airway is tolerated at GCS ≤ 8.
export const canSwallow = g => clinicalSnapshot(g).canSwallow;
export const toleratesOPA = g => clinicalSnapshot(g).toleratesOPA;
// Nominal bleeding of one injury in mL/min at MAP 90 (pressure dependence is applied per tick).
export function injuryBleeding(g, injury) {
  const def = INJURIES[injury.type], part = g.body[injury.part], phys = injuryPhysiology(injury.type);
  const treatments=injury.treatments??part.treatments, base=(phys?.rate||0)*scaleOf(g);
  if (phys?.capMl && (g.phys.injuryMl[injury.id]||0) >= phys.capMl*scaleOf(g)) return 0;
  if (!def.tags.includes('external')) return base*woundModifiers(injury).bleedingMultiplier;
  const occlusion = tourniquetQuality(g, injury.part);
  if (occlusion >= 1) return 0;
  let rate = base * (1 - (occlusion ?? 0));
  // A stump bleeds past local care: packing caps at 50%, a dressing barely helps.
  if (def.tags.includes('amputation')) {
    if (treatments.hemostatic !== undefined) rate *= 1 - .5 * (injury.packQuality ?? 1);
    else if (treatments.dressing !== undefined) rate *= .85;
  } else if (def.tags.includes('wound')) {
    if (treatments.hemostatic !== undefined) rate *= .05 + (1 - (injury.packQuality ?? 1)) * .45;
    else if (treatments.dressing !== undefined) rate *= def.tags.includes('massive') ? .55 : .18;
  }
  if (def.tags.includes('chest') && treatments.seal !== undefined) rate *= 1 - .9 * (injury.sealQuality ?? 1);
  return rate*woundModifiers(injury).bleedingMultiplier;
}
// Total nominal bleeding in mL/min (difficulty and drugs included).
export function bleedingRate(g) { return g.injuries.reduce((sum,i)=>sum+injuryBleeding(g,i),0) * difficultyById(g.difficulty).bleedMultiplier * TUNING.bleedScale * activeDrugDefinitions(g).reduce((n,d)=>n*(d.bleedingMultiplier??1),1); }
// Present bleeding of one wound in mL/min at MAP 90: treatment × coagulopathy × a holding clot (P4).
export const woundBleeding=(g,injury)=>injuryBleeding(g,injury)*coagBleedFactor(g)*clotFactor(g,injury);
// A splint immobilises its own segment and the adjacent ones of the same limb.
export const splinted=(g,id)=>{const map=memoized(SPLINTS,g,structureKey(g),()=>new Map());if(!map.has(id))map.set(id,computeSplinted(g,id));return map.get(id);};
const computeSplinted=(g,id)=>{const p=bodyPart(id),missing=missingSegments(g);return Boolean(p?.limb&&BODY_PARTS.some(s=>splintReach(s.id,p.id)&&!missing.includes(s.id)&&g.body[s.id]?.treatments.splint!==undefined));};
export const pain=g=>memoized(PAIN,g,stateKey(g),()=>computePain(g));
function computePain(g) {
  let result = 0;
  const drugs=activeDrugDefinitions(g),supports=supportDefinitions(g);
  for (const i of g.injuries) {
    const d=INJURIES[i.type];
    const relief=Math.max(0,...drugs.filter(drug=>d.tags.includes(drug.relievesTag)).map(drug=>drug.reliefStrength));
    result = Math.max(result,d.pain*(1-relief*.75)-woundModifiers(i).painRelief-supports.filter(s=>s.target===i.part||!s.target).reduce((n,s)=>n+(s.painRelief||0),0) - (d.tags.includes('fracture') && splinted(g,i.part) ? 4 : 0));
  }
  // An over-tightened tourniquet adds its own pressure pain while it stays on.
  result += TOURNIQUET_PROCEDURE.strainPain * Math.max(0, ...Object.values(g.body).filter(p => p.treatments.tourniquet !== undefined).map(p => p.tourniquetStrain || 0));
  const relief=activeDrugDefinitions(g).reduce((n,d)=>n+d.painRelief,0);
  return Math.round(Math.max(0,result-relief+(g.protocol?.pain||0))*10)/10;
}
export function condition(g) {
  if(g.status==='lost') return 'Brak oznak życia';
  if(g.arrest) return 'Brak reakcji, brak prawidłowego oddechu';
  if(!isConscious(g)) return 'Nieprzytomny';
  const s=clinicalSnapshot(g);
  if(s.perfusion<40 || s.spo2<75) return 'Skrajnie osłabiony, trudny kontakt';
  if(s.perfusion<65 || s.spo2<88) return 'Blady, wyraźnie osłabiony';
  return 'Reaguje na głos';
}
// Monitor reading: HR/RR/GCS from g.phys via the snapshot, deterministic waves and hashed noise. BP is the last NIBP cuff
// reading (physio-sensors.js, every 180 s or on demand). SpO2 averaged (τ 6 s); without a signal `spo2` is '—' with
// `spo2Note` "brak sygnału" while `oxygen` keeps the last valid number (trend history stays finite).
export function vitals(g) {
  const s=clinicalSnapshot(g),c=s.perfusion,t=g.elapsed,dead=g.arrest||g.status==='lost';
  const respiratoryWave=Math.sin(t*1.27),slowWave=Math.sin(t*.24+1.1);
  const variability=1+(100-c)/100;
  const pulse=dead?0:Math.round(s.hr+respiratoryWave*1.7*variability+slowWave*1.3+noise(g,1));
  const cuff=g.phys.nibp??{at:t,sys:Math.round(s.sbp),dia:Math.round(s.dbp),map:Math.round(s.map)};
  const systolic=dead?0:cuff.sys,diastolic=dead?0:cuff.dia,signal=spo2Signal(g);
  const oxygen=Math.round(bounded((signal?g.phys.spo2Shown+respiratoryWave*.25:g.phys.spo2Last??g.phys.spo2Shown),0,100)*10)/10;
  return {time:t,pulse,pressure:dead||!systolic?'—':`${systolic}/${diastolic}`,systolic,diastolic,map:dead?0:cuff.map,pressureAt:cuff.at,oxygen,spo2:signal?oxygen:'—',spo2Note:signal?'%':'brak sygnału',breathing:dead?0:Math.round(Math.max(3,s.rr+slowWave*.8)*10)/10,gcs:s.gcs,avpu:s.avpu,etco2:Math.round(s.etco2),temperature:s.tempC.toFixed(1),pain:isConscious(g)?`${pain(g)}/10`:'Brak kontaktu',glucose:s.glucose,rhythm:g.status==='lost'?'Asystolia':g.arrest?RHYTHM_LABEL[g.arrest.rhythm]||'Asystolia':'Rytm zatokowy'};
}
export const RHYTHM_LABEL={vf:'Migotanie komór',pea:'PEA — bez tętna',asystole:'Asystolia'};
// Thresholds as EBV fraction per minute (legacy .02 / .002 points per second).
const bleedingLabel=f=>f>.006?'Krwawi':f>.0006?'Niewielkie sączenie':'Krwawienie zabezpieczone';
export function visibleInjuries(g,partId) { return g.injuries.filter(i=>i.part===partId && (INJURIES[i.type].visible || g.body[partId].examinedAt!==null)); }
export function bodyObservation(g,partId) {
  const injuries=visibleInjuries(g,partId), part=g.body[partId];
  return injuries.map(i=>({name:INJURIES[i.type].name, text:(part.examinedAt!==null?INJURIES[i.type].finding:INJURIES[i.type].visible)+(activeDrugDefinitions(g).some(drug=>INJURIES[i.type].tags.includes(drug.relievesTag))?' Objawy są łagodzone przez aktywny lek.':''), bleeding:INJURIES[i.type].tags.includes('external') && injuryPhysiology(i.type)?.rate>0 ? bleedingLabel(woundBleeding(g,i)/g.profile.ebvMl):null}));
}
export function examination(g,partId) {
  const injuries=g.injuries.filter(i=>i.part===partId);
  const descriptions=injuries.map(i=>INJURIES[i.type].finding);
  if(!descriptions.length) descriptions.push('Nie stwierdzono urazów tej okolicy.');
  if(bodyPart(partId).limb) {
    const stasis=tourniquetOver(g,partId,.5);
    descriptions.push(stasis!==undefined?(g.elapsed-stasis>=600?'Kończyna pod stazą jest chłodna, czucie osłabione, brak tętna obwodowego.':'Obwodowo brak wyczuwalnego tętna pod stazą.'):circulation(g)<55?'Tętno obwodowe słabe; skóra chłodna.':injuries.some(i=>INJURIES[i.type].sensoryLoss)?'Tętno obwodowe wyczuwalne; czucie przy urazie osłabione.':'Tętno obwodowe wyczuwalne. Czucie zachowane.');
  }
  return `${bodyPart(partId).name}: ${descriptions.join(' ')}`;
}
