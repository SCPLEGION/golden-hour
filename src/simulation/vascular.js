import { BODY_PARTS, bodyPart, resolvePart } from '../content/body.js';
import { IV_PROCEDURE } from '../content/procedures.js';
import { missingSegments, memoized } from './selectors.js';
import { clinicalSnapshot } from './physio-model.js';
// Devices on missing (amputated) segments never count.
// Memoised per state structure: tourniquets change only inside act(), before `actions` increments.
const OVER=new WeakMap();
const tourniquetsOver=(g,id)=>{const map=memoized(OVER,g,[g.actions,g.injuries?.length,g.injuries,g.body],()=>new Map());if(!map.has(id))map.set(id,computeOver(g,id));return map.get(id);};
const computeOver=(g,id)=>{const p=bodyPart(id),missing=missingSegments(g);return p?.limb?BODY_PARTS.filter(t=>t.group===p.group&&t.tourniquet&&t.order<=p.order&&!missing.includes(t.id)&&Number.isFinite(g.body[t.id]?.treatments?.tourniquet)).map(t=>g.body[t.id]):[];};
// Earliest tourniquet on the same limb at or proximal to this segment (undefined when none).
// `minQuality` ignores loosely applied ones: only quality >= .5 occludes IV flow and distal pulses.
export function tourniquetOver(g,id,minQuality=0){
  const times=tourniquetsOver(g,id).filter(t=>(t.tourniquetQuality??1)>=minQuality).map(t=>t.treatments.tourniquet);
  return times.length?Math.min(...times):undefined;
}
// Best occlusion quality over this segment (legacy tourniquets count as 1), undefined when none.
export function tourniquetQuality(g,id){const list=tourniquetsOver(g,id);return list.length?Math.max(...list.map(t=>t.tourniquetQuality??1)):undefined;}
export const hasAccess=(g,site)=>{site=resolvePart(site);return Boolean(bodyPart(site)?.vascular&&g.body[site]?.ivAt!==null&&g.body[site]?.ivAt!==undefined&&!missingSegments(g).includes(site));};
export const accessSites=g=>Object.keys(g.body).filter(site=>hasAccess(g,site));
export function flowEfficiency(g,site){
  site=resolvePart(site);
  if(!hasAccess(g,site)||tourniquetOver(g,site,.5)!==undefined)return 0;
  const access=g.body[site];
  // Legacy accesses retain their previous efficiency until replaced.
  if(!access.ivPlacement)return 1;
  const location=IV_PROCEDURE.sites.find(s=>s.id===access.ivPlacement.siteId);
  return (access.ivQuality??1)*(location?.efficiency??1)*(.5+.5*clinicalSnapshot(g).perfusion/100);
}
export const hasFlow=(g,site)=>flowEfficiency(g,site)>.05;
// The access used for IV drugs/fluids given on a segment: its own, else a flowing one on the same limb.
export function ivSiteFor(g,target){
  target=resolvePart(target);if(hasAccess(g,target))return target;
  const group=bodyPart(target)?.group;
  return accessSites(g).filter(s=>bodyPart(s).group===group).sort((a,b)=>hasFlow(g,b)-hasFlow(g,a))[0]??null;
}
export function accessStatus(g,site){
  if(!hasAccess(g,site))return 'Brak wenflonu';
  if(!hasFlow(g,site))return 'IV odcięte stazą';
  const location=IV_PROCEDURE.sites.find(s=>s.id===g.body[resolvePart(site)].ivPlacement?.siteId);
  return `${location?.name||'IV'} · przepływ ${Math.round(flowEfficiency(g,site)*100)}%`;
}
