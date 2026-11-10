import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceTime, SCENARIOS } from '../src/engine.js';
import { tick } from '../src/simulation/physiology.js';
import { act } from './support.js';

const index=id=>SCENARIOS.findIndex(s=>s.id===id);
const seeded=(s=3)=>()=>(s=(s*16807)%2147483647)/2147483647;
// A busy but survivable patient: packed wound, IV, running bag, opioid, monitor on.
function busy(){let g=act(createGame(index('gunshot'),()=>.99),'hemostatic','leftLeg');g=act(g,'iv','rightArm');g=act(g,'fluid','rightArm');return act(g,'morphine','rightArm');}

test('performance: 20 000 physiology ticks take under 250 ms',()=>{
  const base=busy(),batch=()=>{let ms=0;for(let r=0;r<20;r++){const g=structuredClone(base);const t0=performance.now();for(let i=0;i<1000;i++)tick(g);ms+=performance.now()-t0;assert.equal(g.status,'active');}return ms;};
  batch();// warm-up (JIT)
  const best=Math.min(batch(),batch(),batch());
  assert.ok(best<250,`${best.toFixed(0)} ms`);if(process.env.REPORT)console.log(`20k ticks: ${best.toFixed(0)} ms`);
});

test('determinism: same seed and actions give identical states; ticks never use Math.random',()=>{
  const play=()=>{let g=createGame(index('workshop'),seeded(),{difficulty:'hard'});g=act(g,'transport');g=advanceTime(g,40);g=act(g,'tourniquet','rightLeg');g=act(g,'iv','leftArm');g=act(g,'fluid','leftArm');for(let i=0;i<5;i++)g=advanceTime(g,120);return g;};
  const original=Math.random;
  Math.random=()=>{throw new Error('Math.random used in the simulation');};
  try{const a=play(),b=play();assert.deepEqual(a,b);assert.deepEqual(a.monitorHistory,b.monitorHistory);assert.ok(new Set(a.monitorHistory.map(v=>v.pulse)).size>1,'noise still varies');}
  finally{Math.random=original;}
  const other=createGame(index('workshop'),seeded(9),{difficulty:'hard'});assert.notEqual(other.profile.seed,createGame(index('workshop'),seeded(),{difficulty:'hard'}).profile.seed);
});

test('legacy createGame sequences keep scenario, patient and delay; the profile is drawn last',()=>{
  for(const [seed,options] of [[1,{}],[7,{difficulty:'hard'}],[11,{category:'zagadka'}],[42,{}]]){
    const draws=[],source=seeded(seed),recorded=createGame(3,()=>{const v=source();draws.push(v);return v;},options);
    // Replaying with the last three draws (the profile) changed leaves every legacy field untouched.
    const replay=[...draws.slice(0,-3),0,0,0];let n=0;const changed=createGame(3,()=>replay[n++],options);
    assert.equal(n,draws.length);
    for(const k of ['scenarioId','patient','transportDelay','injuries','protocol','supplies'])assert.deepEqual(changed[k],recorded[k],k);
    assert.notDeepEqual(changed.profile,recorded.profile);
    assert.ok(recorded.profile.massKg>=65&&recorded.profile.massKg<=95&&recorded.profile.ebvMl===Math.round(recorded.profile.massKg*70));
  }
});
