import { IV_PROCEDURE } from '../content/procedures.js';
import { bodyPart } from '../content/body.js';
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
function segmentDistance(p,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/length):0;
  return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);
}
export function insertionSite(point){return IV_PROCEDURE.sites.find(s=>point.x>=s.from&&point.x<=s.to)||IV_PROCEDURE.sites[1];}
export function placementAccuracy(point){
  const distance=Math.min(...IV_PROCEDURE.veins.flatMap(line=>line.slice(1).map((end,i)=>segmentDistance(point,line[i],end))));
  return clamp(1-distance/insertionSite(point).tolerance);
}
// Body position of the cannula inside the segment band, following the arm's slope.
export function insertionPosition(part,point){
  const seg=bodyPart(part),site=insertionSite(point),t=clamp((point.x-site.from)/(site.to-site.from)),left=seg.group==='leftArm';
  const [x0,y0]=seg.device,y=seg.clip[0]+(seg.clip[1]-seg.clip[0])*(.2+.6*t);
  return [Math.round(x0+(y-y0)*.22*(left?1:-1)),Math.round(y)];
}
// Segments preset the minigame site; a point outside it is not a valid attempt there.
export const siteForPart=part=>IV_PROCEDURE.sites.find(s=>s.id===bodyPart(part)?.ivSite)||null;
export function validIVInput(input){
  return Boolean(input&&Number.isFinite(input.point?.x)&&Number.isFinite(input.point?.y)&&input.point.x>=0&&input.point.x<=800&&input.point.y>=0&&input.point.y<=300&&Number.isFinite(input.approach)&&input.approach>=0&&input.approach<=100&&Number.isFinite(input.depth)&&input.depth>=0&&input.depth<=1&&typeof input.aborted==='boolean');
}
export function resolveIVAttempt(g,part,input){
  if(!bodyPart(part)?.vascular||!validIVInput(input))return null;
  const site=insertionSite(input.point);if(site.id!==siteForPart(part)?.id)return null;
  const aim=placementAccuracy(input.point);
  const angle=clamp(1-Math.abs(input.approach-IV_PROCEDURE.approachTarget)/35);
  const depth=clamp(1-Math.abs(input.depth-site.depthTarget)/site.depthWindow);
  const score=aim*.4+angle*.2+depth*.4;
  const success=!input.aborted&&aim>=.3&&angle>=.2&&depth>=.3&&score>=.5;
  return {success,quality:success?clamp(.35+.65*score):0,score,siteId:site.id,point:{...input.point},position:insertionPosition(part,input.point),aim,angle,depth,aborted:input.aborted};
}
// New procedure types register a validator + pure resolver here.
export const PROCEDURES={iv:{validate:validIVInput,resolve:resolveIVAttempt}};
