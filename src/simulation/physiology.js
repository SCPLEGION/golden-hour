import { supportDefinitions, woundModifiers, bounded } from './modifiers.js';
import { sampleMonitor } from './monitor.js';
import { INJURIES } from '../content/injuries.js';
import { itemById } from '../content/items.js';
import { circulation, activeDrugDefinitions, respiratoryBurden, activeModifiers } from './selectors.js';
import { applyInsult, bloodMirror, settleCirculation } from './physio-model.js';
import { stepCirculation, arrestDue } from './physio-circulation.js';
import { TUNING, CV_TUNING } from '../content/physiology-data.js';
import { checkProtocol } from './protocol.js';
export function tick(g) {
  g.elapsed++;
  // Circulation in mL (physio-circulation.js); `leak` = nominal bleeding as EBV fraction per minute.
  const leak=stepCirculation(g);
  const environment=g.injuries.some(i=>INJURIES[i.type].tags.includes('heat'))?.001:g.injuries.some(i=>INJURIES[i.type].tags.includes('cold'))?-.0006:0;
  g.temperature=bounded(g.temperature+environment-(g.warm?.00003:.00065)+bounded(activeModifiers(g).reduce((n,d)=>n+(d.temperatureSupport||0),0),-.005,.005),32,40.5);
  let oxygenLoss=0;
  for(const i of g.injuries) {
    const d=INJURIES[i.type];
    if(d.tags.includes('airway') && g.airway) continue;
    const sealed=d.tags.includes('chest')&&(i.treatments??g.body[i.part].treatments).seal!==undefined;
    if(sealed&&(i.sealQuality??1)>=1) continue;
    const relief=Math.max(0,...activeDrugDefinitions(g).filter(drug=>d.tags.includes(drug.relievesTag)).map(drug=>drug.reliefStrength));
    oxygenLoss+=(d.oxygenLoss||0)*(1-relief)*woundModifiers(i).oxygenMultiplier*(sealed?1-i.sealQuality:1);
  }
  const ventilating=g.ventilatingUntil>=g.elapsed || g.resuscitating;
  const oxygenOn=g.oxygenUntil>=g.elapsed;
  const recovery=ventilating?.28:oxygenLoss===0?.065:0;
  g.oxygen=Math.max(0,Math.min(99,g.oxygen+recovery+(oxygenOn?.035:0)+bounded(activeModifiers(g).reduce((n,d)=>n+(d.oxygenSupport||0),0),0,.06)-oxygenLoss-(ventilating?0:respiratoryBurden(g)*.045)));
  if(g.oxygen<60) applyInsult(g,{kind:'plasma',pts:TUNING.hypoxicStrainPts});
  // Drug respiratory burden wears off, rather than persisting after its effect.
  g.respiratoryDepression=Math.max(0,g.respiratoryDepression-.0008);
  if(g.oxygenUntil===g.elapsed) g.log.push({time:g.elapsed,text:'Butla tlenowa jest pusta. Dopływ tlenu ustał.'});
  for(const m of g.medications) {
    if(m.start===g.elapsed) g.log.push({time:g.elapsed,text:`Lek zaczyna działać: ${itemById(m.id).name}.`});
    if(m.end===g.elapsed) g.log.push({time:g.elapsed,text:`Kończy się działanie leku: ${itemById(m.id).name}.`});
  }
  for(const part of Object.values(g.body)) if(part.treatments.tourniquet!==undefined && g.elapsed-part.treatments.tourniquet===900) g.log.push({time:g.elapsed,text:'Staza jest założona od 15 minut. Oceń ukrwienie i czucie kończyny.'});
  // Arrest: cardiac reserve exhausted, MAP < 35 for 20 s, or the legacy hypoxia floor (phase 2 replaces it).
  if(!g.arrest && (arrestDue(g) || g.oxygen<=38)) {
    g.arrest={since:g.elapsed,budget:180};
    g.log.push({time:g.elapsed,text:'Pacjent przestaje reagować i prawidłowo oddychać. Pilnie oceń oznaki krążenia.'});
  }
  if(g.arrest) {
    // CPR quality (benefit .4..1) scales how much of the arrest budget each second preserves.
    g.arrest.budget-=g.resuscitating?1-.75*(g.cprBenefit??1):1;
    if(g.resuscitating && circulation(g)>27 && g.oxygen>65 && leak<TUNING.roscLeakFracMin) {
      g.arrest=null;settleCirculation(g);g.phys.reserve=Math.max(g.phys.reserve,CV_TUNING.roscReserve);
      g.log.push({time:g.elapsed,text:'Powrót oznak krążenia po RKO. Nadal potrzebna jest dalsza opieka.'});
    } else if(g.arrest.budget<=0) {
      g.status='lost'; g.log.push({time:g.elapsed,text:'Nie udało się przywrócić krążenia. Poszkodowany zmarł.'});
    }
  }
  for(const support of g.supports||[])if(support.until===g.elapsed)g.log.push({time:g.elapsed,text:`Kończy się wsparcie: ${itemById(support.id)?.name||support.id}.`});
  if(g.protocol)checkProtocol(g);
  if(g.status==='active' && g.transportAt!==null && g.elapsed>=g.transportAt && !g.arrest) {
    g.status='saved';g.log.push({time:g.elapsed,text:'Zespół dociera na miejsce. Przekazujesz żywego pacjenta do dalszej opieki.'});
  }
  g.blood=bloodMirror(g);
  sampleMonitor(g);
}
