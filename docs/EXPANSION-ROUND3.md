# Rozszerzenie, runda 3 (0.10): 100 pozycji katalogu

Dodatki są wyłącznie katalogowe: korzystają z istniejących efektów (`stabilize`, `support`, `assess`, `tourniquet`, `hemostatic`, `medicine`), tagów, tabel fizjologii urazów i kluczy grafiki (`WOUND_ART`, `DEVICE_ART`, `ITEM_ICONS`). Wartości są balansem fikcyjnej gry, nie zaleceniami medycznymi. Manifest: [`expansion-round3.json`](expansion-round3.json). Testy: `tests/expansion3.test.js`.

| Kategoria | Dodano | Łącznie |
| --- | ---: | ---: |
| Urazy | 20 | 77 |
| Stany poszkodowanego | 25 | 76 |
| Zgłoszenia | 15 | 57 |
| Wyposażenie | 15 | 55 |
| Leki | 10 | 26 |
| Poradniki | 15 | 64 |

## Nowe urazy

1. **Złamanie palca** — `fingerFracture` (`fracture`)
2. **Pęcherze po oparzeniu** — `burnBlister` (`external`, `wound`, `burn`)
3. **Głęboka drzazga** — `deepSplinter` (`external`, `wound`, `foreignBody`)
4. **Złamanie żuchwy** — `jawFracture` (`fracture`, `facial`)
5. **Oderwany paznokieć** — `nailAvulsion` (`external`, `wound`)
6. **Rana szyi z krwawieniem węzłowym** — `neckLaceration` (`external`, `wound`, `massive`, `junctional`)
7. **Rana pachwiny z krwawieniem węzłowym** — `groinBleed` (`external`, `wound`, `massive`, `junctional`)
8. **Zdarcie skóry przedramienia** — `degloving` (`external`, `wound`, `massive`)
9. **Zerwany płat skóry głowy** — `scalpAvulsion` (`external`, `wound`)
10. **Otwarte złamanie czaszki** — `openSkullFracture` (`external`, `wound`, `headTrauma`)
11. **Stłuczenie śledziony** — `spleenContusion` (`internal`)
12. **Pęknięcie śledziony** — `spleenRupture` (`internal`)
13. **Ukryty krwiak w klatce piersiowej** — `tamponadeBleed` (`internal`, `thoracic`)
14. **Narastający ucisk w przedramieniu** — `compartmentSyndrome` (`internal`, `compartment`)
15. **Niestabilna klatka piersiowa** — `flailChest` (`internal`, `thoracic`)
16. **Niestabilne złamanie miednicy** — `pelvicFracture` (`internal`, `fracture`, `crush`)
17. **Wtórne wychłodzenie po ogrzaniu** — `hypothermicAfterdrop` (`cold`, `afterdrop`)
18. **Hiperwentylacja** — `hyperventilation` (`neuro`, `anxiety`)
19. **Kolka nerkowa** — `renalColic` (`nausea`, `colic`)
20. **Zaburzenie przy bardzo wysokiej glukozie** — `ketoacidosis` (`dehydration`, `glucoseHigh`)

## Nowe stany poszkodowanego

1. **Palec przytrzaśnięty drzwiami** — `doorFinger` (Drobne urazy)
2. **Pęcherze i drzazga w dłoniach** — `blisterKitchen` (Drobne urazy)
3. **Złamana żuchwa i krwawienie z nosa** — `jawPunch` (Drobne urazy)
4. **Drzazga w dłoni i skręcony nadgarstek** — `splinterWrist` (Drobne urazy)
5. **Rana szyi po szkle** — `neckGlass` (Poważne obrażenia zewnętrzne)
6. **Krwotok z pachwiny** — `groinCrash` (Poważne obrażenia zewnętrzne)
7. **Zdarta skóra przedramienia** — `degloveRoller` (Poważne obrażenia zewnętrzne)
8. **Zerwany płat skóry głowy** — `scalpFarm` (Poważne obrażenia zewnętrzne)
9. **Otwarte złamanie czaszki** — `skullFall` (Poważne obrażenia zewnętrzne)
10. **Opóźnione krwawienie ze śledziony** — `quietSpleen` (Zagadka diagnostyczna)
11. **Ukryte krwawienie w klatce** — `quietChest` (Zagadka diagnostyczna)
12. **Narastający ucisk w przedramieniu** — `tightCast` (Zagadka diagnostyczna)
13. **Ukryte złamanie miednicy** — `hiddenPelvis` (Zagadka diagnostyczna)
14. **Głęboki oddech przy wysokiej glukozie** — `sweetBreath` (Zagadka diagnostyczna)
15. **Hiperwentylacja** — `panicBreath` (Stany nagłe medyczne)
16. **Kolka nerkowa** — `colicBus` (Stany nagłe medyczne)
17. **Napad kaszlu i duszności** — `coughNight` (Stany nagłe medyczne)
18. **Niska glukoza w nocy** — `nightHypo` (Stany nagłe medyczne)
19. **Wtórne wychłodzenie po ogrzaniu** — `afterdropHut` (Środowisko i wypadki)
20. **Oparzenia parą i wdychanie dymu** — `steamBoiler` (Środowisko i wypadki)
21. **Niestabilna klatka po przygnieceniu** — `crushedRibs` (Środowisko i wypadki)
22. **Zdarcie skóry i ukryte krwawienie w brzuchu** — `sawSpleen` (Wielomiejscowe / mieszane)
23. **Rana głowy, miednica i palec** — `ridgeFall` (Wielomiejscowe / mieszane)
24. **Niestabilna klatka, drzazga i oparzenie** — `blastFlail` (Wielomiejscowe / mieszane)
25. **Żuchwa, oddech i ucisk w przedramieniu** — `busCrash` (Wielomiejscowe / mieszane)

