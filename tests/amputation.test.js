import test from 'node:test';
import assert from 'node:assert/strict';
import { act, legacyRate, bloodIndex } from './support.js';
import { injuryPhysiology } from '../src/content/injury-physiology.js';
import { clinicalSnapshot } from '../src/simulation/physio-model.js';
import { createGame, restoreGame, SCENARIOS, ITEMS, itemUnavailable } from '../src/engine.js';
import { BODY_PARTS, BODY_OUTLINES, bodyPart, splintReach, proximalTourniquetSite, cutPoint } from '../src/content/body.js';
import { INJURIES } from '../src/content/injuries.js';
import { GUIDES } from '../src/content/guides.js';
import { missingSegments, isMissing, injuryBleeding, bleedingRate, pain } from '../src/simulation/selectors.js';
import { hasAccess, tourniquetOver } from '../src/simulation/vascular.js';
import { MISSING_PART } from '../src/simulation/effects.js';
import { renderBodyScene } from '../src/ui/body-scene.js';
import { renderPatient } from '../src/ui/patient.js';
import { contextActions } from '../src/ui/context-actions.js';
import { WOUND_ART } from '../src/ui/visuals.js';

const AMPUTATIONS={pressHand:'rightHand',rangeBlast:'leftShin',propellerFoot:'rightFoot',conveyorArm:'leftForearm'};
const item=id=>ITEMS.find(i=>i.id===id);
const fresh=id=>createGame(SCENARIOS.findIndex(s=>s.id===id),()=>.99);
const withInjuries=(list,id='gunshot')=>{const g=fresh(id);g.injuries=list.map(([part,type],i)=>({id:`t-${i}`,part,type,treatments:{}}));return g;};
const run=(g,seconds)=>{for(let n=0;n<seconds/60&&g.status==='active';n++)g=act(g,'wait60');return g;};

test('new joint segments: unique ids, monotonic order per limb, bridge flags, no IV or tourniquet',()=>{
  assert.equal(new Set(BODY_PARTS.map(p=>p.id)).size,BODY_PARTS.length);
  for(const side of ['right','left'])for(const [id,name] of [['Shoulder','bark'],['Wrist','nadgarstek'],['Hip','biodro'],['Ankle','kostka']]){
    const p=bodyPart(`${side}${id}`);assert.ok(p&&p.limb&&p.bridge&&!p.vascular&&!p.tourniquet,`${side}${id}`);assert.match(p.name,new RegExp(name));
  }
  for(const group of ['rightArm','leftArm','rightLeg','leftLeg']){
    const parts=BODY_PARTS.filter(p=>p.group===group);
    assert.deepEqual(parts.map(p=>p.order),[0,1,2,3,4,5],group);
    for(let i=1;i<parts.length;i++)assert.ok(parts[i].clip[0]>parts[i-1].clip[0],`${group} bands go proximal → distal`);
  }
  assert.deepEqual(BODY_PARTS.filter(p=>/^right/.test(p.id)&&p.group==='rightArm').map(p=>p.id.slice(5)),['Shoulder','UpperArm','Elbow','Forearm','Wrist','Hand']);
  assert.deepEqual(BODY_PARTS.filter(p=>p.group==='leftLeg').map(p=>p.id.slice(4)),['Hip','Thigh','Knee','Shin','Ankle','Foot']);
});

test('clip bands are contiguous and non-overlapping per limb base; anchors sit inside their band',()=>{
  for(const base of Object.keys(BODY_OUTLINES)){
    const bands=BODY_PARTS.filter(p=>p.base===base).map(p=>p.clip).sort((a,b)=>a[0]-b[0]);
    for(let i=1;i<bands.length;i++)assert.equal(bands[i][0],bands[i-1][1],`${base} band ${i} starts where the previous ends`);
  }
  for(const p of BODY_PARTS.filter(p=>p.limb)){
    for(const key of ['anchor','stasis','splint'])if(p[key])assert.ok(p[key][1]>=p.clip[0]&&p[key][1]<=p.clip[1],`${p.id}.${key}`);
    const [x,y]=cutPoint(p.id);assert.equal(y,p.clip[0]);assert.ok(Number.isFinite(x),p.id);
  }
});

