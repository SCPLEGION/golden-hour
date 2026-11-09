import { restoreGame } from './engine.js';
import { DIFFICULTIES } from './content/difficulty.js';
const KEY='field-medic-v2';
export const HISTORY_LIMIT=10;
export function sanitizeHistory(list) {
  if(!Array.isArray(list))return [];
  return list.filter(e=>e&&typeof e==='object'&&['saved','lost'].includes(e.status)).map(e=>({scenarioId:typeof e.scenarioId==='string'?e.scenarioId.slice(0,60):'',status:e.status,total:Number.isFinite(e.total)?Math.min(100,Math.max(0,Math.round(e.total))):0,grade:typeof e.grade==='string'?e.grade.slice(0,30):'',difficulty:DIFFICULTIES.some(d=>d.id===e.difficulty)?e.difficulty:'normal'})).slice(-HISTORY_LIMIT);
}
export function loadProgress(storage) {
  try {const data=JSON.parse((storage??globalThis.localStorage).getItem(KEY));const saved=Number.isInteger(data?.stats?.saved)?Math.max(0,data.stats.saved):0,lost=Number.isInteger(data?.stats?.lost)?Math.max(0,data.stats.lost):0;return {game:restoreGame(data?.game),stats:{saved,lost,best:Number.isFinite(data?.stats?.best)?Math.min(100,Math.max(0,Math.round(data.stats.best))):0,tutorial:['on','off'].includes(data?.stats?.tutorial)?data.stats.tutorial:(saved+lost===0?'on':'off'),difficulty:DIFFICULTIES.some(d=>d.id===data?.stats?.difficulty)?data.stats.difficulty:'normal',history:sanitizeHistory(data?.stats?.history)}};} catch{return {game:null,stats:{saved:0,lost:0,best:0,tutorial:'on',difficulty:'normal',history:[]}};}
}
export function saveProgress(game,stats,storage) {try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify({game,stats}));return true;}catch{return false;}}
