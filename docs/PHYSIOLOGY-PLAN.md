# Plan: fizjologia w realnych jednostkach

Cel: zamienić abstrakcyjne punkty (`g.blood`, `g.oxygen` 0–100, presety `bleed`/`oxygenLoss`) na symulację opartą na danych referencyjnych. Wartości oznaczone **R** — zakresy podręcznikowe; **G** — strojenie gry. Teksty w UI bez dawkowania (gra, nie instruktaż).

## Stan

- `g.profile`: `sex`, `ageY`, `massKg` (M 65–95, K 52–80), `heightCm`, `ebvMl` (70 mL/kg M, 65 K), `hb0` (15/13,5 g/dL). Losowane w `createGame` *po* istniejących wywołaniach `random`, żeby nie przesunąć seedów.
- `g.phys`: `lostMl`, `bloodMl`, `hbMassG`, `crystIvMl`, `plasmaDeficitMl`; krążenie `hr`, `svrIdx`, `map`, `sv` (z opóźnieniem); oddychanie `fio2`, `vaFrac`, `paco2`, `pao2`, `shunt`, `aaExtra`, `rr`; `tempC`, `envC`, `wet`, `insulation`; `gcs`, `icpMmHg`; `glucose` (mmol/L), `lactate`, `pHproxy`; `coag` 0–1; `reserve` 0–1; `o2:{device,flowLpm,litersLeft}`; czujniki `spo2Shown`, `nibp`.
- Krok 1 s, wygładzanie wykładnicze `x += (target−x)(1−e^(−1/τ))`, τ ≥ 5 s. Szum deterministyczny (hash seed+elapsed), bez `Math.random` w ticku.

### Krążenie
Preload p = Veff/EBV; SV = SV0·clamp((p−.35)/.65)^0.8; baroreflex HR = HR0(1+k₁e), SVR = SVR0(1+k₂e), e = (MAPset−MAP)/MAPset, cap 1,6; MAP = CO·SVR; SBP = MAP+⅔PP, DBP = MAP−⅓PP. Stałe w `CV_TUNING`, kalibrowane testem do tabeli ATLS:

| Klasa | % EBV | HR | SBP | RR | Świadomość |
|---|---|---|---|---|---|
| I | <15 | <100 | norma | 14–20 | lekki niepokój |
| II | 15–30 | 100–120 | norma | 20–30 | niepokój |
| III | 30–40 | 120–140 | ~70–90 | 30–40 | splątanie |
| IV | >40 | >140 | <70 | >35 | letarg |

Krystaloid: tylko objętość (rozcieńcza Hb i krzepliwość), redystrybucja do ~25% w wewnątrznaczyniowej, τ ≈ 20 min (R).

### Utlenowanie
PAO2 = FiO2·713 − PaCO2/0,8; PaCO2 = 40/vaFrac; saturacja Severinghaus `100/(1+23400/(P³+150P))` (PaO2 60→90%, 40→75%, 27→50%); przeciek Qs ogranicza SpO2 niezależnie od tlenu. FiO2: powietrze .21, kaniula .24–.44, maska prosta .35–.55, maska z rezerwuarem 15 L/min ~.7, BVM z tlenem ~.9.

### Temperatura, metabolizm, świadomość
- dT/dt = (Qmet − Qloss)/(m·3,47 kJ/kg/°C); Qloss ∝ BSA·(33−envC)·(1+3·wet)·(1−insulation); koc insulation .65; zimne płyny 4,18 kJ/L/°C. Progi: 32–35 łagodna, 28–32 umiarkowana, <28 VF.
- Glukoza: <3,9 hipo, <3,0 neuroglikopenia, <2,2 śpiączka. Mleczany >4 = wstrząs; pH ≈ 7,40 − 0,03(lac−1).
- GCS = 15 − max(składników: perfuzja, hipoksja, hiperkapnia, glukoza, leki, temperatura, ICP, uraz). AVPU: A ≥14, V 12–13, P 9–11, U ≤8. GCS ≤8 bez udrożnienia → niedrożność (vaFrac×.4).
- Krzepliwość: rozcieńczenie × temperatura (−10%/°C poniżej 36) × kwasica × zużycie (>30% utraty) — triada śmierci.

