import { PACKING_PROCEDURE as PACK } from '../../content/procedures.js';
import { resolvePart } from '../../content/body.js';
import { resolvePacking } from '../../simulation/procedures.js';
import { openSession, shell, resultBlock, wire, bindHold, onPlainButton, pct, percent } from './shell.js';

// Pocket layout is presentation only: seeded by wound + scenario so a retry shows the same cavity.
function seeded(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function cavityLayout(seed){
  const random=seeded(seed),zones=PACK.columns*PACK.rows,order=[...Array(zones).keys()].map(i=>[random(),i]).sort((a,b)=>a[0]-b[0]).map(([,i])=>i);
  const depth=Array(zones).fill(0);for(const i of order.slice(0,PACK.pockets))depth[i]=1+Math.floor(random()*PACK.maxLayers);
  return depth;
}
const ZONE={x:170,y:46,w:115,h:78};
export function runPackingMinigame(g,part,injuryId=null){
  part=resolvePart(part);
  return new Promise(resolve=>{
    const s=openSession(resolve),{dialog}=s,depth=cavityLayout(`${g.scenarioId}|${part}|${injuryId||''}`);
    const needed=depth.reduce((n,d)=>n+d,0),budget=needed+PACK.spareLayers,zones=depth.length;
    const packed=Array(zones).fill(0),layers=Array(zones).fill(0),known=Array(zones).fill('unknown');
    let phase=0,cursor=0,used=0,holding=false,heldMs=0;
    const filled=()=>packed.reduce((n,v)=>n+v,0)/needed;
    const input=()=>({filled:Math.round(filled()*1000)/1000,pressureMs:Math.round(Math.min(PACK.pressureMs,heldMs)),aborted:false});
    const zoneName=i=>`Strefa ${Math.floor(i/PACK.columns)+1}-${i%PACK.columns+1}`;
    function paintCavity(){
      const svg=s.$('#packing-map');if(!svg)return;
      svg.querySelectorAll('[data-zone]').forEach(zone=>{
        const i=Number(zone.dataset.zone);zone.setAttribute('class',`pack-zone ${known[i]}${i===cursor?' cursor':''}`);
        zone.querySelector('.pack-layers').innerHTML=Array.from({length:Math.min(4,layers[i])},(_,k)=>`<rect x="${ZONE.x+(i%PACK.columns)*ZONE.w+10}" y="${ZONE.y+Math.floor(i/PACK.columns)*ZONE.h+ZONE.h-16-k*13}" width="${ZONE.w-20}" height="9"/>`).join('');
      });
      svg.setAttribute('aria-activedescendant',`pack-zone-${cursor}`);
      if(phase!==0)return;
      s.$('#pack-fill').style.width=pct(filled());s.$('#pack-meter').setAttribute('aria-valuenow',String(Math.round(filled()*100)));
      s.$('#pack-number').textContent=`${Math.round(filled()*100)}%`;s.$('#pack-gauze').textContent=`${budget-used} / ${budget}`;
      s.$('[data-procedure-next]').disabled=used===0;
    }
    function pack(i=cursor){
      if(phase!==0)return;cursor=i;
      if(used>=budget){s.status('Brak gazy. Przejdź do ucisku.');return;}
      used++;layers[i]++;
      if(packed[i]<depth[i]){packed[i]++;known[i]=packed[i]===depth[i]?'full':'deep';s.status(`${zoneName(i)}: ${known[i]==='full'?'kieszeń wypełniona.':'gaza wchodzi głębiej — kieszeń nadal przyjmuje warstwy.'} Wypełnienie ${percent(filled())}.`);}
      else{known[i]=depth[i]?'full':'surface';s.status(`${zoneName(i)}: ${depth[i]?'kieszeń już pełna':'tu nie ma kieszeni'} — warstwa zmarnowana. Zostało ${budget-used} warstw.`);}
      paintCavity();
      if(filled()>=1||used>=budget)s.later(()=>{if(phase===0){s.status(filled()>=1?'Rana wypełniona. Utrzymaj ucisk.':'Gaza zużyta. Utrzymaj ucisk.');next();}},700);
    }
    function move(key){
      const c=PACK.columns,col=cursor%c,row=Math.floor(cursor/c);
      cursor=key==='ArrowLeft'?row*c+(col+c-1)%c:key==='ArrowRight'?row*c+(col+1)%c:key==='ArrowUp'?((row+PACK.rows-1)%PACK.rows)*c+col:((row+1)%PACK.rows)*c+col;
      paintCavity();s.status(`${zoneName(cursor)}${known[cursor]==='unknown'?'.':known[cursor]==='deep'?': kieszeń przyjmuje warstwy.':known[cursor]==='full'?': pełna.':': bez kieszeni.'}`);
    }
    function next(){if(phase!==0||used===0)return;phase=1;render();}
    function paintPressure(){
      const left=Math.max(0,PACK.pressureMs-heldMs);
      s.$('#pressure-time').textContent=`${(left/1000).toFixed(1)} s`;s.$('#pressure-fill').style.width=pct(heldMs/PACK.pressureMs);
      s.$('#pressure-meter').setAttribute('aria-valuenow',String(Math.round(heldMs/PACK.pressureMs*100)));
    }
    function holdDown(){if(phase!==1||holding)return;holding=true;s.$('[data-hold]').classList.add('pressed');s.status('Utrzymuj ucisk do końca odliczania.');
      s.loop(dt=>{if(!holding)return false;heldMs+=dt*1000;paintPressure();if(heldMs>=PACK.pressureMs){heldMs=PACK.pressureMs;complete();return false;}});}
    function holdUp(){if(!holding)return;holding=false;s.stop();s.status('Ucisk zwolniony przed czasem — tamponada będzie słabsza.');complete();}
    function complete(){if(phase!==1)return;holding=false;s.result=input();phase=2;render();}
    function keyDown(e){
      if(phase===0&&e.target.id==='packing-map'){
        if(e.key.startsWith('Arrow')){e.preventDefault();move(e.key);}
        else if(e.code==='Space'||e.key==='Enter'){e.preventDefault();if(!e.repeat)pack();}
      }else if(phase===1&&(e.code==='Space'||(e.key==='Enter'&&!onPlainButton(e)))){e.preventDefault();if(!e.repeat)holdDown();}
    }
    function keyUp(e){if(phase===1&&(e.code==='Space'||e.key==='Enter')){e.preventDefault();holdUp();}}
    const board=()=>{
      const cells=depth.map((_,i)=>{const x=ZONE.x+(i%PACK.columns)*ZONE.w,y=ZONE.y+Math.floor(i/PACK.columns)*ZONE.h;return `<g data-zone="${i}" id="pack-zone-${i}" role="button" aria-label="${zoneName(i)}"><rect class="pack-cell" x="${x}" y="${y}" width="${ZONE.w}" height="${ZONE.h}"/><g class="pack-layers"></g></g>`;}).join('');
      return `<svg id="packing-map" viewBox="0 0 800 260" tabindex="0" role="application" aria-label="Jama rany podzielona na ${zones} stref. Strzałki wybierają strefę, Spacja lub Enter wkłada warstwę gazy. Kieszenie są ukryte.">
        <defs><clipPath id="cavity-clip"><path d="M180 70Q200 30 300 40Q420 24 520 44Q630 36 640 90Q650 150 620 200Q560 236 420 222Q300 238 210 206Q160 176 180 70Z"/></clipPath></defs>
        <path class="procedure-arm" d="M60 40Q120 6 400 10Q700 6 744 40Q780 130 744 220Q700 254 400 250Q120 254 60 220Q24 130 60 40Z"/>
        <g clip-path="url(#cavity-clip)"><rect class="pack-cavity" x="160" y="20" width="500" height="230"/>${cells}</g>
        <path class="pack-rim" d="M180 70Q200 30 300 40Q420 24 520 44Q630 36 640 90Q650 150 620 200Q560 236 420 222Q300 238 210 206Q160 176 180 70Z"/>
      </svg>`;
    };
    function render(){
      const outcome=phase===2?resolvePacking(g,part,s.result):null;
      const controls=phase===0?`<h3>Wypełnij jamę rany warstwami gazy.</h3><p>W ranie są ${PACK.pockets} ukryte kieszenie o różnej głębokości. Kliknij strefę albo wybierz ją strzałkami i naciśnij Spację lub Enter, aby włożyć warstwę. Warstwa poza kieszenią albo w pełnej kieszeni przepada. Escape przerywa bez zużycia gazy.</p>
        <div class="cpr-readouts"><div><span class="depth-caption">Wypełnienie</span><strong id="pack-number">0%</strong></div><div><span class="depth-caption">Warstwy gazy</span><strong id="pack-gauze">${budget} / ${budget}</strong></div></div>
        <div id="pack-meter" class="depth-meter" role="meter" aria-label="Wypełnienie rany" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="pack-fill" class="meter-fill ok"></div></div>
        <button class="primary" data-procedure-next disabled>Przejdź do ucisku</button>`
        :phase===1?`<h3>Utrzymaj ucisk na opatrunku.</h3><p>Przytrzymaj przycisk lub Spację do końca odliczania. Puszczenie wcześniej kończy ucisk i obniża jakość tamponady.</p>
        <div class="depth-caption"><span>Pozostało</span><strong id="pressure-time">${(PACK.pressureMs/1000).toFixed(1)} s</strong></div>
        <div id="pressure-meter" class="depth-meter" role="meter" aria-label="Czas ucisku" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="pressure-fill" class="meter-fill"></div></div>
        <button class="hold-button" data-hold>Przytrzymaj ucisk <kbd>Spacja</kbd></button>`
        :resultBlock(outcome.quality>=.7?'success':'partial',outcome.quality>=.7?'Rana zatamowana.':'Tamponada niepełna.',`Jakość tamponady ${percent(outcome.quality)}. ${outcome.quality>=.7?'Gaza ogranicza krwawienie z tej rany.':'Część krwawienia przesącza się mimo gazy.'}`,[['Wypełnienie',percent(outcome.filled)],['Ucisk',percent(outcome.pressure)],['Jakość',percent(outcome.quality)]]);
      dialog.innerHTML=shell({title:'Tamponada rany',part,steps:['Wypełnij ranę','Utrzymaj ucisk','Wynik'],phase,board:board(),controls,finished:phase===2});
      wire(s);
      if(phase===0){
        const map=s.$('#packing-map');
        map.querySelectorAll('[data-zone]').forEach(zone=>zone.onclick=()=>{map.focus({preventScroll:true});pack(Number(zone.dataset.zone));});
        s.$('[data-procedure-next]').onclick=next;paintCavity();map.focus({preventScroll:true});
        s.status(`Strefa 1-1 wybrana. Masz ${budget} warstw gazy.`);
      }else{paintCavity();}
      if(phase===1){const button=s.$('[data-hold]');bindHold(button,holdDown,holdUp);paintPressure();button.focus({preventScroll:true});}
      if(phase===2)s.status(`Tamponada zakończona. Jakość ${percent(outcome.quality)}.`);
    }
    s.on(dialog,'keydown',keyDown);s.on(dialog,'keyup',keyUp);
    render();dialog.showModal();s.$('#packing-map').focus({preventScroll:true});
  });
}
