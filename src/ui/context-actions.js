import { ITEMS } from '../content/items.js';
import { INJURIES } from '../content/injuries.js';
import { bodyPart, matchesRegion, resolvePart } from '../content/body.js';
import { itemUnavailable, MISSING_PART, STUMP_CARE } from '../simulation/effects.js';
import { hasFlow, ivSiteFor } from '../simulation/vascular.js';
import { visibleInjuries, isMissing } from '../simulation/selectors.js';
// Catalog-driven menu: no treatment-specific click handlers live in the UI.
export function contextActions(g,partId,injuryId=null) {
  partId=resolvePart(partId);const part=bodyPart(partId);
  const wound=visibleInjuries(g,partId).find(i=>i.id===injuryId);
  // A missing segment offers nothing; its amputation marker offers examination and stump care only.
  const stump=isMissing(g,partId);
  if(stump&&!(wound&&INJURIES[wound.type].tags.includes('amputation')))return [{id:'missing',label:MISSING_PART,time:0,group:'Brak części ciała',disabled:MISSING_PART}];
  const actions=[{id:'examine',label:'Zbadaj tę okolicę',time:30,group:'Badanie',disabled:g.status!=='active'?'Interwencja zakończona':null}];
  for(const item of ITEMS) {
    if(stump&&!STUMP_CARE.includes(item.id))continue;
    if(item.regions&&!matchesRegion(item.regions,partId))continue;
    if(item.limbOnly&&!part.limb)continue;
    if(wound&&item.contextTags&&!item.contextTags.some(tag=>INJURIES[wound.type].tags.includes(tag)))continue;
    const site=item.requires==='iv'?ivSiteFor(g,partId):null,blockedIV=Boolean(site)&&!hasFlow(g,site);
    actions.push({id:item.id,label:item.contextLabel||item.name,time:item.time,group:item.category==='medicine'?'Leki':'Sprzęt',disabled:itemUnavailable(g,item,partId,item.scope==='wound'?injuryId:null),warning:blockedIV?'Staza odcina IV — podanie bez efektu':null});
  }
  return actions;
}
