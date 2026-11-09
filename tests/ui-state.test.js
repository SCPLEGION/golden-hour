import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress, sanitizeHistory } from '../src/storage.js';
import { renderStatsPanel } from '../src/ui/stats-panel.js';
import { TUTORIAL_STEPS } from '../src/content/tutorial.js';
const store=raw=>({getItem:()=>raw,setItem(k,v){this.saved=v;}});
const entry=i=>({scenarioId:'fall',status:i%2?'saved':'lost',total:i,grade:'B',difficulty:'normal'});
test('history is tolerant of missing or invalid data',()=>{
  assert.deepEqual(loadProgress(store(null)).stats.history,[]);
  assert.deepEqual(loadProgress(store(JSON.stringify({stats:{history:'x'}}))).stats.history,[]);
  const h=sanitizeHistory([null,5,{status:'weird'},{status:'saved',total:'x',difficulty:'nope',scenarioId:7}]);
  assert.equal(h.length,1);assert.equal(h[0].total,0);assert.equal(h[0].difficulty,'normal');assert.equal(h[0].scenarioId,'');
});
test('history is capped at 10 and survives a save/load round trip',()=>{
  const history=Array.from({length:25},(_,i)=>entry(i));
  assert.equal(sanitizeHistory(history).length,10);
  assert.equal(sanitizeHistory(history).at(-1).total,24);
  const s=store();saveProgress(null,{saved:1,lost:0,best:5,tutorial:'off',difficulty:'normal',history},s);
  assert.equal(loadProgress(store(s.saved)).stats.history.length,10);
});
test('stats panel escapes HTML and handles empty history',()=>{
  const base={saved:1,lost:2,best:50,tutorial:'on',difficulty:'normal'};
  assert.match(renderStatsPanel({...base,history:[]}),/Brak zakończonych wezwań/);
  assert.match(renderStatsPanel(base),/Brak zakończonych wezwań/);
  const html=renderStatsPanel({...base,history:[{scenarioId:'<img onerror=1>',status:'lost',total:3,grade:'<b>x</b>',difficulty:'normal'}]});
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<b>x</b>'));assert.match(html,/&lt;img/);
});
test('tutorial focus selectors are strings and mostly unique',()=>{
  const focus=TUTORIAL_STEPS.map(s=>s.focus);
  assert.ok(focus.every(f=>typeof f==='string'&&f.length>0));
  assert.equal(new Set(focus).size,focus.length);
});
