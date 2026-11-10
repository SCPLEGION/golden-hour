import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restoreGame, advanceTime, SCENARIOS } from '../src/engine.js';
import { clinicalSnapshot } from '../src/simulation/physio-model.js';
import { act } from './support.js';

const index=id=>SCENARIOS.findIndex(s=>s.id===id);
// A version-2 save as 0.6/0.8 wrote it: point-scale blood/fluid support, 2-minute infusions, no profile/phys.
function v2Fixture({blood=50,fluidSupport=4}={}){
  let g=act(createGame(index('gunshot'),()=>.99),'iv','rightArm');g=act(g,'fluid','rightArm');
  const old=structuredClone(g);delete old.profile;delete old.phys;
  Object.assign(old,{version:2,blood,fluidSupport});
  old.infusions=[{site:'rightForearm',end:old.elapsed+60}];
  return JSON.parse(JSON.stringify(old));
}

test('v2 → v3: blood points become mL of loss on a deterministic 80 kg profile',()=>{
  const v2=v2Fixture(),g=restoreGame(JSON.stringify(v2));
  assert.ok(g);assert.equal(g.version,3);assert.equal(g.fluidSupport,undefined);
  assert.deepEqual({sex:g.profile.sex,massKg:g.profile.massKg,ebvMl:g.profile.ebvMl,hb0:g.profile.hb0},{sex:'M',massKg:80,ebvMl:5600,hb0:15});
  assert.equal(g.profile.ageY,Number(/(\d+) lat/.exec(v2.patient)[1]));
  const s=clinicalSnapshot(g);
  assert.equal(s.lossFrac,.25);assert.equal(s.lostMl,1400);assert.equal(s.hemorrhageClass,2);
  assert.equal(g.blood,50,'the legacy mirror keeps its value');assert.equal(g.oxygen,v2.oxygen);
  assert.equal(g.phys.crystIvMl,4*.005*5600);assert.ok(Math.abs(s.hb-15)<1e-9||s.hb<15,'Hb only dilutes');
  assert.equal(g.infusions[0].ml,250);assert.ok(g.infusions[0].end>g.elapsed);
  // Settled circulation for that loss, deterministic and stable across restores.
  assert.ok(s.hr>95&&s.hr<140&&s.sbp>95,`${s.hr} ${s.sbp}`);
  assert.deepEqual(restoreGame(JSON.stringify(g)),g);assert.deepEqual(restoreGame(JSON.stringify(v2)),g);
});

test('migrated saves keep playing, other blood values map linearly and finished infusions stay finished',()=>{
  for(const [blood,frac] of [[100,0],[83,.085],[20,.4],[0,.5]]){
    const g=restoreGame(v2Fixture({blood,fluidSupport:0}));
    assert.ok(Math.abs(clinicalSnapshot(g).lossFrac-frac)<1e-12,`${blood}`);
    const next=advanceTime(g,60);assert.ok(next.elapsed===g.elapsed+60||next.status!=='active');assert.ok(Number.isFinite(next.blood)&&Number.isFinite(next.phys.map));
  }
  const done=v2Fixture();done.infusions=[{site:'rightForearm',end:done.elapsed-5}];
  const g=restoreGame(done);assert.equal(g.infusions[0].ml,0);assert.ok(g.infusions[0].end<=g.elapsed);
  const played=advanceTime(g,30);assert.equal(played.phys.crystInMl,g.phys.crystInMl,'no fluid from a finished bag');
});

test('v3 saves must carry a valid profile and physiology; v1 and malformed v2 are rejected',()=>{
  const g=createGame(index('gunshot'),()=>.99);
  assert.deepEqual(restoreGame(JSON.stringify(g)),g);
  for(const mutate of [s=>{delete s.phys;},s=>{delete s.profile;},s=>{s.phys.lostMl=-1;},s=>{s.phys.map=NaN;},s=>{s.phys.reserve=2;},s=>{s.profile.ebvMl=0;},s=>{s.profile.sex='X';},s=>{s.phys.boneMl={x:'1'};},s=>{s.infusions=[{site:'rightForearm',end:10}];}]){
    const bad=structuredClone(g);mutate(bad);assert.equal(restoreGame(JSON.stringify(bad)),null,mutate.toString());
  }
  assert.equal(restoreGame({...v2Fixture(),fluidSupport:NaN}),null);assert.equal(restoreGame({...v2Fixture(),version:1}),null);
});
