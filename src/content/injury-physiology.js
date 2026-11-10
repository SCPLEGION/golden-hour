// Physiology of each injury (plan: "Dane urazów"). Phase 1 keeps the legacy balance: `rate` (mL/min at
// MAP 90 for the 75 kg reference patient, scaled by EBV/5250 at runtime) defaults to the legacy
// `bleed` (points/s) × 1575. `pExp` = dependence of the flow on pressure, (MAP/90)^pExp.
// `bone` = hidden fracture loss by segment (TUNING.boneCapMl), `capMl` = total loss cap of a contained bleed.
// Values are game balance (G) built on textbook ranges (R); not clinical guidance.
import { INJURIES } from './injuries.js';
import { TUNING } from './physiology-data.js';
const ARTERIAL={vessel:'arterial',pExp:.5},MIXED={vessel:'mixed',pExp:.5},VENOUS={vessel:'venous',pExp:.3},CAPILLARY={vessel:'capillary',pExp:.2},NONE={vessel:'none',pExp:0};
export const INJURY_PHYSIOLOGY = {
  gunshot:MIXED, arterial:ARTERIAL, avulsion:MIXED, shrapnel:MIXED, glassEmbedded:MIXED, biteWound:MIXED,
  openFracture:{...VENOUS,bone:true}, fracture:{...NONE,bone:true}, ribFracture:{...NONE,bone:true},
  dislocation:NONE, stressFracture:NONE,
  internal:{vessel:'internal',pExp:1.2},
  crushInjury:{vessel:'internal',pExp:.8,capMl:1500}, thighHematoma:{vessel:'internal',pExp:.8,capMl:800},
  laceration:VENOUS, puncture:VENOUS, scalpCut:VENOUS, noseBleed:VENOUS, partialAmputation:VENOUS,
  chestWound:VENOUS, hiddenChestWound:VENOUS,
  abrasion:CAPILLARY, thermalBurn:CAPILLARY, chemicalBurn:CAPILLARY, electricalBurn:CAPILLARY, flashBurn:CAPILLARY,
  amputationHand:ARTERIAL, amputationForearm:ARTERIAL, amputationFoot:ARTERIAL, amputationShin:ARTERIAL
};
// Respiratory physiology (P2, simulation/physio-respiration.js). Components, each [at onset, fully progressed]:
// `obstruct` upper-airway ventilation factor (removed by an opened airway for 'airway'-tagged injuries), `va` ventilation
// factor (bronchospasm, chest mechanics), `depress` central depression (lowers RR too), `aa` extra A–a gradient in mmHg
// (V/Q mismatch, answers to oxygen), `shunt` fraction (does not), `painVa` ventilation at pain ≥ 8 (rib splinting,
// relieved by analgesia), `tauS` progression τ. Relief r (matching drug, seal quality, suction/irrigation) scales every
// component by (1 − r) and pulls the progression back toward 0. Every injury with a legacy `oxygenLoss` needs an entry.
export const RESPIRATORY = {
  chestWound:{shunt:[.126,.33],aa:[12.6,17],va:[.81,.75],tauS:180},          // open pneumothorax progresses unless sealed
  hiddenChestWound:{shunt:[.084,.3],aa:[11,16],va:[.83,.75],tauS:240},
  obstruction:{obstruct:[.524,.25],tauS:240},                                   // → vaFrac .25 until the airway is opened
  asthma:{va:[.714,.43],aa:[25.5,30],tauS:1800},                                // bronchospasm + fatigue
  ribFracture:{painVa:.716,aa:[11.4,11.4]},                                     // splinting relieved by analgesia
  lungContusion:{shunt:[.167,.21],aa:[22,25],tauS:900},                          // shunt rising
  smokeExposure:{aa:[35,40],tauS:1200},
  aspiration:{obstruct:[.625,.4],aa:[14,23],tauS:300},                            // → vaFrac .4 until suction
  allergicReaction:{va:[.725,.68],aa:[18,22],tauS:600},                         // bronchospasm component of anaphylaxis
  stingAnaphylaxis:{va:[.758,.7],aa:[14.5,20],tauS:600},
  hypoglycemia:{aa:[10,10]}, dehydration:{aa:[3,3]}, heatExhaustion:{aa:[8,8]},
  heatStroke:{aa:[28.7,32],tauS:900},
  coPoisoning:{aa:[36.5,40],tauS:900},                                          // tissue hypoxia proxy (no COHb in P2)
  opioidOverdose:{obstruct:[.752,.65],depress:[.67,.5],reliefTag:'opioid',tauS:600},
  postIctal:{obstruct:[.596,.5],aa:[9.2,12],tauS:600},
  headBleedSevere:{obstruct:[.7,.45],tauS:600}, strokeSevere:{obstruct:[.72,.45],tauS:600},
  spinalCordInjury:{va:[.7,.5],tauS:600}                                       // diaphragm weakness
};
const RESP_KEYS=['obstruct','va','depress','aa','shunt'];
const validResp=r=>RESP_KEYS.every(k=>r[k]===undefined||(Array.isArray(r[k])&&r[k].length===2&&r[k].every(n=>Number.isFinite(n)&&n>=0&&(k==='aa'||n<=1))))&&(r.painVa===undefined||(r.painVa>0&&r.painVa<=1))&&(r.tauS===undefined||r.tauS>=5);
// Injuries without their own entry take the first matching tag default.
export const TAG_DEFAULTS = {
  wound:VENOUS, internal:{vessel:'internal',pExp:1.2},
  ...Object.fromEntries(['bruise','airway','bronchospasm','cold','sprain','eyes','nausea','poisoning','anaphylaxis','glucoseLow','dehydration','heat','headTrauma','spine','neuro','opioidOd','airwayFluid','fracture'].map(t=>[t,NONE]))
};
function resolve(id){
  const def=INJURIES[id],own=INJURY_PHYSIOLOGY[id],tag=def?.tags.find(t=>TAG_DEFAULTS[t]);
  const base=own||(tag&&TAG_DEFAULTS[tag]);
  return base?{vessel:'none',pExp:0,bone:false,capMl:0,...base,rate:base.rate??(def.bleed||0)*TUNING.legacyMlMinPerPtS,resp:RESPIRATORY[id]??null}:null;
}
let table=null;
const build=()=>Object.fromEntries(Object.keys(INJURIES).map(id=>[id,resolve(id)]));
// Resolved entry (rate in mL/min for the reference patient); catalogs are frozen after validation.
export const injuryPhysiology=id=>(table??=build())[id]??resolve(id);
export function validateInjuryPhysiology(){
  table=null;
  for(const id of [...Object.keys(INJURY_PHYSIOLOGY),...Object.keys(RESPIRATORY)])if(!INJURIES[id])throw new Error(`Physiology for unknown injury: ${id}`);
  for(const [id,r] of Object.entries(RESPIRATORY))if(!validResp(r))throw new Error(`Invalid respiratory physiology: ${id}`);
  for(const [id,d] of Object.entries(INJURIES))if(d.oxygenLoss&&!RESPIRATORY[id])throw new Error(`Missing respiratory physiology: ${id}`);
  for(const id of Object.keys(INJURIES)){
    const p=resolve(id);
    if(!p)throw new Error(`Missing injury physiology: ${id}`);
    if(!(Number.isFinite(p.rate)&&p.rate>=0&&Number.isFinite(p.pExp)&&p.pExp>=0&&p.pExp<=2&&Number.isFinite(p.capMl)&&p.capMl>=0))throw new Error(`Invalid injury physiology: ${id}`);
  }
  table=build();
}
