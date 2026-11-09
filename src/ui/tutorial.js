export function renderTutorial({index,total,step}){
  return `<section class="tutorial-coach" aria-label="Samouczek"><div class="tutorial-top"><span class="mission-label">Samouczek ${index+1}/${total}</span><button class="quiet" data-tutorial-skip>Pomiń samouczek</button></div><h2>${step.title}</h2><p>${step.text}</p>${step.hint?`<small>${step.hint}</small>`:''}</section>`;
}
