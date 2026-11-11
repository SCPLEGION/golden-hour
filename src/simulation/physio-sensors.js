// Monitor sensors (P4). NIBP is a discrete measurement: the cuff cycles every 180 s while the monitor is attached and a
// manual "Zmierz parametry" (or attaching the monitor) measures at once; the screen shows the last cuff reading. The
// pulse oximeter loses its signal ('—', "brak sygnału") when MAP < 50, core temperature < 33 °C, in arrest or when the
// probe hand is under a tourniquet; `spo2Last` keeps the last valid number for the trend history.
import { SENSORS } from '../content/physiology-data.js';
import { clinicalSnapshot, noise } from './physio-model.js';
import { isMissing } from './selectors.js';
import { tourniquetOver } from './vascular.js';
// Finger probe on the right hand, the left one when the right is missing.
export const probeSite=g=>isMissing(g,'rightHand')&&!isMissing(g,'leftHand')?'leftHand':'rightHand';
export function spo2Signal(g){
  if(g.arrest||g.status==='lost')return false;
  return !(g.phys.map<SENSORS.spo2MinMap||g.temperature<SENSORS.spo2MinC||isMissing(g,probeSite(g))||tourniquetOver(g,probeSite(g),.5)!==undefined);
}
export function measureNibp(g){
  const s=clinicalSnapshot(g),dead=Boolean(g.arrest)||g.status==='lost';
  g.phys.nibp=dead?{at:g.elapsed,sys:0,dia:0,map:0}:{at:g.elapsed,sys:Math.max(0,Math.round(s.sbp+noise(g,4)*2)),dia:Math.max(0,Math.round(s.dbp+noise(g,5))),map:Math.max(0,Math.round(s.map))};
}
// One second: the cuff cycles while monitored; the oximeter keeps its last valid value.
export function stepSensors(g){
  const p=g.phys;
  if(g.monitoring&&!(p.nibp&&g.elapsed-p.nibp.at<SENSORS.nibpCycleS&&(p.nibp.sys>0||g.arrest)))measureNibp(g);
  if(spo2Signal(g))p.spo2Last=p.spo2Shown;
}
export function initSensors(g){g.phys.spo2Last=g.phys.spo2Shown;delete g.phys.nibp;if(g.body&&g.medications)measureNibp(g);}
export function ensureSensors(g){const p=g.phys;p.spo2Last??=p.spo2Shown;if(!p.nibp)measureNibp(g);}
const NUM=n=>Number.isFinite(n)&&n>=0;
export const validSensors=p=>NUM(p.spo2Last)&&p.spo2Last<=100&&p.nibp&&typeof p.nibp==='object'&&['at','sys','dia','map'].every(k=>NUM(p.nibp[k]));