## Dane urazów (`src/content/injury-physiology.js`)

Pola: `vessel`, `rate` (mL/min przy MAP 90), `pExp` (zależność od ciśnienia), `internal:{capMl,tauMin}`, `resp`, `tbsa`, `gcs`, `plasmaLeak`, `pain`. Faza 1 używa przelicznika legacy (pkt/s × 1575 ≈ mL/min dla 75 kg), faza 4 tabeli realnej:

| id | typ | mL/min | inne |
|---|---|---|---|
| gunshot | mieszane | 60 | — |
| arterial | tętnicze | 300 | brak skrzepu przy MAP>60 |
| openFracture | żylne+kość | 25 | ukryta utrata wg segmentu |
| fracture | kość | 0 | ukryta utrata wg segmentu |
| internal | narząd miąższowy | 40, pExp 1,2 | tylko szybki transport |
| chestWound | odma otwarta | 12 + 15 wewn. | odma → .7 (τ 3 min) bez opatrunku; przeciek .35·ptx |
| obstruction | drogi oddechowe | 0 | vaFrac .25 do udrożnienia |
| asthma | skurcz oskrzeli | 0 | aa +25, vaFrac .7, zmęczenie |
| laceration / puncture / abrasion | żylne/kapilarne | 40 / 20 / 5 | otarcie krzepnie samo |
| avulsion / shrapnel / glassEmbedded | mieszane | 90 / 35 / 30 | — |
| scalpCut / noseBleed / biteWound | — | 30 / 10 / 25 | — |
| thermalBurn / chemicalBurn / flashBurn / electricalBurn | oparzenie | 0 | %TBSA, ucieczka osocza, utrata ciepła; chemiczne rośnie do płukania; elektryczne → ryzyko VF |
| crushInjury / thighHematoma | mięśnie | 20 / 15 wewn. | cap 1500 / 800 mL |
| ribFracture / lungContusion | klatka | 0 | ból ogranicza oddech / przeciek rośnie |
| smokeExposure / aspiration | oddechowe | 0 | aa +15 / vaFrac .4 do odessania |
| allergicReaction | anafilaksja | 0 | SVR×.7, przeciek osocza 30 mL/min, skurcz oskrzeli |
| hypoglycemia / dehydration / heatExhaustion | metaboliczne | 0 | glukoza 2,7 / deficyt 8% / 38,8 °C |
| amputationHand / Forearm / Foot / Shin | kikut tętniczy | 120 / 180 / 140 / 250 | tylko staza powyżej |
| partialAmputation | palce | 25 | — |

Ukryta utrata przy złamaniu (R): udo 1000–1500 (1200), podudzie 750, ramię 600, przedramię 350, dłoń/stopa 100, miednica 2000, żebra 250; τ 30 min.

Interwencje (frakcja pozostała): opatrunek .18 (tętnicze .55, kikut .85), tamponada `.05+.45(1−q)`, staza `1−q`, opatrunek wentylowy `1−q` dla odmy, szyna × .6 ukrytej utraty, pas miednicy × .7.

Skrzep (faza 4): rośnie przy przepływie < 30 mL/min (τ 4 min żylne, 8 min tętnicze); wzrost MAP ponad próg skrzepu → ponowne krwawienie (hipotensja permisywna).

## Leczenie
- Płyn = worek 500 mL, ~100 mL/min × wydajność wenflonu; chłodzi, rozcieńcza, może zerwać skrzep.
- Tlen: butla 150 L, maska 15 L/min (10 min jak dziś). BVM leczy hipowentylację, nie przeciek.
- Leki: model PK/PD (depot → osocze → miejsce działania, krzywa Emax), kumulacja powtórzeń zamiast kar. Drogi: IV ~30 s, IM 3–5 min, wziewnie ~5 min, doustnie 20–40 min. Nalokson przestaje działać przed opioidem; hydrokortyzon działa po godzinach; alergia tworzy uraz anafilaktyczny; RKO u pacjenta z tętnem → złamanie żeber.

