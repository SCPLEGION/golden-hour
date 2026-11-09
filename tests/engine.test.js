import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act as engineAct, SCENARIOS, ITEMS, restoreGame, validateCatalogs } from '../src/engine.js';
import { bleedingRate, pain, visibleInjuries, activeMedicines, respiratoryBurden } from '../src/simulation/selectors.js';
import { loadProgress, saveProgress } from '../src/storage.js';
const perfectIV={point:{x:400,y:132.42105263157896},approach:42,depth:.62,aborted:false};
const act=(g,id,part='chest',wound=null,input=undefined)=>engineAct(g,id,part,wound,input===undefined&&ITEMS.find(i=>i.id===id)?.procedure==='iv'?perfectIV:input);
const initial = index => createGame(index,()=>.99);
const wait = (g,n=1) => {for(let i=0;i<n&&g.status==='active';i++)g=act(g,'wait60');return g;};
test('catalog references resolve and every item has a registered effect',validateCatalogs);
test('all scenarios survive a 25-minute evacuation with appropriate care',()=>{
  SCENARIOS.slice(0,6).forEach((c,index)=>{
    let g=act(initial(index),'transport');
    if(index===0)g=act(g,'hemostatic','leftLeg');
    if(index===1)g=act(g,'tourniquet','rightLeg');
    if(index===3){g=act(g,'seal','chest');g=act(g,'hemostatic','rightArm');}
    if(index===4)g=act(g,'airway','head');
    if(index===5)g=act(g,'salbutamol','chest');
    g=act(g,'blanket');
    g=wait(g,40);
    assert.equal(g.status,'saved',c.id);assert.ok(g.elapsed>=1500,c.id);
  });
});
test('neglect can kill and an unrequested ambulance never arrives',()=>{
  for(let index=0;index<6;index++){
    const g=wait(initial(index),100);assert.equal(g.status,'lost',SCENARIOS[index].id);assert.equal(g.transportAt,null);
  }
});
test('body regions hold independent injuries, treatment and exam history',()=>{
  const g=initial(0);const treated=act(g,'splint','leftLeg');
  assert.equal(g.body.leftThigh.treatments.splint,undefined);
  assert.equal(treated.body.leftThigh.treatments.splint,0);
  assert.equal(treated.body.rightThigh.treatments.splint,undefined);
  assert.ok(pain(treated)<pain(g));assert.equal(bleedingRate(treated),bleedingRate(g));
});
test('internal injuries stay hidden until the correct region is examined',()=>{
  let g=initial(2);assert.equal(visibleInjuries(g,'abdomen').length,0);
  g=act(g,'examine','head');assert.equal(visibleInjuries(g,'abdomen').length,0);
  g=act(g,'examine','abdomen');assert.equal(visibleInjuries(g,'abdomen').length,1);assert.match(g.body.abdomen.note,/wewnętrzne/);
});
test('torso tourniquet and IV medicines without access do not consume resources or time',()=>{
  const g=initial(0);assert.equal(act(g,'tourniquet','abdomen'),g);assert.equal(act(g,'morphine','rightArm'),g);
  assert.equal(act(initial(4),'paracetamol','head').elapsed,0);
});
test('incorrect equipment can waste a supply without fixing another region',()=>{
  const g=act(initial(0),'dressing','rightLeg');assert.equal(g.supplies.dressing,5);assert.deepEqual(g.body.leftThigh.treatments,{});
});
test('massive bleeding needs stronger control and treatment cannot be reapplied',()=>{
  const g=initial(1), dressed=act(g,'dressing','rightLeg'), stasis=act(g,'tourniquet','rightLeg');
  assert.ok(bleedingRate(dressed)>.03);assert.equal(bleedingRate(stasis),0);assert.equal(act(stasis,'tourniquet','rightLeg'),stasis);
});
test('medicines have delayed, expiring effects and repeat toxicity',()=>{
  let g=act(initial(0),'iv','rightArm');g=act(g,'morphine','rightArm');
  assert.equal(activeMedicines(g).length,0);assert.equal(respiratoryBurden(g),0);
  g=act(g,'vitals');assert.equal(activeMedicines(g).length,1);assert.ok(respiratoryBurden(g)>0);assert.ok(pain(g)<9);
  const before=g.blood;g=act(g,'morphine','rightArm');assert.ok(g.blood<before-9);assert.ok(g.respiratoryDepression>1);
  let safe=act(initial(0),'hemostatic','leftLeg');safe=act(safe,'iv','rightArm');safe=act(safe,'morphine','rightArm');safe=wait(safe,10);
  assert.equal(activeMedicines(safe).length,0);assert.equal(respiratoryBurden(safe),0);
});
test('history exposes allergy and ignoring it produces a reaction',()=>{
  let g=initial(5);assert.equal(g.historyKnown,false);g=act(g,'history');assert.equal(g.historyKnown,true);
  const before=g.blood;g=act(g,'paracetamol','head');assert.ok(g.blood<=before-12);assert.match(g.log.at(-1).text,/uczuleniowa/);
});
test('oxygen expires and can be replaced, IV fluid supports without creating blood',()=>{
  let g=act(initial(0),'hemostatic','leftLeg');g=act(g,'oxygen');assert.equal(g.supplies.oxygen,1);
  assert.equal(act(g,'oxygen'),g);g=wait(g,10);assert.ok(g.oxygenUntil<=g.elapsed);
  g=act(g,'oxygen');assert.equal(g.supplies.oxygen,0);
  g=act(g,'iv','rightArm');const blood=g.blood;g=act(g,'fluid','rightArm');g=wait(g,2);assert.ok(g.fluidSupport>5);assert.ok(g.blood<=blood);
});
test('disconnected monitor preserves timestamped snapshots until an explicit measurement',()=>{
  const disconnected=initial(0);disconnected.monitoring=false;
  let g=act(disconnected,'vitals'), snapshot=structuredClone(g.vitals);g=wait(g,1);assert.deepEqual(g.vitals,snapshot);
  g=act(g,'vitals');assert.ok(g.vitals.time>snapshot.time);
});
test('airway correction and CPR can reverse hypoxic cardiac arrest',()=>{
  let g=initial(4);while(!g.arrest&&g.status==='active')g=act(g,'wait30');
  assert.ok(g.arrest);g=act(g,'airway','head');g=act(g,'oxygen');g=act(g,'cpr');g=act(g,'cpr');
  assert.equal(g.arrest,null);assert.equal(g.status,'active');assert.ok(g.log.some(e=>/Powrót oznak/.test(e.text)));
});
test('AED refuses asystole and transport does not win during arrest',()=>{
  let g=initial(4);g.transportAt=10;g.oxygen=37;g=act(g,'wait30');assert.ok(g.arrest);assert.equal(g.status,'active');
  g=act(g,'aed');assert.equal(g.vitals.rhythm,'Asystolia');assert.ok(g.log.some(e=>/niedefibrylacyjny/.test(e.text)));
});
test('ended cases are immutable; transport requests cannot reset the ETA',()=>{
  let g=act(initial(2),'transport');assert.equal(act(g,'transport'),g);g=wait(g,30);assert.equal(g.status,'saved');assert.equal(act(g,'vitals'),g);
});
test('versioned saves roundtrip and reject corrupt/old content',()=>{
  const g=act(initial(0),'examine','leftLeg');assert.deepEqual(restoreGame(JSON.stringify(g)),g);
  assert.equal(restoreGame('{'),null);assert.equal(restoreGame({version:1}),null);
  for(const bad of [{...g,blood:NaN},{...g,injuries:[{part:'leftLeg',type:'missing'}]},{...g,supplies:{}},{...g,body:{}}])assert.equal(restoreGame(bad),null);
});
test('storage failure is recoverable and catalog expansion initializes inventory',()=>{
  assert.equal(saveProgress(initial(0),{saved:0,lost:0},{setItem(){throw Error();}}),false);
  assert.equal(loadProgress({getItem(){throw Error();}}).game,null);
  const g=initial(0);for(const item of ITEMS.filter(i=>i.count!==null))assert.equal(g.supplies[item.id],item.count);
});
test('adding equipment or medication needs no engine or UI changes and migrates saved inventory',async()=>{
  const {renderBag}=await import('../src/ui/bag.js');
  const saved=initial(0);
  ITEMS.push({id:'extensionDressing',name:'Testowy opatrunek',category:'equipment',count:2,time:10,effect:'dressing',target:true,description:'Dodatkowa zawartość.'});
  ITEMS.push({id:'extensionMedicine',name:'Testowy lek',category:'medicine',count:2,time:5,effect:'medicine',route:'Doustnie',onset:5,duration:100,painRelief:3,description:'Test.',risk:'Test.'});
  try{
    validateCatalogs();let g=createGame(0,()=>0);
    assert.match(renderBag(g,'leftLeg','equipment'),/Testowy opatrunek/);
    assert.match(renderBag(g,'leftLeg','medicine'),/Testowy lek/);
    g=act(g,'extensionDressing','leftLeg');assert.equal(g.body.leftThigh.treatments.dressing,0);
    g=act(g,'extensionMedicine');assert.ok(pain(g)<9);assert.equal(g.supplies.extensionMedicine,1);
    const restored=restoreGame(saved);assert.equal(restored.supplies.extensionDressing,2);assert.equal(saved.supplies.extensionDressing,undefined);
  }finally{ITEMS.splice(-2);}
});
test('IV is local: a tourniquet on that arm blocks drugs and fluids but another arm works',()=>{
  let g=initial(0);g=act(g,'tourniquet','rightArm');g=act(g,'iv','rightArm');
  assert.ok(g.body.rightForearm.ivAt!==null);assert.equal(g.body.leftForearm.ivAt,null);
  const count=g.supplies.morphine;g=act(g,'morphine','rightArm');
  assert.equal(g.supplies.morphine,count-1);assert.equal(g.medications.length,0);assert.match(g.log.at(-1).text,/Brak efektu/);
  g=act(g,'fluid','rightArm');assert.equal(g.infusions.length,0);assert.equal(g.fluidSupport,0);
  g=act(g,'iv','leftArm');g=act(g,'morphine','leftArm');assert.equal(g.medications.length,1);assert.equal(g.medications[0].site,'leftForearm');
});
test('placing a tourniquet after IV stops a running infusion without undoing delivered medicine',()=>{
  let g=act(initial(0),'iv','rightArm');g=act(g,'fluid','rightArm');
  assert.ok(g.fluidSupport>0);g=act(g,'morphine','rightArm');g=act(g,'tourniquet','rightArm');
  const support=g.fluidSupport;g=act(g,'wait30');assert.ok(g.fluidSupport<support);assert.equal(g.medications.length,1);
});
test('a dressing targets a single wound and wound IDs cannot target a different region',()=>{
  let g=initial(0);const [shot,fracture]=g.injuries;
  assert.equal(act(g,'dressing','rightLeg',shot.id),g);
  g=act(g,'dressing','leftLeg',shot.id);
  assert.equal(g.injuries.find(i=>i.id===shot.id).treatments.dressing,0);
  assert.equal(g.injuries.find(i=>i.id===fracture.id).treatments.dressing,undefined);
  const used=g.supplies.dressing;g=act(g,'dressing','leftLeg',fracture.id);assert.equal(g.supplies.dressing,used-1);
});
test('legacy saves migrate global IV to one arm and preserve old wound dressings',()=>{
  const g=initial(0);g.iv=true;
  for(const p of Object.values(g.body))delete p.ivAt;
  for(const i of g.injuries)delete i.treatments;
  g.body.leftThigh.treatments.dressing=5;
  const restored=restoreGame(g);assert.equal(restored.body.rightForearm.ivAt,0);assert.equal(restored.body.leftForearm.ivAt,null);
  assert.equal(restored.injuries[0].treatments.dressing,5);assert.equal(restored.iv,undefined);
});
test('context actions come from the catalog and never expose hidden injury names',async()=>{
  const {contextActions}=await import('../src/ui/context-actions.js');
  const g=initial(2), entries=contextActions(g,'abdomen');
  assert.ok(entries.some(e=>e.id==='examine'));assert.ok(!JSON.stringify(entries).includes('Podejrzenie krwawienia'));
  ITEMS.push({id:'contextExtension',name:'Nowy sprzęt',count:1,time:5,effect:'splint',category:'equipment',limbOnly:true});
  try{assert.ok(contextActions(g,'leftArm').some(e=>e.id==='contextExtension'));assert.ok(!contextActions(g,'abdomen').some(e=>e.id==='contextExtension'));}finally{ITEMS.pop();}
});
test('IV cannot bypass the procedure and malformed attempts do not consume time or supplies',()=>{
  const g=initial(0);assert.equal(engineAct(g,'iv','leftArm'),g);
  for(const bad of [{...perfectIV,depth:NaN},{...perfectIV,point:{x:900,y:140}},{...perfectIV,approach:-1},{...perfectIV,aborted:undefined}])assert.equal(engineAct(g,'iv','leftArm',null,bad),g);
});
test('site, approach and insertion depth affect the outcome independently',async()=>{
  const {resolveIVAttempt}=await import('../src/simulation/procedures.js');
  const g=initial(0),good=resolveIVAttempt(g,'leftArm',perfectIV);assert.ok(good.success);assert.ok(good.quality>.99);
  for(const poor of [{...perfectIV,point:{x:400,y:230}},{...perfectIV,approach:100},{...perfectIV,depth:.05},{...perfectIV,depth:1}])assert.equal(resolveIVAttempt(g,'leftArm',poor).success,false);
  const marginal=resolveIVAttempt(g,'leftArm',{...perfectIV,depth:.72});assert.ok(marginal.success);assert.ok(marginal.quality<good.quality);
});
test('a missed or aborted puncture consumes a kit, advances time, and leaves a local bruise',()=>{
  for(const attempt of [{...perfectIV,depth:.04},{...perfectIV,depth:.25,aborted:true}]){
    const before=initial(0),g=engineAct(before,'iv','leftArm',null,attempt);
    assert.equal(g.supplies.iv,before.supplies.iv-1);assert.equal(g.elapsed,45);assert.equal(g.body.leftForearm.ivAt,null);
    assert.ok(g.injuries.some(i=>i.part==='leftForearm'&&i.type==='contusion'&&i.position));assert.equal(before.injuries.length+1,g.injuries.length);
  }
});
test('location and technique change actual flow, fluid support and delivered medication',async()=>{
  const {flowEfficiency}=await import('../src/simulation/vascular.js');
  const forearm=engineAct(initial(0),'iv','leftArm',null,perfectIV);
  const hand=engineAct(initial(0),'iv','leftHand',null,{...perfectIV,point:{x:680,y:144.2},depth:.56});
  const weak=engineAct(initial(0),'iv','leftArm',null,{...perfectIV,depth:.72});
  assert.ok(flowEfficiency(forearm,'leftArm')>flowEfficiency(hand,'leftHand'));
  assert.ok(flowEfficiency(forearm,'leftArm')>flowEfficiency(weak,'leftArm'));
  const goodFluid=act(forearm,'fluid','leftArm'),poorFluid=act(hand,'fluid','leftArm');assert.ok(goodFluid.fluidSupport>poorFluid.fluidSupport);
  let goodDrug=act(forearm,'morphine','leftArm'),poorDrug=act(hand,'morphine','leftArm');assert.ok(goodDrug.medications[0].delivery>poorDrug.medications[0].delivery);
  goodDrug=act(goodDrug,'wait30');poorDrug=act(poorDrug,'wait30');assert.ok(pain(goodDrug)<pain(poorDrug));
});
test('tourniquets override good technique and removing an IV ends infusion, allowing another attempt',()=>{
  let g=act(initial(0),'iv','leftArm');g=act(g,'fluid','leftArm');g=act(g,'removeIV','leftArm');
  assert.equal(g.body.leftForearm.ivAt,null);assert.equal(g.body.leftForearm.ivPlacement,undefined);assert.ok(g.infusions.every(i=>i.end<=g.elapsed));
  g=act(g,'iv','leftArm');assert.ok(g.body.leftForearm.ivAt!==null);g=act(g,'tourniquet','leftArm');
  g=act(g,'morphine','leftArm');assert.equal(g.medications.length,0);
});
test('procedure quality and exact insertion position survive persistence; invalid quality is rejected',()=>{
  const g=act(initial(0),'iv','leftArm');assert.deepEqual(restoreGame(g),g);
  assert.ok(Array.isArray(g.body.leftForearm.ivPlacement.position));
  const bad=structuredClone(g);bad.body.leftForearm.ivQuality=2;assert.equal(restoreGame(bad),null);
});
test('partial IV delivery scales clotting support as well as analgesia',()=>{
  const good=engineAct(initial(0),'iv','leftArm',null,perfectIV);
  const hand=engineAct(initial(0),'iv','leftHand',null,{...perfectIV,point:{x:680,y:144.2},depth:.56});
  const goodTXA=act(act(good,'txa','leftArm'),'wait60');
  const handTXA=act(act(hand,'txa','leftArm'),'wait60');
  assert.ok(bleedingRate(goodTXA)<bleedingRate(handTXA));
  assert.ok(goodTXA.blood>handTXA.blood);
});
