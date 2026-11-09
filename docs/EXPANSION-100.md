# Rozszerzenie: 100 nowych elementów gry

Lista obejmuje 100 nowych wpisów zawartości: 25 urazów, 25 zgłoszeń, 20 elementów wyposażenia, 10 leków i 20 tematów poradnika. Nowy interfejs, monitor na żywo, tempo symulacji oraz mechaniki efektów są dodatkowymi zmianami poza tym zestawieniem.

| Kategoria | Dodano | Łącznie po rozszerzeniu | Katalog |
| --- | ---: | ---: | --- |
| Urazy | 25 | 34 | [injuries.js](../src/content/injuries.js) |
| Zgłoszenia | 25 | 31 | [scenarios.js](../src/content/scenarios.js) |
| Wyposażenie | 20 | 35 | [items.js](../src/content/items.js) |
| Leki | 10 | 14 | [items.js](../src/content/items.js) |
| Poradniki | 20 | 31 | [guides.js](../src/content/guides.js) |
| **Suma** | **100** | **145** | |

Zestawienie maszynowe znajduje się w plikach [expansion-injuries-cases.json](expansion-injuries-cases.json) i [expansion-equipment-guides.json](expansion-equipment-guides.json). Stabilne identyfikatory łączą definicje, efekty, scenariusze oraz zapis gry.

## Nowe urazy

1. **Rozległa rana cięta** — `laceration`
2. **Rana kłuta** — `puncture`
3. **Rozległe otarcie** — `abrasion`
4. **Rana szarpana z ubytkiem tkanek** — `avulsion`
5. **Rana odłamkowa** — `shrapnel`
6. **Rana skóry głowy** — `scalpCut`
7. **Krwawienie z nosa** — `noseBleed`
8. **Rana kąsana** — `biteWound`
9. **Oparzenie termiczne** — `thermalBurn`
10. **Oparzenie chemiczne skóry** — `chemicalBurn`
11. **Oparzenie po łuku elektrycznym** — `electricalBurn`
12. **Uraz z zimna** — `coldInjury`
13. **Skręcenie stawu** — `sprain`
14. **Podejrzenie zwichnięcia** — `dislocation`
15. **Uraz z przygniecenia** — `crushInjury`
16. **Podejrzenie złamania żeber** — `ribFracture`
17. **Stłuczenie klatki z zaburzeniem oddechu** — `lungContusion`
18. **Narażenie na dym** — `smokeExposure`
19. **Zaleganie treści w drogach oddechowych** — `aspiration`
20. **Reakcja alergiczna z dusznością** — `allergicReaction`
21. **Podejrzenie niskiego poziomu glukozy** — `hypoglycemia`
22. **Odwodnienie** — `dehydration`
23. **Wyczerpanie w upale** — `heatExhaustion`
24. **Podrażnienie oka** — `eyeIrritation`
25. **Nudności i odruchy wymiotne** — `nausea`

## Nowe zgłoszenia

26. **Rozbita witryna** — `glassDoor`
27. **Upadek na ogrodzenie** — `fenceFall`
28. **Wypadek przy pile w lesie** — `forestSaw`
29. **Odłamki w kamieniołomie** — `quarryDebris`
30. **Upadek w skateparku** — `skatepark`
31. **Pogryzienie na gospodarstwie** — `farmDog`
32. **Poparzenie w kuchni polowej** — `canteenBurn`
33. **Rozlana ciecz w magazynie** — `chemicalStore`
34. **Zdarzenie przy rozdzielni** — `electricalPanel`
35. **Przemarznięty turysta** — `winterShelter`
36. **Zderzenie na boisku** — `footballPitch`
37. **Upadek na bark** — `shoulderFall`
38. **Przygniecenie na rampie** — `loadingBay`
39. **Uderzenie klatką o schody** — `stairChest`
40. **Rowerzysta na barierze** — `bikeBarrier`
41. **Wyniesiony z zadymionej szopy** — `shedSmoke`
42. **Wyciągnięty z płytkiego stawu** — `pondRescue`
43. **Nagła reakcja na pikniku** — `picnicAllergy`
44. **Osłabienie na przystanku** — `stationWeakness`
45. **Zasłabnięcie w upale** — `trailHeat`
46. **Zawodnik poza trasą biegu** — `longRace`
47. **Pył w warsztacie** — `dustWorkshop`
48. **Upadek na nabrzeżu** — `dockFall`
49. **Odłamki po zerwaniu poszycia** — `roofDebris`
50. **Upadek na nocnym targu** — `nightMarket`

## Nowe wyposażenie

51. **Hydrożel na oparzenia** — `burnGel`
52. **Zestaw płukania tkanek** — `salineIrrigation`
53. **Osłona oka** — `eyeShield`
54. **Zimny kompres** — `coldCompress`
55. **Temblak** — `armSling`
56. **Pas stabilizujący miednicę** — `pelvicBinder`
57. **Ssak ręczny** — `suction`
58. **Zestaw nawadniania doustnego** — `oralRehydration`
59. **Pakiet aktywnego ogrzewania** — `warmingPack`
60. **Mata chłodząca** — `coolingMat`
61. **Latarka do badania źrenic** — `pupilLight`
62. **Pulsoksymetr napalcowy** — `pulseOximeter`
63. **Glukometr** — `glucometer`
64. **Termometr kontaktowy** — `thermometer`
65. **Stetoskop** — `stethoscope`
66. **Ocena nawrotu kapilarnego** — `capillaryTest`
67. **Zestaw badania czucia** — `sensoryExam`
68. **Pakiet tamponady rany** — `woundPacking`
69. **Stabilizator ciała obcego** — `impaledSupport`
70. **Poduszka podpierająca klatkę** — `chestSupport`

