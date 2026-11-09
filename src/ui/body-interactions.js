// Pointer, touch, keyboard and HTML drag/drop share one targeting path.
export function bindBodyInteractions(root,{heldItem,onSelect,onMenu,onPlace}) {
  root.querySelectorAll('[data-part]').forEach(el=>{
    const part=el.dataset.part,injuryId=el.dataset.injury||null;
    el.onclick=e=>{
      e.stopPropagation();
      if(heldItem){onPlace(heldItem,part,injuryId);return;}
      if(injuryId||el.dataset.device||matchMedia('(pointer: coarse)').matches)onMenu(part,injuryId,e.clientX,e.clientY,el);
      else onSelect(part,injuryId);
    };
    el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();onMenu(part,injuryId,e.clientX,e.clientY,el);};
    el.onkeydown=e=>{
      if(e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey)){
        e.preventDefault();e.stopPropagation();const r=el.getBoundingClientRect();onMenu(part,injuryId,r.left+r.width/2,r.top+r.height/2,el);
      }else if((e.key==='Enter'||e.key===' ')&&el.tagName.toLowerCase()!=='button'){
        e.preventDefault();e.stopPropagation();el.click();
      }
    };
    el.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-field-medic-item')){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';el.classList.add('drop-target');}};
    el.ondragleave=()=>el.classList.remove('drop-target');
    el.ondrop=e=>{
      const item=e.dataTransfer.getData('application/x-field-medic-item');
      if(!item)return;
      e.preventDefault();e.stopPropagation();el.classList.remove('drop-target');onPlace(item,part,injuryId);
    };
  });
}
