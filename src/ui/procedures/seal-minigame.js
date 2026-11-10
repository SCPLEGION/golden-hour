import { SEAL_PROCEDURE as SEAL } from '../../content/procedures.js';
import { resolvePart } from '../../content/body.js';
import { resolveSeal } from '../../simulation/procedures.js';
import { vitals } from '../../simulation/selectors.js';
import { openSession, shell, resultBlock, wire, onPlainButton, reducedMotion, percent } from './shell.js';

// Chest volume over one breath: rise during inhale, fall during exhale (0..1).
export const breathVolume=phase=>{phase=((phase%1)+1)%1;return phase<SEAL.inhale?(1-Math.cos(Math.PI*phase/SEAL.inhale))/2:(1+Math.cos(Math.PI*(phase-SEAL.inhale)/(1-SEAL.inhale)))/2;};
// The breathing cycle follows the patient's displayed rate, kept within a playable range.
export const breathCycleMs=g=>{const rate=vitals(g).breathing;return rate>0?Math.max(SEAL.cycleMs[0],Math.min(SEAL.cycleMs[1],60000/rate)):4000;};
const NOW_X=560,CYCLE_PX=320,Y=v=>190-v*140;
export function runSealMinigame(g,part){
  part=resolvePart(part);
  return new Promise(resolve=>{
    const s=openSession(resolve),{dialog}=s,cycle=breathCycleMs(g),still=reducedMotion(),[lo,hi]=SEAL.window;
    let phase=0,attempts=0,t0=performance.now(),last=null,pressedAt=0;
    const phaseAt=now=>((now-t0)%cycle)/cycle;
    const inside=p=>p>=lo&&p<=hi;
    // Scrolling trace: the "now" cursor is fixed; reduced motion keeps one static breath and moves the cursor.
    function trace(p){
      const pts=[],bands=[];
      if(still){
        for(let x=80;x<=720;x+=8)pts.push(`${x},${Y(breathVolume((x-80)/640)).toFixed(1)}`);
        bands.push([80+lo*640,(hi-lo)*640]);
        return {pts,bands,cursor:80+p*640};
      }
      for(let x=0;x<=800;x+=8)pts.push(`${x},${Y(breathVolume(p+(x-NOW_X)/CYCLE_PX)).toFixed(1)}`);
      for(let k=-3;k<=2;k++){const start=NOW_X+(k+lo-p)*CYCLE_PX;bands.push([start,(hi-lo)*CYCLE_PX]);}
      return {pts,bands,cursor:NOW_X};
    }
    function paint(now){
      const p=phaseAt(now),{pts,bands,cursor}=trace(p);
      s.$('#breath-line').setAttribute('points',pts.join(' '));
      s.$('#breath-bands').innerHTML=bands.map(([x,w])=>`<rect x="${x.toFixed(1)}" y="30" width="${w.toFixed(1)}" height="170"/>`).join('');
      s.$('#breath-cursor').setAttribute('transform',`translate(${cursor.toFixed(1)} 0)`);
      const label=s.$('#breath-phase');if(!label)return;label.textContent=p<SEAL.inhale?'Wdech':inside(p)?'Wydech — okno':'Wydech';label.dataset.window=String(inside(p));
    }
    function press(){
      if(phase!==0)return;
      pressedAt=performance.now();const p=Math.round(phaseAt(pressedAt)*1000)/1000;attempts++;last={phase:p,attempts,aborted:false};s.stop();
      if(inside(p)||attempts>=SEAL.maxAttempts){s.result=last;phase=2;}else phase=1;
      render();
    }
    function retry(){if(phase!==1)return;phase=0;render();}
    function accept(){if(phase!==1)return;s.result=last;phase=2;render();}
    function keyDown(e){
      if(phase===0&&(e.code==='Space'||(e.key==='Enter'&&!onPlainButton(e)))){e.preventDefault();if(!e.repeat)press();}
    }
    const board=()=>`<svg viewBox="0 0 800 220" role="img" aria-label="Przebieg oddechu przesuwa się w lewo. Zaznaczone pola to okna końca wydechu; pionowa linia oznacza chwilę przyłożenia.">
      <g id="breath-bands" class="breath-band"></g>
      <path class="joint-lines" d="M0 190H800M0 50H800"/>
      <polyline id="breath-line" class="breath-line" points=""/>
      <g id="breath-cursor"><path class="breath-cursor" d="M0 22V204"/><circle class="breath-cursor-dot" cy="22" r="5"/></g>
      <text x="16" y="44">Objętość klatki</text><text x="16" y="212">${still?'Jeden oddech — wskaźnik przesuwa się':'Czas →'}</text>
    </svg>`;
    function render(){
      const outcome=phase===2?resolveSeal(g,part,s.result):null,preview=phase===1?resolveSeal(g,part,last):null;
      const controls=phase===0?`<h3>Przyłóż opatrunek pod koniec wydechu.</h3><p>Naciśnij przycisk, Spację lub Enter, gdy pionowa linia jest w zaznaczonym polu wydechu. Masz jedną próbę; druga wydłuża czynność o ${SEAL.retryTime} s gry. Escape przerywa bez zużycia opatrunku.</p>
        <div class="depth-caption"><span>Faza oddechu</span><strong id="breath-phase" aria-hidden="true">Wdech</strong></div>
        <button class="hold-button" data-press>${attempts?'Przyłóż ponownie':'Przyłóż opatrunek'} <kbd>Spacja</kbd></button>`
        :phase===1?`<div class="procedure-result partial"><span class="result-mark">!</span><div><h3>Przyłożony poza oknem wydechu.</h3><p>Szczelność tylko ${percent(preview.quality)}. Możesz spróbować ponownie (+${SEAL.retryTime} s gry) albo zostawić opatrunek.</p></div></div>
        <div class="procedure-actions"><button class="primary" data-retry>Ponów próbę (+${SEAL.retryTime} s)</button><button class="quiet" data-accept>Zostaw opatrunek</button></div>`
        :resultBlock(outcome.inside?'success':'partial',outcome.inside?'Rana klatki uszczelniona.':'Uszczelnienie niepełne.',outcome.inside?'Opatrunek przylega szczelnie; związany z raną ubytek tlenu ustaje.':`Szczelność ${percent(outcome.quality)}. Część ubytku tlenu z tej rany pozostaje.`,[['Moment',`${Math.round(outcome.phase*100)}`],['Próby',`${outcome.attempts} / ${SEAL.maxAttempts}`],['Szczelność',percent(outcome.quality)]]);
      dialog.innerHTML=shell({title:'Uszczelnienie rany klatki',part,steps:['Pierwsza próba','Druga próba','Wynik'],phase:phase===2?2:attempts?1:0,board:board(),controls,finished:phase===2});
      wire(s);
      if(phase===0){
        const button=s.$('[data-press]');
        button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();press();};button.onclick=e=>e.preventDefault();
        button.focus({preventScroll:true});s.status(attempts?'Druga próba. Obserwuj oddech.':'Obserwuj oddech i przyłóż opatrunek w polu wydechu.');
        s.loop((dt,now)=>{paint(now);});paint(performance.now());
      }else{
        paint(pressedAt);
        if(phase===1){s.$('[data-retry]').onclick=retry;s.$('[data-accept]').onclick=accept;s.$('[data-retry]').focus({preventScroll:true});s.status(`Poza oknem wydechu. Szczelność ${percent(preview.quality)}. Ponów albo zostaw.`);}
        else s.status(outcome.inside?'Rana uszczelniona.':`Uszczelnienie niepełne: ${percent(outcome.quality)}.`);
      }
    }
    s.on(dialog,'keydown',keyDown);
    render();dialog.showModal();s.$('[data-press]').focus({preventScroll:true});
  });
}
