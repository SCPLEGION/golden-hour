import { BODY_PARTS, BODY_OUTLINES, BACK_INSET, BODY_RIG, bodyPart, scenePoint } from '../content/body.js';
import { itemById } from '../content/items.js';
import { INJURIES } from '../content/injuries.js';
import { visibleInjuries, injuryBleeding } from '../simulation/selectors.js';
import { accessSites, hasFlow } from '../simulation/vascular.js';
import { PLACED_VISUALS } from '../content/presentation.js';
import { WOUND_ART, deviceArt } from './visuals.js';
import { itemUnavailable } from '../simulation/effects.js';
import { protectionMarkers } from './protections.js';
import { escape, time } from './format.js';
export function woundPosition(g,injury) {
  if(injury.position)return injury.position;
  const siblings=g.injuries.filter(i=>i.part===injury.part && INJURIES[i.type].visible);
  const slot=Math.max(0,siblings.findIndex(i=>i.id===injury.id));
  const part=bodyPart(injury.part),[x,y]=part.anchor;
  // Segments are short: spread siblings around the anchor instead of down the limb.
  const [dx,dy]=part.inset?[[0,0],[-70,40],[70,40],[0,80]][slot%4]:[[0,0],[14,56],[-14,-56],[0,112]][slot%4];
  return [x+dx,y+dy];
}
const segmentClips=()=>BODY_PARTS.filter(p=>p.base).map(p=>`<clipPath id="clip-${p.id}"><rect x="0" y="${p.clip[0]}" width="1000" height="${p.clip[1]-p.clip[0]}"/></clipPath>`).join('')+Object.entries(BODY_OUTLINES).map(([id,d])=>`<clipPath id="clip-base-${id}"><path d="${d}"/></clipPath>`).join('');
const dividers=()=>Object.keys(BODY_OUTLINES).map(base=>{
  const ys=BODY_PARTS.filter(p=>p.base===base).map(p=>p.clip[0]).sort((a,b)=>a-b).slice(1);
  return ys.length?`<path class="segment-divider" d="${ys.map(y=>`M0 ${y}H1000`).join('')}" clip-path="url(#clip-base-${base})" fill="none" stroke="#c5c5a1" stroke-opacity=".32" stroke-width="1.5" stroke-dasharray="5 6" pointer-events="none"/>`:'';
}).join('');
const anatomy=()=>`<g class="anatomy-lines" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M456 113Q500 89 544 113M452 146Q469 137 481 147M519 147Q531 137 548 146M481 200Q500 212 519 200M500 160V180M463 279L500 309L537 279M500 307V485M394 326Q420 336 466 338M606 326Q580 336 534 338"/>
${[354,385,416,447].map((y,i)=>`<path d="M492 ${y}Q${407-i*2} ${y-22} ${393+i*5} ${y+20}Q430 ${y+38} 488 ${y+12}M508 ${y}Q${593+i*2} ${y-22} ${607-i*5} ${y+20}Q570 ${y+38} 512 ${y+12}"/>`).join('')}
<path d="M500 493V681M390 634Q423 663 443 702L500 738L557 702Q577 663 610 634M409 689Q443 671 461 725M591 689Q557 671 539 725M346 365L316 515M654 365L684 515M312 548L264 725M327 549L278 730M688 548L736 725M673 549L722 730M420 791L414 1019M580 791L586 1019M402 1083L408 1347M424 1083L425 1347M598 1083L592 1347M576 1083L575 1347M385 1411L438 1420M615 1411L562 1420"/>
${[[318,530,17],[682,530,17],[414,1046,23],[586,1046,23]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.8}"/>`).join('')}
</g>`;
export function renderBodyScene(g,target,selectedWound=null,heldItem=null) {
  const held=heldItem?itemById(heldItem):null;
  const fit=(part,injuryId=null)=>held?(itemUnavailable(g,held,part,injuryId)?'invalid-target':'valid-target'):'';
  const protections=protectionMarkers(g);
  const wounds=BODY_PARTS.flatMap(p=>visibleInjuries(g,p.id));
  const layer=(part,svg)=>({back:Boolean(bodyPart(part)?.inset),svg});
  const markers=wounds.map(injury=>{
    const [x,y]=woundPosition(g,injury), def=INJURIES[injury.type];
    const treatment=injury.treatments||{};
    const covered=Object.keys(treatment).filter(key=>PLACED_VISUALS[key]?.scope==='wound'||itemById(key)?.effect==='stabilize');
    const art=covered.length?deviceArt(PLACED_VISUALS[covered.at(-1)]?.art||itemById(covered.at(-1))?.visual||'gauze'):WOUND_ART[injury.type]||WOUND_ART[def.tags.find(tag=>WOUND_ART[tag])]||'<circle r="20" stroke="#d6ae80" fill="#574a3d"/>';
    return layer(injury.part,`<g class="wound-marker ${selectedWound===injury.id?'chosen':''} ${Object.keys(treatment).length?'wound-treated':''} ${fit(injury.part,injury.id)}" transform="translate(${x} ${y})" role="button" tabindex="0" data-part="${injury.part}" data-injury="${injury.id}" aria-label="${escape(def.name)} — ${bodyPart(injury.part).name}" aria-haspopup="menu"><title>${def.name} — ${bodyPart(injury.part).name}</title><circle class="wound-hit" r="49"/>${art}${def.tags.includes('external')&&injuryBleeding(g,injury)>.02?'<path class="blood-mark" d="M22 25Q30 47 37 31Q39 23 30 14Z" fill="#bb5b58"/>':''}</g>`);
  });
  const devices=BODY_PARTS.flatMap(part=>{
    const t=g.body[part.id].treatments;
    return Object.keys(t).filter(key=>PLACED_VISUALS[key]?.scope==='part').map(key=>{
      const visual=PLACED_VISUALS[key], [x,y]=part[visual.anchor]||part.anchor;
      return layer(part.id,`<g class="placed-device" transform="translate(${x} ${y})" role="button" tabindex="0" data-part="${part.id}" data-device="${key}" aria-label="${visual.name} — ${part.name}" aria-haspopup="menu"><title>${key==='tourniquet'?`Staza: ${time(g.elapsed-t[key])}`:'Szyna'} — ${part.name}</title>${deviceArt(visual.art)}</g>`);
    });
  });
  const ivLines=accessSites(g).map(site=>{
    const [x,y]=g.body[site].ivPlacement?.position||bodyPart(site).device, flow=hasFlow(g,site), infusion=g.infusions.some(i=>i.site===site&&i.end>g.elapsed);
    const bagX=bodyPart(site).group==='leftArm'?870:130;
    return `<g class="iv-system ${flow?'flowing':'occluded'}" data-iv-site="${site}">${infusion?`<path class="iv-line" d="M${bagX} 430V510Q${bagX} ${y+70} ${x} ${y+47}"/><g class="infusion-bag" transform="translate(${bagX} 390)">${deviceArt('fluid')}</g>`:''}<g transform="translate(${x} ${y})" class="placed-device" role="button" tabindex="0" data-part="${site}" data-device="iv" aria-label="Wenflon — ${bodyPart(site).name}${flow?'':', odcięty stazą'}" aria-haspopup="menu">${deviceArt('iv')}${flow?'':'<path d="M-18-18L18 18M18-18L-18 18" stroke="#eb8278" stroke-width="5"/>'}</g></g>`;
  }).join('');
  const supportArt=(g.supports||[]).filter(s=>s.until>g.elapsed).map(s=>{
    const item=itemById(s.id),part=bodyPart(s.target);if(!item?.visual||!part)return '';
    const [x,y]=part.device||part.anchor;
    return layer(part.id,`<g class="placed-device" transform="translate(${x} ${y})" data-part="${part.id}" data-device="${item.id}" role="button" tabindex="0" aria-label="${escape(item.name)} — ${part.name}" aria-haspopup="menu"><title>${escape(item.name)}: ${time(s.until-g.elapsed)}</title>${deviceArt(item.visual)}</g>`);
  }).filter(Boolean);
  const monitorArt=`<g class="monitoring-layer" style="display:${g.monitoring?'':'none'}" pointer-events="none"><path d="M470 360Q310 270 140 285M540 430Q320 380 140 285" fill="none" stroke="#83b8ac" stroke-width="2" opacity=".65"/><circle cx="470" cy="360" r="10" fill="#c4d4c1" stroke="#91b6a5" stroke-width="3"/><circle cx="540" cy="430" r="10" fill="#c4d4c1" stroke="#91b6a5" stroke-width="3"/></g>`;
  const protectionBadges=protections.map((m,i)=>{
    const part=bodyPart(m.part),[x,y]=part.anchor,glyph=PLACED_VISUALS[m.kind]?.name?.[0]||(m.kind==='iv'?'W':(itemById(m.kind)?.name||m.kind)[0]);
    return layer(m.part,`<g class="protection-badge kind-${m.kind}" transform="translate(${x-34+(protections.filter((o,j)=>j<i&&o.part===m.part).length)*30} ${y-62})" role="img" aria-label="${escape(m.label)}"><title>${escape(m.label)}</title><circle r="13"/><text y="5" text-anchor="middle">${escape(glyph.toLocaleUpperCase('pl'))}</text></g>`);
  });
  const front=list=>list.filter(e=>!e.back).map(e=>e.svg).join(''),back=list=>list.filter(e=>e.back).map(e=>e.svg).join('');
  const region=(p,d,extra='')=>`<path d="${d}"${extra} class="body-region ${target===p.id?'selected':''} ${fit(p.id)}" role="button" tabindex="0" aria-label="${p.name}" aria-pressed="${target===p.id}" aria-haspopup="menu" data-part="${p.id}"><title>${p.name}</title></path>`;
  // Back: own coordinate space, drawn as an inset in the free corner by the feet.
  const backPart=BODY_PARTS.find(p=>p.inset);
  const backInset=backPart?`<g class="body-back-inset" transform="translate(${BACK_INSET.x} ${BACK_INSET.y}) scale(${BACK_INSET.scale})"><rect class="back-inset-frame" x="0" y="0" width="${BACK_INSET.width}" height="${BACK_INSET.height}" rx="22" fill="#1a2c22" stroke="#6b805a" stroke-opacity=".6" stroke-width="2"/><text class="back-inset-label" x="${BACK_INSET.width/2}" y="34" text-anchor="middle" fill="#c9c18a" font-size="26" pointer-events="none">Plecy</text><g class="body-outline"><path d="${BACK_INSET.shape}"/></g><g class="anatomy-lines" fill="none" stroke-linecap="round"><path d="M150 62V250M96 96Q120 130 112 168M204 96Q180 130 188 168"/></g>${region(backPart,BACK_INSET.shape)}${back(markers)}${back(devices)}${back(supportArt)}${back(protectionBadges)}</g>`:'';
  const [labelX,partY]=scenePoint(bodyPart(target));
  const labelY=bodyPart(target).inset?BACK_INSET.y+BACK_INSET.height*BACK_INSET.scale+30:Math.max(205,Math.min(795,partY+(partY<500?-95:95)));
  return `<div class="operating-surface ${heldItem?'holding-item':''}" data-surface><div class="surface-toolbar"><span>Widok z góry / pacjent na stole</span><span>PPM — działania · przeciągnij sprzęt</span></div><svg class="patient-scene" viewBox="${BODY_RIG.viewBox}" aria-label="Poszkodowany leżący poziomo na stole, głowa po lewej"><defs><pattern id="table-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#a6bdb0" stroke-opacity=".035" stroke-width="1"/></pattern>${segmentClips()}</defs><rect x="0" y="100" width="1500" height="800" fill="url(#table-grid)"/><rect class="table-edge" x="25" y="185" width="1450" height="630" rx="70"/><path class="table-seam" d="M310 150V850M1010 150V850"/><g transform="${BODY_RIG.transform}"><g class="body-outline">${Object.values(BODY_OUTLINES).map(d=>`<path d="${d}"/>`).join('')}</g>${anatomy()}${dividers()}${BODY_PARTS.filter(p=>p.base).map(p=>region(p,BODY_OUTLINES[p.base],` clip-path="url(#clip-${p.id})"`)).join('')}${g.warm?`<g transform="translate(500 490)" class="blanket-layer">${deviceArt('blanket')}</g>`:''}${front(markers)}${front(devices)}${ivLines}${front(supportArt)}${front(protectionBadges)}${monitorArt}${g.oxygenUntil>g.elapsed?`<g transform="translate(500 190)" class="mask-layer">${deviceArt('oxygen')}</g><path class="oxygen-line" d="M525 192Q770 190 843 340"/>`:''}</g>${backInset}<g class="selection-pointer" transform="translate(${Math.min(1370,labelX+52)} ${labelY})"><path d="M-45 0H-12L0-12"/><text x="5" y="-14">${bodyPart(target).name}</text></g></svg><div class="surface-bottom"><span><i class="wound-key"></i> Rana / uraz</span><span><i class="device-key"></i> Założony sprzęt</span><span class="protection-legend" aria-live="polite"><i class="protection-key"></i> Aktywne zabezpieczenia: ${protections.length}</span><button class="surface-menu-button" data-context-open>Działania: ${bodyPart(target).name}</button></div></div>`;
}
