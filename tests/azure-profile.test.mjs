import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const mod=await import('../scripts/install-profile.mjs').catch(()=>({}));
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'azure-profile-'));
 const put=async(p,c)=>{await mkdir(join(root,p,'..'),{recursive:true});await writeFile(join(root,p),typeof c==='string'?c:JSON.stringify(c));};
 await put('AGENTS.md','Existing policy\n');await put('.github/copilot-instructions.md','Existing Copilot\n');
 await put('.planning/config.json',{agent_skills:{'gsd-planner':['skills/keep']},custom:true});
 await put('.github/agents/gsd-planner.agent.md',"---\nname: gsd-planner\ndescription: Planner\ntools: ['read', 'mslearn/*']\n---\nOriginal body\n");
 await put('.github/agents/gsd-codebase-mapper.agent.md',"---\ndescription: Local mapper\ntools: ['read']\n---\nLocal only\n");
 await put('.mcp.json',{mcpServers:{existing:{command:'keep'}}});
 return {root,put,clean:()=>rm(root,{recursive:true,force:true})};
}
test('Azure installation is idempotent, preserves unrelated policy and grants only chosen roles',async()=>{
 assert.equal(typeof mod.installProfile,'function');const f=await fixture();try{
  await mod.installProfile(f.root,{framework:'gsd'});await mod.installProfile(f.root,{framework:'gsd'});
  const m=JSON.parse(await readFile(join(f.root,'.mcp.json'),'utf8'));
  assert.equal(m.mcpServers.existing.command,'keep');assert.ok(m.mcpServers.azure.args.includes('--read-only'));
  assert.ok(m.mcpServers.azure.args.includes('@azure/mcp@2.0.5'));
  const c=JSON.parse(await readFile(join(f.root,'.planning/config.json'),'utf8'));assert.equal(c.custom,true);assert.deepEqual(c.agent_skills['gsd-planner'],['skills/keep','skills/azure-engineering']);
  const a=await readFile(join(f.root,'.github/agents/gsd-planner.agent.md'),'utf8');assert.match(a,/azure\/\*/);assert.match(a,/Original body/);
  assert.doesNotMatch(await readFile(join(f.root,'.github/agents/gsd-codebase-mapper.agent.md'),'utf8'),/azure/);
  const policy=await readFile(join(f.root,'AGENTS.md'),'utf8');assert.equal(policy.split('<!-- azure-profile:begin -->').length,2);assert.match(policy,/Existing policy/);
  await mod.installProfile(f.root,{framework:'gsd',check:true});
  const path=join(f.root,'.mcp.json'),config=JSON.parse(await readFile(path,'utf8'));config.mcpServers.azure=Object.fromEntries(Object.entries(config.mcpServers.azure).reverse());await f.put('.mcp.json',config);
  await mod.installProfile(f.root,{framework:'gsd'});await mod.installProfile(f.root,{framework:'gsd',check:true});
 }finally{await f.clean();}
});
test('installation provisions its standards and detects removal',async()=>{
 const f=await fixture();try{
  await mod.installProfile(f.root,{framework:'gsd'});
  assert.match(await readFile(join(f.root,'profiles/azure/engineering-standards.md'),'utf8'),/Microsoft Learn/);
  await rm(join(f.root,'skills/azure-engineering/SKILL.md'));
  await assert.rejects(mod.installProfile(f.root,{framework:'gsd',check:true}),/Missing|changed/);
 }finally{await f.clean();}
});
test('conflicting MCP config or malformed JSON fails before any changes',async()=>{
 const f=await fixture();try{
  await f.put('.vscode/mcp.json',{servers:{azure:{command:'unsafe'}}});
  await assert.rejects(mod.installProfile(f.root,{framework:'gsd'}),/Conflicting/);
  assert.equal(await readFile(join(f.root,'AGENTS.md'),'utf8'),'Existing policy\n');
  assert.deepEqual(JSON.parse(await readFile(join(f.root,'.mcp.json'),'utf8')),{mcpServers:{existing:{command:'keep'}}});
 }finally{await f.clean();}
});
test('array-shaped MCP and GSD root configs are rejected before writing',async()=>{
 for(const path of ['.mcp.json','.planning/config.json']){
  const f=await fixture();try{
   await f.put(path,[]);
   await assert.rejects(mod.installProfile(f.root,{framework:'gsd'}),/object|config/i);
   assert.equal(await readFile(join(f.root,'AGENTS.md'),'utf8'),'Existing policy\n');
   assert.equal((await readFile(join(f.root,path),'utf8')).trim(),'[]');
  }finally{await f.clean();}
 }
});
