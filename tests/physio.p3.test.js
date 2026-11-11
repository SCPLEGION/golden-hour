import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceTime, restoreGame, SCENARIOS, ITEMS } from '../src/engine.js';
import { tick } from '../src/simulation/physiology.js';
import { clinicalSnapshot, initPhys } from '../src/simulation/physio-model.js';
import { effectCurve, peakOf, drugEffects, drugStatus } from '../src/simulation/physio-pharmacology.js';
import { heatFlows } from '../src/simulation/physio-thermal.js';
import { gcsOf, gcsComponents } from '../src/simulation/physio-neuro.js';
import { respiratoryBurden, pain, vitals, activeDrugDefinitions } from '../src/simulation/selectors.js';
import { PK_ROUTES, HALF_LIFE_MIN, GLUCOSE } from '../src/content/physiology-data.js';
import { GUIDES } from '../src/content/guides.js';
import { renderSupport } from '../src/ui/game-screen.js';
import { renderBag } from '../src/ui/bag.js';
import { act } from './support.js';

const index=id=>SCENARIOS.findIndex(s=>s.id===id);
const scenario=(id,profile)=>createGame(index(id),()=>.99,profile?{profile}:{});
const run=(g,seconds)=>{for(let i=0;i<seconds&&g.status==='active';i++)tick(g);return g;};
// A healthy, painless 75 kg patient indoors (footballPitch with the injuries removed), no ambulance due.
const fresh=(env={tempC:20,wet:0,wind:0})=>{const g=createGame(index('footballPitch'),()=>.5,{profile:{sex:'M',massKg:75}});g.injuries=[];initPhys(g,100,98);g.phys.env=env;return g;};
const withIV=g=>act(g,'iv','rightArm');
// Advances without an ambulance (advanceTime takes ≤ 600 s per call).
const later=(g,s)=>{g=structuredClone(g);g.transportAt=null;for(let left=s;left>0&&g.status==='active';left-=600)g=advanceTime(g,Math.min(600,left));return g;};
const wait=later;

test('PK: the effect-site peak comes later IV < IM < inhaled < oral for the same drug; doses normalise to a unit peak',()=>{
  const ke=Math.LN2/(HALF_LIFE_MIN.long*60),ke0=Math.LN2/300;
  const peaks=['IV','IM','Wziewnie','Doustnie'].map(r=>{const k=PK_ROUTES[r];return k.lagS+peakOf(effectCurve(Math.LN2/k.absHalfS,ke,ke0),40000).t;});
  for(let i=1;i<peaks.length;i++)assert.ok(peaks[i]>peaks[i-1],peaks.map(p=>Math.round(p/60)).join(' < '));
  assert.ok(peaks[0]<30*60&&peaks[3]>45*60&&peaks[3]<90*60,`oral peak ${peaks[3]/60} min`);
  // The curve rises, peaks and falls; a single full porcja of morphine peaks at a normalised level of 1.
  let g=withIV(fresh());g=act(g,'morphine','rightArm');
  const level=t=>drugEffects(later(g,t)).find(e=>e.id==='morphine').level;
  // P4: IV morphine peaks at ~17 min (was ~42).
  const [early,peak,tail]=[level(120),level(1050),level(14400)];
  assert.ok(early<peak&&tail<peak&&Math.abs(peak-1)<.05,`${early} ${peak} ${tail}`);
  assert.deepEqual(drugStatus(later(g,120)).map(d=>d.phase),['narasta']);assert.deepEqual(drugStatus(later(g,10800)).map(d=>d.phase),['słabnie']);
});

test('stacked opioid porcje deepen respiratory depression and drop the GCS; one porcja does not',()=>{
  let one=act(withIV(fresh()),'morphine','rightArm'),three=act(act(one,'morphine','rightArm'),'morphine','rightArm');
  one=later(one,1800);three=later(three,1750);
  const a=clinicalSnapshot(one),b=clinicalSnapshot(three);
  assert.ok(a.gcs>=14&&a.rr>9,`single: GCS ${a.gcs}, RR ${a.rr}`);
  assert.ok(b.gcs<=12&&b.rr<a.rr-4&&b.paco2>a.paco2+8,`stacked: GCS ${b.gcs}, RR ${b.rr}, PaCO2 ${b.paco2}`);
  assert.ok(gcsComponents(three).sedation>2);assert.ok(three.log.some(e=>/Nadmierne działanie leków/.test(e.text)));
});

