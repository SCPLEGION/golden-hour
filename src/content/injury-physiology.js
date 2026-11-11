// Physiology of each injury (plan: "Dane urazów"). P4: `rate` is the realistic table (mL/min at MAP 90 for the 75 kg
// reference patient, scaled by EBV/5250 and TUNING.bleedScale at runtime); `pExp` = dependence of the flow on pressure,
// (MAP/90)^pExp (orifice flow ~√ΔP for arteries, venous and capillary oozing far less pressure dependent).
// `bone` = hidden fracture loss by segment (TUNING.boneCapMl), `capMl` = total loss cap of a contained bleed.
// Values are game balance (G) built on textbook ranges (R); not clinical guidance.
import { INJURIES } from './injuries.js';
import { TBSA } from './physiology-data.js';
const ARTERIAL={vessel:'arterial',pExp:.5},MIXED={vessel:'mixed',pExp:.5},VENOUS={vessel:'venous',pExp:.3},CAPILLARY={vessel:'capillary',pExp:.2},NONE={vessel:'none',pExp:0,rate:0};
const r=(base,rate,extra={})=>({...base,rate,...extra});
export const INJURY_PHYSIOLOGY = {
  gunshot:r(MIXED,60), arterial:r(ARTERIAL,300), avulsion:r(MIXED,90), shrapnel:r(MIXED,35), glassEmbedded:r(MIXED,30), biteWound:r(MIXED,25),
  openFracture:r(VENOUS,25,{bone:true}), fracture:{...NONE,bone:true}, ribFracture:{...NONE,bone:true},
  dislocation:NONE, stressFracture:NONE,
  internal:{vessel:'internal',pExp:1.2,rate:40},
  crushInjury:{vessel:'internal',pExp:.8,rate:20,capMl:1500}, thighHematoma:{vessel:'internal',pExp:.8,rate:15,capMl:800},
  laceration:r(VENOUS,40), puncture:r(VENOUS,20), scalpCut:r(VENOUS,30), noseBleed:r(VENOUS,10), partialAmputation:r(VENOUS,25),
  chestWound:r(VENOUS,12), hiddenChestWound:r(VENOUS,9), lungContusion:{vessel:'internal',pExp:1.2,rate:0},
  abrasion:r(CAPILLARY,5),
  // Burns do not bleed: they leak plasma and lose heat by %TBSA (BURNS).
  thermalBurn:NONE, chemicalBurn:NONE, electricalBurn:NONE, flashBurn:NONE,
  amputationHand:r(ARTERIAL,120), amputationForearm:r(ARTERIAL,180), amputationFoot:r(ARTERIAL,140), amputationShin:r(ARTERIAL,250)
};
// Burns (P4, physio-thermal.js): `frac` = burned share of the injured segment [at onset, fully progressed] (TBSA% =
// TBSA[segment]·frac), `tauS` = progression τ until an item in `stoppedBy` is applied to the wound (chemical burns keep
// spreading until irrigated), `superficial` = erythema-type burn with little plasma leak.
export const BURNS = {
  thermalBurn:{frac:[.6,.6]},
  flashBurn:{frac:[.5,.5],superficial:true},
  electricalBurn:{frac:[.05,.05]},
  chemicalBurn:{frac:[.3,.9],tauS:600,stoppedBy:['salineIrrigation']}
};
export const segmentTbsa=part=>TBSA[part]??TBSA[String(part).replace(/^(left|right)/,'')]??0;
// Respiratory physiology (P2, simulation/physio-respiration.js). Components, each [at onset, fully progressed]:
// `obstruct` upper-airway ventilation factor (removed by an opened airway for 'airway'-tagged injuries), `va` ventilation
// factor (bronchospasm, chest mechanics), `depress` central depression (lowers RR too), `aa` extra A–a gradient in mmHg
// (V/Q mismatch, answers to oxygen), `shunt` fraction (does not), `painVa` ventilation at pain ≥ 8 (rib splinting,
// relieved by analgesia), `tauS` progression τ. Relief r (matching drug, seal quality, suction/irrigation) scales every
// component by (1 − r) and pulls the progression back toward 0. An entry here marks a respiratory injury (care policies give oxygen).
export const RESPIRATORY = {
  chestWound:{shunt:[.126,.33],aa:[12.6,17],va:[.81,.75],tauS:180},          // open pneumothorax progresses unless sealed
  hiddenChestWound:{shunt:[.084,.3],aa:[11,16],va:[.83,.75],tauS:240},
  obstruction:{obstruct:[.524,.25],tauS:240},                                   // → vaFrac .25 until the airway is opened
  asthma:{va:[.714,.43],aa:[25.5,30],tauS:1800},                                // bronchospasm + fatigue
  ribFracture:{painVa:.716,aa:[11.4,11.4]},                                     // splinting relieved by analgesia
  lungContusion:{shunt:[.167,.19],aa:[22,23],tauS:900},                          // shunt rising
  smokeExposure:{aa:[35,37],tauS:1200},
  aspiration:{obstruct:[.625,.4],aa:[14,23],tauS:300},                            // → vaFrac .4 until suction
  allergicReaction:{va:[.725,.68],aa:[18,22],tauS:600},                         // bronchospasm component of anaphylaxis
  stingAnaphylaxis:{va:[.758,.7],aa:[14.5,20],tauS:600},
  hypoglycemia:{aa:[10,10]}, dehydration:{aa:[3,3]}, heatExhaustion:{aa:[8,8]},
  heatStroke:{aa:[28.7,32],tauS:900},
  coPoisoning:{aa:[36.5,38],tauS:900},                                          // tissue hypoxia proxy (no COHb in P2)
  opioidOverdose:{obstruct:[.752,.65],depress:[.67,.5],reliefTag:'opioid',tauS:600},
  postIctal:{obstruct:[.596,.5],aa:[9.2,12],tauS:600},
  headBleedSevere:{obstruct:[.7,.45],tauS:600}, strokeSevere:{obstruct:[.72,.45],tauS:600},
  spinalCordInjury:{va:[.7,.5],tauS:600}                                       // diaphragm weakness
};
// Circulatory components (P3): anaphylaxis leaks plasma (mL/min for the 75 kg reference, scaled by EBV) and lowers SVR
// (target × svr); the `relievesTag` drug (adrenaline) stops both in proportion to its effect. An injury's `scale`
// (allergy created by a drug, by delivered amount) scales these and the respiratory components.
export const CIRCULATORY = {
  allergicReaction:{leakMlMin:30,svr:.7},   // R (plan): SVR × .7, plasma leak 30 mL/min
  stingAnaphylaxis:{leakMlMin:25,svr:.75}
};
// Injury GCS deficits (P3, simulation/physio-neuro.js): [at onset, recovered]; `tauS` = recovery τ (after the airway is
// opened for an unconscious presentation). Max-of-components with the physiological deficits.
export const NEURO_INJURY = {
  postIctal:{gcs:[4,0],tauS:900},   // R: post-ictal confusion clears over ~15–30 min
  headInjury:{gcs:[1,1]},           // repeats questions: confused (GCS 14)
  strokeSigns:{gcs:[1,1]}           // slurred speech
};
const RESP_KEYS=['obstruct','va','depress','aa','shunt'];
const validResp=r=>RESP_KEYS.every(k=>r[k]===undefined||(Array.isArray(r[k])&&r[k].length===2&&r[k].every(n=>Number.isFinite(n)&&n>=0&&(k==='aa'||n<=1))))&&(r.painVa===undefined||(r.painVa>0&&r.painVa<=1))&&(r.tauS===undefined||r.tauS>=5);
// Injuries without their own entry take the first matching tag default.
export const TAG_DEFAULTS = {
  wound:r(VENOUS,20), internal:{vessel:'internal',pExp:1.2,rate:20},
  ...Object.fromEntries(['bruise','airway','bronchospasm','cold','sprain','eyes','nausea','poisoning','anaphylaxis','glucoseLow','dehydration','heat','headTrauma','spine','neuro','opioidOd','airwayFluid','fracture'].map(t=>[t,NONE]))
};
function resolve(id){
  const def=INJURIES[id],own=INJURY_PHYSIOLOGY[id],tag=def?.tags.find(t=>TAG_DEFAULTS[t]);
  const base=own||(tag&&TAG_DEFAULTS[tag]);
  return base?{vessel:'none',pExp:0,bone:false,capMl:0,rate:0,...base,resp:RESPIRATORY[id]??null,burn:BURNS[id]??null}:null;
}
let table=null;
const build=()=>Object.fromEntries(Object.keys(INJURIES).map(id=>[id,resolve(id)]));
// A respiratory injury (has a RESPIRATORY entry): care policies and guides treat it as an oxygenation problem.
export const respiratoryInjury=id=>Boolean(RESPIRATORY[id]);
// Resolved entry (rate in mL/min for the reference patient); catalogs are frozen after validation.
export const injuryPhysiology=id=>(table??=build())[id]??resolve(id);
export function validateInjuryPhysiology(){
  table=null;
  for(const id of [...Object.keys(INJURY_PHYSIOLOGY),...Object.keys(BURNS),...Object.keys(RESPIRATORY),...Object.keys(CIRCULATORY),...Object.keys(NEURO_INJURY)])if(!INJURIES[id])throw new Error(`Physiology for unknown injury: ${id}`);
  for(const [id,r] of Object.entries(RESPIRATORY))if(!validResp(r))throw new Error(`Invalid respiratory physiology: ${id}`);
  for(const [id,b] of Object.entries(BURNS))if(!INJURIES[id]||!(Array.isArray(b.frac)&&b.frac.length===2&&b.frac.every(n=>n>=0&&n<=1))||(b.tauS!==undefined&&!(b.tauS>=5)))throw new Error(`Invalid burn physiology: ${id}`);
  for(const id of Object.keys(INJURIES)){
    const p=resolve(id);
    if(!p)throw new Error(`Missing injury physiology: ${id}`);
    if(!(Number.isFinite(p.rate)&&p.rate>=0&&Number.isFinite(p.pExp)&&p.pExp>=0&&p.pExp<=2&&Number.isFinite(p.capMl)&&p.capMl>=0))throw new Error(`Invalid injury physiology: ${id}`);
  }
  table=build();
}