## Zgon i wynik
Zatrzymanie gdy: `reserve` = 0 (podaż dla serca DBP/70 × CaO2), SpO2 < 50 przez 30 s, MAP < 35 przez 20 s lub < 28 °C (VF). Rytm: hipowolemia/hipoksja → PEA; hipotermia/porażenie → VF (AED tylko VF). Budżet 180 s jak dziś; ROSC po usunięciu przyczyn odwracalnych.

## Integracja
- Nowe moduły: `content/physiology-data.js`, `content/injury-physiology.js`, `simulation/physio-model.js` (+ `physio-circulation`, `-respiration`, `-thermal`, `-pharmacology`, `-hemostasis`, `-neuro`, `-sensors`, `-migrate`).
- API `act` / `advanceTime` / `createGame` / `restoreGame` i kontrakty procedur bez zmian. `circulation(g)` staje się pochodnym indeksem perfuzji. Lustra `g.blood`/`g.oxygen` do fazy 4.
- Zapis: `version: 3`, migracja z v2 (`lostMl = (100−blood)·0,005·EBV`, PaO2 z odwrócenia Severinghausa, leki → dawki, wlewy → mL).
- Protokół/stany czytają tylko `clinicalSnapshot(g)`, konsekwencje przez `applyInsult(g, …)`.
- Ocena: część „Stan przy przekazaniu” = perfuzja (indeks wstrząsowy), utlenowanie, temperatura/GCS/mleczany.
- Testy: `referenceCare(g)` w `tests/support.js`; każdy scenariusz ratowalny przy 25 min (ciężki/lekki pacjent × normalny/trudny); test kalibracji ATLS; perf: 20 000 ticków < 250 ms.

## Fazy

| Faza | Zakres | Stan |
|---|---|---|
| P0 | Szwy bez zmiany zachowania: `clinicalSnapshot`, `applyInsult`, `referenceCare`, test wydajności, indeks przedmiotów `Map`. | **zrobione** |
| P1 | Krążenie w mL: profil/EBV, Hb, baroreflex, HR/BP z modelu, płyny w mL, zatrzymanie z `reserve`, migracja v2→v3. | **zrobione** (szczegóły i odstępstwa niżej) |
| P2 | Utlenowanie i wentylacja: FiO2, PaCO2, przeciek, Severinghaus, drogi oddechowe, GCS (hipoksja, perfuzja). | **zrobione** (szczegóły i odstępstwa niżej) |
| P3 | Leki PK/PD, bilans cieplny i środowisko, glukoza mmol/L, pełne GCS/AVPU. | **zrobione** (szczegóły i odstępstwa niżej) |
| P4 | Triada śmierci, skrzep i ponowne krwawienie, realne tempa krwawień, oparzenia %TBSA, opcjonalnie TBI/ICP, odma prężna, NIBP co 3 min, nowa ocena, usunięcie luster. | **zrobione** (bez części opcjonalnej; szczegóły i odstępstwa niżej) |

### Realizacja P0/P1 — odstępstwa od szkicu