test('naloxone reverses an opioid, then wears off before the opioid does and the depression returns',()=>{
  let g=withIV(fresh());for(let i=0;i<3;i++)g=act(g,'morphine','rightArm');g=later(g,900);
  const before=respiratoryBurden(g),reversed=act(g,'naloxone','leftArm');
  const soon=later(reversed,600),control=later(g,625);
  assert.ok(respiratoryBurden(soon)<.1*respiratoryBurden(control),`${respiratoryBurden(soon)} vs ${respiratoryBurden(control)}`);
  assert.ok(clinicalSnapshot(soon).rr>clinicalSnapshot(control).rr+3);
  const late=wait(reversed,9000),lateControl=wait(g,9025);
  assert.ok(!drugEffects(late).find(e=>e.id==='naloxone').active,'naloxone has worn off');
  assert.ok(drugEffects(late).find(e=>e.id==='morphine').active,'morphine still acts');
  assert.ok(respiratoryBurden(late)>.5*respiratoryBurden(lateControl)&&respiratoryBurden(late)>.2*before,`${respiratoryBurden(late)} vs ${respiratoryBurden(lateControl)}`);
  assert.ok(late.log.some(e=>/Kończy się działanie leku: Nalokson/.test(e.text)));
});

test('hydrocortisone has no measurable effect within 25 minutes',()=>{
  const base=withIV(scenario('asthma')),given=act(base,'hydrocortisone','rightArm'),control=act(base,'wait30');
  const a=later(given,1470),b=later(control,1470);
  assert.ok(drugEffects(a).every(e=>e.fraction<.01));assert.equal(activeDrugDefinitions(a).length,0);
  assert.ok(Math.abs(clinicalSnapshot(a).spo2-clinicalSnapshot(b).spo2)<.2&&pain(a)===pain(b));
});

test('TXA lowers the blood lost against a control; a second porcja adds almost nothing',()=>{
  const base=withIV(scenario('fall'));
  const txa=later(act(base,'txa','rightArm'),900),control=later(act(base,'wait30'),900),twice=later(act(act(base,'txa','rightArm'),'txa','rightArm'),870);
  assert.ok(txa.phys.lostMl<control.phys.lostMl-60,`${txa.phys.lostMl} vs ${control.phys.lostMl}`);
  assert.ok(Math.abs(twice.phys.lostMl-txa.phys.lostMl)<.05*txa.phys.lostMl);
});

test('an ignored allergy creates an anaphylactic reaction; adrenaline reverses it',()=>{
  let g=act(scenario('asthma'),'paracetamol','head');
  const reaction=g.injuries.find(i=>i.type==='allergicReaction');assert.ok(reaction);
  g=act(g,'salbutamol','chest');
  const treated=later(act(g,'adrenaline','leftThigh'),600),untreated=later(act(g,'wait30'),595);
  assert.ok(treated.phys.respProg[reaction.id]<untreated.phys.respProg[reaction.id]-.2);
  assert.ok(treated.phys.plasmaDeficitMl<untreated.phys.plasmaDeficitMl-100,`${treated.phys.plasmaDeficitMl} vs ${untreated.phys.plasmaDeficitMl}`);
  // P4: salbutamol now also eases the anaphylactic bronchospasm in both arms, so the SpO2 gap is smaller (was +2).
  assert.ok(treated.phys.svrIdx>untreated.phys.svrIdx&&clinicalSnapshot(treated).spo2>clinicalSnapshot(untreated).spo2+1.5);
});

test('CPR on a patient with a pulse adds a rib fracture and pain, not a blood penalty',()=>{
  const g=fresh(),after=act(g,'cpr','chest');
  assert.ok(after.injuries.some(i=>i.type==='ribFracture'&&i.part==='chest'));assert.ok(pain(after)>=7);
  assert.match(after.log.at(-1).text,/złamania żeber/);assert.equal(after.arrest,null);
  assert.equal(act(after,'cpr','chest').injuries.filter(i=>i.type==='ribFracture').length,1,'one CPR injury');
});

