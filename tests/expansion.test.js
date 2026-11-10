import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENARIOS,createGame,validateCatalogs} from '../src/engine.js';
import {act} from './support.js';
import {INJURIES} from '../src/content/injuries.js';
import {BODY_PARTS,resolvePart,proximalTourniquetSite} from '../src/content/body.js';
import {ITEMS} from '../src/content/items.js';
import {GUIDES} from '../src/content/guides.js';
import {pain,injuryBleeding,respiratoryBurden,vitals,isConscious} from '../src/simulation/selectors.js';
import {woundModifiers} from '../src/simulation/modifiers.js';

const manifests=[
  JSON.parse(readFileSync(new URL('../docs/expansion-injuries-cases.json',import.meta.url),'utf8')),
  JSON.parse(readFileSync(new URL('../docs/expansion-equipment-guides.json',import.meta.url),'utf8'))
];
const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
const initial=id=>createGame(SCENARIOS.findIndex(c=>c.id===id),()=>.99);
const wait=(g,count=1)=>{for(let i=0;i<count&&g.status==='active';i++)g=act(g,'wait60');return g;};

test('expansion manifests account for exactly 100 concrete catalog additions',()=>{
  for(const list of manifests)assert.equal(list.length,50);
  const additions=manifests.flat();
  assert.equal(new Set(additions.map(a=>`${a.category}:${a.id}`)).size,100);
  for(const [category,expected] of Object.entries({injury:25,scenario:25,equipment:20,medicine:10,guide:20}))assert.equal(additions.filter(a=>a.category===category).length,expected,category);
  const catalogs={injury:Object.entries(INJURIES).map(([id,value])=>({id,title:value.name})),scenario:SCENARIOS.map(s=>({id:s.id,title:s.title})),equipment:ITEMS.filter(i=>i.category==='equipment').map(i=>({id:i.id,title:i.name})),medicine:ITEMS.filter(i=>i.category==='medicine').map(i=>({id:i.id,title:i.name})),guide:GUIDES.map(g=>({id:g.id,title:g.title}))};
  for(const entry of additions){
    const item=catalogs[entry.category].find(i=>i.id===entry.id);
    assert.ok(item,`Manifest item missing from game: ${entry.category}/${entry.id}`);
    assert.equal(item.title,entry.title);
  }
});

test('all 42 cases reference actual body parts and every added injury is reachable',()=>{
  assert.equal(SCENARIOS.length,42);assert.equal(Object.keys(INJURIES).length,57); // 45 + 12 patient-state injuries (conditions.js)
  assert.equal(new Set(SCENARIOS.map(c=>c.id)).size,42);
  const parts=new Set(BODY_PARTS.map(p=>p.id));
  for(const c of SCENARIOS){
    assert.ok(c.title&&c.scene&&c.history&&c.lesson,c.id);assert.ok(c.injuries.length,c.id);
    for(const [part,type] of c.injuries){assert.ok(parts.has(resolvePart(part)),`${c.id}/${part}`);assert.ok(INJURIES[type],`${c.id}/${type}`);}
  }
  for(const entry of manifests[0].filter(a=>a.category==='injury'))assert.ok(SCENARIOS.some(c=>c.injuries.some(([,type])=>type===entry.id)),entry.id);
  assert.doesNotThrow(validateCatalogs);
});

test('every case remains rescuable with a 25-minute evacuation using core care',()=>{
  for(let index=0;index<SCENARIOS.length;index++){
    let g=createGame(index,()=>.99);g=act(g,'transport');
    if(g.injuries.some(i=>INJURIES[i.type].tags.includes('airway')))g=act(g,'airway','head');
    if(g.injuries.some(i=>INJURIES[i.type].tags.includes('bronchospasm')))g=act(g,'salbutamol','chest');
    for(const injury of [...g.injuries]){
      const d=INJURIES[injury.type],limb=BODY_PARTS.find(p=>p.id===injury.part)?.limb;
      // An amputated segment cannot hold a tourniquet: it goes on the nearest site above the cut.
      if(d.tags.includes('massive')&&limb)g=act(g,'tourniquet',d.tags.includes('amputation')?proximalTourniquetSite(injury.part):injury.part);
      else if(d.tags.includes('wound'))g=act(g,g.supplies.hemostatic>0?'hemostatic':'dressing',injury.part,injury.id);
      if(d.tags.includes('chest'))g=act(g,'seal',injury.part,injury.id);
      if(d.tags.includes('fracture')&&limb)g=act(g,'splint',injury.part);
    }
    g=act(g,'blanket','chest');
    for(let n=0;n<40&&g.status==='active';n++){
      if(g.oxygenUntil<=g.elapsed&&g.supplies.oxygen>0&&g.injuries.some(i=>INJURIES[i.type].oxygenLoss))g=act(g,'oxygen','head');
      g=act(g,'wait60');
    }
    assert.equal(g.status,'saved',SCENARIOS[index].id);
    assert.equal(g.elapsed,g.transportAt,SCENARIOS[index].id);
  }
});

