# Rozszerzanie Field Medic

## Granice modułów

```text
content/ (definicje, bez stanu i DOM)
    ↓
simulation/ (selektory, efekty, fizjologia)
    ↓
engine.js (tworzenie stanu, transakcja akcji, wersjonowanie)
    ↓
storage.js + ui/ (zapis i komponenty)
    ↓
app.js (łączenie komponentów i zdarzeń)
```

Silnik nie importuje DOM ani localStorage. `act(state, id, part)` tworzy kopię stanu, sprawdza dostępność, zużywa sprzęt, uruchamia zarejestrowany efekt i przesuwa symulację sekunda po sekundzie. Poprzedni stan pozostaje nietknięty. Zablokowana czynność zwraca poprzedni stan i nie zużywa czasu ani zapasów. Czytanie poradnika i zmiana wyboru ciała nie wywołują silnika.

## Nowy sprzęt

Dopisz rekord do `EQUIPMENT` w `src/content/items.js`:

```js
{ id: 'spareDressing', name: 'Opatrunek zapasowy', count: 2,
  time: 35, effect: 'dressing', target: true,
  description: 'Dodatkowe opatrunki do zabezpieczania ran.' }
```

Torba, licznik zapasów i obsługa przycisku powstaną automatycznie. `count: null` oznacza sprzęt wielorazowy. `target: true` kieruje efekt na zaznaczoną okolicę; `limbOnly: true` ogranicza go do kończyn. `requires: 'iv'` wymaga dostępu dożylnego.

Istniejące efekty można wykorzystywać ponownie. Nową mechanikę dodaj jako funkcję w `src/simulation/effects.js` i zarejestruj w `EFFECTS`. Sygnatura: `({ g, item, target }) => tekstDoDziennika`. `g` jest roboczą kopią; handler może ją zmieniać. Unikalne warunki dostępności umieść w `itemUnavailable`, a mechanikę ciągłą w fizjologii. Interfejs nie powinien implementować zasad leczenia.

## Nowy lek

Dopisz rekord do `MEDICINES` (pola: `effect: 'medicine'`, `route` — `IV`, `IM`, `Wziewnie`, `Doustnie`, `Miejscowo`, `description`, `risk`) **oraz** profil w `PHARMACOLOGY` (`src/content/physiology-data.js`; `validateCatalogs` wymaga go dla każdego leku z katalogu): `half` (kategoria okresu półtrwania z `HALF_LIFE_MIN`), `ke0HalfS` (opóźnienie miejsca działania), opcjonalnie `absHalfS`/`lagS` (nadpisują drogę z `PK_ROUTES`) i `channels`. Kanał to krzywa Emax/Hilla `{ec50, n}` (albo `{linear:true, emax}`) poziomu w miejscu działania, znormalizowanego tak, że jedna pełna porcja ma szczyt 1. Bez `emax` wartość pola przedmiotu jest efektem jednej porcji w szczycie:

| Kanał | Pole przedmiotu / znaczenie |
| --- | --- |
| `analgesia` | `painRelief` — punkty bólu |
| `relief` | siła ulgi 0..1 urazu z tagiem `relievesTag` (skurcz oskrzeli, anafilaksja — także przeciek osocza i SVR, nudności, glucoseLow) |
| `respDepression` | `respiratoryBurden` — depresja ośrodkowa oddychania (wejście `physio-respiration`) |
| `antagonism` | `respiratoryRelief` 0..1 dla leków z tagiem `respiratoryReliefTag` (nalokson → `opioid`) i urazu z `reliefTag` |
| `sedation` | punkty GCS (`emax` jawnie) |
| `hr` | `pulseIncrease` (bpm) |
| `volume` | `circulationSupport` (objętość wirtualna) |
| `oxygen` | `oxygenSupport` (gradient A–a) |
| `bleeding` | `bleedingMultiplier` (TXA < 1, ibuprofen > 1) |
| `glucose` | wzrost glukozy w mmol/L |

Pierwszy kanał decyduje, czy lek jest „aktywny” (> 10% Emax), i rysuje pasek w panelu podtrzymania. Każde podanie to dawka `{id, at, amount, route, site}` w `g.medications`; dawki sumują się w depocie, więc powtórzenia kumulują się (przedawkowanie wynika z krzywych, bez osobnej kary). Lek bez profilu (rozszerzenie dodane w czasie działania) zachowuje dawne okno `onset`/`duration`. Alergie są listą identyfikatorów leków w scenariuszu; zignorowana alergia dodaje uraz `allergicReaction`. To umowne porcje i balans gry, nie jednostki kliniczne.

Jeżeli nowy lek potrzebuje innego zachowania niż powyższe, dodaj nowy efekt lub nowy modyfikator w module symulacji; nie wpisuj warunków nazw leków do interfejsu.

## Nowy uraz

Dodaj definicję do `src/content/injuries.js`. `visible: null` ukrywa go do zbadania właściwej okolicy. `finding` jest wynikiem badania. `bleed` to dawne tempo krwawienia (punkty/s); od fazy P1 silnik przelicza je na mL/min w `src/content/injury-physiology.js` (wpis albo domyślny wpis tagu jest wymagany dla każdego urazu — `validateCatalogs`). `oxygenLoss` — od P2 już tylko znacznik urazu oddechowego (nie wchodzi do ticku; polityki opieki w testach podają przy nim tlen); każdy uraz z `oxygenLoss` musi mieć wpis `resp` w `RESPIRATORY` (`injury-physiology.js`, sprawdza `validateCatalogs`). `pain` to poziom bólu. Tagi podłączają istniejące mechaniki:

- `external`, `wound`: opatrunki, gaza; staza odcina zewnętrzne krwawienie kończyny.
- `massive`: zwykły opatrunek ogranicza utratę krwi słabiej.
- `fracture`: szyna zmniejsza ból, lecz nie krwawienie.
- `internal`: brak kontroli przez zewnętrzne opatrunki.
- `airway`, `chest`, `bronchospasm`: odpowiednie zabezpieczenie usuwa powiązany ubytek tlenu.

Nie pokazuj ukrytych danych w UI: używaj selektorów `visibleInjuries` i `bodyObservation`.

## Nowy scenariusz

Dopisz rekord do `src/content/scenarios.js`: `id`, `title`, `scene`, `quote`, `history`, `injuries: [[partId, injuryId], ...]`, początkowe `blood` i `oxygen`, oraz `lesson`. Opcjonalne `allergies` to identyfikatory leków, a `environment:{tempC,wet,wind}` (°C, 0..1, m/s) opisuje otoczenie dla bilansu cieplnego (domyślnie 18 °C, sucho, bez wiatru). Kilka urazów może dotyczyć tej samej części ciała. Generator losuje też dodatkowe stłuczenie i dojazd 15–25 minut. Dodanie scenariusza nie wymaga zmiany UI.

