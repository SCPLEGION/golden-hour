import { CPR_PROCEDURE as CPR } from '../../content/procedures.js';
import { resolvePart } from '../../content/body.js';
import { resolveCPR } from '../../simulation/procedures.js';
import { openSession, shell, resultBlock, wire, bindHold, onPlainButton, reducedMotion, pct, percent } from './shell.js';

// Rate scale shown on screen (per minute); the band comes from content.
const SCALE=[60,160],onScale=bpm=>(Math.max(SCALE[0],Math.min(SCALE[1],bpm))-SCALE[0])/(SCALE[1]-SCALE[0]);
export function runCPRMinigame(g,part){
  part=resolvePart(part);
  return new Promise(resolve=>{
    const s=openSession(resolve),{dialog}=s,n=CPR.compressions,still=reducedMotion();
    let phase=0,pressing=false,pressStart=0,starts=[],depths=[];
    const depthNow=now=>Math.min(1,(now-pressStart)/CPR.fullDepthMs);
    const intervals=()=>starts.slice(1).map((t,i)=>Math.max(1,Math.min(CPR.maxIntervalMs,Math.round(t-starts[i]))));
    const input=()=>({intervalsMs:intervals(),depths:depths.map(d=>Math.round(d*1000)/1000),aborted:false});
    const inBand=(v,[lo,hi])=>v>=lo&&v<=hi;
    function bars(live=null){
      const el=s.$('#cpr-bars');if(!el)return;
      [...el.children].forEach((bar,i)=>{
        const d=i<depths.length?depths[i]:i===depths.length&&live!==null?live:null;
        bar.firstElementChild.style.height=d===null?'0':pct(d);
        bar.className=d===null?'':i===depths.length?'live':inBand(d,CPR.depth)?'good':'off';
      });
    }
    function hands(depth){const el=s.$('#cpr-hands');if(el&&!still)el.setAttribute('transform',`translate(0 ${Math.round(depth*16)})`);}
    function down(){
      if(phase!==0||pressing||depths.length>=n)return;
      const now=performance.now();pressing=true;pressStart=now;
      if(starts.length&&now-starts.at(-1)>CPR.maxIntervalMs)s.status('Długa przerwa między uciśnięciami obniża ocenę tempa.');
      starts.push(now);s.$('[data-hold]').classList.add('pressed');
      s.loop(()=>{if(!pressing)return false;const d=depthNow(performance.now());bars(d);hands(d);});
    }
    function up(){
      if(!pressing)return;pressing=false;s.stop();
      const depth=depthNow(performance.now());depths.push(depth);s.$('[data-hold]')?.classList.remove('pressed');hands(0);bars();
      const list=intervals(),bpm=list.length?Math.round(60000/list.at(-1)):null;
      s.$('#cpr-count').textContent=`${depths.length} / ${n}`;
      if(bpm!==null){
        s.$('#cpr-rate-marker').style.left=pct(onScale(bpm));s.$('#cpr-rate-marker').hidden=false;
        s.$('#cpr-rate-value').textContent=`${bpm}/min`;
      }
      const rateText=bpm===null?'Pierwsze uciśnięcie.':inBand(bpm,CPR.rate)?`Tempo ${bpm}/min — w zakresie.`:bpm<CPR.rate[0]?`Tempo ${bpm}/min — za wolno.`:`Tempo ${bpm}/min — za szybko.`;
      const depthText=inBand(depth,CPR.depth)?'Głębokość w polu.':depth<CPR.depth[0]?'Za płytko — przytrzymaj dłużej.':'Za głęboko — puść wcześniej.';
      s.status(`${depths.length} z ${n}. ${rateText} ${depthText}`);
      if(depths.length>=n){s.result=input();phase=1;s.later(render,250);}
    }
    function keyDown(e){
      if(phase!==0)return;
      if(e.code==='Space'||(e.key==='Enter'&&!onPlainButton(e))){e.preventDefault();if(!e.repeat)down();}
    }
    function keyUp(e){if(phase===0&&(e.code==='Space'||e.key==='Enter')){e.preventDefault();up();}}
    const board=()=>`<svg viewBox="0 0 800 200" role="img" aria-label="Klatka piersiowa z dłońmi ułożonymi do uciśnięć. Dłonie opadają podczas przytrzymania.">
      <path class="procedure-arm" d="M150 182Q160 70 260 46Q400 18 540 46Q640 70 650 182Z"/>
      <path class="joint-lines" d="M400 52V170M300 70Q340 120 300 168M500 70Q460 120 500 168"/>
      <g id="cpr-hands"><rect class="cpr-hand" x="352" y="54" width="96" height="40" rx="14"/><rect class="cpr-hand top" x="362" y="40" width="76" height="34" rx="12"/><path class="cpr-arm" d="M372 40L344 0M428 40L456 0"/></g>
      <text x="40" y="30">Tempo bez metronomu</text>
    </svg>`;
    function render(){
      const outcome=phase===1?resolveCPR(g,part,s.result):null;
      const [lo,hi]=CPR.rate;
      const controls=phase===0?`<h3>Utrzymaj rytm uciśnięć.</h3><p>Naciskaj duży przycisk albo Spację ${n} razy. Odstęp między naciśnięciami wyznacza tempo — pole ${lo}–${hi}/min. Czas przytrzymania wyznacza głębokość. Gra nie podaje rytmu. Escape przerywa bez kosztu.</p>
        <div class="cpr-readouts"><div><span class="depth-caption">Uciśnięcia</span><strong id="cpr-count">0 / ${n}</strong></div><div><span class="depth-caption">Ostatnie tempo</span><strong id="cpr-rate-value">—</strong></div></div>
        <div class="cpr-rate" aria-hidden="true"><div class="depth-target" style="left:${pct(onScale(lo))};width:${pct(onScale(hi)-onScale(lo))}"></div><span id="cpr-rate-marker" class="meter-position" hidden></span><small style="left:0">${SCALE[0]}</small><small style="right:0">${SCALE[1]}/min</small></div>
        <div class="cpr-bars-wrap" aria-hidden="true"><div class="cpr-depth-band" style="bottom:${pct(CPR.depth[0])};height:${pct(CPR.depth[1]-CPR.depth[0])}"></div><div id="cpr-bars" class="cpr-bars">${Array.from({length:n},()=>'<span><i></i></span>').join('')}</div></div>
        <button class="hold-button cpr-press" data-hold>Uciśnij <kbd>Spacja</kbd></button>`
        :resultBlock(outcome.quality>=.7?'success':'partial',outcome.quality>=.7?'Seria uciśnięć wykonana.':'Seria nierówna.',`Średnie tempo ${outcome.meanRate}/min. W modelu gry seria daje ${percent(outcome.benefit)} pełnego wsparcia krążenia.${g.arrest?'':' Pacjent ma krążenie — RKO mu zaszkodzi.'}`,[['Tempo',percent(outcome.rate)],['Głębokość',percent(outcome.depth)],['Jakość',percent(outcome.quality)]]);
      dialog.innerHTML=shell({title:'Cykl uciśnięć RKO',part,steps:['Seria uciśnięć','Wynik'],phase,board:board(),controls,finished:phase===1,warning:g.arrest?'':'Pacjent ma oznaki krążenia. W tym modelu RKO bez zatrzymania krążenia szkodzi.'});
      wire(s);
      if(phase===0){const button=s.$('[data-hold]');bindHold(button,down,up);bars();button.focus({preventScroll:true});s.status(`Gotowy. Pierwsze uciśnięcie rozpoczyna serię ${n} uciśnięć.`);}
      else s.status(`Seria zakończona. Jakość ${percent(outcome.quality)}.`);
    }
    s.on(dialog,'keydown',keyDown);s.on(dialog,'keyup',keyUp);
    render();dialog.showModal();s.$('[data-hold]').focus({preventScroll:true});
  });
}
