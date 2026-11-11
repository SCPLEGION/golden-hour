import { INJURIES } from '../content/injuries.js';
import { bodyPart, matchesRegion, sameGroup, resolvePart, splintReach } from '../content/body.js';
import { isConscious, canSwallow, toleratesOPA, circulation, vitals, examination, isMissing } from './selectors.js';
import { connectOxygen } from './physio-respiration.js';
import { hasAccess, hasFlow, flowEfficiency, accessSites, tourniquetOver, ivSiteFor } from './vascular.js';
import { endArrest, roscPossible } from './physiology.js';
import { THERMAL } from '../content/physiology-data.js';
import { drugEffects, drugProfileText } from './physio-pharmacology.js';
import { TUNING } from '../content/physiology-data.js';
// Effect handlers mutate only the engine's cloned working state.
// Add an effect and register it here; UI and action dispatch need no changes.
const treatment = (key, tag, message, quality) => ({g,target,item,injuryId,procedure}) => {
  const injuries=g.injuries.filter(i=>i.part===target && INJURIES[i.type].tags.includes(tag) && (!injuryId || i.id===injuryId));
  if(!injuries.length) return 'Zużyto sprzęt, ale w tej okolicy nie ma urazu, na który działa.';
  if(item.scope==='wound') {
    const injury=injuries.find(i=>i.treatments?.[key]===undefined);
    if(!injury)return 'Ta rana jest już zabezpieczona.';
    injury.treatments??={};injury.treatments[key]=g.elapsed;
    if(quality&&procedure)injury[quality]=procedure.quality;
  }
  g.body[target].treatments[key]=g.elapsed;
  return `${bodyPart(target).name}: ${typeof message==='function'?message(procedure):message}`;
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
    const v=vitals(g),part=bodyPart(target).name,occluded=tourniquetOver(g,target,.5)!==undefined;
    const local=g.injuries.filter(i=>i.part===target);
    const sensoryLoss=occluded||local.some(i=>INJURIES[i.type].sensoryLoss);
    const breathingSounds=local.some(i=>INJURIES[i.type].tags.includes('bronchospasm'))?' Świsty wydechowe.':local.some(i=>INJURIES[i.type].tags.includes('chest'))?' Szmer oddechowy jednostronnie osłabiony.':'';
    const headTags=g.injuries.filter(i=>['head','face'].includes(i.part)).flatMap(i=>INJURIES[i.type].tags);
    const texts={pupils:`Ocena źrenic: ${headTags.includes('opioidOd')?'bardzo wąskie, słabo reagują na światło':headTags.includes('headTrauma')?'reagują nierówno — jedna wolniej':isConscious(g)?'reagują na światło':'kontakt utrudniony; oceń także drożność i oddech'}.`,perfusion:`Ocena perfuzji: ${occluded?'staza odcina przepływ; brak tętna obwodowego':circulation(g)<55?'powrót kapilarny opóźniony, obwodowe tętno słabe':'powrót kapilarny zachowany, tętno obwodowe wyczuwalne'}.`,glucose:`Odczyt glukozy: ${v.glucose.toFixed(1).replace(".",",")} mmol/l.`,temperature:`Temperatura: ${v.temperature}°C.`,breathing:`Oddychanie: ${v.breathing}/min, SpO₂ ${v.spo2==='—'?'— (brak sygnału)':`${v.spo2}%`}.${breathingSounds}`,neurology:`Ocena neurologiczna: ${isConscious(g)?(sensoryLoss?'reaguje na głos; czucie w tej okolicy osłabione':'reaguje na głos; czucie w tej okolicy zachowane'):'pacjent nie odpowiada'}.`};
    const text=`${part}: ${texts[item.assessment]||'Badanie kontrolne wykonane.'}`;
    g.assessments??=[];g.assessments.push({id:item.id,part:target,time:g.elapsed,text});return text;
  },
  dressing:treatment('dressing','wound','założono opatrunek. Oceń, czy krwawienie ustępuje.'),
  hemostatic:treatment('hemostatic','wound',p=>`zabezpieczono ranę gazą hemostatyczną.${p?` Jakość tamponady ${Math.round(p.quality*100)}%.`:''}`,'packQuality'),
  // Procedure quality decides how much distal bleeding remains; over-tightening adds pain.
  tourniquet:({g,target,procedure})=>{
    const part=g.body[target];part.treatments.tourniquet??=g.elapsed;part.tourniquetQuality=procedure?.quality??1;
    if(procedure?.strain)part.tourniquetStrain=procedure.strain;else delete part.tourniquetStrain;
    const iv=accessSites(g).some(s=>sameGroup(s,target)&&!hasFlow(g,s))?' Dostęp IV poniżej stazy przestał być drożny.':'';
    if(procedure?.band==='under')return `${bodyPart(target).name}: staza dokręcona za słabo (${Math.round(part.tourniquetQuality*100)}%). Krwawienie poniżej słabnie, ale nie ustaje.${iv}`;
    if(procedure?.band==='over')return `${bodyPart(target).name}: założono stazę z nadmiernym naciągiem. Krwawienie ustało, ale ucisk wyraźnie nasila ból.${iv}`;
    return `${bodyPart(target).name}: założono stazę. Przepływ poniżej stazy jest odcięty.${iv}`;
  },
  // A splint covers fractures of its own segment and the adjacent ones of the same limb (splintReach).
  splint:({g,target})=>{
    const p=bodyPart(target);
    if(!g.injuries.some(i=>INJURIES[i.type].tags.includes('fracture')&&splintReach(i.part,target)))return 'Zużyto sprzęt, ale w tej okolicy nie ma urazu, na który działa.';
    g.body[target].treatments.splint=g.elapsed;return `${p.name}: unieruchomiono złamanie. Rana wymaga osobnej opieki.`;
  },
  seal:treatment('seal','chest',p=>`założono opatrunek na ranę klatki piersiowej.${p&&p.quality<1?` Przyłożony poza wydechem — szczelność ${Math.round(p.quality*100)}%.`:''}${p?.attempts>1?' Druga próba wydłużyła czynność.':''}`,'sealQuality'),
  oxygen:({g})=>{connectOxygen(g);return 'Podłączono maskę z rezerwuarem i butlę tlenową. Zapas wystarczy na 10 minut symulacji.';},
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
    g.infusions.push({site:target,end:g.elapsed+TUNING.infusionMaxS,ml:TUNING.bagMl});return `${bodyPart(target).name}: podłączono worek płynu (${TUNING.bagMl} ml) do tego wenflonu. Przy pełnym przepływie wlew trwa około ${Math.round(TUNING.bagMl/TUNING.infusionMlMin)} minut gry, dopóki dostęp pozostaje drożny.`;
  },
  monitor:({g})=>{g.monitoring=true;return 'Podłączono monitor ciągły. Parametry są aktualizowane na żywo.';},
  cpr:({g,procedure})=>{
    // Compressions on a beating heart: a rib fracture (pain, splinting, hidden chest loss) instead of a point penalty.
    if(!g.arrest) {
      if(!g.injuries.some(i=>i.id.startsWith('cpr-')))g.injuries.push({id:`cpr-${g.actions}`,part:'chest',type:'ribFracture',treatments:{},at:g.elapsed});
      return 'Pacjent ma krążenie. RKO nie przynosi korzyści i powoduje uraz: podejrzenie złamania żeber, ból przy oddychaniu.';
    }
    g.resuscitating=true;g.cprBenefit=procedure?.benefit??1;
    return `Wykonano cykl RKO z wentylacją.${procedure?` Jakość uciśnięć ${Math.round(procedure.quality*100)}% (tempo ${Math.round(procedure.rate*100)}%, głębokość ${Math.round(procedure.depth*100)}%).`:''} Ponownie oceń oznaki krążenia.`;
  },
  // Shockable only in VF; above 30 °C a shock restores circulation once the other causes allow it.
  aed:({g})=>{
    if(!g.arrest)return 'AED: krążenie obecne. Wyładowanie niewskazane.';
    if(g.arrest.rhythm!=='vf')return 'AED: rytm niedefibrylacyjny — brak wskazań do wyładowania. Kontynuuj RKO i usuwaj przyczynę.';
    if(g.temperature<=THERMAL.roscC)return 'AED: migotanie komór — wykonano wyładowanie bez efektu. W głębokim wychłodzeniu serce nie odpowiada; ogrzewaj i kontynuuj RKO.';
    if(!roscPossible(g))return 'AED: migotanie komór — wykonano wyładowanie. Rytm się zmienił, ale krążenie nie wraca; kontynuuj RKO i usuwaj przyczynę.';
    endArrest(g);return 'AED: migotanie komór — wykonano wyładowanie. Powrót oznak krążenia. Nadal potrzebna jest dalsza opieka.';
  },
  medicine:({g,item,target})=>{
    if(item.requires==='iv')target=ivSiteFor(g,target);
    if(item.requires==='iv'&&!hasFlow(g,target))return `${bodyPart(target).name}: zużyto ${item.name}, ale staza odcina ten dostęp IV. Brak efektu ogólnoustrojowego.`;
    const delivery=item.requires==='iv'?flowEfficiency(g,target):1;
    // Repeated porcje stack in the depot (physio-pharmacology.js); no flat penalty.
    const repeated=drugEffects(g).some(e=>e.id===item.id&&(e.active||e.pending));
    // An ignored allergy adds an anaphylactic reaction scaled by the delivered amount.
    const allergy=g.allergies.includes(item.id);
    if(allergy&&delivery>0)g.injuries.push({id:`allergy-${g.actions}`,part:'chest',type:'allergicReaction',treatments:{},scale:Math.round(TUNING.allergyScale*delivery*1000)/1000,rampS:TUNING.allergyRampS,at:g.elapsed});
    g.medications.push({id:item.id,at:g.elapsed,amount:delivery,route:item.route,site:item.requires==='iv'?target:null});
    const profile=drugProfileText(item.id);
    return `Podano ${item.name}: 1 porcja gry (${item.route}).${item.requires==='iv'?` Dostarczono ${Math.round(delivery*100)}% porcji gry.`:''} Narastanie działania: ${profile.onset}.${repeated?' Poprzednia porcja nadal działa — porcje kumulują się, rośnie ryzyko działań niepożądanych.':''}${allergy?' Wystąpiła reakcja uczuleniowa; stan pacjenta pogarsza się.':''}`;
  }
};
export const MISSING_PART='Tej części brak — wybierz wyżej';
export const STUMP_CARE=['dressing','hemostatic'];
export function itemUnavailable(g,item,target,injuryId=null) {
  target=resolvePart(target);
  if(g.status!=='active') return 'Interwencja zakończona';
  if(item.count!==null && g.supplies[item.id]<=0) return 'Brak w torbie';
  if(item.target && !bodyPart(target)) return 'Wybierz okolicę ciała';
  // Missing (amputated) segments accept only a dressing or packing on the stump's own injury.
  if(isMissing(g,target)&&!(STUMP_CARE.includes(item.id)&&injuryId&&g.injuries.some(i=>i.id===injuryId&&i.part===target&&INJURIES[i.type].tags.includes('amputation'))))return MISSING_PART;
  if(item.limbOnly && !bodyPart(target)?.limb) return 'Tylko na kończynę';
  if(item.effect==='tourniquet' && !bodyPart(target)?.tourniquet) return 'Stazę zakłada się na ramię, przedramię, udo lub podudzie';
  if(item.regions && !matchesRegion(item.regions,target)) return 'Wybierz odpowiednią okolicę';
  if(item.effect==='iv' && !bodyPart(target)?.vascular) return 'Wenflon zakłada się na łokieć, przedramię lub dłoń';
  if(item.requires==='iv' && !ivSiteFor(g,target)) return 'Najpierw wenflon na tej ręce';
  // Oral routes need a fully alert patient (GCS ≥ 14); an oropharyngeal airway is tolerated only at GCS ≤ 8.
  if(item.route==='Doustnie' && !canSwallow(g)) return isConscious(g)?'Pacjent nie połyka bezpiecznie — świadomość zaburzona':'Pacjent nie może przełykać';
  if(item.effect==='airway' && !g.airway && !toleratesOPA(g)) return 'Pacjent reaguje — nie toleruje rurki ustno-gardłowej';
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
  // A loose tourniquet may be re-tightened; its original application time keeps counting.
  }else if(item.target && item.effect!=='iv' && g.body[target].treatments[item.effect]!==undefined && !(item.effect==='tourniquet'&&(g.body[target].tourniquetQuality??1)<1)) return 'Już założono';
  return null;
}
