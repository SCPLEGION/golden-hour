import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SCENARIOS, advanceTime } from '../src/engine.js';
import { CONDITIONS } from '../src/content/conditions.js';
import { act, PROFILES, rescueMatrix, marginReport } from './support.js';
// The hard and expert matrices live in reference-care-hard/-expert.test.js (run in parallel by scripts/test.js).
const all={scenarios:SCENARIOS,conditions:CONDITIONS,create:createGame};
// REPORT=1 npm test prints the tightest margins of the whole matrix.
test('every scenario and patient state is rescued by the reference policy at a 25-minute delay (heavy/light × normal)',()=>{
  const rows=[];
  for(const [name,profile] of Object.entries(PROFILES))for(const r of rescueMatrix('normal',profile,all)){
    rows.push({...r,config:`${name}/normal`});
    assert.equal(r.start.transportDelay,1500,r.id);
    assert.equal(r.status,'saved',`${r.id} ${name}/normal: ${marginReport(rows.slice(-1))}`);
    assert.ok(r.g.elapsed>=1500,r.id);
    // P4 margins at handover: below class III and not hypoxic.
    assert.ok(r.end.lossFrac<.35&&r.end.spo2>88,`${r.id} ${name}/normal: loss ${r.end.lossFrac.toFixed(3)} SpO2 ${r.end.spo2.toFixed(1)}`);
    for(const e of r.complications)assert.notEqual(e.resolvedAt,null,`${r.id}: ${e.id} left open`);
  }
  assert.equal(rows.length,2*(SCENARIOS.length+CONDITIONS.length));
  const worst=Math.max(...rows.map(r=>r.maxLoss));assert.ok(worst<.4,`deepest handover loss ${worst.toFixed(3)}`);
  if(process.env.REPORT)console.log(marginReport([...rows].sort((a,b)=>b.maxLoss-a.maxLoss).slice(0,10)));
});

const neglect=g=>{g=act(g,'transport');while(g.status==='active')g=advanceTime(g,600);return g;};
test('neglect still loses: untreated massive bleeding and airway cases die before the ambulance',()=>{
  // P4: realistic rates — the untreated avulsion (forestSaw) and gunshot now die too.
  for(const id of ['workshop','forestSaw','gunshot','pressHand','rangeBlast','propellerFoot','conveyorArm','airway','chest','asthma','pondRescue'])assert.equal(neglect(createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99)).status,'lost',id);
  for(const id of ['arterialMachine','pressAmputation','blastAmputation','conveyorAmputation','legGunshot','multiStab','stationToilet','pondDrowning'])assert.equal(neglect(createGame(0,()=>.99,{conditionId:id})).status,'lost',id);
});

test('neglect loses more often on each harder level (seeded cases, transport only)',t=>{
  const seeded=s=>()=>(s=(s*16807)%2147483647)/2147483647;
  const makers=[...SCENARIOS.map((s,i)=>(r,d)=>createGame(i,r,{difficulty:d})),...CONDITIONS.map(c=>(r,d)=>createGame(0,r,{conditionId:c.id,difficulty:d}))];
  const rate=d=>makers.filter((make,k)=>neglect(make(seeded(k+11),d)).status==='lost').length/makers.length;
  const [normal,hard,expert]=['normal','hard','expert'].map(rate);
  t.diagnostic(`neglect death rate: normal ${(100*normal).toFixed(0)}%, hard ${(100*hard).toFixed(0)}%, expert ${(100*expert).toFixed(0)}%`);
  assert.ok(hard>=normal+.2,`hard ${hard} vs normal ${normal}`);
  assert.ok(expert>=hard+.05,`expert ${expert} vs hard ${hard}`);
});
