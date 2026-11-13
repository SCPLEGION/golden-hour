# Rozszerzenie, runda 4 (0.11): 100 pozycji katalogu

Większość dodatków jest katalogowa: korzystają z istniejących efektów (`stabilize`, `support`, `tourniquet`, `hemostatic`, `medicine`, `airway`), tagów, tabel fizjologii urazów i kluczy grafiki (`WOUND_ART`, `DEVICE_ART`, `ITEM_ICONS`). Dwie małe zmiany silnika (odma prężna z odbarczeniem igłą i rurka nosowo-gardłowa) liczą się do tych 100. Wartości są balansem fikcyjnej gry, nie zaleceniami medycznymi. Manifest: [`expansion-round4.json`](expansion-round4.json). Testy: `tests/expansion4.test.js`.

| Kategoria | Dodano | Łącznie |
| --- | ---: | ---: |
| Urazy | 20 | 97 |
| Stany poszkodowanego | 20 | 96 |
| Zgłoszenia | 15 | 72 |
| Wyposażenie | 15 | 70 |
| Leki | 10 | 36 |
| Poradniki | 20 | 84 |

## Nowe urazy

1. **Odma prężna opłucnej** — `tensionPneumo` (`internal`, `tension`)
2. **Wybity ząb** — `toothAvulsion` (`external`, `wound`)
3. **Rozerwane ucho** — `earLaceration` (`external`, `wound`)
4. **Rana powieki** — `eyelidCut` (`external`, `wound`)
5. **Rozcięta warga** — `lipLaceration` (`external`, `wound`)
6. **Skręcony kciuk** — `thumbSprain` (`sprain`)
7. **Złamanie obojczyka** — `clavicleFracture` (`fracture`)
8. **Zwichnięcie rzepki** — `kneecapDislocation` (`fracture`, `sprain`)
9. **Zerwane ścięgno Achillesa** — `achillesRupture` (`sprain`)
10. **Rozległa rana brzucha z wypadnięciem narządów** — `eviscerationWound` (`external`, `wound`)
11. **Narastający krwiak pod oponą twardą** — `subduralHematoma` (`headTrauma`)
12. **Złamanie kości udowej** — `femurFracture` (`fracture`)
13. **Odma opłucnowa prosta** — `simplePneumo` (`internal`, `pneumo`)
14. **Oparzenie dróg oddechowych** — `airwayBurn` (`airway`, `burn`)
15. **Uraz gałki ocznej** — `eyeInjury` (`eyes`)
16. **Uszkodzenie tętnicy ramiennej** — `brachialArtery` (`external`, `wound`, `massive`)
17. **Zmiażdżona dłoń** — `crushedHand` (`external`, `wound`, `fracture`)
18. **Upojenie alkoholowe** — `alcoholIntox` (`poisoning`)
19. **Odmrożone palce dłoni** — `frostbiteFingers` (`cold`)
20. **Stłuczenie nerki** — `kidneyInjury` (`internal`)

## Nowe stany poszkodowanego

1. **Wybity ząb i rozcięta warga** — `toothBrawl` (Drobne urazy)
2. **Skręcony kciuk i otarcie** — `thumbSki` (Drobne urazy)
3. **Rozerwane ucho i rana powieki** — `earPiercing` (Drobne urazy)
4. **Przecięta tętnica ramienia** — `brachialCut` (Poważne obrażenia zewnętrzne)
5. **Zmiażdżona dłoń w prasie** — `crushPress` (Poważne obrażenia zewnętrzne)
6. **Rana brzucha z wypadnięciem narządów** — `abdoGlass` (Poważne obrażenia zewnętrzne)
7. **Cichy pacjent z narastającą dusznością** — `calmTension` (Zagadka diagnostyczna)
8. **Pozorna poprawa po uderzeniu w głowę** — `lucidHead` (Zagadka diagnostyczna)
9. **Ból pleców po upadku** — `quietKidney` (Zagadka diagnostyczna)
10. **Zadyszka po upadku z drabiny** — `quietPneumo` (Zagadka diagnostyczna)
11. **Upojenie alkoholowe i rana głowy** — `barNight` (Stany nagłe medyczne)
12. **Uraz oka i szybki oddech** — `panicEye` (Stany nagłe medyczne)
13. **Niska glukoza i alkohol** — `diabeticDrunk` (Stany nagłe medyczne)
14. **Reakcja po użądleniu na pikniku** — `waspPicnic` (Stany nagłe medyczne)
15. **Dym i oparzenie dróg oddechowych** — `fireAirway` (Środowisko i wypadki)
16. **Odmrożone palce i wychłodzenie** — `frostCamp` (Środowisko i wypadki)
17. **Zerwana lina i złamany obojczyk** — `ropeSnap` (Środowisko i wypadki)
18. **Udo, nerka i skręcony kciuk** — `stairFall` (Wielomiejscowe / mieszane)
19. **Rana kłuta, rozcięta warga i powieka** — `stabBrawl` (Wielomiejscowe / mieszane)
20. **Tętnica ramienia, rzepka i ucho** — `quarryAccident` (Wielomiejscowe / mieszane)