test('burn support changes the selected injury and pain; wrong-region use cannot heal another wound',()=>{
  let g=initial('chemicalStore');const injury=g.injuries.find(i=>i.type==='chemicalBurn');
  const beforePain=pain(g),beforeSupplies=g.supplies.burnGel;
  assert.equal(act(g,'burnGel','head',injury.id),g);
  g=act(g,'burnGel','leftArm',injury.id);
  assert.equal(g.supplies.burnGel,beforeSupplies-1);
  assert.ok(woundModifiers(g.injuries.find(i=>i.id===injury.id)).painRelief>0);
  assert.ok(pain(g)<beforePain);
  const eye=g.injuries.find(i=>i.type==='eyeIrritation');assert.equal(eye.treatments.burnGel,undefined);
});

test('wound packing lowers bleeding while body foreign-object support retains the injury',()=>{
  let g=initial('quarryDebris');const injury=g.injuries[0],rate=injuryBleeding(g,injury);
  g=act(g,'woundPacking',injury.part,injury.id);
  assert.ok(injuryBleeding(g,g.injuries.find(i=>i.id===injury.id))<rate*.1);
  const id=g.injuries[1].id;g=act(g,'impaledSupport',g.injuries[1].part,id);
  assert.ok(g.injuries.some(i=>i.id===id&&i.type==='shrapnel'));
  assert.ok(g.injuries.find(i=>i.id===id).treatments.impaledSupport!==undefined);
});

test('active warming changes temperature over time and its use is not repeatable while active',()=>{
  const origin=initial('winterShelter');let treated=act(origin,'warmingPack','chest');
  const once=treated;assert.equal(act(treated,'warmingPack','chest'),once);
  treated=wait(treated,2);const untreated=act(wait(origin,2),'wait30');
  assert.equal(treated.elapsed,untreated.elapsed);assert.ok(treated.temperature>untreated.temperature);assert.ok(treated.temperature>origin.temperature);
});

test('glucose aid changes the hidden glucose problem and naloxone changes opioid respiratory burden',()=>{
  let glucose=initial('stationWeakness');const before=vitals(glucose).glucose;
  glucose=act(glucose,'glucoseGel','head');glucose=wait(glucose,1);
  assert.ok(vitals(glucose).glucose>before);
  let opioid=act(initial('gunshot'),'iv','leftArm',null,perfectIV);
  opioid=act(opioid,'morphine','leftArm');opioid=wait(opioid,1);
  assert.ok(respiratoryBurden(opioid)>0);
  opioid=act(opioid,'naloxone','rightArm');opioid=wait(opioid,1);
  assert.equal(respiratoryBurden(opioid),0);
});

test('new diagnostic items record findings without healing their underlying cause',()=>{
  const initialState=initial('stationWeakness'),before=initialState.injuries.find(i=>i.type==='hypoglycemia');
  const diagnosed=act(initialState,'glucometer','leftArm');
  assert.ok(diagnosed.assessments.some(a=>a.id==='glucometer'&&a.part==='leftForearm'&&a.text.includes('glukozy')));
  assert.ok(diagnosed.injuries.some(i=>i.id===before.id&&i.type==='hypoglycemia'));
  assert.equal(diagnosed.medications.length,0);
});

test('clearing the fluid airway obstruction permits recovery of consciousness as oxygen improves',()=>{
  let g=initial('pondRescue');const aspiration=g.injuries.find(i=>i.type==='aspiration');
  assert.equal(isConscious(g),false);
  g=act(g,'suction','head',aspiration.id);g=wait(g,3);
  assert.ok(g.oxygen>90);assert.equal(isConscious(g),true);
});
