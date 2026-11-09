import { itemById } from '../content/items.js';
export const activeSupports=g=>(g.supports||[]).filter(s=>s.until>g.elapsed);
export const supportDefinitions=g=>activeSupports(g).map(s=>({...itemById(s.id),target:s.target})).filter(s=>s.id);
export function woundModifiers(injury){
  const equipment=Object.keys(injury.treatments||{}).map(itemById).filter(i=>i?.effect==='stabilize');
  return {painRelief:Math.min(6,equipment.reduce((n,i)=>n+(i.painRelief||0),0)),bleedingMultiplier:equipment.reduce((n,i)=>n*(i.bleedingMultiplier??1),1),oxygenMultiplier:equipment.reduce((n,i)=>n*(1-Math.max(0,Math.min(1,i.oxygenRelief||0))),1)};
}
export const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