## Nowe zgłoszenia

1. **Pchnięcie nożem przed barem** — `knifeBar`
2. **Upadek z drabiny w sadzie** — `ladderFall`
3. **Wypadek na lodowisku** — `hockeyTooth`
4. **Zerwanie ścięgna na boisku** — `sprintTendon`
5. **Ciągnik na zboczu** — `ploughFemur`
6. **Siekiera w lesie** — `axeArm`
7. **Dłoń pod prasą** — `lathePalm`
8. **Rozdarty brzuch w zagrodzie** — `bullGore`
9. **Odłamek szyby w kajaku** — `kayakEar`
10. **Odmrożenia pod szczytem** — `frostSummit`
11. **Cios butelką w karczmie** — `tavernBrawl`
12. **Błysk z palnika w warsztacie** — `torchEye`
13. **Zasypiający po zabawie** — `partyDrunk`
14. **Zwichnięta rzepka na boisku** — `playgroundKnee`
15. **Upadek z rusztowania na budowie** — `scaffoldFall`

## Nowe wyposażenie

1. **Zestaw do odbarczenia odmy prężnej** — `needleDecompression` (efekt `decompress`)
2. **Rurka nosowo-gardłowa** — `nasalAirway` (efekt `airway`)
3. **Szyna trakcyjna uda** — `femurSplint` (efekt `stabilize`)
4. **Ósemka na obojczyk** — `clavicleBrace` (efekt `stabilize`)
5. **Unieruchomienie kolana** — `kneeImmobilizer` (efekt `stabilize`)
6. **But stabilizujący kostkę** — `ankleBoot` (efekt `stabilize`)
7. **Szyna na kciuk** — `thumbSplint` (efekt `stabilize`)
8. **Sztywna osłona oka** — `eyeCup` (efekt `stabilize`)
9. **Opatrunek na ucho** — `earDressing` (efekt `stabilize`)
10. **Wilgotny opatrunek brzuszny** — `abdominalDressing` (efekt `stabilize`)
11. **Zestaw na wybity ząb** — `dentalKit` (efekt `stabilize`)
12. **Worek termiczny (bivak)** — `thermalBivvy` (efekt `support`)
13. **Chemiczne ogrzewacze do rąk** — `handWarmers` (efekt `support`)
14. **Mała staza kieszonkowa** — `pocketTourniquet` (efekt `tourniquet`)
15. **Proszek hemostatyczny** — `hemostaticPowder` (efekt `hemostatic`)

## Nowe leki

1. **Naproksen** — `naproxen` (Doustnie)
2. **Nalbufina** — `nalbuphine` (IV)
3. **Żel z lidokainą** — `lidocaineGel` (Miejscowo)
4. **Terbutalina** — `terbutaline` (Wziewnie)
5. **Glukagon** — `glucagon` (IM)
6. **Prometazyna** — `promethazine` (Doustnie)
7. **Butyloskopolamina** — `butylscopolamine` (IV)
8. **Oksykodon** — `oxycodone` (Doustnie)
9. **Diazepam** — `diazepam` (IV)
10. **Nefopam** — `nefopam` (IV)

## Nowe poradniki

