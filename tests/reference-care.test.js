import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SCENARIOS, advanceTime } from '../src/engine.js';
import { CONDITIONS } from '../src/content/conditions.js';
import { act, referenceCare, margins, marginReport } from './support.js';

const PROFILES={heavy:{sex:'M',massKg:95},light:{sex:'F',massKg:52}};
const cases=(difficulty,profile)=>[
  ...SCENARIOS.map((s,i)=>[s.id,()=>createGame(i,()=>.99,{difficulty,profile})]),
  ...CONDITIONS.map(c=>[`§${c.id}`,()=>createGame(0,()=>.99,{conditionId:c.id,difficulty,profile})])
];
// REPORT=1 npm test prints the tightest margins of the whole matrix.
test('every scenario and patient state is rescued by the reference policy at a 25-minute delay (heavy/light × normal/hard)',()=>{
  const rows=[];
  for(const [name,profile] of Object.entries(PROFILES))for(const difficulty of ['normal','hard'])for(const [id,make] of cases(difficulty,profile)){
    const start=make();assert.equal(start.transportDelay,1500,id);
    const trace=[],g=referenceCare(start,{trace});
    rows.push({id,config:`${name}/${difficulty}`,status:g.status,...margins(trace)});
    assert.equal(g.status,'saved',`${id} ${name}/${difficulty}: ${marginReport(rows.slice(-1))}`);
    assert.ok(g.elapsed>=1500,id);
    // P4 margins at handover: below class III and not hypoxic.
    const end=trace.at(-1);assert.ok(end.lossFrac<.35&&end.spo2>88,`${id} ${name}/${difficulty}: loss ${end.lossFrac.toFixed(3)} SpO2 ${end.spo2.toFixed(1)}`);
  }
  assert.equal(rows.length,4*(SCENARIOS.length+CONDITIONS.length));
  const worst=Math.max(...rows.map(r=>r.maxLoss));assert.ok(worst<.4,`deepest handover loss ${worst.toFixed(3)}`);
  if(process.env.REPORT)console.log(marginReport([...rows].sort((a,b)=>b.maxLoss-a.maxLoss).slice(0,10)));
});

test('neglect still loses: untreated massive bleeding and airway cases die before the ambulance',()=>{
  const neglect=g=>{g=act(g,'transport');while(g.status==='active')g=advanceTime(g,600);return g;};
  // P4: realistic rates — the untreated avulsion (forestSaw) and gunshot now die too.
  for(const id of ['workshop','forestSaw','gunshot','pressHand','rangeBlast','propellerFoot','conveyorArm','airway','chest','asthma','pondRescue'])assert.equal(neglect(createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99)).status,'lost',id);
  for(const id of ['arterialMachine','pressAmputation','blastAmputation','conveyorAmputation','legGunshot','multiStab','stationToilet','pondDrowning'])assert.equal(neglect(createGame(0,()=>.99,{conditionId:id})).status,'lost',id);
});
