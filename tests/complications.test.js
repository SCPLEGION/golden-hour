import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceTime, restoreGame, SCENARIOS, itemUnavailable, ITEMS } from '../src/engine.js';
import { COMPLICATIONS } from '../src/content/complications.js';
import { WHEN, applyComplication, complicationSeed, complicationSummary, validComplications, stepComplications } from '../src/simulation/complications.js';
import { injuryBleeding, pain } from '../src/simulation/selectors.js';
import { hasAccess } from '../src/simulation/vascular.js';
import { scoreRun } from '../src/simulation/scoring.js';
import { tick } from '../src/simulation/physiology.js';
import { act, referenceCare } from './support.js';
const index=id=>SCENARIOS.findIndex(s=>s.id===id);
const seeded=(s=5)=>()=>(s=(s*16807)%2147483647)/2147483647;
// A run without scheduled draws, so each test forces exactly the event it checks.
const quiet=(id,difficulty='normal')=>{const g=createGame(index(id),()=>.5,{difficulty});g.complications.next=null;return g;};
const item=id=>ITEMS.find(i=>i.id===id);
const open=(g,id)=>g.complications.log.find(e=>e.id===id&&e.resolvedAt===null);
const resolved=(g,id)=>g.complications.log.find(e=>e.id===id)?.resolvedAt!==null;

test('every complication is declarative, registered and announced in Polish',()=>{
  assert.equal(COMPLICATIONS.length,9);
  for(const k of COMPLICATIONS){assert.ok(WHEN[k.when],k.id);assert.match(k.text,/[ąćęłńóśźż]/,k.id);}
});

test('the stream is seeded from the patient and deterministic; ticks never call Math.random',()=>{
  const play=()=>{let g=createGame(index('workshop'),seeded(),{difficulty:'expert'});g=act(g,'transport');g=act(g,'tourniquet','rightLeg');for(let i=0;i<12;i++)g=advanceTime(g,60);return g;};
  const original=Math.random;Math.random=()=>{throw new Error('Math.random used in the simulation');};
  let a,b;try{a=play();b=play();}finally{Math.random=original;}
  assert.deepEqual(a.complications,b.complications);assert.deepEqual(a.log,b.log);
  assert.ok(a.complications.log.length>=1,'an expert run draws complications');
  assert.equal(a.complications.seed===createGame(index('workshop'),seeded(),{difficulty:'expert'}).complications.seed,false,'the stream state advances');
  const c=createGame(index('workshop'),seeded(),{difficulty:'expert'}).complications;
  assert.equal(c.log.length,0);assert.ok(c.next>=135&&c.next<=225,`first draw ${c.next}`);
  assert.notEqual(createGame(0,seeded(9),{difficulty:'expert'}).complications.seed,c.seed);
  assert.equal(complicationSeed(123),complicationSeed(123));
  // No extra draw from the game's random source: easy/normal/hard creation sequences are unchanged.
  let n=0;createGame(3,()=>{n++;return .4;},{difficulty:'hard'});let m=0;createGame(3,()=>{m++;return .4;},{difficulty:'hard',complications:false});assert.equal(n,m);
});

test('rate by level: none on easy, then more on each harder level',()=>{
  const avg=d=>{let n=0,runs=0;for(const id of ['glassDoor','gunshot','fall','winterShelter'])for(const s of [3,8,21]){n+=referenceCare(createGame(index(id),seeded(s),{difficulty:d})).complications.log.length;runs++;}return n/runs;};
  const [easy,normal,hard,expert]=['easy','normal','hard','expert'].map(avg);
  assert.equal(easy,0);assert.ok(normal>0&&normal<=2,`normal ${normal}`);
  assert.ok(hard>normal,`hard ${hard} vs normal ${normal}`);assert.ok(expert>hard,`expert ${expert} vs hard ${hard}`);
  const g=createGame(0,seeded(),{difficulty:'easy'});assert.equal(g.complications.next,null);
  assert.equal(createGame(0,seeded(),{difficulty:'expert',complications:false}).complications.next,null);
});