1. **Odma prężna: kiedy klatka dusi pacjenta** — `r4-tension-pneumo`
2. **Zestaw do odbarczenia odmy prężnej** — `r4-needle-decompression`
3. **Rurka nosowo-gardłowa u pacjenta przytomnego** — `r4-nasal-airway`
4. **Oparzenie dróg oddechowych po pożarze** — `r4-airway-burn`
5. **Pozorna poprawa po urazie głowy** — `r4-lucid-interval`
6. **Złamanie kości udowej i ukryta utrata krwi** — `r4-femur`
7. **Uraz nerki po upadku** — `r4-kidney`
8. **Tętnica ramienia: staza w pierwszej minucie** — `r4-brachial-artery`
9. **Rana brzucha z wypadnięciem narządów** — `r4-abdominal-wound`
10. **Zmiażdżona dłoń: opatrunek, szyna i ból** — `r4-crushed-hand`
11. **Złamany obojczyk i unieruchomienie barku** — `r4-clavicle`
12. **Zwichnięta rzepka i unieruchomienie kolana** — `r4-kneecap`
13. **Zerwanie ścięgna Achillesa** — `r4-achilles`
14. **Odmrożone palce: ogrzewanie bez rozcierania** — `r4-frostbite`
15. **Alkohol maskuje urazy** — `r4-alcohol-masks`
16. **Osłona oka bez ucisku** — `r4-eye-protection`
17. **Wybity ząb i rana wargi** — `r4-avulsed-tooth`
18. **Rany ucha i powieki** — `r4-ear-eyelid`
19. **Nowe leki: opioidy, rozkurczowe i uspokajające** — `r4-new-meds`
20. **Nowe warianty sprzętu: osłony, ortezy, ogrzewacze** — `r4-supply-variants`

## Zmiany w silniku (małe)

- **Odma prężna** (`tensionPneumo`, tagi `internal`, `tension`) jest ukryta do badania klatki (albo stetoskopu). W `RESPIRATORY` zapada wentylacja i rośnie przeciek, więc bez odbarczenia saturacja spada i pacjent traci przytomność. Przedmiot `needleDecompression` używa nowego efektu `decompress` (`src/simulation/effects.js`): zapisuje zabieg na urazie, a `reliefOf` w `physio-respiration.js` zdejmuje składowe oddechowe urazu z tagiem `tension`. Efekt dodatkowo wstrzykuje natychmiastową poprawę saturacji istniejącym mechanizmem `applyInsult` (+4 punkty SpO₂). Badanie `assess` klatki wypowiada się o ściszonym oddechu i przesuniętej tchawicy.
- **Rurka nosowo-gardłowa** (`nasalAirway`) używa istniejącego efektu `airway` z flagą `nasal`: pomija tylko regułę tolerancji rurki ustno-gardłowej (`toleratesOPA`), więc pacjent przytomny też ją przyjmie. Dzięki niej oparzenie dróg oddechowych (`airwayBurn`, tag `airway`) da się opanować u pacjenta, który jeszcze reaguje.
- `itemUnavailable`: klucz zabiegu na ranie dla efektu `decompress` to id przedmiotu (jak dla `stabilize`).
- Fizjologia: `NEURO_INJURY` dostał `subduralHematoma` (GCS 13) i `alcoholIntox` (GCS 14).

## Zmiany w testach (generyczne)

- `tests/support.js`: opieka referencyjna odbarcza urazy z tagiem `tension` przed pozostałymi czynnościami, a dla urazu `airway` próbuje rurki ustno-gardłowej i, jeśli pacjent ją odrzuca, nosowo-gardłowej.
- `tests/expansion.test.js`: liczby (72 zgłoszenia, 97 urazów); rdzeń opieki w teście „25-minutowej ewakuacji” odbarcza tag `tension`.
- `tests/conditions.test.js`: rozwiązywanie kroków protokołu zna `tension` i rurkę nosowo-gardłową.
- `tests/expansion3.test.js`: test ratunku wybiera zgłoszenia rundy 3 po id, a nie jako ostatnie 15.
- Kalibracja SpO₂ po 60 s (`physio.respiration.test.js`) wymusiła zaniżenie startowego tlenu zgłoszeń z odmą prężną i stanów z oparzeniem dróg oddechowych.
- Próg reguły Expert (≥ 80%) bez zmian: opieka referencyjna ratuje 161 z 168 uruchomień na profil (96%), a żaden z przegranych przypadków nie pochodzi z rundy 4.

## Pominięte i zastąpione

- Nic z zaplanowanych pozycji nie zostało pominięte. Węgiel aktywny i magnez (brak kanału farmakologii) nadal czekają, a w tej rundzie zastąpiły je m.in. nalbufina, oksykodon i butyloskopolamina.
