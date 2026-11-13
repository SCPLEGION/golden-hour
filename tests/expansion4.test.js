import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { SCENARIOS, ITEMS, advanceTime, validateCatalogs } from '../src/engine.js';
import { act, bloodIndex, spo2Of, createGame, PROFILES, rescueMatrix } from './support.js';
import { INJURIES } from '../src/content/injuries.js';
import { injuryPhysiology } from '../src/content/injury-physiology.js';
import { PHARMACOLOGY } from '../src/content/physiology-data.js';
import { BODY_PARTS, resolvePart } from '../src/content/body.js';
import { CONDITIONS, CONDITION_SCENARIOS, CATEGORIES } from '../src/content/conditions.js';
import { GUIDES } from '../src/content/guides.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { DEVICE_ART, WOUND_ART } from '../src/ui/visuals.js';

// Round 4 (0.11): 100 catalog additions listed in docs/expansion-round4.json.
const manifest=JSON.parse(readFileSync(new URL('../docs/expansion-round4.json',import.meta.url),'utf8'));
const ids=cat=>manifest.filter(a=>a.category===cat).map(a=>a.id);
const NEW={injury:ids('injury'),condition:ids('condition'),scenario:ids('scenario'),equipment:ids('equipment'),medicine:ids('medicine'),guide:ids('guide')};
const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
const item=id=>ITEMS.find(i=>i.id===id);
const conditionGame=(id,options={})=>createGame(0,()=>.99,{conditionId:id,...options});
const scenarioGame=(id,options={})=>createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99,options);
const finite=g=>{
  assert.ok(Number.isFinite(g.temperature)&&Number.isFinite(g.elapsed));
  for(const v of [bloodIndex(g),spo2Of(g)])assert.ok(Number.isFinite(v)&&v>=0&&v<=100);
};

test('manifest: exactly 100 new entries with the planned split and unique ids',()=>{
  assert.equal(manifest.length,100);
  assert.deepEqual(Object.fromEntries(Object.entries(NEW).map(([k,v])=>[k,v.length])),{injury:20,condition:20,scenario:15,equipment:15,medicine:10,guide:20});
  assert.equal(new Set(manifest.map(a=>a.id)).size,100);
  const all=[...Object.keys(INJURIES),...CONDITIONS.map(c=>c.id),...SCENARIOS.map(s=>s.id),...CONDITION_SCENARIOS.map(s=>s.id),...ITEMS.map(i=>i.id),...GUIDES.map(g=>g.id)];
  // Every new id exists exactly once as an entry of its own catalog and nowhere else (condition ids are also the ids of their inline scenarios).
  for(const a of manifest)assert.equal(all.filter(id=>id===a.id).length,a.category==='condition'?2:1,`${a.category}/${a.id}`);
  const catalogs={injury:Object.entries(INJURIES).map(([id,v])=>({id,title:v.name})),condition:CONDITIONS.map(c=>({id:c.id,title:c.name})),scenario:SCENARIOS.map(s=>({id:s.id,title:s.title})),equipment:ITEMS.filter(i=>i.category==='equipment').map(i=>({id:i.id,title:i.name})),medicine:ITEMS.filter(i=>i.category==='medicine').map(i=>({id:i.id,title:i.name})),guide:GUIDES.map(g=>({id:g.id,title:g.title}))};
  for(const a of manifest)assert.equal(catalogs[a.category].find(x=>x.id===a.id)?.title,a.title,`${a.category}/${a.id}`);
  for(const list of Object.values(catalogs))assert.equal(new Set(list.map(x=>x.id)).size,list.length);
  assert.doesNotThrow(validateCatalogs);
});

