import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { act } from './support.js';
import { TUTORIAL_STEPS } from '../src/content/tutorial.js';
import { tutorialProgress } from '../src/simulation/tutorial.js';
import { renderTutorial } from '../src/ui/tutorial.js';
import { loadProgress, saveProgress } from '../src/storage.js';
const fresh=()=>createGame(0,()=>.99);
const memory=value=>({getItem:()=>value});
test('steps have unique ids and non-empty Polish text',()=>{
  assert.equal(new Set(TUTORIAL_STEPS.map(s=>s.id)).size,TUTORIAL_STEPS.length);
  for(const s of TUTORIAL_STEPS){assert.ok(s.title.length>0&&s.text.length>0);assert.match(s.title+s.text,/[ąćęłńóśźż]/i);assert.equal(typeof s.done,'function');}
});
test('fresh game starts at step 0',()=>{
  const p=tutorialProgress(fresh());
  assert.equal(p.index,0);assert.equal(p.total,TUTORIAL_STEPS.length);assert.equal(p.complete,false);assert.equal(p.step.id,'examine');
  assert.match(renderTutorial(p),/data-tutorial-skip/);
});
test('real actions advance the tutorial to completion',()=>{
  let g=fresh();
  g=act(g,'examine','leftLeg');assert.equal(tutorialProgress(g).step.id,'vitals');
  g=act(g,'vitals');assert.equal(tutorialProgress(g).step.id,'transport');
  g=act(g,'transport');assert.equal(tutorialProgress(g).step.id,'treat');
  g=act(g,'tourniquet','leftLeg');assert.equal(tutorialProgress(g).step.id,'observe');
  g=act(g,'wait30');
  const p=tutorialProgress(g);assert.equal(p.complete,true);assert.equal(p.index,p.total);assert.equal(p.step,null);
});
test('storage defaults tutorial for new users and tolerates old saves',()=>{
  assert.equal(loadProgress(memory(null)).stats.tutorial,'on');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{saved:0,lost:0,best:0}}))).stats.tutorial,'on');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{saved:2,lost:0,best:50}}))).stats.tutorial,'off');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{saved:0,lost:0,tutorial:'off'}}))).stats.tutorial,'off');
  assert.equal(loadProgress(memory(JSON.stringify({stats:{saved:0,lost:0,tutorial:'bogus'}}))).stats.tutorial,'on');
  let raw;saveProgress(null,{saved:0,lost:0,best:0,tutorial:'off'},{setItem:(k,v)=>{raw=v;}});
  assert.equal(loadProgress(memory(raw)).stats.tutorial,'off');
});
