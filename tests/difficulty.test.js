import test from 'node:test';
import assert from 'node:assert/strict';
import { act as engineAct, restoreGame, ITEMS } from '../src/engine.js';
import { DIFFICULTIES, difficultyById, TRANSPORT_DELAY_BOUNDS } from '../src/content/difficulty.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { visibleInjuries } from '../src/simulation/selectors.js';
import { INJURIES } from '../src/content/injuries.js';
import { loadProgress, sanitizeHistory } from '../src/storage.js';
import { renderNewCall } from '../src/ui/new-call.js';
import { renderStatsPanel } from '../src/ui/stats-panel.js';
import { renderVitals } from '../src/ui/patient.js';
import { act, createGame } from './support.js';
const seeded=()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;};
const counted=ITEMS.find(i=>i.count>=2);
const make=(difficulty,index=0)=>createGame(index,seeded(),{difficulty});
test('levels are ordered easy → expert with the 0.9 values',()=>{
  assert.deepEqual(DIFFICULTIES.map(d=>d.id),['easy','normal','hard','expert']);
  const hard=difficultyById('hard'),expert=difficultyById('expert');
  assert.deepEqual([hard.bleedMultiplier,hard.supplyMultiplier,hard.deadlineMultiplier,hard.scoreMultiplier],[1.5,.5,.6,1.3]);
  assert.deepEqual([hard.extraInjuries,hard.transportDelayRange],[[2,3],[1500,1800]]);
  assert.deepEqual([expert.name,expert.bleedMultiplier,expert.supplyMultiplier,expert.deadlineMultiplier,expert.scoreMultiplier],['Ekspert',1.8,.4,.5,1.6]);
  assert.deepEqual([expert.extraInjuries,expert.transportDelayRange,expert.monitorAttached,expert.hideVisible],[[2,4],[1680,2100],false,true]);
  assert.equal(difficultyById('easy').complications,null);
  const rate=id=>difficultyById(id).complications;
  assert.ok(rate('normal').mean>rate('hard').mean&&rate('hard').mean>rate('expert').mean);
  assert.ok(rate('normal').max<rate('hard').max&&rate('hard').max<rate('expert').max);
  for(const d of DIFFICULTIES)assert.ok(d.description.length>20,d.id);
});
test('supplies scale with difficulty',()=>{
  const [easy,normal,hard,expert]=['easy','normal','hard','expert'].map(d=>make(d).supplies[counted.id]);
  assert.ok(easy>=normal&&normal>hard&&hard>=expert);
  assert.equal(normal,counted.count);
  assert.equal(make('hard').supplies.dressing,3);assert.equal(make('expert').supplies.dressing,2);
  for(const i of ITEMS.filter(i=>i.count>0))assert.ok(make('expert').supplies[i.id]>=1,i.id);
});
test('normal keeps the original layout and random sequence',()=>{
  const g=make('normal'),legacy=createGame(0,seeded());
  assert.deepEqual(g,legacy);
  for(const i of ITEMS.filter(i=>i.count!==null))assert.equal(g.supplies[i.id],i.count);
  assert.equal(g.difficulty,'normal');assert.equal(g.monitoring,true);assert.equal(g.monitorAttached,true);
});
test('transport delay stays in range and in minutes',()=>{
  for(const d of DIFFICULTIES)for(const r of [0,.3,.99]){
    const g=createGame(0,()=>r,{difficulty:d.id});
    assert.equal(g.transportDelay%60,0);
    assert.ok(g.transportDelay>=d.transportDelayRange[0]&&g.transportDelay<=d.transportDelayRange[1]);
    assert.ok(g.transportDelay>=TRANSPORT_DELAY_BOUNDS[0]&&g.transportDelay<=TRANSPORT_DELAY_BOUNDS[1]);
  }
  assert.equal(createGame(0,()=>.99,{difficulty:'hard'}).transportDelay,1800);
  assert.equal(createGame(0,()=>.99,{difficulty:'expert'}).transportDelay,2100);
  assert.deepEqual(TRANSPORT_DELAY_BOUNDS,[900,2100]);
});
test('restoreGame defaults and validates difficulty and the longer delays',()=>{
  const old=structuredClone(make('normal'));delete old.difficulty;delete old.monitorAttached;
  const back=restoreGame(old);assert.equal(back.difficulty,'normal');assert.equal(back.monitorAttached,true);
  assert.equal(restoreGame({...make('hard')}).difficulty,'hard');
  assert.equal(restoreGame({...make('expert')}).difficulty,'expert');
  assert.equal(restoreGame({...make('normal'),difficulty:'nightmare'}),null);
  // A 0.8 hard save (delay 1260–1500) and the new expert maximum stay valid; beyond the bounds is rejected.
  assert.ok(restoreGame({...make('hard'),transportDelay:1260}));
  assert.ok(restoreGame({...make('expert'),transportDelay:2100}));
  assert.equal(restoreGame({...make('expert'),transportDelay:2160}),null);
  assert.equal(restoreGame({...make('normal'),transportDelay:840}),null);
  assert.equal(restoreGame({...make('expert'),monitorAttached:'no'}),null);
});
test('bleeding gets faster with each level',()=>{
  const lose=d=>{let g=make(d);const start=g.phys.lostMl;g=act(g,'wait60');g=act(g,'wait60');return g.phys.lostMl-start;};
  assert.ok(lose('hard')>lose('easy'));assert.ok(lose('expert')>lose('normal'));
});
test('score multiplier is applied and clamped',()=>{
  const g={...make('hard'),status:'saved',transportCalledAt:0};
  const r=scoreRun(g);
  assert.ok(r.total<=100);assert.equal(r.difficulty.id,'hard');assert.equal(r.difficulty.multiplier,1.3);
  assert.equal(scoreRun({...make('expert'),status:'saved',transportCalledAt:0}).difficulty.multiplier,1.6);
  // Each run is scored against its own starting bag, so compare untouched easy/normal bags.
  const same=d=>({...make(d),status:'saved',transportCalledAt:0});
  assert.equal(scoreRun(same('easy')).total,Math.round(scoreRun(same('normal')).total*.8));
  assert.equal(scoreRun(same('hard')).parts.find(p=>p.id==='economy').points,15);
  assert.equal(scoreRun(same('expert')).parts.reduce((n,p)=>n+p.max,0),100);
  assert.equal(difficultyById('x').id,'normal');
});
test('storage, history, the new-call dialog and the stats panel accept expert',()=>{
  const store=v=>({getItem:()=>JSON.stringify({stats:{saved:1,lost:0,best:5,difficulty:v}})});
  assert.equal(loadProgress(store(undefined)).stats.difficulty,'normal');
  assert.equal(loadProgress(store('bogus')).stats.difficulty,'normal');
  assert.equal(loadProgress(store('hard')).stats.difficulty,'hard');
  assert.equal(loadProgress(store('expert')).stats.difficulty,'expert');
  assert.equal(sanitizeHistory([{status:'saved',total:70,grade:'B',difficulty:'expert'}])[0].difficulty,'expert');
  const stats={saved:0,lost:0,best:0,difficulty:'expert',category:'losowa',mode:'calls',history:[{scenarioId:'x',status:'saved',total:70,grade:'B',difficulty:'expert'}]};
  assert.match(renderNewCall({stats,active:false}),/<option value="expert" selected>Ekspert<\/option>/);
  const panel=renderStatsPanel(stats);assert.match(panel,/<option value="expert" selected>Ekspert<\/option>/);assert.match(panel,/<small>Ekspert<\/small>/);
});
test('hard and expert add extra injuries, easy and normal keep the legacy count',()=>{
  const count=(d,seed)=>{let s=seed;return createGame(0,()=>(s=(s*16807)%2147483647)/2147483647,{difficulty:d}).injuries.length;};
  for(const seed of [3,7,11,19,23,42,101]){
    assert.ok(count('hard',seed)>=count('normal',seed)+2,`seed ${seed}`);
    assert.ok(count('expert',seed)>=count('normal',seed)+2,`seed ${seed}`);
    assert.equal(count('easy',seed),count('normal',seed));
  }
  for(const [d,[lo,hi]] of [['hard',[2,3]],['expert',[2,4]]]){
    const g=createGame(0,seeded(),{difficulty:d}),extras=g.injuries.filter(i=>i.id.startsWith('extra-'));
    assert.ok(extras.length>=lo&&extras.length<=hi,d);
    assert.equal(new Set(g.injuries.map(i=>i.id)).size,g.injuries.length);
    assert.ok(restoreGame(structuredClone(g)));
  }
});
test('expert starts with the monitor detached: tiles show "—" until measured or attached',()=>{
  let g=make('expert',0);
  assert.equal(g.monitoring,false);assert.equal(g.monitorAttached,false);assert.equal(g.vitals,null);
  assert.match(renderVitals(g),/niepodłączony/);
  assert.equal((renderVitals(g).match(/>—</g)||[]).length,8,'seven tiles and the AVPU subfield');
  g=act(g,'wait30');assert.equal(g.vitals,null,'no live readings without the monitor');assert.equal(g.monitorHistory.length,0);
  // A manual measurement fills the tiles once and they stay at that reading.
  g=act(g,'vitals');const measured=g.vitals.time;assert.ok(Number.isFinite(g.vitals.pulse));
  g=act(g,'wait30');assert.equal(g.vitals.time,measured);
  g=act(g,'monitor','chest');assert.equal(g.monitorAttached,true);assert.equal(g.monitoring,true);
  g=act(g,'wait30');assert.equal(g.vitals.time,g.elapsed);
  assert.equal(restoreGame(structuredClone(make('expert'))).monitorAttached,false);
});
test('expert hides visible injuries until examined, except massive bleeding and amputations',()=>{
  const g=createGame(0,()=>.99,{difficulty:'expert',conditionId:'arterialMachine'}),normal=createGame(0,()=>.99,{difficulty:'normal',conditionId:'arterialMachine'});
  const shown=x=>x.injuries.filter(i=>visibleInjuries(x,i.part).includes(i));
  assert.ok(shown(normal).length>shown(g).length);
  for(const i of shown(g))assert.ok(INJURIES[i.type].tags.some(t=>t==='massive'||t==='amputation'),i.type);
  assert.ok(shown(g).length>=1,'the massive bleed is obvious');
  const hidden=g.injuries.find(i=>INJURIES[i.type].visible&&!shown(g).includes(i));
  const after=act(g,'examine',hidden.part);
  assert.ok(visibleInjuries(after,hidden.part).some(i=>i.id===hidden.id));
  // Other levels are unchanged: every injury with a `visible` text shows at once.
  for(const i of normal.injuries)assert.equal(visibleInjuries(normal,i.part).includes(i),Boolean(INJURIES[i.type].visible));
  assert.ok(engineAct(g,'examine',hidden.part)!==g);
});