test('scheduler: nothing applicable → retry later; the cap stops the stream; no draws during arrest',()=>{
  const g=createGame(index('glassDoor'),()=>.5,{difficulty:'hard'});
  g.elapsed=g.complications.next;g.supplies={...g.supplies,...Object.fromEntries(Object.keys(g.supplies).map(k=>[k,0]))};
  stepComplications(g);assert.equal(g.complications.log.length,0);assert.equal(g.complications.next,g.elapsed+60);
  const capped=createGame(index('glassDoor'),()=>.5,{difficulty:'normal'});capped.complications.log=[{id:'painSpike',at:0,target:'patient',resolvedAt:0},{id:'painSpike',at:1,target:'patient',resolvedAt:1}];
  capped.elapsed=capped.complications.next;stepComplications(capped);assert.equal(capped.complications.next,null);assert.equal(capped.complications.log.length,2);
  const arrested=createGame(index('glassDoor'),()=>.5,{difficulty:'hard'});arrested.arrest={since:0,budget:180,rhythm:'pea'};arrested.elapsed=arrested.complications.next;
  stepComplications(arrested);assert.equal(arrested.complications.log.length,0);
});

test('tourniquet slips: bleeding resumes; re-tightening uses the same tourniquet and controls it',()=>{
  let g=act(quiet('workshop'),'transport');
  assert.deepEqual(WHEN.tourniquet(g),[]);
  g=act(g,'tourniquet','rightLeg');const site=Object.keys(g.body).find(k=>g.body[k].treatments.tourniquet!==undefined),arterial=g.injuries.find(i=>i.type==='arterial');
  assert.deepEqual(WHEN.tourniquet(g),[site]);
  const before=injuryBleeding(g,arterial);
  const e=applyComplication(g,'tourniquetSlip');assert.ok(e);assert.ok(g.body[site].tourniquetQuality<=.5);
  assert.ok(injuryBleeding(g,arterial)>before+50,'bleeding resumes');assert.match(g.log.at(-1).text,/Staza się poluzowała/);
  g.supplies.tourniquet=0;assert.equal(itemUnavailable(g,item('tourniquet'),site),null,'re-tightening needs no new tourniquet');
  g=act(g,'tourniquet',site);assert.equal(g.supplies.tourniquet,0);
  assert.ok(resolved(g,'tourniquetSlip'));assert.ok(injuryBleeding(g,arterial)<=before+1);
});

test('dressing soaks through: the wound bleeds again until a new dressing or gauze',()=>{
  let g=quiet('glassDoor');const wound=g.injuries.find(i=>i.type==='laceration');
  assert.deepEqual(WHEN.dressedWound(g),[]);
  g=act(g,'dressing',wound.part,wound.id);const dressed=injuryBleeding(g,g.injuries.find(i=>i.id===wound.id));
  assert.deepEqual(WHEN.dressedWound(g),[wound.id]);
  applyComplication(g,'dressingSoak');const w=g.injuries.find(i=>i.id===wound.id);
  assert.equal(w.treatments.dressing,undefined);assert.ok(injuryBleeding(g,w)>dressed*3);
  assert.equal(itemUnavailable(g,item('dressing'),wound.part,wound.id),null);
  g=act(g,'hemostatic',wound.part,wound.id);assert.ok(resolved(g,'dressingSoak'));assert.ok(injuryBleeding(g,g.injuries.find(i=>i.id===wound.id))<injuryBleeding(g,w)/2);
});

