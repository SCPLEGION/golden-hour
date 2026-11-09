import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, restoreGame, SCENARIOS, ITEMS, itemUnavailable, vitals } from '../src/engine.js';
import { BODY_PARTS, BODY_OUTLINES, LEGACY_PARTS, resolvePart, bodyPart, matchesRegion } from '../src/content/body.js';
import { IV_PROCEDURE } from '../src/content/procedures.js';
import { injuryBleeding, pain } from '../src/simulation/selectors.js';
import { hasFlow, tourniquetOver } from '../src/simulation/vascular.js';
import { renderBodyScene } from '../src/ui/body-scene.js';
import { contextActions } from '../src/ui/context-actions.js';

const forearmIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
const handIV={...forearmIV,point:{x:680,y:144.2},depth:.56};
const fresh=(id='gunshot')=>createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99);
const withInjuries=(list,id)=>{const g=fresh(id);g.injuries=list.map(([part,type],i)=>({id:`t-${i}`,part,type,treatments:{}}));return g;};

test('23 unique segments with groups, order and consistent flags',()=>{
  assert.equal(BODY_PARTS.length,23);assert.equal(new Set(BODY_PARTS.map(p=>p.id)).size,23);
  for(const p of BODY_PARTS){
    assert.ok(p.name&&p.group&&Number.isInteger(p.order)&&Array.isArray(p.anchor),p.id);
    assert.ok(p.inset?p.id==='back':BODY_OUTLINES[p.base]&&p.clip.length===2&&p.clip[0]<p.clip[1],p.id);
    if(p.vascular)assert.ok(p.limb&&IV_PROCEDURE.sites.some(s=>s.id===p.ivSite),p.id);
    if(p.tourniquet)assert.ok(p.limb,p.id);
  }
  for(const group of ['rightArm','leftArm','rightLeg','leftLeg'])assert.deepEqual(BODY_PARTS.filter(p=>p.group===group).map(p=>p.order),[0,1,2,3],group);
  assert.deepEqual(BODY_PARTS.filter(p=>p.tourniquet).map(p=>p.id).sort(),['leftForearm','leftShin','leftThigh','leftUpperArm','rightForearm','rightShin','rightThigh','rightUpperArm']);
  assert.deepEqual(BODY_PARTS.filter(p=>p.vascular).map(p=>p.ivSite),['elbow','forearm','hand','elbow','forearm','hand']);
});

test('legacy part ids resolve to segments; group regions match their segments',()=>{
  for(const [old,next] of Object.entries(LEGACY_PARTS)){assert.equal(resolvePart(old),next);assert.equal(bodyPart(old).id,next);}
  for(const id of ['head','chest','abdomen','rightElbow'])assert.equal(resolvePart(id),id);
  assert.ok(matchesRegion(['head'],'face'));assert.ok(matchesRegion(['leftArm'],'leftHand'));assert.ok(matchesRegion(['abdomen'],'pelvis'));
  assert.ok(!matchesRegion(['leftArm'],'rightHand'));assert.ok(!matchesRegion(['chest'],'back'));assert.ok(matchesRegion(['rightKnee'],'rightKnee'));
  const g=fresh();assert.equal(itemUnavailable(g,ITEMS.find(i=>i.id==='oxygen'),'face'),null);assert.ok(itemUnavailable(g,ITEMS.find(i=>i.id==='seal'),'back'));
  for(const c of SCENARIOS)for(const injury of createGame(SCENARIOS.indexOf(c),()=>.99).injuries)assert.ok(BODY_PARTS.some(p=>p.id===injury.part),`${c.id}/${injury.part}`);
});

test('a tourniquet stops bleeding at and below itself on the same limb only',()=>{
  const g=withInjuries([['rightForearm','arterial'],['leftForearm','arterial'],['rightUpperArm','laceration']]);
  const upper=act(g,'tourniquet','rightUpperArm');
  assert.notEqual(upper,g);
  assert.equal(injuryBleeding(upper,upper.injuries[0]),0);assert.ok(injuryBleeding(upper,upper.injuries[1])>.05);assert.equal(injuryBleeding(upper,upper.injuries[2]),0);
  const lower=act(g,'tourniquet','rightForearm');
  assert.equal(injuryBleeding(lower,lower.injuries[0]),0);assert.ok(injuryBleeding(lower,lower.injuries[2])>.02);
  assert.equal(tourniquetOver(lower,'rightHand'),lower.body.rightForearm.treatments.tourniquet);assert.equal(tourniquetOver(lower,'rightElbow'),undefined);
});

test('tourniquets are refused on hands, feet, joints and the torso',()=>{
  const g=fresh(),item=ITEMS.find(i=>i.id==='tourniquet');
  for(const id of ['rightHand','leftFoot','rightKnee','leftElbow']){assert.equal(act(g,'tourniquet',id),g);assert.equal(itemUnavailable(g,item,id),'Stazę zakłada się na ramię, przedramię, udo lub podudzie');}
  assert.equal(act(g,'tourniquet','back'),g);assert.equal(act(g,'tourniquet','chest'),g);
});