- Baroreflex HR jest nasycający: HR = HR0 + (155 − HR0)·tanh(e/0,2) zamiast liniowego z limitem 1,6 (liniowy nie trafia jednocześnie w klasy II i IV). SV = SV0·((p − 0,4)/0,6)^1,3, PP ∝ √SV. Wynik kalibracji (75 kg, po ustaleniu): 10% → HR 83, 114/74; 22% → 102, 106/72; 35% → 130, 91/66; 45% → 153, 63/44.
- `reserve` w P1 = DBP/70 × Hb/Hb0 (bez SpO₂ — utlenowanie wchodzi w P2; do tego czasu zatrzymanie hipoksyjne zostaje przy dawnym progu tlenu ≤ 38). Próg 0,85, pełny spadek w 40 s przy zerowej podaży. Nieleczone krwawienie zatrzymuje krążenie przy ~44–49% EBV.
- Limity ukrytej utraty ze złamań i krwiaków skalują się z EBV jak tempa (profil nie zmienia przebiegu w %).
- Losowi pacjenci są mężczyznami (imiona w opisie są męskie; zmiana opisu złamałaby zgodność seedów); kobiety przez `options.profile`.
- Wsparcie krążenia z leków/pakietów (dawne punkty) działa jak objętość wirtualna do P3.
- Strain hipoksji (dawne −0,08 pkt/s przy tlenie < 60) trafia do `plasmaDeficitMl`, nie do utraty krwi.
- Ocena: sprzęt i szybkość wezwania liczą się tylko przy przekazaniu żywego pacjenta z ≥ 12,5/25 pkt stanu **i** niezerową perfuzją oraz SpO₂ (sam warunek połowy przepuszczał niewyrównany wstrząs z dobrą SpO₂ i temperaturą na ~89 pkt).
- Balans do przejrzenia w P4: próg zatrzymania przesunął się z dawnych 40% do ~44–49% EBV, więc nieleczona rana szarpana (`forestSaw`, tylko wezwanie ewakuacji) dożywa dziś przekazania przy ~42% utraty (wynik ~54, C); amputacje, tętnicze i drogi oddechowe nadal przegrywają bez leczenia.

### Realizacja P2 — odstępstwa od szkicu

