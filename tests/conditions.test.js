import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from './support.js';
import { createGame, restoreGame, SCENARIOS, ITEMS, scenarioFor, pickCondition } from '../src/engine.js';
import { CATEGORIES, CONDITIONS, CONDITION_SCENARIOS, conditionById } from '../src/content/conditions.js';
import { DIFFICULTIES } from '../src/content/difficulty.js';
import { INJURIES } from '../src/content/injuries.js';
import { GUIDES } from '../src/content/guides.js';
import { bodyPart, matchesRegion, proximalTourniquetSite } from '../src/content/body.js';
import { CHECKS, CONSEQUENCES, protocolStatus, validateConditions, checkProtocol } from '../src/simulation/protocol.js';
import { isMissing, pain } from '../src/simulation/selectors.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { loadProgress } from '../src/storage.js';

const seeded=(s=11)=>()=>(s=(s*16807)%2147483647)/2147483647;
const make=(conditionId,difficulty='normal')=>createGame(0,()=>.99,{conditionId,difficulty});
const item=id=>ITEMS.find(i=>i.id===id);
const SITES=['head','chest','abdomen','rightUpperArm','leftUpperArm','rightThigh','leftThigh'];
const tags=i=>INJURIES[i.type].tags;
// Where to use an item: on the injury it treats (wound-scoped) or on the first allowed, intact site.
function use(g,id){
  const it=item(id);
  if(id==='tourniquet'){const i=g.injuries.find(i=>tags(i).includes('massive')&&bodyPart(i.part).limb);return i?act(g,id,tags(i).includes('amputation')?proximalTourniquetSite(i.part):i.part):g;}
  if(id==='splint'){const i=g.injuries.find(i=>tags(i).includes('fracture')&&bodyPart(i.part).limb);return i?act(g,id,i.part):g;}
  if(it.treatsTags||id==='seal'){
    const wanted=it.treatsTags||['chest'];
    const i=g.injuries.find(i=>wanted.some(t=>tags(i).includes(t))&&(!it.regions||matchesRegion(it.regions,i.part))&&!i.treatments?.[id]);
    return i?act(g,id,i.part,i.id):g;
  }
  const site=SITES.find(p=>(!it.regions||matchesRegion(it.regions,p))&&!isMissing(g,p));
  return act(g,id,site);
}
function care(g,injury){
  const d=INJURIES[injury.type],limb=bodyPart(injury.part).limb;
  if(d.tags.includes('massive')&&limb)return act(g,'tourniquet',d.tags.includes('amputation')?proximalTourniquetSite(injury.part):injury.part);
  if(d.tags.includes('chest'))return act(g,'seal',injury.part,injury.id);
  if(d.tags.includes('wound'))return act(g,g.supplies.hemostatic>0?'hemostatic':'dressing',injury.part,injury.id);
  return g;
}
// Maps a declarative check to the action(s) that satisfy it.
function solve(g,check){
  const [type,value]=Object.entries(check)[0];
  if(type==='any')return solve(g,value[0]);
  if(type==='examined')return act(g,'examine',Array.isArray(value)?value[0]:value);
  if(type==='action')return act(g,value);
  if(type==='transport')return g.transportAt===null?act(g,'transport'):g;
  if(type==='item')return use(g,value);
  if(type==='itemAny')return use(g,value[0]);
  if(type==='treatedInjury'||type==='treatedAll'){for(const i of g.injuries.filter(i=>i.type===value))g=care(g,i);return g;}
  if(type==='warm')return act(g,'blanket','chest');
  if(type==='airway')return g.injuries.some(i=>tags(i).includes('airwayFluid'))?use(g,'suction'):act(g,'airway','head');
  if(type==='oxygenGiven')return act(g,'oxygen','head');
  throw new Error(type);
}
const finish=(g,{oxygen=true}={})=>{
  for(let n=0;n<40&&g.status==='active';n++){
    if(oxygen&&g.oxygenUntil<=g.elapsed&&g.supplies.oxygen>0&&g.injuries.some(i=>INJURIES[i.type].oxygenLoss))g=act(g,'oxygen','head');
    g=act(g,'wait60');
  }
  return g;
};
function goodPlay(id,difficulty='normal'){
  let g=act(make(id,difficulty),'transport');
  for(const step of conditionById(id).protocol)g=solve(g,step.check);
  if(g.injuries.some(i=>tags(i).includes('airway')))g=act(g,'airway','head');
  if(g.injuries.some(i=>tags(i).includes('bronchospasm')))g=act(g,'salbutamol','chest');
  for(const injury of [...g.injuries]){g=care(g,injury);if(tags(injury).includes('fracture')&&bodyPart(injury.part).limb)g=act(g,'splint',injury.part);}
  return {mid:g,get end(){return finish(act(g,'blanket','chest'));}};
}
// The same responder who skips the hidden key steps: evacuation, warmth and visible bleeding only.
function ignoringPlay(id){
  let g=act(act(make(id),'transport'),'blanket','chest');
  for(const injury of g.injuries.filter(i=>INJURIES[i.type].visible))g=care(g,injury);
  return finish(g,{oxygen:false});
}

