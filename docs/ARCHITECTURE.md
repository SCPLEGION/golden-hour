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

Dopisz rekord do `MEDICINES`. Wymagane pola poza wspólnymi: `effect: 'medicine'`, `route`, `onset` i `duration` (sekundy gry), `description`, `risk`. Karta, podanie, zapas oraz czas działania pojawią się automatycznie. Dostępne deklaratywne modyfikatory:

| Pole | Efekt |
| --- | --- |
| `painRelief: 2` | Zmniejsza ból podczas aktywnego działania |
| `bleedingMultiplier: 0.75` | Mnoży utratę krwi przez podany współczynnik |
| `relievesTag: 'bronchospasm'` | Ogranicza ubytek tlenu z urazu z tym tagiem |
| `pulseIncrease: 10` | Zwiększa zmierzone tętno |
| `respiratoryBurden: 0.45` | Obciąża oddychanie po rozpoczęciu działania |

Ponowne podanie aktywnej/oczekującej porcji ma wspólną karę toksyczności. Korzyści tego samego leku nie sumują się, ale obciążenie oddechowe może się kumulować. Alergie są listą identyfikatorów leków w scenariuszu. To umowne porcje i balans gry, nie jednostki kliniczne.

Jeżeli nowy lek potrzebuje innego zachowania niż powyższe, dodaj nowy efekt lub nowy modyfikator w module symulacji; nie wpisuj warunków nazw leków do interfejsu.

## Nowy uraz

Dodaj definicję do `src/content/injuries.js`. `visible: null` ukrywa go do zbadania właściwej okolicy. `finding` jest wynikiem badania. `bleed` to utrata punktów krwi na sekundę, `oxygenLoss` — tlenu. `pain` to poziom bólu. Tagi podłączają istniejące mechaniki:

- `external`, `wound`: opatrunki, gaza; staza odcina zewnętrzne krwawienie kończyny.
- `massive`: zwykły opatrunek ogranicza utratę krwi słabiej.
- `fracture`: szyna zmniejsza ból, lecz nie krwawienie.
- `internal`: brak kontroli przez zewnętrzne opatrunki.
- `airway`, `chest`, `bronchospasm`: odpowiednie zabezpieczenie usuwa powiązany ubytek tlenu.

Nie pokazuj ukrytych danych w UI: używaj selektorów `visibleInjuries` i `bodyObservation`.

## Nowy scenariusz

Dopisz rekord do `src/content/scenarios.js`: `id`, `title`, `scene`, `quote`, `history`, `injuries: [[partId, injuryId], ...]`, początkowe `blood` i `oxygen`, oraz `lesson`. Opcjonalne `allergies` to identyfikatory leków. Kilka urazów może dotyczyć tej samej części ciała. Generator losuje też dodatkowe stłuczenie i dojazd 15–25 minut. Dodanie scenariusza nie wymaga zmiany UI.

## Ciało i poradnik

Okolice ciała to `src/content/body.js`. Od 0.7 ciało składa się z 23 segmentów (`BODY_PARTS`): `head`, `face`, `neck`, `chest`, `abdomen`, `pelvis`, `back` oraz po stronie prawej i lewej `…UpperArm`, `…Elbow`, `…Forearm`, `…Hand`, `…Thigh`, `…Knee`, `…Shin`, `…Foot` (np. `rightElbow`, `leftFoot`). Wybór na sylwetce i liście buduje się z tych samych danych. Nowa okolica musi mieć unikalny identyfikator.

Pola segmentu:

| Pole | Znaczenie |
| --- | --- |
| `group` | Grupa: `head` (głowa, twarz, szyja), `chest`, `abdomen` (brzuch, miednica), `back`, `rightArm`/`leftArm`, `rightLeg`/`leftLeg` |
| `order` | Kolejność od proksymalnej 0 do dystalnej 3 w kończynie; poza kończynami 0 |
| `limb` | Segment kończyny (szyna, `limbOnly`) |
| `tourniquet` | Dozwolona staza: ramię, przedramię, udo, podudzie |
| `vascular`, `ivSite` | Dostęp IV: łokieć, przedramię, dłoń; `ivSite` to identyfikator miejsca z `IV_PROCEDURE.sites` |
| `base`, `clip: [y0, y1]` | Kształt bazowy i pas wysokości w układzie portretowym |
| `anchor`, `device`, `stasis`, `splint` | Punkty zaczepienia ran i sprzętu |