test('a holding clot breaks (P4 haemostasis): fixed by packing the wound',()=>{
  let g=quiet('glassDoor');const wound=g.injuries.find(i=>i.type==='laceration');
  assert.deepEqual(WHEN.holdingClot(g),[]);
  g.phys.clot[wound.id]=.9;g.phys.clotMap[wound.id]=g.phys.map;
  assert.deepEqual(WHEN.holdingClot(g),[wound.id]);
  g.supplies.hemostatic=0;g.supplies.woundPacking=0;assert.deepEqual(WHEN.holdingClot(g),[],'only when packing is still possible');
  g.supplies.hemostatic=1;applyComplication(g,'clotBreak');
  assert.equal(g.phys.clotMap[wound.id],undefined);assert.ok(g.phys.clot[wound.id]<=.45);assert.match(g.log.at(-1).text,/Skrzep/);
  g=act(g,'hemostatic',wound.part,wound.id);assert.ok(resolved(g,'clotBreak'));
});

test('vomiting at GCS ≤ 12 without a protected airway → aspiration; suction clears it',()=>{
  let g=quiet('airway');
  assert.deepEqual(WHEN.vomitRisk(quiet('glassDoor')),[],'not in an alert patient');
  assert.deepEqual(WHEN.vomitRisk(g),['head']);
  const e=applyComplication(g,'vomiting');const asp=g.injuries.find(i=>i.id===e.injuryId);
  assert.equal(asp.type,'aspiration');assert.deepEqual(WHEN.vomitRisk(g),[]);
  g=act(g,'suction','head',asp.id);assert.equal(g.airway,true);assert.ok(resolved(g,'vomiting'));
  const protectedAirway=quiet('airway');protectedAirway.airway=true;assert.deepEqual(WHEN.vomitRisk(protectedAirway),[]);
});

test('a hidden injury deteriorates unseen until the segment is examined',()=>{
  let g=quiet('fall');const internal=g.injuries.find(i=>i.type==='internal');
  assert.deepEqual(WHEN.hiddenInjury(g),[internal.id]);
  const lost=g.phys.lostMl;applyComplication(g,'hiddenWorsens');assert.ok(g.phys.lostMl>lost+100);
  assert.deepEqual(WHEN.hiddenInjury(g),[],'once per injury');
  g=act(g,'examine','abdomen');assert.ok(resolved(g,'hiddenWorsens'));
  assert.deepEqual(WHEN.hiddenInjury(act(quiet('fall'),'examine','abdomen')),[]);
});

test('pain spike: agitation until an analgesic is given',()=>{
  let g=quiet('glassDoor');const base=pain(g);
  applyComplication(g,'painSpike');g=act(g,'wait30');assert.ok(pain(g)>=base+2.5,`${pain(g)} vs ${base}`);assert.ok(open(g,'painSpike'));
  g=act(g,'lidocaineSpray','leftArm');assert.ok(resolved(g,'painSpike'));
  const none=quiet('glassDoor');for(const k of Object.keys(none.supplies))none.supplies[k]=0;assert.deepEqual(WHEN.conscious(none),[]);
});

test('IV dislodged: access and running infusion lost; a new cannula fixes it',()=>{
  let g=quiet('glassDoor');assert.deepEqual(WHEN.ivAccess(g),[]);
  g=act(g,'iv','rightForearm');g=act(g,'fluid','rightForearm');
  const [site]=WHEN.ivAccess(g);assert.ok(site);
  applyComplication(g,'ivDislodged',site);assert.equal(hasAccess(g,site),false);assert.ok(g.infusions.every(f=>f.end<=g.elapsed));
  g=act(g,'iv','leftForearm');assert.ok(resolved(g,'ivDislodged'));
  const spent=quiet('glassDoor');spent.supplies.iv=0;spent.body.rightForearm.ivAt=0;assert.deepEqual(WHEN.ivAccess(spent),[],'only while a spare cannula is left');
});

