import { IV_PROCEDURE, TOURNIQUET_PROCEDURE as TQ, CPR_PROCEDURE as CPR, PACKING_PROCEDURE as PACK, SEAL_PROCEDURE as SEAL } from '../content/procedures.js';
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
const unit=n=>Number.isFinite(n)&&n>=0&&n<=1;
const aborted=input=>typeof input?.aborted==='boolean';
// Distance-to-band accuracy: 1 inside [lo,hi], falling linearly to 0 at `tolerance` outside it.
const bandAccuracy=(value,[lo,hi],tolerance)=>clamp(1-Math.max(0,lo-value,value-hi)/tolerance);
const windowScore=(value,[lo,hi])=>clamp(1-.3*Math.abs(value-(lo+hi)/2)/((hi-lo)/2));
export const validTourniquetInput=input=>Boolean(input&&unit(input.tension)&&Number.isFinite(input.timeMs)&&input.timeMs>=0&&input.timeMs<=600000&&aborted(input));
// In the window the limb is fully occluded; under it leaks (1-quality); over it occludes but strains.
export function resolveTourniquet(g,part,input){
  if(!bodyPart(part)?.tourniquet||!validTourniquetInput(input)||input.aborted)return null;
  const [lo,hi]=TQ.window,t=input.tension,band=t<lo?'under':t>hi?'over':'ok';
  const quality=band==='under'?clamp(TQ.underCap*t/lo):1,strain=band==='over'?clamp((t-hi)/(1-hi)):0;
  const score=band==='ok'?windowScore(t,TQ.window):band==='under'?quality*.7:clamp(.7-.5*strain);
  return {success:true,band,quality,strain,score,tension:t,aborted:false};
}
export function validCPRInput(input){
  if(!input||!aborted(input)||!Array.isArray(input.intervalsMs)||!Array.isArray(input.depths))return false;
  const n=CPR.compressions;
  if(input.depths.length>n||input.intervalsMs.length>n-1||input.intervalsMs.length!==Math.max(0,input.depths.length-1))return false;
  if(!input.aborted&&input.depths.length!==n)return false;
  return input.depths.every(unit)&&input.intervalsMs.every(ms=>Number.isFinite(ms)&&ms>0&&ms<=CPR.maxIntervalMs);
}
export function resolveCPR(g,part,input){
  if(!validCPRInput(input)||input.aborted)return null;
  const mean=list=>list.reduce((n,v)=>n+v,0)/list.length;
  const rate=mean(input.intervalsMs.map(ms=>bandAccuracy(60000/ms,CPR.rate,CPR.rateTolerance)));
  const depth=mean(input.depths.map(d=>bandAccuracy(d,CPR.depth,CPR.depthTolerance)));
  const quality=rate*depth;
  return {success:true,quality,score:quality,rate,depth,benefit:CPR.benefitFloor+(1-CPR.benefitFloor)*quality,meanRate:Math.round(mean(input.intervalsMs.map(ms=>60000/ms))),aborted:false};
}
export const validPackingInput=input=>Boolean(input&&unit(input.filled)&&Number.isFinite(input.pressureMs)&&input.pressureMs>=0&&input.pressureMs<=60000&&aborted(input));
export function resolvePacking(g,part,input){
  if(!validPackingInput(input)||input.aborted)return null;
  const pressure=clamp(input.pressureMs/PACK.pressureMs),quality=clamp(input.filled*(PACK.pressureFloor+(1-PACK.pressureFloor)*pressure));
  return {success:true,quality,score:quality,filled:input.filled,pressure,aborted:false};
}
export const validSealInput=input=>Boolean(input&&unit(input.phase)&&Number.isInteger(input.attempts)&&input.attempts>=1&&input.attempts<=SEAL.maxAttempts&&aborted(input));
// Inside the exhale window the seal is complete; a miss only partly limits the oxygen loss.
export function resolveSeal(g,part,input){
  if(!validSealInput(input)||input.aborted)return null;
  const [lo,hi]=SEAL.window,inside=input.phase>=lo&&input.phase<=hi;
  const quality=inside?1:SEAL.missFloor+SEAL.missRange*bandAccuracy(input.phase,SEAL.window,.4);
  return {success:true,inside,quality,score:inside?windowScore(input.phase,SEAL.window):quality*.7,phase:input.phase,attempts:input.attempts,extraTime:(input.attempts-1)*SEAL.retryTime,aborted:false};
}
// Deterministic "minigames off" attempts: valid and deliberately middling.
export function autoInput(id,g,part){
  if(id==='iv'){const site=siteForPart(part)||IV_PROCEDURE.sites[1];return {point:{x:(site.from+site.to)/2,y:140},approach:IV_PROCEDURE.approachTarget,depth:site.depthTarget,aborted:false};}
  if(id==='tourniquet')return {tension:TQ.autoTension,timeMs:2000,aborted:false};
  if(id==='cpr')return {intervalsMs:Array(CPR.compressions-1).fill(CPR.autoIntervalMs),depths:Array(CPR.compressions).fill(CPR.autoDepth),aborted:false};
  if(id==='packing')return {filled:PACK.autoFilled,pressureMs:PACK.autoPressureMs,aborted:false};
  if(id==='seal')return {phase:SEAL.autoPhase,attempts:1,aborted:false};
  return null;
}
// New procedure types register a validator + pure resolver here.
export const PROCEDURES={iv:{validate:validIVInput,resolve:resolveIVAttempt},tourniquet:{validate:validTourniquetInput,resolve:resolveTourniquet},cpr:{validate:validCPRInput,resolve:resolveCPR},packing:{validate:validPackingInput,resolve:resolvePacking},seal:{validate:validSealInput,resolve:resolveSeal}};