test('order comparisons keep pre-0.8 behaviour: tourniquet coverage and splint reach',()=>{
  // Old neighbours remain neighbours; the joint segments are bridged.
  for(const [a,b] of [['rightUpperArm','rightElbow'],['rightElbow','rightForearm'],['rightForearm','rightHand'],['rightThigh','rightKnee'],['rightKnee','rightShin'],['leftShin','leftFoot']])assert.ok(splintReach(a,b)&&splintReach(b,a),`${a}↔${b}`);
  for(const [a,b] of [['rightUpperArm','rightForearm'],['rightThigh','rightShin'],['rightElbow','rightHand'],['rightForearm','leftForearm'],['rightElbow','rightShoulder']])assert.ok(!splintReach(a,b),`${a}↮${b}`);
  for(const [a,b] of [['rightForearm','rightWrist'],['rightUpperArm','rightShoulder'],['leftThigh','leftHip'],['leftShin','leftAnkle']])assert.ok(splintReach(a,b),`${a}→${b}`);
  const g=withInjuries([['rightHand','fracture']]),forearm=act(g,'splint','rightForearm');
  assert.ok(pain(forearm)<pain(g),'forearm splint still relieves a hand fracture');
  const t=act(fresh('gunshot'),'tourniquet','rightForearm');
  assert.ok(tourniquetOver(t,'rightWrist')!==undefined&&tourniquetOver(t,'rightHand')!==undefined&&tourniquetOver(t,'rightElbow')===undefined);
  const u=act(fresh('gunshot'),'tourniquet','leftUpperArm');assert.equal(tourniquetOver(u,'leftShoulder'),undefined);assert.ok(tourniquetOver(u,'leftElbow')!==undefined);
  for(const id of ['rightWrist','leftAnkle','rightShoulder','leftHip'])assert.ok(itemUnavailable(g,item('tourniquet'),id),id);
});

test('missingSegments marks the amputated segment and everything distal on that limb only',()=>{
  assert.deepEqual(missingSegments(withInjuries([['rightHand','amputationHand']])),['rightHand']);
  assert.deepEqual(missingSegments(withInjuries([['leftForearm','amputationForearm']])).sort(),['leftForearm','leftHand','leftWrist']);
  assert.deepEqual(missingSegments(withInjuries([['rightShin','amputationShin'],['leftFoot','amputationFoot']])).sort(),['leftFoot','rightAnkle','rightFoot','rightShin']);
  assert.deepEqual(missingSegments(withInjuries([['leftHand','partialAmputation']])),[]);
  assert.deepEqual(missingSegments(fresh('gunshot')),[]);
  for(const id of ['amputationHand','amputationForearm','amputationFoot','amputationShin'])assert.ok(['external','wound','massive','amputation'].every(t=>INJURIES[id].tags.includes(t))&&injuryPhysiology(id).rate>=120&&INJURIES[id].visible,id);
  assert.deepEqual(INJURIES.partialAmputation.tags,['external','wound']);
  for(const id of ['amputationHand','partialAmputation'])assert.ok(WOUND_ART[id]||INJURIES[id].tags.some(t=>WOUND_ART[t]),id);
});

test('distal (missing) targets are refused; the stump marker accepts only dressing and packing',()=>{
  const g=withInjuries([['leftForearm','amputationForearm']]);
  for(const part of ['leftForearm','leftWrist','leftHand'])for(const id of ['tourniquet','splint','iv','dressing','morphine','capillaryTest','woundPacking']){
    assert.equal(itemUnavailable(g,item(id),part),MISSING_PART,`${id}@${part}`);assert.equal(act(g,id,part),g,`${id}@${part}`);
  }
  assert.equal(act(g,'examine','leftHand'),g);assert.notEqual(act(g,'examine','leftForearm'),g,'the stump itself can be examined');
  assert.equal(itemUnavailable(g,item('dressing'),'leftForearm','t-0'),null);assert.equal(itemUnavailable(g,item('hemostatic'),'leftForearm','t-0'),null);
  assert.equal(itemUnavailable(g,item('woundPacking'),'leftForearm','t-0'),MISSING_PART);
  assert.deepEqual(contextActions(g,'leftHand').map(e=>[e.id,e.disabled]),[['missing',MISSING_PART]]);
  assert.deepEqual(contextActions(g,'leftForearm','t-0').map(e=>e.id),['examine','dressing','hemostatic']);
  assert.equal(itemUnavailable(g,item('tourniquet'),'leftUpperArm'),null);assert.equal(proximalTourniquetSite('leftForearm'),'leftUpperArm');
  // An IV left on a missing segment by an edited save is not a usable access.
  const hacked=structuredClone(g);hacked.body.leftHand.ivAt=0;assert.equal(hasAccess(hacked,'leftHand'),false);
});

