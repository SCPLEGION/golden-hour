import { runIVMinigame } from './iv-minigame.js';
import { runTourniquetMinigame } from './tourniquet-minigame.js';
import { runCPRMinigame } from './cpr-minigame.js';
import { runPackingMinigame } from './packing-minigame.js';
import { runSealMinigame } from './seal-minigame.js';
// Presentation registry mirrors simulation/procedures without coupling its rules.
export const PROCEDURE_VIEWS={iv:runIVMinigame,tourniquet:runTourniquetMinigame,cpr:runCPRMinigame,packing:runPackingMinigame,seal:runSealMinigame};
export function launchProcedure(id,game,part,injuryId=null){
  if(!PROCEDURE_VIEWS[id])throw new Error(`Brak widoku procedury: ${id}`);
  return PROCEDURE_VIEWS[id](game,part,injuryId);
}
