import { TUTORIAL_STEPS } from '../content/tutorial.js';
export function tutorialProgress(g){
  const total=TUTORIAL_STEPS.length,found=TUTORIAL_STEPS.findIndex(s=>!s.done(g));
  const complete=found===-1,index=complete?total:found;
  return {index,total,step:complete?null:TUTORIAL_STEPS[index],complete};
}