test('oxygen mask displaced: O2 stops; the mask goes back on the same cylinder',()=>{
  let g=quiet('chest');assert.deepEqual(WHEN.oxygenOn(g),[]);
  g=act(g,'oxygen','head');assert.deepEqual(WHEN.oxygenOn(g),['head']);
  applyComplication(g,'maskDisplaced');const left=g.phys.o2.litersLeft;
  g=act(g,'wait30');assert.ok(g.phys.fio2<.25,`FiO2 ${g.phys.fio2}`);assert.equal(g.phys.o2.litersLeft,left);assert.match(g.log.find(l=>/Maska tlenowa zsunęła/.test(l.text)).text,/Maska/);
  g.supplies.oxygen=0;assert.equal(itemUnavailable(g,item('oxygen'),'head'),null);
  g=act(g,'oxygen','head');assert.equal(g.supplies.oxygen,0);assert.ok(resolved(g,'maskDisplaced'));assert.equal(g.phys.o2.device,'nrb');
  assert.ok(g.oxygenUntil>g.elapsed+400);g=act(g,'wait30');assert.ok(g.phys.fio2>.6);
});

test('shivering in the cold: temperature drops until the patient is insulated',()=>{
  let g=quiet('winterShelter');assert.deepEqual(WHEN.coldExposure(g),['patient']);
  assert.deepEqual(WHEN.coldExposure(quiet('canteenBurn')),[],'not in a warm room');
  const t=g.temperature;applyComplication(g,'shivering');assert.ok(Math.abs(g.temperature-(t-.4))<1e-9);
  g=act(g,'blanket','chest');assert.ok(resolved(g,'shivering'));assert.deepEqual(WHEN.coldExposure(g),[]);
});

test('restoreGame keeps the stream, defaults it for old saves and resets a corrupted one',()=>{
  let g=createGame(index('workshop'),seeded(),{difficulty:'expert'});g=act(g,'transport');g=act(g,'tourniquet','rightLeg');g=advanceTime(g,400);
  assert.ok(g.complications.log.length>0);
  const back=restoreGame(JSON.stringify(g));assert.deepEqual(back.complications,g.complications);
  assert.deepEqual(advanceTime(back,300).complications,advanceTime(g,300).complications,'a resumed save draws the same sequence');
  const old=structuredClone(g);delete old.complications;const legacy=restoreGame(old);
  assert.ok(validComplications(legacy.complications));assert.equal(legacy.complications.log.length,0);assert.ok(legacy.complications.next>=g.elapsed);
  for(const bad of [{seed:'x'},{log:[{id:'meteor',at:0,target:'x',resolvedAt:null}]},{next:-5},{log:'no'}]){
    const r=restoreGame({...structuredClone(g),complications:{...g.complications,...bad}});
    assert.ok(r,'the run stays playable');assert.ok(validComplications(r.complications));assert.equal(r.complications.log.length,0);
  }
  const easy=structuredClone(createGame(0,seeded(),{difficulty:'easy'}));delete easy.complications;assert.equal(restoreGame(easy).complications.next,null);
});

test('scoring reports "Komplikacje: N (opanowane M)" without changing part maxima',()=>{
  let g=quiet('glassDoor','hard');applyComplication(g,'painSpike');
  g=act(g,'lidocaineSpray','leftArm');
  const r=scoreRun({...g,status:'saved',transportCalledAt:0});
  assert.deepEqual(complicationSummary(g),{total:1,controlled:1});assert.deepEqual(r.complications,{total:1,controlled:1});
  assert.match(r.parts.find(p=>p.id==='economy').note,/Komplikacje: 1 \(opanowane 1\)\./);
  assert.equal(r.parts.reduce((n,p)=>n+p.max,0),100);
  assert.doesNotMatch(scoreRun({...createGame(0,seeded(),{difficulty:'easy'}),status:'saved'}).parts.find(p=>p.id==='economy').note,/Komplikacje/);
  // A tick of a game created before 0.9 (no complications field) does not throw.
  const legacy=createGame(0,seeded());delete legacy.complications;tick(legacy);assert.equal(legacy.status,'active');
});
