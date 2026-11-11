import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, restoreGame, SCENARIOS } from '../src/engine.js';
import { tick } from '../src/simulation/physiology.js';
import { clinicalSnapshot, initPhys } from '../src/simulation/physio-model.js';
import { coagOf, coagParts } from '../src/simulation/physio-hemostasis.js';
import { injuryTbsa, burnTbsa, heatFlows } from '../src/simulation/physio-thermal.js';
import { profileOf } from '../src/simulation/physio-pharmacology.js';
import { woundBleeding, injuryBleeding } from '../src/simulation/selectors.js';
import { handoverQuality, scoreRun } from '../src/simulation/scoring.js';
import { injuryPhysiology, segmentTbsa } from '../src/content/injury-physiology.js';
import { BODY_PARTS } from '../src/content/body.js';
import { GUIDES } from '../src/content/guides.js';
import { act, bloodIndex, createGame } from './support.js';

const index=id=>SCENARIOS.findIndex(s=>s.id===id);
// A painless 75 kg patient indoors with the given injuries and legacy blood points; no ambulance due.
function patient(injuries=[],blood=100){
  const g=createGame(index('footballPitch'),()=>.5,{profile:{sex:'M',massKg:75}});
  g.injuries=injuries.map(([part,type],i)=>({id:`w${i}`,part,type,treatments:{}}));initPhys(g,blood,98);g.phys.env={tempC:20,wet:0,wind:0};return g;
}
const later=(g,s)=>{g=structuredClone(g);g.transportAt=null;for(let left=s;left>0&&g.status==='active';left-=600)g=advanceTime(g,Math.min(600,left));return g;};

test('realistic bleeding rates: arterial > avulsion > gunshot > laceration > abrasion; burns do not bleed',()=>{
  const rate=id=>injuryPhysiology(id).rate;
  const order=['arterial','avulsion','gunshot','laceration','abrasion'];
  for(let i=1;i<order.length;i++)assert.ok(rate(order[i-1])>rate(order[i]),order.slice(i-1,i+1).join(' > '));
  assert.deepEqual(order.map(rate),[300,90,60,40,5]);
  for(const [id,ml] of [['amputationHand',120],['amputationShin',250],['internal',40]])assert.equal(rate(id),ml,id);
  for(const id of ['thermalBurn','chemicalBurn','flashBurn','electricalBurn'])assert.equal(rate(id),0,id);
});

test('a dressed wound clots, and a MAP overshoot (fluids in deep shock) breaks the clot: the dressing seeps again',()=>{
  let g=act(patient([['leftThigh','gunshot']],20),'dressing','leftThigh','w0');
  const before=woundBleeding(g,g.injuries[0]);g=later(g,600);
  assert.ok(g.phys.clot.w0>=.8&&g.phys.clotMap.w0!==undefined,`clot ${g.phys.clot.w0}`);
  assert.ok(woundBleeding(g,g.injuries[0])<.35*before,`${woundBleeding(g,g.injuries[0])} vs ${before}`);
  // Permissive hypotension: a litre at full flow lifts MAP above what the clot holds.
  let wet=act(act(g,'iv','rightArm'),'fluid','rightArm');wet=act(act(wet,'iv','leftArm'),'fluid','leftArm');wet=later(wet,480);
  assert.ok(wet.log.some(e=>e.text==='Opatrunek ponownie przesiąka.'));
  const dry=later(g,600);assert.ok(!dry.log.some(e=>/przesiąka/.test(e.text))&&dry.phys.clotMap.w0!==undefined,'without the overshoot the clot holds');
  // An untreated laceration (40 mL/min) does not clot; capillary oozing self-clots.
  const open=later(patient([['leftThigh','laceration'],['rightShin','abrasion']]),600);
  assert.equal(open.phys.clotMap.w0,undefined);assert.ok(open.phys.clotMap.w1!==undefined);
});

