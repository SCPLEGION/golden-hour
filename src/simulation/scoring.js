import { ITEMS } from '../content/items.js';
import { difficultyById } from '../content/difficulty.js';
import { protocolShare, protocolStatus } from './protocol.js';
import { clinicalSnapshot } from './physio-model.js';
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min));
const GRADES=[['S',90],['A',75],['B',60],['C',40]];
const pl=(n,d=1)=>n.toFixed(d).replace('.',',');
// Handover state (P4) from the clinical snapshot alone: perfusion by shock index HR/SBP (≤ 0.7 full, ≥ 1.3 zero; 10 pts),
// oxygenation SpO2 (≥ 94 full, ≤ 80 zero; 7.5 pts) and secondary insults (7.5 pts) = temperature (36–38 full, zero at
// ≤ 34 / ≥ 40) × GCS (15 full, halved at ≤ 8) × lactate (≤ 2 full, halved at ≥ 6 mmol/L). `decent` needs half the points
// and neither perfusion nor oxygenation fully failed (decompensated shock is not a decent handover).
export function handoverQuality(s){
  const index=s.sbp>0?s.hr/s.sbp:Infinity;
  const perfusion=clamp((1.3-index)/.6),oxygen=clamp((s.spo2-80)/14);
  const temperature=s.tempC<36?clamp((s.tempC-34)/2):clamp((40-s.tempC)/2),gcs=.5+.5*clamp((s.gcs-8)/7),lactate=.5+.5*clamp((6-(s.lactate??1))/4);
  const points=Math.round(10*perfusion+7.5*oxygen+7.5*temperature*gcs*lactate);
  return {points,index,perfusion,oxygen,secondary:temperature*gcs*lactate,decent:points>=12.5&&perfusion>0&&oxygen>0};
}
const lossNote=s=>`Utrata krwi ok. ${pl(s.lostMl/1000)} l (klasa ${s.hemorrhageLabel})`;
function handover(g){
  const s=clinicalSnapshot(g);
  if(g.status==='lost')return {points:0,decent:false,note:`Brak oznak życia. ${lossNote(s)}.`};
  const q=handoverQuality(s);
  return {...q,note:`${lossNote(s)}, SpO₂ ${Math.round(s.spo2)}%, ${pl(s.tempC)} °C, GCS ${s.gcs}, mleczany ${pl(s.lactate??1)} mmol/l, indeks wstrząsowy ${Number.isFinite(q.index)?pl(q.index,2):'—'}.`};
}
// Pure end-of-run score. Economy and call speed count only for a patient handed over alive in at least half-good state.
export function scoreRun(g) {
  const outcome=g.status==='saved'?40:0;
  const {points:state,decent,note:stateNote}=handover(g),earned=g.status==='saved'&&decent;
  const gate=g.status!=='saved'?'Nie liczono: pacjent nie został przekazany żywy.':'Nie liczono: stan przy przekazaniu poniżej połowy albo niewyrównany wstrząs lub niedotlenienie.';
  const called=Number.isFinite(g.transportCalledAt);
  const reaction=called&&earned?Math.round(20*clamp(1-(g.transportCalledAt-60)/240)):0;
  // Baseline is the bag this run started with (difficulty scales it, as in createGame).
  const difficulty=difficultyById(g.difficulty);
  const counted=ITEMS.filter(i=>i.count!==null&&i.count>0).map(i=>{const start=Math.max(1,Math.round(i.count*difficulty.supplyMultiplier));return {start,left:clamp(g.supplies?.[i.id]??start,0,start)};});
  const total=counted.reduce((n,i)=>n+i.start,0),left=counted.reduce((n,i)=>n+i.left,0),used=total-left;
  const economy=total&&earned?Math.round(15*left/total):0;
  const parts=[
    {id:'outcome',label:'Wynik interwencji',points:outcome,max:40,note:g.status==='saved'?'Pacjent przekazany żywy.':g.status==='lost'?'Pacjent zmarł.':'Interwencja trwa.'},
    {id:'state',label:'Stan przy przekazaniu',points:state,max:25,note:stateNote},
    {id:'reaction',label:'Szybkość wezwania pomocy',points:reaction,max:20,note:`${called?`Ewakuację zgłoszono po ${Math.round(g.transportCalledAt)} s.`:'Nie zgłoszono ewakuacji.'}${called&&!earned?` ${gate}`:''}`},
    {id:'economy',label:'Gospodarka sprzętem',points:economy,max:15,note:`Zużyto ${used} z ${total} sztuk sprzętu i leków (pozostało ${Math.round(100*left/(total||1))}%).${earned?'':` ${gate}`}`}
  ];
  // With a patient-state protocol the other parts shrink to 85 points so the total still tops out at 100.
  const share=protocolShare(g);
  if(share!==null){
    const steps=protocolStatus(g),maxes={outcome:34,state:21,reaction:17,economy:13};
    for(const p of parts){p.points=Math.round(p.points*maxes[p.id]/p.max);p.max=maxes[p.id];}
    parts.push({id:'protocol',label:'Protokół',points:Math.round(15*share),max:15,note:`Na czas ${steps.filter(s=>s.onTime).length}, spóźnione ${steps.filter(s=>s.late).length}, pominięte ${steps.filter(s=>!s.onTime&&!s.late).length} z ${steps.length} kroków.`});
  }
  const score=Math.min(100,Math.round(parts.reduce((n,p)=>n+p.points,0)*difficulty.scoreMultiplier));
  return {total:score,grade:(GRADES.find(([,min])=>score>=min)||['D'])[0],parts,difficulty:{id:difficulty.id,name:difficulty.name,multiplier:difficulty.scoreMultiplier}};
}
