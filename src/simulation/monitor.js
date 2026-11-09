import { vitals } from './selectors.js';
export const HISTORY_LIMIT=60;
export function sampleMonitor(g,force=false){
  if(!g.monitoring&&!force)return;
  const reading=vitals(g);
  g.vitals=reading;
  g.monitorHistory??=[];
  if(g.monitorHistory.at(-1)?.time===reading.time)g.monitorHistory[g.monitorHistory.length-1]=reading;
  else g.monitorHistory.push(reading);
  if(g.monitorHistory.length>HISTORY_LIMIT)g.monitorHistory.splice(0,g.monitorHistory.length-HISTORY_LIMIT);
}
