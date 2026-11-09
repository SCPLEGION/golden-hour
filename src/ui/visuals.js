// Presentation-only registry. New effects/types may reuse a renderer or add one
// without touching simulation. Coordinates use the canonical body rig.
export const WOUND_ART = {
  gunshot:'<ellipse rx="25" ry="32" fill="#693e3a" opacity=".8"/><circle r="13" fill="#241c1d" stroke="#dc7770" stroke-width="4"/><path d="M-21-16L-12-8M19-23L10-11M-21 19L-9 9" stroke="#cd766c" stroke-width="3"/>',
  arterial:'<path d="M-22-26Q5-9 19 26L8 31Q-8 9-27-12Z" fill="#8d343c" stroke="#ef8e7d" stroke-width="2"/><path d="M-9 5Q-34 29-20 42Q-3 49 2 26" fill="#a94d51"/>',
  openFracture:'<ellipse rx="26" ry="40" fill="#76363f" stroke="#b46a6a" stroke-width="2"/><path d="M-4-28L5-9L-8 0L10 27" fill="none" stroke="#ded9bf" stroke-width="10"/><path d="M5-9L17-7L4 5" fill="none" stroke="#f4ead2" stroke-width="5"/>',
  fracture:'<ellipse rx="33" ry="44" fill="#a78972" opacity=".3"/><path d="M0-28L-9-5L9 3L-2 31" fill="none" stroke="#d7b27d" stroke-width="5"/>',
  contusion:'<ellipse rx="30" ry="38" fill="#8a6e80" opacity=".45"/><path d="M-17-11L6-16M-12 4L17-1M-7 17L16 14" stroke="#b49baa" stroke-width="3" opacity=".7"/>',
  internal:'<circle r="31" fill="none" stroke="#d8b278" stroke-width="2" stroke-dasharray="5 7"/><path d="M-11-11L11 11M11-11L-11 11" stroke="#d8b278" stroke-width="3"/>',
  chestWound:'<path d="M-24-20L16-30L28 20L-13 31Z" fill="#793d42" stroke="#e88b7d" stroke-width="3"/><path d="M-8-14L10 16" stroke="#26262a" stroke-width="9"/>',
  obstruction:'<path d="M-17-13L17 13M17-13L-17 13" stroke="#d6b474" stroke-width="5"/><circle r="30" fill="none" stroke="#d6b474" stroke-width="2"/>',
  asthma:'<path d="M-23 0Q-12-26 0 0T23 0M-23 14Q-12-12 0 14T23 14" fill="none" stroke="#d6b474" stroke-width="4"/>'
};
export const DEVICE_ART = {
  dressing:'<rect x="-37" y="-28" width="74" height="56" rx="5" fill="#d8d9c9" stroke="#959f95" stroke-width="2"/><path d="M-37-13H37M-37 0H37M-37 13H37" stroke="#a8b2a5" stroke-width="2"/><rect x="-21" y="-21" width="42" height="42" rx="3" fill="#e5e4d8"/><path d="M-13-9L11 12M10-12L-13 10" stroke="#b17770" stroke-width="3" opacity=".65"/>',
  hemostatic:'<rect x="-32" y="-30" width="64" height="60" rx="4" fill="#d1d2b9" stroke="#879782" stroke-width="3"/><path d="M-23-17H23M-23-7H23M-23 3H23M-23 13H23M-23 23H23" stroke="#8d9b82" stroke-width="3"/><path d="M-10-14L8 13" stroke="#8a514e" stroke-width="5"/>',
  tourniquet:'<rect x="-57" y="-16" width="114" height="32" rx="4" fill="#141b1d" stroke="#a9b6ac" stroke-width="2"/><rect x="-19" y="-22" width="38" height="44" rx="3" fill="#293b3d" stroke="#c3ccc0" stroke-width="3"/><path d="M-36 0H36" stroke="#cebe83" stroke-width="8"/><rect x="20" y="-14" width="22" height="28" fill="#a78f5d"/>',
  splint:'<rect x="-48" y="-99" width="19" height="198" rx="6" fill="#9a8051" stroke="#dec58b" stroke-width="2"/><rect x="29" y="-99" width="19" height="198" rx="6" fill="#9a8051" stroke="#dec58b" stroke-width="2"/><path d="M-48-67H48M-48 0H48M-48 67H48" stroke="#c5cdb7" stroke-width="15"/>',
  seal:'<rect x="-40" y="-40" width="80" height="80" rx="7" fill="#b5cbc1" fill-opacity=".65" stroke="#d7e2d0" stroke-width="3"/><circle r="19" fill="#304647" stroke="#d7e2d0" stroke-width="3"/><path d="M-12 0H12M0-12V12" stroke="#d6c294" stroke-width="5"/>',
  iv:'<rect x="-30" y="-24" width="60" height="48" rx="4" fill="#c3cdbd" fill-opacity=".75"/><path d="M0-21V23" stroke="#c7dbdc" stroke-width="5"/><rect x="-14" y="-9" width="28" height="18" rx="3" fill="#80b7b1" stroke="#e2e4d2" stroke-width="2"/><path d="M0 23V47" stroke="#a7c8ba" stroke-width="4"/>',
  oxygen:'<path d="M-24-16Q0-32 24-16L20 22Q0 39-20 22Z" fill="#91beb8" fill-opacity=".45" stroke="#c9ddd0" stroke-width="3"/><circle cy="13" r="10" fill="#344f52" stroke="#c9ddd0" stroke-width="2"/>',
  airway:'<path d="M-5-15Q15 3 0 30" fill="none" stroke="#d9cba1" stroke-width="9"/><ellipse cy="-15" rx="17" ry="7" fill="#d9cba1"/>',
  blanket:'<path d="M-113-60L118-70L133 245L-134 242Z" fill="#a0935f" fill-opacity=".65" stroke="#c7bd8c" stroke-width="3"/><path d="M-108 15L115-5M-111 83L117 73M-122 177L127 154" stroke="#e1d4a4" stroke-width="2" opacity=".4"/>',
  fluid:'<rect x="-24" y="-38" width="48" height="66" rx="7" fill="#6da39d" fill-opacity=".65" stroke="#c9e2cd" stroke-width="3"/><path d="M-12-45H12M0-45V-38M0 29V45" stroke="#c9e2cd" stroke-width="4"/><path d="M-14-6H14M-14 4H14" stroke="#dbdfcb" stroke-width="3"/>'
};
Object.assign(DEVICE_ART, {
  cooling:'<rect x="-35" y="-29" width="70" height="58" rx="8" fill="#78aab0" fill-opacity=".7" stroke="#bad9d4" stroke-width="2"/><path d="M0-18V18M-16-9L16 9M-16 9L16-9M-5-13L0-18L5-13M-5 13L0 18L5 13" stroke="#d5e9de" stroke-width="3" fill="none"/>',
  burnDressing:'<rect x="-39" y="-32" width="78" height="64" rx="5" fill="#c8d8c6" stroke="#829c92" stroke-width="2"/><rect x="-30" y="-23" width="60" height="46" rx="3" fill="#a6c5b5"/><path d="M-24-14H24M-24-4H24M-24 6H24M-24 16H24" stroke="#d5e2d0" stroke-width="2"/><path d="M0-14V14M-14 0H14" stroke="#688d84" stroke-width="4"/>',
  irrigation:'<rect x="-15" y="-32" width="30" height="53" rx="7" fill="#8fb9b4" fill-opacity=".6" stroke="#c9dbcb" stroke-width="3"/><path d="M-10-39H10M0-39V-32M0 22V33M0 33Q-13 46 0 49Q13 46 0 33Z" fill="#94c7c4" stroke="#bed8cb" stroke-width="2"/><path d="M-7-14H7M-7-4H7" stroke="#d7e3d2" stroke-width="3"/>',
  sling:'<path d="M-51-36L49-24L31 42L-45 22Z" fill="#a7b9a1" fill-opacity=".8" stroke="#d9dfc4" stroke-width="3"/><path d="M-43-28L31 34M-36-30L38 29" stroke="#6d8e83" stroke-width="3"/><path d="M-47-35Q0-80 48-24" fill="none" stroke="#b8c9b0" stroke-width="9"/>',
  thermal:'<path d="M-45-40L42-45L49 45L-48 43Z" fill="#b7a36d" fill-opacity=".8" stroke="#dfcea1" stroke-width="2"/><path d="M-37-26L38-32M-39-7L40-12M-39 13L41 8M-39 32L42 27" stroke="#e5d8ad" stroke-width="2" opacity=".6"/><path d="M-20-37L-24 39M2-39L-2 41M24-42L19 41" stroke="#786e4a" stroke-width="2" opacity=".5"/>',
  pad:'<ellipse rx="38" ry="29" fill="#d9dfcd" stroke="#a4b7a5" stroke-width="3"/><ellipse rx="28" ry="19" fill="#bdcfbb"/><path d="M-17-8L17 8M17-8L-17 8" stroke="#91a68e" stroke-width="2"/>',
  gauze:'<rect x="-34" y="-32" width="68" height="64" rx="4" fill="#d6ddc7" stroke="#9eb59f" stroke-width="3"/><path d="M-27-21H27M-27-10H27M-27 1H27M-27 12H27M-27 23H27M-20-25V25M-8-25V25M4-25V25M16-25V25M26-25V25" stroke="#a9bca3" stroke-width="2"/>',
  assess:'<rect x="-30" y="-25" width="60" height="45" rx="5" fill="#25484c" stroke="#b3cec1" stroke-width="3"/><path d="M-21 0H-13L-7-12L2 12L10-6L16 0H23" fill="none" stroke="#91cdb3" stroke-width="3"/><path d="M-13 28H13M0 21V28" stroke="#abc7b9" stroke-width="3"/>'
});
Object.assign(WOUND_ART, {
  burn:'<path d="M-29-23L-9-34L12-28L29-10L25 17L6 31L-20 23L-32 5Z" fill="#9c5b49" fill-opacity=".6" stroke="#d09a78" stroke-width="2"/><path d="M-13-12Q5-23 16-9M-18 7Q0-3 15 15" fill="none" stroke="#dcaf86" stroke-width="3" opacity=".6"/>',
  cold:'<circle r="30" fill="#83aeb1" opacity=".2"/><path d="M0-24V24M-21-12L21 12M-21 12L21-12M-7-17L0-24L7-17M-7 17L0 24L7 17" fill="none" stroke="#abc9ce" stroke-width="3"/>',
  sprain:'<ellipse rx="31" ry="39" fill="#a18b69" opacity=".32"/><path d="M-12-24L8-9L-8 8L12 24" fill="none" stroke="#d0b684" stroke-width="4"/>',
  foreignBody:'<ellipse rx="25" ry="30" fill="#804c48" opacity=".6"/><path d="M-7-38L10-32L4 20L-6 27L-13 18Z" fill="#a6b5ab" stroke="#d8dfcc" stroke-width="2"/>',
  eyes:'<path d="M-33 0Q0-29 33 0Q0 29-33 0Z" fill="#45676b" stroke="#c2d4c5" stroke-width="3"/><circle r="11" fill="#9ebcb5"/><path d="M-20-20L20 20" stroke="#d69d7b" stroke-width="3"/>',
  airwayFluid:'<circle r="29" fill="none" stroke="#a2c4ba" stroke-width="2"/><path d="M-14 10Q-5-17 0-18Q4-10 13 9Q14 24 0 25Q-14 22-14 10Z" fill="#88afb0" opacity=".8"/>'
});
export function deviceArt(effect){return DEVICE_ART[effect]||'<circle r="20" fill="#506e69" stroke="#b4c8b8" stroke-width="3"/><path d="M-10 0H10M0-10V10" stroke="#dbe2cb" stroke-width="4"/>';}
export function itemIcon(item) {
  let art=DEVICE_ART[item.visual]||DEVICE_ART[item.effect];
  if(item.effect==='medicine')art='<rect x="-15" y="-24" width="30" height="49" rx="5" fill="#88aaa0" stroke="#c9d5bd" stroke-width="2"/><rect x="-12" y="-31" width="24" height="9" rx="2" fill="#c0c5a4"/><path d="M-11 0H11M0-11V11" stroke="#edf0d6" stroke-width="4"/>';
  const scale=item.effect==='splint'?.25:item.effect==='blanket'?.13:item.effect==='tourniquet'?.42:.65;
  return `<svg viewBox="0 0 64 64" class="item-icon" aria-hidden="true"><g transform="translate(32 32) scale(${scale})">${art||deviceArt(item.effect)}</g></svg>`;
}
