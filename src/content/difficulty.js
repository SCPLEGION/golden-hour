export const DIFFICULTIES = [
  {id:'easy',name:'Łatwy',description:'Więcej sprzętu, krótszy dojazd zespołu, wolniejsze krwawienie.',extraInjuries:[0,0],proceduralBonus:0,supplyMultiplier:1.5,transportDelayRange:[900,1080],bleedMultiplier:.8,scoreMultiplier:.8,deadlineMultiplier:1.5},
  {id:'normal',name:'Normalny',description:'Standardowe wyposażenie i tempo zdarzeń.',extraInjuries:[0,0],proceduralBonus:1,supplyMultiplier:1,transportDelayRange:[900,1500],bleedMultiplier:1,scoreMultiplier:1,deadlineMultiplier:1},
  {id:'hard',name:'Trudny',description:'Mniej sprzętu, dłuższy dojazd zespołu, szybsze krwawienie oraz 1–2 dodatkowe obrażenia u poszkodowanego.',extraInjuries:[1,2],proceduralBonus:2,supplyMultiplier:.6,transportDelayRange:[1260,1500],bleedMultiplier:1.25,scoreMultiplier:1.2,deadlineMultiplier:.75}
];
export const difficultyById = id => DIFFICULTIES.find(d=>d.id===id) || DIFFICULTIES.find(d=>d.id==='normal');
