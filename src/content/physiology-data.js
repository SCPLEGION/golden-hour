// Reference physiology for simulation/physio-*.js. R = textbook range, G = game tuning.
// Nothing here is shown to the player as clinical guidance.
export const NORMALS = {
  hr:72,            // R: resting adult 60–100
  map:90,           // R: 70–100; also the baroreflex set point
  sbp:120, dbp:75,  // R
  pp:45,            // R: pulse pressure SBP−DBP
  spo2:98, rr:16, tempC:36.7, glucoseMmol:5.3,
  hb:{M:15,F:13.5},          // R: g/dL
  ebvPerKg:{M:70,F:65},      // R: mL/kg
  svMl:70                    // R: stroke volume at the reference EBV
};
// ATLS hemorrhage classes (R). `sbp` upper bound null = no limit; "norma" means ≥100 in the calibration test.
export const HEMORRHAGE_CLASSES = [
  {cls:1,label:'I',upTo:.15,hr:[null,100],sbp:[100,null],rr:[14,20],mental:'lekki niepokój'},
  {cls:2,label:'II',upTo:.30,hr:[100,120],sbp:[100,null],rr:[20,30],mental:'niepokój'},
  {cls:3,label:'III',upTo:.40,hr:[120,140],sbp:[70,90],rr:[30,40],mental:'splątanie'},
  {cls:4,label:'IV',upTo:Infinity,hr:[140,null],sbp:[null,70],rr:[35,null],mental:'letarg'}
];
export const hemorrhageClass=lossFrac=>HEMORRHAGE_CLASSES.find(c=>lossFrac<c.upTo)||HEMORRHAGE_CLASSES.at(-1);
export const TUNING = {
  refEbvMl:5250,            // G: 75 kg × 70 mL/kg; legacy content was balanced for this patient
  legacyPtMlFrac:.005,      // G: one legacy blood point = 0.5% EBV (blood 100 → 0 = 50% EBV)
  legacyMlMinPerPtS:1575,   // G: 1 pt/s × 0.5% × 5250 mL × 60 s
  hypoxicStrainPts:.08,     // G: legacy "oxygen < 60" circulatory strain per second, as plasma deficit
  supportCapPts:12,         // G: cap of drug/support circulation bonuses (legacy points)
  bagMl:500,                // R: one crystalloid bag
  infusionMlMin:100,        // G: gravity line at 100% flow
  infusionMaxS:3600,        // G: a stalled bag is dropped after an hour
  crystalloidRetain:.25,    // R: ~25% of crystalloid stays intravascular
  crystalloidTauS:1200,     // R: redistribution τ ≈ 20 min
  boneTauMin:30,            // R: fracture haematoma fills over ~30 min
  splintBone:.6,            // G: splint keeps 60% of the hidden fracture loss
  // R: hidden blood loss of a fracture by segment (mL, 75 kg); scaled by EBV like every rate.
  boneCapMl:{Thigh:1200,Hip:1200,Knee:750,Shin:750,Ankle:250,Foot:100,UpperArm:600,Shoulder:600,Elbow:350,Forearm:350,Wrist:100,Hand:100,pelvis:2000,chest:250,back:250},
  boneCapDefault:250,
  roscLeakFracMin:.0105     // G: legacy 0.035 pt/s bleeding still allows ROSC (fraction of EBV per minute)
};
// Circulation model constants (G, calibrated by tests/physio.calibration.test.js against HEMORRHAGE_CLASSES).
export const CV_TUNING = {
  p0:.4, gamma:1.3,         // SV = SV0·clamp((preload−p0)/(1−p0))^γ
  svMax:1.15,               // hypervolaemia raises SV a little at most
  hrMax:155, e0:.2,         // baroreflex HR = HR0+(hrMax−HR0)·tanh(e/e0), e = (MAPset−MAP)/MAPset
  kSvr:2.5, svrMin:.7, svrCap:1.6,
  tauHrS:6, tauSvrS:15,     // reflex lag (τ ≥ 5 s)
  ppExp:.5,                 // PP = PP0·(SV/SV0)^ppExp
  pfMin:.1, pfMax:1.5,      // pressure factor range for bleeding
  reserveCrit:.85,          // coronary supply DBP/70 × Hb rel. below this drains the reserve
  reserveDrainS:40,         // full drain at zero supply
  reserveRecoverS:600,
  arrestMap:35, arrestMapS:20,
  roscReserve:.35, cprMap:22
};
