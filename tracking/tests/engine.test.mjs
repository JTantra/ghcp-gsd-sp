import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,scope} from './helpers.mjs';
const module=await import('../lib/engine.mjs');
test('dry plan makes no writes; explicit apply publishes once and repeated apply is a no-op',async()=>{
 assert.equal(typeof module.createEngine,'function','tracking engine must exist');
 const t=await setup();try{
  const plan=await t.engine.plan(scope);assert.equal(t.provider.writes,0);assert.equal(plan.operations.length,2);
  await assert.rejects(t.engine.apply(scope),/apply|authorization/i);assert.equal(t.provider.writes,0);
  const first=await t.engine.apply(scope,{apply:true});assert.equal(first.items.persist.id,'ACME-1');
  const writes=t.provider.writes;await t.engine.apply(scope,{apply:true});assert.equal(t.provider.writes,writes);
 }finally{await t.cleanup();}
});
test('remote human edits are reported; resolver and check fail on stale scope',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});t.provider.items[0].body+='\nHuman edit';
  await assert.rejects(t.engine.apply(scope,{apply:true}),/conflict/);
  assert.equal(typeof t.engine.check,'function','check must exist');
  await assert.rejects(t.engine.check(),/conflict/);
  await assert.rejects(t.engine.resolveItem('ACME-1'),/conflict/);
  const status=await t.engine.status();assert.equal(status.items[0].scopeChanged,true);
 }finally{await t.cleanup();}
});
test('a lost create response recovers via marker without duplicating remote issue',async()=>{
 const t=await setup();try{
  const create=t.provider.createItem.bind(t.provider);let first=true;
  t.provider.createItem=async v=>{const item=await create(v);if(first){first=false;throw new Error('response lost');}return item;};
  await assert.rejects(t.engine.apply(scope,{apply:true}),/response lost/);
  await t.engine.apply(scope,{apply:true});assert.equal(t.provider.items.length,1);
 }finally{await t.cleanup();}
});
test('import preserves external issue IDs and resolver returns meaningful criteria',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});
  assert.equal(typeof t.engine.importMilestone,'function','import must exist');
  const imported=await t.engine.importMilestone('release-1');assert.equal(imported.scope.features[0].key,'persist');
  const r=await t.engine.resolveItem('ACME-1');assert.match(r.description,/Persist/);assert.deepEqual(r.acceptance_criteria,scope.features[0].acceptanceCriteria);
 }finally{await t.cleanup();}
});
test('evidence upserts one reported comment and never closes an issue',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});assert.equal(typeof t.engine.event,'function','event must exist');
  const e={status:'verified',summary:'Local tests passed',references:['docs/test-report.md']};
  await assert.rejects(t.engine.event('ACME-1',e),/apply/);
  await t.engine.event('ACME-1',e,{apply:true});await t.engine.event('ACME-1',e,{apply:true});
  assert.equal(t.provider.comments.length,1);assert.match(t.provider.comments[0].body,/Reported/);assert.doesNotMatch(t.provider.comments[0].body,/GSD/);assert.equal(t.provider.items[0].state,'open');
  await assert.rejects(t.engine.event('ACME-1',{status:'done',summary:'done',references:[]},{apply:true}),/status/);
 }finally{await t.cleanup();}
});
test('milestone close checks ALL remote items including unmanaged and requires approval',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});assert.equal(typeof t.engine.closeMilestone,'function','close must exist');
  await assert.rejects(t.engine.closeMilestone(),/apply/);
  await assert.rejects(t.engine.closeMilestone({apply:true}),/open/);
  t.provider.items[0].state='closed';await t.provider.createItem({title:'Unmanaged',body:'Needs work',milestoneId:'release-1'});
  await assert.rejects(t.engine.closeMilestone({apply:true}),/open/);
  t.provider.items[1].state='closed';await t.engine.closeMilestone({apply:true});assert.equal(t.provider.milestones[0].state,'closed');
 }finally{await t.cleanup();}
});
