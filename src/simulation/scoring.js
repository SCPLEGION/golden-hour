import { ITEMS } from '../content/items.js';
import { difficultyById } from '../content/difficulty.js';
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min));
const GRADES=[['S',90],['A',75],['B',60],['C',40]];
// Pure end-of-run score. Blood and oxygen are on a 0..100 scale (see physiology.js).
export function scoreRun(g) {
  const outcome=g.status==='saved'?40:0;
  const state=Math.round(12.5*clamp(g.blood/100)+12.5*clamp(g.oxygen/100));
  const called=Number.isFinite(g.transportCalledAt);
  const reaction=called?Math.round(20*clamp(1-(g.transportCalledAt-60)/240)):0;
  const counted=ITEMS.filter(i=>i.count!==null&&i.count>0);
  const left=counted.reduce((n,i)=>n+clamp((g.supplies?.[i.id]??i.count)/i.count),0);
  const economy=counted.length?Math.round(15*left/counted.length):0;
  const parts=[
    {id:'outcome',label:'Wynik interwencji',points:outcome,max:40,note:g.status==='saved'?'Pacjent przekazany żywy.':g.status==='lost'?'Pacjent zmarł.':'Interwencja trwa.'},
    {id:'state',label:'Stan przy przekazaniu',points:state,max:25,note:`Krew ${Math.round(g.blood)}, tlen ${Math.round(g.oxygen)}.`},
    {id:'reaction',label:'Szybkość wezwania pomocy',points:reaction,max:20,note:called?`Ewakuację zgłoszono po ${Math.round(g.transportCalledAt)} s.`:'Nie zgłoszono ewakuacji.'},
    {id:'economy',label:'Gospodarka sprzętem',points:economy,max:15,note:`Pozostało ${Math.round(100*left/(counted.length||1))}% zapasów.`}
  ];
  const difficulty=difficultyById(g.difficulty);
  const total=Math.min(100,Math.round(parts.reduce((n,p)=>n+p.points,0)*difficulty.scoreMultiplier));
  return {total,grade:(GRADES.find(([,min])=>total>=min)||['D'])[0],parts,difficulty:{id:difficulty.id,name:difficulty.name,multiplier:difficulty.scoreMultiplier}};
}
