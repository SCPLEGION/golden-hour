// Patient states: the player picks a category, the state inside it is random.
// `scenario` is an existing scenario id or an inline record shaped like scenarios.js (its id is the condition id).
// `protocol` steps are declarative: `check` is evaluated by simulation/protocol.js, `deadline` is in game
// seconds (scaled by difficulty.deadlineMultiplier) and `consequence` is applied once when the deadline passes
// without the check. Values are game balance and fiction, not clinical guidance.
export const CATEGORIES = [
  {id:'drobne',name:'Drobne urazy',description:'Skręcenia, rany cięte, pogryzienia i podrażnienia. Mało czasu na błąd w kolejności, ale bez nagłej utraty życia.'},
  {id:'zewnetrzne',name:'Poważne obrażenia zewnętrzne',description:'Krwotoki, amputacje, rany postrzałowe i kłute. Liczy się pierwsza minuta i skuteczne zatrzymanie krwawienia.'},
  {id:'zagadka',name:'Zagadka diagnostyczna',description:'Opis zdarzenia może mylić. Prawdziwa przyczyna jest ukryta, dopóki nie zbadasz właściwego miejsca lub nie zbierzesz wywiadu.'},
  {id:'medyczne',name:'Stany nagłe medyczne',description:'Duszność, reakcje alergiczne, zatrucia i zaburzenia świadomości bez typowego urazu.'},
  {id:'srodowisko',name:'Środowisko i wypadki',description:'Zimno, upał, woda, prąd, dym, chemikalia i wypadki przy pracy.'},
  {id:'mieszane',name:'Wielomiejscowe / mieszane',description:'Kilka urazów naraz konkurujących o czas i sprzęt. Trzeba ustalić priorytety.'}
];
export const RANDOM_CATEGORY = {id:'losowa',name:'Losowa',description:'Dowolny stan z dowolnej kategorii.'};
export const SEVERITIES = {lekki:'Lekki',poważny:'Poważny',krytyczny:'Krytyczny'};
const T = 'tourniquet';
export const CONDITIONS = [
  // Drobne urazy
  {id:'ankleTrail',category:'drobne',name:'Skręcona kostka i odwodnienie',severity:'lekki',scenario:'trailTwist',protocol:[
    {id:'examineAnkle',label:'Badanie stopy i kostki',check:{examined:['leftFoot','leftAnkle']},deadline:240,consequence:{pain:2}},
    {id:'hydrate',label:'Nawodnienie doustne',check:{item:'oralRehydration'},deadline:600,consequence:{blood:-4}}]},
  {id:'kneeSport',category:'drobne',name:'Skręcenie kolana',severity:'lekki',scenario:{title:'Kolano na hali sportowej',scene:'Mecz siatkówki przerwano. Zawodnik siedzi przy linii boiska i trzyma się za kolano.',quote:'„Przy lądowaniu coś przeskoczyło w kolanie.”',history:'Nieszczęśliwe lądowanie po bloku. Bez chorób i alergii. Wcześniej nie miał urazów kolana.',injuries:[['rightKnee','sprain'],['leftHand','abrasion']],blood:98,oxygen:98,lesson:'Uraz stawu bez krwawienia też wymaga oceny i podparcia. Badanie wyklucza poważniejszy uraz, a odciążenie i chłodzenie zmniejszają ból.'},protocol:[
    {id:'examineKnee',label:'Badanie kolana',check:{examined:'rightKnee'},deadline:240,consequence:{pain:2}},
    {id:'supportKnee',label:'Podparcie lub chłodzenie stawu',check:{itemAny:['elasticWrap','legBrace','coldCompress']},deadline:420,consequence:{pain:2}}]},
  {id:'glassCut',category:'drobne',name:'Rana cięta przedramienia',severity:'lekki',scenario:'glassDoor',protocol:[
    {id:'dressCut',label:'Zabezpieczenie rany ciętej',check:{treatedInjury:'laceration'},deadline:180,consequence:{blood:-6}},
    {id:'examineForearm',label:'Badanie przedramienia',check:{examined:'leftForearm'},deadline:300,consequence:{pain:1}}]},
  {id:'dogBite',category:'drobne',name:'Pogryzienie przez psa',severity:'lekki',scenario:'farmDog',protocol:[
    {id:'dressBite',label:'Zabezpieczenie rany kąsanej',check:{treatedInjury:'biteWound'},deadline:240,consequence:{blood:-5}},
    {id:'biteHistory',label:'Wywiad SAMPLE',check:{action:'history'},deadline:480,consequence:{pain:1}}]},
  {id:'marketFall',category:'drobne',name:'Krwawienie z nosa i rana ręki',severity:'lekki',scenario:'nightMarket',protocol:[
    {id:'dressHand',label:'Zabezpieczenie rany ręki',check:{treatedInjury:'laceration'},deadline:180,consequence:{blood:-6}},
    {id:'noseCare',label:'Opanowanie krwawienia z nosa',check:{treatedInjury:'noseBleed'},deadline:360,consequence:{blood:-3}}]},
  {id:'shoulderBike',category:'drobne',name:'Zwichnięcie barku',severity:'lekki',scenario:'shoulderFall',protocol:[
    {id:'examineShoulder',label:'Badanie ramienia',check:{examined:'leftUpperArm'},deadline:240,consequence:{pain:1}},
    {id:'slingShoulder',label:'Podparcie ręki temblakiem',check:{itemAny:['armSling']},deadline:300,consequence:{pain:2}}]},
  {id:'eyeDust',category:'drobne',name:'Ciało obce w oku',severity:'lekki',scenario:'dustWorkshop',protocol:[
    {id:'rinseEye',label:'Płukanie oka',check:{itemAny:['eyeWashStation','salineIrrigation']},deadline:240,consequence:{pain:2}},
    {id:'dressPuncture',label:'Zabezpieczenie rany kłutej ręki',check:{treatedInjury:'puncture'},deadline:300,consequence:{blood:-4}}]},
  {id:'weldFlash',category:'drobne',name:'Błysk spawalniczy',severity:'lekki',scenario:'sparkWelding',protocol:[
    {id:'protectEye',label:'Osłona lub płukanie oka',check:{itemAny:['eyeShield','eyeWashStation']},deadline:300,consequence:{pain:2}},
    {id:'coolBurn',label:'Zabezpieczenie oparzenia ręki',check:{treatedInjury:'flashBurn'},deadline:420,consequence:{pain:2}}]},
  {id:'pitchCollision',category:'drobne',name:'Złamanie ręki i skręcona kostka',severity:'lekki',scenario:'footballPitch',protocol:[
    {id:'immobiliseArm',label:'Unieruchomienie złamanej ręki',check:{itemAny:['splint','armSling']},deadline:300,consequence:{pain:2}},
    {id:'supportAnkle',label:'Podparcie kostki',check:{itemAny:['elasticWrap','legBrace','coldCompress']},deadline:420,consequence:{pain:1}}]},
  // Poważne obrażenia zewnętrzne
  {id:'legGunshot',category:'zewnetrzne',name:'Postrzał uda ze złamaniem otwartym',severity:'poważny',scenario:'gunshot',protocol:[
    {id:'controlGunshot',label:'Kontrola krwawienia z postrzału',check:{treatedInjury:'gunshot'},deadline:120,consequence:{blood:-8}},
    {id:'splintLeg',label:'Unieruchomienie nogi',check:{item:'splint'},deadline:420,consequence:{pain:2}}]},
  {id:'arterialMachine',category:'zewnetrzne',name:'Krwotok tętniczy z uda',severity:'krytyczny',scenario:'workshop',protocol:[
    {id:'tourniquet',label:'Staza na krwawiącą kończynę',check:{itemAny:[T]},deadline:60,consequence:{blood:-12}},
    {id:'splintLeg',label:'Unieruchomienie złamania',check:{item:'splint'},deadline:480,consequence:{pain:2}}]},
  {id:'sawAvulsion',category:'zewnetrzne',name:'Rana szarpana ramienia',severity:'poważny',scenario:'forestSaw',protocol:[
    {id:'controlAvulsion',label:'Zatrzymanie krwawienia z rany szarpanej',check:{treatedInjury:'avulsion'},deadline:90,consequence:{blood:-10}},
    {id:'examineLeg',label:'Badanie drugiej kończyny',check:{examined:'leftThigh'},deadline:480,consequence:{pain:1}}]},
  {id:'pressAmputation',category:'zewnetrzne',name:'Amputacja dłoni w prasie',severity:'krytyczny',scenario:'pressHand',protocol:[
    {id:'tourniquet',label:'Staza powyżej kikuta',check:{itemAny:[T]},deadline:60,consequence:{blood:-12}}]},
  {id:'blastAmputation',category:'zewnetrzne',name:'Amputacja podudzia po wybuchu',severity:'krytyczny',scenario:'rangeBlast',protocol:[
    {id:'tourniquet',label:'Staza na udzie',check:{itemAny:[T]},deadline:45,consequence:{blood:-14}},
    {id:'shrapnelCare',label:'Zabezpieczenie rany odłamkowej',check:{treatedInjury:'shrapnel'},deadline:300,consequence:{blood:-5}}]},
  {id:'propellerAmputation',category:'zewnetrzne',name:'Amputacja stopy przez śrubę łodzi',severity:'krytyczny',scenario:'propellerFoot',protocol:[
    {id:'tourniquet',label:'Staza na podudziu',check:{itemAny:[T]},deadline:60,consequence:{blood:-12}},
    {id:'warm',label:'Ochrona przed wychłodzeniem',check:{warm:true},deadline:600,consequence:{temperature:-.8,oxygen:-3}}]},
  {id:'conveyorAmputation',category:'zewnetrzne',name:'Amputacja przedramienia na taśmociągu',severity:'krytyczny',scenario:'conveyorArm',protocol:[
    {id:'tourniquet',label:'Staza na ramieniu',check:{itemAny:[T]},deadline:45,consequence:{blood:-14}}]},
  {id:'fingerAmputation',category:'zewnetrzne',name:'Częściowa amputacja palców',severity:'poważny',scenario:'splitterFingers',protocol:[
    {id:'dressFingers',label:'Opatrunek rany palców',check:{treatedInjury:'partialAmputation'},deadline:150,consequence:{blood:-6}},
    {id:'supportWrist',label:'Podparcie nadgarstka',check:{itemAny:['elasticWrap','coldCompress','armSling']},deadline:480,consequence:{pain:1}}]},
  {id:'multiStab',category:'zewnetrzne',name:'Mnogie rany kłute',severity:'krytyczny',scenario:{title:'Bójka przed klubem',scene:'Policja rozdzieliła uczestników bójki. Ranny opiera się o ścianę i uciska bok ręką.',quote:'„Dostałem kilka razy… boli przy oddychaniu.”',history:'Kilka ciosów ostrym narzędziem. Pacjent nie zgłasza alergii ani przyjmowanych leków.',injuries:[['chest','chestWound'],['abdomen','puncture'],['leftForearm','laceration']],blood:84,oxygen:90,lesson:'Przy kilku ranach kłutych każda wymaga osobnej oceny. Rana klatki zaburzała oddech, rany brzucha i przedramienia — krążenie. Wczesne wezwanie zespołu było częścią leczenia.'},protocol:[
    {id:'sealChest',label:'Uszczelnienie rany klatki',check:{item:'seal'},deadline:120,consequence:{oxygen:-12}},
    {id:'abdomenWound',label:'Zabezpieczenie rany brzucha',check:{treatedInjury:'puncture'},deadline:240,consequence:{blood:-6}},
    {id:'forearmWound',label:'Zabezpieczenie rany przedramienia',check:{treatedInjury:'laceration'},deadline:300,consequence:{blood:-6}}]},
  {id:'embeddedGlass',category:'zewnetrzne',name:'Szkło tkwiące w nodze',severity:'poważny',scenario:'glazierYard',protocol:[
    {id:'stabiliseGlass',label:'Stabilizacja ciała obcego',check:{itemAny:['impaledSupport','protectiveRing']},deadline:240,consequence:{blood:-6}}]},
  {id:'quarryShrapnel',category:'zewnetrzne',name:'Dwie rany odłamkowe',severity:'poważny',scenario:'quarryDebris',protocol:[
    {id:'allShrapnel',label:'Zabezpieczenie obu ran odłamkowych',check:{treatedAll:'shrapnel'},deadline:240,consequence:{blood:-8}}]},
  // Zagadka diagnostyczna: misleading scene, the real cause stays hidden until the right check.
  {id:'silentHead',category:'zagadka',name:'Uraz głowy bez widocznych ran',severity:'poważny',scenario:{title:'Upadek z hulajnogi',scene:'Młody mężczyzna siedzi na krawężniku obok hulajnogi. Twierdzi, że nic mu nie jest i ma tylko otarte dłonie.',quote:'„Nic mi nie jest, tylko ręce pieką. Chcę iść do domu.”',history:'Upadek z hulajnogi bez kasku. Świadek mówi, że pacjent przez chwilę „odpłynął”. Sam tego nie pamięta i dwa razy pytał, co się stało.',injuries:[['head','headInjury'],['rightHand','abrasion'],['leftHand','abrasion']],blood:97,oxygen:97,lesson:'Otarte dłonie były najmniej ważne. Uderzenie głową bez kasku, chwilowa utrata przytomności i powtarzane pytania wymagały badania głowy od razu oraz wczesnej ewakuacji.'},protocol:[
    {id:'examineHead',label:'Badanie głowy',check:{any:[{examined:'head'},{item:'pupilLight'}]},deadline:120,consequence:{worsen:{injury:'headInjury',to:'headBleedSevere'},unconscious:true}},
    {id:'earlyTransport',label:'Wczesne wezwanie ewakuacji',check:{transport:true},deadline:120,consequence:{oxygen:-8}}]},
  {id:'calmDriver',category:'zagadka',name:'Krwawienie wewnętrzne po stłuczce',severity:'krytyczny',scenario:{title:'Spokojny kierowca po stłuczce',scene:'Zderzenie dwóch aut przy niewielkiej prędkości. Kierowca wysiadł sam i chodzi przy samochodzie. Na ramieniu ma tylko zaczerwienienie od pasa.',quote:'„Nic mi nie jest, tylko pas mnie przycisnął. Trochę mi słabo.”',history:'Uderzenie bokiem; pas mocno wbił się w brzuch. Pacjent przyjmuje leki rozrzedzające krew.',injuries:[['abdomen','internal'],['leftShoulder','contusion']],blood:86,oxygen:97,lesson:'Pacjent, który chodzi o własnych siłach, może krwawić do brzucha. Badanie brzucha i wczesna ewakuacja były ważniejsze niż widoczne stłuczenie barku.'},protocol:[
    {id:'earlyTransport',label:'Wczesne wezwanie ewakuacji',check:{transport:true},deadline:90,consequence:{blood:-6}},
    {id:'examineAbdomen',label:'Badanie brzucha',check:{examined:['abdomen','pelvis']},deadline:150,consequence:{blood:-8}},
    {id:'limitBleeding',label:'Ograniczenie krwawienia wewnętrznego',check:{itemAny:['pelvicBinder','txa']},deadline:420,consequence:{blood:-6}}]},
  {id:'courierChest',category:'zagadka',name:'Ukryta rana kłuta klatki',severity:'krytyczny',scenario:{title:'Kurier po upadku na płot',scene:'Kurier spadł z roweru na metalowe ogrodzenie. Ma rozdarty rękaw, otarte kolano i jest bardzo zdenerwowany.',quote:'„To tylko kolano… ale jakoś nie mogę złapać powietrza.”',history:'Upadek bokiem na ogrodzenie z prętami. Kurtka przy żebrach jest rozdarta. Bez chorób i alergii.',injuries:[['chest','hiddenChestWound'],['rightKnee','abrasion'],['rightForearm','abrasion']],blood:92,oxygen:91,lesson:'Duszność nie pasowała do otarć. Rana kłuta klatki była schowana pod kurtką — dopiero badanie klatki ją ujawniło, a uszczelnienie zatrzymało pogarszanie oddechu.'},protocol:[
    {id:'examineChest',label:'Badanie klatki piersiowej',check:{any:[{examined:'chest'},{item:'stethoscope'}]},deadline:90,consequence:{oxygen:-12}},
    {id:'sealChest',label:'Uszczelnienie rany klatki',check:{item:'seal'},deadline:150,consequence:{oxygen:-10}}]},
  {id:'benchDiabetic',category:'zagadka',name:'Niski poziom glukozy',severity:'poważny',scenario:{title:'„Pijany” na przystanku',scene:'Ochrona zgłasza mężczyznę, który zatacza się przy przystanku i odpowiada bez sensu. Czuć od niego tylko gumę miętową.',quote:'„Zostaw… wszystko dobrze… gdzie autobus?”',history:'Na nadgarstku opaska informacyjna: cukrzyca. Kolega: od rana nie jadł, wcześniej długo jeździł rowerem.',injuries:[['head','hypoglycemia'],['leftElbow','abrasion']],blood:96,oxygen:94,lesson:'Zachowanie „jak po alkoholu” miało inną przyczynę. Wywiad i pomiar glukozy rozwiązywały zagadkę, a podanie glukozy, póki pacjent mógł przełykać, zatrzymało pogorszenie.'},protocol:[
    {id:'findCause',label:'Rozpoznanie przyczyny zachowania',check:{any:[{item:'glucometer'},{action:'history'}]},deadline:150,consequence:{oxygen:-6}},
    {id:'glucose',label:'Podanie glukozy',check:{item:'glucoseGel'},deadline:300,consequence:{unconscious:true,oxygen:-6}}]},
  {id:'cabinGas',category:'zagadka',name:'Zatrucie gazem z piecyka',severity:'poważny',scenario:{title:'Grypa w domku letniskowym',scene:'Mężczyzna w domku letniskowym skarży się na „grypę”: ból głowy, nudności i senność. Żona i syn też źle się czują. Wszyscy siedzą już na tarasie.',quote:'„To chyba jakiś wirus… głowa mi pęka.”',history:'Całą noc działał stary piecyk gazowy w zamkniętej łazience. Nikt nie ma gorączki; objawy słabną na świeżym powietrzu.',injuries:[['chest','coPoisoning'],['abdomen','nausea']],blood:97,oxygen:90,lesson:'Kilka chorych osób w jednym pomieszczeniu bez gorączki to wskazówka środowiskowa. Wywiad o otoczeniu ujawnił źródło, a tlen był właściwym leczeniem w modelu gry.'},protocol:[
    {id:'askSurroundings',label:'Wywiad o otoczeniu',check:{action:'history'},deadline:150,consequence:{oxygen:-6}},
    {id:'giveOxygen',label:'Tlen',check:{oxygenGiven:true},deadline:240,consequence:{oxygen:-10,unconscious:true}}]},
  {id:'checkoutSpeech',category:'zagadka',name:'Nagłe objawy neurologiczne',severity:'krytyczny',scenario:{title:'Bełkot przy kasie',scene:'Klient upuścił koszyk przy kasie i mówi niewyraźnie. Kasjerka jest pewna, że jest pijany, i chciała wezwać ochronę.',quote:'„Ja… nic… tylko ręka… dziwnie…”',history:'Żona przez telefon: objawy zaczęły się nagle kwadrans temu. Mąż nie pije alkoholu i leczy nadciśnienie. Przy upadku uderzył kolanem.',injuries:[['head','strokeSigns'],['rightKnee','contusion']],blood:97,oxygen:95,lesson:'„Pijany” klient miał nagłe objawy neurologiczne. Badanie twarzy i rąk, wykluczenie niskiej glukozy i natychmiastowe wezwanie zespołu były całym leczeniem; czas był najważniejszy.'},protocol:[
    {id:'earlyTransport',label:'Natychmiastowe wezwanie ewakuacji',check:{transport:true},deadline:120,consequence:{oxygen:-8}},
    {id:'examineHead',label:'Badanie głowy i twarzy',check:{examined:'head'},deadline:150,consequence:{worsen:{injury:'strokeSigns',to:'strokeSevere'},unconscious:true}},
    {id:'checkGlucose',label:'Pomiar glukozy',check:{item:'glucometer'},deadline:300,consequence:{oxygen:-4}}]},
  {id:'orchardLadder',category:'zagadka',name:'Uraz kręgosłupa szyjnego',severity:'poważny',scenario:{title:'Sadownik przy drabinie',scene:'Sadownik zsunął się z drabiny i usiadł pod drzewem. Chce wracać do pracy; pokazuje tylko otarte przedramię.',quote:'„Ręka trochę piecze. Kark mam sztywny, ale to od pracy.”',history:'Spadł z drabiny z wysokości około dwóch metrów i uderzył karkiem o skrzynkę. Po upadku przez chwilę mrowiły go palce obu rąk.',injuries:[['neck','spinalInjury'],['leftForearm','abrasion']],blood:97,oxygen:97,lesson:'Upadek z wysokości i mrowienie obu rąk wskazywały na uraz szyi. Badanie szyi lub wywiad ujawniał problem, a stabilizacja kołnierzem przed jakimkolwiek ruchem chroniła przed pogorszeniem.'},protocol:[
    {id:'findNeck',label:'Rozpoznanie urazu szyi',check:{any:[{examined:'neck'},{action:'history'}]},deadline:150,consequence:{pain:1}},
    {id:'collar',label:'Stabilizacja szyi kołnierzem',check:{item:'cervicalCollar'},deadline:240,consequence:{worsen:{injury:'spinalInjury',to:'spinalCordInjury'}}}]},
  {id:'festivalFaint',category:'zagadka',name:'Reakcja po ukąszeniu owada',severity:'krytyczny',scenario:{title:'Zasłabnięcie na festynie',scene:'Mężczyzna na festynie usiadł nagle na trawie. Znajomi mówią, że „zrobiło mu się słabo od upału” i podają mu wodę.',quote:'„Gorąco… coś mnie dusi w gardle…”',history:'Kilka minut temu coś ukąsiło go w szyję przy stoisku z lemoniadą. Rok temu po ukąszeniu osy miał bardzo spuchniętą rękę.',injuries:[['neck','stingAnaphylaxis'],['rightKnee','abrasion']],blood:95,oxygen:91,lesson:'Upał był fałszywym tropem. Ukąszenie w szyję i wcześniejsza silna reakcja wskazywały na reakcję alergiczną — wywiad lub badanie szyi, a potem adrenalina w modelu gry.'},protocol:[
    {id:'findCause',label:'Rozpoznanie przyczyny',check:{any:[{action:'history'},{examined:'neck'}]},deadline:120,consequence:{oxygen:-8}},
    {id:'adrenaline',label:'Adrenalina',check:{item:'adrenaline'},deadline:210,consequence:{oxygen:-12,blood:-4}}]},
  // Stany nagłe medyczne
  {id:'trailAsthma',category:'medyczne',name:'Napad astmy',severity:'poważny',scenario:'asthma',protocol:[
    {id:'bronchodilator',label:'Lek rozszerzający oskrzela',check:{itemAny:['salbutamol','ipratropium']},deadline:120,consequence:{oxygen:-10}},
    {id:'allergyHistory',label:'Wywiad o alergiach',check:{action:'history'},deadline:360,consequence:{pain:1}}]},
  {id:'picnicAnaphylaxis',category:'medyczne',name:'Ciężka reakcja alergiczna',severity:'krytyczny',scenario:'picnicAllergy',protocol:[
    {id:'history',label:'Wywiad SAMPLE',check:{action:'history'},deadline:120,consequence:{oxygen:-6}},
    {id:'adrenaline',label:'Adrenalina',check:{item:'adrenaline'},deadline:180,consequence:{oxygen:-12}}]},
  {id:'stationHypo',category:'medyczne',name:'Hipoglikemia u chorego na cukrzycę',severity:'poważny',scenario:'stationWeakness',protocol:[
    {id:'glucometer',label:'Pomiar glukozy',check:{item:'glucometer'},deadline:180,consequence:{oxygen:-6}},
    {id:'glucose',label:'Podanie glukozy',check:{item:'glucoseGel'},deadline:300,consequence:{oxygen:-8}}]},
  {id:'stationToilet',category:'medyczne',name:'Zatrucie opioidem',severity:'krytyczny',scenario:{title:'Nieprzytomny w toalecie dworca',scene:'Ochrona dworca znalazła mężczyznę leżącego w toalecie. Nie reaguje na wołanie, oddycha bardzo rzadko.',quote:'„…”',history:'Ochroniarz: obok leżała pusta strzykawka i opakowanie po tabletkach. Wywiad od pacjenta niemożliwy.',injuries:[['head','opioidOverdose'],['leftElbow','abrasion']],blood:96,oxygen:80,lesson:'Nieprzytomność z bardzo wolnym oddechem wymagała najpierw drożności i oddechu. Wąskie źrenice potwierdzały zatrucie, a antagonista był leczeniem przyczyny w modelu gry.'},protocol:[
    {id:'airway',label:'Udrożnienie dróg oddechowych',check:{airway:true},deadline:90,consequence:{oxygen:-15}},
    {id:'pupils',label:'Ocena źrenic i głowy',check:{any:[{examined:'head'},{item:'pupilLight'}]},deadline:180,consequence:{oxygen:-4}},
    {id:'naloxone',label:'Antagonista opioidu',check:{item:'naloxone'},deadline:300,consequence:{oxygen:-10}}]},
  {id:'busSeizure',category:'medyczne',name:'Stan po napadzie drgawek',severity:'poważny',scenario:{title:'Drgawki w autobusie',scene:'Pasażer miał drgawki; kierowca zatrzymał autobus. Teraz mężczyzna leży zamroczony na siedzeniach, ślini się i nie odpowiada.',quote:'„Mhm… co…”',history:'Świadek: drgawki trwały około minuty. Pacjent nosi kartę z informacją o padaczce. Przy upadku uderzył przedramieniem o poręcz.',injuries:[['head','postIctal'],['rightForearm','contusion']],blood:97,oxygen:86,lesson:'Po napadzie największym zagrożeniem były drogi oddechowe pełne śliny. Wywiad od świadka i pomiar glukozy pomagały wykluczyć inne przyczyny.'},protocol:[
    {id:'clearAirway',label:'Oczyszczenie dróg oddechowych',check:{any:[{item:'suction'},{airway:true}]},deadline:120,consequence:{oxygen:-10}},
    {id:'witness',label:'Wywiad od świadka',check:{action:'history'},deadline:360,consequence:{pain:1}},
    {id:'glucometer',label:'Pomiar glukozy',check:{item:'glucometer'},deadline:480,consequence:{oxygen:-3}}]},
  {id:'siteHeat',category:'medyczne',name:'Udar cieplny',severity:'krytyczny',scenario:{title:'Zasłabnięcie na budowie',scene:'Robotnik osunął się przy betoniarce w pełnym słońcu. Koledzy przenieśli go w cień.',quote:'„Gdzie… jestem? Zimno mi…”',history:'Kilka godzin pracy w upale w ciężkim ubraniu. Przestał się pocić godzinę temu.',injuries:[['head','heatStroke'],['rightShin','abrasion']],blood:94,oxygen:93,temperature:40.1,lesson:'Gorąca, sucha skóra i splątanie po pracy w upale to przegrzanie, a nie zwykłe zmęczenie. Pomiar temperatury i aktywne chłodzenie były kluczowe.'},protocol:[
    {id:'thermometer',label:'Pomiar temperatury',check:{item:'thermometer'},deadline:180,consequence:{temperature:.5}},
    {id:'cooling',label:'Aktywne chłodzenie',check:{item:'coolingMat'},deadline:240,consequence:{oxygen:-8,temperature:.4}}]},
  {id:'raceDehydration',category:'medyczne',name:'Odwodnienie po biegu',severity:'lekki',scenario:'longRace',protocol:[
    {id:'examineAbdomen',label:'Badanie brzucha',check:{examined:'abdomen'},deadline:300,consequence:{pain:1}},
    {id:'hydrate',label:'Nawodnienie doustne',check:{item:'oralRehydration'},deadline:480,consequence:{blood:-5}}]},
  // Środowisko i wypadki
  {id:'shelterHypothermia',category:'srodowisko',name:'Wychłodzenie i odmrożenia stóp',severity:'poważny',scenario:'winterShelter',protocol:[
    {id:'warm',label:'Ochrona przed wychłodzeniem',check:{any:[{warm:true},{item:'warmingPack'}]},deadline:180,consequence:{temperature:-.8,oxygen:-4}},
    {id:'thermometer',label:'Pomiar temperatury',check:{item:'thermometer'},deadline:240,consequence:{temperature:-.6}}]},
  {id:'pondDrowning',category:'srodowisko',name:'Podtopienie',severity:'krytyczny',scenario:'pondRescue',protocol:[
    {id:'clearAirway',label:'Oczyszczenie dróg oddechowych',check:{any:[{item:'suction'},{airway:true}]},deadline:90,consequence:{oxygen:-12}},
    {id:'warm',label:'Ochrona przed wychłodzeniem',check:{warm:true},deadline:400,consequence:{temperature:-.6,oxygen:-3}}]},
  {id:'panelElectric',category:'srodowisko',name:'Porażenie prądem',severity:'poważny',scenario:'electricalPanel',protocol:[
    {id:'vitals',label:'Pomiar parametrów',check:{any:[{action:'vitals'},{item:'monitor'}]},deadline:120,consequence:{oxygen:-5}},
    {id:'examineHead',label:'Badanie głowy',check:{examined:'head'},deadline:300,consequence:{pain:1}},
    {id:'burnCare',label:'Zabezpieczenie oparzenia',check:{treatedInjury:'electricalBurn'},deadline:420,consequence:{pain:2}}]},
  {id:'shedSmoke',category:'srodowisko',name:'Wdychanie dymu',severity:'poważny',scenario:'shedSmoke',protocol:[
    {id:'giveOxygen',label:'Tlen',check:{oxygenGiven:true},deadline:120,consequence:{oxygen:-10}},
    {id:'burnCare',label:'Zabezpieczenie oparzenia ręki',check:{treatedInjury:'thermalBurn'},deadline:360,consequence:{pain:2}}]},
  {id:'kitchenBurns',category:'srodowisko',name:'Oparzenia obu przedramion',severity:'poważny',scenario:'canteenBurn',protocol:[
    {id:'allBurns',label:'Zabezpieczenie obu oparzeń',check:{treatedAll:'thermalBurn'},deadline:300,consequence:{pain:2}},
    {id:'hydrate',label:'Nawodnienie doustne',check:{item:'oralRehydration'},deadline:600,consequence:{blood:-4}}]},
  {id:'chemicalEye',category:'srodowisko',name:'Chemikalia w oku i na skórze',severity:'poważny',scenario:'chemicalStore',protocol:[
    {id:'rinseEye',label:'Płukanie oka',check:{itemAny:['eyeWashStation','salineIrrigation']},deadline:120,consequence:{pain:2}},
    {id:'skinCare',label:'Zabezpieczenie oparzenia chemicznego',check:{treatedInjury:'chemicalBurn'},deadline:300,consequence:{pain:2}}]},
  {id:'loadingCrush',category:'srodowisko',name:'Przygniecenie uda',severity:'poważny',scenario:'loadingBay',protocol:[
    {id:'earlyTransport',label:'Wczesne wezwanie ewakuacji',check:{transport:true},deadline:120,consequence:{blood:-5}},
    {id:'examineThigh',label:'Badanie przygniecionej nogi',check:{examined:'leftThigh'},deadline:180,consequence:{blood:-6}}]},
  {id:'slopeFall',category:'srodowisko',name:'Upadek ze skarpy z krwawieniem wewnętrznym',severity:'poważny',scenario:'fall',protocol:[
    {id:'examineAbdomen',label:'Badanie brzucha',check:{examined:'abdomen'},deadline:180,consequence:{blood:-8}},
    {id:'immobiliseArm',label:'Unieruchomienie ręki',check:{itemAny:['splint','armSling']},deadline:420,consequence:{pain:2}}]},
  {id:'bakeryFlash',category:'srodowisko',name:'Buchnięcie gorąca i dym',severity:'lekki',scenario:'bakeryOven',protocol:[
    {id:'giveOxygen',label:'Tlen',check:{oxygenGiven:true},deadline:240,consequence:{oxygen:-6}},
    {id:'burnCare',label:'Zabezpieczenie oparzenia',check:{treatedInjury:'flashBurn'},deadline:360,consequence:{pain:2}}]},
  // Wielomiejscowe / mieszane
  {id:'ditchRider',category:'mieszane',name:'Motocyklista: krwotok, głowa, klatka',severity:'krytyczny',scenario:{title:'Motocyklista w rowie',scene:'Motocykl leży w rowie, silnik zgaszony. Kierowca leży na boku, kask ma pęknięty, nogawka przesiąka krwią.',quote:'„Noga… dużo krwi… głowa mi pęka.”',history:'Poślizg na zakręcie i uderzenie o słup. Bez znanych alergii.',injuries:[['leftThigh','arterial'],['head','headInjury'],['chest','ribFracture'],['rightForearm','fracture']],blood:78,oxygen:93,lesson:'Krwotok z uda był pierwszy, ale pęknięty kask i ból klatki oznaczały kolejne ukryte problemy. Po stazie trzeba było wrócić do głowy i klatki.'},protocol:[
    {id:'tourniquet',label:'Staza na udzie',check:{itemAny:[T]},deadline:60,consequence:{blood:-12}},
    {id:'examineHead',label:'Badanie głowy',check:{any:[{examined:'head'},{item:'pupilLight'}]},deadline:240,consequence:{worsen:{injury:'headInjury',to:'headBleedSevere'},unconscious:true}},
    {id:'examineChest',label:'Badanie klatki piersiowej',check:{any:[{examined:'chest'},{item:'stethoscope'}]},deadline:360,consequence:{oxygen:-6}}]},
  {id:'roofDebrisMix',category:'mieszane',name:'Odłamki, rana cięta i żebra',severity:'poważny',scenario:'roofDebris',protocol:[
    {id:'laceration',label:'Zabezpieczenie rany ciętej',check:{treatedInjury:'laceration'},deadline:180,consequence:{blood:-6}},
    {id:'shrapnel',label:'Zabezpieczenie rany odłamkowej',check:{treatedInjury:'shrapnel'},deadline:240,consequence:{blood:-6}},
    {id:'examineChest',label:'Badanie klatki piersiowej',check:{examined:'chest'},deadline:420,consequence:{oxygen:-6}}]},
  {id:'blastChest',category:'mieszane',name:'Rana klatki i postrzał ręki',severity:'krytyczny',scenario:'chest',protocol:[
    {id:'sealChest',label:'Uszczelnienie rany klatki',check:{item:'seal'},deadline:90,consequence:{oxygen:-12}},
    {id:'armWound',label:'Zabezpieczenie rany ręki',check:{treatedInjury:'gunshot'},deadline:240,consequence:{blood:-6}}]},
  {id:'barrierChest',category:'mieszane',name:'Stłuczenie płuca i otarcia',severity:'poważny',scenario:'bikeBarrier',protocol:[
    {id:'examineChest',label:'Badanie klatki piersiowej',check:{any:[{examined:'chest'},{item:'stethoscope'}]},deadline:180,consequence:{oxygen:-8}},
    {id:'giveOxygen',label:'Tlen',check:{oxygenGiven:true},deadline:300,consequence:{oxygen:-6}}]},
  {id:'skateMix',category:'mieszane',name:'Rana głowy i złamanie ręki',severity:'lekki',scenario:'skatepark',protocol:[
    {id:'scalpCut',label:'Opatrunek rany głowy',check:{treatedInjury:'scalpCut'},deadline:180,consequence:{blood:-4}},
    {id:'examineHead',label:'Badanie głowy',check:{examined:'head'},deadline:300,consequence:{pain:1}},
    {id:'immobiliseArm',label:'Unieruchomienie ręki',check:{itemAny:['splint','armSling']},deadline:360,consequence:{pain:2}}]},
  {id:'unconsciousFall',category:'mieszane',name:'Niedrożność dróg oddechowych i złamanie',severity:'krytyczny',scenario:'airway',protocol:[
    {id:'airway',label:'Udrożnienie dróg oddechowych',check:{airway:true},deadline:60,consequence:{oxygen:-12}},
    {id:'immobiliseArm',label:'Unieruchomienie ręki',check:{itemAny:['splint','armSling']},deadline:480,consequence:{pain:2}}]},
  {id:'dockMix',category:'mieszane',name:'Nudności i złamanie ręki',severity:'lekki',scenario:'dockFall',protocol:[
    {id:'immobiliseArm',label:'Unieruchomienie ręki',check:{itemAny:['splint','armSling']},deadline:300,consequence:{pain:2}},
    {id:'examineAbdomen',label:'Badanie brzucha',check:{examined:'abdomen'},deadline:420,consequence:{pain:1}}]}
];
// Inline scenarios take the condition id; existing ones are referenced by id.
export const CONDITION_SCENARIOS = CONDITIONS.filter(c=>typeof c.scenario==='object').map(c=>({id:c.id,...c.scenario}));
export const conditionById = id => CONDITIONS.find(c=>c.id===id);
export const categoryById = id => CATEGORIES.find(c=>c.id===id);
export const conditionScenarioId = c => typeof c.scenario==='string'?c.scenario:c.id;
