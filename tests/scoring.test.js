import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, restoreGame } from '../src/engine.js';
import { scoreRun } from '../src/simulation/scoring.js';
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
test('grade thresholds',()=>{
  const g={...initial(0),status:'saved',transportCalledAt:0};
  assert.equal(scoreRun({...g,blood:100,oxygen:100}).grade,'S');
  assert.equal(scoreRun({...g,blood:0,oxygen:0}).grade,'A');
  assert.equal(scoreRun({...g,status:'lost',blood:100,oxygen:100}).grade,'B');
  assert.equal(scoreRun({...g,status:'lost',blood:0,oxygen:0,transportCalledAt:null}).grade,'D');
  assert.equal(scoreRun({...g,status:'lost',blood:100,oxygen:100,transportCalledAt:null}).grade,'C');
});
test('never-called transport gives zero reaction points',()=>{
  const r=scoreRun(initial(0));
  assert.equal(r.parts.find(p=>p.id==='reaction').points,0);
});
test('act records when transport was requested',()=>{
  let g=act(initial(0),'wait30');
  g=act(g,'transport');
  assert.equal(g.transportCalledAt,30);
  assert.equal(scoreRun(g).parts.find(p=>p.id==='reaction').points,20);
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
