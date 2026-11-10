import { bodyPart } from '../../content/body.js';
import { escape } from '../format.js';
// Shared lifecycle for the hold/timing minigames. One finish path cancels the frame loop,
// timers and every listener, then closes the dialog. Escape, closing or hiding the tab before
// a result resolves null, so the engine never runs and nothing is consumed.
export function openSession(resolve){
  const dialog=document.querySelector('#procedure'),listeners=[],timers=new Set();
  const s={dialog,done:false,frame:0,result:null,
    on(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);},
    // dt is in seconds and capped, so a throttled tab cannot jump a gauge across its window.
    loop(fn){cancelAnimationFrame(s.frame);let previous=0;const step=now=>{if(s.done)return;const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;if(fn(dt,now)!==false)s.frame=requestAnimationFrame(step);};s.frame=requestAnimationFrame(step);},
    stop(){cancelAnimationFrame(s.frame);},
    later(fn,ms){const id=setTimeout(()=>{timers.delete(id);if(!s.done)fn();},ms);timers.add(id);return id;},
    finish(value){if(s.done)return;s.done=true;cancelAnimationFrame(s.frame);timers.forEach(clearTimeout);for(const [t,type,fn,o] of listeners)t.removeEventListener(type,fn,o);if(dialog.open)dialog.close();resolve(value);},
    status(text){const el=dialog.querySelector('#procedure-status');if(el&&el.textContent!==text)el.textContent=text;},
    $:selector=>dialog.querySelector(selector)
  };
  s.on(dialog,'cancel',e=>{e.preventDefault();s.finish(s.result);});
  s.on(dialog,'close',()=>s.finish(s.result));
  s.on(document,'visibilitychange',()=>{if(document.hidden&&!s.result)s.finish(null);});
  return s;
}
export const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
export const pct=n=>`${Math.round(Math.max(0,Math.min(1,n))*1000)/10}%`;
export const percent=n=>`${Math.round(n*100)}%`;
// Dialog frame shared with the IV minigame's markup and styles.
export function shell({title,part,steps,phase,board,controls,warning='',finished=false}){
  return `<div class="procedure-top"><div><span class="procedure-kicker">Procedura manualna</span><h2 id="procedure-title">${title}</h2><p>${escape(bodyPart(part)?.name||'')}</p></div><button class="quiet" data-procedure-cancel aria-label="${finished?'Zakończ procedurę':'Przerwij procedurę bez zużycia sprzętu'}">${finished?'Wróć':'Przerwij'} ✕</button></div>
  <div class="procedure-steps">${steps.map((name,i)=>`<span class="${phase===i?'current':phase>i?'complete':''}"><b>${i+1}</b>${name}</span>`).join('')}</div>
  ${warning?`<p class="procedure-warning">${warning}</p>`:''}<div class="procedure-board">${board}</div>
  <div class="procedure-controls">${controls}<p id="procedure-status" class="procedure-status" role="status" aria-live="polite"></p></div><p class="procedure-disclaimer">Fikcyjna minigra. Skale, zakresy i czasy są uproszczonym balansem rozgrywki, nie instrukcją.</p>`;
}
export function resultBlock(kind,title,text,cells){
  return `<div class="procedure-result ${kind}"><span class="result-mark">${kind==='success'?'✓':kind==='partial'?'!':'×'}</span><div><h3>${title}</h3><p>${text}</p></div></div><div class="technique-results">${cells.map(([name,value])=>`<span>${name} <b>${value}</b></span>`).join('')}</div><button class="primary" data-procedure-finish>Wróć do pacjenta</button>`;
}
// Wire the cancel button and the delayed result confirmation (a touch release must not hit it).
export function wire(s){
  s.$('[data-procedure-cancel]').onclick=()=>s.finish(s.result);
  const confirmation=s.$('[data-procedure-finish]');
  if(confirmation){confirmation.disabled=true;s.later(()=>{confirmation.disabled=false;confirmation.focus({preventScroll:true});},220);confirmation.onclick=()=>s.finish(s.result);}
}
// Press-and-hold on a button with pointer capture; `up` must be idempotent.
export function bindHold(button,down,up){
  button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture?.(e.pointerId);down(e);};
  button.onpointerup=e=>{e.preventDefault();up(e);};
  button.onpointercancel=()=>up();button.onlostpointercapture=()=>up();
  button.oncontextmenu=e=>e.preventDefault();
  // Keyboard holds are handled at dialog level; suppress the native click activation.
  button.onclick=e=>e.preventDefault();
}
// Native button activation keeps working when focus sits on a regular (non-hold) button.
export const onPlainButton=e=>e.target instanceof HTMLButtonElement&&!e.target.matches('[data-hold],[data-press]');
