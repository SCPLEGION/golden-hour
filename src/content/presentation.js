// A placed effect opts into visualization here. The renderer is independent of
// inventory IDs, so equipment variants automatically share the same artwork.
// `fit` = the limb width (rig units) the art is drawn for; the scene scales it to the limb.
export const PLACED_VISUALS = {
  dressing:{scope:'wound',art:'dressing'},
  hemostatic:{scope:'wound',art:'hemostatic'},
  seal:{scope:'wound',art:'seal'},
  tourniquet:{scope:'part',anchor:'stasis',art:'tourniquet',name:'Staza',fit:58},
  splint:{scope:'part',anchor:'splint',art:'splint',name:'Szyna',fit:50}
};
