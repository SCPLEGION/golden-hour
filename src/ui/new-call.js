import { CATEGORIES, CONDITIONS, RANDOM_CATEGORY, SEVERITIES, categoryById, conditionById } from '../content/conditions.js';
import { DIFFICULTIES } from '../content/difficulty.js';
import { protocolStatus } from '../simulation/protocol.js';
import { escape, time } from './format.js';
export const SEVERITY_CLASS={lekki:'low',poważny:'mid',krytyczny:'high'};
const plural=n=>n===1?'stan':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'stany':'stanów';
export function renderNewCall({stats,active}){
  const cards=[...CATEGORIES,RANDOM_CATEGORY].map(c=>{
    const n=c.id===RANDOM_CATEGORY.id?CONDITIONS.length:CONDITIONS.filter(x=>x.category===c.id).length;
    return `<label class="category-card${c.id===RANDOM_CATEGORY.id?' random':''}"><input type="radio" name="category" value="${escape(c.id)}" ${c.id===stats.category?'checked':''}><span class="category-name">${escape(c.name)}</span><small>${escape(c.description)}</small><b class="category-count">${n} ${plural(n)}</b></label>`;
  }).join('');
  return `<form method="dialog" class="new-call" data-new-call-form><div class="guide-heading"><div><p class="eyebrow">Dyspozytornia</p><h2 id="new-call-title">Nowe wezwanie</h2></div><button type="button" class="quiet" data-close aria-label="Zamknij okno nowego wezwania">Zamknij ✕</button></div><p class="new-call-intro">Wybierz kategorię zgłoszenia. Stan poszkodowanego zostanie wylosowany w jej obrębie — co mu naprawdę dolega, ustalisz dopiero na miejscu.</p><label class="difficulty-select">Poziom trudności <select name="difficulty">${DIFFICULTIES.map(d=>`<option value="${escape(d.id)}" ${d.id===stats.difficulty?'selected':''}>${escape(d.name)}</option>`).join('')}</select></label><fieldset class="category-grid"><legend>Kategoria zgłoszenia</legend>${cards}</fieldset>${active?'<p class="new-call-warning">Trwa interwencja — rozpoczęcie nowego wezwania ją przerwie.</p>':''}<div class="new-call-actions"><button type="button" class="quiet" data-close>Anuluj</button><button type="submit" class="primary" data-new-start>Rozpocznij</button></div></form>`;
}
// Mission bar: category and severity only; the state's name stays hidden until the debrief.
export function renderConditionTags(g){
  const c=g.protocol&&conditionById(g.protocol.conditionId);
  if(!c)return '';
  return `<span class="mission-tags"><b class="category-tag">${escape(categoryById(c.category)?.name||c.category)}</b><b class="severity-tag ${SEVERITY_CLASS[c.severity]}">${escape(SEVERITIES[c.severity])}</b></span>`;
}
export function renderProtocolDebrief(g){
  const c=g.protocol&&conditionById(g.protocol.conditionId);
  if(!c)return '';
  const rows=protocolStatus(g).map(s=>{
    const [mark,cls,text]=s.onTime?['✓','on-time',`na czas · ${time(s.doneAt)}`]:s.late?['◐','late',`spóźnione · ${time(s.doneAt)} (termin ${time(s.deadline)})`]:['✗','missed',`pominięte · termin ${time(s.deadline)}`];
    return `<li class="${cls}"><span class="protocol-mark" aria-hidden="true">${mark}</span><span>${escape(s.label)}</span><small>${escape(text)}</small></li>`;
  }).join('');
  return `<div class="protocol-debrief"><p class="eyebrow">Stan poszkodowanego · ${escape(categoryById(c.category)?.name||'')} · ${escape(SEVERITIES[c.severity])}</p><h3>${escape(c.name)}</h3><ol class="protocol-list" aria-label="Protokół postępowania">${rows}</ol></div>`;
}