test('coagulopathy: cold, dilution, acidosis and consumption lower coag, and lower coag bleeds more',()=>{
  const g=patient([['leftThigh','laceration']]),base=coagOf(g);assert.ok(base>.99);
  const cold=structuredClone(g);cold.temperature=33;assert.ok(Math.abs(coagParts(cold).cold-.7)<1e-9);
  const diluted=structuredClone(g);diluted.phys.crystIvMl=1500;assert.ok(coagParts(diluted).dilution<.8);
  const acid=structuredClone(g);acid.phys.ph=7.0;assert.ok(Math.abs(coagParts(acid).acidosis-.5)<1e-9);
  const lost=structuredClone(g);lost.phys.lostMl=.4*lost.profile.ebvMl;assert.ok(coagParts(lost).consumption<.9);
  for(const x of [cold,diluted,acid,lost])assert.ok(coagOf(x)<base-.1);
  cold.phys.coag=coagOf(cold);assert.ok(woundBleeding(cold,cold.injuries[0])>1.25*woundBleeding(g,g.injuries[0]));
  // Lactate rises in deep shock and the pH falls; it clears slowly once perfused.
  const shock=later(patient([],16),600);assert.equal(shock.status,'active');assert.ok(clinicalSnapshot(shock).lactate>2&&clinicalSnapshot(shock).ph<7.38,`${clinicalSnapshot(shock).lactate}`);
});

test('hidden fracture loss by segment: a femur bleeds more than a forearm, a splint cuts it; the binder acts on the pelvis only',()=>{
  const femur=patient([['leftThigh','fracture']]),forearm=patient([['leftForearm','fracture']]);
  const loss=g=>later(g,1200).phys.lostMl;
  const open=loss(femur),splinted=loss(act(femur,'splint','leftThigh'));
  assert.ok(open>3*loss(forearm),`${open} vs ${loss(forearm)}`);
  assert.ok(splinted<.75*open&&splinted>.45*open,`${splinted} vs ${open}`);
  const pelvis=patient([['pelvis','fracture']]),bound=act(pelvis,'pelvicBinder','pelvis','w0');
  assert.ok(bound.injuries[0].treatments.pelvicBinder!==undefined&&loss(bound)<.8*loss(pelvis));
  assert.equal(act(patient([['abdomen','internal']]),'pelvicBinder','abdomen','w0').injuries[0].treatments.pelvicBinder,undefined);
});

test('burns by %TBSA: the segment table sums to 100, plasma leaks and heat evaporates; a chemical burn spreads until irrigated',()=>{
  const total=BODY_PARTS.reduce((n,p)=>n+segmentTbsa(p.id),0);assert.ok(Math.abs(total-100)<1e-9,`${total}`);
  const burn=patient([['chest','thermalBurn']]),control=patient();
  assert.ok(Math.abs(burnTbsa(burn)-5.4)<1e-9&&clinicalSnapshot(burn).tbsa===burnTbsa(burn));
  assert.ok(later(burn,1200).phys.plasmaDeficitMl>later(control,1200).phys.plasmaDeficitMl+25);
  assert.ok(heatFlows(burn).burns>8&&heatFlows(control).burns===0);
  const chem=patient([['leftForearm','chemicalBurn']]),start=injuryTbsa(chem,chem.injuries[0]);
  const spread=later(chem,600),washed=act(chem,'salineIrrigation','leftForearm','w0'),stopped=later(washed,600);
  assert.ok(injuryTbsa(spread,spread.injuries[0])>1.5*start);
  assert.ok(Math.abs(injuryTbsa(stopped,stopped.injuries[0])-injuryTbsa(washed,washed.injuries[0]))<1e-9);
});

test('PK peaks: morphine IV 15–20 min, salbutamol inhaled 15–30, adrenaline IM ~10; fentanyl active 30–60 min',()=>{
  const min=id=>profileOf(id).peakS/60;
  assert.ok(min('morphine')>=15&&min('morphine')<=20,`${min('morphine')}`);
  assert.ok(min('salbutamol')>=15&&min('salbutamol')<=30,`${min('salbutamol')}`);
  assert.ok(min('adrenaline')>=8&&min('adrenaline')<=13,`${min('adrenaline')}`);
  const f=profileOf('fentanyl'),c=f.primary;let last=0;
  for(let t=f.peakS;t<7200;t+=30){const ce=f.curve(t-f.lagS)*f.norm;if(1/(1+Math.pow(c.ec50/ce,c.n))>.1)last=t;}
  assert.ok(last>=1800&&last<=3600,`fentanyl active ${last/60} min`);
});

