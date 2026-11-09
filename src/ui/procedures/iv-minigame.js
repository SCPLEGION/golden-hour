import { IV_PROCEDURE } from '../../content/procedures.js';
import { bodyPart, resolvePart } from '../../content/body.js';
import { placementAccuracy, insertionSite, resolveIVAttempt, siteForPart } from '../../simulation/procedures.js';
import { tourniquetOver } from '../../simulation/vascular.js';
import { escape } from '../format.js';

export function runIVMinigame(g,part){
  part=resolvePart(part);
  const dialog=document.querySelector('#procedure');
  // The clicked body segment presets the site; points are kept inside its range.
  const preset=siteForPart(part)||IV_PROCEDURE.sites[1],inside=x=>Math.max(preset.from+1,Math.min(preset.to-1,x)),centre={x:inside((preset.from+preset.to)/2),y:140};
  return new Promise(resolve=>{
    let phase=0,point=null,approach=65,depth=0,holding=false,started=false,result=null,done=false;
    let frame=0,previous=0,confirmationTimer=0;
    const currentInput=(aborted=false)=>({point:point||centre,approach,depth,aborted});
    function finish(input){
      if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(confirmationTimer);dialog.close();
      dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('keydown',keyDown);dialog.removeEventListener('keyup',keyUp);
      document.removeEventListener('visibilitychange',visibility);resolve(input);
    }
    function cancel(e){e?.preventDefault();finish(result||(started?currentInput(true):null));}
    function visibility(){if(document.hidden&&started&&!result)finish(currentInput(true));}
    function needle(){
      const group=dialog.querySelector('#insertion-needle');if(!group||!point||phase===0)return;
      const radians=(20+approach*.5)*Math.PI/180;
      const reach=phase>=2?(depth-.62)*60:-35;
      const x=point.x+Math.cos(radians)*reach,y=point.y+Math.sin(radians)*reach;
      group.innerHTML=`<g transform="translate(${x} ${y}) rotate(${20+approach*.5})"><path d="M-100 0H0" stroke="#e6dfc4" stroke-width="3"/><rect x="-133" y="-8" width="38" height="16" rx="3" fill="#a4c5ba" stroke="#e4e6ce" stroke-width="2"/><path d="M-150-12V12M-150 0H-133" stroke="#cfba85" stroke-width="4"/></g>`;
    }
    function updatePoint(){
      if(!point)return;
      const reticle=dialog.querySelector('#insertion-reticle');reticle.setAttribute('transform',`translate(${point.x} ${point.y})`);reticle.style.display='';
      const site=insertionSite(point),accuracy=placementAccuracy(point);
      dialog.querySelector('#site-readout').textContent=`${site.name} · trafienie w naczynie ${Math.round(accuracy*100)}% · potencjał przepływu ${Math.round(site.efficiency*100)}%`;
      dialog.querySelector('#site-description').textContent=site.description;
      dialog.querySelector('[data-procedure-next]').disabled=false;
    }
    function release(){
      if(!holding||phase!==2)return;holding=false;
      result=currentInput(false);phase=3;cancelAnimationFrame(frame);render();
    }
    function tick(now){
      if(done||phase!==2)return;
      const delta=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
      if(holding){
        depth=Math.min(1,depth+delta*IV_PROCEDURE.advancePerSecond);started=true;
        dialog.querySelector('#depth-fill').style.width=`${depth*100}%`;
        dialog.querySelector('#depth-position').style.left=`${depth*100}%`;
        dialog.querySelector('#depth-meter').setAttribute('aria-valuenow',String(Math.round(depth*100)));
        dialog.querySelector('#depth-number').textContent=`${Math.round(depth*100)} / 100`;
        needle();
        if(depth>=1){release();return;}
      }
      frame=requestAnimationFrame(tick);
    }
    function hold(){if(phase!==2||holding||done)return;holding=true;dialog.querySelector('[data-hold]').classList.add('pressed');}
    function keyDown(e){
      if(phase===2&&e.code==='Space'){e.preventDefault();if(!e.repeat)hold();}
    }
    function keyUp(e){if(phase===2&&e.code==='Space'){e.preventDefault();release();}}
    const arm=()=>`<svg id="iv-site-map" viewBox="0 0 800 300" tabindex="${phase===0?'0':'-1'}" role="application" aria-label="Wybierz punkt wkłucia na naczyniu. Kliknij lub użyj strzałek, a Enter zatwierdza punkt.">
      <path class="procedure-arm" d="M55 84Q112 80 166 90L610 98L663 75L710 70L729 82L699 96L747 85L760 99L713 116L770 110L779 126L721 139L775 140L779 156L719 165L760 176L757 193L705 186L674 205L615 209L167 213Q112 224 55 217Z"/>
      ${IV_PROCEDURE.veins.map(line=>`<polyline class="procedure-vein" points="${line.map(p=>p.join(',')).join(' ')}"/>`).join('')}
      <rect class="procedure-site-window" x="${preset.from}" y="20" width="${preset.to-preset.from}" height="225" fill="#d8c98a" fill-opacity=".07" stroke="#d8c98a" stroke-opacity=".45" stroke-dasharray="6 6" pointer-events="none"/>
      <path class="joint-lines" d="M169 105Q181 151 171 196M613 114V191"/>
      <text x="92" y="259">Łokieć</text><text x="367" y="259">Przedramię</text><text x="682" y="259">Dłoń</text>
      <g id="insertion-reticle" style="display:${point?'':'none'}" transform="translate(${point?.x||0} ${point?.y||0})"><circle r="15"/><path d="M-23 0H-10M10 0H23M0-23V-10M0 10V23"/></g><g id="insertion-needle"></g>
    </svg>`;
    function render(){
      const site=point?insertionSite(point):null;
      const outcome=result?resolveIVAttempt(g,part,result):null;
      dialog.innerHTML=`<div class="procedure-top"><div><span class="procedure-kicker">Procedura manualna</span><h2 id="procedure-title">Założenie wenflonu</h2><p>${bodyPart(part).name}</p></div><button class="quiet" data-procedure-cancel aria-label="${result?'Zakończ procedurę':'Przerwij procedurę'}">${result?'Wróć':'Przerwij'} ✕</button></div>
      <div class="procedure-steps">${['Wybierz punkt','Ustaw prowadzenie','Wprowadź igłę'].map((title,i)=>`<span class="${phase===i?'current':phase>i?'complete':''}"><b>${i+1}</b>${title}</span>`).join('')}</div>
      ${tourniquetOver(g,part)!==undefined?'<p class="procedure-warning">Powyżej tego miejsca jest staza. Nawet udane wkłucie nie przywróci przepływu poniżej niej.</p>':''}
      <div class="procedure-board">${arm()}</div>
      <div class="procedure-controls">${phase===0?`<h3>Znajdź naczynie, wybierz punkt.</h3><p>Miejsce wkłucia: ${preset.name} (zaznaczony obszar). Kliknij przebieg naczynia albo użyj strzałek (Shift przesuwa szybciej) i Enter. Precyzja wpływa na przepływ po zabiegu.</p><div class="procedure-readout" id="site-readout">Nie wybrano miejsca</div><p id="site-description" class="procedure-note">Dłoń, przedramię i okolica łokcia mają różny potencjał i margines trafienia.</p><button class="primary" data-procedure-next ${!point?'disabled':''}>Ustaw prowadzenie</button>`:phase===1?`<h3>Ustaw prowadzenie igły.</h3><p>Ustaw wskaźnik w zaznaczonym zakresie. To skala zręcznościowa gry, bez jednostek medycznych.</p><label class="approach-label" for="approach-input">Prowadzenie <output id="approach-value">${approach} / 100</output></label><div class="approach-rail"><span style="left:35%;width:14%"></span><input id="approach-input" type="range" min="0" max="100" value="${approach}" aria-label="Prowadzenie igły"></div><button class="primary" data-procedure-next>Przejdź do wkłucia</button>`:phase===2?`<h3>Wsuń i zatrzymaj w polu trafienia.</h3><p>Przytrzymaj przycisk lub Spację, aby wprowadzać igłę. Puść w zaznaczonym polu. Zbyt płytko lub zbyt głęboko oznacza chybienie.</p><div class="depth-caption"><span>Wprowadzenie</span><strong id="depth-number">0 / 100</strong></div><div id="depth-meter" class="depth-meter" role="progressbar" aria-label="Wprowadzenie igły" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="depth-target" style="left:${(site.depthTarget-site.depthWindow*.55)*100}%;width:${site.depthWindow*110}%"></div><div id="depth-fill"></div><span id="depth-position"></span></div><button class="hold-button" data-hold>Przytrzymaj, aby wsuwać <kbd>Spacja</kbd></button><p class="procedure-note">Po rozpoczęciu wkłucia przerwanie próby zużyje wenflon i czas.</p>`:`<div class="procedure-result ${outcome.success?'success':'failure'}"><span class="result-mark">${outcome.success?'✓':'×'}</span><div><h3>${outcome.success?'Wkłucie wykonane.':'Nie udało się uzyskać dostępu.'}</h3><p>${outcome.success?`Jakość techniki ${Math.round(outcome.quality*100)}%. Miejsce: ${site.name}.`:'Igła nie trafiła prawidłowo. Powstanie krwiak; nowa próba wymaga kolejnego wenflonu.'}</p></div></div><div class="technique-results"><span>Punkt <b>${Math.round(outcome.aim*100)}%</b></span><span>Prowadzenie <b>${Math.round(outcome.angle*100)}%</b></span><span>Wprowadzenie <b>${Math.round(outcome.depth*100)}%</b></span></div><button class="primary" data-procedure-finish>Wróć do pacjenta</button>`}</div><p class="procedure-disclaimer">Fikcyjna minigra. Skale i anatomia są uproszczone na potrzeby rozgrywki.</p>`;
      dialog.querySelector('[data-procedure-cancel]').onclick=cancel;
      if(phase===0){
        const map=dialog.querySelector('#iv-site-map');
        map.onclick=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(map.getScreenCTM().inverse());point={x:inside(p.x),y:Math.max(0,Math.min(300,p.y))};updatePoint();};
        map.onkeydown=e=>{
          if(e.key==='Enter'&&point){e.preventDefault();dialog.querySelector('[data-procedure-next]')?.click();return;}
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){
            e.preventDefault();point??={...centre};const step=e.shiftKey?20:5;
            point={x:inside(Math.max(0,Math.min(800,point.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0)))),y:Math.max(0,Math.min(300,point.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)))};updatePoint();
          }
        };if(point)updatePoint();
      }
      if(phase===1){
        dialog.querySelector('#approach-input').oninput=e=>{approach=Number(e.target.value);dialog.querySelector('#approach-value').textContent=`${approach} / 100`;needle();};
      }
      dialog.querySelector('[data-procedure-next]')?.addEventListener('click',()=>{phase++;render();dialog.querySelector(phase===1?'#approach-input':'[data-hold]')?.focus();if(phase===2){previous=0;frame=requestAnimationFrame(tick);}});
      const holdButton=dialog.querySelector('[data-hold]');
      if(holdButton){
        holdButton.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();holdButton.setPointerCapture(e.pointerId);hold();};
        holdButton.onpointerup=e=>{e.preventDefault();e.stopPropagation();release();};holdButton.onpointercancel=()=>{if(started)finish(currentInput(true));};
        holdButton.onlostpointercapture=()=>{if(holding)release();};
      }
      const confirmation=dialog.querySelector('[data-procedure-finish]');
      if(confirmation){
        // A touch release must not activate the new button underneath the finger.
        confirmation.disabled=true;
        confirmationTimer=setTimeout(()=>{if(!done){confirmation.disabled=false;confirmation.focus({preventScroll:true});}},220);
        confirmation.addEventListener('click',()=>finish(result));
      }
      needle();
    }
    dialog.addEventListener('cancel',cancel);dialog.addEventListener('keydown',keyDown);dialog.addEventListener('keyup',keyUp);document.addEventListener('visibilitychange',visibility);
    render();dialog.showModal();dialog.querySelector('#iv-site-map').focus();
  });
}
