import test from 'node:test';import assert from 'node:assert/strict';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {setup,scope} from './helpers.mjs';import {createEngine} from '../lib/engine.mjs';
test('definite rejected creates clear journal and can retry after permissions fixed',async()=>{
 const t=await setup();try{
  const create=t.provider.createItem.bind(t.provider);let reject=true;
  t.provider.createItem=async v=>{if(reject){reject=false;throw Object.assign(new Error('403 refused'),{definiteFailure:true});}return create(v);};
  await assert.rejects(t.engine.apply(scope,{apply:true}),/403/);await t.engine.apply(scope,{apply:true});assert.equal(t.provider.items.length,1);
 }finally{await t.cleanup();}
});
test('invalid imported milestone marker is rejected rather than persisted',async()=>{
 const t=await setup();try{
  const m=await t.provider.createMilestone({title:'Bad',description:'<!-- project-tracking:milestone:__proto__ -->'});
  await assert.rejects(t.engine.importMilestone(m.id),/key/);
 }finally{await t.cleanup();}
});
test('missing or reserved identity keys are rejected before remote writes',async()=>{
 const t=await setup();try{
  await assert.rejects(t.engine.plan({...scope,milestone:{title:'No key'}}),/key/);
  await assert.rejects(t.engine.plan({...scope,features:[{...scope.features[0],key:undefined}]}),/key/);
  await assert.rejects(t.engine.plan({...scope,features:[{...scope.features[0],key:'constructor'}]}),/key/);
  assert.equal(t.provider.writes,0);
 }finally{await t.cleanup();}
});
test('fresh state never trusts remote marker text as mutation authority; explicit import is required',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});const writes=t.provider.writes;
  const fresh=createEngine({provider:t.provider,target:'team/project',providerKey:'memory',statePath:join(t.dir,'fresh.json')});
  await assert.rejects(fresh.apply(scope,{apply:true}),/import|rebind/i);assert.equal(t.provider.writes,writes);
 }finally{await t.cleanup();}
});
test('progress publication never overwrites an untrusted comment with a spoofed marker',async()=>{
 const t=await setup();try{
  await t.engine.apply(scope,{apply:true});const h=createHash('sha256').update(JSON.stringify(['team/project','ACME-1'])).digest('hex').slice(0,16);
  await t.provider.createComment('ACME-1',`<!-- project-tracking:event:${h} -->\nHuman comment`);
  await t.engine.event('ACME-1',{status:'in_progress',summary:'Working',references:[]},{apply:true});
  assert.match(t.provider.comments[0].body,/Human comment/);assert.equal(t.provider.comments.length,2);
  await t.engine.event('ACME-1',{status:'in_progress',summary:'Working',references:[]},{apply:true});assert.equal(t.provider.comments.length,2);
 }finally{await t.cleanup();}
});
