import { TOURNIQUET_PROCEDURE as TQ } from '../../content/procedures.js';
import { resolvePart } from '../../content/body.js';
import { resolveTourniquet } from '../../simulation/procedures.js';
import { openSession, shell, resultBlock, wire, bindHold, onPlainButton, pct, percent } from './shell.js';

const BAND_TEXT={
  loose:'Staza luźna. Krwawienie poniżej trwa.',
  under:'Za słabo — krwawienie poniżej słabnie, ale trwa.',
  ok:'W polu docelowym — krwawienie poniżej ustaje. Puść i zablokuj.',
  over:'Za mocno — nadmierny ucisk. Poluzuj strzałką w dół albo zablokuj mimo bólu.'
};
export function runTourniquetMinigame(g,part){
  part=resolvePart(part);
  return new Promise(resolve=>{
    const s=openSession(resolve),{dialog}=s,[lo,hi]=TQ.window;
    let tension=0,holding=false,startedAt=0,phase=0,band='';
    const bandOf=t=>t<=0?'loose':t<lo?'under':t>hi?'over':'ok';
    const input=()=>({tension:Math.round(tension*1000)/1000,timeMs:startedAt?Math.min(600000,Math.round(performance.now()-startedAt)):0,aborted:false});
    function paintBoard(){
      const leak=tension<lo?1-TQ.underCap*tension/lo:0,strain=tension>hi?(tension-hi)/(1-hi):0;
      s.$('#windlass').setAttribute('transform',`rotate(${Math.round(tension*540)})`);
      s.$('#tq-strap').setAttribute('width',String(36-tension*10));s.$('#tq-strap').setAttribute('x',String(282+tension*5));
      const bleed=s.$('#tq-bleed');bleed.style.opacity=String(.1+.9*leak);bleed.classList.toggle('stopped',leak===0);
      s.$('#tq-strain').style.opacity=String(strain);
    }
    function paint(){
      paintBoard();if(phase!==0)return;
      s.$('#tension-fill').style.width=pct(tension);s.$('#tension-position').style.left=pct(tension);
      const meter=s.$('#tension-meter'),b=bandOf(tension);
      meter.setAttribute('aria-valuenow',String(Math.round(tension*100)));meter.setAttribute('aria-valuetext',`${Math.round(tension*100)} na 100. ${BAND_TEXT[b]}`);
      s.$('#tension-number').textContent=`${Math.round(tension*100)} / 100`;
      s.$('[data-confirm]').disabled=tension<=0;
      if(b!==band){band=b;s.status(BAND_TEXT[b]);meter.dataset.band=b;}
    }
    const hold=()=>{if(phase!==0||holding)return;holding=true;startedAt||=performance.now();s.$('[data-hold]').classList.add('pressed');};
    const release=()=>{if(!holding)return;holding=false;s.$('[data-hold]')?.classList.remove('pressed');};
    const nudge=step=>{if(phase!==0)return;tension=Math.max(0,Math.min(1,tension+step));startedAt||=performance.now();paint();};
    function confirm(){
      if(phase!==0||tension<=0)return;
      release();s.stop();s.result=input();phase=1;render();
    }
    function keyDown(e){
      if(phase!==0)return;
      if(e.code==='Space'){e.preventDefault();if(!e.repeat)hold();}
      else if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();nudge(TQ.nudge);}
      else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();nudge(-TQ.nudge);}
      else if(e.key==='Enter'&&!onPlainButton(e)){e.preventDefault();confirm();}
    }
    function keyUp(e){if(phase===0&&e.code==='Space'){e.preventDefault();release();}}
    const board=()=>`<svg viewBox="0 0 800 240" role="img" aria-label="Kończyna ze stazą. Wskaźnik krwawienia poniżej stazy słabnie, gdy naciąg wchodzi w pole docelowe.">
      <path class="procedure-arm" d="M30 66Q60 60 120 62L700 82Q768 88 774 120Q768 152 700 158L120 178Q60 180 30 174Z"/>
      <text x="40" y="214">Proksymalnie</text><text x="640" y="214">Dystalnie</text>
      <rect id="tq-strain" class="tq-strain" x="262" y="44" width="76" height="152" rx="4" style="opacity:0"/>
      <rect id="tq-strap" class="tq-strap" x="282" y="56" width="36" height="128" rx="3"/>
      <g transform="translate(300 120)"><g id="windlass"><rect class="tq-rod" x="-6" y="-74" width="12" height="148" rx="3"/></g><circle class="tq-hub" r="10"/></g>
      <g transform="translate(588 121)"><g id="tq-bleed" class="tq-bleed"><circle class="tq-bleed-ring" r="34"/><circle class="tq-bleed-core" r="16"/></g><path class="tq-wound" d="M-22 -4Q0 -12 22 -3Q0 6 -22 -4Z"/></g>
      <text x="520" y="40">Krwawienie poniżej stazy</text>
    </svg>`;
    function render(){
      const outcome=phase===1?resolveTourniquet(g,part,s.result):null;
      const controls=phase===0?`<h3>Dokręć stazę do pola docelowego.</h3><p>Przytrzymaj przycisk lub Spację, aby obracać pokrętło. Puszczone pokrętło powoli się luzuje — zablokuj je przyciskiem lub Enter, gdy wskaźnik jest w polu. Strzałki korygują naciąg. Escape przerywa bez zużycia stazy.</p>
        <div class="depth-caption"><span>Naciąg</span><strong id="tension-number">0 / 100</strong></div>
        <div id="tension-meter" class="depth-meter tension-meter" role="meter" aria-label="Naciąg stazy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="depth-target" style="left:${pct(lo)};width:${pct(hi-lo)}"></div><div id="tension-fill" class="meter-fill"></div><span id="tension-position" class="meter-position"></span></div>
        <div class="procedure-actions"><button class="hold-button" data-hold>Przytrzymaj, aby dokręcać <kbd>Spacja</kbd></button><button class="primary" data-confirm disabled>Zablokuj stazę <kbd>Enter</kbd></button></div>`
        :resultBlock(outcome.band==='ok'?'success':'partial',outcome.band==='ok'?'Staza zablokowana w polu.':outcome.band==='under'?'Staza za luźna.':'Staza przeciągnięta.',outcome.band==='ok'?'Krwawienie poniżej stazy ustaje.':outcome.band==='under'?`Krwawienie poniżej słabnie, ale trwa (${percent(1-outcome.quality)} pierwotnego tempa). Możesz ją dokręcić ponownie — zużyje to kolejną stazę.`:'Krwawienie ustaje, ale nadmierny ucisk nasila ból pacjenta.',[['Naciąg',`${Math.round(outcome.tension*100)}`],['Skuteczność',percent(outcome.quality)],['Technika',percent(outcome.score)]]);
      dialog.innerHTML=shell({title:'Zakładanie stazy',part,steps:['Dokręć i zablokuj','Wynik'],phase,board:board(),controls,finished:phase===1});
      wire(s);
      if(phase===0){
        const button=s.$('[data-hold]');bindHold(button,hold,release);
        s.$('[data-confirm]').onclick=confirm;
        paint();button.focus({preventScroll:true});
        s.loop(dt=>{
          if(holding)tension=Math.min(1,tension+dt*TQ.risePerSecond);
          else if(tension>0)tension=Math.max(0,tension-dt*TQ.creepPerSecond);
          paint();
        });
      }else{paintBoard();s.status(outcome.band==='ok'?'Staza zablokowana. Krwawienie poniżej ustaje.':outcome.band==='under'?'Staza za luźna. Krwawienie trwa słabiej.':'Staza przeciągnięta. Krwawienie ustaje, ból rośnie.');}
    }
    s.on(dialog,'keydown',keyDown);s.on(dialog,'keyup',keyUp);
    render();dialog.showModal();s.$('[data-hold]').focus({preventScroll:true});
  });
}
