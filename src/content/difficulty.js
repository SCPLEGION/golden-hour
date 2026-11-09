export const DIFFICULTIES = [
  {id:'easy',name:'Łatwy',description:'Więcej sprzętu, krótszy dojazd zespołu, wolniejsze krwawienie.',supplyMultiplier:1.5,transportDelayRange:[900,1080],bleedMultiplier:.8,scoreMultiplier:.8},
  {id:'normal',name:'Normalny',description:'Standardowe wyposażenie i tempo zdarzeń.',supplyMultiplier:1,transportDelayRange:[900,1500],bleedMultiplier:1,scoreMultiplier:1},
  {id:'hard',name:'Trudny',description:'Mniej sprzętu, dłuższy dojazd zespołu, szybsze krwawienie.',supplyMultiplier:.6,transportDelayRange:[1260,1500],bleedMultiplier:1.25,scoreMultiplier:1.2}
];
export const difficultyById = id => DIFFICULTIES.find(d=>d.id===id) || DIFFICULTIES.find(d=>d.id==='normal');
