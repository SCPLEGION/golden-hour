import { BODY_PARTS, BODY_OUTLINES, BACK_INSET, BODY_RIG, bodyPart, scenePoint, horizontalPoint, cutPoint, segmentAngle, limbWidth } from '../content/body.js';
import { itemById } from '../content/items.js';
import { INJURIES } from '../content/injuries.js';
import { visibleInjuries, injuryBleeding, missingSegments } from '../simulation/selectors.js';
import { accessSites, hasFlow } from '../simulation/vascular.js';
import { PLACED_VISUALS } from '../content/presentation.js';
import { WOUND_ART, STUMP_ART, ART_DEFS, deviceArt } from './visuals.js';
import { itemUnavailable } from '../simulation/effects.js';
import { protectionMarkers } from './protections.js';
import { escape, time } from './format.js';
export function woundPosition(g,injury) {
  if(injury.position)return injury.position;
  // An amputation's marker sits on the cut, at the proximal edge of the first missing band.
  if(INJURIES[injury.type].tags.includes('amputation'))return cutPoint(injury.part);
  const siblings=g.injuries.filter(i=>i.part===injury.part && INJURIES[i.type].visible);
  const slot=Math.max(0,siblings.findIndex(i=>i.id===injury.id));
  const part=bodyPart(injury.part),[x,y]=part.anchor;
  // Segments are short: spread siblings around the anchor instead of down the limb.
  const [dx,dy]=part.inset?[[0,0],[-70,40],[70,40],[0,80]][slot%4]:[[0,0],[14,56],[-14,-56],[0,112]][slot%4];
  // Short joint bands (wrist, ankle…) keep siblings closer to the anchor.
  const k=part.clip?Math.min(1,(part.clip[1]-part.clip[0])/110):1;
  return [x+dx,y+dy*k];
}
const band=([y0,y1],fill='')=>`<rect x="0" y="${y0}" width="1000" height="${y1-y0}"${fill}/>`;
const stumpBases=missing=>[...new Set(missing.map(id=>bodyPart(id).base).filter(Boolean))];
// Missing segments: a base outline keeps only its remaining bands (`clip-base-<id>-stump`), and
// anatomy lines/dividers are masked over the missing bands of that outline (`stump-mask`).
const segmentClips=(missing=[])=>BODY_PARTS.filter(p=>p.base).map(p=>`<clipPath id="clip-${p.id}">${band(p.clip)}</clipPath>`).join('')+Object.entries(BODY_OUTLINES).map(([id,d])=>`<clipPath id="clip-base-${id}"><path d="${d}"/></clipPath>`).join('')
  +stumpBases(missing).map(base=>`<clipPath id="clip-base-${base}-stump">${BODY_PARTS.filter(p=>p.base===base&&!missing.includes(p.id)).map(p=>band(p.clip)).join('')}</clipPath>`).join('')
  +(missing.length?`<mask id="stump-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1500"><rect x="0" y="0" width="1000" height="1500" fill="#fff"/>${stumpBases(missing).map(base=>`<g clip-path="url(#clip-base-${base})">${BODY_PARTS.filter(p=>p.base===base&&missing.includes(p.id)).map(p=>band(p.clip,' fill="#000"')).join('')}</g>`).join('')}</mask>`:'');
