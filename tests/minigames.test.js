import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act as engineAct, restoreGame, ITEMS } from '../src/engine.js';
import { PROCEDURES, autoInput, resolveTourniquet, resolveCPR, resolvePacking, resolveSeal, resolveIVAttempt } from '../src/simulation/procedures.js';
import { TOURNIQUET_PROCEDURE as TQ, CPR_PROCEDURE as CPR, PACKING_PROCEDURE as PACK, SEAL_PROCEDURE as SEAL } from '../src/content/procedures.js';
import { injuryBleeding, pain } from '../src/simulation/selectors.js';
import { hasFlow } from '../src/simulation/vascular.js';
import { tick } from '../src/simulation/physiology.js';
import { loadProgress } from '../src/storage.js';
import { act, perfectIV } from './support.js';

const fresh=(index=0)=>createGame(index,()=>.99);
const cpr=(ms,depth)=>({intervalsMs:Array(CPR.compressions-1).fill(ms),depths:Array(CPR.compressions).fill(depth),aborted:false});
const tq=tension=>({tension,timeMs:1500,aborted:false});
const pack=(filled,pressureMs)=>({filled,pressureMs,aborted:false});
const seal=(phase,attempts=1)=>({phase,attempts,aborted:false});
const arrested=()=>{const g=fresh(1);g.arrest={since:0,budget:180};return g;};

