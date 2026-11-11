// `complications`: in-run events (src/simulation/complications.js) — first possible draw, mean gap between draws and the
// cap per run (seconds of game time); null = none. `monitorAttached: false` starts without the monitor; `hideVisible`
// reveals normally visible injuries only after examining their segment (except massive bleeding and amputations).
export const DIFFICULTIES = [
  {id:'easy',name:'Łatwy',description:'Więcej sprzętu, krótszy dojazd zespołu, wolniejsze krwawienie.',extraInjuries:[0,0],proceduralBonus:0,supplyMultiplier:1.5,transportDelayRange:[900,1080],bleedMultiplier:.8,scoreMultiplier:.8,deadlineMultiplier:1.5,complications:null},
  {id:'normal',name:'Normalny',description:'Standardowe wyposażenie i tempo zdarzeń. Rzadko zdarzy się nieprzewidziana komplikacja.',extraInjuries:[0,0],proceduralBonus:1,supplyMultiplier:1,transportDelayRange:[900,1500],bleedMultiplier:1,scoreMultiplier:1,deadlineMultiplier:1,complications:{first:720,mean:1200,max:2}},
  {id:'hard',name:'Trudny',description:'Połowa sprzętu, dojazd zespołu 25–30 minut, krwawienie o połowę szybsze, krótsze terminy, 2–3 dodatkowe obrażenia i częste komplikacje w trakcie opieki.',extraInjuries:[2,3],proceduralBonus:2,supplyMultiplier:.5,transportDelayRange:[1500,1800],bleedMultiplier:1.5,scoreMultiplier:1.3,deadlineMultiplier:.6,complications:{first:360,mean:480,max:4}},
  {id:'expert',name:'Ekspert',description:'Minimum sprzętu, dojazd 28–35 minut, bardzo szybkie krwawienie, 2–4 dodatkowe obrażenia i liczne komplikacje. Monitor trzeba podłączyć samodzielnie, a większość urazów widać dopiero po zbadaniu okolicy.',extraInjuries:[2,4],proceduralBonus:3,supplyMultiplier:.4,transportDelayRange:[1680,2100],bleedMultiplier:1.8,scoreMultiplier:1.6,deadlineMultiplier:.5,complications:{first:180,mean:240,max:8},monitorAttached:false,hideVisible:true}
];
export const difficultyById = id => DIFFICULTIES.find(d=>d.id===id) || DIFFICULTIES.find(d=>d.id==='normal');
// Bounds of every level's transport delay (restoreGame validation; older saves stay within them).
export const TRANSPORT_DELAY_BOUNDS=[Math.min(900,...DIFFICULTIES.map(d=>d.transportDelayRange[0])),Math.max(1500,...DIFFICULTIES.map(d=>d.transportDelayRange[1]))];
