// Clinical state in real units (docs/PHYSIOLOGY-PLAN.md). The engine owns g.profile and g.phys;
// everything else reads them through clinicalSnapshot(g) and changes them through applyInsult(g, …).
import { NORMALS, TUNING, CV_TUNING, hemorrhageClass } from '../content/physiology-data.js';
import { INJURIES } from '../content/injuries.js';
import { activeModifiers, pain } from './selectors.js';
import { initRespiration, gcsOf, avpuOf } from './physio-respiration.js';
import { bounded } from './modifiers.js';
// Profile is drawn from the game's random source after every legacy draw. The patient names are male,
// so random patients are men; tests and options may pass {sex:'F',massKg,…}.
export function createProfile(random=Math.random,over={},ageY=40){
  const r1=random(),r2=random(),r3=random(),sex=over?.sex==='F'?'F':'M',[lo,hi]=sex==='F'?[52,80]:[65,95];
  const massKg=Number.isFinite(over?.massKg)?over.massKg:Math.round((lo+(hi-lo)*r1)*10)/10;
  const heightCm=Number.isFinite(over?.heightCm)?over.heightCm:Math.round((sex==='F'?152:164)+28*(.6*r1+.4*r2));
  return {sex,ageY:Number.isFinite(over?.ageY)?over.ageY:ageY,massKg,heightCm,ebvMl:Math.round(massKg*NORMALS.ebvPerKg[sex]),hb0:NORMALS.hb[sex],seed:Math.floor(r3*2147483647)};
}
export const ptsToMl=(g,pts)=>pts*TUNING.legacyPtMlFrac*g.profile.ebvMl;
export const scaleOf=g=>g.profile.ebvMl/TUNING.refEbvMl;
// Native + crystalloid volume in the vessels (mL), without the virtual drug support.
export const vascularVolume=g=>Math.max(1,g.profile.ebvMl-g.phys.lostMl+g.phys.crystIvMl);
export const hbOf=g=>g.phys.hbMassG/(vascularVolume(g)/100);
export const supportPts=g=>Math.min(TUNING.supportCapPts,activeModifiers(g).reduce((n,d)=>n+(d.circulationSupport||0),0));
// Effective preload volume: blood + crystalloid − plasma deficit + drug/support bonus as virtual volume.
export const effectiveVolume=(g,support=supportPts(g))=>g.profile.ebvMl-g.phys.lostMl+g.phys.crystIvMl-g.phys.plasmaDeficitMl+ptsToMl(g,support);
export const bloodMirror=g=>bounded(100-200*(g.phys.lostMl+g.phys.plasmaDeficitMl)/g.profile.ebvMl,0,100);
const A_HR=1-Math.exp(-1/CV_TUNING.tauHrS),A_SVR=1-Math.exp(-1/CV_TUNING.tauSvrS);
// One baroreflex step: lagged HR/SVR follow the MAP error; MAP = CO·SVR (all relative to the normals).
export function circulate(g,support){
  const T=CV_TUNING,p=g.phys,pre=effectiveVolume(g,support)/g.profile.ebvMl;
  const sv=Math.pow(bounded((pre-T.p0)/(1-T.p0),0,T.svMax),T.gamma);
  const pressure=()=>p.hr/NORMALS.hr*sv*p.svrIdx*NORMALS.map;
  const e=bounded((NORMALS.map-pressure())/NORMALS.map,-.3,1);
  const hrTarget=e>=0?NORMALS.hr+(T.hrMax-NORMALS.hr)*Math.tanh(e/T.e0):NORMALS.hr*(1+e);
  p.hr+=(hrTarget-p.hr)*A_HR;p.svrIdx+=(bounded(1+T.kSvr*e,T.svrMin,T.svrCap)-p.svrIdx)*A_SVR;
  const map=pressure(),pp=NORMALS.pp*Math.pow(sv,T.ppExp);
  p.sv=sv*NORMALS.svMl*scaleOf(g);p.map=map;p.sbp=map+2*pp/3;p.dbp=Math.max(0,map-pp/3);
}
export function settleCirculation(g,steps=400){const support=supportPts(g);for(let i=0;i<steps;i++)circulate(g,support);g.phys.lowMapS=0;}
// `oxygen` (legacy SpO2 scale) seeds the respiratory state: SaO2 = oxygen, PaO2 by inverted Severinghaus.
export function initPhys(g,blood=100,oxygen=g.oxygen){
  const ebv=g.profile.ebvMl,lostMl=Math.max(0,100-blood)*TUNING.legacyPtMlFrac*ebv;
  g.phys={lostMl,hbMassG:g.profile.hb0*(ebv-lostMl)/100,crystIvMl:0,crystInMl:0,plasmaDeficitMl:0,hr:NORMALS.hr,svrIdx:1,map:NORMALS.map,sbp:NORMALS.sbp,dbp:NORMALS.dbp,sv:NORMALS.svMl,reserve:1,lowMapS:0,injuryMl:{},boneMl:{}};
  settleCirculation(g);initRespiration(g,oxygen);
  return g.phys;
}
// Changes to blood/oxygen from content (protocol consequences, toxicity, allergy, hypoxic strain).
// kinds: bleed {ml|pts}, plasma {ml|pts}, oxygen {pts} (legacy SpO2 points: the store drops now and a desaturation
// debt of the same size, halved on high FiO2, fades over ~30 min), temperature {delta}.
export function applyInsult(g,insult){
  const p=g.phys,amount=insult.ml??(Number.isFinite(insult.pts)?ptsToMl(g,insult.pts):0);
  if(insult.kind==='bleed'&&amount>0){p.hbMassG=Math.max(0,p.hbMassG-amount*hbOf(g)/100);p.lostMl+=amount;}
  else if(insult.kind==='plasma'&&amount>0)p.plasmaDeficitMl+=amount;
  else if(insult.kind==='oxygen'&&Number.isFinite(insult.pts)){p.sao2=bounded(p.sao2+insult.pts/100,0,1);if(insult.pts<0)p.o2Debt=Math.min(.5,p.o2Debt-insult.pts/100);g.oxygen=p.sao2*100;}
  else if(insult.kind==='temperature')g.temperature=bounded(g.temperature+insult.delta,32,40.5);
  g.blood=bloodMirror(g);
}
const memo=new WeakMap();
const keyOf=g=>[g.elapsed,g.actions,g.phys.sao2,g.phys.paco2,g.phys.rr,g.initialUnconscious,g.injuries.length,g.temperature,g.status,Boolean(g.arrest),Boolean(g.resuscitating),g.airway,g.medications.length,(g.supports||[]).length,g.phys.lostMl,g.phys.crystIvMl,g.phys.plasmaDeficitMl,g.phys.hr,g.phys.map];
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
// Pure, memoised per state object (keyed by elapsed, actions and the physiology it reads).
export function clinicalSnapshot(g){
  const key=keyOf(g),hit=memo.get(g);
  if(hit&&hit.phys===g.phys&&same(hit.key,key))return hit.snap;
  const snap=computeSnapshot(g);memo.set(g,{key,phys:g.phys,snap});return snap;
}
function computeSnapshot(g){
  const p=g.phys,ebv=g.profile.ebvMl,dead=g.status==='lost'||Boolean(g.arrest),support=supportPts(g);
  const lossFrac=p.lostMl/ebv,perfusion=bounded(200*effectiveVolume(g,support)/ebv-100,0,100);
  const extra=pain(g)*2+activeModifiers(g).reduce((n,d)=>n+(d.pulseIncrease||0),0);
  const spo2=bounded(p.sao2*100,0,100),tempC=g.temperature,gcs=gcsOf(g),conscious=gcs>=9;
  const lowGlucose=g.injuries.some(i=>INJURIES[i.type]?.tags.includes('glucoseLow'));
  const glucoseUnits=bounded((lowGlucose?42:96)+activeModifiers(g).reduce((n,d)=>n+(d.glucoseSupport||0),0),15,180);
  const cls=hemorrhageClass(lossFrac);
  return {lossFrac,lostMl:p.lostMl,ebvMl:ebv,hemorrhageClass:cls.cls,hemorrhageLabel:cls.label,perfusion,support,
    hb:hbOf(g),reserve:p.reserve,
    hr:dead?0:p.hr+extra,map:dead?(g.arrest?p.map:0):p.map,sbp:dead?(g.arrest?p.sbp:0):p.sbp,dbp:dead?(g.arrest?p.dbp:0):p.dbp,
    spo2,pao2:p.pao2,paco2:p.paco2,etco2:dead&&!g.resuscitating?0:Math.max(0,p.paco2-4),fio2:p.fio2,vaFrac:p.vaFrac,shunt:p.shunt,aaExtra:p.aaExtra,
    rr:dead?0:p.rr,tempC,conscious,gcs,avpu:avpuOf(gcs),canSwallow:gcs>=14,toleratesOPA:gcs<=8,
    glucose:Math.round(glucoseUnits/18*10)/10,glucoseUnits,lactate:null,
    causes:{hypovolaemia:lossFrac>=.3||perfusion<55,hypoxia:spo2<88,hypothermia:tempC<35,obstruction:g.injuries.some(i=>INJURIES[i.type]?.tags.includes('airway'))&&!g.airway,hypercapnia:p.paco2>55}};
}
// Deterministic monitor noise in [-1, 1]: hash of the patient seed and the second.
export function noise(g,channel=0){
  let h=(g.profile.seed^Math.imul(g.elapsed+1,0x9e3779b1)^Math.imul(channel+1,0x85ebca6b))>>>0;
  h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0;h=Math.imul(h^(h>>>12),0x297a2d39)>>>0;
  return ((h^(h>>>15))>>>0)/2147483647.5-1;
}
