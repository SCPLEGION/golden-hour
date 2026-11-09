# Field Medic — checkpoint projektu

Ostatnia aktualizacja: 2026-11-09 · wersja aplikacji: 0.6.0

## Co to jest

Field Medic to lokalna gra przeglądarkowa o opiece nad poszkodowanym do czasu przyjazdu ewakuacji. Gracz jest ratownikiem medycznym przy poziomym stole zabiegowym. Wskazuje część ciała lub ranę, wybiera sprzęt z torby i używa go przez menu kontekstowe, skrót lub przeciągnięcie. Założony sprzęt jest widoczny na sylwetce.

To fikcyjna symulacja gry, nie instruktaż ani narzędzie kliniczne. Dawki, wyniki i działanie leczenia są umownym balansem.

## Aktualny stan

- Pozioma sylwetka outline, widoczne rany, urazy i założone wyposażenie; lokalne menu działa myszą, dotykiem i klawiaturą.
- Leczenie przypisane do miejsca/konkretnej rany; staza może zablokować IV w tej samej ręce.
- Wkłucie IV ma wybór miejsca i minigrę techniki, a jej jakość wpływa na przepływ i dostarczenie płynów/leków.
- Monitor dynamiczny: puls, ciśnienie, saturacja, oddech, temperatura i ból; wykresy pokazują historię do 60 sekund gry.
- Zegar ma pauzę i tempa 1×/2×/4×. Procedura, poradnik i ukryta karta zatrzymują automatyczne tykanie. Czynność wykonana przez gracza nadal zużywa czas symulacji.
- Torba ma wyszukiwanie i filtry dostępności/dopasowania. Aktualizacje czasu nie odbierają fokusu polu wyszukiwania.
- Katalog obejmuje 40 urazów, 37 zgłoszeń, 39 elementów wyposażenia, 16 leków i 37 poradników. Rozszerzenia: 100 pozycji ([lista](docs/EXPANSION-100.md)) oraz runda 2, 24 pozycje ([lista](docs/EXPANSION-ROUND2.md)).
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

## Dodane w 0.6

- Ocena końcowa 0–100 (S–D) z rozbiciem na części i rekord zmiany (`src/simulation/scoring.js`).
- Samouczek pierwszej interwencji oparty na prawdziwych akcjach (`src/content/tutorial.js`, przycisk „Samouczek”).
- Poziomy trudności Łatwy/Normalny/Trudny (zapasy, czas dojazdu, krwawienie, mnożnik punktów).
- Podświetlanie miejsc użycia trzymanego sprzętu, znaczniki aktywnych zabezpieczeń, zmiana wyglądu opatrzonych ran.
- Runda 2 treści: [docs/EXPANSION-ROUND2.md](docs/EXPANSION-ROUND2.md).

## Ciąg dalszy

1. **Kontrola przeglądarkowa (nadal niewykonana dla 0.6):** odtworzyć środowisko Playwright i uruchomić `tests/browser_expansion.py` oraz `tests/browser_smoke.py` na desktopie i telefonie. Nowy UI (samouczek, selektor poziomu, znaczniki, podsumowanie) nie był oglądany w przeglądarce.
2. Znane ograniczenia samouczka: krok pomiaru opiera się na tekście dziennika; ponowne włączenie po ukończeniu pokazuje panel dopiero w następnej grze.
3. Scenariusze o różnym wyposażeniu początkowym (obecnie tylko mnożnik zapasów wg poziomu).
4. Dalsze treści katalogowe z testami kombinacji celu i efektu.

Nie ma podłączonego backendu, integracji FiveM, kont użytkownika ani usług zewnętrznych. Lokalny postęp jest przechowywany w przeglądarce.

## Ostatnia weryfikacja checkpointu

- `npm run check` — zaliczono, 38 modułów.
- `npm test` — zaliczono, 80 testów.
- Kontrola białych znaków w źródłach i dokumentacji — bez wyników.
- Testy Playwright mają skrypt, ale środowisko `/tmp/field-medic-qa` oraz pakiet Python Playwright nie są obecnie dostępne w tej sesji. Nie oznacza to błędu gry; test przeglądarkowy wymaga odtworzenia tego środowiska.
