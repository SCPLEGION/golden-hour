import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame } from './support.js';
import { SCENARIOS, ITEMS } from '../src/engine.js';
import { BODY_PARTS, bodyPart, outlineSpan, segmentAngle, limbWidth, cutPoint } from '../src/content/body.js';
import { INJURIES } from '../src/content/injuries.js';
import { renderBodyScene } from '../src/ui/body-scene.js';
import { DEVICE_ART, WOUND_ART, itemIcon } from '../src/ui/visuals.js';

const fresh=()=>createGame(SCENARIOS.findIndex(s=>s.id==='gunshot'),()=>.99);
const deg=r=>r*180/Math.PI;
// Direction of a limb band measured from the drawn outline: midpoints of its horizontal spans at both band edges.
const outlineAngle=id=>{const p=bodyPart(id),mid=y=>{const s=outlineSpan(p.base,y);return (s[0]+s[1])/2;};const [y0,y1]=[p.clip[0]+8,p.clip[1]-8];return deg(Math.atan2(mid(y0)-mid(y1),y1-y0));};
const placed=(html,part,device)=>{const m=html.match(new RegExp(`<g class="placed-device" transform="translate\\(([\\d.-]+) ([\\d.-]+)\\)(?: rotate\\(([\\d.-]+)\\) scale\\(([\\d.]+)\\))?"[^>]*data-part="${part}" data-device="${device}"`));assert.ok(m,`${device} on ${part}`);return {x:+m[1],y:+m[2],angle:+(m[3]||0),scale:+(m[4]||1)};};
// First <rect> of an art string: its width/height tell which local axis the long side runs along.
const firstRect=art=>{const [,w,h]=art.match(/<rect[^>]*width="([\d.]+)" height="([\d.]+)"/);return {w:+w,h:+h};};

test('every limb segment has a proximal → distal axis and the left side mirrors the right',()=>{
  for(const p of BODY_PARTS.filter(p=>p.limb)){
    assert.ok(Array.isArray(p.axis)&&p.axis.length===2&&p.axis.every(pt=>pt.length===2&&pt.every(Number.isFinite)),p.id);
    assert.ok(p.axis[1][1]>p.axis[0][1],`${p.id} axis points distal (+y)`);
    if(p.id.startsWith('right'))assert.ok(segmentAngle(p.id.replace('right','left'))===-segmentAngle(p.id),p.id);
    const span=outlineSpan(p.base,p.anchor[1]);assert.ok(span&&p.anchor[0]>span[0]&&p.anchor[0]<span[1],`${p.id} anchor inside its outline`);
    assert.ok(limbWidth(p.id)>25&&limbWidth(p.id)<140,`${p.id} width ${limbWidth(p.id)}`);
  }
  for(const p of BODY_PARTS.filter(p=>!p.limb))assert.equal(segmentAngle(p.id),0,p.id);
  // Long bands follow the drawn limb.
  for(const id of ['rightUpperArm','rightForearm','rightThigh','rightShin','leftForearm'])assert.ok(Math.abs(segmentAngle(id)-outlineAngle(id))<=15,`${id}: ${segmentAngle(id)} vs outline ${outlineAngle(id).toFixed(1)}`);
});

test('a forearm splint runs along the forearm and a tourniquet wraps across the limb',()=>{
  let g=fresh();g.injuries=[{id:'f',part:'rightForearm',type:'fracture',treatments:{}}];
  g=act(g,'splint','rightForearm');g=act(g,'tourniquet','rightThigh');g=act(g,'tourniquet','leftUpperArm');
  const html=renderBodyScene(g,'chest'),splint=placed(html,'rightForearm','splint');
  const forearm=outlineAngle('rightForearm');
  assert.ok(Math.abs(splint.angle-forearm)<=15&&Math.abs(splint.angle)>3,`splint ${splint.angle}° vs forearm ${forearm.toFixed(1)}°`);
  // The splint art is long along local y (the rotated limb axis); the tourniquet strap is long along local x (across it).
  const s=firstRect(DEVICE_ART.splint),t=firstRect(DEVICE_ART.tourniquet);assert.ok(s.h>2*s.w);assert.ok(t.w>3*t.h);
  for(const part of ['rightThigh','leftUpperArm']){
    const tq=placed(html,part,'tourniquet');
    assert.equal(tq.angle,segmentAngle(part),part);
    // The strap covers the limb width once scaled (it wraps the limb, it does not float on it).
    assert.ok(t.w*tq.scale>=limbWidth(part,tq.y)*.95,`${part}: strap ${t.w*tq.scale} vs limb ${limbWidth(part,tq.y)}`);
  }
  // Splint width is scaled to the limb as well.
  assert.ok(Math.abs(s.w*splint.scale-limbWidth('rightForearm',splint.y)*1.24)<15);
});

test('torso and head devices stay upright; wound covers on limbs follow the limb',()=>{
  let g=fresh();g.injuries=[{id:'c',part:'chest',type:'chestWound',treatments:{}},{id:'l',part:'leftShin',type:'laceration',treatments:{}}];
  g=act(g,'seal','chest','c');g=act(g,'dressing','leftShin','l');g=act(g,'warmingPack','chest');
  const html=renderBodyScene(g,'chest');
  const chest=html.match(/data-injury="c"[^>]*>(?:<title>[^<]*<\/title>)?<circle class="wound-hit" r="49"\/><g( transform="[^"]*")?>/);assert.ok(chest);assert.equal(chest[1],undefined,'chest seal not rotated');
  assert.equal(placed(html,'chest','warmingPack').angle,0);
  const shin=html.match(/data-injury="l"[^>]*>(?:<title>[^<]*<\/title>)?<circle class="wound-hit" r="49"\/><g transform="rotate\(([\d.-]+)\)/);
  assert.ok(shin);assert.equal(+shin[1],segmentAngle('leftShin'));
});

test('amputation stumps are rotated onto the limb at the cut',()=>{
  const g=fresh();g.injuries=[{id:'a',part:'leftForearm',type:'amputationForearm',treatments:{}}];
  const html=renderBodyScene(g,'chest'),[x,y]=cutPoint('leftForearm');
  assert.match(html,new RegExp(`class="stump-end" transform="translate\\(${x} ${y}\\) rotate\\(${segmentAngle('leftForearm')}\\)`));
});

test('every item has its own bag icon and every injury type has art',()=>{
  for(const item of ITEMS){const svg=itemIcon(item);assert.match(svg,/^<svg viewBox="-32 -32 64 64" class="item-icon"/,item.id);assert.ok(!svg.includes('scale(.6)'),`${item.id} falls back to device art`);}
  for(const i of ITEMS.filter(i=>i.category==='equipment'))assert.ok(DEVICE_ART[i.visual||i.effect]||itemIcon(i),i.id);
  for(const [id,def] of Object.entries(INJURIES))assert.ok(WOUND_ART[id]||def.tags.some(t=>WOUND_ART[t]),id);
  // Medicines are differentiated by route.
  const route=r=>itemIcon(ITEMS.find(i=>i.route===r&&i.category==='medicine'));
  assert.equal(new Set(['Doustnie','IV','IM','Wziewnie','Miejscowo'].map(r=>route(r).replace(/#[0-9a-f]{6}/g,''))).size,5);
});
