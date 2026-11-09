// Canonical portrait rig (1000 × 1500). The operating surface rotates it
// to a horizontal head-left pose. Simulation uses IDs, never coordinates.
// BODY_OUTLINES are the drawn silhouette shapes (keyed by the pre-0.7 part ids).
// Each segment reuses one of them clipped to a horizontal band `clip:[y0,y1]`.
export const BODY_OUTLINES = {
  head:'M420 150C414 95 441 48 500 48S586 95 580 150L568 213L537 248L537 285H463V248L432 213Z',
  chest:'M463 269L382 293L350 347L376 487L390 525H610L624 487L650 347L618 293L537 269Z',
  abdomen:'M390 525H610L625 654L609 743L548 790L500 755L452 790L391 743L375 654Z',
  rightArm:'M382 293C330 285 313 331 308 392L275 515L246 655L225 737L201 773L193 818L201 835L214 813L211 861L221 866L233 820L229 871L240 875L250 824L250 868L261 867L267 813L275 847L287 844L282 791L279 755L298 688L334 561L365 470L376 394L397 337Z',
  leftArm:'M618 293C670 285 687 331 692 392L725 515L754 655L775 737L799 773L807 818L799 835L786 813L789 861L779 866L767 820L771 871L760 875L750 824L750 868L739 867L733 813L725 847L713 844L718 791L721 755L702 688L666 561L635 470L624 394L603 337Z',
  rightLeg:'M391 711L488 757L485 897L471 1037L455 1110L454 1270L443 1378L455 1415L456 1450L425 1460L380 1458L369 1436L380 1378L377 1260L362 1112L369 1014L366 855Z',
  leftLeg:'M609 711L512 757L515 897L529 1037L545 1110L546 1270L557 1378L545 1415L544 1450L575 1460L620 1458L631 1436L620 1378L623 1260L638 1112L631 1014L634 855Z'
};
// The back has no front-view outline; it is drawn as a small inset in its own space.
export const BACK_INSET={x:1300,y:200,scale:.5,width:300,height:280,shape:'M62 52Q150 22 238 52L272 98L252 176L244 258H56L48 176L28 98Z'};
const seg=(id,name,group,base,clip,anchor,extra={})=>({id,name,group,order:0,limb:false,vascular:false,tourniquet:false,base,clip,anchor,device:anchor,...extra});
const mirror=([x,y])=>[1000-x,y];
const limb=(side,names)=>{
  const left=side==='left',arm=`${side}Arm`,leg=`${side}Leg`,m=p=>left?mirror(p):p;
  const L=(id,name,group,order,clip,anchor,extra={})=>seg(`${side}${id}`,name,group,group,clip,m(anchor),{order,limb:true,...Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,Array.isArray(v)?m(v):v]))});
  return [
    L('UpperArm',names[0],arm,0,[285,480],[338,385],{stasis:[330,420],tourniquet:true}),
    L('Elbow',names[1],arm,1,[480,565],[302,522],{vascular:true,ivSite:'elbow'}),
    L('Forearm',names[2],arm,2,[565,760],[270,655],{splint:[277,650],tourniquet:true,vascular:true,ivSite:'forearm'}),
    L('Hand',names[3],arm,3,[760,880],[238,815],{vascular:true,ivSite:'hand'}),
    L('Thigh',names[4],leg,0,[700,1000],[428,860],{stasis:[425,820],tourniquet:true}),
    L('Knee',names[5],leg,1,[1000,1110],[415,1055]),
    L('Shin',names[6],leg,2,[1110,1378],[410,1240],{stasis:[410,1160],splint:[408,1240],tourniquet:true}),
    L('Foot',names[7],leg,3,[1378,1465],[412,1420])
  ];
};
export const BODY_PARTS = [
  seg('head','Głowa','head','head',[40,112],[500,82]),
  seg('face','Twarz','head','head',[112,212],[500,165]),
  seg('neck','Szyja','head','head',[212,290],[500,252]),
  seg('chest','Klatka piersiowa','chest','chest',[260,530],[520,390]),
  seg('abdomen','Brzuch','abdomen','abdomen',[520,655],[500,590]),
  seg('pelvis','Miednica','abdomen','abdomen',[655,800],[500,722]),
  seg('back','Plecy','back',null,null,[150,150],{inset:true}),
  ...limb('right',['Prawe ramię','Prawy łokieć','Prawe przedramię','Prawa dłoń','Prawe udo','Prawe kolano','Prawe podudzie','Prawa stopa']),
  ...limb('left',['Lewe ramię','Lewy łokieć','Lewe przedramię','Lewa dłoń','Lewe udo','Lewe kolano','Lewe podudzie','Lewa stopa'])
];
// Pre-0.7 limb ids map to their most representative segment (saves, scenarios, callers).
export const LEGACY_PARTS={rightArm:'rightForearm',leftArm:'leftForearm',rightLeg:'rightThigh',leftLeg:'leftThigh'};
export const resolvePart=id=>LEGACY_PARTS[id]??id;
export const bodyPart=id=>BODY_PARTS.find(p=>p.id===resolvePart(id));
// Item `regions` may list group ids ('leftArm', 'head') or exact segment ids.
export const matchesRegion=(regions,id)=>{const p=bodyPart(id);return Boolean(p&&regions.some(r=>r===p.id||r===p.group));};
export const sameGroup=(a,b)=>bodyPart(a)?.group===bodyPart(b)?.group;
export const BODY_RIG={viewBox:'0 175 1500 650',transform:'translate(0 1000) rotate(-90)'};
export const horizontalPoint=([x,y])=>[y,1000-x];
// Scene (horizontal) coordinates of a segment anchor, including the back inset.
export const scenePoint=part=>part.inset?[BACK_INSET.x+part.anchor[0]*BACK_INSET.scale,BACK_INSET.y+part.anchor[1]*BACK_INSET.scale]:horizontalPoint(part.anchor);