test('catalog: ≥40 states, ≥5 per category, unique ids, valid references and spec types',()=>{
  assert.ok(CONDITIONS.length>=40,`${CONDITIONS.length}`);
  for(const c of CATEGORIES)assert.ok(CONDITIONS.filter(x=>x.category===c.id).length>=5,c.id);
  assert.equal(new Set(CONDITIONS.map(c=>c.id)).size,CONDITIONS.length);
  assert.equal(CATEGORIES.length,6);
  const scenarioIds=new Set(SCENARIOS.map(s=>s.id));
  for(const s of CONDITION_SCENARIOS)assert.ok(!scenarioIds.has(s.id),s.id);
  for(const c of CONDITIONS){
    assert.ok(typeof c.scenario==='string'?scenarioIds.has(c.scenario):c.scenario.title&&c.scenario.scene&&c.scenario.quote&&c.scenario.history&&c.scenario.lesson,c.id);
    const g=make(c.id);assert.ok(scenarioFor(g),c.id);
    for(const i of g.injuries){assert.ok(INJURIES[i.type],`${c.id}/${i.type}`);assert.ok(bodyPart(i.part),`${c.id}/${i.part}`);}
    const walk=check=>{for(const [type,v] of Object.entries(check)){assert.ok(CHECKS[type],`${c.id}: ${type}`);if(type==='any')v.forEach(walk);}};
    for(const step of c.protocol){walk(step.check);for(const type of Object.keys(step.consequence))assert.ok(CONSEQUENCES[type],`${c.id}: ${type}`);}
  }
  assert.doesNotThrow(validateConditions);
  assert.ok(GUIDES.some(g=>g.id==='conditions-categories'));
});

test('puzzle states hide their real cause until examined',()=>{
  for(const c of CONDITIONS.filter(c=>c.category==='zagadka')){
    const g=make(c.id);
    assert.ok(g.injuries.some(i=>INJURIES[i.type].visible===null),`${c.id} has a hidden cause`);
  }
});

test('createGame with a category picks only from it; legacy calls are unchanged',()=>{
  for(const k of CATEGORIES){
    const random=seeded();
    for(let n=0;n<12;n++){const g=createGame(0,random,{category:k.id});assert.equal(conditionById(g.protocol.conditionId).category,k.id);}
  }
  const ids=new Set();const random=seeded(5);
  for(let n=0;n<80;n++)ids.add(createGame(0,random,{category:'losowa'}).protocol.conditionId);
  assert.ok(new Set([...ids].map(id=>conditionById(id).category)).size>=4,'losowa draws across categories');
  const legacy=createGame(3,seeded(),{difficulty:'normal'});
  assert.equal(legacy.protocol,undefined);assert.equal(Object.hasOwn(legacy,'protocol'),false);
  assert.deepEqual(createGame(3,seeded()),legacy);
  assert.equal(pickCondition({}),null);
  assert.throws(()=>createGame(0,Math.random,{conditionId:'nope'}));
  assert.equal(make('silentHead').scenarioId,'silentHead');
});

test('protocol step is marked done when its check is satisfied via act()',()=>{
  let g=make('silentHead');
  assert.deepEqual(protocolStatus(g).map(s=>s.doneAt),[null,null]);
  g=act(g,'wait30');g=act(g,'examine','head');
  const s=protocolStatus(g).find(s=>s.id==='examineHead');
  assert.equal(s.doneAt,30);assert.ok(s.onTime);
  assert.ok(g.body.head.note.includes('obrzęk'));
  // A wrong part does not count.
  const h=act(make('silentHead'),'examine','chest');
  assert.equal(protocolStatus(h).find(s=>s.id==='examineHead').doneAt,null);
});

test('missed deadline applies its consequence exactly once and logs it',()=>{
  let g=make('silentHead');
  for(let n=0;n<4;n++)g=act(g,'wait60');
  const status=protocolStatus(g);
  assert.ok(status.every(s=>s.missed));
  assert.equal(g.injuries.filter(i=>i.type==='headBleedSevere').length,1);
  assert.equal(g.injuries.filter(i=>i.type==='headInjury').length,0);
  assert.equal(g.log.filter(e=>e.text.startsWith('Zaniedbano: badanie głowy')).length,1);
  const before=structuredClone(g);checkProtocol(g);checkProtocol(g);
  assert.deepEqual(g.log,before.log);
  // Doing it late still records it, as half credit.
  g=act(g,'examine','head');const s=protocolStatus(g).find(s=>s.id==='examineHead');
  assert.ok(s.late&&!s.missed);
  // Pain consequence feeds the pain selector.
  let k=make('kneeSport');const p0=pain(k);for(let n=0;n<5;n++)k=act(k,'wait60');
  assert.ok(pain(k)>=p0+2);
});