- Moduł `simulation/physio-respiration.js`; GCS (`gcsOf`) mieszka w nim do P3 (plan: `physio-neuro`) i nie jest zapisywany w `g.phys` — liczy się na bieżąco z SaO2, PaCO2, MAP/utraty i flag urazów. Zamiast `spo2Shown` jako jedynej saturacji: `sao2` (prawdziwa, z opóźnieniem magazynu) + `spo2Shown` (odczyt, τ 6 s); `g.oxygen` = SaO2·100. `pao2` = odwrócony Severinghaus z SaO2 (przy wysokim FiO2 nasyca się ~200 mmHg — tylko do odczytu).
- Wartości z tabeli planu (np. niedrożność vaFrac .25, astma aa +25, dym aa +15) dają w ±4 SpO2 startowe scenariuszy tylko jako stan *docelowy*. Urazy mają więc składowe `[początek, pełny postęp]` z τ: niedrożność .524 → .25 (τ 4 min), zachłyśnięcie .625 → .4 (τ 5 min), otwarta rana klatki przeciek .126 → .33 + aa 12,6 → 17 + va .81 → .75 (τ 3 min, odma jako ogólny postęp; opatrunek wentylowy q mnoży składowe przez 1 − q i cofa postęp do 1 − q), astma va .714 → .43, aa 25,5 → 30 (zmęczenie τ 30 min, nie szybciej — inaczej jedna porcja salbutamolu bez tlenu nie dożywa 25 min), dym aa 35 → 40 (scenariusze 87 i 94 z tym samym urazem → środek 90,5), stłuczenie płuca przeciek .167 → .21. Hipoglikemia/odwodnienie/wyczerpanie cieplne/udar cieplny/CO dostały tylko gradient A–a, żeby utrzymać ich dawne SpO2 (proxy, bez uzasadnienia płucnego). Pełna tabela: `RESPIRATORY` w `content/injury-physiology.js`.
- Tkanki miękkie przy GCS ≤ 8: ×0,4 przy GCS 3 rosnące do ×0,7 przy GCS 8 (płaskie ×0,4 dawało natychmiastową spiralę śmierci przy pierwszym spadku SpO2 < 65), stosowane tylko bez urazu z tagiem `airway` (ten już opisuje niedrożność). Urazy z flagą `unconscious` (nie tylko przy tworzeniu gry, także po `worsen`) i stan `initialUnconscious` dają GCS 6 do udrożnienia — dawna reguła.
- Pasma hipoksji GCS: ≥ 85 % 0, 80–85 −1, 75–80 −2, 70–75 −3, 65–70 −5, 60–65 −7, 50–60 −9, < 50 −11 (SpO2 84 przy astmie nie blokuje drogi doustnej, < 65 = nieprzytomny jak dawniej). Hiperkapnia (PaCO2 − 55)/6, perfuzja: klasa III −2, IV −4, MAP < 55 −5, < 45 −7.
- Magazyn tlenu: wzrost zawsze τ 20 s, spadek τ 20 s → 90 s zależnie od wcześniejszego FiO2 (`storeFio2`, τ 60 s). PaCO2 τ 20 s. Mieszanie: Sv z równania Ficka w postaci zamkniętej, Sv ≥ 0,15; mały składnik rozpuszczonego O2 sprawia, że tlen podnosi saturację przy przecieku 35% o ~8 pkt (nie leczy go), a przy luce V/Q do ~100%.
- Konsekwencje „tlen −N” (protokół, alergia): SaO2 −N od razu + dług desaturacji N pkt odejmowany od celu (o połowę mniejszy przy wysokim FiO2), wygasa τ 30 min. Wariant w mmHg gradientu A–a był nieliniowy: na stromej części krzywej −10 pkt zabijało w 1–2 min.
- `reserve` zawiera SaO2: podaż × min(1, SaO2/0,96). Astma nie umiera już przy opiece referencyjnej — dzięki modelowi astmy (salbutamol cofa zmęczenie), nie przez pominięcie. Dawny strain hipoksji (deficyt osocza przy SpO2 < 60) zostaje.
- RR = (16 + 0,6·ból + odruchy·d²)·d³, odruchy = hipoksja (92 − SpO2)·0,45 + hiperkapnia (PaCO2 − 42)·0,2 + 14·(1 − wentylacja mechaniczna) + wstrząs 45·(utrata − 0,12) (zastępczo za kwasicę, mleczany w P3), d = depresja ośrodkowa (opioidy: uraz `opioidOverdose` i `respiratoryBurden` leków, nalokson przez `reliefTag:'opioid'`). Zatrucie opioidem: RR ~6–8.
- `oxygenLoss` w `injuries.js` zostaje jako znacznik urazu oddechowego (polityki testowe podają przy nim tlen); tick go nie używa, walidacja wymaga wpisu `resp` dla każdego takiego urazu.
- Naprawiony błąd protokołu: `oxygenGiven` był spełniony w sekundzie 0 (`ventilatingUntil` 0 ≥ `elapsed` 0), przez co pominięcie tlenu w `cabinGas` nie miało skutku.
- Zatrzymanie bez RKO: bezdech (vaFrac 0,05), CO 0,02; RKO z wentylacją = BVM, CO 0,3 × jakość RKO. Zatrucie CO bez COHb (odczyt fałszywie prawidłowy kłóciłby się z kalibracją `cabinGas` 90) — odłożone. Sensory (NIBP co 3 min, artefakty) — P4.
- Kalibracja (SpO2 po 60 s bez leczenia vs pole `oxygen`): chest 88,5/87, multiStab 88,5/90, airway 79,3/80, asthma 84,2/84, stairChest 92,3/91, roofDebris 92,3/92, ditchRider 92,3/93, bikeBarrier 89,6/89, shedSmoke 90,6/87, bakeryOven 90,9/94, pondRescue 82,7/83, picnicAllergy 89,6/88, festivalFaint 92,3/91, courierChest 91,3/91, cabinGas 90,1/90, stationToilet 79,6/80, busSeizure 85,9/86, siteHeat 93,1/93; scenariusze bez urazu oddechowego ~98 (cele 95–98).

### Realizacja P3 — odstępstwa od szkicu

