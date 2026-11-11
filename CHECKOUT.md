# Field Medic — checkpoint projektu

Ostatnia aktualizacja: 2026-11-11 · wersja aplikacji: 0.8.0

## Co to jest

Field Medic to lokalna gra przeglądarkowa o opiece nad poszkodowanym do czasu przyjazdu ewakuacji. Gracz jest ratownikiem medycznym przy poziomym stole zabiegowym. Wskazuje część ciała lub ranę, wybiera sprzęt z torby i używa go przez menu kontekstowe, skrót lub przeciągnięcie. Założony sprzęt jest widoczny na sylwetce.

To fikcyjna symulacja gry, nie instruktaż ani narzędzie kliniczne. Dawki, wyniki i działanie leczenia są umownym balansem.

## Aktualny stan

- Poziom trudny dokłada 1–2 dodatkowe umiarkowane obrażenia (`extraInjuries` w `DIFFICULTIES`); łatwy i normalny zachowują dawny układ.
- Tryb „Pełny proceduralny” (`src/simulation/procedural.js`): losowy pacjent, osobny wynik — czas utrzymania przy życiu (`stats.bestSurvival`), niezależny od rekordu 0–100.
- Pozioma sylwetka outline, widoczne rany, urazy i założone wyposażenie; lokalne menu działa myszą, dotykiem i klawiaturą.
- Leczenie przypisane do miejsca/konkretnej rany; staza może zablokować IV w tej samej ręce.
- Wkłucie IV ma wybór miejsca i minigrę techniki, a jej jakość wpływa na przepływ i dostarczenie płynów/leków.
- Monitor dynamiczny: puls, ciśnienie (NIBP co 3 min lub na żądanie), saturacja (z utratą sygnału przy złym ukrwieniu), oddech, temperatura, GCS/AVPU i ból; wykresy pokazują historię do 60 sekund gry.
- Zegar ma pauzę i tempa 1×/2×/4×. Procedura, poradnik i ukryta karta zatrzymują automatyczne tykanie. Czynność wykonana przez gracza nadal zużywa czas symulacji.
- Torba ma wyszukiwanie i filtry dostępności/dopasowania. Aktualizacje czasu nie odbierają fokusu polu wyszukiwania.
- Katalog obejmuje 57 urazów, 42 zgłoszenia (+14 zgłoszeń wbudowanych w stany poszkodowanego), 51 stanów poszkodowanego w 6 kategoriach, 40 elementów wyposażenia, 16 leków i 48 poradników. Rozszerzenia: 100 pozycji ([lista](docs/EXPANSION-100.md)) oraz runda 2, 24 pozycje ([lista](docs/EXPANSION-ROUND2.md)).
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

1. **Kontrola przeglądarkowa (niewykonana dla 0.6 i 0.7):** gdy będzie dostępny Playwright, uruchomić `tests/browser_expansion.py` i `tests/browser_smoke.py` na desktopie i telefonie (nowy kafelek SpO₂ „brak sygnału”, podpis NIBP, minigry, HUD).
2. Przycisk ↻ na telefonie (390 px) jest ukryty — przywrócić go w układzie mobilnym.
3. Fizjologia (opcjonalna część P4): odma prężna z przedmiotem „Odbarczenie odmy (gra)”, uraz głowy z ICP/odruchem Cushinga i asymetrią źrenic, zatrucie CO z COHb i fałszywie prawidłowym pulsoksymetrem — wymagają nowej treści i kalibracji.
4. Ocena: nieleczona drobna rana (np. `glassDoor`) wciąż może dać wysoki wynik, bo „Gospodarka sprzętem” nagradza niezużyty sprzęt — rozważyć karę za niezabezpieczone krwawienie przy przekazaniu.
5. Znane ograniczenia samouczka: krok pomiaru opiera się na tekście dziennika; ponowne włączenie po ukończeniu pokazuje panel dopiero w następnej grze.
6. Scenariusze o różnym wyposażeniu początkowym (obecnie tylko mnożnik zapasów wg poziomu) i dalsze treści katalogowe z testami kombinacji celu i efektu.

Nie ma podłączonego backendu, integracji FiveM, kont użytkownika ani usług zewnętrznych. Lokalny postęp jest przechowywany w przeglądarce.

## Ostatnia weryfikacja checkpointu

- `npm run check` — zaliczono, 58 modułów.
- `npm test` — zaliczono, 178 testów w 20 plikach (~25 s); wydajność ~230 ms / 20 000 ticków (limit 250).
- Kontrola białych znaków w źródłach i dokumentacji — bez wyników.
- Testy Playwright mają skrypt, ale środowisko `/tmp/field-medic-qa` oraz pakiet Python Playwright nie są obecnie dostępne w tej sesji. Nie oznacza to błędu gry; test przeglądarkowy wymaga odtworzenia tego środowiska.
