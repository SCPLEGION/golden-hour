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
// Injuries without their own entry take the first matching tag default.
export const TAG_DEFAULTS = {
  wound:VENOUS, internal:{vessel:'internal',pExp:1.2},
  ...Object.fromEntries(['bruise','airway','bronchospasm','cold','sprain','eyes','nausea','poisoning','anaphylaxis','glucoseLow','dehydration','heat','headTrauma','spine','neuro','opioidOd','airwayFluid','fracture'].map(t=>[t,NONE]))
};
function resolve(id){
  const def=INJURIES[id],own=INJURY_PHYSIOLOGY[id],tag=def?.tags.find(t=>TAG_DEFAULTS[t]);
  const base=own||(tag&&TAG_DEFAULTS[tag]);
  return base?{vessel:'none',pExp:0,bone:false,capMl:0,...base,rate:base.rate??(def.bleed||0)*TUNING.legacyMlMinPerPtS}:null;
}
let table=null;
const build=()=>Object.fromEntries(Object.keys(INJURIES).map(id=>[id,resolve(id)]));
// Resolved entry (rate in mL/min for the reference patient); catalogs are frozen after validation.
export const injuryPhysiology=id=>(table??=build())[id]??resolve(id);
export function validateInjuryPhysiology(){
  table=null;
  for(const id of Object.keys(INJURY_PHYSIOLOGY))if(!INJURIES[id])throw new Error(`Physiology for unknown injury: ${id}`);
  for(const id of Object.keys(INJURIES)){
    const p=resolve(id);
    if(!p)throw new Error(`Missing injury physiology: ${id}`);
    if(!(Number.isFinite(p.rate)&&p.rate>=0&&Number.isFinite(p.pExp)&&p.pExp>=0&&p.pExp<=2&&Number.isFinite(p.capMl)&&p.capMl>=0))throw new Error(`Invalid injury physiology: ${id}`);
  }
  table=build();
}
