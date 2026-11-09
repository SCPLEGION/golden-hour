import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for(const file of readdirSync('tests').filter(f=>f.endsWith('.test.js')).sort()){
  const run=spawnSync(process.execPath,[`tests/${file}`],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status||1);
}