test('IV is placed on vascular segments at their own site and is cut off by a proximal tourniquet',()=>{
  const g=fresh();
  assert.equal(act(g,'iv','rightUpperArm',null,forearmIV),g);
  assert.equal(act(g,'iv','rightHand',null,forearmIV),g,'forearm point is not a hand attempt');
  let hand=act(g,'iv','rightHand',null,handIV);assert.notEqual(hand.body.rightHand.ivAt,null);assert.equal(hand.body.rightHand.ivPlacement.siteId,'hand');
  assert.ok(hasFlow(hand,'rightHand'));
  hand=act(hand,'tourniquet','rightUpperArm');assert.equal(hasFlow(hand,'rightHand'),false);
  const used=act(hand,'morphine','rightHand');assert.equal(used.medications.length,0);assert.match(used.log.at(-1).text,/Brak efektu/);
  // A drug given on another segment of the same arm uses that limb's access.
  let other=act(g,'iv','leftForearm',null,forearmIV);other=act(other,'morphine','leftUpperArm');
  assert.equal(other.medications.length,1);assert.equal(other.medications[0].site,'leftForearm');
  assert.equal(act(g,'morphine','leftHand'),g);
});

test('a splint relieves fractures of its own and adjacent segments only',()=>{
  const g=withInjuries([['rightForearm','fracture']]);
  const near=act(g,'splint','rightElbow'),far=act(g,'splint','rightUpperArm');
  assert.ok(pain(near)<pain(g));assert.equal(pain(far),pain(g));assert.equal(far.body.rightUpperArm.treatments.splint,undefined);
});

test('a v0.6 save with the old seven part ids restores and keeps playing',()=>{
  let g=fresh();
  g=act(g,'iv','leftArm',null,forearmIV);g=act(g,'fluid','leftArm');g=act(g,'tourniquet','rightLeg');g=act(g,'splint','leftLeg');
  g=act(g,'glucometer','leftArm');g=act(g,'examine','rightArm');
  const legacy=structuredClone(g),back=Object.fromEntries(Object.entries(LEGACY_PARTS).map(([o,n])=>[n,o]));
  legacy.body=Object.fromEntries(Object.entries(legacy.body).filter(([id])=>['head','chest','abdomen',...Object.keys(back)].includes(id)).map(([id,v])=>[back[id]||id,v]));
  for(const [list,key] of [[legacy.injuries,'part'],[legacy.infusions,'site'],[legacy.assessments,'part'],[legacy.medications,'site']])for(const e of list)if(back[e[key]])e[key]=back[e[key]];
  assert.ok(legacy.body.leftArm.ivAt!==null&&legacy.injuries.some(i=>i.part==='leftLeg'));
  const restored=restoreGame(JSON.stringify(legacy));
  assert.ok(restored);assert.deepEqual(restored,g);
  assert.equal(Object.keys(restored.body).length,23);
  let next=act(restored,'wait60');next=act(next,'morphine','leftArm');next=act(next,'wait60');
  assert.ok(next.elapsed>restored.elapsed);assert.equal(next.medications.length,1);
  for(const k of ['blood','oxygen'])assert.ok(Number.isFinite(next[k]));
});

test('every item on every segment never throws and keeps vitals finite',()=>{
  for(const sid of ['gunshot','forestSaw','loadingBay']){
    const base=fresh(sid);
    for(const start of [base,act(base,'iv','leftForearm',null,forearmIV)])for(const item of ITEMS)for(const part of BODY_PARTS){
      let g;
      assert.doesNotThrow(()=>{g=act(start,item.id,part.id,null,item.procedure?(part.ivSite==='hand'?handIV:forearmIV):undefined);},`${sid}/${item.id}/${part.id}`);
      const v=vitals(g);
      for(const k of ['pulse','oxygen','breathing','glucose'])assert.ok(Number.isFinite(v[k]),`${sid}/${item.id}/${part.id}/${k}`);
    }
  }
});

test('the scene renders one clipped region per segment, dividers and the back inset',()=>{
  let g=fresh();g.injuries.push({id:'b',part:'back',type:'laceration',treatments:{}});
  for(const target of ['back','rightElbow','chest']){
    const html=renderBodyScene(g,target);
    for(const p of BODY_PARTS)assert.ok(html.includes(`data-part="${p.id}"`),p.id);
    assert.equal((html.match(/<clipPath id="clip-(?!base-)/g)||[]).length,22);
    assert.match(html,/segment-divider/);assert.match(html,/class="body-back-inset"/);
    assert.match(html,/class="body-back-inset"[^]*data-injury="b"/);
  }
  const menu=contextActions(g,'rightHand');
  assert.ok(menu.find(e=>e.id==='tourniquet').disabled);assert.ok(!menu.find(e=>e.id==='iv').disabled);
});
