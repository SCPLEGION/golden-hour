# Plan wersji 0.2

1. [x] Rozdzielić treść, symulację, zapis i komponenty UI.
2. [x] Zastąpić pojedynczy problem listą urazów przypisanych częściom ciała.
3. [x] Dodać wybieraną sylwetkę, widoczne urazy i ukryte wyniki badań.
4. [x] Wprowadzić torbę wyposażenia oraz rejestr efektów.
5. [x] Dodać leki, wywiad, opóźnione działanie, czas aktywności i konsekwencje powtarzania.
6. [x] Wydłużyć ewakuację do 15–25 minut; uwzględnić tlen, temperaturę i opiekę podczas oczekiwania.
7. [x] Dodać zatrzymanie krążenia i uproszczoną resuscytację.
8. [x] Udostępnić poradnik z wyszukiwaniem i opisami zasad gry.
9. [x] Sprawdzić ratowalność scenariuszy, zależności mechanik i rozszerzanie katalogów.
10. [x] Zweryfikować interfejs w przeglądarce w rozmiarze komputera i telefonu (emulacja widoku).

Kolejne rozszerzenia mogą obejmować nowe urazy, mechaniki powikłań i więcej wyposażenia. Priorytetem pozostaje dodawanie treści przez katalogi zamiast rozbudowy głównego pliku aplikacji.

## Wersja 0.3 — stół zabiegowy

1. [x] Zastąpić pionową ikonę poziomym anatomicznym outline’em.
2. [x] Oddzielić rysunki ran i założonych przedmiotów od stanu oraz fizjologii.
3. [x] Dodać menu kontekstowe, przeciąganie oraz wybór i umieszczanie sprzętu.
4. [x] Przypisać opatrunki do pojedynczych ran.
5. [x] Przypisać IV do konkretnej ręki i uwzględnić odcięcie przepływu stazą.
6. [x] Zachować wcześniejsze zapisy przez migrację lokalnych zabezpieczeń.
7. [x] Sprawdzić PPM, drag/drop, klawiaturę, urządzenia mobilne i pełny ratunek w przeglądarce.

## Wersja 0.4 — interfejs gry i procedury

1. [x] Zastąpić stronę z kartami ciemnym ekranem gry ze stołem, torbą i monitorem.
2. [x] Przenieść dziennik do otwieranego panelu i dodać pasek szybkich działań.
3. [x] Wprowadzić rejestry procedur symulacji i odpowiadających im widoków.
4. [x] Dodać minigrę: wybór punktu, prowadzenie, kontrolowane wprowadzenie.
5. [x] Uzależnić jakość IV i jego pozycję od faktycznego wyniku próby.
6. [x] Powiązać przepływ z działaniem wlewów i dostarczoną częścią leku.
7. [x] Dodać krwiaki, koszt nieudanych/przerwanych prób i możliwość usunięcia dostępu.
8. [x] Zweryfikować zasady symulacji testami.
9. [x] Zakończyć kontrolę interfejsu na komputerze, mniejszym laptopie i telefonie (emulacja dotyku).

## Wersja 0.5 — dynamiczna symulacja i rozbudowa katalogów

1. [x] Dodać 25 urazów, 25 zgłoszeń, 20 elementów wyposażenia, 10 leków i 20 poradników; sprawdzić 100 stabilnych identyfikatorów manifestami.
2. [x] Oddzielić zegar rzeczywisty, zapis trendu i modyfikatory wsparcia od głównego UI.
3. [x] Aktualizować parametry pacjenta co sekundę gry, z deterministyczną zmiennością i reakcją na leczenie.
4. [x] Dodać pauzę, 1×/2×/4×, odłączany monitor i wstrzymanie automatycznego czasu przy procedurze, poradniku i karcie w tle.
5. [x] Utrzymać komponenty torby i pola tekstowe bez przeładowywania ich na każdym kroku symulacji.
6. [x] Zweryfikować 53 testy silnika, rozszerzeń, fizjologii i zegara.

## Kolejny etap (stary)

Zobacz [CHECKOUT.md](../CHECKOUT.md) — zawiera aktualny stan, komendy startowe i uporządkowaną listę kolejnych funkcji.

## Wersja 0.6 — ocena, samouczek, trudność (zrobione)

1. [x] Ocena końcowa S–D i rekord zmiany.
2. [x] Samouczek pierwszej interwencji na prawdziwych akcjach.
3. [x] Poziomy trudności Łatwy/Normalny/Trudny.
4. [x] Podświetlanie miejsc użycia, znaczniki zabezpieczeń, wygląd opatrzonych ran.
5. [x] Runda 2 treści (40 urazów, 37 zgłoszeń, 39 sprzętu, 16 leków, 37 poradników).

## Wersja 0.7 — plan ulepszeń (proponowany)

Kolejność wg wartości/ryzyka. Każdy etap kończy się `npm run check`, `npm test` i aktualizacją CHECKOUT.md.

### A. Jakość i pewność (najpierw)
1. [ ] Odtworzyć środowisko przeglądarkowe (Playwright) i uruchomić `tests/browser_*.py` na desktopie oraz telefonie; dodać skrypt `scripts/qa-setup.sh`, żeby nie ginęło w `/tmp`.
2. [ ] Testy przeglądarkowe nowego UI: samouczek, selektor poziomu, znaczniki, podsumowanie z oceną.
3. [ ] Naprawić ograniczenia samouczka: flaga pomiaru w stanie zamiast tekstu dziennika; ponowne włączenie resetuje postęp kroków.
4. [ ] Test balansu: automatyczny bot rozgrywający każdy scenariusz na każdym poziomie (ratowalność Łatwy/Normalny, wykonalność Trudny).
5. [ ] Formatowanie/lint (zwarte pliki są trudne w przeglądzie): prosty skrypt kontrolny długości linii i nieużywanych eksportów.

### B. Rozgrywka
6. [ ] Scenariusze z własnym wyposażeniem początkowym (pole `kit` w scenariuszu) i brakami sprzętu.
7. [ ] Tryb kampanii/zmiany: seria wezwań z kumulacją zasobów i oceną zmiany.
8. [ ] Powikłania w czasie (wstrząs, hipotermia, ból) widoczne w monitorze i ocenie.
9. [ ] Cele opcjonalne w scenariuszach (np. zebrać wywiad, ogrzać pacjenta) punktowane w ocenie.

### C. Interfejs i dostępność
10. [x] Podświetlenie elementu UI aktualnego kroku samouczka (`data-tutorial-focus`).
11. [x] Przegląd dostępności: kontrast, focus, czytniki ekranu, `prefers-reduced-motion`, klawiatura dla minigry IV.
12. [x] Ekran startowy: wybór poziomu, wznowienie, statystyki i historia ocen.
13. [ ] Dźwięki monitora (opcjonalne, domyślnie wyłączone).

### D. Treści i dokumentacja
14. [ ] Runda 3 treści z automatycznymi testami kombinacji cel × efekt.
15. [ ] Aktualizacja ARCHITECTURE.md o scoring, trudność, tutorial, protections.
