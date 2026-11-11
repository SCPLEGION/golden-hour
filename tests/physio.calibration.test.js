import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceTime, SCENARIOS } from '../src/engine.js';
import { tick } from '../src/simulation/physiology.js';
import { clinicalSnapshot, applyInsult, initPhys, hbOf } from '../src/simulation/physio-model.js';
import { HEMORRHAGE_CLASSES } from '../src/content/physiology-data.js';
import { act } from './support.js';

// A healthy, painless 75 kg reference patient (EBV 5250 mL) on an empty scene.
const fresh=(profile={sex:'M',massKg:75})=>{const g=createGame(SCENARIOS.findIndex(s=>s.id==='footballPitch'),()=>.5,{profile});g.injuries=[];initPhys(g,100);g.blood=100;return g;};
const run=(g,seconds)=>{for(let i=0;i<seconds&&g.status==='active';i++)tick(g);return g;};
// Bleeds 0.5% EBV every 10 s (~160 mL/min) up to the target loss, then lets the reflexes settle.
function bleedTo(g,frac){
  while(g.phys.lostMl/g.profile.ebvMl<frac-1e-9){applyInsult(g,{kind:'bleed',ml:Math.min(g.profile.ebvMl*.005,frac*g.profile.ebvMl-g.phys.lostMl)});run(g,10);}
  return run(g,30);
}
const within=(v,[lo,hi])=>(lo===null||v>=lo*.9)&&(hi===null||v<=hi*1.1);
export const CALIBRATION=[[.10,1],[.22,2],[.35,3],[.45,4]];

test('ATLS classes: bleeding a fresh patient to 10/22/35/45% gives class HR and SBP within ±10%',()=>{
  for(const profile of [{sex:'M',massKg:75},{sex:'F',massKg:52},{sex:'M',massKg:95}])for(const [frac,cls] of CALIBRATION){
    const g=bleedTo(fresh(profile),frac),s=clinicalSnapshot(g),band=HEMORRHAGE_CLASSES.find(c=>c.cls===cls);
    assert.equal(g.arrest,null,`${frac}: no arrest yet`);assert.equal(s.hemorrhageClass,cls,`${frac}`);
    assert.ok(within(s.hr,band.hr),`${frac}: HR ${s.hr.toFixed(0)} vs ${band.hr}`);
    assert.ok(within(s.sbp,band.sbp),`${frac}: SBP ${s.sbp.toFixed(0)} vs ${band.sbp}`);
    assert.ok(Math.abs(s.lossFrac-frac)<.002&&Math.abs(s.lostMl-frac*g.profile.ebvMl)<1);
  }
  // Monotone: the deeper the loss, the faster and the lower.
  const series=CALIBRATION.map(([f])=>clinicalSnapshot(bleedTo(fresh(),f)));
  for(let i=1;i<series.length;i++){assert.ok(series[i].hr>series[i-1].hr);assert.ok(series[i].sbp<series[i-1].sbp);assert.ok(series[i].dbp<series[i-1].dbp);}
});

test('a litre of crystalloid dilutes Hb by ~15–20% per litre still in the vessels, then redistributes',()=>{
  let g=fresh();const hb0=hbOf(g),ebv=g.profile.ebvMl;
  g=act(g,'iv','rightArm');g=act(g,'iv','leftArm');g=act(g,'fluid','rightArm');g=act(g,'fluid','leftArm');
  while(g.infusions.some(i=>i.end>g.elapsed))g=advanceTime(g,10);
  const drop=1-hbOf(g)/hb0,inVessels=g.phys.crystIvMl/1000;
  assert.ok(Math.abs(g.phys.crystInMl-1000)<1e-6,`${g.phys.crystInMl}`);
  assert.ok(drop/inVessels>=.15&&drop/inVessels<=.2,`${(drop*100).toFixed(1)}% for ${inVessels.toFixed(2)} l`);
  assert.ok(drop>=.13&&drop<=.2,`${(drop*100).toFixed(1)}% per litre infused`);
  assert.equal(g.phys.lostMl,0);assert.ok(hbOf(g)*(ebv+g.phys.crystIvMl)/100-g.phys.hbMassG<1e-6);
  const later=advanceTime(advanceTime(advanceTime(advanceTime(g,600),600),600),600);
  assert.ok(later.phys.crystIvMl<g.phys.crystIvMl*.55&&later.phys.crystIvMl>250,`${later.phys.crystIvMl}`);
  assert.ok(hbOf(later)>hbOf(g));
});

test('fluid raises perfusion of a bleeding patient and haemodilutes the blood still being lost',()=>{
  let base=bleedTo(fresh(),.3);base=act(base,'iv','rightArm');
  const dry=advanceTime(base,300),wet=advanceTime(act(base,'fluid','rightArm'),270);
  assert.equal(dry.elapsed,wet.elapsed);
  for(const k of ['map','sbp','perfusion'])assert.ok(clinicalSnapshot(wet)[k]>clinicalSnapshot(dry)[k]+3,k);
  assert.ok(clinicalSnapshot(wet).hr<clinicalSnapshot(dry).hr);assert.ok(hbOf(wet)<hbOf(dry));
});

test('untreated bleeding arrests at ~42–55% EBV loss, fast or slow',()=>{
  for(const [type,part] of [['arterial','leftThigh'],['amputationShin','leftShin'],['gunshot','leftThigh'],['internal','abdomen']]){
    let g=fresh();g.injuries=[{id:'x',part,type,treatments:{}}];
    while(!g.arrest&&g.status==='active'&&g.elapsed<9000)g=advanceTime(g,10);
    const loss=g.phys.lostMl/g.profile.ebvMl;
    assert.ok(g.arrest,`${type}: arrested`);assert.ok(loss>=.42&&loss<=.55,`${type}: ${loss.toFixed(3)}`);
  }
});

test('pressure-dependent bleeding: hypotension slows a wound, the nominal rate stays at MAP 90',()=>{
  let g=fresh();g.injuries=[{id:'x',part:'leftThigh',type:'internal',treatments:{}}];
  const early=g.phys.lostMl;g=run(g,60);const first=g.phys.lostMl-early;
  g=bleedTo(g,.4);const before=g.phys.lostMl;g=run(g,60);const late=g.phys.lostMl-before;
  assert.ok(late<first*.85,`${late} vs ${first}`);assert.ok(Math.abs(first-.025*1575)<2,`${first} mL in the first minute`);
});

test('the monitor shows the modelled HR and BP with deterministic noise and a MAP field',()=>{
  // P4: BP is the NIBP cuff reading — a manual measurement takes it now.
  const g=act(bleedTo(fresh(),.3),'vitals'),v=g.vitals,s=clinicalSnapshot(g);
  assert.ok(Math.abs(v.pulse-s.hr)<=4&&Math.abs(v.systolic-s.sbp)<=4&&Math.abs(v.diastolic-s.dbp)<=3,JSON.stringify(v));
  assert.equal(v.map,Math.round(s.map));assert.equal(v.pressure,`${v.systolic}/${v.diastolic}`);
  for(const k of ['time','pulse','pressure','systolic','diastolic','oxygen','breathing','temperature','pain','glucose','rhythm'])assert.ok(k in v,k);
});
