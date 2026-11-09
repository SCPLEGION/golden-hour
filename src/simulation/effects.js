import { INJURIES } from '../content/injuries.js';
import { bodyPart, matchesRegion, sameGroup, resolvePart } from '../content/body.js';
import { isConscious, circulation, vitals, examination } from './selectors.js';
import { hasAccess, hasFlow, flowEfficiency, accessSites, tourniquetOver, ivSiteFor } from './vascular.js';
// Effect handlers mutate only the engine's cloned working state.
// Add an effect and register it here; UI and action dispatch need no changes.
const treatment = (key, tag, message) => ({g,target,item,injuryId}) => {
  const injuries=g.injuries.filter(i=>i.part===target && INJURIES[i.type].tags.includes(tag) && (!injuryId || i.id===injuryId));
  if(!injuries.length) return 'Zużyto sprzęt, ale w tej okolicy nie ma urazu, na który działa.';
  if(item.scope==='wound') {
    const injury=injuries.find(i=>i.treatments?.[key]===undefined);
    if(!injury)return 'Ta rana jest już zabezpieczona.';
    injury.treatments??={};injury.treatments[key]=g.elapsed;
  }
  g.body[target].treatments[key]=g.elapsed;
  return `${bodyPart(target).name}: ${message}`;
};
export const EFFECTS = {
  stabilize:({g,target,item,injuryId})=>{
    const candidate=g.injuries.find(i=>i.part===target&&(!injuryId||i.id===injuryId)&&(item.treatsTags||item.contextTags||[]).some(tag=>INJURIES[i.type].tags.includes(tag))&&i.treatments?.[item.id]===undefined);
    if(!candidate)return 'Zużyto sprzęt, ale nie znaleziono pasującego urazu w tym miejscu.';
    candidate.treatments??={};candidate.treatments[item.id]=g.elapsed;g.body[target].treatments[item.id]=g.elapsed;
    if(INJURIES[candidate.type].tags.includes('airwayFluid')&&item.oxygenRelief===1)g.airway=true;
    return `${bodyPart(target).name}: zastosowano ${item.name.toLocaleLowerCase('pl')}. Uraz otrzymuje właściwe wsparcie.`;
  },
  support:({g,target,item})=>{
    g.supports??=[];g.supports.push({id:item.id,target,until:g.elapsed+(item.duration||180)});
    g.body[target].treatments[item.id]=g.elapsed;
    return `${bodyPart(target).name}: zastosowano ${item.name.toLocaleLowerCase('pl')} na ${item.duration||180} s gry.`;
  },
  assess:({g,target,item})=>{
    const v=vitals(g),part=bodyPart(target).name,occluded=tourniquetOver(g,target)!==undefined;
    const local=g.injuries.filter(i=>i.part===target);
    const sensoryLoss=occluded||local.some(i=>INJURIES[i.type].sensoryLoss);
    const breathingSounds=local.some(i=>INJURIES[i.type].tags.includes('bronchospasm'))?' Świsty wydechowe.':local.some(i=>INJURIES[i.type].tags.includes('chest'))?' Szmer oddechowy jednostronnie osłabiony.':'';
    const texts={pupils:`Ocena źrenic: ${isConscious(g)?'reagują na światło':'kontakt utrudniony; oceń także drożność i oddech'}.`,perfusion:`Ocena perfuzji: ${occluded?'staza odcina przepływ; brak tętna obwodowego':circulation(g)<55?'powrót kapilarny opóźniony, obwodowe tętno słabe':'powrót kapilarny zachowany, tętno obwodowe wyczuwalne'}.`,glucose:`Odczyt glukozy: ${v.glucose} jednostek skali gry.`,temperature:`Temperatura: ${v.temperature}°C.`,breathing:`Oddychanie: ${v.breathing}/min, SpO₂ ${v.oxygen}%.${breathingSounds}`,neurology:`Ocena neurologiczna: ${isConscious(g)?(sensoryLoss?'reaguje na głos; czucie w tej okolicy osłabione':'reaguje na głos; czucie w tej okolicy zachowane'):'pacjent nie odpowiada'}.`};
    const text=`${part}: ${texts[item.assessment]||'Badanie kontrolne wykonane.'}`;
    g.assessments??=[];g.assessments.push({id:item.id,part:target,time:g.elapsed,text});return text;
  },
  dressing:treatment('dressing','wound','założono opatrunek. Oceń, czy krwawienie ustępuje.'),
  hemostatic:treatment('hemostatic','wound','zabezpieczono ranę gazą hemostatyczną.'),
  tourniquet:({g,target})=>{g.body[target].treatments.tourniquet=g.elapsed;return `${bodyPart(target).name}: założono stazę. Przepływ poniżej stazy jest odcięty.${accessSites(g).some(s=>sameGroup(s,target)&&!hasFlow(g,s))?' Dostęp IV poniżej stazy przestał być drożny.':''}`;},
  // A splint covers fractures of its own segment and the adjacent ones of the same limb.
  splint:({g,target})=>{
    const p=bodyPart(target);
    if(!g.injuries.some(i=>INJURIES[i.type].tags.includes('fracture')&&sameGroup(i.part,target)&&Math.abs(bodyPart(i.part).order-p.order)<=1))return 'Zużyto sprzęt, ale w tej okolicy nie ma urazu, na który działa.';
    g.body[target].treatments.splint=g.elapsed;return `${p.name}: unieruchomiono złamanie. Rana wymaga osobnej opieki.`;
  },
  seal:treatment('seal','chest','założono opatrunek na ranę klatki piersiowej.'),
  oxygen:({g})=>{g.oxygenUntil=g.elapsed+600;return 'Podłączono tlen. Zapas wystarczy na 10 minut symulacji.';},
  airway:({g})=>{g.airway=true;return 'Udrożniono i zabezpieczono drogi oddechowe.';},
  ventilate:({g,item})=>{g.ventilatingUntil=g.elapsed+item.time;return 'Wykonano ręczną wentylację przez czas czynności.';},
  blanket:({g})=>{g.warm=true;return 'Okryto poszkodowanego. Ograniczono utratę ciepła.';},
  iv:({g,target,procedure})=>{
    const part=g.body[target];
    part.ivAttempts??=[];
    part.ivAttempts.push({time:g.elapsed,success:procedure.success,score:procedure.score});
    if(!procedure.success){
      g.injuries.push({id:`puncture-${g.actions}`,part:target,type:'contusion',treatments:{},position:procedure.position});
      return `${bodyPart(target).name}: nieudane wkłucie. Powstał krwiak. Zużyto wenflon i czas; spróbuj w innym punkcie.`;
    }
    part.ivAt=g.elapsed;part.ivQuality=procedure.quality;part.ivPlacement={siteId:procedure.siteId,point:procedure.point,position:procedure.position};
    return `${bodyPart(target).name}: wenflon założony. Jakość techniki ${Math.round(procedure.quality*100)}%. Przepływ ${Math.round(flowEfficiency(g,target)*100)}%.${hasFlow(g,target)?'':' Staza odcina przepływ — podanie będzie nieskuteczne.'}`;
  },
  removeIV:({g,target})=>{target=ivSiteFor(g,target);g.body[target].ivAt=null;delete g.body[target].ivQuality;delete g.body[target].ivPlacement;for(const infusion of g.infusions)if(infusion.site===target)infusion.end=g.elapsed;return `${bodyPart(target).name}: usunięto wenflon i odłączono wlew.`;},
  fluid:({g,target})=>{
    target=ivSiteFor(g,target);
    if(!hasFlow(g,target))return `${bodyPart(target).name}: płyn zużyty bez efektu — staza odcina ten dostęp IV.`;
    g.infusions.push({site:target,end:g.elapsed+120});return `${bodyPart(target).name}: podłączono płyn do tego wenflonu. Wlew potrwa 2 minuty, dopóki dostęp pozostaje drożny.`;
  },
  monitor:({g})=>{g.monitoring=true;return 'Podłączono monitor ciągły. Parametry są aktualizowane na żywo.';},
  cpr:({g})=>{
    if(!g.arrest) {g.blood=Math.max(0,g.blood-3);return 'Pacjent ma krążenie. RKO nie przynosi korzyści i powoduje uraz: traci 3 punkty krążenia gry.';}
    g.resuscitating=true; return 'Wykonano cykl RKO z wentylacją. Ponownie oceń oznaki krążenia.';
  },
  aed:({g})=>g.arrest?'AED: rytm niedefibrylacyjny. Wyładowanie niewskazane. Kontynuuj opiekę i RKO.':'AED: krążenie obecne. Wyładowanie niewskazane.',
  medicine:({g,item,target})=>{
    if(item.requires==='iv')target=ivSiteFor(g,target);
    if(item.requires==='iv'&&!hasFlow(g,target))return `${bodyPart(target).name}: zużyto ${item.name}, ale staza odcina ten dostęp IV. Brak efektu ogólnoustrojowego.`;
    const delivery=item.requires==='iv'?flowEfficiency(g,target):1;
    const repeated=g.medications.some(m=>m.id===item.id && m.end>g.elapsed);
    if(repeated) { g.blood=Math.max(0,g.blood-10*delivery); g.respiratoryDepression+=item.drugTags?.includes('opioid')?2*delivery:0; }
    const allergy=g.allergies.includes(item.id);
    if(allergy){g.blood=Math.max(0,g.blood-12*delivery);g.oxygen=Math.max(0,g.oxygen-12*delivery);}
    const burden=item.respiratoryBurden?(circulation(g)<60?item.respiratoryBurden*3.3:item.respiratoryBurden):0;
    g.medications.push({id:item.id,start:g.elapsed+item.onset,end:g.elapsed+item.onset+item.duration,burden:burden*delivery,delivery,site:item.requires==='iv'?target:null});
    return `Podano ${item.name}: 1 porcja gry (${item.route}).${item.requires==='iv'?` Dostarczono ${Math.round(delivery*100)}% porcji gry.`:''} Początek efektu za ${item.onset} s.${repeated?' Powtórzono aktywny lub oczekujący lek — wystąpiło działanie toksyczne.':''}${allergy?' Wystąpiła reakcja uczuleniowa; stan pacjenta pogorszył się.':''}`;
  }
};
export function itemUnavailable(g,item,target,injuryId=null) {
  target=resolvePart(target);
  if(g.status!=='active') return 'Interwencja zakończona';
  if(item.count!==null && g.supplies[item.id]<=0) return 'Brak w torbie';
  if(item.target && !bodyPart(target)) return 'Wybierz okolicę ciała';
  if(item.limbOnly && !bodyPart(target)?.limb) return 'Tylko na kończynę';
  if(item.effect==='tourniquet' && !bodyPart(target)?.tourniquet) return 'Stazę zakłada się na ramię, przedramię, udo lub podudzie';
  if(item.regions && !matchesRegion(item.regions,target)) return 'Wybierz odpowiednią okolicę';
  if(item.effect==='iv' && !bodyPart(target)?.vascular) return 'Wenflon zakłada się na łokieć, przedramię lub dłoń';
  if(item.requires==='iv' && !ivSiteFor(g,target)) return 'Najpierw wenflon na tej ręce';
  if(item.route==='Doustnie' && !isConscious(g)) return 'Pacjent nie może przełykać';
  if(item.effect==='airway' && isConscious(g)) return 'Pacjent przytomny';
  if(item.effect==='airway' && g.airway) return 'Drożność zabezpieczona';
  if(item.effect==='blanket' && g.warm) return 'Koc już założony';
  if(item.effect==='removeIV'&&!ivSiteFor(g,target))return 'Brak wenflonu w tej ręce';
  if(item.effect==='iv' && hasAccess(g,target)) return 'Wenflon już założony';
  if(item.effect==='oxygen' && g.oxygenUntil>g.elapsed) return 'Tlen już podłączony';
  if(item.effect==='support'&&(g.supports||[]).some(s=>s.id===item.id&&s.target===target&&s.until>g.elapsed))return 'Wsparcie nadal działa';
  if(item.scope==='wound') {
    const treatmentKey=item.effect==='stabilize'?item.id:item.effect;
    const matching=g.injuries.filter(i=>i.part===target && (!injuryId||i.id===injuryId) && (!item.contextTags||item.contextTags.some(tag=>INJURIES[i.type].tags.includes(tag))));
    if(injuryId&&!matching.length)return 'Ten sprzęt nie pasuje do tej rany';
    if(matching.length&&matching.every(i=>i.treatments?.[treatmentKey]!==undefined))return 'Rana już zabezpieczona';
  }else if(item.target && item.effect!=='iv' && g.body[target].treatments[item.effect]!==undefined) return 'Już założono';
  return null;
}