- Moduły `simulation/physio-pharmacology.js`, `-thermal.js`, `-neuro.js` (GCS przeniesione z `-respiration`, re-eksport). Model leku analityczny w czasie (Bateman + miejsce działania ke0, trójwykładniczy), więc zapis trzyma tylko listę dawek `{id, at, amount, route, site}`; poziom jest normalizowany tak, że jedna porcja ma szczyt 1, a kanały bez jawnego `emax` dają w szczycie jednej porcji dawną wartość przedmiotu (balans P2 zachowany dla pojedynczego podania). Okresy półtrwania są skompresowane (G), żeby różnice wypadały w czasie wezwania: szczyt (min) IV fentanyl ~10, morfina ~42 (ke0 10 min), IM adrenalina ~11, nalokson ~13, wziewnie salbutamol ~34, doustnie ~77 (opóźnienie 8 min + wchłanianie t½ 12 min; aktywny od ~15 min); aktywność (> 10% Emax): fentanyl do ~87 min, nalokson ~91, adrenalina ~56, ketamina ~42, morfina > 4 h. Hydrokortyzon: opóźnienie 90 min (efekt genomowy jako `lagS`) — w 25 min zero.
- Kumulacja zamiast kary: depresja oddechu (EC50 2,2 porcji, n 2) i sedacja (morfina Emax 7 pkt GCS, EC50 2,6, n 3) są progowe, analgezja nasycona (EC50 0,35) — trzy porcje morfiny po 30 min: RR ~6–7, PaCO2 ~+10, GCS ≤ 12; jedna: GCS ≥ 14, RR ~10. Dawny mnożnik ×3,3 „przy słabym krążeniu” zastąpiony ciągłym czynnikiem wstrząsu (poziom × 1 + 1,5·s). TXA: kanał `bleeding` EC50 0,15 — druga porcja dodaje < 5%. Kanał „HR/SVR” zrealizowany przez `pulseIncrease` i objętość wirtualną (`circulationSupport`) jak w P1, a SVR wprost tylko dla anafilaksji (`CIRCULATORY`: przeciek osocza 30/25 mL/min, SVR × 0,7/0,75, zatrzymywane przez ulgę adrenaliny). Bronchodylatacja nie działa na komponent oddechowy anafilaksji (tylko tag `bronchospasm`) — odłożone.
- Zignorowana alergia: uraz `allergicReaction` o skali 0,5 × dostarczenie, narastający 5 min (`rampS`); pełna skala u astmatyka (SpO2 84) zabijała w < 4 min. RKO z tętnem: jeden uraz `ribFracture` (ból 8, `painVa`, ukryta utrata 250 mL).
- `g.temperature` pozostało polem temperatury głębokiej (zapis, ocena, protokół), zamiast `phys.tempC`; środowisko w `phys.env` (z `scenario.environment`, domyślnie 18 °C sucho — każdy scenariusz i stan inline dostał własne). h = 3 W/m²K (G) dobrane tak, by mokry pacjent na wietrze tracił ~1,5–2 °C/25 min jak dawny tag `cold`, a zdrowy w 20 °C był w równowadze. Do planu dodano pocenie (60 W/°C > 37,2 °C, brak przy udarze cieplnym) — bez niego wyczerpanie cieplne tylko rosło. Oparzenia: 10 W na uraz (brak %TBSA do P4). Wyniki (25 min, bez/z kocem): wiata −4 °C 35,4 → 33,9 / 35,5; nabrzeże 10 °C mokro 36,7 → 35,3 / 36,5; udar cieplny 40,1 → 41,5, z matą 41,0 (mata −120 W na 7 min to mało — zgodnie z planem).
- Glukoza: brak hiperglikemii stresowej (opcjonalne — odłożone). Pasmo 2,5–3,0 daje tylko −1 GCS, żeby hipoglikemia 2,7 (GCS 14) dalej pozwalała na żel doustny; spadek ku 2,2 z τ 60 min nie zamyka tego okna w czasie wezwania.
- GCS: deficyty urazów `NEURO_INJURY` — stan po napadzie 4 → 0 (τ 15 min, liczony od udrożnienia), uraz głowy i objawy udaru −1 (GCS 14 blokuje drogę doustną — zamierzone). Upał: > 40 °C −3, > 41 −5, > 42 −8; zimno: < 34 −1 … < 28 −9.
- Rytmy: VF przy < 28 °C lub urazie elektrycznym, asystolia przy hipoksji, PEA przy pozostałych. ROSC w VF tylko po AED przy > 30 °C; bradykardia hipotermiczna i krzepliwość zależna od temperatury — P4.
- Polityka referencyjna: blanket zawsze, pakiet przy `cold`, mata przy `heat`, glukoza, nalokson, adrenalina (powtórzona, gdy przestaje działać), bronchodilatator powtarzany tylko gdy przestał działać. Wszystkie scenariusze i stany przeżywają (ciężki/lekki × normalny/trudny; najgłębsza utrata 0,28 EBV — `gunshot`/`legGunshot` trudny), zaniedbania nadal przegrywają. Test wydajności ~190 ms / 20 000 ticków (było ~160–180).

