import { BODY_PARTS, bodyPart, resolvePart } from '../content/body.js';
import { IV_PROCEDURE } from '../content/procedures.js';
// Earliest tourniquet on the same limb at or proximal to this segment (undefined when none).
export function tourniquetOver(g,id){
  const p=bodyPart(id);if(!p?.limb)return undefined;
  const times=BODY_PARTS.filter(t=>t.group===p.group&&t.tourniquet&&t.order<=p.order).map(t=>g.body[t.id]?.treatments?.tourniquet).filter(Number.isFinite);
  return times.length?Math.min(...times):undefined;
}
export const hasAccess=(g,site)=>{site=resolvePart(site);return Boolean(bodyPart(site)?.vascular&&g.body[site]?.ivAt!==null&&g.body[site]?.ivAt!==undefined);};
export const accessSites=g=>Object.keys(g.body).filter(site=>hasAccess(g,site));
export function flowEfficiency(g,site){
  site=resolvePart(site);
  if(!hasAccess(g,site)||tourniquetOver(g,site)!==undefined)return 0;
  const access=g.body[site];
  // Legacy accesses retain their previous efficiency until replaced.
  if(!access.ivPlacement)return 1;
  const location=IV_PROCEDURE.sites.find(s=>s.id===access.ivPlacement.siteId);
  const circulation=Math.min(100,g.blood+g.fluidSupport);
  return (access.ivQuality??1)*(location?.efficiency??1)*(.5+.5*circulation/100);
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
