import test from 'node:test';
import assert from 'node:assert/strict';
import * as Engine from '../src/engine.js';
import {sampleMonitor,HISTORY_LIMIT} from '../src/simulation/monitor.js';
import {createRealtimeDriver} from '../src/simulation/realtime.js';

const seed=id=>Engine.createGame(Engine.SCENARIOS.findIndex(c=>c.id===id),()=>.99);
const advance=(g,seconds)=>{assert.equal(typeof Engine.advanceTime,'function','advanceTime engine export');return Engine.advanceTime(g,seconds);};

test('a new patient has an initial live monitor reading and real physiology changes over time',()=>{
  const g=seed('gunshot');assert.equal(g.monitoring,true);assert.equal(g.paused,false);assert.equal(g.speed,1);
  assert.ok(g.vitals);assert.equal(g.vitals.time,0);
  const next=advance(g,20);assert.equal(g.elapsed,0);assert.equal(next.elapsed,20);
  assert.ok(next.blood<g.blood);assert.equal(next.vitals.time,next.elapsed);assert.notDeepEqual(next.vitals,g.vitals);
});

test('monitor oscillations are deterministic and treatment changes the physiological trend',()=>{
  const stable=seed('footballPitch'),a=advance(stable,12),b=advance(structuredClone(stable),12);
  assert.deepEqual(a.vitals,b.vitals);
  assert.ok(new Set(a.monitorHistory.map(v=>v.pulse)).size>1);
  const hemorrhage=seed('workshop');
  const untreated=advance(hemorrhage,120);
  const controlled=Engine.act(hemorrhage,'tourniquet','rightLeg');
  const treated=advance(controlled,120-controlled.elapsed);
  assert.equal(treated.elapsed,untreated.elapsed);assert.ok(treated.blood>untreated.blood);assert.ok(treated.vitals.pulse<untreated.vitals.pulse);
});

test('oxygen loss and corrective airway care appear on the live monitor without manual measuring',()=>{
  const g=seed('airway'),untreated=advance(g,120);
  const opened=Engine.act(g,'airway','head'),treated=advance(opened,120-opened.elapsed);
  assert.ok(treated.vitals.oxygen>untreated.vitals.oxygen+10);
  assert.equal(treated.vitals.time,120);assert.equal(untreated.vitals.time,120);
});

test('pausing freezes automatic time while deliberate care still consumes action time',()=>{
  const g=seed('gunshot');g.paused=true;
  assert.equal(advance(g,30),g);assert.equal(g.elapsed,0);
  const care=Engine.act(g,'vitals');assert.equal(care.paused,true);assert.equal(care.elapsed,20);assert.equal(care.vitals.time,20);
  assert.equal(advance(care,30),care);
});

test('an unplugged monitor preserves its last reading until explicitly measured again',()=>{
  const g=seed('gunshot');g.monitoring=false;
  const snapshot=structuredClone(g.vitals),history=structuredClone(g.monitorHistory);
  const next=advance(g,30);
  assert.deepEqual(next.vitals,snapshot);assert.deepEqual(next.monitorHistory,history);assert.ok(next.blood<g.blood);
  sampleMonitor(next,true);assert.equal(next.vitals.time,30);assert.ok(next.vitals.pulse!==snapshot.pulse);
});

test('monitor history is bounded, ordered, and resampling the same second does not duplicate',()=>{
  const g=advance(seed('footballPitch'),180);
  assert.equal(g.monitorHistory.length,HISTORY_LIMIT);assert.equal(HISTORY_LIMIT,60);
  for(let i=1;i<g.monitorHistory.length;i++)assert.ok(g.monitorHistory[i].time>g.monitorHistory[i-1].time);
  const time=g.vitals.time;sampleMonitor(g,true);
  assert.equal(g.monitorHistory.length,HISTORY_LIMIT);assert.equal(g.monitorHistory.at(-1).time,time);
});

test('automatic catchup is capped and invalid/ended advances are inert',()=>{
  const g=seed('footballPitch');assert.equal(advance(g,10000).elapsed,600);
  for(const seconds of [0,-10,NaN,.5])assert.equal(advance(g,seconds),g);
  for(const status of ['saved','lost']){const ended={...g,status};assert.equal(advance(ended,15),ended);}
});

