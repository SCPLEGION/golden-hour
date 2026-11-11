import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, restoreGame } from '../src/engine.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { initPhys } from '../src/simulation/physio-model.js';
import { loadProgress } from '../src/storage.js';
const initial = index => createGame(index,()=>.99);
const withTotal = (g,patch) => scoreRun({...structuredClone(g),...patch});
test('saved run scores higher than lost run',()=>{
  const g=initial(0);
  const saved=withTotal(g,{status:'saved',transportCalledAt:30});
  const lost=withTotal(g,{status:'lost',transportCalledAt:30});
  assert.ok(saved.total>lost.total);
  assert.equal(saved.parts.find(p=>p.id==='outcome').points,40);
  assert.equal(lost.parts.find(p=>p.id==='outcome').points,0);
  assert.ok(Number.isInteger(saved.total)&&saved.total>=0&&saved.total<=100);
});
// Physiology in a given state: blood points as legacy scale (100 = no loss), settled circulation.
const shaped=(g,{blood=100,oxygen=99,temperature=36.7,...patch}={})=>{const s={...structuredClone(g),oxygen,temperature,...patch};initPhys(s,blood);s.blood=blood;return s;};
test('grade thresholds',()=>{
  const g={...initial(0),status:'saved',transportCalledAt:0};
  assert.equal(scoreRun(shaped(g)).grade,'S');
  assert.equal(scoreRun(shaped(g,{blood:10,oxygen:70})).grade,'C');
  assert.equal(scoreRun(shaped(g,{status:'lost'})).grade,'D');
  assert.equal(scoreRun(shaped(g,{status:'lost',transportCalledAt:null})).grade,'D');
  assert.equal(scoreRun(shaped(g,{blood:70,oxygen:88,temperature:35})).grade,'A');
});
test('state part uses shock index, SpO2 and temperature from the snapshot and names the blood loss',()=>{
  const g={...initial(0),status:'saved',transportCalledAt:0};
  const state=r=>r.parts.find(p=>p.id==='state');
  const good=state(scoreRun(shaped(g))),shocked=state(scoreRun(shaped(g,{blood:30}))),hypoxic=state(scoreRun(shaped(g,{oxygen:80}))),cold=state(scoreRun(shaped(g,{temperature:34})));
  assert.ok(good.points>=22&&good.max===25,`${good.points}`);
  assert.ok(shocked.points<=good.points-8,`${shocked.points}`);
  for(const worse of [hypoxic,cold])assert.ok(Math.abs(good.points-worse.points-7.5)<=.5,`${worse.points}`);
  assert.match(shocked.note,/Utrata krwi ok\. 2,3 l \(klasa III\), SpO₂ \d+%, [\d,]+ °C, GCS \d+, mleczany [\d,]+ mmol\/l/);assert.match(good.note,/klasa I\)/);
});
test('a neglected survivor no longer scores like good care: economy and call speed need a decent handover',()=>{
  const g={...initial(0),status:'saved',transportCalledAt:30};
  const poor=scoreRun(shaped(g,{blood:16,oxygen:84})),fine=scoreRun(shaped(g));
  for(const id of ['economy','reaction']){assert.equal(poor.parts.find(p=>p.id===id).points,0,id);assert.match(poor.parts.find(p=>p.id===id).note,/Nie liczono/);}
  assert.ok(poor.total<=50,`${poor.total}`);assert.ok(fine.total>=90,`${fine.total}`);
  // Decompensated shock with good SpO2 and temperature still has half the state points, but is not a decent handover.
  // P4: at 42% loss the GCS and lactate (secondary insults) also cost points; 39% still shows the perfusion gate.
  const shock=scoreRun(shaped(g,{blood:22}));assert.ok(shock.parts.find(p=>p.id==='state').points>=12.5);assert.equal(shock.parts.find(p=>p.id==='economy').points,0);assert.ok(shock.total<60,`${shock.total}`);
  const lost=scoreRun(shaped(g,{status:'lost'}));assert.equal(lost.parts.find(p=>p.id==='economy').points,0);assert.match(lost.parts.find(p=>p.id==='economy').note,/przekazany żywy/);
});
test('never-called transport gives zero reaction points',()=>{
  const r=scoreRun(initial(0));
  assert.equal(r.parts.find(p=>p.id==='reaction').points,0);
});
test('act records when transport was requested',()=>{
  let g=act(initial(0),'wait30');
  g=act(g,'transport');
  assert.equal(g.transportCalledAt,30);
  assert.equal(scoreRun(g).parts.find(p=>p.id==='reaction').points,0,'counts only after a handover');
  assert.equal(scoreRun({...g,status:'saved'}).parts.find(p=>p.id==='reaction').points,20);
});
test('old save without transportCalledAt restores; bad value is rejected',()=>{
  const g=structuredClone(initial(0));
  delete g.transportCalledAt;
  assert.equal(restoreGame(g).transportCalledAt,null);
  assert.equal(restoreGame({...g,transportCalledAt:'x'}),null);
});
test('old stats without best load as zero',()=>{
  const storage={getItem:()=>JSON.stringify({stats:{saved:2,lost:1}})};
  assert.equal(loadProgress(storage).stats.best,0);
});