## Ciało i poradnik

Okolice ciała to `src/content/body.js`. Od 0.8 ciało składa się z 31 segmentów (`BODY_PARTS`): `head`, `face`, `neck`, `chest`, `abdomen`, `pelvis`, `back` oraz po stronie prawej i lewej `…Shoulder`, `…UpperArm`, `…Elbow`, `…Forearm`, `…Wrist`, `…Hand`, `…Hip`, `…Thigh`, `…Knee`, `…Shin`, `…Ankle`, `…Foot` (np. `rightElbow`, `leftAnkle`). Bark, nadgarstek, biodro i kostka (0.8) są krótkimi segmentami stawowymi (`bridge: true`): bez stazy i bez wenflonu. Wybór na sylwetce i liście buduje się z tych samych danych. Nowa okolica musi mieć unikalny identyfikator.

Pola segmentu:

| Pole | Znaczenie |
| --- | --- |
| `group` | Grupa: `head` (głowa, twarz, szyja), `chest`, `abdomen` (brzuch, miednica), `back`, `rightArm`/`leftArm`, `rightLeg`/`leftLeg` |
| `order` | Kolejność od proksymalnej 0 do dystalnej 5 w kończynie (ręka: bark 0, ramię 1, łokieć 2, przedramię 3, nadgarstek 4, dłoń 5; noga: biodro 0, udo 1, kolano 2, podudzie 3, kostka 4, stopa 5); poza kończynami 0 |
| `limb` | Segment kończyny (szyna, `limbOnly`) |
| `bridge` | Krótki staw dodany w 0.8; szyna sięga przez niego (`splintReach`) |
| `stump` | Szerokość kończyny na górnej krawędzi pasa — rysowanie kikuta po amputacji |
| `tourniquet` | Dozwolona staza: ramię, przedramię, udo, podudzie |
| `vascular`, `ivSite` | Dostęp IV: łokieć, przedramię, dłoń; `ivSite` to identyfikator miejsca z `IV_PROCEDURE.sites` |
| `base`, `clip: [y0, y1]` | Kształt bazowy i pas wysokości w układzie portretowym |
| `anchor`, `device`, `stasis`, `splint` | Punkty zaczepienia ran i sprzętu |