test('heat balance: a blanket cuts heat loss ≥ 60%, wet cold wind cools faster, a cooling mat lowers heat-stroke temperature',()=>{
  const dry=fresh({tempC:5,wet:0,wind:0}),covered=act(dry,'blanket','chest');
  assert.ok(heatFlows(covered).loss<=.4*heatFlows(dry).loss,`${heatFlows(covered).loss} vs ${heatFlows(dry).loss}`);
  const wet=fresh({tempC:5,wet:1,wind:5});assert.ok(heatFlows(wet).loss>3*heatFlows(dry).loss);
  const dryLater=run(structuredClone(dry),1500),wetLater=run(structuredClone(wet),1500),coveredLater=run(structuredClone(covered),1480);
  assert.ok(wetLater.temperature<dryLater.temperature-.5&&dryLater.temperature<coveredLater.temperature,`${wetLater.temperature} ${dryLater.temperature} ${coveredLater.temperature}`);
  assert.ok(Math.abs(run(fresh(),1500).temperature-36.7)<.3,'indoors the healthy patient is near balance');
  // Room-temperature fluid cools: a 500 mL bag removes ~4.18 kJ/L/°C × ΔT.
  const bag=act(withIV(fresh()),'fluid','rightArm'),noBag=act(withIV(fresh()),'wait30');
  assert.ok(later(bag,600).temperature<later(noBag,600).temperature-.05);
  const hot=createGame(0,()=>.99,{conditionId:'siteHeat'});
  const cooled=later(act(hot,'coolingMat','chest'),400),warm=later(act(hot,'wait30'),410);
  assert.ok(cooled.temperature<warm.temperature-.1,`${cooled.temperature} vs ${warm.temperature}`);
});

test('deep hypothermia: VF arrest, shockable, but defibrillation restores circulation only above 30 °C',()=>{
  let g=fresh();g.temperature=27.8;g=run(g,2);
  assert.equal(g.arrest?.rhythm,'vf');assert.equal(vitals(g).rhythm,'Migotanie komór');
  g=act(act(g,'airway','head'),'oxygen','head');g=act(g,'cpr','chest');assert.ok(g.arrest,'CPR alone does not convert VF');
  g=act(g,'aed','chest');assert.ok(g.arrest);assert.match(g.log.find(e=>/AED/.test(e.text)).text,/bez efektu/);
  g.temperature=30.6;g=act(g,'cpr','chest');g=act(g,'aed','chest');
  assert.equal(g.arrest,null);assert.ok(g.log.some(e=>/wyładowanie\. Powrót/.test(e.text)));
});

test('hypovolaemic arrest is PEA and not shockable; electrical injury arrests in VF',()=>{
  const bleed=g=>{g.phys.lostMl=.56*g.profile.ebvMl;g.phys.hbMassG*=.44;while(!g.arrest&&g.elapsed<600)tick(g);return g;};
  let g=bleed(fresh());assert.equal(g.arrest?.rhythm,'pea');assert.equal(vitals(g).rhythm,'PEA — bez tętna');
  g=act(g,'aed','chest');assert.match(g.log.find(e=>/AED/.test(e.text)).text,/brak wskazań/);
  assert.equal(bleed(scenario('electricalPanel')).arrest?.rhythm,'vf');
});

test('glucose in mmol/L: hypoglycaemia starts at 2.7 and falls slowly; the gel raises it ~2.5 within 10–15 min',()=>{
  const g=scenario('stationWeakness');assert.equal(clinicalSnapshot(g).glucose,GLUCOSE.hypoStart);assert.equal(clinicalSnapshot(fresh()).glucose,5.3);
  const untreated=later(g,1500);assert.ok(clinicalSnapshot(untreated).glucose<2.7&&clinicalSnapshot(untreated).glucose>2.4);
  const gel=act(g,'glucoseGel','head'),rise=t=>clinicalSnapshot(later(gel,t)).glucose-clinicalSnapshot(later(g,t+20)).glucose;
  assert.ok(rise(180)<1.5&&rise(780)>2&&rise(780)<3,`${rise(180)} ${rise(780)}`);
  const reading=act(gel,'glucometer','leftArm');assert.match(reading.log.at(-1).text,/mmol\/l/);
});