function fakeDriver(){
  const state={time:0,running:true,speed:1,advances:[],scheduled:[],cancelled:[]};
  const driver=createRealtimeDriver({canRun:()=>state.running,getSpeed:()=>state.speed,onAdvance:n=>state.advances.push(n),now:()=>state.time,schedule:(callback,ms)=>{state.scheduled.push({callback,ms});return state.scheduled.length;},cancel:id=>state.cancelled.push(id)});
  const pulse=milliseconds=>{state.time+=milliseconds;driver.pulse();};
  return {state,driver,pulse};
}

test('the realtime driver accumulates fractional seconds and applies current speed',()=>{
  const {state,driver,pulse}=fakeDriver();driver.start();driver.start();
  assert.equal(state.scheduled.length,1);assert.equal(state.scheduled[0].ms,200);
  pulse(400);assert.deepEqual(state.advances,[]);pulse(600);assert.deepEqual(state.advances,[1]);
  state.speed=4;pulse(250);assert.deepEqual(state.advances,[1,1]);
  state.running=false;pulse(1250);assert.deepEqual(state.advances,[1,1]);
  state.running=true;pulse(250);assert.deepEqual(state.advances,[1,1,1]);
  driver.stop();driver.stop();assert.deepEqual(state.cancelled,[1]);
});

test('modal reset discards fractional credit and hidden-tab time is not replayed',()=>{
  const {state,driver,pulse}=fakeDriver();driver.start();pulse(800);
  state.time+=30000;driver.reset();pulse(200);assert.deepEqual(state.advances,[]);
  pulse(800);assert.deepEqual(state.advances,[1]);
  state.time+=120000;driver.pulse();assert.deepEqual(state.advances,[1,1]);
});

test('speed changes and suspended-tab clamp cannot advance unbounded time in one callback',()=>{
  const {state,driver,pulse}=fakeDriver();driver.start();state.speed=4;
  pulse(60000);assert.deepEqual(state.advances,[5]);
  assert.ok(state.advances.every(n=>n<=8));
  driver.stop();driver.start();pulse(200);assert.deepEqual(state.advances,[5]);
  pulse(50);assert.deepEqual(state.advances,[5,1]);
});

test('reconnecting the monitor resumes readings after a disconnected snapshot',()=>{
  let g=seed('gunshot');g.monitoring=false;g=advance(g,30);assert.equal(g.vitals.time,0);
  g=Engine.act(g,'monitor','chest');assert.equal(g.monitoring,true);assert.equal(g.vitals.time,g.elapsed);
  const latest=g.vitals.time;g=advance(g,5);assert.equal(g.vitals.time,latest+5);
});

test('terminal physiology stops live advancement and no longer displays a live pulse',()=>{
  const g=advance(seed('airway'),600);assert.equal(g.status,'lost');assert.equal(g.vitals.pulse,0);assert.equal(g.vitals.rhythm,'Asystolia');
  assert.equal(advance(g,60),g);assert.equal(g.monitorHistory.at(-1).time,g.elapsed);
});

test('clock controls and monitor history roundtrip, while older saves initialize live defaults',()=>{
  const current=advance(seed('footballPitch'),10);current.paused=true;current.speed=4;
  assert.deepEqual(Engine.restoreGame(current),current);
  const old=structuredClone(current);for(const key of ['paused','speed','monitoring','monitorHistory'])delete old[key];old.vitals=null;
  const restored=Engine.restoreGame(old);assert.ok(restored);assert.equal(restored.paused,false);assert.equal(restored.speed,1);assert.equal(restored.monitoring,true);
  assert.equal(restored.vitals.time,restored.elapsed);assert.equal(restored.monitorHistory.length,1);
  for(const invalid of [{...current,speed:100},{...current,paused:'false'},{...current,monitorHistory:[{time:0,pulse:NaN,oxygen:99,pressure:'100/60'}]}])assert.equal(Engine.restoreGame(invalid),null);
});

test('malformed saved medication burden cannot poison the realtime physiology with NaN',()=>{
  for(const burden of ['corrupt',NaN,-1]){
    const g=seed('gunshot');g.medications.push({id:'morphine',start:0,end:999,delivery:1,burden});
    assert.equal(Engine.restoreGame(g),null);
  }
});
