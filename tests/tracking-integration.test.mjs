import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const mod=await import('../scripts/install-tracking.mjs').catch(()=>({}));
test('installer integrates workflows and agent skills idempotently, preserves existing settings, checks tampering',async()=>{
 assert.equal(typeof mod.installTracking,'function','integration installer must exist');
 const root=await mkdtemp(join(tmpdir(),'tracking-wiring-'));try{
  await mkdir(join(root,'.planning'),{recursive:true});await writeFile(join(root,'.planning/config.json'),JSON.stringify({mode:'interactive',agent_skills:{'gsd-executor':['skills/test-driven-development']}}));
  for(const name of mod.workflowNames){const f=join(root,'.github/gsd-core/workflows',name+'.md');await mkdir(join(f,'..'),{recursive:true});await writeFile(f,'<purpose>Existing instructions</purpose>\n<process>\nKeep this.\n</process>\n');}
  await writeFile(join(root,'AGENTS.md'),'Existing project instructions\n');
  await mod.installTracking(root);const once=await readFile(join(root,'AGENTS.md'),'utf8');await mod.installTracking(root);assert.equal(await readFile(join(root,'AGENTS.md'),'utf8'),once);
  const c=JSON.parse(await readFile(join(root,'.planning/config.json'),'utf8'));assert.equal(c.mode,'interactive');assert.ok(c.agent_skills['gsd-executor'].includes('skills/test-driven-development'));assert.ok(c.agent_skills['gsd-executor'].includes('skills/tracker-awareness'));
  await mod.installTracking(root,{check:true});await writeFile(join(root,'.github/gsd-core/workflows/ship.md'),'Missing integration');await assert.rejects(mod.installTracking(root,{check:true}),/integration|marker/i);
 }finally{await rm(root,{recursive:true,force:true});}
});
