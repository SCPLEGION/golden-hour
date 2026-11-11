import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SCENARIOS } from '../src/engine.js';
import { CONDITIONS } from '../src/content/conditions.js';
import { PROFILES, rescueMatrix, marginReport } from './support.js';
// Hard (0.9): 30-minute delay, bleeding ×1.5, half the bag, deadlines ×0.6, three extra injuries and complications.
// The reference policy still rescues everything; the margins are tighter than on normal.
test('hard: the reference policy rescues every scenario and patient state at a 30-minute delay (heavy/light)',t=>{
  const rows=[];
  for(const [name,profile] of Object.entries(PROFILES))for(const r of rescueMatrix('hard',profile,{scenarios:SCENARIOS,conditions:CONDITIONS,create:createGame})){
    rows.push({...r,config:`${name}/hard`});
    assert.equal(r.start.transportDelay,1800,r.id);
    assert.equal(r.status,'saved',`${r.id} ${name}/hard: ${marginReport(rows.slice(-1))} [${r.complications.map(e=>e.id).join(', ')}]`);
    assert.ok(r.end.lossFrac<.45&&r.end.spo2>85,`${r.id} ${name}/hard: loss ${r.end.lossFrac.toFixed(3)} SpO2 ${r.end.spo2.toFixed(1)}`);
  }
  const events=rows.reduce((n,r)=>n+r.complications.length,0),controlled=rows.reduce((n,r)=>n+r.complications.filter(e=>e.resolvedAt!==null).length,0);
  assert.ok(events/rows.length>=2,`complications per run ${events/rows.length}`);
  t.diagnostic(`hard: ${rows.length} runs saved, complications ${events} (controlled ${controlled}), deepest handover loss ${Math.max(...rows.map(r=>r.end.lossFrac)).toFixed(3)}`);
  if(process.env.REPORT)console.log(marginReport([...rows].sort((a,b)=>b.maxLoss-a.maxLoss).slice(0,10)));
});