Geometria nie ma osobnych konturów segmentów. `BODY_OUTLINES` zawiera siedem dawnych kształtów (klucze `head`, `chest`, `abdomen`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`) i to one tworzą rysowany obrys. `body-scene.js` rysuje klikany region segmentu jako kształt bazowy przycięty `clipPath` (`clip-<id>`, prostokąt x 0–1000, y `clip`). Pasy: głowa 40–112 / twarz 112–212 / szyja 212–290; brzuch 520–655 / miednica 655–800; klatka cała; ręka 285–480 / 480–565 / 565–760 / 760–880; noga 700–1000 / 1000–1110 / 1110–1378 / 1378–1465. Granice pasów są rysowane cienkimi liniami `segment-divider` przyciętymi do obrysu (`clip-base-<id>`). Plecy nie mają kształtu w widoku z przodu: są osobną wstawką `body-back-inset` (`BACK_INSET`, własny układ współrzędnych) przy stopach, w prawym górnym rogu stołu; rany pleców rysują się w tej wstawce.

`regions` przedmiotu może wymieniać identyfikatory grup lub segmentów (`matchesRegion`): `['leftArm']` obejmuje cały lewy kończynowy pas, `['head']` także twarz i szyję, `['abdomen']` także miednicę. Mechanika zależna od położenia:

- Staza zatrzymuje zewnętrzne krwawienie urazów tej samej grupy o `order` ≥ jej segmentu i odcina przepływ wenflonów poniżej (`tourniquetOver` w `vascular.js`, używane przez krwawienie, przepływ IV, badanie i ocenę perfuzji). Na dłoni, stopie, stawie i tułowiu jest odrzucana.
- Szyna działa na złamania własnego segmentu i sąsiednich (`order` ±1) tej samej kończyny.
- Wenflon zakłada się na segment naczyniowy; minigra ma z góry ustawione miejsce (`ivSite`), a resolver odrzuca punkt spoza niego. Leki i płyny `requires: 'iv'` podane na dowolny segment ręki używają wenflonu tego segmentu, a jeśli go nie ma — drożnego wenflonu tej samej ręki (`ivSiteFor`).

Zgodność: `LEGACY_PARTS` mapuje dawne `rightArm`/`leftArm` na `…Forearm` oraz `rightLeg`/`leftLeg` na `…Thigh`; `resolvePart(id)` zwraca segment dla nowych i dawnych identyfikatorów (`head`, `chest`, `abdomen` pozostają). Scenariusze mogą nadal używać dawnych identyfikatorów — `createGame` i `validateCatalogs` je rozwiązują — ale dokładniejsze miejsca (np. `face` dla oka, `rightFoot` dla kostki) są preferowane. `act`, `itemUnavailable` i `contextActions` także przyjmują dawne identyfikatory. `restoreGame` przenosi klucze `g.body` (wraz z `ivAt`, `ivPlacement`, `ivQuality`, `ivAttempts`, `treatments`) oraz `injuries[].part`, `infusions[].site`, `medications[].site`, `supports[].target`, `assessments[].part` bez zmiany wersji stanu i inicjalizuje nowe segmenty.

Poradniki to `src/content/guides.js`. Dodaj `id`, `title`, `text` i opcjonalne `links: [[nazwa, url]]`. Biblioteka oraz wyszukiwanie obejmą wpis automatycznie.

## Zapis i kompatybilność

Stan v2 jest zapisany pod kluczem `field-medic-v2`, niezależnie od prototypu v1. `restoreGame` waliduje stan przed wznowieniem; uszkodzone lub niezgodne dane prowadzą do nowej gry. Dodawane pozycje wyposażenia i części ciała są inicjalizowane przy odczycie istniejącego zapisu. Przy usuwaniu identyfikatorów, zmianie znaczenia pól lub fizjologii należy dodać jawną migrację albo podnieść wersję stanu. Identyfikatory treści traktuj jako stabilne.

## Weryfikacja

`npm test` sprawdza interakcje między urazami, lekami, zasobami i ewakuacją, a także dokładanie zawartości bez zmian w silniku i komponentach. `npm run check` sprawdza składnię wszystkich modułów JS. Scenariusze powinny przechodzić test ratunku przy 25-minutowym czasie dojazdu.

## Zegar i monitor na żywo (0.5)

`src/simulation/realtime.js` jest adapterem zegara przeglądarki. Co 200 ms przekazuje do silnika całe sekundy gry, zachowuje ułamki, skaluje przez 1×/2×/4× i ogranicza nadrabianie czasu po przycięciu karty. Adapter nie zna DOM ani fizjologii. Aplikacja wstrzymuje go przy pauzie, ukrytej karcie, otwartym dialogu i trwającej procedurze.

`advanceTime(state, seconds)` w `engine.js` wykonuje kolejne sekundy zwykłego ticka. `src/simulation/monitor.js` zapisuje maksymalnie 60 próbek; ponowny pomiar w tej samej sekundzie zastępuje próbkę zamiast dublować czas. Wyłączenie monitora zatrzymuje tylko zapis i prezentację nowych odczytów — pacjent nadal zmienia stan. `src/ui/live-hud.js` aktualizuje małe pola, wykresy i podtrzymanie bez ponownego renderowania torby, aktywnego pola tekstowego czy menu kontekstowego.

Dodając nowy parametr fizjologiczny, utrzymaj źródło prawdy w `physiology.js`/`selectors.js`, dodaj go do próbki monitora w `monitor.js`, a dopiero potem dodaj wizualizację w `patient.js`. Nie wyliczaj stanu pacjenta w DOM. Nowe wsparcie czasowe rejestruj jako modyfikator w `modifiers.js` lub jako efekt sprzętu; `woundModifiers` stosuje je do urazów, a czas wygaśnięcia należy przechowywać w stanie gry.

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
3. W `src/ui/procedures/index.js` dodaj widok do `PROCEDURE_VIEWS`. Widok zwraca Promise z danymi próby lub `null`, gdy anulowano przed rozpoczęciem.
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

Fizjologia w każdej sekundzie mnoży tempo wlewu przez aktualny przepływ. Lek IV zapisuje `delivery` z chwili podania. Selektory skalują działanie przeciwbólowe, wpływ na krwawienie, efekty oddechowe i obciążenie leku, zamiast tylko wyświetlać procent w UI. Już dostarczony lek nie traci działania przez późniejszą stazę. Usunięcie dostępu kończy jego wlewy i pozwala na kolejną próbę; nie usuwa podanych wcześniej leków.