test('every new procedure is registered and attached to its item',()=>{
  for(const [item,id] of [['tourniquet','tourniquet'],['cpr','cpr'],['hemostatic','packing'],['seal','seal']])assert.equal(ITEMS.find(i=>i.id===item).procedure,id);
  for(const item of ITEMS.filter(i=>i.effect==='hemostatic'))assert.equal(item.procedure,'packing');
  for(const id of ['iv','tourniquet','cpr','packing','seal'])assert.equal(typeof PROCEDURES[id].validate,'function');
});
test('validators reject malformed input',()=>{
  const bad=[null,undefined,{},'x',42,[]];
  for(const id of ['tourniquet','cpr','packing','seal'])for(const input of bad)assert.equal(PROCEDURES[id].validate(input),false,id);
  for(const input of [{tension:1.2,timeMs:1,aborted:false},{tension:.5,timeMs:-1,aborted:false},{tension:NaN,timeMs:1,aborted:false},{tension:.5,timeMs:1}])assert.equal(PROCEDURES.tourniquet.validate(input),false);
  for(const input of [{...cpr(500,.6),depths:[.6]},{...cpr(500,.6),intervalsMs:[]},{...cpr(0,.6)},{...cpr(500,1.5)},{...cpr(9000,.6)},{...cpr(500,.6),aborted:'no'},{intervalsMs:Array(15).fill(500),depths:Array(16).fill(.6),aborted:false}])assert.equal(PROCEDURES.cpr.validate(input),false);
  for(const input of [pack(1.1,100),pack(.5,-1),pack(.5,Infinity),{filled:.5,pressureMs:10}])assert.equal(PROCEDURES.packing.validate(input),false);
  for(const input of [seal(-.1),seal(.5,0),seal(.5,3),seal(.5,1.5),{phase:.5,attempts:1}])assert.equal(PROCEDURES.seal.validate(input),false);
  assert.equal(PROCEDURES.cpr.validate({intervalsMs:[500],depths:[.6,.6],aborted:true}),true,'an aborted series may be shorter');
});
test('resolver quality is monotonic and aborted attempts never succeed',()=>{
  const thigh='leftThigh';
  const t=[tq(.73),tq(TQ.autoTension),tq(.2)].map(i=>resolveTourniquet(null,thigh,i));
  assert.ok(t[0].score>t[1].score&&t[1].score>t[2].score);assert.ok(t[0].quality>=t[1].quality&&t[1].quality>t[2].quality);
  assert.equal(resolveTourniquet(null,'leftHand',tq(.7)),null,'only tourniquet segments');
  const c=[cpr(545,.7),cpr(CPR.autoIntervalMs,CPR.autoDepth),cpr(1100,.15)].map(i=>resolveCPR(null,'chest',i));
  assert.ok(c[0].quality>c[1].quality&&c[1].quality>c[2].quality);assert.equal(c[0].quality,1);assert.ok(c[0].benefit>c[2].benefit);
  const p=[pack(1,PACK.pressureMs),pack(PACK.autoFilled,PACK.autoPressureMs),pack(.3,500)].map(i=>resolvePacking(null,thigh,i));
  assert.ok(p[0].quality>p[1].quality&&p[1].quality>p[2].quality);assert.equal(p[0].quality,1);
  const s=[seal(.75),seal(SEAL.autoPhase),seal(.2)].map(i=>resolveSeal(null,'chest',i));
  assert.ok(s[0].score>s[1].score&&s[1].score>s[2].score);assert.ok(s[1].quality>s[2].quality);assert.equal(s[0].quality,1);
  assert.equal(resolveSeal(null,'chest',seal(.75,2)).extraTime,SEAL.retryTime);
  for(const [id,input] of [['tourniquet',tq(.7)],['cpr',cpr(545,.7)],['packing',pack(1,3000)],['seal',seal(.75)]])assert.equal(PROCEDURES[id].resolve(fresh(),id==='tourniquet'?thigh:'chest',{...input,aborted:true}),null,id);
});
test('aborted or malformed attempts consume nothing',()=>{
  const g=fresh();
  assert.equal(engineAct(g,'tourniquet','leftThigh',null,{...tq(.7),aborted:true}),g);
  assert.equal(engineAct(g,'tourniquet','leftThigh'),g,'procedure input is required');
  assert.equal(engineAct(g,'hemostatic','leftThigh','injury-0',{...pack(1,3000),aborted:true}),g);
  const chest=fresh(3);assert.equal(engineAct(chest,'seal','chest','injury-0',seal(2)),chest);assert.equal(engineAct(chest,'cpr','chest',null,{...cpr(545,.7),depths:[.7]}),chest);
});
test('tourniquet quality decides distal bleeding, IV occlusion and pain',()=>{
  const g=fresh(),wound=g.injuries.find(i=>i.part==='leftThigh'&&injuryBleeding(g,i)>0),untreated=injuryBleeding(g,wound);
  const good=engineAct(g,'tourniquet','leftThigh',null,tq(.73)),loose=engineAct(g,'tourniquet','leftThigh',null,tq(.3)),tight=engineAct(g,'tourniquet','leftThigh',null,tq(.97));
  assert.equal(injuryBleeding(good,good.injuries.find(i=>i.id===wound.id)),0);
  const leak=injuryBleeding(loose,loose.injuries.find(i=>i.id===wound.id));
  assert.ok(leak>0&&leak<untreated,'partial tourniquet leaks less than untreated but more than zero');
  assert.ok(loose.body.leftThigh.tourniquetQuality<.5);assert.match(loose.log.at(-1).text,/za słabo/);
  assert.equal(injuryBleeding(tight,tight.injuries.find(i=>i.id===wound.id)),0);
  assert.ok(tight.body.leftThigh.tourniquetStrain>0);assert.ok(pain(tight)>pain(good));assert.match(tight.log.at(-1).text,/nadmiernym/);
  // A loose tourniquet may be re-tightened; a good one may not be duplicated.
  assert.notEqual(engineAct(loose,'tourniquet','leftThigh',null,tq(.73)),loose);assert.equal(engineAct(good,'tourniquet','leftThigh',null,tq(.73)),good);
  // IV occlusion only from quality >= .5.
  let arm=act(fresh(),'iv','leftForearm',null,perfectIV);
  assert.equal(hasFlow(engineAct(arm,'tourniquet','leftUpperArm',null,tq(.2)),'leftForearm'),true);
  assert.equal(hasFlow(engineAct(arm,'tourniquet','leftUpperArm',null,tq(.5)),'leftForearm'),false,'quality .5 under-tightening still occludes IV');
  assert.equal(hasFlow(engineAct(arm,'tourniquet','leftUpperArm',null,tq(.73)),'leftForearm'),false);
});
test('better CPR preserves more of the arrest budget',()=>{
  const good=engineAct(arrested(),'cpr','chest',null,cpr(545,.7)),poor=engineAct(arrested(),'cpr','chest',null,cpr(1100,.15)),auto=act(arrested(),'cpr');
  const budget=g=>g.arrest?g.arrest.budget:Infinity;
  assert.ok(budget(good)>budget(auto)&&budget(auto)>budget(poor),`${budget(good)} ${budget(auto)} ${budget(poor)}`);
  assert.equal(good.cprBenefit,undefined,'transient CPR benefit is cleared after the action');
  assert.match(poor.log.at(-1).text,/Jakość uciśnięć/);
});
test('packing quality scales the hemostatic bleeding reduction',()=>{
  const g=fresh(),id='injury-0',rate=s=>injuryBleeding(s,s.injuries.find(i=>i.id===id));
  const best=engineAct(g,'hemostatic','leftThigh',id,pack(1,PACK.pressureMs)),mid=act(g,'hemostatic','leftThigh',id),poor=engineAct(g,'hemostatic','leftThigh',id,pack(.2,0));
  assert.equal(best.injuries.find(i=>i.id===id).packQuality,1);
  assert.ok(rate(best)<rate(mid)&&rate(mid)<rate(poor)&&rate(poor)<rate(g));
});
test('seal timing scales oxygen loss from the chest wound',()=>{
  const g=fresh(3),id=g.injuries.find(i=>i.part==='chest').id;
  const run=s=>{s=structuredClone(s);s.oxygen=90;const before=s.oxygen;tick(s);return before-s.oxygen;};
  const good=engineAct(g,'seal','chest',id,seal(.75)),poor=engineAct(g,'seal','chest',id,seal(.1)),retry=engineAct(g,'seal','chest',id,seal(.75,2));
  assert.equal(good.injuries.find(i=>i.id===id).sealQuality,1);assert.ok(poor.injuries.find(i=>i.id===id).sealQuality<1);
  assert.ok(run(good)<run(poor)&&run(poor)<run(g),'partial seal reduces oxygen loss less');
  assert.equal(retry.elapsed,good.elapsed+SEAL.retryTime,'a second try costs game time');
});
test('auto inputs are valid and middling for every procedure',()=>{
  const g=fresh();
  const results={tourniquet:resolveTourniquet(g,'leftThigh',autoInput('tourniquet',g,'leftThigh')),cpr:resolveCPR(g,'chest',autoInput('cpr',g,'chest')),packing:resolvePacking(g,'leftThigh',autoInput('packing',g,'leftThigh')),seal:resolveSeal(g,'chest',autoInput('seal',g,'chest'))};
  for(const [id,r] of Object.entries(results)){assert.ok(PROCEDURES[id].validate(autoInput(id,g,'chest')),id);assert.ok(r.success,id);assert.ok(r.score>.65&&r.score<.8,`${id} ${r.score}`);}
  for(const part of ['rightElbow','rightForearm','rightHand']){const r=resolveIVAttempt(g,part,autoInput('iv',g,part));assert.ok(r.success&&r.quality>.8,part);}
  assert.equal(autoInput('unknown',g,'chest'),null);
});
test('restoreGame validates new optional fields and keeps legacy saves at full effect',()=>{
  let g=act(fresh(),'tourniquet','leftThigh');g=act(g,'hemostatic','leftThigh','injury-0');
  const legacy=structuredClone(g);for(const p of Object.values(legacy.body)){delete p.tourniquetQuality;delete p.tourniquetStrain;}for(const i of legacy.injuries){delete i.packQuality;delete i.sealQuality;}
  const restored=restoreGame(JSON.stringify(legacy));assert.ok(restored);assert.equal(restored.version,3);
  assert.equal(injuryBleeding(restored,restored.injuries.find(i=>i.part==='leftThigh')),0,'legacy tourniquet still occludes fully');
  const tight=engineAct(fresh(),'tourniquet','leftThigh',null,tq(.95));assert.ok(restoreGame(JSON.stringify(tight)).body.leftThigh.tourniquetStrain>0);
  for(const mutate of [s=>{s.body.leftThigh.tourniquetQuality=1.5;},s=>{s.body.leftThigh.tourniquetStrain='x';},s=>{s.injuries[0].packQuality=-1;},s=>{s.injuries[0].sealQuality=NaN;}]){const bad=structuredClone(tight);mutate(bad);assert.equal(restoreGame(JSON.stringify(bad)),null);}
});
test('minigame setting defaults on and tolerates invalid values',()=>{
  const memory=value=>({getItem:()=>value});
  assert.equal(loadProgress(memory(null)).stats.minigames,'on');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{minigames:'off'}}))).stats.minigames,'off');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{minigames:7}}))).stats.minigames,'on');
  assert.equal(loadProgress(memory('{broken')).stats.minigames,'on');
});