test('references: scenarios and states use real segments and injuries, injuries have physiology and art, items have profiles',()=>{
  const parts=new Set(BODY_PARTS.map(p=>p.id));
  const inline=NEW.condition.map(id=>CONDITION_SCENARIOS.find(s=>s.id===id));
  for(const s of [...NEW.scenario.map(id=>SCENARIOS.find(x=>x.id===id)),...inline]){
    for(const f of ['title','scene','quote','history','lesson'])assert.ok(typeof s[f]==='string'&&s[f].length>10,`${s.id}.${f}`);
    assert.ok(s.blood>0&&s.oxygen>0&&s.environment&&s.injuries.length>0,s.id);
    for(const [part,type] of s.injuries){assert.ok(parts.has(resolvePart(part)),`${s.id}/${part}`);assert.ok(INJURIES[type],`${s.id}/${type}`);}
  }
  for(const id of NEW.injury){
    assert.ok(injuryPhysiology(id)&&Number.isFinite(injuryPhysiology(id).rate),id);
    assert.ok(WOUND_ART[id]||INJURIES[id].tags.some(t=>WOUND_ART[t]),`art ${id}`);
  }
  for(const id of NEW.equipment)assert.ok(DEVICE_ART[item(id).visual||item(id).effect],id);
  for(const id of NEW.medicine)assert.ok(PHARMACOLOGY[id],id);
  // No dosing or step-by-step technique in the new player-facing texts.
  const texts=[...NEW.medicine.flatMap(id=>[item(id).description,item(id).risk]),...NEW.equipment.map(id=>item(id).description),...NEW.guide.map(id=>GUIDES.find(g=>g.id===id).text)];
  for(const t of texts)assert.ok(t&&!/\d\s*(mg|ml\/kg|mcg|µg|ml)\b|po \d+ s\b/i.test(t),t);
});

test('states: at least three new ones per category; puzzles hide their cause; steps use only declared check types',()=>{
  for(const c of CATEGORIES)assert.ok(NEW.condition.filter(id=>CONDITIONS.find(x=>x.id===id).category===c.id).length>=3,c.id);
  for(const id of NEW.condition.filter(id=>CONDITIONS.find(x=>x.id===id).category==='zagadka')){
    const g=conditionGame(id);
    assert.ok(g.injuries.some(i=>INJURIES[i.type].visible===null),`${id} has a hidden cause`);
    const s=CONDITION_SCENARIOS.find(x=>x.id===id);
    for(const [,type] of s.injuries.filter(([,t])=>INJURIES[t].visible===null))assert.ok(!s.scene.toLocaleLowerCase('pl').includes(INJURIES[type].name.toLocaleLowerCase('pl')),`${id} scene gives the cause away`);
  }
});

test('reachability: every new injury is placed by a new scenario or state; every new item and guide is referenced or usable',()=>{
  const placed=new Set([...SCENARIOS.filter(s=>NEW.scenario.includes(s.id)),...CONDITION_SCENARIOS.filter(s=>NEW.condition.includes(s.id))].flatMap(s=>s.injuries.map(([,t])=>t)));
  const worsened=CONDITIONS.flatMap(c=>c.protocol.flatMap(p=>p.consequence.worsen?[p.consequence.worsen.to]:[]));
  for(const id of NEW.injury)assert.ok(placed.has(id)||worsened.includes(id),`unused ${id}`);
  assert.ok(worsened.includes('headBleedSevere'));
  // Tension pneumothorax: hidden until the chest is examined; decompression is the only relief and a missing one is deadly.
  assert.ok(INJURIES.tensionPneumo.visible===null&&NEW.injury.includes('tensionPneumo')&&NEW.equipment.includes('needleDecompression'));
  assert.equal(new Set(GUIDES.map(g=>g.title)).size,GUIDES.length);
});

test('every new item and medicine works through act() on some valid target without throwing',()=>{
  const games=[...NEW.scenario.map(id=>scenarioGame(id)),...NEW.condition.map(id=>conditionGame(id))];
  for(const id of [...NEW.equipment,...NEW.medicine]){
    const it=item(id);let worked=false;
    for(const start of games){
      const g0=it.requires==='iv'?act(start,'iv','leftArm',null,perfectIV):start;
      const injuries=[null,...g0.injuries];
      for(const part of BODY_PARTS.filter(p=>!it.regions||it.regions.some(r=>r===p.id||r===p.group))){
        for(const injury of injuries.filter(i=>!i||i.part===part.id)){
          let after;assert.doesNotThrow(()=>{after=act(g0,id,part.id,injury?.id);},`${id}/${part.id}`);
          if(after!==g0&&(it.count===null||after.supplies[id]!==g0.supplies[id])){worked=true;finite(after);break;}
        }
        if(worked)break;
      }
      if(worked)break;
    }
    assert.ok(worked,`unreachable ${id}`);
  }
});

