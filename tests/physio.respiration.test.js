import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceTime, restoreGame, itemUnavailable, SCENARIOS, ITEMS } from '../src/engine.js';
import { CONDITIONS, CONDITION_SCENARIOS } from '../src/content/conditions.js';
import { tick } from '../src/simulation/physiology.js';
import { clinicalSnapshot, applyInsult, initPhys } from '../src/simulation/physio-model.js';
import { severinghaus, invSeveringhaus, arterialSaturation, gcsOf, avpuOf } from '../src/simulation/physio-respiration.js';
import { RESP_TUNING } from '../src/content/physiology-data.js';
import { act, working } from './support.js';

const index=id=>SCENARIOS.findIndex(s=>s.id===id);
const scenario=id=>createGame(index(id),()=>.99);
const run=(g,seconds)=>{for(let i=0;i<seconds&&g.status==='active';i++)tick(g);return g;};
const spo2=g=>clinicalSnapshot(g).spo2;
const item=id=>ITEMS.find(i=>i.id===id);
// A healthy, painless 75 kg patient (footballPitch with the injuries removed).
const fresh=()=>{const g=createGame(index('footballPitch'),()=>.5,{profile:{sex:'M',massKg:75}});g.injuries=[];initPhys(g,100,98);return g;};

test('Severinghaus anchors: PaO2 60 → ~90%, 40 → ~75%, 27 → ~50%; the inverse round-trips',()=>{
  for(const [p,s] of [[60,.9],[40,.75],[27,.5],[100,.977]])assert.ok(Math.abs(severinghaus(p)-s)<.01,`${p}: ${severinghaus(p)}`);
  for(const s of [.3,.5,.75,.9,.97])assert.ok(Math.abs(severinghaus(invSeveringhaus(s))-s)<1e-6,`${s}`);
  // Room air, normal ventilation: PAO2 = .21·713 − 40/.8 ≈ 100 → ~98%.
  assert.ok(Math.abs(arterialSaturation()-.98)<.01,`${arterialSaturation()}`);
});

test('shunt is not fixed by oxygen, a V/Q gap (A–a gradient) is; hypoventilation answers to both',()=>{
  const air=RESP_TUNING.fio2.air,nrb=RESP_TUNING.fio2.nrb;
  const shuntAir=arterialSaturation({fio2:air,shunt:.35}),shuntO2=arterialSaturation({fio2:nrb,shunt:.35});
  const vqAir=arterialSaturation({fio2:air,aa:45}),vqO2=arterialSaturation({fio2:nrb,aa:45});
  assert.ok(shuntAir<.9&&shuntO2<.95&&shuntO2-shuntAir<.1,`shunt ${shuntAir} → ${shuntO2}`);
  assert.ok(vqAir<.9&&vqO2>.99,`V/Q ${vqAir} → ${vqO2}`);
  // Lower cardiac output lowers venous saturation, which a shunt passes on to the arteries.
  assert.ok(arterialSaturation({shunt:.3,co:.5})<arterialSaturation({shunt:.3,co:1})-.05);
  assert.ok(arterialSaturation({paco2:80})<.85&&arterialSaturation({fio2:nrb,paco2:80})>.99);
});

test('calibration: every scenario’s untreated SpO2 at 60 s is within ±4 of its legacy oxygen start value',()=>{
  const cases=[...SCENARIOS.map((s,i)=>[s,()=>createGame(i,()=>.99)]),...CONDITIONS.filter(c=>typeof c.scenario!=='string').map(c=>[CONDITION_SCENARIOS.find(s=>s.id===c.id),()=>createGame(0,()=>.99,{conditionId:c.id})])];
  const rows=cases.map(([s,make])=>{const g=advanceTime(make(),60);return {id:s.id,target:s.oxygen,spo2:spo2(g)};});
  if(process.env.REPORT)console.log(rows.filter(r=>r.target<94).map(r=>`${r.id.padEnd(16)} target ${r.target} at 60 s ${r.spo2.toFixed(1)}`).join('\n'));
  for(const r of rows)assert.ok(Math.abs(r.spo2-r.target)<=4,`${r.id}: ${r.spo2.toFixed(1)} vs ${r.target}`);
});

