import { SCENARIOS } from '../content/scenarios.js';
import { CONDITION_SCENARIOS } from '../content/conditions.js';
import { INJURIES } from '../content/injuries.js';
import { resolvePart } from '../content/body.js';
import { difficultyById } from '../content/difficulty.js';
import { missingSegments } from './selectors.js';
const SOURCES=[...SCENARIOS,...CONDITION_SCENARIOS];
// Every unique valid [segment, type] pair used by the shipped scenarios; legacy limb ids resolve to a segment.
export const INJURY_POOL=[...new Map(SOURCES.flatMap(c=>c.injuries).map(([part,type])=>[`${resolvePart(part)}|${type}`,[resolvePart(part),type]])).values()].filter(([,type])=>INJURIES[type]);
// Moderate complications that a hard call adds on top of the scenario (no amputations, arrests or poisonings).
const MODERATE=new Set(['fracture','laceration','puncture','scalpCut','ribFracture','thighHematoma','abrasion','contusion','dislocation','shrapnel','glassEmbedded']);
export const MODERATE_POOL=INJURY_POOL.filter(([,type])=>MODERATE.has(type));
const ALLERGIES=[...new Set(SOURCES.flatMap(c=>c.allergies||[]))];
const pick=(random,list)=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
const amputation=type=>INJURIES[type].tags.includes('amputation')||type.startsWith('partialAmputation');
// A set is valid when no segment repeats a type and an amputated segment (with everything distal to it) carries only that injury.
function validSet(list){
  const set=list.map(([part,type])=>({part,type})),missing=missingSegments({injuries:set});
  for(const [i,a] of set.entries()){
    if(set.some((b,j)=>j>i&&b.part===a.part&&b.type===a.type))return false;
    const alone=!set.some((b,j)=>j!==i&&b.part===a.part);
    if(amputation(a.type)&&(!alone||missingSegments({injuries:set.filter((_,j)=>j!==i)}).includes(a.part)))return false;
    if(missing.includes(a.part)&&!(amputation(a.type)&&alone))return false;
  }
  return true;
}
const PLACES=['przy drodze krajowej','na placu budowy','w nieczynnej hali','na leśnym szlaku','na parkingu przed magazynem','nad rzeką','w piwnicy starej kamienicy','na polu przy torach'];
const MECHANISMS=['po upadku z wysokości','po zderzeniu pojazdów','po wypadku przy maszynie','po wybuchu w pobliżu','po zawaleniu się rusztowania','po ataku zwierzęcia','po zderzeniu z przeszkodą','po pożarze w budynku'];
const QUOTES=['„Nie wiem, co się stało… wszystko mnie boli.”','„Pomóż mi, proszę, to coraz gorsze…”','„Nie czuję, co się dzieje z ciałem.”','„Zimno mi, kręci mi się w głowie…”','„Tylko mnie nie zostawiaj.”','„Słyszałem huk i nic więcej nie pamiętam.”'];
const LESSON='Losowy przypadek — nie każdy da się uratować. Liczy się, jak długo utrzymałeś pacjenta przy życiu.';
// Scenario record shaped like src/content/scenarios.js; difficulty is a DIFFICULTIES entry or id.
export function generateProcedural(random=Math.random,difficulty='normal'){
  const bonus=difficultyById(typeof difficulty==='string'?difficulty:difficulty?.id).proceduralBonus??1;
  const want=2+Math.floor(random()*3)+bonus,injuries=[];
  for(let tries=0;injuries.length<want&&tries<80;tries++){const cand=pick(random,INJURY_POOL);if(validSet([...injuries,cand]))injuries.push(cand);}
  const environment={tempC:-5+Math.floor(random()*41),wet:pick(random,[0,0,0,.25,1]),wind:Math.floor(random()*3)};
  const blood=68+Math.floor(random()*31),oxygen=78+Math.floor(random()*22);
  const allergies=ALLERGIES.length&&random()<.5?[pick(random,ALLERGIES)]:[];
  const place=pick(random,PLACES),mechanism=pick(random,MECHANISMS);
  return {id:'procedural',environment,title:`Nieznane zdarzenie: ${place}`,scene:`Zgłoszenie ${place}, ${mechanism}. Okoliczności są niejasne, teren zabezpieczono. Zespół transportowy jest daleko.`,quote:pick(random,QUOTES),history:`Zdarzenie ${mechanism}. ${allergies.length?`Pacjent zgłasza uczulenie na ${allergies.join(', ')}.`:'Pacjent nie zgłasza znanych alergii.'} Pozostałe informacje są niepewne.`,injuries,blood,oxygen,...(allergies.length?{allergies}:{}),lesson:LESSON};
}