## Nowe leki

71. **Ketamina** — `ketamine`
72. **Fentanyl** — `fentanyl`
73. **Adrenalina** — `adrenaline`
74. **Żel glukozowy** — `glucoseGel`
75. **Nalokson** — `naloxone`
76. **Ondansetron** — `ondansetron`
77. **Bromek ipratropium** — `ipratropium`
78. **Hydrokortyzon** — `hydrocortisone`
79. **Ibuprofen** — `ibuprofen`
80. **Chlorfenamina** — `chlorphenamine`

## Nowe tematy poradnika

81. **Oparzenia: osłoń właściwą zmianę** — `exp-burns`
82. **Przedmiot wbity w ranę** — `exp-foreign-body`
83. **Uraz oka i podrażnienie** — `exp-eyes`
84. **Skręcenie, zwichnięcie i złamanie** — `exp-sprain`
85. **Ukrwienie kończyny po zabezpieczeniu** — `exp-perfusion`
86. **Przeciwbólowe: szybkość kontra ryzyko** — `exp-analgesia`
87. **Nalokson i nawrót obciążenia** — `exp-opioid-reversal`
88. **Reakcja alergiczna to osobny problem** — `exp-allergy`
89. **Glukoza: badanie przed preparatem** — `exp-glucose`
90. **Nudności podczas oczekiwania** — `exp-nausea`
91. **Za zimno i za gorąco** — `exp-temperature`
92. **Odwodnienie a utrata krwi** — `exp-hydration`
93. **Płyn w drogach oddechowych** — `exp-suction`
94. **Podparcie klatki nie zamyka rany** — `exp-chest-support`
95. **Tamponada i oszczędzanie gaz** — `exp-deep-wound`
96. **Planowanie torby na długą ewakuację** — `exp-reserves`
97. **Monitor na żywo i ręczne badania** — `exp-live-monitor`
98. **Wybór narzędzia badania** — `exp-assessment-tools`
99. **Kontrola skutku zamiast listy odhaczonych rzeczy** — `exp-treatment-review`
100. **Źródła opisów nowych leków** — `exp-drug-sources`

## Sprawdzenie liczby i powiązań

Poniższa kontrola sprawdza dokładne liczby, unikalność wpisów w swoich kategoriach oraz obecność każdego identyfikatora w rzeczywistym katalogu gry. Uruchom ją z katalogu repozytorium:

```sh
node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INJURIES} from './src/content/injuries.js';
import {SCENARIOS} from './src/content/scenarios.js';
import {EQUIPMENT,MEDICINES} from './src/content/items.js';
import {GUIDES} from './src/content/guides.js';
const files=['docs/expansion-injuries-cases.json','docs/expansion-equipment-guides.json'];
const additions=files.flatMap(file=>JSON.parse(readFileSync(file,'utf8')));
const expected={injury:25,scenario:25,equipment:20,medicine:10,guide:20};
const catalogs={injury:Object.keys(INJURIES),scenario:SCENARIOS.map(x=>x.id),equipment:EQUIPMENT.map(x=>x.id),medicine:MEDICINES.map(x=>x.id),guide:GUIDES.map(x=>x.id)};
assert.equal(additions.length,100);
assert.equal(new Set(additions.map(x=>x.category+':'+x.id)).size,100);
for(const [category,count] of Object.entries(expected)){
  assert.equal(additions.filter(x=>x.category===category).length,count);
  for(const item of additions.filter(x=>x.category===category))assert.ok(catalogs[category].includes(item.id),item.id);
}
console.log('100 additions: catalog references and category counts verified');
JS
```

## Główne powiązania mechanik

- Nowe zabezpieczenia korzystają z ogólnych efektów `stabilize`, `support` i `assess`. Leczenie konkretnej rany i badanie danej okolicy zachowują osobne cele.
- Leki korzystają z katalogowych modyfikatorów, opóźnienia i czasu aktywności. Skuteczność podania IV nadal zależy od miejscowego przepływu i stazy.
- Nowe zgłoszenia łączą kilka urazów, warunki otoczenia i ukryte ustalenia. Widoczny uraz jest dostępny od razu, a ukryty wymaga odpowiedniego badania.
- Monitor jest domyślnie podłączony i aktualizuje parametry przy działającym zegarze. Pauza zatrzymuje automat, ale wykonana czynność nadal kosztuje czas gry. Poradnik, procedura oraz karta przeglądarki w tle wstrzymują automatyczny upływ.
- Poradniki opisują zasady fikcyjnej rozgrywki. Porcje leków, wartości i czasy nie stanowią rzeczywistych zaleceń medycznych.
