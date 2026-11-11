import { condition } from '../simulation/selectors.js';
import { renderSupport } from './game-screen.js';
import { trendPath, vitalLevel, monitorCaption } from './patient.js';
import { escape, time } from './format.js';
// Only replace instrument text and paths. Never reconstruct a focused bag input,
// dragged item, body hit target, context menu, or expanded examination note.
export function updateLiveHUD(root,g,{suspended=false}={}){
  root.querySelectorAll('[data-clock]').forEach(el=>el.textContent=time(g.elapsed));
  root.querySelectorAll('[data-condition]').forEach(el=>el.textContent=condition(g));
  root.querySelectorAll('[data-transport-time]').forEach(el=>el.textContent=g.transportAt===null?'Nie zgłoszono':g.status!=='active'?'Interwencja zakończona':g.transportAt<=g.elapsed?'Zespół na miejscu':time(g.transportAt-g.elapsed));
  const values=g.vitals;
  root.querySelectorAll('[data-live]').forEach(el=>{
    const key=el.dataset.live,value=key==='time'?(values?`Odczyt ${time(values.time)}`:'Brak odczytu'):values?.[key]??'—';
    const previous=Number.parseFloat(el.textContent),next=Number.parseFloat(value);
    if(key!=='time'&&Number.isFinite(previous)&&Number.isFinite(next))el.dataset.direction=next>previous?'up':next<previous?'down':'steady';
    if(el.textContent!==String(value))el.textContent=String(value);
    const cell=key!=='time'&&!('liveSub' in el.dataset)&&el.closest('.vital');if(cell){const level=values?vitalLevel(key,value):'';if(cell.dataset.level!==level)cell.dataset.level=level;}
  });
  for(const key of ['pulse','pressure','oxygen'])root.querySelectorAll(`[data-trend="${key}"]`).forEach(path=>path.setAttribute('d',trendPath(g.monitorHistory,key)));
  const live=g.monitoring&&!g.paused&&!suspended&&g.status==='active';
  const state=g.status!=='active'?'Zakończono':g.paused||suspended?'Pauza':g.monitoring?'Na żywo':g.monitorAttached===false?'Niepodłączony':'Odczyt zatrzymany';
  root.querySelectorAll('[data-monitor-status]').forEach(el=>el.textContent=state);
  root.querySelectorAll('[data-monitor-led]').forEach(el=>el.classList.toggle('on',live));
  root.querySelectorAll('[data-monitor-caption]').forEach(el=>el.textContent=monitorCaption(g,suspended));
  root.querySelector('.vitals')?.classList.toggle('monitor-off',!g.monitoring);
  const journal=root.querySelector('.log ol');
  if(journal&&journal.dataset.count!==String(g.log.length)){journal.innerHTML=[...g.log].reverse().map(e=>`<li><time>${time(e.time)}</time><span>${escape(e.text)}</span></li>`).join('');journal.dataset.count=String(g.log.length);}
  const support=root.querySelector('[data-support-panel]');if(support)support.outerHTML=renderSupport(g);
  root.querySelectorAll('.monitoring-layer').forEach(el=>el.style.display=g.monitoring?'':'none');
  root.querySelectorAll('.mask-layer,.oxygen-line').forEach(el=>el.style.display=g.oxygenUntil>g.elapsed?'':'none');
  root.querySelectorAll('[data-iv-site]').forEach(el=>{
    const active=g.infusions.some(i=>i.site===el.dataset.ivSite&&i.end>g.elapsed);
    el.querySelectorAll('.iv-line,.infusion-bag').forEach(layer=>layer.style.display=active?'':'none');
  });
}
