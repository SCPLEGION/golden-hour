import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SCENARIOS } from '../src/engine.js';
import { CONDITIONS } from '../src/content/conditions.js';
import { PROFILES, rescueMatrix } from './support.js';
// Expert (0.9): 35-minute delay, bleeding ×1.8, 40% of the bag, deadlines ×0.5, four extra injuries, frequent
// complications, no monitor at the start and hidden injuries (the policy examines them first). Not every call can be won:
// the reference policy must still rescue at least 80% of them; the losses are listed in the test output.
test('expert: the reference policy rescues at least 80% of scenarios and patient states (heavy/light)',t=>{
  for(const [name,profile] of Object.entries(PROFILES)){
    const rows=rescueMatrix('expert',profile,{scenarios:SCENARIOS,conditions:CONDITIONS,create:createGame});
    for(const r of rows)assert.equal(r.start.transportDelay,2100,r.id);
    const saved=rows.filter(r=>r.status==='saved'),lost=rows.filter(r=>r.status!=='saved');
    t.diagnostic(`expert/${name}: saved ${saved.length}/${rows.length} (${(100*saved.length/rows.length).toFixed(0)}%)`);
    for(const r of lost)t.diagnostic(`  lost ${r.id} at ${r.g.elapsed} s, max loss ${r.maxLoss.toFixed(2)}, complications: ${r.complications.map(e=>e.id+(e.resolvedAt===null?' (open)':'')).join(', ')||'none'}`);
    assert.ok(saved.length>=.8*rows.length,`expert/${name}: ${saved.length}/${rows.length}`);
  }
});
