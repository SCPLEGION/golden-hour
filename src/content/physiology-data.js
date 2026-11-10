// Reference physiology for simulation/physio-*.js. R = textbook range, G = game tuning.
// Nothing here is shown to the player as clinical guidance.
export const NORMALS = {
  hr:72,            // R: resting adult 60–100
  map:90,           // R: 70–100; also the baroreflex set point
  sbp:120, dbp:75,  // R
  pp:45,            // R: pulse pressure SBP−DBP
  spo2:98, rr:16, paco2:40, tempC:36.7, glucoseMmol:5.3,
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
  roscLeakFracMin:.0105,    // G: legacy 0.035 pt/s bleeding still allows ROSC (fraction of EBV per minute)
  allergyScale:.5, allergyRampS:300 // G: an ignored allergy → anaphylaxis at half the picnic severity × delivery, developing over 5 min
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
// Oxygenation and ventilation (P2, simulation/physio-respiration.js). Calibrated by tests/physio.respiration.test.js:
// each scenario's untreated SpO2 at 60 s lands within ±4 of its legacy `oxygen` start value.
export const RESP_TUNING = {
  patm:713,                 // R: (760 − 47) mmHg, alveolar gas equation PAO2 = FiO2·713 − PaCO2/0.8
  rq:.8,                    // R: respiratory quotient
  fio2:{air:.21,nrb:.7,bvm:.9}, // R: room air, non-rebreather 15 L/min (~.7), bag-valve-mask with oxygen (~.9)
  cylinderL:150, flowLpm:15, // G: game cylinder 150 L at 15 L/min = today's 10-minute window
  aa0:5, shunt0:.02,        // R: normal A–a gradient (mmHg) and physiological shunt
  extraction:.24,           // R: normal Sa−Sv (VO2/DO2 ≈ 25%); Sv falls as cardiac output × Hb falls
  svFloor:.15,
  paco2Max:150, vaMin:.05, apnoeaVa:.05,
  tauCo2S:20,               // G: PaCO2 lag
  tauUpS:20, tauAirS:20, tauHighS:90, tauStoreS:60, // R/G: O2 store lag (20 s on air, 90 s after high FiO2)
  tauShownS:6,              // G: pulse-oximeter averaging
  tauRrS:5,
  softTissue:.4,            // R/G: GCS ≤ 8 without airway support → soft-tissue obstruction, vaFrac × .4 at GCS 3 rising to .7 at GCS 8
  burdenK:.35,              // G: drug respiratory burden → ventilation ×1/(1+k·burden)
  supportAaPerUnit:800,     // G: legacy oxygenSupport .01 pt/s → −8 mmHg A–a
  insultTauS:1800,          // G: legacy "oxygen −N" consequence → SpO2 −N now and a desaturation debt of N points
                            //    (halved on high FiO2) fading over ~30 min — linear like the legacy points, no cliff
  hypoxicArrestSpo2:50, hypoxicArrestS:30, // R/G: SpO2 < 50 for 30 s → arrest
  reserveSpo2:.96           // coronary supply term × min(1, SaO2/.96)
};
// Pharmacology (P3, simulation/physio-pharmacology.js). One compartment with first-order absorption from a depot,
// first-order elimination and an effect site with lag ke0; effect = Emax·Ce^n/(EC50^n + Ce^n). Ce is normalised so
// one full porcja peaks at 1. Times are game seconds, R = textbook profile, G = game compression/tuning.
// Routes: absorption half-time and lag (R: IV ~instant; IM onset 3–5 min, peak 10–15; inhaled ~5 min;
// oral onset 20–40 min, peak 45–90; topical 2–5 min).
export const PK_ROUTES = {
  IV:{absHalfS:10,lagS:0}, IM:{absHalfS:240,lagS:0}, Wziewnie:{absHalfS:300,lagS:0},
  Doustnie:{absHalfS:720,lagS:480}, Miejscowo:{absHalfS:90,lagS:0}
};
// Elimination half-life categories (game minutes; G — compressed where the real value would outlast every run).
export const HALF_LIFE_MIN = {veryShort:10, short:20, medium:60, long:150, veryLong:300};
// Channels and the item field each one scales (`emax` absent → the item's legacy value is the single-porcja peak):
// analgesia → painRelief, relief → strength of `relievesTag` relief 0..1, respDepression → respiratory burden (feeds the
// central depression of physio-respiration), antagonism → respiratoryRelief of the opioid tag 0..1, sedation → GCS points,
// hr → pulseIncrease bpm, volume → circulationSupport (virtual volume), oxygen → oxygenSupport, bleeding →
// bleedingMultiplier (TXA antifibrinolysis below 1, ibuprofen above), glucose → mmol/L rise.
// The first channel decides whether a drug is "active" (> 10% of its Emax) and the support-panel bar.
export const PHARMACOLOGY = {
  morphine:{half:'long',ke0HalfS:600,channels:{analgesia:{ec50:.35,n:1.5},respDepression:{ec50:2.2,n:2},sedation:{emax:7,ec50:2.6,n:3}}},
  fentanyl:{half:'short',ke0HalfS:180,channels:{analgesia:{ec50:.35,n:1.5},respDepression:{ec50:1.8,n:2},sedation:{emax:7,ec50:2.3,n:3}}},
  ketamine:{half:'veryShort',ke0HalfS:60,channels:{analgesia:{ec50:.35,n:1.5},hr:{ec50:.5,n:1},respDepression:{ec50:3,n:2},sedation:{emax:8,ec50:2.2,n:3}}},
  paracetamol:{half:'long',ke0HalfS:600,channels:{analgesia:{ec50:.4,n:1.5}}},
  ibuprofen:{half:'long',ke0HalfS:600,channels:{analgesia:{ec50:.4,n:1.5},bleeding:{ec50:.4,n:1}}},
  metamizole:{half:'long',ke0HalfS:600,channels:{analgesia:{ec50:.4,n:1.5}}},
  txa:{half:'long',ke0HalfS:120,channels:{bleeding:{ec50:.15,n:1}}},
  salbutamol:{half:'veryLong',ke0HalfS:120,channels:{relief:{ec50:.3,n:1.5},hr:{ec50:.8,n:1.5}}},
  ipratropium:{half:'veryLong',ke0HalfS:900,channels:{relief:{ec50:.3,n:1.5},hr:{ec50:.8,n:1.5}}},
  adrenaline:{half:'veryShort',ke0HalfS:60,channels:{relief:{ec50:.3,n:1.5},volume:{ec50:.5,n:1.5},hr:{ec50:.6,n:1.5}}},
  naloxone:{half:'short',ke0HalfS:60,channels:{antagonism:{ec50:.25,n:2}}},
  ondansetron:{half:'veryLong',ke0HalfS:300,channels:{relief:{ec50:.3,n:1.5},analgesia:{ec50:.4,n:1.5}}},
  // R: corticosteroid effects need hours (gene transcription): modelled as a 90-minute lag — nothing within one run.
  hydrocortisone:{half:'veryLong',ke0HalfS:3600,lagS:5400,channels:{oxygen:{ec50:.6,n:3},analgesia:{ec50:.6,n:3}}},
  // G: buccal gel absorbs faster than a tablet; glucose is consumed (short effective half-life).
  glucoseGel:{half:'medium',ke0HalfS:60,absHalfS:180,lagS:30,channels:{glucose:{linear:true,emax:2.5},relief:{ec50:.3,n:1.5}}},
  chlorphenamine:{half:'veryLong',ke0HalfS:900,channels:{analgesia:{ec50:.4,n:1.5},respDepression:{ec50:2,n:2},sedation:{emax:3,ec50:2,n:2}}},
  lidocaineSpray:{half:'short',ke0HalfS:60,channels:{analgesia:{ec50:.35,n:1.5}}}
};
export const PK_TUNING = {
  activeFrac:.1,            // "active" = first channel above 10% of its Emax
  shockGain:1.5,            // G: shock shrinks the distribution volume → Ce × (1 + 1.5·s), s = (loss − 20%)/20% (legacy ×3.3 cliff)
  excessBurden:1, excessSedation:2 // log a warning when stacked doses exceed these (respiratory burden, GCS points)
};
// Heat balance (P3, simulation/physio-thermal.js): dT/dt = (Qmet − Qloss)/(m·3.47 kJ/kg/°C).
export const THERMAL = {
  cpKJ:3.47,                // R: body heat capacity kJ/kg/°C
  metWPerKg:1.2,            // R: resting metabolic heat, scaled by O2 delivery (.3–1.1)
  shiverWPerKg:2.4,         // R/G: full shivering ≈ 3× basal, from 36.5 °C down to 34 °C, absent ≤ 32 °C, blunted by shock/sedation
  shiverStartC:36.5, shiverFullC:34, shiverStopC:32,
  skinC:33, hW:3,           // G: Qloss = BSA·h·(33 − env)·(1 + wind·.1)·(1 + 3·wet)·exposure·(1 − insulation); h for a clothed patient on the ground
  windK:.1, wetK:3, examExposure:.4, // examining every segment exposes the patient (+40%)
  blanketInsulation:.65,    // R/G
  sweatStartC:37.2, sweatWPerC:60, sweatMaxW:250, // G: evaporative cooling while sweating (heat stroke: anhidrosis)
  burnW:10,                 // G: minimal evaporative loss per burn (no %TBSA data until P4)
  fluidC:20, waterKJ:4.18,  // R: bags at room temperature, 4.18 kJ/L/°C
  minC:20, maxC:44,
  vfC:28, roscC:30          // R: < 28 °C → VF; defibrillation succeeds only above 30 °C
};
// Default environment when a scenario declares none (G).
export const DEFAULT_ENVIRONMENT = {tempC:18,wet:0,wind:0};
// Glucose (P3): mmol/L. R: normal 4–7, < 3.9 hypoglycaemia, < 3.0 neuroglycopenia, < 2.2 coma.
export const GLUCOSE = {normal:5.3, hypoStart:2.7, hypoFloor:2.2, hypoTauS:3600, tauS:600};
// GCS deficits (P3, simulation/physio-neuro.js). Bands are [lower bound, deficit] checked in order.
export const NEURO = {
  glucose:[[3,0],[2.5,1],[2.2,3],[1.8,7],[-Infinity,10]],
  cold:[[34,0],[32,1],[30,3],[28,6],[-Infinity,9]],
  heat:[[40,0],[41,3],[42,5],[Infinity,8]]  // upper bounds: ≤ 40 none, ≤ 41 −3, ≤ 42 −5, above −8
};