const dividers=(missing=[])=>Object.keys(BODY_OUTLINES).map(base=>{
  const ys=BODY_PARTS.filter(p=>p.base===base&&!missing.includes(p.id)).map(p=>p.clip[0]).sort((a,b)=>a-b).slice(1);
  return ys.length?`<path class="segment-divider" d="${ys.map(y=>`M0 ${y}H1000`).join('')}" clip-path="url(#clip-base-${base})" fill="none" stroke="#c5c5a1" stroke-opacity=".32" stroke-width="1.5" stroke-dasharray="5 6" pointer-events="none"/>`:'';
}).join('');
const r1=n=>Math.round(n*10)/10;
// Local frame on a limb: u along the axis (distal), v lateral (away from the midline).
const limbFrame=(id,[ox,oy])=>{const a=segmentAngle(id)*Math.PI/180,d=[-Math.sin(a),Math.cos(a)],side=bodyPart(id).anchor[0]<500?-1:1,n=[side*d[1],-side*d[0]];return ([u,v])=>[r1(ox+d[0]*u+n[0]*v),r1(oy+d[1]*u+n[1]*v)];};
const polyline=pts=>'M'+pts.map(p=>p.join(' ')).join('L');
// Hint lines are low-contrast and drawn in the portrait rig; hands, feet and elbows follow their axis.
const limbHints=()=>['right','left'].map(side=>{
  const hand=limbFrame(`${side}Hand`,bodyPart(`${side}Wrist`).axis[0]),foot=limbFrame(`${side}Foot`,bodyPart(`${side}Ankle`).axis[0]),elbow=limbFrame(`${side}Elbow`,bodyPart(`${side}Elbow`).anchor);
  return [-12,-1,10].map(v=>polyline([hand([92,v]),hand([113,v*1.05])])).join('')+polyline([hand([30,15]),hand([48,21]),hand([56,26])])
    +[-16,-6,4,14].map(v=>polyline([foot([62,v]),foot([76,v])])).join('')+polyline([elbow([-3,-13]),elbow([3,0]),elbow([-3,13])]);
}).join('');
const anatomy=()=>`<g class="anatomy-lines" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M462 140Q474 147 486 140M514 140Q526 147 538 140M458 125Q472 117 488 123M512 123Q528 117 542 125M500 150V170Q494 176 489 172M485 197Q500 203 515 197M480 242L493 286M520 242L507 286"/>
<path d="M496 294Q470 302 444 297Q420 293 402 302M504 294Q530 302 556 297Q580 293 598 302M500 304V432M500 404Q470 422 436 413Q410 404 396 382M500 404Q530 422 564 413Q590 404 604 382M436 476Q470 452 500 440Q530 452 564 476M500 452V636M472 520Q500 527 528 520M474 570Q500 577 526 570M424 700Q452 730 486 760M576 700Q548 730 514 760"/>
<path d="${limbHints()}"/>
${['right','left'].map(side=>{const [x,y]=bodyPart(`${side}Knee`).anchor;return `<ellipse cx="${x}" cy="${y-6}" rx="17" ry="22"/>`;}).join('')}<ellipse cx="500" cy="612" rx="4" ry="6"/>
</g>`;
// Devices on limbs rotate onto the segment axis and scale to the limb width (`base` = the width
// the art is drawn for); torso/head devices stay upright at scale 1.
const pose=(id,y,base=50,[lo,hi]=[.8,2])=>{const p=bodyPart(id);if(!p?.limb)return '';const s=Math.min(hi,Math.max(lo,limbWidth(id,y)/base));return ` rotate(${segmentAngle(id)}) scale(${r1(s*100)/100})`;};
// Shading for the silhouette: inner shadow towards the edges + a thin rim light on the side
// facing the top of the screen (portrait −x). Defined once per scene.
const SCENE_DEFS=`<filter id="body-shade" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="12" result="b"/><feComposite in="SourceAlpha" in2="b" operator="arithmetic" k2="1" k3="-1" result="e"/><feFlood flood-color="#070906" flood-opacity=".75"/><feComposite in2="e" operator="in" result="s"/><feOffset in="SourceAlpha" dx="-5" result="o"/><feComposite in="SourceAlpha" in2="o" operator="out" result="r0"/><feGaussianBlur in="r0" stdDeviation="2" result="r1"/><feFlood flood-color="#e9ecd6" flood-opacity=".2"/><feComposite in2="r1" operator="in" result="r"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s"/><feMergeNode in="r"/></feMerge></filter><filter id="body-drop" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>${ART_DEFS}`;
// Oxygen cylinder standing by the head (drawn upright in scene space).
const OXYGEN_CYLINDER='<rect x="-15" y="-34" width="30" height="80" rx="12" fill="#4f6a52" stroke="#bfc4af" stroke-width="2.5"/><path d="M-15-18Q-15-34 0-34Q15-34 15-18Z" fill="#e6e8dc"/><rect x="-7" y="-48" width="14" height="14" rx="3" fill="#a0a690" stroke="#bfc4af" stroke-width="2"/><circle cx="12" cy="-42" r="6" fill="#25484c" stroke="#bfc4af" stroke-width="2"/>';
export function renderBodyScene(g,target,selectedWound=null,heldItem=null) {
  const held=heldItem?itemById(heldItem):null;
  const fit=(part,injuryId=null)=>held?(itemUnavailable(g,held,part,injuryId)?'invalid-target':'valid-target'):'';
  const protections=protectionMarkers(g),missing=missingSegments(g),gone=id=>missing.includes(id);
  const amputated=id=>g.injuries.some(i=>i.part===id&&INJURIES[i.type].tags.includes('amputation'));
  // Only the amputation itself is drawn on a missing segment (at the cut); nothing else is.
  const wounds=BODY_PARTS.flatMap(p=>visibleInjuries(g,p.id)).filter(i=>!gone(i.part)||INJURIES[i.type].tags.includes('amputation'));
  const stumps=g.injuries.filter(i=>INJURIES[i.type].tags.includes('amputation')&&bodyPart(i.part)?.limb).map(i=>{const [x,y]=cutPoint(i.part);return `<g class="stump-end" transform="translate(${x} ${y}) rotate(${segmentAngle(i.part)}) scale(${(limbWidth(i.part,y)/84).toFixed(3)} 1)" pointer-events="none">${STUMP_ART}</g>`;}).join('');
  const layer=(part,svg)=>({back:Boolean(bodyPart(part)?.inset),svg});
  const markers=wounds.map(injury=>{
    const [x,y]=woundPosition(g,injury), def=INJURIES[injury.type];
    const treatment=injury.treatments||{};
    const covered=Object.keys(treatment).filter(key=>PLACED_VISUALS[key]?.scope==='wound'||itemById(key)?.effect==='stabilize');
    const turn=pose(injury.part,y,covered.length?56:999,covered.length?[.75,1.5]:[1,1]).trim(),art=`<g${turn?` transform="${turn}"`:''}>`+(covered.length?deviceArt(PLACED_VISUALS[covered.at(-1)]?.art||itemById(covered.at(-1))?.visual||'gauze'):WOUND_ART[injury.type]||WOUND_ART[def.tags.find(tag=>WOUND_ART[tag])]||WOUND_ART.wound)+'</g>';
    return layer(injury.part,`<g class="wound-marker ${selectedWound===injury.id?'chosen':''} ${Object.keys(treatment).length?'wound-treated':''} ${fit(injury.part,injury.id)}" transform="translate(${x} ${y})" role="button" tabindex="0" data-part="${injury.part}" data-injury="${injury.id}" aria-label="${escape(def.name)} — ${bodyPart(injury.part).name}" aria-haspopup="menu"><title>${def.name} — ${bodyPart(injury.part).name}</title><circle class="wound-hit" r="49"/>${art}${def.tags.includes('external')&&injuryBleeding(g,injury)>.02?'<path class="blood-mark" d="M22 25Q30 47 37 31Q39 23 30 14Z" fill="#bb5b58"/>':''}</g>`);
  });
  const devices=BODY_PARTS.filter(part=>!gone(part.id)).flatMap(part=>{
    const t=g.body[part.id].treatments;
    return Object.keys(t).filter(key=>PLACED_VISUALS[key]?.scope==='part').map(key=>{
      const visual=PLACED_VISUALS[key], [x,y]=part[visual.anchor]||part.anchor;
      return layer(part.id,`<g class="placed-device" transform="translate(${x} ${y})${pose(part.id,y,visual.fit)}" role="button" tabindex="0" data-part="${part.id}" data-device="${key}" aria-label="${visual.name} — ${part.name}" aria-haspopup="menu"><title>${key==='tourniquet'?`Staza: ${time(g.elapsed-t[key])}`:'Szyna'} — ${part.name}</title>${deviceArt(visual.art)}</g>`);
    });
  });
  // IV: the cannula follows the limb; the bag hangs upright (counter-rotated) at the table edge
  // on its arm's side, with the line running from its port to the cannula's port.
  const toRig=([sx,sy])=>[1000-sy,sx];
  const ivLines=accessSites(g).map(site=>{
    const [x,y]=g.body[site].ivPlacement?.position||bodyPart(site).device, flow=hasFlow(g,site), infusion=g.infusions.some(i=>i.site===site&&i.end>g.elapsed);
    const left=bodyPart(site).group==='leftArm',bag=left?[190,226]:[190,742],side=left?-1:1,[bx,by]=toRig(bag);
    const a=segmentAngle(site)*Math.PI/180,sc=Math.min(2,Math.max(.8,limbWidth(site,y)/50)),port=horizontalPoint([x-22*sc*Math.sin(a),y+22*sc*Math.cos(a)]);
    const S0=[bag[0],bag[1]+54],ctl=[[S0[0]+40,S0[1]+side*Math.min(20,40)],[port[0]-90,port[1]+side*50]].map(toRig),[p0,p3]=[toRig(S0),toRig(port)];
    return `<g class="iv-system ${flow?'flowing':'occluded'}" data-iv-site="${site}">${infusion?`<path class="iv-line" d="M${r1(p0[0])} ${r1(p0[1])}C${ctl.map(c=>c.map(r1).join(' ')).join(' ')} ${r1(p3[0])} ${r1(p3[1])}"/><g class="infusion-bag" transform="translate(${bx} ${by}) rotate(90)">${deviceArt('fluid')}</g>`:''}<g transform="translate(${x} ${y})${pose(site,y)}" class="placed-device" role="button" tabindex="0" data-part="${site}" data-device="iv" aria-label="Wenflon — ${bodyPart(site).name}${flow?'':', odcięty stazą'}" aria-haspopup="menu">${deviceArt('iv')}${flow?'':'<path d="M-16-16L16 16M16-16L-16 16" stroke="#f26a5f" stroke-width="4.5" stroke-linecap="round"/>'}</g></g>`;
  }).join('');
  const supportArt=(g.supports||[]).filter(s=>s.until>g.elapsed).map(s=>{
    const item=itemById(s.id),part=bodyPart(s.target);if(!item?.visual||!part||gone(part.id))return '';
    const [x,y]=part.device||part.anchor;
    return layer(part.id,`<g class="placed-device" transform="translate(${x} ${y})${pose(part.id,y)}" data-part="${part.id}" data-device="${item.id}" role="button" tabindex="0" aria-label="${escape(item.name)} — ${part.name}" aria-haspopup="menu"><title>${escape(item.name)}: ${time(s.until-g.elapsed)}</title>${deviceArt(item.visual)}</g>`);
  }).filter(Boolean);
  // ECG electrodes (RA, LA, LL) with leads gathering towards the table edge by the right arm.
  const monitorArt=`<g class="monitoring-layer" style="display:${g.monitoring?'':'none'}" pointer-events="none"><path d="M430 322Q330 330 200 380M570 322Q420 360 200 384M556 498Q380 470 200 388" fill="none" stroke="#83b8ac" stroke-width="2" opacity=".55"/>${[[430,322,'#e6e8dc'],[570,322,'#59675c'],[556,498,'#c8574e']].map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="11" fill="#c4d4c1" stroke="#91b6a5" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`).join('')}</g>`;
  // Stump care on a missing segment is badged at the cut; any other badge there is dropped.
  const badged=protections.filter(m=>!gone(m.part)||amputated(m.part));
  // Badges sit beside the limb (outside its lateral edge), stacked along the axis; text is
  // counter-rotated so it reads upright on the horizontal table.
  const protectionBadges=badged.map((m,i)=>{
    const part=bodyPart(m.part),[x,y]=gone(m.part)?cutPoint(m.part):part.anchor,glyph=PLACED_VISUALS[m.kind]?.name?.[0]||(m.kind==='iv'?'W':(itemById(m.kind)?.name||m.kind)[0]);
    const k=badged.filter((o,j)=>j<i&&o.part===m.part).length;
    let at=[x-34+k*30,y-62];
    if(part.limb){const f=limbFrame(part.id,[x,y]);at=f([k*30-10,limbWidth(part.id,y)/2+22]);}
    return layer(m.part,`<g class="protection-badge kind-${m.kind}" transform="translate(${at[0]} ${at[1]})" role="img" aria-label="${escape(m.label)}"><title>${escape(m.label)}</title><circle r="13"/><text transform="rotate(90)" y="5" text-anchor="middle">${escape(glyph.toLocaleUpperCase('pl'))}</text></g>`);
  });
  // Silhouette as a union: a blurred table shadow, every outline stroke, then every fill (shaded).
  const shapes=Object.entries(BODY_OUTLINES).map(([base,d])=>`<path d="${d}"${stumpBases(missing).includes(base)?` clip-path="url(#clip-base-${base}-stump)"`:''}/>`).join('');
  const silhouette=`<g class="body-shadow" transform="translate(-10 4)" filter="url(#body-drop)">${shapes}</g><g class="body-outline">${shapes}</g><g class="body-fill" filter="url(#body-shade)">${shapes}</g>`;
  const front=list=>list.filter(e=>!e.back).map(e=>e.svg).join(''),back=list=>list.filter(e=>e.back).map(e=>e.svg).join('');
  const region=(p,d,extra='')=>`<path d="${d}"${extra} class="body-region ${target===p.id?'selected':''} ${fit(p.id)}" role="button" tabindex="0" aria-label="${p.name}" aria-pressed="${target===p.id}" aria-haspopup="menu" data-part="${p.id}"><title>${p.name}</title></path>`;
  // Back: own coordinate space, drawn as an inset in the free corner by the feet.
  const backPart=BODY_PARTS.find(p=>p.inset);
  const backInset=backPart?`<g class="body-back-inset" transform="translate(${BACK_INSET.x} ${BACK_INSET.y}) scale(${BACK_INSET.scale})"><rect class="back-inset-frame" x="0" y="0" width="${BACK_INSET.width}" height="${BACK_INSET.height}" rx="22" fill="#1a2c22" stroke="#6b805a" stroke-opacity=".6" stroke-width="2"/><text class="back-inset-label" x="${BACK_INSET.width/2}" y="34" text-anchor="middle" fill="#c9c18a" font-size="26" pointer-events="none">Plecy</text><g class="body-outline"><path d="${BACK_INSET.shape}"/></g><g class="body-fill" filter="url(#body-shade)"><path d="${BACK_INSET.shape}"/></g><g class="anatomy-lines" fill="none" stroke-linecap="round"><path d="M150 62V250M96 96Q120 130 112 168M204 96Q180 130 188 168"/></g>${region(backPart,BACK_INSET.shape)}${back(markers)}${back(devices)}${back(supportArt)}${back(protectionBadges)}</g>`:'';
  // A missing target points at its cut rather than at empty table.
  const [labelX,partY]=gone(bodyPart(target)?.id)?horizontalPoint(cutPoint(target)):scenePoint(bodyPart(target));
  const labelY=bodyPart(target).inset?BACK_INSET.y+BACK_INSET.height*BACK_INSET.scale+30:Math.max(205,Math.min(795,partY+(partY<500?-95:95)));
  return `<div class="operating-surface ${heldItem?'holding-item':''}" data-surface><div class="surface-toolbar"><span>Widok z góry / pacjent na stole</span><span>PPM — działania · przeciągnij sprzęt</span></div><svg class="patient-scene" viewBox="${BODY_RIG.viewBox}" aria-label="Poszkodowany leżący poziomo na stole, głowa po lewej"><defs><pattern id="table-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#a6bdb0" stroke-opacity=".035" stroke-width="1"/></pattern>${segmentClips(missing)}${SCENE_DEFS}</defs><rect x="0" y="100" width="1500" height="800" fill="url(#table-grid)"/><rect class="table-edge" x="25" y="185" width="1450" height="630" rx="70"/><path class="table-seam" d="M310 150V850M1010 150V850"/><g transform="${BODY_RIG.transform}">${silhouette}<g${missing.length?' mask="url(#stump-mask)"':''}>${anatomy()}${dividers(missing)}</g>${stumps}${BODY_PARTS.filter(p=>p.base&&!gone(p.id)).map(p=>region(p,BODY_OUTLINES[p.base],` clip-path="url(#clip-${p.id})"`)).join('')}${g.warm?`<g transform="translate(500 490)" class="blanket-layer">${deviceArt('blanket')}</g>`:''}${front(markers)}${front(devices)}${ivLines}${front(supportArt)}${front(protectionBadges)}${monitorArt}${g.oxygenUntil>g.elapsed?`<path class="oxygen-line" d="M500 228C470 262 410 150 408 86"/><g transform="translate(500 190)" class="mask-layer">${deviceArt('oxygen')}</g><g transform="translate(360 80) rotate(90)" class="mask-layer">${OXYGEN_CYLINDER}</g>`:''}</g>${backInset}<g class="selection-pointer" transform="translate(${Math.min(1370,labelX+52)} ${labelY})"><path d="M-45 0H-12L0-12"/><text x="5" y="-14">${bodyPart(target).name}</text></g></svg><div class="surface-bottom"><span><i class="wound-key"></i> Rana / uraz</span><span><i class="device-key"></i> Założony sprzęt</span><span class="protection-legend" aria-live="polite"><i class="protection-key"></i> Aktywne zabezpieczenia: ${protections.length}</span><button class="surface-menu-button" data-context-open>Działania: ${bodyPart(target).name}</button></div></div>`;
}