### Realizacja P4 — odstępstwa od szkicu

- Moduły `simulation/physio-hemostasis.js` (mleczany, pH, `coag`, skrzep rany) i `simulation/physio-sensors.js` (NIBP, sygnał pulsoksymetru); oparzenia w `physio-thermal.js` (bez osobnego modułu). Stałe: `HEMOSTASIS`, `METABOLIC`, `SENSORS`, `TBSA`, `BURN_TUNING` w `content/physiology-data.js`, `BURNS` w `content/injury-physiology.js`.
- Tempa: tabela realna z „Dane urazów” bez zmian, `TUNING.bleedScale` = 1 (marginesy referencyjnej opieki wystarczyły; żaden scenariusz nie ma wyjątku). Dodatkowo: ukryta rana kłuta klatki 9, krwiak uda 15 (cap 800), stłuczenie płuca 0. Odma otwarta: tylko 12 mL/min zewnętrznie — składowa „15 wewn.” pominięta (nieuszczelnialna utrata zmieniałaby balans scenariuszy klatki). Pola `bleed`/`oxygenLoss` usunięte z `injuries.js`; uraz oddechowy = wpis w `RESPIRATORY`.
- Skrzep: zgodnie ze szkicem (< 30 mL/min, τ 4/8 min, kapilarne τ 5 min przy coag > 0,7), plus reguła z tabeli „tętnicze bez skrzepu przy MAP > 60” i wypłukiwanie miękkiego skrzepu przy dużym przepływie (τ 4 min). Skrzep zmniejsza przepływ dopiero, gdy trzyma (≥ 0,8). Próg ponownego krwawienia MAP(powstania) + 15·skrzep: w praktyce zrywa go litr płynu u pacjenta w głębokim wstrząsie (~40% utraty), a nie u wyrównanego — o to chodzi w hipotensji permisywnej.
- Koagulopatia mnoży każde krwawiące źródło (także wewnętrzne i ukryte złamaniowe) przez 1 + (1 − coag). TXA i ibuprofen zostają mnożnikami krwawienia (kanał `bleeding`), a TXA dodatkowo przyspiesza wzrost skrzepu × (1 + 2·efekt) — to jego „antyfibrynoliza”; osobnej zmiennej fibrynolizy nie ma.
- Mleczany: produkcja 0,6 mmol/l/min × (0,6 − podaż)/0,6 poniżej progu 60% podaży (model krążenia przekracza próg dopiero w klasie III/IV, więc mleczany > 4 pojawiają się przy ~45% utraty), +0,01 mmol/l/min na stazę; start 1 + 6·(utrata − 15%). pH zawiera składnik oddechowy (−0,008/mmHg PaCO₂). RR nadal używa zastępczego członu wstrząsu z P2 (mleczany nie zmieniają oddechu — RR nie wpływa na PaCO₂ w modelu).
- Oparzenia %TBSA (reguła dziewiątek rozpisana na segmenty, suma 100): głowa 3,5, twarz 3,5, szyja 2, klatka 9, brzuch 6, miednica 4 (z kroczem), plecy 18; ręka 9 = bark 1, ramię 2,5, łokieć 0,5, przedramię 2, nadgarstek 0,5, dłoń 2,5; noga 18 = biodro 1,5, udo 8, kolano 1, podudzie 5, kostka 0,5, stopa 2. Udział segmentu: termiczne 0,6, błyskiem 0,5 (powierzchowne, ucieczka × 0,4), elektryczne 0,05, chemiczne 0,3 → 0,9 (τ 10 min do płukania). Ucieczka 4 mL/kg/%/dobę × 1,5 (faza wczesna), parowanie 2 W/% (okryte × 0,6) — realne wartości są małe przy oparzeniach scenariuszy (1–5% TBSA), więc oparzenia nie zagrażają krążeniu w czasie wezwania (dawniej 10 W na uraz i 2–5 mL/min „krwawienia”).
- PK (przegląd P3): morfina ke0 t½ 3 min → szczyt IV ~17 min; fentanyl t½ eliminacji 10 min → aktywny ~50 min (szczyt ~8 min); salbutamol t½ 60 min → szczyt ~23 min, aktywny ~4 h; adrenalina IM ~11 min bez zmian. Normalizacja „jedna porcja = szczyt 1” zachowuje balans pojedynczego podania; kumulacja morfiny jest teraz bliżej nasycenia (test kumulacji × 2 zamiast × 2,5).
- Odroczenia P3: adrenalina kanałem `svr` (emax 0,35) zamiast objętości wirtualnej (`circulationSupport` usunięte z przedmiotu; nawadnianie doustne nadal jako objętość), ketamina `svr` 0,12, ból SVR × (1 + 0,006·ból); bradykardia hipotermiczna −7%/°C poniżej 35,5 °C (zakres odruchu HR skaluje się razem); hiperglikemia stresowa +2 mmol/l × stres (utrata > 10% lub ból > 4); bronchodilatator łagodzi do 60% składowej wentylacyjnej anafilaksji. Parowanie oparzeń jak wyżej.
- Pas miednicy tylko na `pelvis` (także złamanie miednicy — ukryta utrata × 0,7); w stanie `calmDriver` (krwawienie z brzucha) krok „Ograniczenie krwawienia wewnętrznego” wymienia teraz najpierw TXA (`itemAny: ['txa','pelvicBinder']`), a polityki testowe zakładają wenflon przed lekiem IV.
- Czujniki: NIBP co 180 s od początku gry (monitor jest domyślnie podłączony), sonda SpO₂ na prawej dłoni; brak sygnału także w zatrzymaniu krążenia. `vitals.oxygen` zostało liczbą (ostatnia ważna), a wyświetlany odczyt to `vitals.spo2`.
- Ocena: urazy wtórne jako iloczyn temperatura × GCS × mleczany (połowa przy GCS ≤ 8 i mleczanach ≥ 6), żeby wychłodzenie nadal zabierało pełne 7,5 pkt. Bramka zaniedbania (połowa punktów + niezerowa perfuzja i SpO₂) bez zmian.
- Balans: nieleczona rana szarpana (`forestSaw`) i postrzał umierają teraz przed przyjazdem (dopisane do testu zaniedbań); spakowany kikut dłoni bez stazy dożywa przekazania, ale w klasie IV (~47% utraty) — test „sam opatrunek nie ratuje amputacji” przyjmuje zgon albo utratę > 40%. Referencyjna opieka: wszystkie scenariusze i stany przeżywają, najgłębsza utrata przy przekazaniu 0,31 EBV (`fall`/`slopeFall` trudny), SpO₂ ≥ 90 przy przekazaniu (polityka oszczędza drugą butlę do spadku SpO₂ < 92; postęp stłuczenia płuca, dymu i CO złagodzony: przeciek .19, aa 23 / 37 / 38 — wartości początkowe i kalibracja 60 s bez zmian). Wydajność ~230 ms / 20 000 ticków.
- Nie zrobione (opcjonalne): odma prężna z przedmiotem „Odbarczenie odmy (gra)” — wymaga nowej treści scenariusza i zmiany polityk, inaczej mechanika byłaby martwa albo zabijałaby referencyjną opiekę przy uszczelnionych ranach; TBI z ICP/Cushingiem — `headBleedSevere` i stany neurologiczne są skalibrowane na protokół, a odruch Cushinga podnosiłby MAP i zrywał skrzepy (do zestrojenia razem); COHb z fałszywie prawidłowym pulsoksymetrem — kłóci się z kalibracją `cabinGas` (odczyt 90) z P2, brak celu kalibracji.
