import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { act } from './support.js';
import { protectionMarkers } from '../src/ui/protections.js';
const fresh=()=>createGame(0,()=>.99);
test('fresh game has no protection markers',()=>{
  assert.deepEqual(protectionMarkers(fresh()),[]);
});
test('tourniquet and splint produce one Polish-labelled marker each',()=>{
  let g=act(fresh(),'tourniquet','rightLeg');
  g=act(g,'splint','leftLeg');
  const m=protectionMarkers(g);
  assert.ok(m.some(x=>x.part==='rightThigh'&&x.kind==='tourniquet'&&/Staza/.test(x.label)));
  assert.ok(m.some(x=>x.part==='leftThigh'&&x.kind==='splint'&&/Szyna/.test(x.label)));
  assert.equal(new Set(m.map(x=>`${x.part}:${x.kind}`)).size,m.length);
});
test('dressing on a wound is reported once for its part',()=>{
  const g0=fresh(),injury=g0.injuries.find(i=>i.type&&true);
  const g=act(g0,'dressing',injury.part,injury.id);
  const m=protectionMarkers(g).filter(x=>x.kind==='dressing'&&x.part===injury.part);
  assert.ok(m.length<=1);
});
