import { runIVMinigame } from './iv-minigame.js';
// Presentation registry mirrors simulation/procedures without coupling its rules.
export const PROCEDURE_VIEWS={iv:runIVMinigame};
export function launchProcedure(id,game,part){
  if(!PROCEDURE_VIEWS[id])throw new Error(`Brak widoku procedury: ${id}`);
  return PROCEDURE_VIEWS[id](game,part);
}
