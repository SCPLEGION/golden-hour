import { GUIDES } from '../content/guides.js';
import { escape } from './format.js';
export function mountGuide(dialog) {
  dialog.innerHTML=`<div class="guide-heading"><div><p class="eyebrow">Biblioteka ratownika</p><h2 id="guide-title">Poradnik gry</h2></div><button class="quiet" data-close aria-label="Zamknij poradnik">Zamknij ✕</button></div><p class="guide-intro">Czytaj spokojnie — przeglądanie poradnika nie przesuwa czasu.</p><label class="guide-search">Szukaj tematu<input type="search" placeholder="Np. złamanie, morfina, tlen…" aria-label="Szukaj w poradniku"></label><div class="guide-results"></div>`;
  const draw=(query='')=>{
    const matches=GUIDES.filter(g=>(g.title+' '+g.text).toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl')));
    dialog.querySelector('.guide-results').innerHTML=matches.map(g=>`<details ${query?'open':''}><summary>${g.title}</summary><p>${g.text}</p>${g.links?`<ul>${g.links.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`).join('')}</ul>`:''}</details>`).join('')||`<p>Brak wyników dla „${escape(query)}”. Spróbuj innego hasła.</p>`;
  };
  draw();
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('input').oninput=e=>draw(e.target.value);
  dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
}
