import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, advanceTime, restoreGame, scenarioFor, scenarioById } from '../src/engine.js';
import { generateProcedural } from '../src/simulation/procedural.js';
import { survivalResult, scoreRun } from '../src/simulation/scoring.js';
import { missingSegments } from '../src/simulation/selectors.js';
import { validEnvironment } from '../src/simulation/physio-thermal.js';
import { INJURIES } from '../src/content/injuries.js';
import { bodyPart } from '../src/content/body.js';
import { loadProgress, sanitizeHistory } from '../src/storage.js';
import { renderStatsPanel } from '../src/ui/stats-panel.js';
const seeded=(seed=7)=>{let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647;};
const SEEDS=Array.from({length:40},(_,i)=>i+1);
const make=(seed=7,difficulty='normal')=>createGame(0,seeded(seed),{difficulty,mode:'procedural'});
test('generation is deterministic for a seed and shaped like a scenario',()=>{
  assert.deepEqual(generateProcedural(seeded(5),'normal'),generateProcedural(seeded(5),'normal'));
  const c=generateProcedural(seeded(5),'hard');
  for(const k of ['title','scene','quote','history','lesson'])assert.equal(typeof c[k],'string');
  assert.equal(c.id,'procedural');assert.ok(validEnvironment(c.environment));
  assert.ok(c.blood>=68&&c.blood<=98&&c.oxygen>=78&&c.oxygen<=99);
});
test('injuries are valid, on existing segments, with no duplicates or amputation sharing',()=>{
  for(const seed of SEEDS)for(const d of ['easy','normal','hard']){
    const c=generateProcedural(seeded(seed),d),list=c.injuries.map(([part,type])=>({part,type})),missing=missingSegments({injuries:list});
    assert.ok(list.length>=1);
    for(const i of list){
      assert.ok(bodyPart(i.part)&&INJURIES[i.type]);
      const amp=INJURIES[i.type].tags.includes('amputation');
      if(missing.includes(i.part))assert.ok(amp&&list.filter(o=>o.part===i.part).length===1);
      if(amp)assert.equal(list.filter(o=>o.part===i.part).length,1);
    }
    assert.equal(new Set(list.map(i=>`${i.part}|${i.type}`)).size,list.length);
  }
});
test('harder levels generate more injuries on average',()=>{
  const avg=d=>SEEDS.reduce((n,s)=>n+generateProcedural(seeded(s),d).injuries.length,0)/SEEDS.length;
  assert.ok(avg('hard')>=avg('easy')+1);
});
test('procedural game has the generated scenario and no protocol',()=>{
  const g=make();
  assert.equal(g.mode,'procedural');assert.equal(g.scenarioId,'procedural');assert.equal(g.protocol,undefined);
  assert.equal(scenarioFor(g),g.generated);assert.equal(scenarioById('procedural').title,'Pełny proceduralny');
  assert.equal(createGame(0,seeded()).mode,undefined);
});
test('restoreGame round-trips a procedural game and rejects corrupted generated data',()=>{
  const g=advanceTime(make(),30),back=restoreGame(JSON.stringify(g));
  assert.ok(back);assert.deepEqual(back.generated,g.generated);assert.equal(back.mode,'procedural');
  const bad=f=>{const x=structuredClone(g);f(x);return restoreGame(x);};
  assert.equal(bad(x=>{delete x.generated;}),null);
  assert.equal(bad(x=>{x.generated.title=5;}),null);
  assert.equal(bad(x=>{x.generated.injuries=[['nowhere','contusion']];}),null);
  assert.equal(bad(x=>{x.generated.injuries=[['chest','nothing']];}),null);
  assert.equal(bad(x=>{x.generated.environment={tempC:'x'};}),null);
  assert.equal(bad(x=>{x.generated.blood=NaN;}),null);
  assert.equal(bad(x=>{x.mode='other';}),null);
  assert.equal(bad(x=>{delete x.mode;}),null);
});
test('survival time equals elapsed once the run ends',()=>{
  let g=make(3,'hard');
  for(let i=0;i<200&&g.status==='active';i++)g=act(g,'wait60');
  assert.notEqual(g.status,'active');
  const r=survivalResult(g);
  assert.equal(r.seconds,g.elapsed);assert.equal(r.saved,g.status==='saved');
  assert.equal(survivalResult(advanceTime(g,60)).seconds,r.seconds);
  assert.ok(Number.isFinite(scoreRun(g).total));
  const forced={...make(),status:'lost',elapsed:125};
  assert.deepEqual(survivalResult(forced),{seconds:125,saved:false});
  assert.equal(scoreRun(forced).parts.find(p=>p.id==='outcome').points,0);
});
test('storage validates mode, bestSurvival and procedural history',()=>{
  const load=stats=>loadProgress({getItem:()=>JSON.stringify({stats})}).stats;
  assert.equal(load({saved:1}).mode,'calls');assert.equal(load({saved:1}).bestSurvival,0);
  assert.equal(load({mode:'procedural',bestSurvival:95.4}).mode,'procedural');
  assert.equal(load({mode:'procedural',bestSurvival:95.4}).bestSurvival,95);
  assert.equal(load({mode:'x',bestSurvival:-5}).mode,'calls');assert.equal(load({bestSurvival:-5}).bestSurvival,0);
  assert.equal(load({bestSurvival:'a'}).bestSurvival,0);
  assert.equal(loadProgress({getItem:()=>'{bad'}).stats.mode,'calls');
  const h=sanitizeHistory([{status:'lost',scenarioId:'procedural',mode:'procedural',survival:90},{status:'lost',mode:'procedural',survival:-1},{status:'saved',total:50}]);
  assert.deepEqual([h[0].mode,h[0].survival],['procedural',90]);
  assert.equal(h[1].mode,undefined);assert.equal(h[1].survival,undefined);
  assert.equal(h[2].mode,undefined);
});
test('stats panel shows survival record and procedural rows',()=>{
  const html=renderStatsPanel({saved:0,lost:1,best:10,bestSurvival:125,tutorial:'off',difficulty:'normal',history:[{scenarioId:'procedural',status:'lost',total:0,grade:'D',difficulty:'normal',mode:'procedural',survival:125}]},scenarioById=>'Pełny proceduralny');
  assert.match(html,/Rekord przeżycia/);assert.match(html,/02:05/);assert.match(html,/Przeżycie 02:05/);
});
