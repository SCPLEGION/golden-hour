// Canonical portrait rig (1000 × 1500). The operating surface rotates it
// to a horizontal head-left pose. Simulation uses IDs, never coordinates.
// BODY_OUTLINES are the drawn silhouette shapes (keyed by the pre-0.7 part ids).
// Each segment reuses one of them clipped to a horizontal band `clip:[y0,y1]`.
// Drawn as a union (all strokes, then all fills) so overlaps between bases leave no seam.
// Limb outlines are generated from a centreline through the segment anchors plus a width
// profile (smooth cubic béziers); the left side mirrors the right (x → 1000 − x).
export const BODY_OUTLINES = {
  head:'M500 44C548 44 584 80 586 132C590 128 600 132 600 146C600 160 594 172 586 174C582 196 570 214 552 230C542 238 536 244 535 254L536 292L464 292L465 254C464 244 458 238 448 230C430 214 418 196 414 174C406 172 400 160 400 146C400 132 410 128 414 132C416 80 452 44 500 44Z',
  chest:'M474 252L471 266C452 278 428 282 404 288C384 293 372 304 370 330C372 360 378 392 384 430C388 470 388 500 387 532C388 548 394 556 404 560L596 560C606 556 612 548 613 532C612 500 612 470 616 430C622 392 628 360 630 330C628 304 616 293 596 288C572 282 548 278 529 266L526 252Z',
  abdomen:'M392 520L608 520C611 524 613 528 613 534C612 565 606 592 610 620C616 650 625 680 626 712C626 740 614 760 590 774L540 800Q500 790 460 800L410 774C386 760 374 740 374 712C375 680 384 650 390 620C394 592 388 565 387 534C387 528 389 524 392 520Z',
  rightArm:'M310.6 314.8C305.5 326.4 308.3 335.3 307.2 345.2C306.2 355.1 306 364.3 304.6 374.1C303.2 383.8 300.5 393.5 298.7 403.5C296.9 413.5 295.7 423.9 293.7 434.1C291.8 444.2 289.5 454.3 287.1 464.5C284.8 474.6 282.2 484.7 279.7 494.8C277.2 504.9 274.9 515.2 272.1 525.2C269.4 535.2 265.9 545 263.3 555C260.7 565 258.3 575.1 256.3 585.2C254.4 595.3 253.4 605.6 251.7 615.8C250.1 626 248.2 636 246.4 646.2C244.6 656.3 242.4 666.3 240.8 676.5C239.1 686.7 238.3 697.1 236.7 707.3C235 717.5 233.1 728.5 230.9 737.6C228.8 746.8 226.7 755.6 223.8 762C220.8 768.4 216.6 771.2 213.2 775.9C209.9 780.6 206.4 785.6 203.6 790.1C200.9 794.6 197.6 799.4 196.5 802.8C195.4 806.1 195.5 809 196.8 810C198.1 811 202.2 809.6 204.3 808.8C206.4 807.9 208.4 804.6 209.4 804.8C210.3 805.1 210.5 806.6 210.1 810.2C209.8 813.7 208 819.9 207.4 825.9C206.8 832 206.1 840.6 206.6 846.3C207.1 852.1 208.5 856.9 210.4 860.6C212.2 864.3 214.9 867 217.7 868.5C220.6 870.1 224.4 870.7 227.7 869.9C231 869.1 234.2 867.7 237.3 864C240.5 860.3 243.6 854.5 246.4 847.6C249.2 840.8 252.1 831.2 254.4 822.8C256.8 814.5 259.3 805.5 260.5 797.6C261.7 789.6 260.6 783.8 261.7 775.2C262.9 766.7 264.9 756.1 267.3 746.4C269.7 736.6 272.8 726.5 276 716.7C279.1 706.9 283.1 697.3 286.3 687.5C289.5 677.7 292.1 667.7 295.1 657.8C298 648 300.9 638 304 628.2C307.1 618.4 310.7 608.7 313.6 598.8C316.4 588.9 318.8 579 321 569C323.2 559 324.6 548.8 326.9 538.8C329.1 528.8 331.8 519.1 334.6 509.2C337.3 499.3 340.1 489.4 343.1 479.5C346.1 469.7 349.3 459.8 352.7 449.9C356.1 440.1 360.3 430.5 363.7 420.5C367 410.5 369.7 400.2 372.8 389.9C376 379.7 379.8 368.9 382.5 358.8C385.3 348.7 387.3 337 389.3 329.2C391.4 321.3 395.3 319.6 394.8 311.8C394.2 303.9 391.5 288.6 386 282C380.5 275.4 370 273 362 272C354 271 346.6 268.9 338 276C329.4 283.1 315.7 303.3 310.6 314.8Z',
  leftArm:'M689.4 314.8C694.5 326.4 691.7 335.3 692.8 345.2C693.8 355.1 694 364.3 695.4 374.1C696.8 383.8 699.5 393.5 701.3 403.5C703.1 413.5 704.3 423.9 706.3 434.1C708.2 444.2 710.5 454.3 712.9 464.5C715.2 474.6 717.8 484.7 720.3 494.8C722.8 504.9 725.1 515.2 727.9 525.2C730.6 535.2 734.1 545 736.7 555C739.3 565 741.7 575.1 743.7 585.2C745.6 595.3 746.6 605.6 748.3 615.8C749.9 626 751.8 636 753.6 646.2C755.4 656.3 757.6 666.3 759.2 676.5C760.9 686.7 761.7 697.1 763.3 707.3C765 717.5 766.9 728.5 769.1 737.6C771.2 746.8 773.3 755.6 776.2 762C779.2 768.4 783.4 771.2 786.8 775.9C790.1 780.6 793.6 785.6 796.4 790.1C799.1 794.6 802.4 799.4 803.5 802.8C804.6 806.1 804.5 809 803.2 810C801.9 811 797.8 809.6 795.7 808.8C793.6 807.9 791.6 804.6 790.6 804.8C789.7 805.1 789.5 806.6 789.9 810.2C790.2 813.7 792 819.9 792.6 825.9C793.2 832 793.9 840.6 793.4 846.3C792.9 852.1 791.5 856.9 789.6 860.6C787.8 864.3 785.1 867 782.3 868.5C779.4 870.1 775.6 870.7 772.3 869.9C769 869.1 765.8 867.7 762.7 864C759.5 860.3 756.4 854.5 753.6 847.6C750.8 840.8 747.9 831.2 745.6 822.8C743.2 814.5 740.7 805.5 739.5 797.6C738.3 789.6 739.4 783.8 738.3 775.2C737.1 766.7 735.1 756.1 732.7 746.4C730.3 736.6 727.2 726.5 724 716.7C720.9 706.9 716.9 697.3 713.7 687.5C710.5 677.7 707.9 667.7 704.9 657.8C702 648 699.1 638 696 628.2C692.9 618.4 689.3 608.7 686.4 598.8C683.6 588.9 681.2 579 679 569C676.8 559 675.4 548.8 673.1 538.8C670.9 528.8 668.2 519.1 665.4 509.2C662.7 499.3 659.9 489.4 656.9 479.5C653.9 469.7 650.7 459.8 647.3 449.9C643.9 440.1 639.7 430.5 636.3 420.5C633 410.5 630.3 400.2 627.2 389.9C624 379.7 620.2 368.9 617.5 358.8C614.7 348.7 612.7 337 610.7 329.2C608.6 321.3 604.7 319.6 605.2 311.8C605.8 303.9 608.5 288.6 614 282C619.5 275.4 630 273 638 272C646 271 653.4 268.9 662 276C670.6 283.1 684.3 303.3 689.4 314.8Z',
  rightLeg:'M393.3 687.4C374.1 691.5 388.5 711.9 386.4 724.6C384.3 737.2 382.3 750.7 380.8 763.5C379.4 776.2 378.3 788.6 377.6 801.2C376.9 813.8 377.2 826.6 376.9 839.1C376.5 851.5 375.8 863.7 375.5 876C375.3 888.2 375.1 900.3 375.5 912.5C375.9 924.7 377.6 936.9 378.1 949.1C378.7 961.3 378.8 973.4 378.8 985.5C378.8 997.6 378.4 1009.7 378.3 1021.9C378.1 1034 378 1046.2 377.8 1058.3C377.6 1070.4 377.6 1082.6 377.1 1094.7C376.6 1106.8 375.9 1118.8 374.9 1130.9C373.9 1143 371.4 1155 371.2 1167.1C370.9 1179.2 372.2 1191.3 373.2 1203.4C374.1 1215.5 375.7 1227.6 376.7 1239.7C377.7 1251.9 377.6 1264.1 379 1276.2C380.4 1288.3 383.6 1300.4 385.1 1312.4C386.7 1324.5 387.3 1336.5 388.3 1348.5C389.2 1360.5 390.8 1374.7 390.8 1384.4C390.8 1394 389.5 1399.1 388.3 1406.5C387.1 1413.8 384.3 1421.5 383.7 1428.5C383.2 1435.6 383.8 1442.9 385.1 1448.5C386.4 1454.2 388.6 1459.1 391.4 1462.4C394.1 1465.7 397.8 1467.3 401.5 1468.2C405.2 1469.1 409.8 1467.7 413.5 1468C417.2 1468.2 420.2 1469.9 423.5 1469.8C426.9 1469.7 430.8 1469.3 433.5 1467.6C436.1 1465.9 438.3 1464.2 439.3 1459.5C440.4 1454.8 440.4 1447.1 439.9 1439.5C439.5 1431.8 437.6 1422.8 436.5 1413.5C435.3 1404.2 433.4 1394.6 433 1383.6C432.6 1372.6 433.5 1359.5 434 1347.5C434.4 1335.5 434.6 1323.5 435.7 1311.6C436.9 1299.6 439.7 1287.7 441 1275.8C442.2 1263.9 442.2 1252.1 443.3 1240.3C444.4 1228.4 446.4 1216.5 447.7 1204.6C449 1192.7 450.9 1180.8 451.1 1168.9C451.4 1157 449.6 1145 449.3 1133.1C449 1121.2 449 1109.2 449.4 1097.3C449.8 1085.4 450.8 1073.6 451.7 1061.7C452.6 1049.8 453.8 1038 454.9 1026.1C456.1 1014.3 457.2 1002.4 458.7 990.5C460.2 978.6 461.8 966.7 464 954.9C466.2 943.1 469.5 931.3 471.7 919.5C473.9 907.7 475.5 895.8 477.2 884C478.9 872.3 480 860.5 482 848.9C483.9 837.4 486.7 826.2 488.9 814.8C491.2 803.4 493.4 791.8 495.6 780.5C497.7 769.3 499.5 758.8 502 747.4C504.6 736.1 511 713.5 510.7 712.6C510.3 711.7 501.4 744.1 500 742C498.6 739.9 519.8 709.1 502 700C484.2 690.9 412.6 683.3 393.3 687.4Z',
  leftLeg:'M606.7 687.4C625.9 691.5 611.5 711.9 613.6 724.6C615.7 737.2 617.7 750.7 619.2 763.5C620.6 776.2 621.7 788.6 622.4 801.2C623.1 813.8 622.8 826.6 623.1 839.1C623.5 851.5 624.2 863.7 624.5 876C624.7 888.2 624.9 900.3 624.5 912.5C624.1 924.7 622.4 936.9 621.9 949.1C621.3 961.3 621.2 973.4 621.2 985.5C621.2 997.6 621.6 1009.7 621.7 1021.9C621.9 1034 622 1046.2 622.2 1058.3C622.4 1070.4 622.4 1082.6 622.9 1094.7C623.4 1106.8 624.1 1118.8 625.1 1130.9C626.1 1143 628.6 1155 628.8 1167.1C629.1 1179.2 627.8 1191.3 626.8 1203.4C625.9 1215.5 624.3 1227.6 623.3 1239.7C622.3 1251.9 622.4 1264.1 621 1276.2C619.6 1288.3 616.4 1300.4 614.9 1312.4C613.3 1324.5 612.7 1336.5 611.7 1348.5C610.8 1360.5 609.2 1374.7 609.2 1384.4C609.2 1394 610.5 1399.1 611.7 1406.5C612.9 1413.8 615.7 1421.5 616.3 1428.5C616.8 1435.6 616.2 1442.9 614.9 1448.5C613.6 1454.2 611.4 1459.1 608.6 1462.4C605.9 1465.7 602.2 1467.3 598.5 1468.2C594.8 1469.1 590.2 1467.7 586.5 1468C582.8 1468.2 579.8 1469.9 576.5 1469.8C573.1 1469.7 569.2 1469.3 566.5 1467.6C563.9 1465.9 561.7 1464.2 560.7 1459.5C559.6 1454.8 559.6 1447.1 560.1 1439.5C560.5 1431.8 562.4 1422.8 563.5 1413.5C564.7 1404.2 566.6 1394.6 567 1383.6C567.4 1372.6 566.5 1359.5 566 1347.5C565.6 1335.5 565.4 1323.5 564.3 1311.6C563.1 1299.6 560.3 1287.7 559 1275.8C557.8 1263.9 557.8 1252.1 556.7 1240.3C555.6 1228.4 553.6 1216.5 552.3 1204.6C551 1192.7 549.1 1180.8 548.9 1168.9C548.6 1157 550.4 1145 550.7 1133.1C551 1121.2 551 1109.2 550.6 1097.3C550.2 1085.4 549.2 1073.6 548.3 1061.7C547.4 1049.8 546.2 1038 545.1 1026.1C543.9 1014.3 542.8 1002.4 541.3 990.5C539.8 978.6 538.2 966.7 536 954.9C533.8 943.1 530.5 931.3 528.3 919.5C526.1 907.7 524.5 895.8 522.8 884C521.1 872.3 520 860.5 518 848.9C516.1 837.4 513.3 826.2 511.1 814.8C508.8 803.4 506.6 791.8 504.4 780.5C502.3 769.3 500.5 758.8 498 747.4C495.4 736.1 489 713.5 489.3 712.6C489.7 711.7 498.6 744.1 500 742C501.4 739.9 480.2 709.1 498 700C515.8 690.9 587.4 683.3 606.7 687.4Z'
};
// The back has no front-view outline; it is drawn as a small inset in its own space.
export const BACK_INSET={x:1300,y:200,scale:.5,width:300,height:280,shape:'M62 56C110 36 190 36 238 56C262 66 272 84 270 104C266 140 252 170 249 200L246 258L54 258L51 200C48 170 34 140 30 104C28 84 38 66 62 56Z'};
// `axis:[[x0,y0],[x1,y1]]` runs proximal → distal along the segment (portrait rig): placed
// devices rotate to it (segmentAngle). Torso/head segments get a vertical axis (angle 0).
const seg=(id,name,group,base,clip,anchor,extra={})=>({id,name,group,order:0,limb:false,vascular:false,tourniquet:false,base,clip,anchor,device:anchor,axis:clip&&[[anchor[0],clip[0]],[anchor[0],clip[1]]],...extra});
const mirror=([x,y])=>[1000-x,y];
const limb=(side,names)=>{
  const left=side==='left',arm=`${side}Arm`,leg=`${side}Leg`,m=p=>left?mirror(p):p;
  const L=(id,name,group,order,clip,anchor,extra={})=>seg(`${side}${id}`,name,group,group,clip,m(anchor),{order,limb:true,...Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,Array.isArray(v)?(Array.isArray(v[0])?v.map(m):m(v)):v]))});
  // Bands of one base are contiguous and ordered proximal → distal. `bridge` marks the short
  // joint segments added in 0.8: a splint reaches across them (see splintReach).
  return [
    L('Shoulder',names[0],arm,0,[285,335],[352,312],{bridge:true,axis:[[360,292],[348,335]]}),
    L('UpperArm',names[1],arm,1,[335,480],[338,385],{stasis:[330,420],tourniquet:true,axis:[[348,335],[313,480]]}),
    L('Elbow',names[2],arm,2,[480,565],[302,522],{vascular:true,ivSite:'elbow',axis:[[313,480],[291,565]]}),
    L('Forearm',names[3],arm,3,[565,735],[270,655],{splint:[277,650],tourniquet:true,vascular:true,ivSite:'forearm',axis:[[291,565],[251,735]]}),
    L('Wrist',names[4],arm,4,[735,775],[246,755],{bridge:true,axis:[[251,735],[241,774]]}),
    L('Hand',names[5],arm,5,[775,880],[238,815],{vascular:true,ivSite:'hand',axis:[[241,774],[215,861]]}),
    L('Hip',names[6],leg,0,[700,790],[425,758],{bridge:true,axis:[[452,700],[436,790]]}),
    L('Thigh',names[7],leg,1,[790,1000],[428,860],{stasis:[425,820],tourniquet:true,axis:[[436,790],[418,1000]]}),
    L('Knee',names[8],leg,2,[1000,1110],[415,1055],{axis:[[418,1000],[413,1110]]}),
    L('Shin',names[9],leg,3,[1110,1370],[410,1240],{stasis:[410,1160],splint:[408,1240],tourniquet:true,axis:[[413,1110],[412,1370]]}),
    L('Ankle',names[10],leg,4,[1370,1410],[412,1390],{bridge:true,axis:[[412,1370],[413,1410]]}),
    L('Foot',names[11],leg,5,[1410,1465],[412,1437],{axis:[[413,1410],[413,1465]]})
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
  ...limb('right',['Prawy bark','Prawe ramię','Prawy łokieć','Prawe przedramię','Prawy nadgarstek','Prawa dłoń','Prawe biodro','Prawe udo','Prawe kolano','Prawe podudzie','Prawa kostka','Prawa stopa']),
  ...limb('left',['Lewy bark','Lewe ramię','Lewy łokieć','Lewe przedramię','Lewy nadgarstek','Lewa dłoń','Lewe biodro','Lewe udo','Lewe kolano','Lewe podudzie','Lewa kostka','Lewa stopa'])
];
// Pre-0.7 limb ids map to their most representative segment (saves, scenarios, callers).
export const LEGACY_PARTS={rightArm:'rightForearm',leftArm:'leftForearm',rightLeg:'rightThigh',leftLeg:'leftThigh'};
export const resolvePart=id=>LEGACY_PARTS[id]??id;
let partIndex=null;
export const bodyPart=id=>{if(partIndex?.size!==BODY_PARTS.length)partIndex=new Map(BODY_PARTS.map(p=>[p.id,p]));return partIndex.get(resolvePart(id));};
// Item `regions` may list group ids ('leftArm', 'head') or exact segment ids.
export const matchesRegion=(regions,id)=>{const p=bodyPart(id);return Boolean(p&&regions.some(r=>r===p.id||r===p.group));};
export const sameGroup=(a,b)=>bodyPart(a)?.group===bodyPart(b)?.group;
// A splint covers its own segment and the adjacent ones of the same limb, reaching across one
// `bridge` joint segment (forearm ↔ hand over the wrist), so pre-0.8 neighbours stay neighbours.
export const splintReach=(a,b)=>{
  const p=bodyPart(a),q=bodyPart(b);if(!p?.limb||!q?.limb||p.group!==q.group)return false;
  const d=Math.abs(p.order-q.order);
  return d<=1||(d===2&&Boolean(BODY_PARTS.find(s=>s.group===p.group&&s.order===Math.min(p.order,q.order)+1)?.bridge));
};
// Most distal tourniquet site strictly proximal to a segment (the stump site after an amputation).
export const proximalTourniquetSite=id=>{const p=bodyPart(id);return BODY_PARTS.filter(t=>p?.limb&&t.group===p.group&&t.tourniquet&&t.order<p.order).sort((a,b)=>b.order-a.order)[0]?.id??null;};
// Horizontal extent [x0, x1] of a base outline at height y. The path is flattened into a
// polygon (béziers sampled), so it supports absolute M L H V C S Q Z commands.
const OUTLINE_POLY=new Map();
const outlinePoints=d=>{
  if(OUTLINE_POLY.has(d))return OUTLINE_POLY.get(d);
  const pts=[];let cur=[0,0],ctl=null;
  const bez=(ps,steps=8)=>{for(let k=1;k<=steps;k++){const t=k/steps,u=1-t,w=ps.length===3?[u*u,2*u*t,t*t]:[u*u*u,3*u*u*t,3*u*t*t,t*t*t];pts.push([0,1].map(i=>w.reduce((a,wi,j)=>a+wi*ps[j][i],0)));}};
  for(const [,c,args] of d.matchAll(/([MLCSQHVZ])([^MLCSQHVZ]*)/g)){
    const n=(args.match(/-?\d*\.?\d+(?:e-?\d+)?/g)||[]).map(Number);
    if(c==='Z')continue;
    if(c==='H'||c==='V'){for(const v of n){cur=c==='H'?[v,cur[1]]:[cur[0],v];pts.push(cur);}ctl=null;continue;}
    const size={M:2,L:2,C:6,S:4,Q:4}[c];
    for(let i=0;i+size<=n.length;i+=size){
      const a=n.slice(i,i+size),end=[a.at(-2),a.at(-1)];
      if(c==='C'){bez([cur,[a[0],a[1]],[a[2],a[3]],end]);ctl=[a[2],a[3]];}
      else if(c==='S'){const c1=ctl?[2*cur[0]-ctl[0],2*cur[1]-ctl[1]]:cur;bez([cur,c1,[a[0],a[1]],end]);ctl=[a[0],a[1]];}
      else if(c==='Q'){bez([cur,[a[0],a[1]],end]);ctl=null;}
      else{pts.push(end);ctl=null;}
      cur=end;
    }
  }
  OUTLINE_POLY.set(d,pts);return pts;
};
export const outlineSpan=(base,y)=>{
  const pts=outlinePoints(BODY_OUTLINES[base]||''),xs=[];
  pts.forEach(([x0,y0],i)=>{const [x1,y1]=pts[(i+1)%pts.length];if(y0!==y1&&y>=Math.min(y0,y1)&&y<=Math.max(y0,y1))xs.push(x0+(x1-x0)*(y-y0)/(y1-y0));});
  return xs.length?[Math.min(...xs),Math.max(...xs)]:null;
};
// Where an amputation cuts: the middle of the outline at the proximal edge of the segment's band.
export const cutPoint=id=>{
  const p=bodyPart(id);if(!p?.clip)return p?.anchor;
  const span=outlineSpan(p.base,p.clip[0]);return span?[Math.round((span[0]+span[1])/2),p.clip[0]]:[p.anchor[0],p.clip[0]];
};
// Width of the limb at that cut (used to size the drawn stump end).
export const cutWidth=id=>{const p=bodyPart(id),span=p?.clip&&outlineSpan(p.base,p.clip[0]);return span?Math.round(span[1]-span[0]):80;};
// Device orientation: degrees to rotate portrait art (long side along +y) onto the segment
// axis. 0 for torso/head/back, so their devices stay upright.
export const segmentAngle=id=>{const p=bodyPart(id);if(!p?.limb||!p.axis)return 0;const [[x0,y0],[x1,y1]]=p.axis;return Math.round(Math.atan2(x0-x1,y1-y0)*1800/Math.PI)/10||0;};
// Limb thickness across its axis at height y (default: the anchor), for sizing devices to wrap it.
export const limbWidth=(id,y)=>{const p=bodyPart(id);if(!p?.base)return 80;const span=outlineSpan(p.base,y??p.anchor[1]);return span?Math.round((span[1]-span[0])*Math.cos(segmentAngle(id)*Math.PI/180)):80;};
export const BODY_RIG={viewBox:'0 175 1500 650',transform:'translate(0 1000) rotate(-90)'};
export const horizontalPoint=([x,y])=>[y,1000-x];
// Scene (horizontal) coordinates of a segment anchor, including the back inset.
export const scenePoint=part=>part.inset?[BACK_INSET.x+part.anchor[0]*BACK_INSET.scale,BACK_INSET.y+part.anchor[1]*BACK_INSET.scale]:horizontalPoint(part.anchor);
