import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, restoreGame, ITEMS } from '../src/engine.js';
import { DIFFICULTIES, difficultyById } from '../src/content/difficulty.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { loadProgress } from '../src/storage.js';
const seeded=()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;};
const counted=ITEMS.find(i=>i.count>=2);
const make=(difficulty,index=0)=>createGame(index,seeded(),{difficulty});
test('supplies scale with difficulty',()=>{
  const [easy,normal,hard]=['easy','normal','hard'].map(d=>make(d).supplies[counted.id]);
  assert.ok(easy>=normal&&normal>hard);
  assert.equal(normal,counted.count);
});
test('normal keeps the original layout and random sequence',()=>{
  const g=make('normal'),legacy=createGame(0,seeded());
  assert.deepEqual(g,legacy);
  for(const i of ITEMS.filter(i=>i.count!==null))assert.equal(g.supplies[i.id],i.count);
  assert.equal(g.difficulty,'normal');
});
test('transport delay stays in range and in minutes',()=>{
  for(const d of DIFFICULTIES)for(const r of [0,.3,.99]){
    const g=createGame(0,()=>r,{difficulty:d.id});
    assert.equal(g.transportDelay%60,0);
    assert.ok(g.transportDelay>=d.transportDelayRange[0]&&g.transportDelay<=d.transportDelayRange[1]);
    assert.ok(g.transportDelay>=900&&g.transportDelay<=1500);
  }
});
test('restoreGame defaults and validates difficulty',()=>{
  const old=structuredClone(make('normal'));delete old.difficulty;
  assert.equal(restoreGame(old).difficulty,'normal');
  assert.equal(restoreGame({...make('hard')}).difficulty,'hard');
  assert.equal(restoreGame({...make('normal'),difficulty:'nightmare'}),null);
});
test('hard bleeds faster than easy',()=>{
  const lose=d=>{let g=make(d);const start=g.blood;g=act(g,'wait60');g=act(g,'wait60');return start-g.blood;};
  assert.ok(lose('hard')>lose('easy'));
});
test('score multiplier is applied and clamped',()=>{
  const g={...make('hard'),status:'saved',blood:100,oxygen:99,transportCalledAt:0};
  const r=scoreRun(g);
  assert.ok(r.total<=100);assert.equal(r.difficulty.id,'hard');
  // Each run is scored against its own starting bag, so compare untouched easy/normal bags.
  const same=d=>({...make(d),status:'saved',blood:100,oxygen:99,transportCalledAt:0});
  assert.equal(scoreRun(same('easy')).total,Math.round(scoreRun(same('normal')).total*.8));
  assert.equal(scoreRun(same('hard')).parts.find(p=>p.id==='economy').points,15);
  assert.equal(difficultyById('x').id,'normal');
});
test('storage tolerates missing or invalid difficulty',()=>{
  const store=v=>({getItem:()=>JSON.stringify({stats:{saved:1,lost:0,best:5,difficulty:v}})});
  assert.equal(loadProgress(store(undefined)).stats.difficulty,'normal');
  assert.equal(loadProgress(store('bogus')).stats.difficulty,'normal');
  assert.equal(loadProgress(store('hard')).stats.difficulty,'hard');
});
