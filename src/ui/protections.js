import { BODY_PARTS } from '../content/body.js';
import { itemById } from '../content/items.js';
import { PLACED_VISUALS } from '../content/presentation.js';
import { activeSupports } from '../simulation/modifiers.js';
// Pure, state-derived list of active protections per body part (no DOM).
const treatmentLabel=key=>PLACED_VISUALS[key]?.name||itemById(key)?.name||key;
export function protectionMarkers(g) {
  const out=[],seen=new Set();
  const add=(part,kind,label)=>{const id=`${part}:${kind}`;if(seen.has(id))return;seen.add(id);out.push({part,kind,label});};
  for(const p of BODY_PARTS){
    for(const key of Object.keys(g.body[p.id]?.treatments||{}))add(p.id,key,`${treatmentLabel(key)} — ${p.name}`);
    for(const injury of g.injuries.filter(i=>i.part===p.id))
      for(const key of Object.keys(injury.treatments||{}))add(p.id,key,`${treatmentLabel(key)} — ${p.name}`);
    const ivAt=g.body[p.id]?.ivAt;
    if(ivAt!==null&&ivAt!==undefined)add(p.id,'iv',`Wenflon — ${p.name}`);
  }
  for(const s of activeSupports(g)){
    const part=BODY_PARTS.find(p=>p.id===s.target);
    if(part)add(part.id,s.id,`${treatmentLabel(s.id)} — ${part.name}`);
  }
  return out;
}
