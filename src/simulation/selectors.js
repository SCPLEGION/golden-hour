import { difficultyById } from '../content/difficulty.js';
import { INJURIES } from '../content/injuries.js';
import { BODY_PARTS, bodyPart } from '../content/body.js';
import { tourniquetOver } from './vascular.js';
import { supportDefinitions, woundModifiers, bounded } from './modifiers.js';
import { itemById } from '../content/items.js';
export const circulation=g=>bounded(g.blood+g.fluidSupport+Math.min(12,activeModifiers(g).reduce((n,d)=>n+(d.circulationSupport||0),0)),0,100);
export const activeMedicines = g => g.medications.filter(m => m.start <= g.elapsed && m.end > g.elapsed);
export const activeDrugDefinitions = g => [...new Set(activeMedicines(g).map(m=>m.id))].map(id=>{
  const def=itemById(id),delivery=Math.max(...activeMedicines(g).filter(m=>m.id===id).map(m=>m.delivery??1));
  return {...def,circulationSupport:(def.circulationSupport||0)*delivery,oxygenSupport:(def.oxygenSupport||0)*delivery,temperatureSupport:(def.temperatureSupport||0)*delivery,glucoseSupport:(def.glucoseSupport||0)*delivery,respiratoryRelief:(def.respiratoryRelief||0)*delivery,painRelief:(def.painRelief||0)*delivery,pulseIncrease:(def.pulseIncrease||0)*delivery,bleedingMultiplier:1-(1-(def.bleedingMultiplier??1))*delivery,reliefStrength:delivery};
});
export const activeModifiers=g=>[...activeDrugDefinitions(g),...supportDefinitions(g)];
export function respiratoryBurden(g){
  const reliefs=activeModifiers(g).filter(d=>d.respiratoryRelief);
  const opioidRelief=bounded(reliefs.filter(d=>!d.respiratoryReliefTag||d.respiratoryReliefTag==='opioid').reduce((n,d)=>n+d.respiratoryRelief,0),0,1);
  return g.respiratoryDepression*(1-opioidRelief)+activeMedicines(g).reduce((n,m)=>{
    const tags=itemById(m.id)?.drugTags||[];
    const relief=bounded(reliefs.filter(d=>!d.respiratoryReliefTag||tags.includes(d.respiratoryReliefTag)).reduce((sum,d)=>sum+d.respiratoryRelief,0),0,1);
    return n+(m.burden||0)*(1-relief);
  },0);
}
export const isConscious = g => !g.arrest && g.oxygen > 65 && circulation(g) > 35 && !(g.initialUnconscious && !g.airway);
export function injuryBleeding(g, injury) {
  const def = INJURIES[injury.type], part = g.body[injury.part];
  const treatments=injury.treatments??part.treatments;
  if (!def.tags.includes('external')) return def.bleed*woundModifiers(injury).bleedingMultiplier;
  if (tourniquetOver(g, injury.part) !== undefined) return 0;
  let rate = def.bleed;
  if (def.tags.includes('wound')) {
    if (treatments.hemostatic !== undefined) rate *= .05;
    else if (treatments.dressing !== undefined) rate *= def.tags.includes('massive') ? .55 : .18;
  }
  if (def.tags.includes('chest') && treatments.seal !== undefined) rate *= .1;
  return rate*woundModifiers(injury).bleedingMultiplier;
}
export function bleedingRate(g) { return g.injuries.reduce((sum,i)=>sum+injuryBleeding(g,i),0) * difficultyById(g.difficulty).bleedMultiplier * activeDrugDefinitions(g).reduce((n,d)=>n*(d.bleedingMultiplier??1),1); }
// A splint immobilises its own segment and the adjacent ones of the same limb.
export const splinted=(g,id)=>{const p=bodyPart(id);return Boolean(p?.limb&&BODY_PARTS.some(s=>s.group===p.group&&Math.abs(s.order-p.order)<=1&&g.body[s.id]?.treatments.splint!==undefined));};
export function pain(g) {
  let result = 0;
  for (const i of g.injuries) {
    const d=INJURIES[i.type];
    const relief=Math.max(0,...activeDrugDefinitions(g).filter(drug=>d.tags.includes(drug.relievesTag)).map(drug=>drug.reliefStrength));
    result = Math.max(result,d.pain*(1-relief*.75)-woundModifiers(i).painRelief-supportDefinitions(g).filter(s=>s.target===i.part||!s.target).reduce((n,s)=>n+(s.painRelief||0),0) - (d.tags.includes('fracture') && splinted(g,i.part) ? 4 : 0));
  }
  const relief=activeDrugDefinitions(g).reduce((n,d)=>n+d.painRelief,0);
  return Math.round(Math.max(0,result-relief)*10)/10;
}
export function condition(g) {
  if(g.status==='lost') return 'Brak oznak życia';
  if(g.arrest) return 'Brak reakcji, brak prawidłowego oddechu';
  if(!isConscious(g)) return 'Nieprzytomny';
  if(circulation(g)<40 || g.oxygen<75) return 'Skrajnie osłabiony, trudny kontakt';
  if(circulation(g)<65 || g.oxygen<88) return 'Blady, wyraźnie osłabiony';
  return 'Reaguje na głos';
}
export function vitals(g) {
  const c=circulation(g),t=g.elapsed,dead=g.arrest||g.status==='lost';
  const respiratoryWave=Math.sin(t*1.27),slowWave=Math.sin(t*.24+1.1);
  const variability=1+(100-c)/100;
  const pulse=dead?0:Math.round(75+(100-c)*1.1+pain(g)*2+activeDrugDefinitions(g).reduce((n,d)=>n+(d.pulseIncrease||0),0)+respiratoryWave*1.7*variability+slowWave*1.3);
  const systolic=dead?0:Math.round(58+c*.65+respiratoryWave*2+slowWave);
  const diastolic=dead?0:Math.round(30+c*.48+slowWave*1.4);
  const lowGlucose=g.injuries.some(i=>i.type&&INJURIES[i.type].tags.includes('glucoseLow'));
  const glucose=bounded((lowGlucose?42:96)+activeModifiers(g).reduce((n,d)=>n+(d.glucoseSupport||0),0),15,180);
  return {time:t,pulse,pressure:dead?'—':`${systolic}/${diastolic}`,systolic,diastolic,oxygen:Math.round(bounded(g.oxygen+(dead?0:respiratoryWave*.25),0,100)*10)/10,breathing:dead?0:Math.round(Math.max(4,16+(100-g.oxygen)*.32-respiratoryBurden(g)*3+slowWave*.8)*10)/10,temperature:g.temperature.toFixed(1),pain:isConscious(g)?`${pain(g)}/10`:'Brak kontaktu',glucose:Math.round(glucose),rhythm:dead?'Asystolia':'Rytm zatokowy'};
}
export function visibleInjuries(g,partId) { return g.injuries.filter(i=>i.part===partId && (INJURIES[i.type].visible || g.body[partId].examinedAt!==null)); }
export function bodyObservation(g,partId) {
  const injuries=visibleInjuries(g,partId), part=g.body[partId];
  return injuries.map(i=>({name:INJURIES[i.type].name, text:(part.examinedAt!==null?INJURIES[i.type].finding:INJURIES[i.type].visible)+(activeDrugDefinitions(g).some(drug=>INJURIES[i.type].tags.includes(drug.relievesTag))?' Objawy są łagodzone przez aktywny lek.':''), bleeding:INJURIES[i.type].tags.includes('external') && INJURIES[i.type].bleed>0 ? (injuryBleeding(g,i)>.02?'Krwawi':injuryBleeding(g,i)>.002?'Niewielkie sączenie':'Krwawienie zabezpieczone'):null}));
}
export function examination(g,partId) {
  const injuries=g.injuries.filter(i=>i.part===partId);
  const descriptions=injuries.map(i=>INJURIES[i.type].finding);
  if(!descriptions.length) descriptions.push('Nie stwierdzono urazów tej okolicy.');
  if(bodyPart(partId).limb) {
    const stasis=tourniquetOver(g,partId);
    descriptions.push(stasis!==undefined?(g.elapsed-stasis>=600?'Kończyna pod stazą jest chłodna, czucie osłabione, brak tętna obwodowego.':'Obwodowo brak wyczuwalnego tętna pod stazą.'):circulation(g)<55?'Tętno obwodowe słabe; skóra chłodna.':injuries.some(i=>INJURIES[i.type].sensoryLoss)?'Tętno obwodowe wyczuwalne; czucie przy urazie osłabione.':'Tętno obwodowe wyczuwalne. Czucie zachowane.');
  }
  return `${bodyPart(partId).name}: ${descriptions.join(' ')}`;
}