Geometria nie ma osobnych konturów segmentów. `BODY_OUTLINES` zawiera siedem dawnych kształtów (klucze `head`, `chest`, `abdomen`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`) i to one tworzą rysowany obrys. `body-scene.js` rysuje klikany region segmentu jako kształt bazowy przycięty `clipPath` (`clip-<id>`, prostokąt x 0–1000, y `clip`). Pasy: głowa 40–112 / twarz 112–212 / szyja 212–290; brzuch 520–655 / miednica 655–800; klatka cała; ręka 285–335 / 335–480 / 480–565 / 565–735 / 735–775 / 775–880; noga 700–790 / 790–1000 / 1000–1110 / 1110–1370 / 1370–1410 / 1410–1465 (pasy jednej bazy są ciągłe i nie nachodzą na siebie — sprawdza to `tests/amputation.test.js`). Granice pasów są rysowane cienkimi liniami `segment-divider` przyciętymi do obrysu (`clip-base-<id>`). Plecy nie mają kształtu w widoku z przodu: są osobną wstawką `body-back-inset` (`BACK_INSET`, własny układ współrzędnych) przy stopach, w prawym górnym rogu stołu; rany pleców rysują się w tej wstawce.

`regions` przedmiotu może wymieniać identyfikatory grup lub segmentów (`matchesRegion`): `['leftArm']` obejmuje cały lewy kończynowy pas, `['head']` także twarz i szyję, `['abdomen']` także miednicę. Mechanika zależna od położenia:

- Staza zatrzymuje zewnętrzne krwawienie urazów tej samej grupy o `order` ≥ jej segmentu i odcina przepływ wenflonów poniżej (`tourniquetOver` w `vascular.js`, używane przez krwawienie, przepływ IV, badanie i ocenę perfuzji). Na dłoni, stopie, stawie i tułowiu jest odrzucana.
- Szyna działa na złamania własnego segmentu i sąsiednich (`order` ±1) tej samej kończyny, a przez jeden segment `bridge` sięga dalej (`splintReach` w `body.js`, używane przez `splinted` i efekt `splint`). Dzięki temu dawne pary sąsiadów zostają bez zmian: szyna na przedramieniu obejmuje łokieć, nadgarstek i dłoń, na podudziu — kolano, kostkę i stopę, na ramieniu — bark i łokieć, na udzie — biodro i kolano. Szyna na łokciu nie sięga barku (ramię nie jest stawem pośrednim).
- Przesunięcie `order` nie zmienia stazy: miejsca stazy (ramię 1, przedramię 3, udo 1, podudzie 3) obejmują nadal te same dawne segmenty; bark i biodro leżą powyżej każdej stazy, nadgarstek i kostka poniżej stazy przedramienia/podudzia.
- Wenflon zakłada się na segment naczyniowy; minigra ma z góry ustawione miejsce (`ivSite`), a resolver odrzuca punkt spoza niego. Leki i płyny `requires: 'iv'` podane na dowolny segment ręki używają wenflonu tego segmentu, a jeśli go nie ma — drożnego wenflonu tej samej ręki (`ivSiteFor`).

Zgodność: `LEGACY_PARTS` mapuje dawne `rightArm`/`leftArm` na `…Forearm` oraz `rightLeg`/`leftLeg` na `…Thigh`; `resolvePart(id)` zwraca segment dla nowych i dawnych identyfikatorów (`head`, `chest`, `abdomen` pozostają). Scenariusze mogą nadal używać dawnych identyfikatorów — `createGame` i `validateCatalogs` je rozwiązują — ale dokładniejsze miejsca (np. `face` dla oka, `rightFoot` dla kostki) są preferowane. `act`, `itemUnavailable` i `contextActions` także przyjmują dawne identyfikatory. `restoreGame` przenosi klucze `g.body` (wraz z `ivAt`, `ivPlacement`, `ivQuality`, `ivAttempts`, `treatments`) oraz `injuries[].part`, `infusions[].site`, `medications[].site`, `supports[].target`, `assessments[].part` bez zmiany wersji stanu i inicjalizuje nowe segmenty.

### Amputacje urazowe (0.8)

Urazy z tagiem `amputation` (`amputationHand`, `amputationForearm`, `amputationFoot`, `amputationShin`; tagi `external`, `wound`, `massive`, `amputation`) usuwają swój segment S i wszystkie segmenty tej samej grupy o wyższym `order`. Czysty selektor `missingSegments(g)` (i `isMissing(g, id)`) w `selectors.js` wylicza je z `g.injuries` — stan nie przechowuje osobnej flagi. `partialAmputation` (tagi `external`, `wound`) to drobny uraz bez braków.

- Brakujący segment: `itemUnavailable` zwraca `MISSING_PART` („Tej części brak — wybierz wyżej”) dla każdego przedmiotu; wyjątek to `STUMP_CARE` (`dressing`, `hemostatic`) podane na sam uraz amputacyjny (`injuryId`). `act('examine')` jest odrzucane na brakującym segmencie bez urazu. Staza, szyna i wenflon nie liczą się na brakującym segmencie (`tourniquetsOver`, `splinted`, `hasAccess`).
- Krwawienie (`injuryBleeding`): zatrzymuje je tylko staza proksymalnie do S na tej samej kończynie (zwykłe reguły jakości `tourniquetQuality`). Gaza hemostatyczna na kikucie mnoży krwawienie przez `1 − .5·packQuality` (najwyżej −50%), opatrunek przez `.85`; inne przedmioty stabilizujące nie mają dostępu. `proximalTourniquetSite(id)` w `body.js` zwraca najbliższe miejsce stazy powyżej segmentu.
- Balans (krew/s): dłoń .085, stopa .09, przedramię .12, podudzie .14, częściowa amputacja palców .016. Przy dojeździe 25 min każdy scenariusz kończy się sukcesem przy szybkiej stazie powyżej, a przegrywa przy samym opatrunku lub tamponadzie.
- `createGame` nie losuje dodatkowego stłuczenia na brakującym segmencie.
- Rysowanie (`body-scene.js`): brakujące segmenty nie mają regionów; obrys bazy z brakami jest przycięty do pozostałych pasów (`clip-base-<base>-stump`), linie anatomii i separatory maskuje `stump-mask` (pasy braków ∩ obrys bazy). Na cięciu (`cutPoint(id)`: górna krawędź pasu S na linii między kotwicami) rysuje się `STUMP_ART` (`.stump-end`, szerokość `stump`), a znacznik urazu (`WOUND_ART.amputation`) stoi w tym samym punkcie i przyjmuje opatrunek/gazę. Sprzęt, wsparcia i odznaki zabezpieczeń nie rysują się na brakujących segmentach; odznaka opatrunku kikuta stoi przy cięciu. Przyciski części (`patient.js`) dla braków mają klasę `missing`, `aria-disabled="true"` i `title="Brak"`, a `body-interactions.js` ich nie obsługuje. Menu kontekstowe brakującego segmentu zawiera tylko wyłączoną pozycję `missing`; znacznik kikuta pokazuje badanie, opatrunek i gazę.
- Zapisy: `restoreGame` inicjalizuje brakujące klucze nowych segmentów (zapisy 0.6 i 0.7 działają); braki wynikają z urazów, więc nie wymagają migracji.

Poradniki to `src/content/guides.js`. Dodaj `id`, `title`, `text` i opcjonalne `links: [[nazwa, url]]`. Biblioteka oraz wyszukiwanie obejmą wpis automatycznie.

## Stany poszkodowanego i protokół

`src/content/conditions.js` definiuje `CATEGORIES` (6 kategorii: `drobne`, `zewnetrzne`, `zagadka`, `medyczne`, `srodowisko`, `mieszane`; „Losowa” = `RANDOM_CATEGORY`, tylko w UI i `stats.category`) oraz `CONDITIONS`. Stan to `{id, category, name, severity: 'lekki'|'poważny'|'krytyczny', scenario, protocol}`. `scenario` jest identyfikatorem z `scenarios.js` albo rekordem w tym samym kształcie (bez `id` — przyjmuje id stanu; trafia do `CONDITION_SCENARIOS`, a `scenarioFor`/`scenarioById` w `engine.js` szuka w obu listach). Wbudowane scenariusze nie są w `SCENARIOS`, więc dawne losowanie po indeksie się nie zmienia.

Krok protokołu: `{id, label, check, deadline, consequence}`. `deadline` to sekundy gry, mnożone przez `deadlineMultiplier` poziomu (łatwy 1,5, normalny 1, trudny 0,75) i zapisywane w stanie. Specyfikacje są deklaratywne (`CHECKS`/`CONSEQUENCES` w `src/simulation/protocol.js`):

| `check` | Spełniony, gdy |
| --- | --- |
| `{examined: 'head' \| [...]}` | zbadano jeden z segmentów |
| `{action: 'history'\|'vitals'\|'transport'\|'examine'}` | wykonano czynność (lub jej skutek jest w stanie) |
| `{item: id}`, `{itemAny: [ids]}` | użyto przedmiotu (zdarzenie albo ślad w lekach, ocenach, wsparciach, zabezpieczeniach) |
| `{treatedInjury: typ}`, `{treatedAll: typ}` | uraz (każdy uraz) tego typu ma zabezpieczenie lub stazę powyżej |
| `{transport: true}`, `{warm: true}`, `{airway: true}`, `{oxygenGiven: true}` | ewakuacja wezwana, okrycie/ogrzewanie, drożność, tlen lub wentylacja |
| `{any: [check, ...]}` | którykolwiek z warunków |

`consequence` (stosowana raz, gdy termin minie bez wykonania): `worsen: {injury, to}` (zmiana typu pierwszego takiego urazu), `oxygen`, `blood`, `temperature` (różnice), `pain` (stała kara bólu w `g.protocol.pain`, dodawana w `pain()`), `unconscious: true` (`initialUnconscious`), `addInjury: [część, typ]`. Kilka kluczy w jednym obiekcie działa łącznie. Dziennik dostaje wpis „Zaniedbano: … — stan się pogarsza.” — przed terminem gra niczego nie podpowiada.

Stan: `g.protocol = {conditionId, pain, steps: {[id]: {deadline, doneAt, missedAt}}}` — klucz istnieje tylko w grach ze stanem. `createGame(index, random, {difficulty, category, conditionId})` wybiera stan (`pickCondition`: `conditionId`, inaczej losowo z kategorii — pierwsze wywołanie `random` — a dla `losowa`/nieznanej z całej listy). Bez `category` i `conditionId` tworzenie gry jest identyczne jak wcześniej. `act` wywołuje `checkProtocol(g, {id, target, injuryId})` po efekcie, przed upływem czasu czynności, więc krok liczy się od jej rozpoczęcia; `tick` wywołuje `checkProtocol(g)` co sekundę (warunki stanu i terminy). Wykonanie po terminie zapisuje `doneAt` (pół punktu), konsekwencja już zastosowana zostaje.

`protocolStatus(g)` zwraca `[{id, label, deadline, doneAt, onTime, late, missed}]`. `scoreRun` przy protokole skaluje dotychczasowe części do 34/21/17/13 i dodaje `protocol` (15 pkt × udział kroków na czas, spóźnione liczą się w połowie); bez protokołu ocena jest taka jak wcześniej. `restoreGame` waliduje `g.protocol` (`validProtocol`: znany stan, dokładnie te same kroki, liczby skończone) i przy błędzie usuwa sam protokół, zachowując grę; nieznany wbudowany scenariusz oznacza nieznaną grę (`null`). Wersja stanu się nie zmienia.

Interfejs: przycisk `data-new` otwiera `#new-call` (`renderNewCall`), pasek zgłoszenia pokazuje tylko kategorię i ciężkość (`renderConditionTags`), a podsumowanie — nazwę stanu i listę kroków (`renderProtocolDebrief`). Zagadki (`zagadka`) muszą mieć mylący `scene`/`quote` i ukrytą przyczynę (`visible: null`). Nowe urazy stanów: `headInjury`→`headBleedSevere`, `spinalInjury`→`spinalCordInjury`, `strokeSigns`→`strokeSevere`, `hiddenChestWound`, `coPoisoning`, `stingAnaphylaxis`, `opioidOverdose`, `postIctal`, `heatStroke`; nowy sprzęt `cervicalCollar` (efekt `stabilize`, tag `spine`, szyja). `validateCatalogs` wywołuje `validateConditions`. `tests/conditions.test.js` zawiera prosty „solver” (mapuje specyfikacje kroków na czynności) i sprawdza, że każdy stan kończy się sukcesem przy 25-minutowym dojeździe, a pominięcie kluczowych kroków w zagadkach daje wyraźnie gorszy wynik. Nowy stan dodajesz samym rekordem w `CONDITIONS`.

## Zapis i kompatybilność

Stan gry ma `version: 3` (pod kluczem `field-medic-v2`, niezależnie od prototypu v1); zapisy v2 są migrowane przy odczycie (patrz „Fizjologia w jednostkach”). `restoreGame` waliduje stan przed wznowieniem; uszkodzone lub niezgodne dane prowadzą do nowej gry. Dodawane pozycje wyposażenia i części ciała są inicjalizowane przy odczycie istniejącego zapisu. Przy usuwaniu identyfikatorów, zmianie znaczenia pól lub fizjologii należy dodać jawną migrację albo podnieść wersję stanu. Identyfikatory treści traktuj jako stabilne.

## Fizjologia w jednostkach (P1–P3)

Plan i fazy: `docs/PHYSIOLOGY-PLAN.md`. Stan kliniczny ma dwa pola: `g.profile` (`sex`, `ageY`, `massKg`, `heightCm`, `ebvMl`, `hb0`, `seed`) losowane w `createGame` **po** wszystkich dawnych losowaniach (ten sam seed daje ten sam scenariusz, pacjenta i dojazd; `options.profile` nadpisuje pola), oraz `g.phys` (`lostMl`, `hbMassG`, `crystIvMl`, `crystInMl`, `plasmaDeficitMl`, `hr`, `svrIdx`, `map`, `sbp`, `dbp`, `sv`, `reserve`, `lowMapS`, księgi `injuryMl`/`boneMl`; od P2 oddychanie: `fio2`, `vaFrac`, `paco2`, `sao2`, `pao2`, `spo2Shown`, `shunt`, `aaExtra`, `aaInsult`, `rr`, `storeFio2`, `lowSpo2S`, księga postępu `respProg` i butla `o2:{device,flowLpm,litersLeft}`).

- `src/content/physiology-data.js`: `NORMALS`, `HEMORRHAGE_CLASSES` (ATLS), `TUNING`, `CV_TUNING`, `RESP_TUNING` — komentarze R (zakres podręcznikowy) / G (strojenie gry).
- `src/content/injury-physiology.js`: na uraz `vessel`, `rate` (mL/min przy MAP 90 dla 75 kg; P1 = dawne `bleed` × 1575, w czasie gry × EBV/5250), `pExp` (krwawienie × (MAP/90)^pExp), `bone` (ukryta utrata złamania wg segmentu, τ 30 min, szyna × 0,6, staza powyżej ją zatrzymuje), `capMl` (limit krwiaka/zmiażdżenia), `resp` (P2, tabela `RESPIRATORY`): składowe `[na początku, po pełnym postępie]` — `obstruct` (górne drogi; usuwa je udrożnienie przy tagu `airway`), `va` (wentylacja: skurcz oskrzeli, mechanika klatki), `depress` (depresja ośrodkowa, obniża też RR), `aa` (dodatkowy gradient A–a w mmHg, V/Q — reaguje na tlen), `shunt` (przeciek — nie reaguje), `painVa` (wentylacja przy bólu ≥ 8, łagodzi analgezja), `tauS` (τ postępu), `reliefTag` (np. `opioid` dla naloksonu). Ulga r (lek z `relievesTag`/`respiratoryReliefTag`, jakość opatrunku wentylowego, ssak/płukanie przez `oxygenRelief`) mnoży każdą składową przez (1 − r) i cofa postęp ku 0.
- `src/simulation/physio-model.js`: `clinicalSnapshot(g)` — czysty, zapamiętywany odczyt (`lossFrac`, `lostMl`, `hemorrhageClass`, `map`, `sbp`, `dbp`, `hr` z bólem i lekami, `spo2`, `rr`, `tempC`, `gcs`/`avpu` (przybliżone), `glucose` mmol/L, `perfusion`, `hb`, `reserve`, `causes`); `applyInsult(g,{kind:'bleed'|'plasma'|'oxygen'|'temperature',…})` — droga zmian krwi i tlenu z protokołu i strain hipoksji (od P3 alergia i RKO z tętnem tworzą urazy); profil, `initPhys`, baroreflex `circulate`.
- `src/simulation/physio-circulation.js`: sekunda krążenia — krwawienie zależne od ciśnienia, worki 500 mL (~100 mL/min × przepływ wenflonu), redystrybucja krystaloidu do 25% (τ 20 min) i rozcieńczenie Hb, baroreflex (HR/SVR z opóźnieniem τ 6/15 s, MAP = CO·SVR, SBP = MAP+⅔PP, DBP = MAP−⅓PP) oraz `reserve` (podaż DBP/70 × Hb; spada poniżej 0,85).
- `src/simulation/physio-respiration.js` (P2): sekunda oddychania. FiO2: powietrze 0,21, przedmiot `oxygen` = maska z rezerwuarem 15 L/min na butli 150 L (`connectOxygen`; 10 min jak dawniej, `g.oxygenUntil` jest lustrem dla UI/protokołu) ≈ 0,7, BVM (`ventilatingUntil`, RKO z wentylacją) 0,9 z tlenem i 0,21 bez. vaFrac = min(górne drogi, tkanki miękkie) × `va` × depresja (leki: ×1/(1+0,35·`respiratoryBurden`)); BVM zastępuje górne drogi i depresję (zostaje mechanika płuc). GCS ≤ 8 bez udrożnienia/BVM i bez urazu z tagiem `airway` dodaje niedrożność tkanek miękkich (×0,4 przy GCS 3 do ×0,7 przy GCS 8). PaCO2 = 40/vaFrac (τ 20 s, ≤ 150), PAO2 = FiO2·713 − PaCO2/0,8, `arterialSaturation()` (czysta): krew kapilarna = Severinghaus(PAO2 − A–a) + mały składnik rozpuszczonego O2, mieszana z przeciekiem; Sv = Sa − 0,24/(CO × Hb wzgl.) (Fick, rozwiązane w postaci zamkniętej), więc spadek podaży obniża Sa przy przecieku. Magazyn tlenu: wzrost τ 20 s, spadek τ 20 s na powietrzu do 90 s po wysokim FiO2 (`storeFio2`, τ 60 s). `spo2Shown` (pulsoksymetr) τ 6 s. RR z bólu, hipoksji, hiperkapnii, obciążenia mechanicznego i wstrząsu (zastępczo za kwasicę), stłumione depresją. `gcsOf(g)`: 15 − max(hipoksja wg pasm SpO2, hiperkapnia (PaCO2 − 55)/6, perfuzja: klasa III −2, IV −4, MAP < 55 −5, < 45 −7, uraz/stan „nieprzytomny” bez udrożnienia → GCS 6); AVPU A ≥ 14, V 12–13, P 9–11, U ≤ 8. `isConscious` = GCS ≥ 9, `canSwallow` (≥ 14) bramkuje drogę doustną, `toleratesOPA` (≤ 8) — przedmiot `airway` (powody po polsku w `itemUnavailable`).
- `applyInsult(g,{kind:'oxygen',pts})` (konsekwencje protokołu, alergia): SaO2 spada od razu o `pts` punktów, a gradient A–a rośnie o 2 mmHg na punkt i wygasa z τ 10 min.
- Zatrzymanie: `reserve` = 0 (podaż DBP/70 × Hb × min(1, SaO2/0,96)), MAP < 35 przez 20 s albo SpO2 < 50 przez 30 s (`lowSpo2S`). Budżet 180 s i jakość RKO bez zmian; ROSC wymaga RKO, perfuzji > 27, SaO2 > 65% i krwawienia < 1,05% EBV/min, po nim krążenie jest ustalane od nowa, a rezerwa ≥ 0,35.
- `vitals()` ma dawny kształt + `map`, `gcs`, `avpu`, `etco2`; HR/BP/RR/GCS pochodzą z modelu, SpO₂ z uśrednionego `spo2Shown`; monitor (`patient.js`) ma kafelek GCS/AVPU (`data-live="gcs"`, `data-live="avpu" data-live-sub` — podpole nie zmienia poziomu kafelka), szum jest deterministyczny (`noise(g)` z `profile.seed`), w ticku nie ma `Math.random`.
- Lustra do fazy P4: `g.blood = 100 − 200·(lostMl+plasmaDeficitMl)/EBV`, `g.oxygen = SaO2·100` (zapisywane w ticku; nie zmieniaj go bezpośrednio — `initPhys(g, blood, oxygen)` ustawia stan oddechowy z wartości SpO2). `circulation(g)` = indeks perfuzji z objętości efektywnej (krew + krystaloid − deficyt osocza + wsparcie leków jako objętość wirtualna) w dawnej skali 0–100. `injuryBleeding`/`bleedingRate` zwracają mL/min (nominalnie, bez czynnika ciśnienia).
- Ocena: „Stan przy przekazaniu” = indeks wstrząsowy HR/SBP (≤ 0,7 pełne, ≥ 1,3 zero; 10 pkt) + SpO₂ (≥ 94 → 80; 7,5) + temperatura (36–38 pełne, 0 przy ≤ 34/≥ 40; 7,5), notatka „Utrata krwi ~X l (klasa N)”. „Gospodarka sprzętem” i „Szybkość wezwania pomocy” liczą się tylko przy przekazaniu żywego pacjenta z co najmniej połową punktów stanu oraz niezerową perfuzją i SpO₂ (inaczej 0 z notatką „Nie liczono…”).
- Zapis `version: 3`: `restoreGame` waliduje `profile`/`phys` (z polami oddechowymi, `validRespiration`) i `infusions[].ml`; zapis v3 sprzed P2 dostaje pola oddechowe przez `ensureRespiration` (`??=` z `g.oxygen`, butla z `oxygenUntil`, PaCO2 ustalone; bez podbicia wersji). v2 migruje (`physio-migrate.js`): mężczyzna 80 kg (EBV 5600) z wiekiem z opisu, `lostMl = (100 − blood)·0,005·EBV`, tlen → SaO2 i PaO2 z odwróconego Severinghausa, `fluidSupport` → `crystIvMl`, pozostały czas 2-minutowego wlewu → mL worka.
- **P3 — leki** (`src/simulation/physio-pharmacology.js`): dawki `{id, at, amount (= dostarczenie), route, site}`; model jednokompartmentowy z wchłanianiem pierwszego rzędu (`PK_ROUTES`: IV ~natychmiast, IM t½ wchłaniania 4 min, wziewnie 5 min, doustnie 12 min + 8 min opóźnienia, miejscowo 1,5 min), eliminacją wg kategorii (`HALF_LIFE_MIN`) i miejscem działania ke0 — w postaci analitycznej (zapis trzyma tylko listę dawek). Wstrząs zmniejsza objętość dystrybucji: poziom × (1 + 1,5·s), s = (utrata − 20%)/20% (dawny skok ×3,3). `drugEffects(g)` (zapamiętane na sekundę) → `drugDefinitions` → `activeDrugDefinitions` w selektorach przenosi wartości kanałów do dawnych pól (`painRelief`, `reliefStrength`, `burden`, `respiratoryRelief`, `sedation`, `glucoseRise`, …); `respiratoryBurden` = Σ depresji × (1 − antagonizm). `stepPharmacology` loguje początek/koniec działania (`phys.drugActive`) i jedno ostrzeżenie o nadmiernym działaniu (`phys.drugExcess`). `drugStatus` daje UI fazę („działanie narasta / szczyt działania / działanie słabnie”) i siłę względem jednej porcji; `drugProfileText` — jakościowy opis karty. Zignorowana alergia: uraz `allergicReaction` ze `scale` = 0,5 × dostarczenie i narastaniem `rampS` 300 s; RKO z tętnem: uraz `ribFracture` (raz).
- **P3 — anafilaksja w krążeniu** (`CIRCULATORY` w `injury-physiology.js`): przeciek osocza (mL/min × EBV/5250) i SVR × `svr`, oba × skala urazu × (1 − ulga leku z `relievesTag`); `svrFactorOf` mnoży cel SVR w `circulate`.
- **P3 — temperatura** (`src/simulation/physio-thermal.js`): `g.temperature` (zapisywane) jest temperaturą głęboką; `phys.env` = środowisko scenariusza. dT/dt = (Qmet + drżenie + ogrzewanie − Qloss − pocenie − oparzenia − płyny)/(m·3,47 kJ/kg/°C); Qmet = 1,2 W/kg × podaż O2 (0,3–1,1); drżenie do 2,4 W/kg między 36,5 a 34 °C, zanika do 32 °C, słabnie we wstrząsie i po lekach nasennych; Qloss = BSA (Mosteller)·3 W/m²K·(33 − env)·(1 + 0,1·wiatr)·(1 + 3·wilgoć)·ekspozycja (+40% przy zbadaniu wszystkich segmentów)·(1 − izolacja; koc 0,65); pocenie 60 W/°C powyżej 37,2 °C (≤ 250 W, brak przy udarze cieplnym); oparzenie 10 W; płyn 20 °C × 4,18 J/mL/°C; pakiet ogrzewający +40 W, mata chłodząca −120 W (`heatW` wsparcia). Zakres 20–44 °C. < 28 °C → zatrzymanie w VF.
- **P3 — glukoza i świadomość** (`src/simulation/physio-neuro.js`): `phys.glucoseBase` (5,3; przy hipoglikemii start 2,7 i powolny spadek ku 2,2, τ 60 min) + wzrost z żelu (kanał `glucose`, ~+2,5 w 10–15 min) = `phys.glucose` (mmol/L; glukometr „mmol/l”). `gcsOf` (re-eksport z `physio-respiration`): 15 − max(hipoksja, hiperkapnia, perfuzja, glukoza (`NEURO.glucose`: < 3,0 −1, < 2,5 −3, < 2,2 −7, < 1,8 −10), temperatura (< 34 −1, < 32 −3, < 30 −6, < 28 −9; > 40 −3, > 41 −5, > 42 −8), sedacja leków, deficyty urazów (`NEURO_INJURY`: stan po napadzie 4 → 0 z τ 15 min po udrożnieniu, uraz głowy/objawy udaru −1; „nieprzytomny” bez udrożnienia → GCS 6)). `gcsComponents(g)` zwraca składniki.
- **P3 — rytmy zatrzymania** (`physiology.js`): `arrest.rhythm` — `vf` przy < 28 °C lub urazie elektrycznym, `asystole` przy niedotlenieniu, w pozostałych `pea`. RKO przywraca krążenie tylko poza VF; AED w VF przy > 30 °C kończy zatrzymanie (`endArrest`), gdy przyczyny na to pozwalają, w pozostałych rytmach „brak wskazań”. Monitor: „Migotanie komór”, „PEA — bez tętna”, „Asystolia”.
- **P3 — zapis**: bez podbicia wersji. Rekordy leków `{start, end, delivery, burden}` → dawki (`migrateDose`: `at = start − dawny onset`), `respiratoryDepression` jest usuwane, `phys.env`/`glucose`/`glucoseBase`/`neuroProg`/`drugActive`/`drugExcess`/`infusedMl` dostają wartości domyślne, `arrest.rhythm` domyślnie `asystole`; urazy mogą mieć `scale`, `at`, `rampS`.
- Testy: `tests/physio.calibration.test.js` (klasy ATLS, rozcieńczenie, próg zatrzymania), `tests/physio.respiration.test.js` (Severinghaus, przeciek vs V/Q, kalibracja: SpO2 każdego scenariusza po 60 s bez leczenia w ±4 od pola `oxygen` — stroimy urazy, nie test; butla, BVM, udrożnienie, odma i opatrunek, astma, zatrzymanie hipoksyjne, pasma GCS i bramki, zapisy; `REPORT=1` wypisuje tabelę), `tests/physio.migrate.test.js`, `tests/physio.p3.test.js` (kształt krzywych wg drogi, kumulacja opioidu → depresja oddechu i GCS, nalokson słabnie przed opioidem, hydrokortyzon bez efektu w 25 min, TXA vs kontrola, alergia → anafilaksja odwracana adrenaliną, RKO z tętnem → żebra, koc/wilgoć/mata chłodząca, VF w hipotermii, glukoza, pasma GCS, migracja dawek, panel UI), `tests/perf.test.js` (20 000 ticków < 250 ms, determinizm, kolejność losowań), `tests/reference-care.test.js` (`referenceCare` z `tests/support.js` ratuje każdy scenariusz i stan: ciężki/lekki × normalny/trudny; `REPORT=1` wypisuje marginesy).

## Weryfikacja

`npm test` sprawdza interakcje między urazami, lekami, zasobami i ewakuacją, a także dokładanie zawartości bez zmian w silniku i komponentach. `npm run check` sprawdza składnię wszystkich modułów JS. Scenariusze powinny przechodzić test ratunku przy 25-minutowym czasie dojazdu.

## Zegar i monitor na żywo (0.5)

`src/simulation/realtime.js` jest adapterem zegara przeglądarki. Co 200 ms przekazuje do silnika całe sekundy gry, zachowuje ułamki, skaluje przez 1×/2×/4× i ogranicza nadrabianie czasu po przycięciu karty. Adapter nie zna DOM ani fizjologii. Aplikacja wstrzymuje go przy pauzie, ukrytej karcie, otwartym dialogu i trwającej procedurze.

`advanceTime(state, seconds)` w `engine.js` wykonuje kolejne sekundy zwykłego ticka. `src/simulation/monitor.js` zapisuje maksymalnie 60 próbek; ponowny pomiar w tej samej sekundzie zastępuje próbkę zamiast dublować czas. Wyłączenie monitora zatrzymuje tylko zapis i prezentację nowych odczytów — pacjent nadal zmienia stan. `src/ui/live-hud.js` aktualizuje małe pola, wykresy i podtrzymanie bez ponownego renderowania torby, aktywnego pola tekstowego czy menu kontekstowego.

Dodając nowy parametr fizjologiczny, utrzymaj źródło prawdy w `g.phys` (`physio-*.js`) i czytaj go przez `clinicalSnapshot`/selektory, dodaj go do próbki monitora w `monitor.js`, a dopiero potem dodaj wizualizację w `patient.js`. Nie wyliczaj stanu pacjenta w DOM. Nowe wsparcie czasowe rejestruj jako modyfikator w `modifiers.js` lub jako efekt sprzętu; `woundModifiers` stosuje je do urazów, a czas wygaśnięcia należy przechowywać w stanie gry.

Katalog 100 nowych wpisów, ich liczby i powiązania sprawdza [EXPANSION-100.md](EXPANSION-100.md). Testy jednostkowe znajdują się w `tests/engine.test.js`, `tests/expansion.test.js` i `tests/realtime.test.js`. Dodatkowa regresja UI: `tests/browser_expansion.py`.

## Poziomy stół i interakcje (0.3)

`src/ui/body-scene.js` buduje anatomiczny outline, rany, lokalne zabezpieczenia i przewody. Scena nie zawiera rastrowej grafiki pacjenta. `BODY_RIG` i `BODY_PARTS` w `src/content/body.js` definiują kanoniczne współrzędne 1000×1500; transformacja ustawia ciało poziomo, z głową po lewej. Każdy segment ma `base`/`clip` (patrz „Ciało i poradnik”), `anchor`, `device` i ewentualnie `stasis`/`splint`; `vascular: true` dopuszcza dostęp IV.

`src/ui/body-interactions.js` sprowadza PPM, dotyk, klawiaturę, wybór przedmiotu oraz HTML drag/drop do wspólnych callbacków. Menu jest osobnym komponentem `context-menu.js`, a jego pozycje powstają z katalogu przez `context-actions.js`. Otwarcie menu nie wykonuje czynności i nie przesuwa czasu.

W katalogu przedmiotu można ustawić:

| Pole | Znaczenie |
| --- | --- |
| `regions: ['leftArm', 'rightArm']` | Dozwolone miejsca użycia (grupy lub segmenty) |
| `scope: 'wound'` | Czynność dotyczy konkretnego urazu, nie całej okolicy |
| `contextTags: ['wound']` | Dopasowanie do tagów rany w menu |
| `contextLabel` | Opis polecenia w menu, np. „Załóż opatrunek” |

Bez tych pól przedmiot nadal pojawi się w torbie i będzie korzystał z ogólnych zasad. `act(state, id, partId, injuryId)` przyjmuje opcjonalny identyfikator rany. Identyfikator musi należeć do wybranej okolicy. Dla przedmiotów bez `scope: 'wound'` interfejs przekazuje samo miejsce: np. staza obejmuje kończynę niezależnie od klikniętej rany.

Rany mają własne `treatments`; założenie opatrunku jednej rany nie zabezpiecza kolejnej. `body[part].treatments` przechowuje zabezpieczenia okolicy oraz podsumowanie ostatnich aplikacji. Fizjologia krwawienia czyta lokalne zabezpieczenie urazu i stazę całej kończyny.

## Grafika założonego sprzętu

`src/ui/visuals.js` zawiera rejestry `WOUND_ART` i `DEVICE_ART`, używane też do ikon torby. `src/content/presentation.js` definiuje `PLACED_VISUALS`: jaki efekt ma być widoczny, czy w miejscu rany czy na całej okolicy, oraz którego punktu zaczepienia i rysunku użyć.

Warianty wyposażenia używające tego samego efektu dziedziczą jego rysunek. Dla nowej mechaniki dopisz efekt, definicję wizualizacji i — jeśli potrzebny — nowy rysunek SVG. Nie trzeba dodawać osobnego event handlera ani pozycji menu. Dla nowych urazów bez rysunku działa neutralny znacznik; opcjonalna pozycja w `WOUND_ART` nada mu własny wygląd. Style stołu, menu i torby są w `src/ui/operating-surface.css`.

## Lokalny przepływ IV

`src/simulation/vascular.js` jest wspólnym źródłem informacji o dostępie i przepływie: `hasAccess`, `hasFlow`, `accessSites`, `accessStatus`. Stan wenflonu to `body[part].ivAt`. Nie ma globalnej flagi „pacjent ma IV”. Ręce mają niezależne dostępy, a w jednej ręce może być kilka wenflonów (łokieć, przedramię, dłoń).

Staza odcina wenflony na tym samym lub dalszym segmencie ręki (`order` ≥ segmentu stazy); wenflon w łokciu pozostaje drożny przy stazie na przedramieniu. Efekt założenia stazy zachowuje istniejący dostęp, ale `hasFlow` zwraca false. Próba podania leku lub płynu przez odcięty dostęp zużywa zasób i czas, bez efektu ogólnoustrojowego. Trwający wlew ma `site`, a każda sekunda fizjologii ponownie sprawdza przepływ. Lek już dostarczony do krążenia nie jest retroaktywnie wyłączany. Stan przepływu jest widoczny przy wenflonie i w panelu aktywnego sprzętu.

Odczyt starszego zapisu v2 przenosi dawną globalną flagę IV do prawej ręki, dodaje lokalne pola i przenosi stare opatrunki do urazów. Jest to jawna migracja zachowująca wcześniejszą rozgrywkę.

## Procedury manualne i ekran gry (0.4)

Interfejs gry renderuje `src/ui/game-screen.js`: pasek zgłoszenia, stół, torba, monitor oraz szybkie działania. `src/app.js` utrzymuje stan i podpina zdarzenia. Dziennik jest otwieranym panelem; nie powiększa głównego ekranu. Układ na komputerze korzysta z wysokości okna, a na telefonie przechodzi w pion. Motyw i układ są w `src/style.css`, scena w `src/ui/operating-surface.css`, a styl procedury w `src/ui/procedures/procedure.css`.

### Kontrakt nowej minigry

1. W definicji sprzętu ustaw `procedure: 'identyfikator'`.
2. W `src/simulation/procedures.js` zarejestruj `{validate(input), resolve(game, part, input)}` w `PROCEDURES`. Resolver jest czysty: zwraca wynik, nie mutuje gry.
3. W `src/ui/procedures/index.js` dodaj widok do `PROCEDURE_VIEWS`. Widok dostaje `(game, part, injuryId)` i zwraca Promise z danymi próby lub `null`, gdy anulowano przed rozpoczęciem.
4. Efekt wyposażenia odbiera rozstrzygnięty wynik jako `procedure` w `({g, item, target, injuryId, procedure})`.

Aplikacja sama uruchamia przypisany widok i przekazuje jego dane do `act(state, itemId, partId, injuryId, procedureInput)`. Silnik odrzuca czynność z wymaganą procedurą, jeśli danych brak lub walidacja zawiedzie. Sam interfejs nie nadaje sobie wyniku „sukces”. Rozszerzenie o nowy rodzaj procedury wymaga wpisów w rejestrach i własnego widoku, bez zmian w głównej obsłudze akcji.

### Wkłucie IV

`src/content/procedures.js` zawiera geometrię naczyń w przestrzeni minigry 800×300 oraz katalog miejsc: łokieć, przedramię i dłoń. Każde miejsce definiuje potencjał przepływu, tolerancję trafienia oraz cel i margines wprowadzenia. Te wartości są balansem gry.

Dane próby: `{point: {x, y}, approach: 0..100, depth: 0..1, aborted: boolean}`. Resolver ocenia odległość punktu od odcinków naczynia, prowadzenie i wprowadzenie. Ocena jest deterministyczna. Pomyślne wkłucie zapisuje:

- `body[part].ivQuality`: jakość techniki 0..1.
- `body[part].ivPlacement`: identyfikator miejsca, punkt w minigrze i pozycję na ciele.
- `body[part].ivAttempts`: historię wyników prób.

Niepowodzenie lub przerwanie rozpoczętej próby zużywa zestaw i czas oraz dodaje miejscowe stłuczenie w punkcie wkłucia. Anulowanie przed wprowadzaniem zwraca `null` i nie wykonuje akcji. Wprowadzanie następuje wyłącznie podczas przytrzymania przycisku/Spacji; pętla `requestAnimationFrame` jest sprzątana przy zakończeniu. Przełączenie karty podczas rozpoczętej próby traktowane jest jak przerwanie. Odczyt/wybór sprzętu nie uruchamia czasu symulacji.

### Jakość a rzeczywisty efekt

`flowEfficiency` w module `vascular.js` jest wspólnym źródłem aktualnej skuteczności: technika × potencjał miejsca × czynnik krążenia. Staza zawsze daje zero. Starsze dostępy bez informacji o jakości zachowują poprzedni przepływ, aby migracja nie pogarszała rozpoczętych gier.

Fizjologia w każdej sekundzie mnoży tempo wlewu przez aktualny przepływ. Lek IV zapisuje w dawce `amount` (dostarczenie z chwili podania); krzywe Hilla sprawiają, że częściowe dostarczenie słabiej wpływa na kanały nasycone (analgezja) niż na progowe (depresja oddechu). Selektory skalują działanie przeciwbólowe, wpływ na krwawienie, efekty oddechowe i obciążenie leku, zamiast tylko wyświetlać procent w UI. Już dostarczony lek nie traci działania przez późniejszą stazę. Usunięcie dostępu kończy jego wlewy i pozwala na kolejną próbę; nie usuwa podanych wcześniej leków.

### Minigry stazy, RKO, tamponady i opatrunku klatki

Cztery kolejne procedury korzystają z tego samego kontraktu. Parametry są w `src/content/procedures.js` (`TOURNIQUET_PROCEDURE`, `CPR_PROCEDURE`, `PACKING_PROCEDURE`, `SEAL_PROCEDURE`), czyste walidatory i resolvery w `src/simulation/procedures.js`, widoki w `src/ui/procedures/*-minigame.js`. Wspólny cykl życia dialogu (`openSession` w `src/ui/procedures/shell.js`) sprząta pętlę `requestAnimationFrame`, timery i wszystkie nasłuchy w jednym `finish`. Escape, zamknięcie dialogu lub ukrycie karty przed wynikiem zwraca `null`: nic nie jest zużywane i czas nie płynie. Każdy widok ma region `role="status"` z komunikatem dla czytników ekranu, pełną obsługę klawiatury (Spacja/Enter/strzałki) i wskaźnika (pointer capture przy przytrzymaniu) oraz wariant `prefers-reduced-motion`.

| Procedura | Przedmiot | Dane próby | Wynik i efekt |
| --- | --- | --- | --- |
| `tourniquet` | `tourniquet` | `{tension: 0..1, timeMs, aborted}` | Pole `window` [.62, .84] → `quality` 1 (pełne odcięcie). Poniżej → `quality = .9·tension/.62`; krwawienie dystalne × (1 − quality). Powyżej → `quality` 1 i `strain` 0..1, ból +2,5·strain, wpis w dzienniku. Zapis: `body[part].tourniquetQuality`, `tourniquetStrain`. |
| `cpr` | `cpr` | `{intervalsMs: number[14], depths: number[15], aborted}` | Trafność tempa (pole 100–120/min, tolerancja 30/min) × trafność głębokości (pole .55–.85, tolerancja .3). `benefit = .4 + .6·quality`; podczas czynności budżet zatrzymania maleje o `1 − .75·benefit` na sekundę (dawniej stałe .25). |
| `packing` | `hemostatic` (każdy z efektem `hemostatic`) | `{filled: 0..1, pressureMs, aborted}` | `quality = filled · (.35 + .65·min(1, pressureMs/3000))`. Mnożnik krwawienia gazy `.05 + .45·(1 − quality)`. Zapis: `injury.packQuality`. |
| `seal` | `seal` | `{phase: 0..1, attempts: 1..2, aborted}` | Okno końca wydechu [.62, .88] → `quality` 1. Poza nim `.3 + .4·trafność` (tolerancja .4). Ubytek tlenu z rany × (1 − quality), krwawienie × (1 − .9·quality). Druga próba dodaje `extraTime` 10 s do czasu czynności. Zapis: `injury.sealQuality`. |

Resolvery zwracają także `score` (ocena techniki, rośnie monotonicznie z jakością wykonania); dla stazy i opatrunku w polu docelowym `quality` wynosi 1, a `score` maleje od 1 w środku pola do .7 przy krawędzi. Wynik może mieć `extraTime` — silnik dolicza go do czasu czynności. Staza z `tourniquetQuality < .5` nie odcina przepływu IV ani tętna obwodowego (`tourniquetOver(g, part, .5)`), a `tourniquetQuality(g, part)` w `vascular.js` zwraca najlepsze odcięcie nad segmentem dla krwawienia. Luźną stazę (`quality < 1`) można dokręcić ponownie kolejnym zestawem; czas pierwszego założenia zostaje. Układ ukrytych kieszeni tamponady jest tylko prezentacją, ziarnisty po scenariuszu, segmencie i ranie.

`restoreGame` przyjmuje nowe pola opcjonalnie (skończone 0..1, inaczej zapis jest odrzucany), bez zmiany wersji. Brak pola oznacza pełną skuteczność (`?? 1`), więc starsze zapisy działają jak przed 0.8. Przejściowy `g.cprBenefit` jest usuwany po czynności.

### Wyłączone minigry

`stats.minigames: 'on' | 'off'` (domyślnie `'on'`; brak lub błędna wartość to `'on'`) przełącza się w panelu dyżuru. Przy `'off'` `app.js` pomija widok i przekazuje `autoInput(id, g, part)` z `simulation/procedures.js`: deterministyczną, poprawną, przeciętną próbę. Wyniki: staza `tension .63` (w polu, pełne odcięcie, `score` ≈ .73); RKO odstępy 600 ms (100/min) i głębokość .46 → `quality` .70, `benefit` .82; tamponada `filled .8`, ucisk 2400 ms → `quality` ≈ .70 (mnożnik krwawienia ≈ .19); opatrunek `phase .64` (w polu, pełna szczelność, `score` ≈ .75); IV środek zakresu miejsca (y = 140), prowadzenie 42 i głębokość docelowa → jakość ≈ .88 (łokieć), .94 (przedramię), .98 (dłoń). Testy jednostkowe używają tego samego `autoInput` przez `tests/support.js`.
