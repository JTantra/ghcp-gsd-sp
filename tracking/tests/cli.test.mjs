import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const cli=resolve('tracking/cli.mjs');
test('CLI supports trusted provider substitution and fails unknown flags/mutation without apply',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tracker-cli-'));try{
  await writeFile(join(dir,'adapter.mjs'),`export function createProvider(c){return {doctor:async()=>({provider:'jira-contract-fixture',target:c.target}),listMilestones:async()=>[],listItems:async()=>[]}}`);
  await writeFile(join(dir,'config.json'),JSON.stringify({provider:'custom',providerModule:'./adapter.mjs',target:'JIRA/TEAM',stateFile:'state.json'}));
  const run=(...args)=>spawnSync(process.execPath,[cli,...args,'--config','config.json'],{cwd:dir,encoding:'utf8'});
  const r=run('doctor');assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).target,'JIRA/TEAM');
  assert.notEqual(run('apply').status,0);assert.notEqual(run('doctor','--typo').status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
