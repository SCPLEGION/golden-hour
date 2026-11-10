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
| P2 | Utlenowanie i wentylacja: FiO2, PaCO2, przeciek, Severinghaus, drogi oddechowe, GCS (hipoksja, perfuzja). | | — |
| P3 | Leki PK/PD, bilans cieplny i środowisko, glukoza mmol/L, pełne GCS/AVPU. | | — |
| P4 | Triada śmierci, skrzep i ponowne krwawienie, realne tempa krwawień, oparzenia %TBSA, opcjonalnie TBI/ICP, odma prężna, NIBP co 3 min, nowa ocena, usunięcie luster. | | — |

### Realizacja P0/P1 — odstępstwa od szkicu

- Baroreflex HR jest nasycający: HR = HR0 + (155 − HR0)·tanh(e/0,2) zamiast liniowego z limitem 1,6 (liniowy nie trafia jednocześnie w klasy II i IV). SV = SV0·((p − 0,4)/0,6)^1,3, PP ∝ √SV. Wynik kalibracji (75 kg, po ustaleniu): 10% → HR 83, 114/74; 22% → 102, 106/72; 35% → 130, 91/66; 45% → 153, 63/44.
- `reserve` w P1 = DBP/70 × Hb/Hb0 (bez SpO₂ — utlenowanie wchodzi w P2; do tego czasu zatrzymanie hipoksyjne zostaje przy dawnym progu tlenu ≤ 38). Próg 0,85, pełny spadek w 40 s przy zerowej podaży. Nieleczone krwawienie zatrzymuje krążenie przy ~44–49% EBV.
- Limity ukrytej utraty ze złamań i krwiaków skalują się z EBV jak tempa (profil nie zmienia przebiegu w %).
- Losowi pacjenci są mężczyznami (imiona w opisie są męskie; zmiana opisu złamałaby zgodność seedów); kobiety przez `options.profile`.
- Wsparcie krążenia z leków/pakietów (dawne punkty) działa jak objętość wirtualna do P3.
- Strain hipoksji (dawne −0,08 pkt/s przy tlenie < 60) trafia do `plasmaDeficitMl`, nie do utraty krwi.
- Ocena: sprzęt i szybkość wezwania liczą się tylko przy przekazaniu żywego pacjenta z ≥ 12,5/25 pkt stanu **i** niezerową perfuzją oraz SpO₂ (sam warunek połowy przepuszczał niewyrównany wstrząs z dobrą SpO₂ i temperaturą na ~89 pkt).
- Balans do przejrzenia w P4: próg zatrzymania przesunął się z dawnych 40% do ~44–49% EBV, więc nieleczona rana szarpana (`forestSaw`, tylko wezwanie ewakuacji) dożywa dziś przekazania przy ~42% utraty (wynik ~54, C); amputacje, tętnicze i drogi oddechowe nadal przegrywają bez leczenia.
