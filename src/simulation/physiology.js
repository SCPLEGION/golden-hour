import { bounded } from './modifiers.js';
import { sampleMonitor } from './monitor.js';
import { INJURIES } from '../content/injuries.js';
import { itemById } from '../content/items.js';
import { circulation } from './selectors.js';
import { stepThermal, stepBurns, hypothermicVF } from './physio-thermal.js';
import { stepHemostasis } from './physio-hemostasis.js';
import { stepSensors } from './physio-sensors.js';
import { stepPharmacology } from './physio-pharmacology.js';
import { stepNeuro } from './physio-neuro.js';
import { respire, hypoxicArrestDue } from './physio-respiration.js';
import { applyInsult, settleCirculation } from './physio-model.js';
import { stepCirculation, arrestDue } from './physio-circulation.js';
import { TUNING, CV_TUNING, THERMAL } from '../content/physiology-data.js';
import { checkProtocol } from './protocol.js';
import { stepComplications } from './complications.js';
// Rhythm at the onset of an arrest: deep hypothermia or an electrical injury → VF (shockable); hypoxia → asystole;
// otherwise (hypovolaemia, exhausted reserve) → PEA. Neither of the last two is shockable.
export function arrestRhythm(g){
  if(g.temperature<THERMAL.vfC||g.injuries.some(i=>i.type==='electricalBurn'))return 'vf';
  return hypoxicArrestDue(g)||g.phys.sao2<.6?'asystole':'pea';
}
export const roscPossible=(g,leak=0)=>circulation(g)>27&&g.phys.sao2>.65&&leak<TUNING.roscLeakFracMin;
export function endArrest(g){g.arrest=null;settleCirculation(g);g.phys.reserve=Math.max(g.phys.reserve,CV_TUNING.roscReserve);}
export function tick(g) {
  g.elapsed++;
  // Circulation in mL (physio-circulation.js); `leak` = nominal bleeding as EBV fraction per minute.
  stepBurns(g);
  const leak=stepCirculation(g);
  // Heat balance against the scenario environment (physio-thermal.js); drugs, glucose and recovering deficits.
  stepThermal(g);
  stepPharmacology(g);
  stepNeuro(g);
  // Oxygenation and ventilation (physio-respiration.js); then lactate, pH and coagulation (physio-hemostasis.js).
  respire(g);
  stepHemostasis(g);
  if(g.phys.sao2<.6) applyInsult(g,{kind:'plasma',pts:TUNING.hypoxicStrainPts});
  if(g.oxygenUntil===g.elapsed) g.log.push({time:g.elapsed,text:'Butla tlenowa jest pusta. Dopływ tlenu ustał.'});
  for(const part of Object.values(g.body)) if(part.treatments.tourniquet!==undefined && g.elapsed-part.treatments.tourniquet===900) g.log.push({time:g.elapsed,text:'Staza jest założona od 15 minut. Oceń ukrwienie i czucie kończyny.'});
  // Arrest: cardiac reserve exhausted, MAP < 35 for 20 s, SpO2 < 50 for 30 s, or core temperature < 28 °C (VF).
  if(!g.arrest && (arrestDue(g) || hypoxicArrestDue(g) || hypothermicVF(g))) {
    g.arrest={since:g.elapsed,budget:180,rhythm:arrestRhythm(g)};
    g.log.push({time:g.elapsed,text:'Pacjent przestaje reagować i prawidłowo oddychać. Pilnie oceń oznaki krążenia.'});
  }
  if(g.arrest) {
    // CPR quality (benefit .4..1) scales how much of the arrest budget each second preserves.
    g.arrest.budget-=g.resuscitating?1-.75*(g.cprBenefit??1):1;
    // CPR alone restores a non-shockable rhythm once the causes are reversed; VF needs the AED (effects.js).
    if(g.arrest.rhythm!=='vf' && g.resuscitating && roscPossible(g,leak)) {
      endArrest(g);
      g.log.push({time:g.elapsed,text:'Powrót oznak krążenia po RKO. Nadal potrzebna jest dalsza opieka.'});
    } else if(g.arrest.budget<=0) {
      g.status='lost'; g.log.push({time:g.elapsed,text:'Nie udało się przywrócić krążenia. Poszkodowany zmarł.'});
    }
  }
  for(const support of g.supports||[])if(support.until===g.elapsed)g.log.push({time:g.elapsed,text:`Kończy się wsparcie: ${itemById(support.id)?.name||support.id}.`});
  if(g.protocol)checkProtocol(g);
  // Seeded in-run complications (complications.js): resolution checks and the next scheduled draw.
  stepComplications(g);
  if(g.status==='active' && g.transportAt!==null && g.elapsed>=g.transportAt && !g.arrest) {
    g.status='saved';g.log.push({time:g.elapsed,text:'Zespół dociera na miejsce. Przekazujesz żywego pacjenta do dalszej opieki.'});
  }
  stepSensors(g);
  sampleMonitor(g);
}
