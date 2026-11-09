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