## Nowe zgłoszenia

1. **Rozbita butelka w barze** — `bottleNeck`
2. **Zahaczenie o drut na budowie** — `wireGroin`
3. **Rękawica wciągnięta w walcarkę** — `rollerGlove`
4. **Upadek z drabiny przy dachu** — `ladderScalp`
5. **Wypadek na hulajnodze elektrycznej** — `crashSkull`
6. **Rowerzysta po zderzeniu z płotem** — `bikeSpleen`
7. **Upadek z konia na rozległym polu** — `pelvisHorse`
8. **Przygniecenie ręki paletą** — `palletForearm`
9. **Uderzenie w klatkę po wybuchu gazu** — `blastRibs`
10. **Niewielka rana po bójce** — `knifeChest`
11. **Drzwi chłodni i gorąca para** — `doorHands`
12. **Drzazga i oparzenie w stolarni** — `steamKitchen`
13. **Wyniesiony z zaspy do chaty** — `cabinCold`
14. **Ból boku w poczekalni dworca** — `sideColic`
15. **Zmęczony kierowca na stacji** — `sugarHaze`

## Nowe wyposażenie

1. **Staza węzłowa (pachwina)** — `junctionalTourniquet`
2. **Opaska uciskowa na szyję** — `neckPressureWrap`
3. **Pas miednicy SAM** — `samPelvicSling`
4. **Szyna na palec** — `fingerSplint`
5. **Tampon do nosa** — `nasalTampon`
6. **Duży koc ratunkowy** — `blanketXL`
7. **Paski zamykające ranę** — `closureStrips`
8. **Nożyce ratownicze** — `traumaShears`
9. **Stabilizator głowy** — `headImmobilizer`
10. **Chemiczny okład chłodzący** — `coldPack`
11. **Opatrunek na pęcherze** — `blisterDressing`
12. **Pas stabilizujący żebra** — `ribSupportPad`
13. **Bandaż unieruchamiający żuchwę** — `jawBandage`
14. **Szeroka staza taktyczna** — `wideTourniquet`
15. **Duża gaza hemostatyczna** — `hemostaticXL`

## Nowe leki

1. **Diklofenak** — `diclofenac`
2. **Tramadol** — `tramadol`
3. **Midazolam** — `midazolam`
4. **Gaz przeciwbólowy do wdychania** — `inhaledAnalgesic`
5. **Deksametazon** — `dexamethasone`
6. **Klemastyna** — `clemastine`
7. **Napój glukozowy** — `glucoseDrink`
8. **Ketorolak** — `ketorolac`
9. **Drotaweryna** — `drotaverine`
10. **Budezonid** — `budesonide`

## Nowe poradniki

1. **Krwawienie węzłowe: gdzie staza nie pasuje** — `r3-junctional`
2. **Szyja i pachwina: kolejność działań** — `r3-neck-groin`
3. **Zdarcie skóry: staza nad raną** — `r3-degloving`
4. **Rana głowy a uraz czaszki** — `r3-scalp-skull`
5. **Opóźnione krwawienie wewnętrzne** — `r3-spleen-delay`
6. **Ukryty krwiak w klatce** — `r3-hidden-chest`
7. **Napięte przedramię: ból bez rany** — `r3-compartment`
8. **Niestabilna klatka i pas stabilizujący** — `r3-flail-support`
9. **Wtórne wychłodzenie** — `r3-afterdrop`
10. **Zagadki: jak czytać mylący opis** — `r3-puzzle-clues`
11. **Drobne urazy: kolejność i oszczędzanie zapasów** — `r3-small-injuries`
12. **Ból bez urazu: kolka i hiperwentylacja** — `r3-colic-vs-bleed`
13. **Wybór leku przeciwbólowego** — `r3-analgesic-choice`
14. **Uspokojenie i sedacja** — `r3-sedation`
15. **Warianty sprzętu i nożyce ratownicze** — `r3-supply-variants`

## Pominięte i zastąpione

- Odma prężna: w grze nie ma sprzętu ani mechaniki odbarczenia, więc zamiast niej jest niestabilna klatka (`flailChest`) z pasem `ribSupportPad`.
- Rurka nosowo-gardłowa: wymagałaby osobnej reguły tolerancji w silniku (rurka ustno-gardłowa ma ją wpisaną na stałe), więc zastąpiono ją wariantami stazy, gazy i pasa miednicy.
- Węgiel aktywny i magnez: żaden istniejący kanał farmakologii ich nie wyraża, więc zastąpiono je ketorolakiem, drotaweryną i budezonidem.
