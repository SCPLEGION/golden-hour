import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
// Test files run in parallel (output is buffered and printed in file order); the timing-sensitive perf test runs alone
// afterwards. Exit code: that of the first failing file, 0 when all pass.
const files=readdirSync('tests').filter(f=>f.endsWith('.test.js')).sort();
const solo=files.filter(f=>f.startsWith('perf.')),parallel=files.filter(f=>!solo.includes(f));
const run=file=>new Promise(resolve=>{
  const child=spawn(process.execPath,[`tests/${file}`],{stdio:['ignore','pipe','pipe']});let out='';
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
  child.on('close',code=>resolve({file,code:code??1,out}));
});
async function pool(list,limit){
  const results=[];let next=0;
  await Promise.all(Array.from({length:Math.min(limit,list.length)},async()=>{while(next<list.length){const i=next++;results[i]=await run(list[i]);}}));
  return results;
}
const results=[...await pool(parallel,Math.max(2,availableParallelism()-1)),...await pool(solo,1)];
for(const r of results)process.stdout.write(r.out);
const failed=results.find(r=>r.code!==0);
if(failed){console.error(`\nFailed: tests/${failed.file}`);process.exit(failed.code||1);}