test('oxygen item = non-rebreather on a 150 L cylinder at 15 L/min: FiO2 .7 for 10 minutes, mirrored to oxygenUntil',()=>{
  let g=act(scenario('shedSmoke'),'oxygen','head');
  assert.deepEqual({device:g.phys.o2.device,flow:g.phys.o2.flowLpm},{device:'nrb',flow:15});
  assert.equal(g.phys.fio2,RESP_TUNING.fio2.nrb);assert.equal(g.oxygenUntil-g.elapsed,600-20);
  assert.ok(Math.abs(g.phys.o2.litersLeft-(150-20*.25))<1e-6);assert.ok(spo2(g)>93);
  g=advanceTime(g,g.oxygenUntil-g.elapsed);assert.equal(g.phys.o2.litersLeft,0);assert.equal(g.phys.o2.device,'none');
  assert.ok(g.log.some(e=>/Butla tlenowa jest pusta/.test(e.text)));
  g=advanceTime(g,120);assert.equal(g.phys.fio2,RESP_TUNING.fio2.air);assert.ok(spo2(g)<93,'back to the smoke-injured baseline');
});

test('BVM fixes hypoventilation; the airway item restores an obstruction',()=>{
  const od=createGame(0,()=>.99,{conditionId:'stationToilet'});
  const bagged=act(act(od,'oxygen','head'),'bvm','head'),waited=act(act(od,'oxygen','head'),'wait30');
  assert.ok(bagged.phys.paco2<waited.phys.paco2-15,`${bagged.phys.paco2} vs ${waited.phys.paco2}`);
  assert.equal(bagged.phys.fio2,RESP_TUNING.fio2.bvm);
  const roomAir=act(od,'bvm','head'),still=act(od,'wait30');
  assert.ok(roomAir.phys.paco2<still.phys.paco2-15&&spo2(roomAir)>spo2(still)+5,'room-air bagging still ventilates');
  const blocked=scenario('airway');assert.ok(blocked.phys.vaFrac<.6);
  const opened=act(blocked,'airway','head'),closed=act(blocked,'wait30');
  assert.ok(opened.phys.vaFrac>.95&&closed.phys.vaFrac<.6);
  const later=advanceTime(opened,120),untreated=advanceTime(closed,120);
  assert.ok(later.phys.paco2<50&&spo2(later)>spo2(untreated)+15,`${spo2(later)} vs ${spo2(untreated)}`);
});

test('open chest wound: the pneumothorax progresses unless sealed, and seal quality scales the leak',()=>{
  const g=scenario('chest'),id=g.injuries.find(i=>i.type==='chestWound').id;
  const sealed=q=>{const s=structuredClone(g);s.injuries.find(i=>i.id===id).treatments.seal=0;s.body.chest.treatments.seal=0;s.injuries.find(i=>i.id===id).sealQuality=q;return advanceTime(s,300);};
  const open=advanceTime(g,300),full=sealed(1),half=sealed(.5);
  const prog=s=>s.phys.respProg[id];
  assert.ok(prog(open)>.8&&prog(half)<.6&&prog(full)<.05,`${prog(open)} ${prog(half)} ${prog(full)}`);
  assert.ok(open.phys.shunt>half.phys.shunt&&half.phys.shunt>full.phys.shunt);
  assert.ok(spo2(full)>95&&spo2(open)<spo2(half)&&spo2(half)<spo2(full),`${spo2(open)} ${spo2(half)} ${spo2(full)}`);
  // Oxygen alone does not cure the open pneumothorax: the shunt remains.
  const oxygenOnly=advanceTime(act(g,'oxygen','head'),280);assert.ok(oxygenOnly.phys.shunt>.25&&spo2(oxygenOnly)<spo2(full));
});

