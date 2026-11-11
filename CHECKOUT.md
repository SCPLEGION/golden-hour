# Field Medic — checkpoint projektu

Ostatnia aktualizacja: 2026-11-11 · wersja aplikacji: 0.9.0

## Co to jest

Field Medic to lokalna gra przeglądarkowa o opiece nad poszkodowanym do czasu przyjazdu ewakuacji. Gracz jest ratownikiem medycznym przy poziomym stole zabiegowym. Wskazuje część ciała lub ranę, wybiera sprzęt z torby i używa go przez menu kontekstowe, skrót lub przeciągnięcie. Założony sprzęt jest widoczny na sylwetce.

To fikcyjna symulacja gry, nie instruktaż ani narzędzie kliniczne. Dawki, wyniki i działanie leczenia są umownym balansem.

## Aktualny stan

- Cztery poziomy: Łatwy, Normalny, Trudny i Ekspert (`src/content/difficulty.js`). Trudny i Ekspert dokładają 2–3 / 2–4 dodatkowe umiarkowane obrażenia; łatwy i normalny zachowują dawny układ. Od normalnego wzwyż w trakcie opieki zdarzają się komplikacje (`src/simulation/complications.js`).
- Tryb „Pełny proceduralny” (`src/simulation/procedural.js`): losowy pacjent, osobny wynik — czas utrzymania przy życiu (`stats.bestSurvival`), niezależny od rekordu 0–100.
- Pozioma sylwetka outline, widoczne rany, urazy i założone wyposażenie; lokalne menu działa myszą, dotykiem i klawiaturą.
- Leczenie przypisane do miejsca/konkretnej rany; staza może zablokować IV w tej samej ręce.
- Wkłucie IV ma wybór miejsca i minigrę techniki, a jej jakość wpływa na przepływ i dostarczenie płynów/leków.
- Monitor dynamiczny: puls, ciśnienie (NIBP co 3 min lub na żądanie), saturacja (z utratą sygnału przy złym ukrwieniu), oddech, temperatura, GCS/AVPU i ból; wykresy pokazują historię do 60 sekund gry.
- Zegar ma pauzę i tempa 1×/2×/4×. Procedura, poradnik i ukryta karta zatrzymują automatyczne tykanie. Czynność wykonana przez gracza nadal zużywa czas symulacji.
- Torba ma wyszukiwanie i filtry dostępności/dopasowania. Aktualizacje czasu nie odbierają fokusu polu wyszukiwania.
- Katalog obejmuje 57 urazów, 42 zgłoszenia (+14 zgłoszeń wbudowanych w stany poszkodowanego), 51 stanów poszkodowanego w 6 kategoriach, 40 elementów wyposażenia, 16 leków i 49 poradników. Rozszerzenia: 100 pozycji ([lista](docs/EXPANSION-100.md)) oraz runda 2, 24 pozycje ([lista](docs/EXPANSION-ROUND2.md)).
- Zapis lokalny zachowuje zgodność z wcześniejszymi stanami gry.

## Uruchomienie

Wymagany Node.js 20 lub nowszy. Zależności npm nie są wymagane.

```sh
npm start
```

Otwórz http://localhost:5173. Testy i kontrola składni:

```sh
npm run check
npm test
```

## Granice modułów

- `src/content/` — identyfikatory i definicje urazów, zgłoszeń, sprzętu, leków, procedur i poradników.
- `src/simulation/` — fizjologia, efekty, modyfikatory, przepływ IV, pomiary i zegar.
- `src/engine.js` — tworzenie/walidacja zapisu, czynności i przejścia stanu w czasie.
- `src/ui/` — sylwetka, menu, torba, monitor, wykresy i procedury.
- `src/app.js` — połączenie silnika, komponentów i zdarzeń przeglądarki.
- `docs/ARCHITECTURE.md` — kontrakty rozszerzania katalogów oraz mechanik.

Dodawanie treści zaczynaj od katalogów i testu referencji/osiągalności. Nowy efekt mechaniczny dodawaj do rejestru symulacji; nie umieszczaj reguł leczenia w komponencie UI.

