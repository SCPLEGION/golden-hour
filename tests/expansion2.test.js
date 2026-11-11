import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, validateCatalogs, restoreGame } from '../src/engine.js';
import { act, respiratory, bloodIndex, spo2Of, createGame } from './support.js';
import {INJURIES} from '../src/content/injuries.js';
import {BODY_PARTS,resolvePart} from '../src/content/body.js';
import {ITEMS} from '../src/content/items.js';
import {GUIDES} from '../src/content/guides.js';
import {DEVICE_ART,WOUND_ART} from '../src/ui/visuals.js';

const NEW={
  injuries:['glassEmbedded','flashBurn','ankleTwist','stressFracture','thighHematoma','flashEye'],
  scenarios:['glazierYard','sparkWelding','trailTwist','marathonShin','loadingKick','bakeryOven'],
  items:['elasticWrap','protectiveRing','eyeWashStation','legBrace','lidocaineSpray','metamizole'],
  guides:['r2-glass-protection','r2-flash-eyes','r2-wrap-vs-splint','r2-hematoma','r2-local-vs-oral','r2-many-small']
};
const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
const finite=g=>{
  for(const k of ['temperature','elapsed'])assert.ok(Number.isFinite(g[k]),k);
  for(const [k,v] of [['blood',bloodIndex(g)],['oxygen',spo2Of(g)]])assert.ok(Number.isFinite(v)&&v>=0&&v<=100,k);
};

test('round 2 ids are unique across catalogs and present',()=>{
  assert.equal(new Set(ITEMS.map(i=>i.id)).size,ITEMS.length);
  assert.equal(new Set(SCENARIOS.map(s=>s.id)).size,SCENARIOS.length);
  assert.equal(new Set(GUIDES.map(x=>x.id)).size,GUIDES.length);
  for(const id of NEW.injuries)assert.ok(INJURIES[id],id);
  for(const id of NEW.scenarios)assert.ok(SCENARIOS.some(s=>s.id===id),id);
  for(const id of NEW.items)assert.ok(ITEMS.some(i=>i.id===id),id);
  for(const id of NEW.guides)assert.ok(GUIDES.some(x=>x.id===id),id);
  assert.doesNotThrow(validateCatalogs);
});

test('round 2 scenarios are complete and reference valid injuries and parts',()=>{
  const parts=new Set(BODY_PARTS.map(p=>p.id));
  for(const id of NEW.scenarios){
    const s=SCENARIOS.find(x=>x.id===id);
    for(const f of ['title','scene','quote','history','lesson'])assert.ok(s[f]&&typeof s[f]==='string',`${id}.${f}`);
    assert.ok(s.injuries.length>0&&s.blood>0&&s.oxygen>0,id);
    for(const [part,type] of s.injuries){assert.ok(parts.has(resolvePart(part)),`${id}/${part}`);assert.ok(INJURIES[type],`${id}/${type}`);}
  }
  for(const id of NEW.injuries)assert.ok(SCENARIOS.some(s=>s.injuries.some(([,t])=>t===id)),`unused ${id}`);
});

test('round 2 injuries reuse an existing wound art key and items reuse device art',()=>{
  for(const id of NEW.injuries)assert.ok(WOUND_ART[id]||INJURIES[id].tags.some(t=>WOUND_ART[t]),id);
  for(const id of NEW.items){
    const i=ITEMS.find(x=>x.id===id);
    if(i.category==='equipment')assert.ok(DEVICE_ART[i.visual||i.effect],id);
  }
});

test('every round 2 scenario can be saved with 25-minute transport',()=>{
  for(const id of NEW.scenarios){
    let g=createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99);g=act(g,'transport');
    for(const injury of [...g.injuries]){
      const d=INJURIES[injury.type],limb=BODY_PARTS.find(p=>p.id===injury.part)?.limb;
      if(d.tags.includes('massive')&&limb)g=act(g,'tourniquet',injury.part);
      else if(d.tags.includes('wound'))g=act(g,g.supplies.hemostatic>0?'hemostatic':'dressing',injury.part,injury.id);
      if(d.tags.includes('fracture')&&limb)g=act(g,'splint',injury.part);
    }
    g=act(g,'blanket','chest');
    for(let n=0;n<40&&g.status==='active';n++){
      if(g.oxygenUntil<=g.elapsed&&g.supplies.oxygen>0&&g.injuries.some(respiratory))g=act(g,'oxygen','head');
      g=act(g,'wait60');
    }
    assert.equal(g.status,'saved',id);assert.equal(g.elapsed,g.transportAt,id);
    const restored=restoreGame(JSON.parse(JSON.stringify(g)));
    assert.ok(restored,id);
  }
});

test('every new item is applicable to some injury and part combination',()=>{
  for(const id of NEW.items){
    const item=ITEMS.find(i=>i.id===id);let worked=false;
    for(const sid of NEW.scenarios){
      let g=createGame(SCENARIOS.findIndex(s=>s.id===sid),()=>.99);
      if(item.requires==='iv')g=act(g,'iv','leftArm',null,perfectIV);
      for(const part of BODY_PARTS){
        for(const injury of [null,...g.injuries.filter(i=>i.part===part.id)]){
          const before=g,after=act(g,id,part.id,injury?.id);
          if(after!==before&&after.supplies[id]!==before.supplies[id]||(after!==before&&item.count===null)){worked=true;finite(after);}
        }
      }
    }
    assert.ok(worked,`unreachable ${id}`);
  }
});

test('stabilizing items treat only matching injuries in a real scenario',()=>{
  let g=createGame(SCENARIOS.findIndex(s=>s.id==='glazierYard'),()=>.99);
  const glass=g.injuries.find(i=>i.type==='glassEmbedded');
  g=act(g,'protectiveRing',glass.part,glass.id);
  assert.ok(g.injuries.find(i=>i.id===glass.id).treatments.protectiveRing!==undefined);
  assert.equal(g.injuries.find(i=>i.type==='abrasion').treatments.protectiveRing,undefined);
});

test('any item on any body part never throws or corrupts state',()=>{
  const start=Date.now();
  for(const sid of ['gunshot',...NEW.scenarios]){
    const base=createGame(SCENARIOS.findIndex(s=>s.id===sid),()=>.99);
    const withIV=act(base,'iv','leftArm',null,perfectIV);
    for(const start of [base,withIV])for(const item of ITEMS)for(const part of BODY_PARTS){
      let g;
      assert.doesNotThrow(()=>{g=act(start,item.id,part.id,null,item.procedure==='iv'?perfectIV:undefined);},`${item.id}/${part.id}`);
      finite(g);
    }
  }
  assert.ok(Date.now()-start<10000);
});
