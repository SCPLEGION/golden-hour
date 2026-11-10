import { createGame, act, advanceTime, scenarioById } from './engine.js';
import { renderNewCall } from './ui/new-call.js';
import { validCategory } from './storage.js';
import { createRealtimeDriver } from './simulation/realtime.js';
import { sampleMonitor } from './simulation/monitor.js';
import { scoreRun } from './simulation/scoring.js';
import { updateLiveHUD } from './ui/live-hud.js';
import { difficultyById } from './content/difficulty.js';
import { itemById } from './content/items.js';
import { renderGame } from './ui/game-screen.js';
import { mountGuide } from './ui/guide.js';
import { createContextMenu } from './ui/context-menu.js';
import { bindBodyInteractions } from './ui/body-interactions.js';
import { launchProcedure } from './ui/procedures/index.js';
import { autoInput } from './simulation/procedures.js';
import { itemUnavailable } from './simulation/effects.js';
import { tutorialProgress } from './simulation/tutorial.js';
import { isMissing } from './simulation/selectors.js';
import { loadProgress, saveProgress, sanitizeHistory } from './storage.js';
import { renderStatsPanel } from './ui/stats-panel.js';
const root=document.querySelector('#app');
const progress=loadProgress();
let game=progress.game||createGame(), stats=progress.stats;
let target=game.injuries[0]?.part||'chest';
let tab='equipment',saved=true,selectedWound=null,heldItem=null,logOpen=false,procedureBusy=false,driver=null,bagSearch='',bagFilter='all';
const contextMenu=createContextMenu(executeAction);
const guide=document.querySelector('#guide');mountGuide(guide);
const statsDialog=document.querySelector('#stats');
function openStats(){driver?.reset();statsDialog.innerHTML=renderStatsPanel(stats,id=>scenarioById(id)?.title||id);statsDialog.querySelector('[data-close]').onclick=()=>statsDialog.close();statsDialog.querySelector('[data-difficulty]').onchange=e=>{setDifficulty(e.target.value);openStats();};statsDialog.querySelector('[data-minigames]').onchange=e=>{stats.minigames=e.target.checked?'on':'off';persist();openStats();statsDialog.querySelector('[data-minigames]').focus();announce(stats.minigames==='on'?'Minigry procedur włączone.':'Minigry wyłączone. Procedury wykonują się automatycznie ze średnim wynikiem.');};statsDialog.showModal();}
statsDialog.onclick=e=>{if(e.target===statsDialog)statsDialog.close();};
// New call: the player picks difficulty and a category; the patient state inside it is random.
const newCallDialog=document.querySelector('#new-call');
newCallDialog.onclick=e=>{if(e.target===newCallDialog)newCallDialog.close();};
function openNewCall(){
  driver?.reset();const active=game.status==='active';
  newCallDialog.innerHTML=renderNewCall({stats,active});
  newCallDialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>newCallDialog.close());
  newCallDialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();const data=new FormData(e.target);
    if(game.status==='active'&&!confirm('Przerwać obecną interwencję i przyjąć nowe wezwanie?'))return;
    stats.category=validCategory(data.get('category'));stats.difficulty=difficultyById(data.get('difficulty')).id;
    newCallDialog.close();startCall();
  };
  newCallDialog.showModal();
  (newCallDialog.querySelector('input[name=category]:checked')||newCallDialog.querySelector('input[name=category]'))?.focus();
}
function startCall(){
  const previous=game.protocol?.conditionId;
  for(let i=0;i<4;i++){game=createGame(0,Math.random,{difficulty:stats.difficulty,category:stats.category});if(game.protocol.conditionId!==previous)break;}
  target=game.injuries[0].part;tab='equipment';selectedWound=null;heldItem=null;bagSearch='';bagFilter='all';logOpen=false;persist();render();window.scrollTo({top:0,behavior:'instant'});announce('Nowe wezwanie. Oceń poszkodowanego.');
}
function setDifficulty(id){stats.difficulty=id;persist();feedback(`Poziom „${difficultyById(stats.difficulty).name}” obowiązuje od następnego wezwania.`);}
const announce=text=>{document.querySelector('#announcement').textContent=text;};
function recordRun(){const r=scoreRun(game);stats[game.status]++;stats.best=Math.max(stats.best||0,r.total);stats.history=sanitizeHistory([...(stats.history||[]),{scenarioId:game.scenarioId,status:game.status,total:r.total,grade:r.grade,difficulty:game.difficulty}]);}
function persist(){saved=saveProgress(game,stats);}
function feedback(text){announce(text);const box=document.querySelector('#feedback');box.textContent=text;box.hidden=false;clearTimeout(feedback.timer);feedback.timer=setTimeout(()=>box.hidden=true,6500);}
// On a missing (amputated) segment the only thing to act on is its stump injury.
const stumpWound=(part,wound)=>wound??(isMissing(game,part)?game.injuries.find(i=>i.part===part)?.id??null:null);
async function executeAction(id,site=target,wound=selectedWound){
  if(procedureBusy)return;
  wound=stumpWound(site,wound);
  const item=itemById(id);
  const woundTarget=item?.scope==='wound'?wound:null;
  const reason=item?itemUnavailable(game,item,site,woundTarget):null;
  if(reason){feedback(reason);return;}
  target=site;selectedWound=wound;
  let input=null;
  // With minigames off every procedure gets the same deterministic, middling attempt.
  if(item?.procedure&&stats.minigames==='off')input=autoInput(item.procedure,game,site);
  else if(item?.procedure){
    procedureBusy=true;driver?.reset();contextMenu.close();
    try{input=await launchProcedure(item.procedure,game,site,woundTarget);}catch(error){feedback(error.message);return;}finally{procedureBusy=false;driver?.reset();}
    if(!input)return;
  }
  const before=game.status,stepBefore=tutorialProgress(game).index,next=act(game,id,site,woundTarget,input);
  if(next===game)return;
  game=next;heldItem=null;
  let tutorialNote='';
  if(stats.tutorial==='on'){
    const t=tutorialProgress(game);
    if(t.complete){stats.tutorial='off';tutorialNote='Samouczek ukończony.';}
    else if(t.index!==stepBefore)tutorialNote=`Samouczek ${t.index+1} z ${t.total}: ${t.step.title}.`;
  }
  if(before==='active'&&game.status!=='active')recordRun();
  driver?.reset();persist();render();feedback(game.log.at(-1).text);
  if(tutorialNote)setTimeout(()=>announce(tutorialNote),400);
  if(tutorialNote==='Samouczek ukończony.')setTimeout(()=>feedback(tutorialNote),400);
}
function openMenu(part,injuryId,x,y){
  injuryId=stumpWound(part,injuryId);
  target=part;selectedWound=injuryId;render();
  const anchor=injuryId?root.querySelector(`[data-injury="${injuryId}"]`):root.querySelector(`.patient-scene [data-part="${part}"]`);
  if(!x&&!y){const r=anchor.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2;}
  contextMenu.open({g:game,part,injuryId,x,y,trigger:anchor});
}
function filterBag(){
  const query=bagSearch.trim().toLocaleLowerCase('pl');let count=0;
  root.querySelectorAll('[data-bag-item]').forEach(card=>{
    const visible=card.dataset.searchText.includes(query)&&(bagFilter!=='available'||card.dataset.available==='true')&&(bagFilter!=='compatible'||card.dataset.compatible==='true');
    card.hidden=!visible;if(visible)count++;
  });
  const counter=root.querySelector('[data-bag-count]');if(counter)counter.textContent=`${count} pozycji`;
  const empty=root.querySelector('[data-bag-empty]');if(empty)empty.hidden=count!==0;
}
function render(focus=null) {
  contextMenu.close();
  const scroll=root.querySelector('.care-content')?.scrollTop||0;
  const ended=game.status!=='active';
  root.innerHTML=renderGame({game,stats,target,tab,heldItem,selectedWound,saved,logOpen});
  root.querySelector('.care-content')?.scrollTo(0,scroll);
  if(stats.tutorial==='on'&&game.status==='active'){const t=tutorialProgress(game);if(!t.complete&&t.step.focus)root.querySelectorAll(t.step.focus).forEach(el=>el.classList.add('tutorial-focus'));}
  root.querySelectorAll('[data-stats]').forEach(b=>b.onclick=openStats);
  root.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{logOpen=!logOpen;render();});
  root.querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>{driver?.reset();guide.showModal();});
  root.querySelectorAll('[data-tutorial-skip]').forEach(b=>b.onclick=()=>{stats.tutorial='off';persist();render();announce('Samouczek wyłączony.');});
  root.querySelectorAll('[data-tutorial-toggle]').forEach(b=>b.onclick=()=>{stats.tutorial=stats.tutorial==='on'?'off':'on';persist();render();announce(stats.tutorial==='on'?'Samouczek włączony.':'Samouczek wyłączony.');});
  root.querySelectorAll('[data-pause]').forEach(b=>b.onclick=()=>{game.paused=!game.paused;driver?.reset();persist();render();});
  root.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{game.speed=Number(b.dataset.speed);driver?.reset();persist();render();});
  root.querySelectorAll('[data-monitor]').forEach(b=>b.onclick=()=>{game.monitoring=!game.monitoring;if(game.monitoring)sampleMonitor(game);persist();render();});
  const search=root.querySelector('[data-bag-search]');
  if(search){search.value=bagSearch;search.oninput=e=>{bagSearch=e.target.value;filterBag();};}
  const filter=root.querySelector('[data-bag-filter]');if(filter){filter.value=bagFilter;filter.onchange=e=>{bagFilter=e.target.value;filterBag();};}
  filterBag();
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render(`[data-tab="${tab}"]`);root.querySelector('.care-content')?.scrollTo(0,0);});
  bindBodyInteractions(root,{
    heldItem,
    onSelect:(part,wound)=>{target=part;selectedWound=wound;render(`.patient-scene [data-part="${part}"]`);},
    onMenu:openMenu,
    onPlace:executeAction
  });
  root.querySelector('[data-context-open]')?.addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();openMenu(target,selectedWound,r.left,r.bottom);});
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>executeAction(b.dataset.action));
  root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{heldItem=heldItem===b.dataset.pick?null:b.dataset.pick;render(`[data-pick="${b.dataset.pick}"]`);if(heldItem)announce(`${itemById(heldItem).name} w ręce. Wybierz miejsce użycia na ciele.`);});
  root.querySelector('[data-put-away]')?.addEventListener('click',()=>{heldItem=null;render();});
  root.querySelectorAll('[data-drag-item]').forEach(card=>card.ondragstart=e=>{if(card.draggable){e.dataTransfer.setData('application/x-field-medic-item',card.dataset.dragItem);e.dataTransfer.effectAllowed='copy';}});
  root.querySelectorAll('[data-difficulty]').forEach(s=>s.onchange=()=>setDifficulty(s.value));
  root.querySelectorAll('[data-new]').forEach(b=>b.onclick=openNewCall);
  if(focus)root.querySelector(focus)?.focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||procedureBusy||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable],[role=menuitem]'))return;
  if(e.key==='Escape'){heldItem=null;logOpen=false;render();}
  if(e.code==='KeyL'){logOpen=!logOpen;render();}
  if(e.code==='KeyH'){driver?.reset();guide.showModal();}
  if(e.code==='Space'){e.preventDefault();game.paused=!game.paused;driver?.reset();persist();render();}
  const action={Digit1:'examine',Digit2:'vitals',Digit3:'transport',Digit4:'wait30'}[e.code];
  if(action){e.preventDefault();executeAction(action);}
});
driver=createRealtimeDriver({
  canRun:()=>game.status==='active'&&!game.paused&&!procedureBusy&&!document.hidden&&!document.querySelector('dialog[open]'),
  getSpeed:()=>game.speed||1,
  onAdvance:seconds=>{
    const before=game.status;game=advanceTime(game,seconds);
    if(before==='active'&&game.status!=='active'){recordRun();heldItem=null;persist();render();feedback(game.log.at(-1).text);return;}
    persist();updateLiveHUD(root,game);
  }
});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>driver.reset());
document.addEventListener('visibilitychange',()=>driver.reset());
window.addEventListener('pagehide',()=>{persist();driver.stop();});
window.addEventListener('pageshow',()=>{driver.reset();driver.start();});
persist();render();driver.start();
