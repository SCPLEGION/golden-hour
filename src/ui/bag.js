import { ITEMS } from '../content/items.js';
import { itemUnavailable } from '../simulation/effects.js';
import { drugEffects, drugProfileText } from '../simulation/physio-pharmacology.js';
import { itemIcon } from './visuals.js';
import { escape, time } from './format.js';

export function renderBag(g,target,category,heldItem=null) {
  const items=ITEMS.filter(i=>i.category===category);
  return `<div class="bag-tools"><label class="bag-search"><span aria-hidden="true">⌕</span><input type="search" data-bag-search placeholder="Szukaj w torbie…" aria-label="Szukaj wyposażenia"></label><select data-bag-filter aria-label="Filtr wyposażenia"><option value="all">Wszystko</option><option value="available">W torbie</option><option value="compatible">Do tej okolicy</option></select></div><div class="bag-legend"><span>Przeciągnij na ciało lub weź do ręki</span><b data-bag-count>${items.length} pozycji</b></div><div class="bag-items">${items.map((item,index)=>{
    const unavailable=g.status!=='active'||(item.count!==null&&g.supplies[item.id]<=0);
    const compatible=!itemUnavailable(g,item,target);
    const repeats=item.category==='medicine'&&drugEffects(g).some(e=>e.id===item.id&&(e.active||e.pending)),profile=item.category==='medicine'?drugProfileText(item.id):null;
    const stock=item.count===null?'∞':g.supplies[item.id];
    const searchText=`${item.name} ${item.description} ${item.route||''}`.toLocaleLowerCase('pl');
    return `<article class="bag-item ${heldItem===item.id?'in-hand':''} ${unavailable?'depleted':''}" draggable="${!unavailable}" data-drag-item="${item.id}" data-bag-item="${item.id}" data-search-text="${escape(searchText)}" data-available="${!unavailable}" data-compatible="${compatible}"><div class="item-slot"><span class="slot-number">${String(index+1).padStart(2,'0')}</span>${itemIcon(item)}<span class="stock-count" title="${item.count===null?'Wielorazowy':'Pozostało w torbie'}">${stock}</span>${heldItem===item.id?'<span class="selected-corner" aria-hidden="true">✓</span>':''}</div><div class="item-copy"><h3>${item.name}</h3><span class="quantity">${item.category==='medicine'?item.route:item.count===null?'Wielorazowy':`${g.supplies[item.id]} w torbie`} <b>·</b> ${item.time} s</span></div><details><summary>${item.category==='medicine'?'Działanie i ryzyko':'Opis sprzętu'}</summary><p>${item.description}</p>${item.category==='medicine'?`<p>${item.risk}</p><div class="drug-meta"><span>${item.route}</span><span>Narastanie: ${profile.onset}</span><span>Działanie: ${profile.length}</span></div><p>Jedno użycie = 1 umowna porcja gry. Kolejne porcje kumulują się.</p>`:''}</details>${repeats?'<p class="medicine-warning">Poprzednia porcja nadal działa — kolejna się z nią skumuluje.</p>':''}<button class="use-item" data-pick="${item.id}" ${unavailable?'disabled':''}><span>${unavailable?'Brak zapasu':heldItem===item.id?'Odłóż':'Weź do ręki'}</span><span aria-hidden="true">${heldItem===item.id?'×':'↗'}</span></button></article>`;
  }).join('')}</div><p class="bag-empty" data-bag-empty hidden>Brak przedmiotów pasujących do wyszukiwania.</p>`;
}
