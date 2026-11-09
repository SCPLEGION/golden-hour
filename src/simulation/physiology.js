import { supportDefinitions, woundModifiers, bounded } from './modifiers.js';
import { sampleMonitor } from './monitor.js';
import { INJURIES } from '../content/injuries.js';
import { itemById } from '../content/items.js';
import { bleedingRate, circulation, activeDrugDefinitions, respiratoryBurden, activeModifiers } from './selectors.js';
import { hasFlow, flowEfficiency } from './vascular.js';
export function tick(g) {
  g.elapsed++;
  const loss=bleedingRate(g);
  g.blood=Math.max(0,g.blood-loss);
  for(const infusion of g.infusions) if(infusion.end>g.elapsed && hasFlow(g,infusion.site)) g.fluidSupport=Math.min(18,g.fluidSupport+.06*flowEfficiency(g,infusion.site));
  g.fluidSupport=Math.max(0,g.fluidSupport-.003);
  const environment=g.injuries.some(i=>INJURIES[i.type].tags.includes('heat'))?.001:g.injuries.some(i=>INJURIES[i.type].tags.includes('cold'))?-.0006:0;
  g.temperature=bounded(g.temperature+environment-(g.warm?.00003:.00065)+bounded(activeModifiers(g).reduce((n,d)=>n+(d.temperatureSupport||0),0),-.005,.005),32,40.5);
  let oxygenLoss=0;
  for(const i of g.injuries) {
    const d=INJURIES[i.type];
    if(d.tags.includes('airway') && g.airway) continue;
    if(d.tags.includes('chest') && (i.treatments??g.body[i.part].treatments).seal!==undefined) continue;
    const relief=Math.max(0,...activeDrugDefinitions(g).filter(drug=>d.tags.includes(drug.relievesTag)).map(drug=>drug.reliefStrength));
    oxygenLoss+=(d.oxygenLoss||0)*(1-relief)*woundModifiers(i).oxygenMultiplier;
  }
  const ventilating=g.ventilatingUntil>=g.elapsed || g.resuscitating;
  const oxygenOn=g.oxygenUntil>=g.elapsed;
  const recovery=ventilating?.28:oxygenLoss===0?.065:0;
  g.oxygen=Math.max(0,Math.min(99,g.oxygen+recovery+(oxygenOn?.035:0)+bounded(activeModifiers(g).reduce((n,d)=>n+(d.oxygenSupport||0),0),0,.06)-oxygenLoss-(ventilating?0:respiratoryBurden(g)*.045)));
  if(g.oxygen<60) g.blood=Math.max(0,g.blood-.08);
  // Drug respiratory burden wears off, rather than persisting after its effect.
  g.respiratoryDepression=Math.max(0,g.respiratoryDepression-.0008);
  if(g.oxygenUntil===g.elapsed) g.log.push({time:g.elapsed,text:'Butla tlenowa jest pusta. Dopływ tlenu ustał.'});
  for(const m of g.medications) {
    if(m.start===g.elapsed) g.log.push({time:g.elapsed,text:`Lek zaczyna działać: ${itemById(m.id).name}.`});
    if(m.end===g.elapsed) g.log.push({time:g.elapsed,text:`Kończy się działanie leku: ${itemById(m.id).name}.`});
  }
  for(const part of Object.values(g.body)) if(part.treatments.tourniquet!==undefined && g.elapsed-part.treatments.tourniquet===900) g.log.push({time:g.elapsed,text:'Staza jest założona od 15 minut. Oceń ukrwienie i czucie kończyny.'});
  if(!g.arrest && (circulation(g)<=20 || g.oxygen<=38)) {
    g.arrest={since:g.elapsed,budget:180};
    g.log.push({time:g.elapsed,text:'Pacjent przestaje reagować i prawidłowo oddychać. Pilnie oceń oznaki krążenia.'});
  }
  if(g.arrest) {
    g.arrest.budget-=g.resuscitating?.25:1;
    if(g.resuscitating && circulation(g)>27 && g.oxygen>65 && loss<.035) {
      g.arrest=null;
      g.log.push({time:g.elapsed,text:'Powrót oznak krążenia po RKO. Nadal potrzebna jest dalsza opieka.'});
    } else if(g.arrest.budget<=0) {
      g.status='lost'; g.log.push({time:g.elapsed,text:'Nie udało się przywrócić krążenia. Poszkodowany zmarł.'});
    }
  }
  for(const support of g.supports||[])if(support.until===g.elapsed)g.log.push({time:g.elapsed,text:`Kończy się wsparcie: ${itemById(support.id)?.name||support.id}.`});
  if(g.status==='active' && g.transportAt!==null && g.elapsed>=g.transportAt && !g.arrest) {
    g.status='saved';g.log.push({time:g.elapsed,text:'Zespół dociera na miejsce. Przekazujesz żywego pacjenta do dalszej opieki.'});
  }
  sampleMonitor(g);
}
