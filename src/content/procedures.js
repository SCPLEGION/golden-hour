// Game-space geometry and skill targets. Values are not clinical instructions.
export const IV_PROCEDURE = {
  id:'iv', name:'Założenie wenflonu', approachTarget:42,
  advancePerSecond:.24,
  veins:[[[110,150],[190,135],[280,145],[370,128],[465,142],[550,133],[635,149],[710,141]],[[285,145],[355,176],[460,170],[550,155],[635,149]]],
  sites:[
    {id:'elbow',name:'Okolica łokcia',from:0,to:220,efficiency:.84,tolerance:21,depthTarget:.72,depthWindow:.18,position:.12,description:'Dobry przepływ, mniejszy margines prowadzenia.'},
    {id:'forearm',name:'Przedramię',from:220,to:610,efficiency:1,tolerance:25,depthTarget:.62,depthWindow:.23,position:.54,description:'Najszerszy margines. Stabilne miejsce w tym modelu gry.'},
    {id:'hand',name:'Okolica dłoni',from:610,to:800,efficiency:.68,tolerance:17,depthTarget:.56,depthWindow:.16,position:.91,description:'Mniejszy przepływ i węższe pole trafienia.'}
  ]
};
// Hold/timing minigames. Windows and rates are game balance on 0..1 skill scales.
export const TOURNIQUET_PROCEDURE = {
  id:'tourniquet', name:'Zakładanie stazy', window:[.62,.84], risePerSecond:.38, creepPerSecond:.035, nudge:.02,
  underCap:.9, strainPain:2.5, autoTension:.63
};
export const CPR_PROCEDURE = {
  id:'cpr', name:'Cykl uciśnięć', compressions:15, rate:[100,120], rateTolerance:30, depth:[.55,.85], depthTolerance:.3,
  fullDepthMs:360, maxIntervalMs:5000, benefitFloor:.4, autoIntervalMs:600, autoDepth:.46
};
export const PACKING_PROCEDURE = {
  id:'packing', name:'Tamponada rany', columns:4, rows:2, pockets:4, maxLayers:3, spareLayers:3, pressureMs:3000,
  pressureFloor:.35, autoFilled:.8, autoPressureMs:2400
};
export const SEAL_PROCEDURE = {
  id:'seal', name:'Uszczelnienie rany klatki', inhale:.45, window:[.62,.88], missFloor:.3, missRange:.4, retryTime:10, maxAttempts:2,
  cycleMs:[2500,5000], autoPhase:.64
};