test('asthma: neglect fatigues into hypoxic arrest; a bronchodilator rescues',()=>{
  let neglected=act(scenario('asthma'),'transport');
  while(!neglected.arrest&&neglected.status==='active')neglected=advanceTime(neglected,30);
  assert.ok(neglected.arrest,'neglect arrests');assert.ok(neglected.elapsed<1500,`${neglected.elapsed}`);
  // P3: inhaled absorption — relief builds over a few minutes, and one porcja lasts the whole run.
  let treated=act(act(scenario('asthma'),'transport'),'salbutamol','chest');treated=advanceTime(treated,360);
  assert.ok(spo2(treated)>94&&treated.phys.paco2<45,`${spo2(treated)}`);
  for(let n=0;n<4&&treated.status==='active';n++){treated=advanceTime(treated,300);if(!working(treated,'salbutamol'))treated=act(treated,'salbutamol','chest');}
  assert.equal(treated.medications.length,1);
  assert.equal(treated.arrest,null);assert.ok(spo2(treated)>90);
});

test('hypoxic arrest: SpO2 below 50 for 30 s arrests; CPR with ventilation and oxygen can restore circulation',()=>{
  let g=act(scenario('airway'),'transport');
  while(!g.arrest&&g.status==='active')g=advanceTime(g,1);
  assert.ok(g.phys.lowSpo2S>=30||g.phys.reserve<=0);assert.ok(spo2(g)<50);
  g=act(act(act(g,'airway','head'),'oxygen','head'),'cpr','chest');
  assert.equal(g.arrest,null);assert.ok(spo2(g)>65);
});

test('GCS bands from hypoxia, hypercapnia, perfusion and injury deficits; AVPU and the swallow/airway gates',()=>{
  const at=(patch={})=>{const g=fresh();Object.assign(g.phys,patch);return gcsOf(g);};
  assert.equal(at(),15);
  for(const [s,gcs] of [[.9,15],[.82,14],[.77,13],[.72,12],[.67,10],[.62,8],[.55,6],[.4,4]])assert.equal(at({sao2:s}),gcs,`SpO2 ${s}`);
  assert.equal(at({paco2:70}),13);assert.equal(at({paco2:110}),6);
  assert.equal(at({lostMl:.32*5250}),13);assert.equal(at({lostMl:.42*5250}),11);assert.equal(at({map:50}),10);
  assert.deepEqual([15,14,13,12,11,9,8,3].map(avpuOf),['A','A','V','V','P','P','U','U']);
  const flagged=fresh();flagged.initialUnconscious=true;assert.equal(gcsOf(flagged),6);flagged.airway=true;assert.equal(gcsOf(flagged),15);
  const arrested=fresh();arrested.arrest={since:0,budget:180};assert.equal(gcsOf(arrested),3);
  // Oral routes need GCS ≥ 14, the oropharyngeal airway GCS ≤ 8.
  const alert=fresh(),confused=fresh(),comatose=fresh();confused.phys.sao2=.77;comatose.phys.sao2=.55;
  assert.equal(itemUnavailable(alert,item('paracetamol'),'head'),null);assert.match(itemUnavailable(alert,item('airway'),'head'),/nie toleruje/);
  assert.match(itemUnavailable(confused,item('glucoseGel'),'head'),/połyka/);assert.match(itemUnavailable(confused,item('airway'),'head'),/nie toleruje/);
  assert.equal(itemUnavailable(comatose,item('airway'),'head'),null);assert.match(itemUnavailable(comatose,item('paracetamol'),'head'),/przełykać/);
  const s=clinicalSnapshot(confused);assert.deepEqual([s.gcs,s.avpu,s.conscious,s.canSwallow,s.toleratesOPA],[13,'V',true,false,false]);
});

