import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files=['server.js',...readdirSync('src',{recursive:true}).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`)];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`Syntax OK: ${files.length} modules`);