## Dodane w 0.9

- **Trudny przebudowany** (gracze uznali go za za łatwy): krwawienie ×1,5, połowa sprzętu, terminy protokołu ×0,6, 2–3 dodatkowe obrażenia, dojazd 25–30 min (1500–1800 s), mnożnik punktów ×1,3, częste komplikacje.
- **Nowy poziom Ekspert** (po Trudnym we wszystkich listach wyboru): krwawienie ×1,8, 40% sprzętu, terminy ×0,5, 2–4 dodatkowe obrażenia, dojazd 28–35 min (1680–2100 s), mnożnik ×1,6. Monitor nie jest podłączony na starcie (`monitorAttached: false` — kafelki pokazują „—” poza ręcznym pomiarem; przycisk „Podłącz” wykonuje czynność monitora, 20 s), a urazy normalnie widoczne pojawiają się dopiero po zbadaniu okolicy (`hideVisible`; wyjątek: masywne krwawienie i amputacje).
- **Komplikacje** (`src/content/complications.js`, `src/simulation/complications.js`): deterministyczny strumień zdarzeń w stanie gry (`g.complications = {seed, next, log}`), częstość wg poziomu (łatwy 0, normalny rzadko, trudny średnio, ekspert często). Dziewięć zdarzeń — poluzowana staza, przesiąknięty opatrunek, oderwany skrzep, wymioty z zachłyśnięciem, pogorszenie ukrytego urazu, nagły ból, wysunięty wenflon, zsunięta maska tlenowa, drżenie z zimna — każde tylko przy spełnionym warunku i każde do opanowania sprzętem z torby. Dokręcenie stazy i ponowne założenie maski nie zużywają nowego sprzętu. Komunikat w polu informacji i w dzienniku; ocena pokazuje „Komplikacje: N (opanowane M)” przy gospodarce sprzętem.
- Zapis: bez podbicia wersji; `restoreGame` uzupełnia `monitorAttached` i `complications`, przyjmuje dojazd 900–2100 s (stare zapisy trudnego 1260–1500 s nadal są ważne).
- Testy: `tests/complications.test.js`, macierz referencyjna rozbita na `reference-care{,-hard,-expert}.test.js`; `npm test` uruchamia pliki równolegle (test wydajności osobno na końcu).
- Bilans (`referenceCare`, losowanie `()=>.99` = najdłuższy dojazd i najwięcej dodatkowych urazów, profil ciężki i lekki): normalny i trudny 100% uratowanych, ekspert 95% (przegrywa `fall`, `§legGunshot`, `§calmDriver`, `§trailAsthma`, `§slopeFall`). Zaniedbanie (tylko wezwanie ewakuacji, losowe ziarna): zgony normalny 31%, trudny 62% (wcześniej 40%), ekspert 76%. Tryb proceduralny (40 ziaren): bez leczenia zgony 28/53/78/93%, z `referenceCare` 0/0/8/30% (łatwy/normalny/trudny/ekspert).

## Dodane w 0.7

- Minigry: wkłucie IV, staza, RKO, tamponada i opatrunek wentylowy klatki (z trybem bez minigier).
- Ciało z 31 segmentów (stawy jako segmenty pośrednie) i amputacje urazowe z rysowaniem kikuta.
- 51 stanów poszkodowanego w 6 kategoriach, z ukrytym protokołem kroków i częścią oceny „Protokół”.
- Fizjologia w realnych jednostkach, fazy P0–P4: krążenie w mL z baroreflexem i klasami ATLS, utlenowanie (FiO₂, PaCO₂, przeciek, Severinghaus), leki PK/PD z kumulacją, bilans cieplny i środowisko, glukoza w mmol/l, pełne GCS/AVPU, triada śmierci (mleczany, pH, krzepliwość), skrzep i ponowne krwawienie przy wzroście ciśnienia, realne tempa krwawień, oparzenia wg %TBSA, ocena przekazania z utratą krwi, SpO₂, temperaturą, GCS i mleczanami.
- Taktyczny HUD: monitor na żywo, panel podtrzymania (butla, worki, fazy leków), znaczniki zabezpieczeń.