test('GCS ≤ 8 without airway support adds soft-tissue obstruction (vaFrac × .4–.7)',()=>{
  const g=fresh();g.initialUnconscious=true;run(g,60);
  assert.ok(g.phys.vaFrac<.6&&g.phys.vaFrac>.4,`${g.phys.vaFrac}`);
  const supported=fresh();supported.initialUnconscious=true;supported.airway=true;run(supported,60);assert.ok(supported.phys.vaFrac>.99);
});

test('legacy oxygen insults drop SpO2 now and leave a fading desaturation debt',()=>{
  const g=fresh(),before=spo2(g);applyInsult(g,{kind:'oxygen',pts:-12});
  assert.ok(Math.abs(spo2(g)-(before-12))<1e-9);assert.equal(g.oxygen,spo2(g));assert.ok(Math.abs(g.phys.o2Debt-.12)<1e-12);
  run(g,120);assert.ok(spo2(g)<before-9&&g.phys.o2Debt<.12&&g.phys.o2Debt>.1);
  const onO2=act(g,'oxygen','head');assert.ok(spo2(advanceTime(onO2,60))>spo2(advanceTime(g,80))+4,'oxygen halves the debt');
});

test('monitor: SpO2 is averaged (τ 6 s), RR comes from the model, GCS/AVPU/EtCO2 are shown',()=>{
  const g=fresh();run(g,5);applyInsult(g,{kind:'oxygen',pts:-20});tick(g);
  assert.ok(g.vitals.oxygen>spo2(g)+10,'the oximeter lags a sudden fall');run(g,40);assert.ok(Math.abs(g.vitals.oxygen-spo2(g))<1.5);
  for(const k of ['gcs','avpu','etco2'])assert.ok(k in g.vitals,k);assert.equal(g.vitals.gcs,clinicalSnapshot(g).gcs);assert.equal(g.vitals.avpu,avpuOf(g.vitals.gcs));
  const od=advanceTime(createGame(0,()=>.99,{conditionId:'stationToilet'}),30),asthma=advanceTime(scenario('asthma'),30);
  assert.ok(od.vitals.breathing<10&&asthma.vitals.breathing>24,`${od.vitals.breathing} ${asthma.vitals.breathing}`);
  assert.ok(od.vitals.etco2>50&&od.vitals.gcs<=8&&od.vitals.avpu==='U');
});

test('saves: a v3 save without respiratory fields is defaulted from its SpO2; v2 oxygen points become PaO2',()=>{
  const g=advanceTime(scenario('asthma'),30),old=structuredClone(g);
  for(const k of ['fio2','vaFrac','paco2','sao2','pao2','spo2Shown','shunt','aaExtra','o2Debt','rr','storeFio2','lowSpo2S','respProg','o2'])delete old.phys[k];
  const restored=restoreGame(JSON.stringify(old));
  assert.ok(restored);assert.ok(Math.abs(restored.phys.sao2*100-g.oxygen)<1e-9);assert.ok(Math.abs(severinghaus(restored.phys.pao2)-restored.phys.sao2)<1e-6);
  assert.ok(restored.phys.paco2>50,'PaCO2 settles to the bronchospasm');assert.ok(advanceTime(restored,60).status==='active');
  const withO2=structuredClone(old);withO2.oxygenUntil=withO2.elapsed+300;assert.ok(Math.abs(restoreGame(withO2).phys.o2.litersLeft-75)<1e-9);
  for(const mutate of [s=>{s.phys.sao2=2;},s=>{s.phys.o2={device:'tank',flowLpm:15,litersLeft:1};},s=>{s.phys.respProg={x:-1};},s=>{s.phys.paco2='x';}]){const bad=structuredClone(g);mutate(bad);assert.equal(restoreGame(JSON.stringify(bad)),null,mutate.toString());}
  assert.deepEqual(restoreGame(JSON.stringify(g)),g);
});