test('only a proximal tourniquet on the same limb stops amputation bleeding',()=>{
  const g=withInjuries([['rightShin','amputationShin']]),stump=s=>injuryBleeding(s,s.injuries[0]);
  const thigh=act(g,'tourniquet','rightThigh');assert.notEqual(thigh,g);assert.equal(stump(thigh),0);
  assert.equal(act(g,'tourniquet','rightShin'),g,'tourniquet on the missing segment is refused');
  assert.equal(act(g,'tourniquet','rightFoot'),g);
  const other=act(g,'tourniquet','leftThigh');assert.equal(stump(other),stump(g),'the other leg does not help');
  const loose=act(g,'tourniquet','rightThigh',null,{tension:.3,timeMs:2000,aborted:false});assert.ok(stump(loose)>0&&stump(loose)<stump(g),'a loose tourniquet only leaks less');
  const dressed=act(g,'dressing','rightShin','t-0'),packed=act(g,'hemostatic','rightShin','t-0',{filled:1,pressureMs:60000,aborted:false});
  assert.ok(stump(dressed)<stump(g)&&stump(dressed)>stump(g)*.8,'dressing helps only a little');
  assert.ok(Math.abs(stump(packed)-stump(g)*.5)<1e-9,'perfect packing on the stump halves it at most');
  const foot=withInjuries([['leftFoot','amputationFoot']]);assert.equal(injuryBleeding(act(foot,'tourniquet','leftShin'),foot.injuries[0]),0);
  const hand=withInjuries([['rightHand','amputationHand']]);for(const site of ['rightForearm','rightUpperArm'])assert.equal(injuryBleeding(act(hand,'tourniquet',site),hand.injuries[0]),0,site);
});

// P4 realistic stump rates (hand 120 … shin 250 mL/min): a packed hand stump may just reach the ambulance, but deep in class IV.
test('dressing or packing alone does not save an amputation scenario',()=>{
  for(const [id,part] of Object.entries(AMPUTATIONS)){
    let g=fresh(id);g=act(g,'transport');
    const stump=g.injuries.find(i=>i.part===part);
    g=act(g,'hemostatic',part,stump.id);g=act(g,'blanket','chest');g=run(g,1600);
    assert.ok(g.status==='lost'||clinicalSnapshot(g).lossFrac>.4,`${id}: ${g.status} ${clinicalSnapshot(g).lossFrac.toFixed(3)}`);
  }
});

test('each amputation scenario is rescued at a 25-minute delay with a prompt proximal tourniquet',()=>{
  for(const id of [...Object.keys(AMPUTATIONS),'splitterFingers']){
    let g=fresh(id);assert.equal(g.transportDelay,1500,id);g=act(g,'transport');
    for(const injury of [...g.injuries]){
      const d=INJURIES[injury.type];
      if(d.tags.includes('amputation'))g=act(g,'tourniquet',proximalTourniquetSite(injury.part));
      else if(d.tags.includes('massive'))g=act(g,'tourniquet',injury.part);
      else if(d.tags.includes('wound')&&injuryBleeding(g,injury)>0)g=act(g,g.supplies.hemostatic>0?'hemostatic':'dressing',injury.part,injury.id);
    }
    assert.equal(g.injuries.filter(i=>INJURIES[i.type].tags.includes('amputation')).reduce((n,i)=>n+injuryBleeding(g,i),0),0,id);
    g=act(g,'blanket','chest');g=run(g,1600);
    assert.equal(g.status,'saved',id);assert.ok(bloodIndex(g)>40,`${id}: ${bloodIndex(g)}`);
    assert.ok(restoreGame(JSON.parse(JSON.stringify(g))),id);
  }
  // Partial amputation is minor: no missing segments, a dressing controls it.
  const partial=fresh('splitterFingers');assert.deepEqual(missingSegments(partial),[]);
  const wound=partial.injuries.find(i=>i.type==='partialAmputation');const dressed=act(partial,'dressing','leftHand',wound.id);assert.ok(injuryBleeding(dressed,dressed.injuries.find(i=>i.id===wound.id))<legacyRate(dressed,.005));
});