test('difficulty scales deadlines',()=>{
  const deadline=d=>make('arterialMachine',d).protocol.steps.tourniquet.deadline;
  assert.equal(deadline('normal'),60);assert.equal(deadline('easy'),90);assert.equal(deadline('hard'),45);
  for(const d of DIFFICULTIES)assert.ok(Number.isFinite(d.deadlineMultiplier),d.id);
});

test('scoring adds a protocol part and still tops out at 100; without protocol it is unchanged',()=>{
  const g=make('silentHead'),legacy=createGame(0,()=>.99);
  assert.equal(scoreRun(legacy).parts.length,4);assert.equal(scoreRun(legacy).parts.reduce((n,p)=>n+p.max,0),100);
  const r=scoreRun(g);assert.equal(r.parts.reduce((n,p)=>n+p.max,0),100);
  assert.equal(r.parts.find(p=>p.id==='protocol').max,15);
  const done={...structuredClone(g),status:'saved',blood:100,oxygen:100,transportCalledAt:0};
  for(const s of Object.values(done.protocol.steps))s.doneAt=0;
  assert.equal(scoreRun(done).total,100);
  const late=structuredClone(done);for(const s of Object.values(late.protocol.steps))s.doneAt=999;
  assert.equal(scoreRun(late).parts.find(p=>p.id==='protocol').points,8);
  const none=structuredClone(done);for(const s of Object.values(none.protocol.steps))s.doneAt=null;
  assert.equal(scoreRun(none).parts.find(p=>p.id==='protocol').points,0);
});

test('restoreGame keeps a valid protocol, drops a bogus one, and accepts saves without it',()=>{
  const g=act(make('courierChest'),'examine','chest');
  assert.deepEqual(restoreGame(JSON.stringify(g)).protocol,g.protocol);
  const legacy=createGame(0,()=>.99);assert.equal(restoreGame(legacy).protocol,undefined);
  const bogus=structuredClone(createGame(0,()=>.99,{conditionId:'arterialMachine'}));bogus.protocol.conditionId='nope';
  const restored=restoreGame(bogus);assert.ok(restored);assert.equal(restored.protocol,undefined);
  const broken=structuredClone(g);broken.protocol.steps.examineChest.doneAt='x';
  assert.equal(restoreGame(broken).protocol,undefined);
  const extra=structuredClone(g);extra.protocol.steps.other={deadline:1,doneAt:null,missedAt:null};
  assert.equal(restoreGame(extra).protocol,undefined);
  const noPain=structuredClone(g);delete noPain.protocol.pain;assert.equal(restoreGame(noPain).protocol.pain,0);
  // An inline scenario with an unknown id is not a game at all.
  assert.equal(restoreGame({...structuredClone(g),scenarioId:'missingScenario'}),null);
});

test('stats remember the chosen category tolerantly',()=>{
  const store=v=>({getItem:()=>JSON.stringify({stats:{category:v}})});
  assert.equal(loadProgress(store('zagadka')).stats.category,'zagadka');
  assert.equal(loadProgress(store('bogus')).stats.category,'losowa');
  assert.equal(loadProgress(store(undefined)).stats.category,'losowa');
  assert.equal(loadProgress({getItem(){throw Error();}}).stats.category,'losowa');
});

test('every state is rescuable at a 25-minute evacuation with prompt protocol care; puzzles punish skipping the key step',()=>{
  for(const c of CONDITIONS){
    assert.ok(protocolStatus(goodPlay(c.id,'hard').mid).every(s=>s.onTime),`${c.id}: hard deadlines reachable`);
    const {mid,end}=goodPlay(c.id);
    assert.equal(end.transportDelay,1500,c.id);
    assert.ok(protocolStatus(mid).every(s=>s.onTime),`${c.id}: ${JSON.stringify(protocolStatus(mid))}`);
    assert.equal(end.status,'saved',`${c.id}: blood ${end.blood} oxygen ${end.oxygen}`);
    if(c.category==='zagadka'){
      const bad=ignoringPlay(c.id);
      assert.ok(bad.status==='lost'||bad.blood+bad.oxygen<=end.blood+end.oxygen-10,`${c.id}: ignored ${bad.status} ${bad.blood}/${bad.oxygen} vs ${end.blood}/${end.oxygen}`);
      assert.ok(scoreRun(bad).total<scoreRun(end).total,c.id);
    }
  }
});