test('P3 deferrals: adrenaline acts on SVR (not volume), cold slows the heart, stress raises glucose, bronchodilators ease anaphylaxis',()=>{
  let g=act(patient(),'adrenaline','leftThigh');g=later(g,600);
  assert.ok(g.phys.svrIdx>1.05&&clinicalSnapshot(g).support===0,`${g.phys.svrIdx}`);
  const warm=patient(),cold=patient();cold.temperature=31;
  for(let i=0;i<120;i++){tick(warm);tick(cold);}
  assert.ok(cold.phys.hr<.9*warm.phys.hr,`${cold.phys.hr} vs ${warm.phys.hr}`);
  assert.ok(clinicalSnapshot(later(patient([],50),1200)).glucose>6,'stress hyperglycaemia');
  const ana=createGame(index('picnicAllergy'),()=>.99);
  const helped=later(act(ana,'salbutamol','chest'),600),plain=later(act(ana,'wait30'),600);
  assert.ok(helped.phys.vaFrac>plain.phys.vaFrac+.03,`${helped.phys.vaFrac} vs ${plain.phys.vaFrac}`);
});

test('sensors: NIBP cycles every 180 s, a manual measurement reads now; SpO2 drops out under a tourniquet on the probe arm',()=>{
  let g=patient([['leftThigh','gunshot']]);g=later(g,30);assert.equal(g.vitals.pressureAt,0);
  g=later(g,160);assert.equal(g.vitals.pressureAt,180);
  g=act(g,'vitals');assert.equal(g.vitals.pressureAt,g.elapsed);
  const on=act(patient([['rightForearm','laceration']]),'tourniquet','rightUpperArm');
  assert.equal(on.vitals.spo2,'—');assert.equal(on.vitals.spo2Note,'brak sygnału');
  assert.ok(on.monitorHistory.every(v=>Number.isFinite(v.oxygen)));assert.ok(restoreGame(JSON.stringify(on)));
  const cold=patient();cold.temperature=32.5;assert.equal(advanceTime(cold,1).vitals.spo2,'—');
  assert.ok(Number.isFinite(patient().vitals.spo2));
});

test('handover quality from the snapshot: lactate and GCS are secondary insults; the note names loss, SpO2 and temperature',()=>{
  const s={...clinicalSnapshot(patient()),hr:80,sbp:120,spo2:97,tempC:36.8,gcs:15,lactate:1};
  assert.equal(handoverQuality(s).points,25);
  assert.ok(handoverQuality({...s,lactate:7}).points<=22&&handoverQuality({...s,gcs:6}).points<=22);
  const r=scoreRun({...structuredClone(patient([],54)),status:'saved',transportCalledAt:30});
  assert.match(r.parts.find(p=>p.id==='state').note,/^Utrata krwi ok\. 1,2 l \(klasa II\), SpO₂ \d+%, 36,7 °C/);
  assert.ok(GUIDES.some(x=>x.title==='Skrzep i ciśnienie'&&!/\d/.test(x.text)));
});

test('old saves: v3 with the blood/oxygen mirrors and without P4 fields restores and keeps playing',()=>{
  let g=act(createGame(index('gunshot'),()=>.99),'dressing','leftLeg');
  const old={...structuredClone(g),blood:bloodIndex(g),oxygen:g.phys.sao2*100};
  for(const k of ['lactate','ph','coag','clot','clotMap','burnProg','nibp','spo2Last'])delete old.phys[k];
  const restored=restoreGame(JSON.stringify(old));
  assert.ok(restored);assert.equal(restored.blood,undefined);assert.equal(restored.oxygen,undefined);
  assert.ok(restored.phys.lactate>=1&&restored.phys.nibp&&Number.isFinite(restored.phys.spo2Last));
  assert.equal(advanceTime(restored,60).status,'active');assert.deepEqual(restoreGame(JSON.stringify(restored)),restored);
  for(const mutate of [s=>{s.phys.coag=2;},s=>{s.phys.clot={w:'x'};},s=>{s.phys.ph=9;},s=>{s.phys.nibp={at:1};},s=>{s.blood=NaN;}]){const bad=structuredClone(g);mutate(bad);assert.equal(restoreGame(JSON.stringify(bad)),null,mutate.toString());}
});
