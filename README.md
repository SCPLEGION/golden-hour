# Field Medic

Przeglądarkowy symulator ratownika dla projektu `fivem-arma3-healing-system`. Ty, poszkodowany i torba medyczna. Ewakuacja dotrze za 15–25 minut czasu gry — utrzymaj pacjenta przy życiu.

## Uruchomienie

Node.js 20+; bez instalowania zależności:

```sh
npm start
```

Otwórz http://localhost:5173.

## Rozgrywka

Kliknij część ciała na sylwetce lub liście. Widoczne urazy są dostępne od razu, ukryte wymagają badania. Jedna noga może mieć jednocześnie postrzał, krwotok i otwarte złamanie. Zabezpieczenia działają osobno: opatrunek nie zastępuje szyny.

Torba zawiera opatrunki, gazę hemostatyczną, stazy, szyny, uszczelnienie klatki, tlen, sprzęt do wentylacji, koc, zestaw IV, płyny i monitor/defibrylator. Leki mają opisy, opóźnienie i czas działania oraz skutki uboczne. Podanie IV wymaga dostępu. W poradniku znajdziesz wyszukiwane opisy mechanik.

Czas gry biegnie w tle, a parametry fizjologiczne zmieniają się wraz ze stanem pacjenta. Podłączony monitor aktualizuje odczyty i trendy na żywo; możesz go odłączyć, zatrzymać czas lub zmienić tempo na 1×, 2× albo 4×. Czynności nadal kosztują czas gry, a poradnik i procedura wkłucia wstrzymują zegar automatyczny. Zapasy tlenu się wyczerpują, a leki przestają działać. Zgłoś ewakuację — samo oczekiwanie jej nie wezwie. Możliwe jest pogorszenie, zatrzymanie krążenia, RKO, powrót krążenia, śmierć albo przekazanie żywego pacjenta.

Sześć bazowych zgłoszeń ma losowy czas dojazdu, dane pacjenta i możliwość dodatkowego urazu. Postęp i statystyki zapisują się lokalnie w przeglądarce.

To fikcyjny model gry, nie szkolenie medyczne. Porcje leków i parametry są umownym balansem, bez rzeczywistych dawek. Ogólne źródła opisów są dostępne w poradniku.

## Moduły i rozszerzanie

- `src/content/`: katalogi części ciała, urazów, scenariuszy, sprzętu, leków i poradników.
- `src/simulation/`: rejestr efektów, ciągła fizjologia i selektory.
- `src/engine.js`: stan, akcje, czas i odczyt wersjonowanego zapisu.
- `src/ui/`: komponenty sylwetki, torby, parametrów i poradnika.
- `src/storage.js`: lokalne przechowywanie postępu.
- `src/app.js`: zdarzenia i połączenie komponentów.

Nowy sprzęt, lek wykorzystujący istniejące modyfikatory, uraz lub scenariusz nie wymagają zmian interfejsu. Nowe mechaniki podłącza się przez rejestr efektów. Instrukcje i przykłady: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Plan: [docs/PLAN.md](docs/PLAN.md).

## Sprawdzenie

```sh
npm run check
npm test
```

Gra jest lokalna; brak integracji FiveM i usług zewnętrznych.

Opcjonalny test przeglądarkowy: przy działającym serwerze i zainstalowanym Python Playwright uruchom `python tests/browser_smoke.py`. Sprawdza sylwetkę, badania, sprzęt, leki, poradnik, zapis, widok mobilny i pełne uratowanie pacjenta po 25 minutach. `BASE_URL` zmienia adres serwera; `PLAYWRIGHT_CHROMIUM_PATH` pozwala wskazać istniejącą przeglądarkę Chromium zamiast pobranej przez Playwright.

## Stół zabiegowy (0.3)

Pacjent leży poziomo w formie anatomicznego outline’u. Prawy przycisk na ranie, sprzęcie lub kończynie otwiera menu kontekstowe. Na telefonie dotknij rany albo wybierz okolicę i przycisk **Działania** pod stołem. Możesz też przeciągnąć przedmiot z torby lub wybrać **Weź do ręki** i kliknąć miejsce użycia. Stazy, opatrunki, szyny, maska tlenowa, wenflony i przewody są widocznymi warstwami na ciele.

Każda rana ma własny opatrunek. IV jest lokalne: osobno w lewej i prawej ręce. Staza odcina dostęp w tej samej kończynie — zużyte preparaty nie dają wtedy efektu ogólnoustrojowego, a działający wcześniej wlew przestaje dopływać. Druga ręka pozostaje niezależna.

Obsługa klawiaturą: Tab wybiera element, Shift+F10 otwiera jego menu, strzałki poruszają się po pozycjach, Enter wykonuje czynność, Escape zamyka menu lub odkłada przedmiot. Otwarcie menu i wybór sprzętu nie przesuwają czasu.

## Ekran gry i minigra IV (0.4)

Ciemny ekran gry mieści stół, boczną torbę i monitor parametrów. Dziennik otwierasz przyciskiem lub `L`, a poradnik przez `H`. Dolny pasek udostępnia badanie, pomiar, ewakuację i obserwację; poza formularzami i modalami działają też klawisze `1`–`4`.

Założenie wenflonu uruchamia minigrę: wybierz punkt na naczyniu, ustaw prowadzenie suwakiem, a następnie przytrzymaj przycisk lub Spację i puść w polu trafienia. Efekt zależy od precyzji i miejsca wkłucia. Dłoń, przedramię i okolica łokcia mają inny potencjał oraz tolerancję.

Jakość dostępu i stan krążenia wpływają na faktyczny przepływ, tempo wlewu i siłę efektu leku IV. Staza wciąż odcina przepływ. Nieudana lub rozpoczęta i przerwana próba zużywa wenflon, czas oraz pozostawia krwiak. Anulowanie przed rozpoczęciem wprowadzenia jest bez kosztu. Słaby dostęp możesz usunąć i spróbować w innym miejscu.

Geometria i balans minigry są w `src/content/procedures.js`, wynik liczy `src/simulation/procedures.js`, a interaktywny widok znajduje się w `src/ui/procedures/`. Nowe procedury podpina się rejestrami; szczegóły w instrukcji architektury. Skale minigry są fikcyjne i nie odwzorowują rzeczywistych parametrów zabiegów.

## Symulacja na żywo i rozszerzenie zawartości (0.5)

Gra zawiera dokładnie 100 nowych wpisów: 25 urazów, 25 zgłoszeń, 20 elementów wyposażenia, 10 leków i 20 tematów poradnika. Runda 2 dodała 6 urazów, 6 zgłoszeń, 4 elementy sprzętu, 2 leki i 6 poradników ([lista](docs/EXPANSION-ROUND2.md)). [Lista wszystkich dodatków](docs/EXPANSION-100.md) i maszynowe manifesty pokazują stabilne identyfikatory oraz ich powiązanie z katalogami. Monitor gromadzi trend z ostatnich 60 sekund, a fizjologia reaguje na urazy, krążenie, leki i wsparcie. Moduły `src/simulation/realtime.js`, `monitor.js` i `modifiers.js` oddzielają zegar, historię pomiarów i modyfikatory od interfejsu.

Stan prac i propozycję dalszej kolejności opisuje [CHECKOUT.md](CHECKOUT.md).
