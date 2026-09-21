import test from 'node:test';import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';import {join} from 'node:path';
import {createEngine} from '../lib/engine.mjs';import {setup,scope} from './helpers.mjs';
test('same feature key in separate milestones does not hijack prior work',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});
  const next=createEngine({provider:t.provider,target:'team/project',providerKey:'memory',statePath:join(t.dir,'next.json')});
  await next.apply({...scope,milestone:{key:'next',title:'Next release'}},{apply:true});assert.equal(t.provider.items.length,2);assert.equal(t.provider.items[0].milestoneId,'release-1');assert.equal(t.provider.items[1].milestoneId,'release-2');
 }finally{await t.cleanup();}
});
test('known mappings use direct reads even when GitHub collection listing lags',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});t.provider.listItems=async()=>[];t.provider.listMilestones=async()=>[];
  await t.engine.apply(scope,{apply:true});assert.equal(t.provider.items.length,1);
 }finally{await t.cleanup();}
});
test('uncertain creation is not retried when remote recovery listing is still empty',async()=>{
 const t=await setup();try{
  const create=t.provider.createItem.bind(t.provider);t.provider.createItem=async v=>{await create(v);throw new Error('lost response');};
  await assert.rejects(t.engine.apply(scope,{apply:true}),/lost response/);t.provider.listItems=async()=>[];
  await assert.rejects(t.engine.apply(scope,{apply:true}),/uncertain|pending/i);assert.equal(t.provider.items.length,1);
 }finally{await t.cleanup();}
});
test('publishing additional scope preserves already closed unchanged issues',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});t.provider.items[0].state='closed';
  await t.engine.apply({...scope,features:[...scope.features,{key:'extra',title:'Extra',description:'New work',acceptanceCriteria:['Works']}]},{apply:true});
  assert.equal(t.provider.items.length,2);assert.equal(t.provider.items[0].state,'closed');
 }finally{await t.cleanup();}
});
test('closure cannot ignore known open issues when collection listing lags',async()=>{
 const t=await setup();try{await t.engine.apply(scope,{apply:true});t.provider.listItems=async()=>[];await assert.rejects(t.engine.closeMilestone({apply:true}),/open/);}finally{await t.cleanup();}
});
test('local lock refuses concurrent publisher; invalid scope never mutates',async()=>{
 const t=await setup();try{
  await writeFile(join(t.dir,'state.json.lock'),'active');await assert.rejects(t.engine.apply(scope,{apply:true}),/locked/);assert.equal(t.provider.writes,0);
  await assert.rejects(t.engine.plan({...scope,features:[{...scope.features[0],acceptanceCriteria:[]}]}),/acceptance/);
 }finally{await t.cleanup();}
});
test('state cannot be reused for another project and closed work cannot execute',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});
  const other=createEngine({provider:t.provider,target:'other/project',providerKey:'memory',statePath:join(t.dir,'state.json')});await assert.rejects(other.status(),/different tracker/);
  t.provider.items[0].state='closed';await assert.rejects(t.engine.resolveItem('ACME-1'),/closed/);
 }finally{await t.cleanup();}
});
