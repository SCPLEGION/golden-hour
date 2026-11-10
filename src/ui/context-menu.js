import { bodyPart } from '../content/body.js';
import { INJURIES } from '../content/injuries.js';
import { contextActions } from './context-actions.js';
import { escape } from './format.js';
export function createContextMenu(onAction) {
  const menu=document.createElement('div');menu.className='body-context-menu';menu.hidden=true;menu.id='body-context-menu';document.body.append(menu);
  let anchor=null;
  function close(restoreFocus=false){menu.hidden=true;if(restoreFocus)anchor?.focus({preventScroll:true});}
  function open({g,part,injuryId,x,y,trigger}) {
    anchor=trigger;
    const injury=g.injuries.find(i=>i.id===injuryId);
    const entries=contextActions(g,part,injuryId);
    let group='';
    menu.innerHTML=`<div class="context-heading"><div><strong>${bodyPart(part).name}</strong><span>${injury?escape(INJURIES[injury.type].name):'Wybierz czynność'}</span></div><button aria-label="Zamknij menu" data-close-menu>✕</button></div><div role="menu" aria-label="Działania na pacjencie">${entries.map(e=>{
      const heading=e.group!==group?`<div class="context-group" role="presentation">${e.group}</div>`:'';group=e.group;
      return `${heading}<button role="menuitem" data-context-action="${e.id}" ${e.disabled?'aria-disabled="true"':''}><span>${escape(e.label)}${e.disabled||e.warning?`<small class="${e.warning?'context-warning':''}">${escape(e.disabled||e.warning)}</small>`:''}</span>${e.time?`<b>${e.time}s</b>`:''}</button>`;
    }).join('')}</div>`;
    menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
    const rect=menu.getBoundingClientRect();
    menu.style.left=`${Math.max(8,Math.min(x,innerWidth-rect.width-8))}px`;
    menu.style.top=`${Math.max(8,Math.min(y,innerHeight-rect.height-8))}px`;
    menu.querySelector('[data-close-menu]').onclick=()=>close(true);
    menu.querySelectorAll('[data-context-action]').forEach(b=>b.onclick=()=>{
      if(b.getAttribute('aria-disabled')==='true')return;
      close();onAction(b.dataset.contextAction,part,injuryId);
    });
    menu.querySelector('[role="menuitem"]')?.focus({preventScroll:true});
  }
  menu.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
    const items=[...menu.querySelectorAll('[role="menuitem"]')];
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();let index=items.indexOf(document.activeElement);
      index=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[index]?.focus();
    }
    if(e.key==='Tab')close();
  });
  document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close();});
  window.addEventListener('resize',()=>close());
  document.addEventListener('wheel',e=>{if(!menu.contains(e.target))close();},{passive:true});
  return {open,close};
}
