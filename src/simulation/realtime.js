// Wall-clock adapter is independent of DOM and physiology. It never catches up
// time spent in another tab, reading a modal or running a charged procedure.
export function createRealtimeDriver({canRun,getSpeed,onAdvance,now=()=>performance.now(),schedule=setInterval,cancel=clearInterval}){
  let last=now(),credit=0,timer=null;
  function pulse(){
    const current=now(),delta=Math.max(0,Math.min(1.25,(current-last)/1000));last=current;
    if(!canRun()){credit=0;return;}
    credit+=delta*getSpeed();
    const seconds=Math.min(8,Math.floor(credit));
    if(seconds){credit-=seconds;onAdvance(seconds);}
  }
  return {start(){if(timer===null){last=now();credit=0;timer=schedule(pulse,200);}},stop(){if(timer!==null)cancel(timer);timer=null;credit=0;},reset(){last=now();credit=0;},pulse};
}