test('a save without the joint segments restores with them initialised and keeps playing',()=>{
  const NEW=['Shoulder','Wrist','Hip','Ankle'].flatMap(id=>[`right${id}`,`left${id}`]);
  let g=fresh('conveyorArm');g=act(g,'tourniquet','leftUpperArm');g=act(g,'wait60');
  const old=structuredClone(g);for(const id of NEW)delete old.body[id];
  const restored=restoreGame(JSON.stringify(old));
  assert.ok(restored);for(const id of NEW)assert.deepEqual(restored.body[id],{examinedAt:null,note:null,treatments:{},ivAt:null},id);
  assert.deepEqual(restored,g);
  const next=act(restored,'wait60');assert.ok(next.elapsed>restored.elapsed&&Number.isFinite(next.phys.lostMl));
  assert.equal(bleedingRate(next),bleedingRate(g));
  // A pre-0.8 save on a gunshot case (no amputations) also restores.
  const legacy=structuredClone(fresh('gunshot'));for(const id of NEW)delete legacy.body[id];assert.ok(restoreGame(legacy));
});

test('the scene drops missing segments, clips the outline to remaining bands and marks the stump',()=>{
  const g=fresh('conveyorArm'),html=renderBodyScene(g,'chest');
  for(const id of ['leftForearm','leftWrist','leftHand'])assert.ok(!new RegExp(`<path[^>]*class="body-region[^"]*"[^>]*data-part="${id}"`).test(html),id);
  assert.match(html,/<path[^>]*class="body-region[^"]*"[^>]*data-part="leftElbow"/);
  assert.match(html,/<clipPath id="clip-base-leftArm-stump">/);assert.match(html,/clip-path="url\(#clip-base-leftArm-stump\)"/);
  assert.match(html,/<mask id="stump-mask"/);assert.match(html,/class="stump-end"/);
  const marker=html.match(/<g class="wound-marker[^"]*" transform="translate\(([\d.-]+) ([\d.-]+)\)"[^>]*data-part="leftForearm"/);
  assert.ok(marker);assert.equal(Number(marker[2]),bodyPart('leftForearm').clip[0]);
  const t=act(g,'tourniquet','leftUpperArm'),dressed=act(t,'dressing','leftForearm',g.injuries.find(i=>i.part==='leftForearm').id),after=renderBodyScene(dressed,'chest');
  assert.ok(!/data-device="[^"]*"[^>]*data-part="left(Forearm|Wrist|Hand)"|data-part="left(Forearm|Wrist|Hand)"[^>]*data-device/.test(after));
  const panel=renderPatient(g,'chest');
  for(const id of ['leftForearm','leftWrist','leftHand'])assert.match(panel,new RegExp(`class="part-button[^"]*missing[^"]*" data-part="${id}"[^>]*aria-disabled="true"[^>]*title="Brak"`),id);
  assert.match(panel,/class="part-button ?" data-part="leftElbow" aria-pressed="false"(?! aria-disabled)/);
  const normal=renderBodyScene(fresh('gunshot'),'chest');assert.ok(!/stump/.test(normal));
});

test('two guides describe amputations and the joint segments',()=>{
  for(const title of ['Amputacja urazowa — gra','Nowe segmenty stawów'])assert.ok(GUIDES.some(x=>x.title===title&&x.text.length>80),title);
});
