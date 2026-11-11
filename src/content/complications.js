// In-run complications (src/simulation/complications.js). Each record is declarative: `when` names a registered
// precondition that lists the possible targets (none = not applicable now), `effect` the registered change with its
// parameters and `resolve` the registered check that marks the event as controlled. `weight` = relative draw chance.
// Every event can be fixed with existing items or actions; the precondition demands that the fix is still available.
export const COMPLICATIONS=[
  {id:'tourniquetSlip',weight:3,when:'tourniquet',effect:{tourniquetSlip:.5},resolve:'tourniquet',text:'Staza się poluzowała — krwawienie poniżej znów narasta.'},
  {id:'dressingSoak',weight:3,when:'dressedWound',effect:{removeDressing:true},resolve:'woundCovered',text:'Opatrunek przesiąkł i przestał uciskać ranę.'},
  {id:'clotBreak',weight:2,when:'holdingClot',effect:{breakClot:true},resolve:'clotOrPacking',text:'Skrzep w ranie się oderwał — opatrunek ponownie przesiąka.'},
  {id:'vomiting',weight:3,when:'vomitRisk',effect:{aspiration:true},resolve:'airway',text:'Pacjent wymiotuje i zachłystuje się treścią — bulgoczący oddech.'},
  {id:'hiddenWorsens',weight:2,when:'hiddenInjury',effect:{deteriorate:true},resolve:'examined',text:'Stan pacjenta nagle się pogarsza, choć nie widać nowej przyczyny.'},
  {id:'painSpike',weight:2,when:'conscious',effect:{pain:3,durationS:900},resolve:'analgesia',text:'Nagły wzrost bólu — pacjent jest pobudzony i niespokojny.'},
  {id:'ivDislodged',weight:2,when:'ivAccess',effect:{removeIV:true},resolve:'newIV',text:'Wenflon wysunął się z żyły — dostęp utracony, wlew przerwany.'},
  {id:'maskDisplaced',weight:2,when:'oxygenOn',effect:{maskOff:true},resolve:'oxygen',text:'Maska tlenowa zsunęła się z twarzy — dopływ tlenu ustał.'},
  {id:'shivering',weight:2,when:'coldExposure',effect:{temperature:-.4},resolve:'warm',text:'Pacjent drży z zimna — temperatura głęboka spada.'}
];
export const complicationById=id=>COMPLICATIONS.find(c=>c.id===id);
// Hidden injuries that can deteriorate unseen: a burst of hidden blood loss (legacy points, 0.5% EBV each),
// or a change of type (addInjury: a new injury on the same segment is also supported).
export const DETERIORATION={internal:{bleedPts:6},crushInjury:{bleedPts:5},thighHematoma:{bleedPts:4},fracture:{bleedPts:3},ribFracture:{bleedPts:3},spinalInjury:{to:'spinalCordInjury'}};
// Pain relief that settles a pain spike when given after it.
export const ANALGESICS=['paracetamol','metamizole','ibuprofen','lidocaineSpray','morphine','fentanyl','ketamine'];
