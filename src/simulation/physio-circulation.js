// One second of circulation in mL: bleeding (pressure dependent, coagulopathy and wound clots, contained caps, hidden
// fracture loss), burn and anaphylactic plasma leak, crystalloid bags with redistribution and haemodilution, baroreflex
// haemodynamics and the cardiac reserve.
import { NORMALS, TUNING, CV_TUNING, RESP_TUNING } from '../content/physiology-data.js';
import { injuryPhysiology, CIRCULATORY } from '../content/injury-physiology.js';
import { difficultyById } from '../content/difficulty.js';
import { bodyPart } from '../content/body.js';
import { injuryBleeding, activeDrugDefinitions, splinted } from './selectors.js';
import { flowEfficiency, tourniquetQuality } from './vascular.js';
import { woundModifiers, bounded } from './modifiers.js';
import { circulate, hbOf, supportPts, scaleOf, drugRelief, injuryScale } from './physio-model.js';
import { woundHemostasis, coagBleedFactor } from './physio-hemostasis.js';
import { burnLeakMlMin } from './physio-thermal.js';
const A_CRYST=1-Math.exp(-1/TUNING.crystalloidTauS);
// Difficulty × the global knob × drug channels (TXA antifibrinolysis below 1, ibuprofen platelet effect above).
export const bleedMultiplier=g=>difficultyById(g.difficulty).bleedMultiplier*TUNING.bleedScale*activeDrugDefinitions(g).reduce((n,d)=>n*(d.bleedingMultiplier??1),1);
const segmentKey=id=>id.replace(/^(left|right)/,'');
// Hidden fracture loss (mL/min at MAP 90): fills toward the segment cap with τ 30 min; splint ×.6,
// a proximal tourniquet stops it with the rest of the limb.
export function boneRate(g,injury){
  if(!injuryPhysiology(injury.type)?.bone)return 0;
  const T=TUNING,cap=(T.boneCapMl[segmentKey(injury.part)]??T.boneCapDefault)*scaleOf(g)*(splinted(g,injury.part)?T.splintBone:1)*woundModifiers(injury).bleedingMultiplier;
  const occlusion=bodyPart(injury.part)?.limb?tourniquetQuality(g,injury.part)??0:0;
  return Math.max(0,cap-(g.phys.boneMl[injury.id]||0))/T.boneTauMin*(1-occlusion);
}
const pressureFactor=(g,pExp)=>pExp?Math.pow(bounded(g.phys.map/NORMALS.map,CV_TUNING.pfMin,CV_TUNING.pfMax),pExp):1;
// Returns the nominal (pressure-independent) bleeding as a fraction of EBV per minute, used for ROSC.
export function stepCirculation(g){
  const p=g.phys,T=CV_TUNING,ebv=g.profile.ebvMl,mult=bleedMultiplier(g),coag=coagBleedFactor(g);
  let shed=0,nominal=0;
  for(const injury of g.injuries){
    const phys=injuryPhysiology(injury.type);if(!phys)continue;
    const rate=injuryBleeding(g,injury)*mult;
    if(rate>0){
      const pf=pressureFactor(g,phys.pExp),f=woundHemostasis(g,injury,phys.vessel,rate*pf);
      nominal+=rate*f;
      let ml=rate*pf*f/60;
      if(phys.capMl){ml=Math.min(ml,Math.max(0,phys.capMl*scaleOf(g)-(p.injuryMl[injury.id]||0)));p.injuryMl[injury.id]=(p.injuryMl[injury.id]||0)+ml;}
      shed+=ml;
    }
    const bone=phys.bone?boneRate(g,injury)*mult*coag*pressureFactor(g,.5)/60:0;
    if(bone>0){p.boneMl[injury.id]=(p.boneMl[injury.id]||0)+bone;shed+=bone;}
  }
  if(shed>0){p.hbMassG=Math.max(0,p.hbMassG-shed*hbOf(g)/100);p.lostMl+=shed;}
  // Anaphylactic capillary leak (CIRCULATORY), stopped in proportion to the relieving drug's effect.
  for(const injury of g.injuries){const c=CIRCULATORY[injury.type];if(c)p.plasmaDeficitMl+=c.leakMlMin/60*scaleOf(g)*injuryScale(g,injury)*(1-drugRelief(g,injury));}
  // Burn capillary leak by %TBSA (physio-thermal.js).
  p.plasmaDeficitMl+=burnLeakMlMin(g)/60;
  p.infusedMl=0;
  for(const infusion of g.infusions){
    if(!(infusion.end>g.elapsed&&infusion.ml>0))continue;
    const flow=flowEfficiency(g,infusion.site);
    if(flow>.05){const ml=Math.min(infusion.ml,TUNING.infusionMlMin/60*flow);infusion.ml=Math.max(0,infusion.ml-ml);p.crystIvMl+=ml;p.crystInMl+=ml;p.infusedMl+=ml;}
    if(infusion.ml<=1e-9){infusion.ml=0;infusion.end=g.elapsed;}
  }
  p.crystIvMl+=(TUNING.crystalloidRetain*p.crystInMl-p.crystIvMl)*A_CRYST;
  if(g.arrest){
    p.sv=0;p.map=g.resuscitating?T.cprMap*(g.cprBenefit??1):0;p.sbp=p.map*1.4;p.dbp=p.map*.75;p.lowMapS=0;
  }else{
    circulate(g,supportPts(g));
    // Coronary supply ≈ diastolic pressure × O2 content (Hb × SaO2), relative to normal.
    const supply=p.dbp/70*Math.min(1.2,hbOf(g)/g.profile.hb0)*Math.min(1,p.sao2/RESP_TUNING.reserveSpo2);
    p.reserve=supply<T.reserveCrit?Math.max(0,p.reserve-(T.reserveCrit-supply)/T.reserveCrit/T.reserveDrainS):Math.min(1,p.reserve+(supply-T.reserveCrit)/T.reserveRecoverS);
    p.lowMapS=p.map<T.arrestMap?p.lowMapS+1:0;
  }
  return nominal/ebv;
}
export const arrestDue=g=>g.phys.reserve<=0||g.phys.lowMapS>=CV_TUNING.arrestMapS;
