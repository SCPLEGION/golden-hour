import { BODY_PARTS, bodyPart } from '../content/body.js';
import { renderBodyScene } from './body-scene.js';
import { bodyObservation } from '../simulation/selectors.js';
import { escape, time } from './format.js';

// Shortcut list grouped by region; side prefix is carried by the group label.
const PART_GROUPS=[['Głowa',['head']],['Tułów',['chest','abdomen','back']],['Prawa ręka',['rightArm']],['Lewa ręka',['leftArm']],['Prawa noga',['rightLeg']],['Lewa noga',['leftLeg']]];
const shortPartName=name=>{const s=name.replace(/^(Prawe|Prawy|Prawa|Lewe|Lewy|Lewa)\s+/u,'');return s===name?name:s.charAt(0).toLocaleUpperCase('pl')+s.slice(1);};
export function renderPatient(g,target,selectedWound=null,heldItem=null) {
  const part=bodyPart(target)||BODY_PARTS.find(p=>p.id===target),body=g.body[target],findings=bodyObservation(g,target);
  return `<section class="panel body-panel"><div class="section-top stage-heading"><div><span class="panel-index">01</span><h2>Stół zabiegowy</h2></div><span><i class="tiny-cross">+</i> PPM na ranę · przeciągnij sprzęt</span></div>${renderBodyScene(g,target,selectedWound,heldItem)}<div class="part-shortcuts" role="group" aria-label="Wybór części ciała">${PART_GROUPS.map(([label,groups])=>{const parts=BODY_PARTS.filter(p=>groups.includes(p.group));return parts.length?`<div class="part-group ${parts.some(p=>p.id===part?.id)?'has-selected':''}" role="group" aria-label="${label}"><span class="part-group-label" aria-hidden="true">${label}</span><div class="part-group-buttons">${parts.map(p=>{const short=shortPartName(p.name);return `<button class="part-button ${p.id===part?.id?'selected':''}" data-part="${p.id}" aria-pressed="${p.id===part?.id}"${short!==p.name?` aria-label="${escape(p.name)}" title="${escape(p.name)}"`:''}>${escape(short)}</button>`;}).join('')}</div></div>`:'';}).join('')}</div><div class="selected-part"><div class="section-top"><h3><span class="target-mark">⌖</span>${part.name}</h3><span>${body.examinedAt===null?'Nie zbadano':`Badanie ${time(body.examinedAt)}`}</span></div><div class="injury-notes">${findings.map(f=>`<details class="injury"><summary><strong>${f.name}</strong>${f.bleeding?`<span class="bleed-label ${f.bleeding==='Krwawienie zabezpieczone'?'controlled':''}">${f.bleeding}</span>`:''}</summary><p>${f.text}</p></details>`).join('')||`<p class="empty">${body.examinedAt===null?'Brak widocznego urazu. Badanie może ujawnić ukryty problem.':'W badaniu nie rozpoznano urazu tej okolicy.'}</p>`}</div>${body.examinedAt!==null?`<details class="exam-note"><summary>Pełny wynik badania</summary><p>${escape(body.note)}</p></details>`:''}</div></section>`;
}

const TREND_LIMITS={pulse:[45,175],oxygen:[60,100],pressure:[55,145]};
export function trendPath(history,key){
  const values=(history||[]).slice(-30).map(v=>Number.parseFloat(v[key])).filter(Number.isFinite);
  if(!values.length)return '';
  const [lo,hi]=TREND_LIMITS[key]||[0,100];
  return values.map((value,i)=>`${i?'L':'M'}${(values.length===1?149:i*149/(values.length-1)).toFixed(1)} ${(31-Math.max(0,Math.min(1,(value-lo)/(hi-lo)))*28).toFixed(1)}`).join(' ');
}
// Threshold bands for the monitor readout (game scale, presentation only).
const VITAL_BANDS={pulse:[[40,150],[50,120]],pressure:[[80,200],[90,180]],oxygen:[[85,101],[92,101]],breathing:[[8,32],[10,24]],temperature:[[34,41],[35.5,38.5]]};
export function vitalLevel(key,value){
  if(key==='pain'){const n=Number.parseFloat(value);return Number.isFinite(n)?(n>=7?'warn':'ok'):'';}
  const bands=VITAL_BANDS[key],n=Number.parseFloat(value);
  if(!bands)return '';
  if(!Number.isFinite(n))return value==='—'&&key==='pressure'?'crit':'';
  const [[cLo,cHi],[wLo,wHi]]=bands;
  return n<cLo||n>cHi?'crit':n<wLo||n>wHi?'warn':'ok';
}
export function renderVitals(g) {
  const v=g.vitals,monitoring=g.monitoring!==false;
  const fields=[['pulse','Tętno',v?.pulse,'bpm'],['pressure','Ciśnienie',v?.pressure,'mmHg'],['oxygen','SpO₂',v?.oxygen,'%'],['breathing','Oddech',v?.breathing,'/min'],['temperature','Temperatura',v?.temperature,'°C'],['pain','Ból',v?.pain,'/10']];
  const mode=g.paused?'Pauza':monitoring?'Na żywo':'Odczyt zatrzymany';
  return `<section class="panel vitals ${monitoring?'monitor-live':'monitor-off'}"><div class="section-top"><div class="monitor-title"><span class="monitor-symbol" aria-hidden="true">⌁</span><h2>Monitor pacjenta</h2><span class="monitor-mode"><i data-monitor-led class="${monitoring&&!g.paused?'on':''}"></i><b data-monitor-state data-monitor-status>${mode}</b></span></div><button class="monitor-toggle" data-monitor aria-pressed="${monitoring}" title="${monitoring?'Odłącz monitor':'Podłącz monitor'}">${monitoring?'Odłącz':'Podłącz'} <span aria-hidden="true">⏻</span></button></div><div class="vital-grid">${fields.map(([key,label,value,unit])=>`<div class="vital vital-${key}" data-level="${v?vitalLevel(key,value):''}"><span class="vital-label">${label}</span><div class="vital-reading"><strong data-live="${key}">${escape(value??'—')}</strong><small>${key==='pain'&&String(value||'').includes('/10')?'skala bólu':unit}</small></div>${['pulse','oxygen','pressure'].includes(key)?`<svg class="vital-trend" viewBox="0 0 150 34" preserveAspectRatio="none" aria-label="Trend: ${label}"><path class="trend-baseline" d="M0 31H150"/><path data-trend="${key}" d="${trendPath(g.monitorHistory,key)}"/></svg>`:'<div class="vital-meter" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>'}</div>`).join('')}</div><p class="snapshot"><span data-monitor-caption>${monitoring?'Odczyty aktualizowane podczas symulacji.':'Monitor odłączony — zachowano ostatnie wyniki.'}</span><span data-reading-time data-live="time">${v?`Odczyt ${time(v.time)}`:'Oczekiwanie na odczyt'}</span></p></section>`;
}
