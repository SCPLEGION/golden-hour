export const GUIDES = [
  {
    "id": "iv-minigame",
    "title": "Minigra wkłucia i jakość dostępu",
    "text": "Wybierz wenflon w torbie i kliknij rękę albo użyj menu kontekstowego. Najpierw wybierz dokładny punkt na rysunku naczynia; możesz kliknąć lub ustawić celownik strzałkami. Następnie ustaw prowadzenie igły suwakiem w zaznaczonym zakresie. Na końcu przytrzymaj przycisk lub Spację i puść w polu trafienia. Nie ma losowego rzutu: wynik zależy od punktu, ustawienia i momentu puszczenia. Dłoń, przedramię i okolica łokcia mają różne marginesy i potencjał przepływu. Udana, lecz niedokładna próba może dać słaby dostęp. Przepływ zależy też od stanu krążenia i stazy. Płyny napływają proporcjonalnie do przepływu, a lek IV ma odpowiednio słabszy efekt. Podczas minigry automatyczny zegar jest wstrzymany, ale rozstrzygnięta próba zużywa czas czynności oraz wenflon. Niepowodzenie powoduje krwiak. Escape przed rozpoczęciem wprowadzania anuluje bez kosztu; po rozpoczęciu oznacza nieudaną próbę. Słaby wenflon możesz usunąć i spróbować ponownie. Wszystkie zakresy są umownymi skalami gry, nie instrukcją medyczną."
  },
  {
    "id": "tourniquet-minigame",
    "title": "Minigra stazy: naciąg i blokada",
    "text": "Po wybraniu stazy przytrzymaj przycisk lub Spację, aby obracać pokrętło; strzałki korygują naciąg o mały krok. Puszczone pokrętło powoli się luzuje, więc gdy wskaźnik jest w zielonym polu, zablokuj je przyciskiem lub Enter. Pulsujący znacznik krwawienia poniżej stazy blednie w miarę dokręcania i gaśnie w polu docelowym. Za słaby naciąg tylko ogranicza krwawienie (luźną stazę można dokręcić ponownie, zużywając kolejną), za mocny zatrzymuje je, ale nasila ból. Escape przerywa bez zużycia stazy. To umowna skala gry."
  },
  {
    "id": "cpr-minigame",
    "title": "Minigra RKO: rytm i głębokość",
    "text": "Wykonaj serię 15 uciśnięć dużym przyciskiem albo Spacją. Gra nie podaje rytmu: odstęp między naciśnięciami wyznacza tempo, które powinno mieścić się w polu 100–120 na minutę, a czas przytrzymania wyznacza głębokość pokazaną na słupkach. Jakość serii to iloczyn trafności tempa i głębokości; w modelu gry lepsza seria dłużej podtrzymuje pacjenta w zatrzymaniu krążenia. Escape przerywa serię bez kosztu. To uproszczony balans rozgrywki, nie instrukcja."
  },
  {
    "id": "packing-minigame",
    "title": "Minigra tamponady: kieszenie i ucisk",
    "text": "Gaza hemostatyczna uruchamia tamponadę. Jama rany jest podzielona na strefy, a kieszenie o różnej głębokości są ukryte. Kliknij strefę albo wybierz ją strzałkami i naciśnij Spację lub Enter, aby włożyć warstwę. Warstwa poza kieszenią lub w pełnej kieszeni przepada, a zapas warstw jest ograniczony. Potem przytrzymaj przycisk lub Spację do końca odliczania; wcześniejsze puszczenie osłabia wynik. Jakość tamponady skaluje ograniczenie krwawienia tej rany. Escape przed końcem nie zużywa gazy."
  },
  {
    "id": "seal-minigame",
    "title": "Minigra opatrunku klatki: moment wydechu",
    "text": "Na ekranie przesuwa się przebieg oddechu w tempie oddechu pacjenta. Naciśnij przycisk, Spację lub Enter, gdy pionowa linia jest w zielonym polu pod koniec wydechu. Trafienie daje pełną szczelność; przyłożenie poza polem tylko częściowo ogranicza ubytek tlenu. Po chybieniu możesz raz spróbować ponownie kosztem 10 s gry albo zostawić opatrunek. Przy ograniczonym ruchu przebieg jest nieruchomy, a przesuwa się tylko wskaźnik. Escape przed wynikiem nie zużywa opatrunku."
  },
  {
    "id": "minigames-off",
    "title": "Wyłączanie minigier procedur",
    "text": "W panelu dyżuru możesz wyłączyć minigry. Wtedy wenflon, staza, RKO, tamponada i opatrunek klatki wykonują się od razu z jednakowym, przeciętnym wynikiem: staza i opatrunek trafiają w pole przy jego krawędzi, RKO i tamponada mają około 70% jakości, a wenflon jest zakładany w środku wybranego miejsca. Ustawienie jest zapisywane w przeglądarce i można je w każdej chwili zmienić."
  },
  {
    "id": "cockpit",
    "title": "Ekran gry i szybkie działania",
    "text": "Stół zajmuje główną część ekranu; torba jest po prawej, a parametry poniżej pacjenta. Domyślnie działa zegar czasu rzeczywistego i podłączony monitor. Pacjent może się zmieniać również wtedy, gdy przeglądasz torbę lub wybierasz miejsce. Pauza zatrzymuje automatyczne sekundy, ale wykonana czynność nadal zużywa przypisany jej czas symulacji. Możesz ustawić tempo 1×, 2× lub 4×. Klawisze 1–4 wykonują badanie miejscowe, pomiar, zgłoszenie ewakuacji i obserwację przez 30 sekund. L otwiera dziennik, H poradnik. Skróty działają poza polami formularzy, menu i oknami procedur. Escape odkłada trzymany przedmiot i zamyka dziennik. Podłączony monitor aktualizuje parametry na żywo, a odłączony pozostawia ostatni odczyt."
  },
  {
    "id": "controls",
    "title": "Sterowanie stołem i sprzętem",
    "text": "Ciało leży poziomo, głową po lewej. Prawy przycisk na ranie, opatrunku, wenflonie lub kończynie otwiera menu dotyczące tego miejsca. Na ekranie dotykowym dotknij rany albo użyj przycisku Działania pod stołem. Przedmioty możesz przeciągać z torby lub wziąć do ręki i kliknąć miejsce użycia. Otwarcie menu nie wykonuje czynności, ale domyślnie nie zatrzymuje działającego zegara. Do spokojnego planowania użyj pauzy. Escape odkłada przedmiot albo zamyka menu. Tab wybiera miejsce, Shift+F10 otwiera jego menu, strzałki wybierają pozycję, Enter zatwierdza. Opatrunek zabezpiecza wybraną ranę, staza obejmuje kończynę, a szyna unieruchamia jej złamania. Założony sprzęt widać na ciele."
  },
  {
    "id": "iv",
    "title": "Wenflon, staza i lokalny dostęp IV",
    "text": "W tym modelu gry wenflon zakładasz osobno w lewej lub prawej ręce. Aby podać płyn albo lek IV, kliknij ten konkretny dostęp lub rękę. Wenflon jest umieszczany poniżej stazy: jeżeli na tej samej kończynie jest staza, podanie zużyje preparat, ale nie da efektu ogólnoustrojowego. Założenie stazy podczas wlewu zatrzyma jego dalszy dopływ. Lek, który już dotarł do krążenia, nie znika po późniejszym założeniu stazy. Możesz założyć drugi dostęp w drugiej ręce. Przekreślony wenflon i czerwony przewód wskazują brak przepływu."
  },
  {
    "id": "start",
    "title": "Pierwsze minuty",
    "text": "Jesteś sam z pacjentem, a zespół ewakuacyjny jest 15–25 minut drogi stąd. Zgłoś ewakuację. Widoczne krwawienia i deformacje widzisz od razu. Kliknij część ciała, obejrzyj urazy i zdecyduj, co wymaga natychmiastowej reakcji. Badanie ujawnia to, czego nie widać. Zegar domyślnie płynie także między czynnościami; krwawienie nie czeka na kolejny przycisk. Pauza zatrzymuje automatyczny upływ, ale wybrana czynność nadal kosztuje swój czas. Poradnik, minigra procedury i przełączenie przeglądarki w tło automatycznie wstrzymują zegar do powrotu."
  },
  {
    "id": "bleeding",
    "title": "Rana, krwotok i złamanie",
    "text": "Jedna kończyna może mieć kilka urazów. W grze opatrunek uciskowy zmniejsza krwawienie, ale masywny krwotok może trwać nadal. Gaza hemostatyczna i staza mają silniejszy efekt. Staza działa wyłącznie na kończyny; czas jej założenia jest zapisywany. Szyna zmniejsza ból złamania, lecz nie tamuje krwi. Opatrunek nie naprawia złamanej kości. Sprawdzaj ukrwienie i czucie po leczeniu."
  },
  {
    "id": "breathing",
    "title": "Oddychanie i przytomność",
    "text": "Niska saturacja jest objawem, nie rozpoznaniem. W grze przyczyny obejmują niedrożność, ranę klatki, skurcz oskrzeli i działanie leków. Badanie głowy ocenia drożność, klatki — szmery oddechowe. Tlen ma ograniczony zapas i nie usuwa każdej przyczyny. Wentylacja workiem działa tylko przez czas wykonywania czynności."
  },
  {
    "id": "drugs",
    "title": "Jak działają leki w grze",
    "text": "Każde podanie zużywa jedną umowną porcję, bez przeliczenia na rzeczywiste dawki. Przeczytaj kartę leku: droga podania, tempo narastania działania, długość działania i ryzyko. IV wymaga wcześniejszego dostępu. Podanie tabletki nieprzytomnemu jest zablokowane. Morfina może pogorszyć oddech, zwłaszcza przy słabym krążeniu; paracetamol działa słabiej i wolniej. TXA ogranicza utratę krwi, a salbutamol działa na skurcz oskrzeli. Kolejne porcje kumulują się z poprzednimi — mogą nasilić senność i spowolnić oddech. Wywiad ujawnia zgłaszane alergie."
  },
  {
    "id": "long",
    "title": "Długie oczekiwanie",
    "text": "Założone zabezpieczenia, tlen, płyny i leki działają w każdej sekundzie symulacji, także między czynnościami. Podłączony monitor pokazuje aktualne parametry i ich trend; po odłączeniu zatrzymuje ostatni odczyt. Ręczne badania miejscowe pozostają wynikami konkretnego momentu. Sprawdzaj rany, zapas tlenu i czasy działania leków. Chroń przed wychłodzeniem. Akcja obserwacji dodaje 30 lub 60 sekund czasu gry, również wtedy, gdy automat jest zapauzowany. Przy tempie 2× lub 4× także pogorszenie, leki i dojazd zespołu postępują szybciej. Karetka przyjedzie tylko po zgłoszeniu."
  },
  {
    "id": "arrest",
    "title": "Zatrzymanie krążenia",
    "text": "W tym uproszczonym modelu krytyczna utrata krwi lub tlenu może zatrzymać krążenie. Rozpoznaj stan pomiarem, ogranicz przyczynę i rozpocznij RKO. AED analizuje rytm: wyładowanie pomaga tylko przy migotaniu komór (np. po porażeniu prądem lub w głębokim wychłodzeniu, gdzie skuteczne jest dopiero po ogrzaniu). Przy asystolii i rytmie bez tętna z krwotoku lub niedotlenienia nie ma wskazań. Cykl RKO kupuje czas, ale nie uzupełnia krwi ani nie zabezpiecza rany. Powrót krążenia jest możliwy po poprawie tlenu i krążenia. Przyjazd transportu sam w sobie nie oznacza wygranej, jeśli pacjent nadal wymaga RKO."
  },
  {
    "id": "about",
    "title": "O modelu i źródłach",
    "text": "To fikcyjny symulator inspirowany wielowarstwowym leczeniem w grach takich jak Casualties: Unknown. Liczby, czasy, porcje i efekty są balansem rozgrywki, nie protokołem ratownictwa. Ogólne opisy leków oparto o NHS; nie odwzorowujemy rzeczywistego dawkowania ani pełnych przeciwwskazań.",
    "links": [
      [
        "Casualties: Unknown — autor",
        "https://orsonik.itch.io/scav-prototype"
      ],
      [
        "NHS — morfina",
        "https://www.nhs.uk/medicines/morphine/"
      ],
      [
        "NHS — paracetamol",
        "https://www.nhs.uk/medicines/paracetamol-for-adults/"
      ],
      [
        "NHS — TXA",
        "https://www.nhs.uk/medicines/tranexamic-acid/"
      ],
      [
        "NHS — salbutamol",
        "https://www.nhs.uk/medicines/salbutamol-inhaler/about-salbutamol-inhalers/"
      ]
    ]
  },
  {
    "id": "exp-burns",
    "title": "Oparzenia: osłoń właściwą zmianę",
    "text": "Oparzenie może boleć bez dużej utraty krwi. Hydrożel łagodzi ból wybranej zmiany; zestaw płukania ma inny cel przy zabrudzeniu lub oparzeniu chemicznym. Na ciele mogą być równocześnie rana i oparzenie. Kliknij konkretny uraz, aby nie zużyć środka na sąsiednie miejsce. Żaden z tych przedmiotów nie cofa utraconej krwi."
  },
  {
    "id": "exp-foreign-body",
    "title": "Przedmiot wbity w ranę",
    "text": "Tag foreignBody oznacza ranę z pozostającym przedmiotem lub odłamkiem. Stabilizator ogranicza jego poruszanie i związany z nim ból w modelu gry. Nie wykonujesz automatycznego wyciągnięcia przez założenie opatrunku. Gdy rana nadal krwawi, potrzebujesz osobnego zabezpieczenia krwawienia."
  },
  {
    "id": "exp-eyes",
    "title": "Uraz oka i podrażnienie",
    "text": "Na głowie mogą współistnieć otarcia, krwawienie skóry i problem oka. Osłona oka działa na zmianę oznaczoną eyes; płukanie ogranicza podrażnienie w fikcyjnym modelu. Badanie źrenic to osobna czynność diagnostyczna. Wynik badania oka nie mówi nic o ukrytym urazie brzucha."
  },
  {
    "id": "exp-sprain",
    "title": "Skręcenie, zwichnięcie i złamanie",
    "text": "Widoczny obrzęk nie przesądza, który uraz jest obecny. Zbadaj kończynę i sprawdź czucie oraz ukrwienie. Kompres pomaga przy bólu stłuczenia lub skręcenia, temblak podpiera rękę, a szyna dotyczy złamania. Zmniejszenie bólu nie oznacza, że otwarta rana została zabezpieczona."
  },
  {
    "id": "exp-perfusion",
    "title": "Ukrwienie kończyny po zabezpieczeniu",
    "text": "Po założeniu stazy sprawdź miejscowy przepływ i czucie. Brak tętna pod stazą jest innym problemem niż niewyczuwalne tętno w całym krążeniu. Ocena nawrotu kapilarnego odnosi się do wybranej kończyny. Ręka z wenflonem potrzebuje własnej oceny, nawet jeśli druga noga wygląda dobrze."
  },
  {
    "id": "exp-analgesia",
    "title": "Przeciwbólowe: szybkość kontra ryzyko",
    "text": "Porównuj początek i czas działania oraz obciążenie oddychania. Fentanyl ma w grze silny, szybki efekt i większy koszt oddechowy; ketamina ma odmienny profil. Doustne środki potrzebują czasu i możliwości przełykania. Opioidowy lek nie tamuje krwotoku, a spokojniejszy pacjent nadal może się pogarszać."
  },
  {
    "id": "exp-opioid-reversal",
    "title": "Nalokson i nawrót obciążenia",
    "text": "Nalokson ma w grze czasowo ograniczać obciążenie oddechu po opioidach. Nie usuwa opatrunku ani nie leczy rany klatki. Po zakończeniu jego działania wcześniejszy aktywny lek może nadal mieć znaczenie. Nalokson słabnie wcześniej niż opioid: monitoruj trend oddechu i panel podtrzymania zamiast zakładać trwałe odwrócenie problemu."
  },
  {
    "id": "exp-allergy",
    "title": "Reakcja alergiczna to osobny problem",
    "text": "Duszność po reakcji alergicznej ma inny cel leczenia niż rana klatki. Wywiad ujawnia zgłaszane alergie, ale nie każdy pacjent może odpowiedzieć. Adrenalina ma w grze szybki profil dla anaphylaxis, a pozostałe środki wspomagające działają wolniej. Chlorfenamina ani hydrokortyzon nie zastępują pilnego rozwiązania problemu w tym modelu."
  },
  {
    "id": "exp-glucose",
    "title": "Glukoza: badanie przed preparatem",
    "text": "Osłabienie, poty i trudny kontakt mogą mieć kilka przyczyn. Glukometr pozwala sprawdzić problem glucoseLow bez oglądania ukrytych urazów innych okolic. Żel glukozowy wymaga przytomności. Poprawa komfortu po preparacie nie wyklucza równoczesnego krwawienia lub złamania."
  },
  {
    "id": "exp-nausea",
    "title": "Nudności podczas oczekiwania",
    "text": "W grze nudności są osobnym objawem, na który może działać lek przeciwwymiotny. Podanie ondansetronu przez słaby dostęp IV daje słabszą część efektu. Nie jest to metoda poprawiania saturacji, zabezpieczenia złamania ani zatrzymania krwi. Każda niepotrzebna porcja zmniejsza zapas na później."
  },
  {
    "id": "exp-temperature",
    "title": "Za zimno i za gorąco",
    "text": "Koc ogranicza utratę ciepła, pakiet aktywnego ogrzewania ma określony czas działania, a mata chłodząca zmienia temperaturę w przeciwną stronę. Nie używaj obu tylko dlatego, że są w torbie. Sprawdź aktualny trend temperatury i warunki zdarzenia. Zakończenie aktywności pakietu nie oznacza zakończenia całej opieki."
  },
  {
    "id": "exp-hydration",
    "title": "Odwodnienie a utrata krwi",
    "text": "Nawodnienie doustne w grze wymaga bezpiecznego przełykania i daje ograniczone wsparcie. Płyn IV korzysta z wybranego wenflonu i jego przepływu. Żaden z nich nie zatrzymuje krwawienia. Podobna bladość u dwóch pacjentów nie oznacza tego samego problemu."
  },
  {
    "id": "exp-suction",
    "title": "Płyn w drogach oddechowych",
    "text": "Głośny oddech może wynikać z pozycji pacjenta lub przeszkody płynowej. Ssak ręczny działa w grze na airwayFluid; jego zapas i czas są ograniczone. Tlen wspiera utlenowanie, ale sam nie usuwa przeszkody. Gdy po czynności trend się nie poprawia, zbadaj inne przyczyny zamiast powtarzać identyczne działanie."
  },
  {
    "id": "exp-chest-support",
    "title": "Podparcie klatki nie zamyka rany",
    "text": "Poduszka daje w modelu gry czasowe wsparcie komfortu i niewielkie wsparcie oddechu. Opatrunek klatki rozwiązuje inny problem: otwartą ranę. Stłuczenie płuca, złamanie żebra i rana zasysająca mogą wymagać różnych decyzji. Porównuj wynik badania z tym, co faktycznie założyłeś."
  },
  {
    "id": "exp-deep-wound",
    "title": "Tamponada i oszczędzanie gaz",
    "text": "Pakiet tamponady bardzo silnie ogranicza krwawienie jednej rany w grze, lecz jego założenie trwa dłużej. Przy kilku zmianach nie obejmie automatycznie całej nogi. Upewnij się, że wybrałeś właściwy znacznik. Niewielkie sączenie, masywny krwotok i krwawienie wewnętrzne mają inny koszt czasowy oraz zasobowy."
  },
  {
    "id": "exp-reserves",
    "title": "Planowanie torby na długą ewakuację",
    "text": "Nie zużywaj wszystkich silnych środków w pierwszej minucie bez rozpoznania. Zostaw zapas na kolejne miejsce krwawienia, nieudane wkłucie i wyczerpaną butlę. Sprzęt wielorazowy nadal kosztuje czas czynności. Zegar działa także podczas wybierania wyposażenia, więc w razie potrzeby użyj pauzy do zaplanowania kolejności. Po większej interwencji sprawdź rzeczywisty efekt i trend, zanim wybierzesz następną rzecz. Po wznowieniu automatu pacjent, wlewy, leki i ewakuacja znów zmieniają się wraz z czasem."
  },
  {
    "id": "exp-live-monitor",
    "title": "Monitor na żywo i ręczne badania",
    "text": "Monitor jest domyślnie podłączony i pokazuje zmiany parametrów podczas płynącej symulacji wraz z krótką historią trendu. Po odłączeniu zatrzymuje ostatni odczyt; ponowne podłączenie wznawia obserwację. Pauza zatrzymuje automatyczny upływ sekund, ale nie usuwa kosztu wykonanej czynności. Tempo 1×, 2× lub 4× określa szybkość całej symulacji, nie tylko animacji monitora. Ręczne badania miejscowe nadal dają wyniki konkretnej chwili i nie stają się automatycznym badaniem całego ciała. Poradnik, procedura i karta przeglądarki w tle automatycznie wstrzymują zegar."
  },
  {
    "id": "exp-assessment-tools",
    "title": "Wybór narzędzia badania",
    "text": "Latarka, glukometr, termometr, stetoskop i badanie czucia odpowiadają na różne pytania. Narzędzie nie powinno magicznie ujawniać wszystkich urazów. Wybierz okolicę i rodzaj oceny pasujący do objawu. Dobre badanie pomaga oszczędzić czas i wyposażenie, ale samo nie leczy pacjenta."
  },
  {
    "id": "exp-treatment-review",
    "title": "Kontrola skutku zamiast listy odhaczonych rzeczy",
    "text": "Po czynności obejrzyj sprzęt na ciele, aktualny trend i wynik miejscowego badania. Sprawdź, czy opatrunek jest na właściwej ranie, wenflon nie leży pod stazą, a aktywny środek nie wygasł. Jeden poprawny parametr nie oznacza stabilizacji wszystkich układów. Skuteczną decyzję oceniaj po jej celu, nie po liczbie użytych przedmiotów."
  },
  {
    "id": "exp-drug-sources",
    "title": "Źródła opisów nowych leków",
    "text": "Nazwy i ogólne klasy leków oparto na publicznych materiałach instytucji medycznych. Czasy, porcje, modyfikatory, efekty uboczne i ich związki z parametrami są fikcyjnym balansem gry. Nie odwzorowujemy rzeczywistego dawkowania, pełnych przeciwwskazań ani uprawnień zawodowych. Linki służą przejrzystości opisów; gra nie pobiera z tych serwisów żadnych danych podczas rozgrywki.",
    "links": [
      [
        "NHS — fentanyl",
        "https://www.nhs.uk/medicines/fentanyl/about-fentanyl/"
      ],
      [
        "NHS Scotland — ketamina",
        "https://www.rightdecisions.scot.nhs.uk/scottish-palliative-care-guidelines/medicine-information/ketamine/"
      ],
      [
        "NHS — anafilaksja",
        "https://www.nhs.uk/conditions/anaphylaxis/"
      ],
      [
        "NHS — hipoglikemia",
        "https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/"
      ],
      [
        "GOV.UK — nalokson",
        "https://www.gov.uk/guidance/supplying-take-home-naloxone-without-a-prescription"
      ],
      [
        "MedlinePlus — ipratropium",
        "https://medlineplus.gov/druginfo/meds/a695021.html"
      ],
      [
        "NHS — ibuprofen",
        "https://www.nhs.uk/medicines/ibuprofen-for-adults/"
      ],
      [
        "NHS — chlorfenamina",
        "https://www.nhs.uk/medicines/chlorphenamine-including-piriton/about-chlorphenamine/"
      ],
      [
        "NHS — hydrokortyzon",
        "https://www.nhs.uk/medicines/hydrocortisone/"
      ],
      [
        "Ulotka producenta — ondansetron",
        "https://www.medicines.org.uk/emc/files/pil.13787.pdf"
      ]
    ]
  },
  {
    "id": "r2-glass-protection",
    "title": "Szkło i ciała obce: osłoń, nie wyciągaj",
    "text": "W grze tkwiący przedmiot zabezpieczasz pierścieniem ochronnym i opatrunkiem. Brak nacisku na otwór oraz ograniczenie ruchu zmniejszają ból. Nie pomijaj mniejszej rany obok."
  },
  {
    "id": "r2-flash-eyes",
    "title": "Błysk, oczy i oparzenie skóry",
    "text": "Po silnym błysku oczy i skóra potrzebują osobnych działań. Płuczka do oczu łagodzi podrażnienie, a hydrożel chłodzi oparzenie. Oba objawy bywają widoczne równocześnie."
  },
  {
    "id": "r2-wrap-vs-splint",
    "title": "Opaska, orteza i szyna",
    "text": "Opaska pomaga przy skręceniu i stłuczeniu, orteza odciąża goleń lub kostkę, a szyna unieruchamia złamanie. Wybierz sprzęt do rodzaju urazu, nie do samej okolicy."
  },
  {
    "id": "r2-hematoma",
    "title": "Krwiak: wygląd nie mówi wszystkiego",
    "text": "Duże zasinienie może oznaczać ukrytą utratę krwi. Opatrunek jej nie zatrzyma. Obserwuj tętno, ciśnienie i ból oraz ogranicz ruch okolicy do czasu transportu."
  },
  {
    "id": "r2-local-vs-oral",
    "title": "Znieczulenie miejscowe i doustne",
    "text": "Lidokaina działa w wybranej okolicy, a metamizol wymaga przytomności i przełykania. Sprawdź, czy lek pasuje do miejsca bólu i stanu pacjenta, zanim zużyjesz zapas."
  },
  {
    "id": "r2-many-small",
    "title": "Wiele małych problemów",
    "text": "Zgłoszenie z kilkoma lekkimi urazami wymaga kolejności: krwawienie, oddech, ból, potem komfort. Każdy z nich może dać punkty, ale rozproszenie przy jednym ignoruje drugi."
  },
  {
    "id": "amputation-game",
    "title": "Amputacja urazowa — gra",
    "text": "Gdy brakuje części kończyny, brakującego odcinka nie można wybrać ani nic na nim założyć. Krwawienie z kikuta zatrzymuje w grze wyłącznie staza powyżej miejsca odcięcia na tej samej kończynie: przy utracie dłoni lub stopy — na przedramieniu albo podudziu (lub wyżej), przy utracie przedramienia lub podudzia — na ramieniu albo udzie. Opatrunek na znaczniku kikuta tylko nieznacznie spowalnia krwawienie, a gaza hemostatyczna zmniejsza je najwyżej o połowę. Częściowa amputacja palców jest mniejszym urazem: wystarcza zabezpieczenie rany. To model gry, nie instrukcja kliniczna."
  },
  {
    "id": "joint-segments",
    "title": "Nowe segmenty stawów",
    "text": "Kończyny mają po sześć odcinków: bark, ramię, łokieć, przedramię, nadgarstek i dłoń oraz biodro, udo, kolano, podudzie, kostkę i stopę. Bark, nadgarstek, biodro i kostka to krótkie stawy: nie przyjmują stazy ani wenflonu. Szyna obejmuje swój odcinek i sąsiednie, a krótki staw nie przerywa zasięgu — szyna na przedramieniu nadal unieruchamia także dłoń, a na podudziu stopę. Staza zatrzymuje krwawienie tylko poniżej siebie, więc rana barku lub biodra nie jest nią objęta."
  },
  {
    "id": "p3-drug-curves",
    "title": "Leki w grze — narastanie i słabnięcie działania",
    "text": "Lek nie działa od razu i nie wyłącza się nagle. Po podaniu najpierw musi się wchłonąć, a potem dotrzeć do miejsca działania: dożylnie dzieje się to najszybciej, domięśniowo w ciągu kilku minut, wziewnie podobnie, a doustnie najwolniej. Panel podtrzymania pokazuje przy każdym leku pasek siły i fazę: działanie narasta, szczyt działania albo działanie słabnie. Kolejna porcja dodaje się do tego, co jeszcze krąży — przy lekach przeciwbólowych daje niewiele więcej ulgi, za to wyraźnie nasila senność i spowalnia oddech, zwłaszcza we wstrząsie. Antagonista opioidów działa krócej niż sam opioid, więc oddech może znów zwolnić. Niektóre leki, jak kortykosteroid, działają dopiero po wielu godzinach i w czasie wezwania nic nie zmieniają. Gra liczy umowne porcje i nie podaje rzeczywistych dawek."
  },
  {
    "id": "p3-heat-cold",
    "title": "Ciepło i wychłodzenie",
    "text": "Temperatura pacjenta wynika z bilansu ciepła: organizm wytwarza ciepło, a traci je do otoczenia. Utrata rośnie przy zimnie, wietrze i mokrym ubraniu (mokry pacjent traci ciepło kilka razy szybciej), przy odsłanianiu kolejnych okolic podczas badania i przy oparzeniach; zimne płyny dożylne też chłodzą. Koc termiczny ogranicza utratę o około dwie trzecie, pakiet ogrzewający dodaje niewiele ciepła i działa najlepiej razem z kocem. Drżenie mięśni ogrzewa, ale słabnie we wstrząsie, po lekach nasennych i w głębokim wychłodzeniu. Wychłodzony pacjent staje się splątany, a bardzo głębokie wychłodzenie grozi migotaniem komór — defibrylacja pomaga dopiero po ogrzaniu. W upale bez pocenia temperatura dalej rośnie i zaburza świadomość; mata chłodząca ją obniża. Sprawdzaj termometrem trend, nie tylko jeden odczyt."
  },
  {
    "id": "conditions-categories",
    "title": "Stany i kategorie wezwań",
    "text": "Przycisk „Nowe wezwanie” otwiera dyspozytornię: wybierasz poziom trudności i kategorię zgłoszenia — drobne urazy, poważne obrażenia zewnętrzne, zagadkę diagnostyczną, stany nagłe medyczne, środowisko i wypadki albo urazy wielomiejscowe. Konkretny stan poszkodowanego jest losowany w obrębie kategorii; „Losowa” bierze dowolny. Na pasku zgłoszenia widać tylko kategorię i ciężkość, a nie rozpoznanie. Nie każdy stan to widoczna rana: czasem trzeba od razu zbadać głowę, klatkę lub brzuch, zebrać wywiad, zmierzyć glukozę albo temperaturę, zanim pojawią się objawy. Opis zdarzenia w zagadkach bywa mylący — ufaj badaniu, nie pierwszemu wrażeniu. Każdy stan ma ukryty protokół kilku kroków z terminem w czasie gry. Krok wykonany po terminie liczy się w połowie, a pominięty powoduje jednorazowe pogorszenie stanu i wpis w dzienniku. Na łatwym poziomie terminy są dłuższe, na trudnym krótsze. Podsumowanie po interwencji ujawnia nazwę stanu, listę kroków (na czas, spóźnione, pominięte) i dodaje część oceny „Protokół”. Terminy i skutki są umownym balansem gry, nie wytycznymi klinicznymi."
  },
  {
    "id": "p4-clot-pressure",
    "title": "Skrzep i ciśnienie",
    "text": "W grze rana zabezpieczona opatrunkiem lub gazą krwawi coraz słabiej, bo z czasem tworzy się w niej skrzep. Skrzep rośnie tylko wtedy, gdy przepływ w ranie jest już mały, a krzepnięcie sprawne. Krzepnięcie słabnie, gdy pacjent jest wychłodzony, gdy krew jest rozcieńczona dużą ilością płynów, gdy narasta zakwaszenie we wstrząsie i gdy pacjent stracił już dużo krwi — to tak zwana triada śmierci, która sama napędza dalsze krwawienie. Świeży skrzep jest kruchy: utrzymuje ciśnienie zbliżone do tego, przy którym powstał. Gwałtowny wzrost ciśnienia — po szybkim podaniu płynów, po lekach podnoszących ciśnienie albo przy silnym bólu — może go zerwać i opatrunek znów zaczyna przesiąkać. Dlatego w grze opłaca się utrzymywać krążenie wystarczające do zachowania przytomności, zamiast na siłę przywracać pełne ciśnienie, chronić pacjenta przed zimnem i oszczędnie gospodarować płynami. To umowny model gry, nie wytyczne postępowania."
  },
  {
    "id": "complications",
    "title": "Komplikacje w trakcie interwencji",
    "text": "Na poziomach normalnym, trudnym i eksperckim stan poszkodowanego może się nagle zmienić także po wykonaniu właściwych czynności: założony sprzęt bywa zawodny, a pacjent reaguje nieprzewidywalnie. Każda komplikacja jest ogłaszana komunikatem i wpisem w dzienniku. Zatrzymaj się wtedy, oceń jeszcze raz miejsce, którego dotyczy, i sprawdź, czy wcześniejsze zabezpieczenie nadal działa — każdą da się opanować sprzętem i czynnościami z torby. Na koniec ocena podaje liczbę komplikacji i to, ile z nich opanowano; nie zmienia to maksymalnej liczby punktów. Na poziomie eksperckim monitor trzeba najpierw podłączyć, a większość urazów widać dopiero po zbadaniu okolicy."
  },
  {
      "id": "r3-junctional",
      "title": "Krwawienie węzłowe: gdzie staza nie pasuje",
      "text": "Szyja i pachwina to miejsca, w których zwykła staza nie działa. W grze takie rany oznaczono jako węzłowe: zatrzymuje je tamponada gazą hemostatyczną, opatrunek uciskowy albo wyspecjalizowany sprzęt (opaska na szyję, staza węzłowa przy pachwinie). Zacznij od zabezpieczenia rany, dopiero potem wracaj do reszty badania. Sprzęt węzłowy działa tylko w swoim miejscu: opaska na szyję nie zadziała na pachwinie. To uproszczony balans rozgrywki, nie instrukcja."
  },
  {
      "id": "r3-neck-groin",
      "title": "Szyja i pachwina: kolejność działań",
      "text": "Przy krwotoku z szyi lub pachwiny czas liczy się w sekundach. Wezwij ewakuację, zabezpiecz ranę, a dopiero potem podłączaj monitor i zakładaj IV. Rana szyi pogarsza także oddech, więc obserwuj saturację. W grze tego rodzaju rany krwawią silniej niż większość ran kończyn, ale zwykła gaza hemostatyczna redukuje krwawienie bardzo mocno."
  },
  {
      "id": "r3-degloving",
      "title": "Zdarcie skóry: staza nad raną",
      "text": "Rozległe zdarcie skóry kończyny w grze krwawi jak duże naczynie. Zwykły opatrunek tylko spowalnia krwawienie, dlatego zakładasz stazę powyżej rany: na ramieniu lub przedramieniu. Szeroka staza taktyczna działa tak samo jak podstawowa, ale masz tylko jedną. Po założeniu stazy zajmij się pozostałymi urazami; staza nie leczy złamania ani bólu."
  },
  {
      "id": "r3-scalp-skull",
      "title": "Rana głowy a uraz czaszki",
      "text": "Rany skóry głowy krwawią obficie, ale zwykle da się je opanować opatrunkiem. Jeśli w ranie widać zapadniętą kość, to w grze uraz czaszki: osłoń ranę bez ucisku, sprawdź źrenice i pilnuj oddechu. Ospałość jest sygnałem, że doustne leki nie będą bezpieczne. Wczesna ewakuacja jest równie ważna jak opatrunek."
  },
  {
      "id": "r3-spleen-delay",
      "title": "Opóźnione krwawienie wewnętrzne",
      "text": "Niektóre urazy brzucha na początku wyglądają niewinnie. W grze stłuczenie śledziony może po zaniedbaniu przejść w aktywne krwawienie wewnętrzne. Badaj brzuch po każdym uderzeniu w bok lub tułów, nawet jeśli pacjent twierdzi, że nic mu nie jest. Krwawienia wewnętrznego nie zatrzyma opatrunek; wspierają je szybka ewakuacja i lek hamujący krwawienie."
  },
  {
      "id": "r3-hidden-chest",
      "title": "Ukryty krwiak w klatce",
      "text": "Niewielka rana zewnętrzna nie mówi, co dzieje się w klatce. W grze ukryte krwawienie w klatce objawia się szybkim, płytkim oddechem, bladością i słabnącym tętnem. Opatrunek wentylowy nie pomoże, bo nie ma otwartej rany do uszczelnienia. Liczą się tlen, osłuchanie, kontrola parametrów i wczesna ewakuacja."
  },
  {
      "id": "r3-compartment",
      "title": "Napięte przedramię: ból bez rany",
      "text": "Przygniecenie ręki może wywołać narastające napięcie tkanek, mimo braku widocznej rany. W grze objawia się twardym, bolesnym przedramieniem i drętwieniem palców. Zimny okład i środek przeciwbólowy pomagają, ale zasadniczym działaniem jest wczesna ewakuacja. Nie zakładaj dodatkowych ciasnych opasek."
  },
  {
      "id": "r3-flail-support",
      "title": "Niestabilna klatka i pas stabilizujący",
      "text": "Gdy fragment klatki porusza się przeciwnie do oddechu, oddychanie staje się płytkie i bolesne. Pas stabilizujący żebra poprawia oddychanie i zmniejsza ból w grze, a środek przeciwbólowy dodatkowo ułatwia głębszy oddech. Tlen pomaga, ale nie rozwiązuje przyczyny. Jeśli pas jest na wyczerpaniu, zachowaj go dla pacjenta, który naprawdę go potrzebuje."
  },
  {
      "id": "r3-afterdrop",
      "title": "Wtórne wychłodzenie",
      "text": "Pacjent po wejściu do ciepła czuje się lepiej, ale jego temperatura nadal może spadać. W grze takie wychłodzenie wymaga ciągłego ogrzewania: koc, pakiet ogrzewający i duży koc ratunkowy działają przez ograniczony czas. Co kilka minut sprawdzaj temperaturę termometrem. Sama poprawa samopoczucia nie jest dowodem, że pacjent jest bezpieczny."
  },
  {
      "id": "r3-puzzle-clues",
      "title": "Zagadki: jak czytać mylący opis",
      "text": "W stanach z kategorii zagadka opis zdarzenia celowo prowadzi na fałszywy trop. Zwróć uwagę na wywiad, pytania pacjenta i zachowanie otoczenia. Badaj wszystkie okolice wskazane przez objawy, nawet jeśli pacjent twierdzi, że nic nie boli. Nagłe pogorszenie po upływie terminu oznacza, że przyczyna nadal trwa; wróć do badania."
  },
  {
      "id": "r3-small-injuries",
      "title": "Drobne urazy: kolejność i oszczędzanie zapasów",
      "text": "Drobne urazy nie zagrażają życiu, ale zużywają czas i sprzęt. Najpierw zabezpiecz krwawienie, potem unieruchom złamany palec, na koniec osłoń oparzenie lub otarcie. Paski zamykające ranę, tampon do nosa i szyna na palec mają mały zapas, więc nie marnuj ich na rany, które lepiej opatrzyć zwykłym opatrunkiem."
  },
  {
      "id": "r3-colic-vs-bleed",
      "title": "Ból bez urazu: kolka i hiperwentylacja",
      "text": "Nie każdy silny ból oznacza krwawienie. Kolka nerkowa i hiperwentylacja w grze nie powodują utraty krwi, więc sprzęt do krwawień nie pomoże. Lek rozkurczowy lub przeciwbólowy zmniejsza ból, a rozmowa, wywiad i pomiar oddechu pomagają przy szybkim oddychaniu. Najważniejsze jest wykluczenie groźniejszych przyczyn przed uznaniem objawów za niegroźne."
  },
  {
      "id": "r3-analgesic-choice",
      "title": "Wybór leku przeciwbólowego",
      "text": "Leki z grupy niesteroidowych (ibuprofen, diklofenak, ketorolak) zwiększają w grze tempo krwawienia, więc przy aktywnym krwawieniu wybieraj inne. Tramadol działa jak słaby opioid: lekko obciąża oddech i można go odwrócić naloksonem. Gaz do wdychania działa szybko i krótko. Kolejne porcje zawsze się kumulują."
  },
  {
      "id": "r3-sedation",
      "title": "Uspokojenie i sedacja",
      "text": "Lek uspokajający w grze łagodzi stan lęku i napięcia, ale usypia i obciąża oddech. Nie podawaj go pacjentowi z zaburzonym oddechem bez bardzo dobrego powodu. Środek działa szybko i krótko, więc po podaniu ponownie oceń oddech i świadomość. Razem z lekami opioidowymi jego działanie się sumuje."
  },
  {
      "id": "r3-supply-variants",
      "title": "Warianty sprzętu i nożyce ratownicze",
      "text": "W torbie pojawiły się warianty znanych elementów: szeroka staza, duża gaza hemostatyczna, pas miednicy SAM i opaska uciskowa na szyję. Działają jak odpowiedniki, ale mają różne zapasy i miejsca zastosowania. Nożyce ratownicze odsłaniają widoczne zmiany w wybranej okolicy, nie ujawniają urazów ukrytych i nie zastępują badania."
  },
  {
      "id": "r4-tension-pneumo",
      "title": "Odma prężna: kiedy klatka dusi pacjenta",
      "text": "Duszność narastająca mimo tlenu, cichy oddech po jednej stronie, przesunięta tchawica i sinienie to sygnały odmy prężnej. W grze to uraz ukryty: dopóki nie zbadasz klatki albo nie osłuchasz jej stetoskopem, nie zobaczysz go. Odbarczenie igłą po stronie urazu natychmiast poprawia oddech; tlen sam nie wystarczy. Po zabiegu nadal obserwuj saturację."
  },
  {
      "id": "r4-needle-decompression",
      "title": "Zestaw do odbarczenia odmy prężnej",
      "text": "Zestaw działa tylko na klatkę z odmą prężną i zużywa się po jednym użyciu. Wybierz klatkę piersiową i właściwą ranę z listy urazów. Użycie przy innym urazie niczego nie zmienia. Efekt jest widoczny od razu w saturacji i oddechu, a po zabiegu pacjent nadal wymaga tlenu i ewakuacji."
  },
  {
      "id": "r4-nasal-airway",
      "title": "Rurka nosowo-gardłowa u pacjenta przytomnego",
      "text": "Rurka ustno-gardłowa nie jest tolerowana przez pacjenta, który reaguje. Rurka nosowo-gardłowa utrzymuje drożność także wtedy, gdy pacjent jeszcze odpowiada. W grze zakładasz ją na głowę i działa jak udrożnienie dróg oddechowych. Nie zastępuje tlenu, a przy podejrzeniu urazu głowy wybieraj ją ostrożnie."
  },
  {
      "id": "r4-airway-burn",
      "title": "Oparzenie dróg oddechowych po pożarze",
      "text": "Osmolone włosy w nosie, sadza w ustach, ochrypły głos i kaszel po dymie zapowiadają obrzęk gardła. Obrzęk narasta z minuty na minutę, więc drożność zabezpieczasz wcześnie, zanim pacjent zacznie się dusić. Dodaj tlen i obserwuj głos. Oparzenie dłoni jest ważne, ale nie przed oddechem."
  },
  {
      "id": "r4-lucid-interval",
      "title": "Pozorna poprawa po urazie głowy",
      "text": "Krótka utrata przytomności, chwilowa poprawa i narastająca senność mogą oznaczać krwiak, który rośnie po cichu. W grze poprawa po urazie głowy bywa pozorna: badanie źrenic i wczesna ewakuacja ograniczają ryzyko pogorszenia. Nie zostawiaj pacjenta samego i nie podawaj niczego doustnie, jeśli senność narasta."
  },
  {
      "id": "r4-femur",
      "title": "Złamanie kości udowej i ukryta utrata krwi",
      "text": "Udo mieści kilkaset mililitrów krwi w jednym krwiaku, więc złamanie uda wymaga szyny i obserwacji krążenia, a nie samego opatrunku. Szyna trakcyjna zmniejsza ból i ogranicza ukryty krwiak. Jeśli pacjent blednie i przyspiesza, myśl o utracie krwi, a nie tylko o bólu."
  },
  {
      "id": "r4-kidney",
      "title": "Uraz nerki po upadku",
      "text": "Ból pleców, ciemny mocz i bladość po upadku to sygnały uszkodzenia nerki. Krwawienie jest ukryte, więc badaj brzuch i plecy, rozważ kwas traneksamowy i wezwij ewakuację. Opatrunek niczego tu nie zmienia, bo rany zewnętrznej zwykle nie ma."
  },
  {
      "id": "r4-brachial-artery",
      "title": "Tętnica ramienia: staza w pierwszej minucie",
      "text": "Jasna krew w rytmie tętna z ramienia wymaga stazy powyżej rany. Opatrunek uciskowy nie wystarczy, a każda minuta zwłoki to utrata krwi. Po założeniu stazy sprawdź, czy krwawienie ustało, i zanotuj czas założenia, bo długie utrzymanie pogarsza ukrwienie kończyny."
  },
  {
      "id": "r4-abdominal-wound",
      "title": "Rana brzucha z wypadnięciem narządów",
      "text": "Wypadniętych narządów nie wpychasz z powrotem. W grze zakrywasz ranę wilgotnym opatrunkiem, układasz pacjenta wygodnie i szybko wzywasz ewakuację. Nie podawaj nic doustnie. Opatrunek ogranicza krwawienie, ale nie zastępuje szpitala."
  },
  {
      "id": "r4-crushed-hand",
      "title": "Zmiażdżona dłoń: opatrunek, szyna i ból",
      "text": "Dłoń po zmiażdżeniu krwawi z tkanek miękkich i ma wiele złamań. Najpierw zabezpiecz ranę, potem unieruchom rękę, a ból łagodź lekiem dostosowanym do stanu pacjenta. Staza jest potrzebna dopiero wtedy, gdy krwotok z przedramienia nie ustępuje."
  },
  {
      "id": "r4-clavicle",
      "title": "Złamany obojczyk i unieruchomienie barku",
      "text": "Opuszczony bark, widoczny uskok kości i podtrzymywanie ręki drugą dłonią wskazują na złamanie obojczyka. Unieruchom bark ósemką lub temblakiem, ułóż rękę wygodnie i oceń czucie w palcach. Nie zginaj barku na siłę."
  },
  {
      "id": "r4-kneecap",
      "title": "Zwichnięta rzepka i unieruchomienie kolana",
      "text": "Zwichnięta rzepka powoduje ostry ból i niemożność wyprostowania nogi. W grze nie nastawiasz stawu: podpierasz kolano w pozycji, którą pacjent przyjął, chłodzisz i unieruchamiasz ortezą. Sprawdź czucie i ukrwienie stopy."
  },
  {
      "id": "r4-achilles",
      "title": "Zerwanie ścięgna Achillesa",
      "text": "Nagły ból przy sprincie, trzask i brak siły w zgięciu stopy sugerują zerwanie ścięgna. Odciąż nogę, unieruchom kostkę ortezą i chłodź. Pacjent powinien się nie obciążać, a transport powinien uwzględniać uniesioną nogę."
  },
  {
      "id": "r4-frostbite",
      "title": "Odmrożone palce: ogrzewanie bez rozcierania",
      "text": "Woskowo blade, twarde palce bez czucia to objaw odmrożenia. Nie rozcieraj ich, nie przykładaj ognia ani gorącej wody. Okryj dłonie i całego pacjenta, zdejmij mokre rękawice, chroń przed urazem. Dalsze wychłodzenie jest groźniejsze niż samo odmrożenie."
  },
  {
      "id": "r4-alcohol-masks",
      "title": "Alkohol maskuje urazy",
      "text": "Zapach alkoholu nie wyklucza urazu głowy, niskiej glukozy ani krwawienia. Zawsze zbierz wywiad, zmierz glukozę i zbadaj głowę. Pacjent pijany może zasnąć i zachłysnąć się, więc pilnuj drożności i temperatury."
  },
  {
      "id": "r4-eye-protection",
      "title": "Osłona oka bez ucisku",
      "text": "Uszkodzone oko osłaniasz sztywną osłoną, a nie bandażem uciskowym. Nie wyjmuj ciał obcych i nie płucz, jeśli nie ma oparzenia chemicznego. Zakryj oba oczy tylko wtedy, gdy ruch jednego powoduje ruch drugiego, i uspokój pacjenta."
  },
  {
      "id": "r4-avulsed-tooth",
      "title": "Wybity ząb i rana wargi",
      "text": "Wybity ząb chwytasz za koronkę, nie za korzeń, i przechowujesz w odpowiednim płynie. Krwawienie z dziąsła zatrzymuje gaza. Wargę opatrz osobno, a pacjenta ułóż w pozycji siedzącej. Czas do zgłoszenia się do stomatologa ma znaczenie."
  },
  {
      "id": "r4-ear-eyelid",
      "title": "Rany ucha i powieki",
      "text": "Rany głowy i twarzy krwawią obficie, ale zwykle wystarcza opatrunek. Ucho zabezpiecz opatrunkiem, powiekę osłoń lekko i bez ucisku na gałkę. Zawsze sprawdź, czy nie ma urazu głowy ani oka."
  },
  {
      "id": "r4-new-meds",
      "title": "Nowe leki: opioidy, rozkurczowe i uspokajające",
      "text": "W torbie pojawiły się nalbufina, oksykodon, butyloskopolamina, diazepam, terbutalina, glukagon, prometazyna, naproksen, nefopam i żel z lidokainą. Różnią się drogą podania, czasem działania i obciążeniem oddechu. Opioidy wymagają kontroli oddechu, a leki przeciwbólowe z grupy niesteroidowych mogą nasilać krwawienie."
  },
  {
      "id": "r4-supply-variants",
      "title": "Nowe warianty sprzętu: osłony, ortezy, ogrzewacze",
      "text": "W torbie pojawiły się szyna trakcyjna uda, ósemka na obojczyk, orteza kolana, but kostki, szyna na kciuk, osłona oka, opatrunek na ucho, opatrunek brzuszny, zestaw na ząb, bivak, ogrzewacze i proszek hemostatyczny. Każdy ma swoje wskazanie, więc czytaj opisy przed użyciem."
  }
];