test('smoke: every new item on every segment keeps vitals finite',()=>{
  for(const sid of ['bottleNeck','blastRibs'])for(const withIV of [false,true]){
    const base=scenarioGame(sid),start=withIV?act(base,'iv','leftArm',null,perfectIV):base;
    for(const id of [...NEW.equipment,...NEW.medicine])for(const part of BODY_PARTS){
      let g;assert.doesNotThrow(()=>{g=act(start,id,part.id);},`${id}/${part.id}`);
      finite(g);
    }
  }
});

test('rescue: the reference policy saves every new scenario and state (normal, heavy; the full matrix incl. light/hard/expert is in reference-care*.test.js); neglect punishes the serious and puzzle states',()=>{
  const sub={scenarios:SCENARIOS.slice(-15),conditions:CONDITIONS.filter(c=>NEW.condition.includes(c.id)),create:(i,r,o)=>createGame(o?.conditionId?0:SCENARIOS.length-15+i,r,o)};
  assert.deepEqual(sub.scenarios.map(s=>s.id),NEW.scenario);
  for(const [name,profile] of Object.entries(PROFILES).filter(([n])=>n==='heavy')){
    const rows=rescueMatrix('normal',profile,sub);
    assert.equal(rows.length,35);
    for(const r of rows){
      assert.equal(r.status,'saved',`${r.id} ${name}`);
      assert.ok(r.end.lossFrac<.35&&r.end.spo2>88,`${r.id} ${name}: loss ${r.end.lossFrac.toFixed(3)} SpO2 ${r.end.spo2.toFixed(1)}`);
      if(!r.id.startsWith('§'))continue;
      const c=CONDITIONS.find(c=>`§${c.id}`===r.id);
      if(!['zagadka','zewnetrzne'].includes(c.category)&&c.severity!=='krytyczny')continue;
      let bad=act(conditionGame(c.id,{profile,complications:false,difficulty:'normal'}),'transport');
      while(bad.status==='active')bad=advanceTime(bad,60);
      assert.ok(bad.status==='lost'||scoreRun(bad).total<scoreRun(r.g).total,`${c.id}: neglect ${bad.status} ${scoreRun(bad).total} vs ${scoreRun(r.g).total}`);
    }
  }
});

test('needle decompression: relieves the tension injury, restores saturation and rescues a patient who is lost without it',()=>{
  const start=scenarioGame('knifeBar',{difficulty:'normal'}),injury=start.injuries.find(i=>i.type==='tensionPneumo');
  const wrong=act(start,'needleDecompression','abdomen');assert.equal(wrong,start);
  const lone=act(advanceTime(start,120),'seal','chest',injury.id);
  const sick=advanceTime(act(start,'oxygen','head'),240),cured=advanceTime(act(act(start,'oxygen','head'),'needleDecompression','chest',injury.id),240);
  assert.ok(cured.injuries.find(i=>i.id===injury.id).treatments.needleDecompression!==undefined);
  assert.ok(spo2Of(cured)>spo2Of(sick)+5,`${spo2Of(cured)} vs ${spo2Of(sick)}`);
  assert.equal(act(cured,'needleDecompression','chest',injury.id),cured);
  assert.ok(lone.injuries.find(i=>i.id===injury.id).treatments.seal===undefined);
  let bad=act(start,'transport');while(bad.status==='active')bad=advanceTime(bad,60);assert.equal(bad.status,'lost');
  assert.ok(act(start,'examine','chest').body.chest.note,'examination reveals it');
});

test('nasal airway: opens an airway injury in a conscious patient, which the oropharyngeal airway refuses',()=>{
  const g=conditionGame('fireAirway'),inj=g.injuries.find(i=>i.type==='airwayBurn');
  assert.ok(inj&&!g.airway);assert.equal(act(g,'airway','head'),g);
  const opened=act(g,'nasalAirway','head');assert.equal(opened.airway,true);assert.equal(act(opened,'nasalAirway','head'),opened);
  assert.ok(spo2Of(advanceTime(opened,300))>spo2Of(advanceTime(g,300)),'airway improves saturation');
});