## Dodane w 0.6

- Ocena końcowa 0–100 (S–D) z rozbiciem na części i rekord zmiany (`src/simulation/scoring.js`).
- Samouczek pierwszej interwencji oparty na prawdziwych akcjach (`src/content/tutorial.js`, przycisk „Samouczek”).
- Poziomy trudności Łatwy/Normalny/Trudny (zapasy, czas dojazdu, krwawienie, mnożnik punktów).
- Podświetlanie miejsc użycia trzymanego sprzętu, znaczniki aktywnych zabezpieczeń, zmiana wyglądu opatrzonych ran.
- Runda 2 treści: [docs/EXPANSION-ROUND2.md](docs/EXPANSION-ROUND2.md).

## Stany poszkodowanego i kategorie

- „Nowe wezwanie” otwiera dialog dyspozytorni (`#new-call`, `src/ui/new-call.js`): poziom trudności i jedna z 6 kategorii lub „Losowa”. Ostatni wybór zapisuje się w `stats.category`.
- 51 stanów (`src/content/conditions.js`) z ukrytym protokołem kroków z terminami; pominięty krok jednorazowo pogarsza stan (`src/simulation/protocol.js`). Podsumowanie pokazuje nazwę stanu i listę kroków, ocena dostaje część „Protokół” (15 pkt).
- Pierwsza gra nowego gracza (samouczek) to nadal dawne losowe zgłoszenie bez protokołu.

## Ciąg dalszy

1. **Pełna kontrola przeglądarkowa (Playwright, niewykonana dla 0.6–0.9):** gdy będzie dostępny Playwright, uruchomić `tests/browser_expansion.py` i `tests/browser_smoke.py` na desktopie i telefonie (nowy kafelek SpO₂ „brak sygnału”, podpis NIBP, minigry, HUD).
2. Przycisk ↻ na telefonie (390 px) jest ukryty — przywrócić go w układzie mobilnym.
3. Fizjologia (opcjonalna część P4): odma prężna z przedmiotem „Odbarczenie odmy (gra)”, uraz głowy z ICP/odruchem Cushinga i asymetrią źrenic, zatrucie CO z COHb i fałszywie prawidłowym pulsoksymetrem — wymagają nowej treści i kalibracji.
4. Ocena: nieleczona drobna rana (np. `glassDoor`) wciąż może dać wysoki wynik, bo „Gospodarka sprzętem” nagradza niezużyty sprzęt — rozważyć karę za niezabezpieczone krwawienie przy przekazaniu.
5. Znane ograniczenia samouczka: krok pomiaru opiera się na tekście dziennika; ponowne włączenie po ukończeniu pokazuje panel dopiero w następnej grze.
6. Scenariusze o różnym wyposażeniu początkowym (obecnie tylko mnożnik zapasów wg poziomu) i dalsze treści katalogowe z testami kombinacji celu i efektu.

Nie ma podłączonego backendu, integracji FiveM, kont użytkownika ani usług zewnętrznych. Lokalny postęp jest przechowywany w przeglądarce.

## Ostatnia weryfikacja checkpointu

- `npm run check` — zaliczono, 61 modułów.
- `npm test` — zaliczono, 208 testów w 24 plikach (~23 s przy uruchamianiu równoległym); wydajność ~255 ms / 20 000 ticków (limit 400).
- Losowe ziarna (wszystkie scenariusze i stany, `referenceCare`): zgony łatwy 0%, normalny 0%, trudny 0%, ekspert 9%.
- Kontrola przeglądarkowa 0.9 — zrzuty z Electron 40 offscreen (bez Playwright) z serwera :5173: start eksperta (monitor „Niepodłączony”, siedem kafelków „—”, widoczne tylko masywne krwawienie, „Ekspert” w listach wyboru) oraz komunikat „Komplikacja: Wenflon wysunął się z żyły…” podczas biegu zegara z przerysowaną sceną. Skrypty Playwright (`tests/browser_*.py`) nadal nieuruchomione.