test('GCS bands for glucose, temperature and sedation; max-of-components with the existing deficits',()=>{
  const at=patch=>{const g=fresh();patch(g);return gcsOf(g);};
  for(const [mmol,gcs] of [[5,15],[2.8,14],[2.4,12],[2,8],[1.5,5]])assert.equal(at(g=>{g.phys.glucose=mmol;}),gcs,`glucose ${mmol}`);
  for(const [tc,gcs] of [[36.5,15],[33,14],[31,12],[29,9],[40,15],[40.5,12],[41.5,10],[42.5,7]])assert.equal(at(g=>{g.temperature=tc;}),gcs,`${tc} °C`);
  // Worst component wins: glucose 2.4 (−3) with SpO2 77% (−2) → 12.
  assert.equal(at(g=>{g.phys.glucose=2.4;g.phys.sao2=.77;}),12);
  let sedated=withIV(fresh());sedated=act(act(sedated,'ketamine','rightArm'),'ketamine','rightArm');
  assert.ok(gcsComponents(later(sedated,240)).sedation>1.5&&gcsOf(later(sedated,240))<=13,`${gcsComponents(later(sedated,240)).sedation}`);
  // The post-ictal deficit recovers once the airway is open.
  const ictal=createGame(0,()=>.99,{conditionId:'busSeizure'});ictal.transportAt=null;
  const opened=act(ictal,'suction','head',ictal.injuries.find(i=>i.type==='postIctal').id);
  assert.ok(gcsComponents(opened).injury>3&&gcsComponents(later(opened,2700)).injury<.3);
});

test('saves: P1/P2 medication windows become doses; v3 saves without P3 fields gain them',()=>{
  let g=act(withIV(scenario('gunshot')),'morphine','rightArm');g=advanceTime(g,60);
  const old=structuredClone(g);old.medications=[{id:'morphine',start:old.medications[0].at+30,end:old.medications[0].at+510,burden:.45,delivery:.8,site:'rightForearm'}];
  old.respiratoryDepression=1.2;for(const k of ['glucose','glucoseBase','neuroProg','env','drugActive','drugExcess','infusedMl'])delete old.phys[k];
  const restored=restoreGame(JSON.stringify(old));
  assert.ok(restored);assert.deepEqual(restored.medications,[{id:'morphine',at:g.medications[0].at,amount:.8,route:'IV',site:'rightForearm'}]);
  assert.equal(restored.respiratoryDepression,undefined);assert.equal(restored.phys.glucose,5.3);assert.equal(restored.phys.env.tempC,15);
  assert.ok(advanceTime(restored,60).status==='active');assert.deepEqual(restoreGame(JSON.stringify(restored)),restored);
  for(const mutate of [s=>{s.medications[0].amount=2;},s=>{s.medications[0].at=-1;},s=>{s.phys.glucose=-1;},s=>{s.phys.env={tempC:900,wet:0,wind:0};},s=>{s.arrest={since:1,budget:100,rhythm:'x'};}]){const bad=structuredClone(g);mutate(bad);assert.equal(restoreGame(JSON.stringify(bad)),null,mutate.toString());}
});

test('UI: support panel shows cylinder %, bag % and drug phases; cards and guides carry no dosing',()=>{
  let g=act(act(withIV(scenario('gunshot')),'fluid','rightArm'),'oxygen','head');g=act(g,'morphine','rightArm');
  const html=renderSupport(g);
  assert.match(html,/Tlen <b data-oxygen-time>\d+% ·/);assert.match(html,/\d+% worka/);assert.match(html,/Morfina<\/strong><span>działanie narasta/);
  assert.match(renderBag(g,'rightForearm','medicine'),/Narastanie: (szybkie|stopniowe|powolne)/);
  const texts=[...ITEMS.filter(i=>i.category==='medicine').flatMap(i=>[i.description,i.risk]),...GUIDES.map(x=>x.text)];
  for(const t of texts)assert.ok(!/\d\s*(mg|ml\/kg|mcg|µg)\b|po \d+ s\b/i.test(t),t);
  for(const title of ['Leki w grze — narastanie i słabnięcie działania','Ciepło i wychłodzenie'])assert.ok(GUIDES.some(x=>x.title===title&&x.text.length>200),title);
});
