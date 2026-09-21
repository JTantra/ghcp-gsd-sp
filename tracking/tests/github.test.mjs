import test from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../providers/github.mjs').catch(()=>({}));
test('GitHub adapter implements normalized milestone/item/comment contract with explicit target',async()=>{
 assert.equal(typeof mod.createProvider,'function','GitHub provider must exist');
 const calls=[];let ms=[],items=[],comments=[];
 const transport=async(url,opts)=>{
  const u=new URL(url),p=u.pathname;calls.push({url,p,method:opts.method,body:opts.body});const b=opts.body?JSON.parse(opts.body):{};
  assert.equal(opts.headers.Authorization,'Bearer test-secret');assert.ok(p.startsWith('/repos/acme/app/'));
  let result;
  if(p.endsWith('/milestones')&&opts.method==='POST'){result={...b,number:1,state:'open',html_url:'https://github.com/acme/app/milestone/1'};ms.push(result);}
  else if(p.endsWith('/milestones'))result=ms;
  else if(p.endsWith('/milestones/1')){result=ms[0];if(opts.method==='PATCH')Object.assign(result,b);}
  else if(p.endsWith('/issues')&&opts.method==='POST'){result={...b,number:5,state:'open',milestone:{number:b.milestone},html_url:'https://github.com/acme/app/issues/5'};items.push(result);}
  else if(p.endsWith('/issues'))result=[...items,{number:99,pull_request:{url:'x'}}];
  else if(p.endsWith('/issues/5/comments')){if(opts.method==='POST'){result={...b,id:7};comments.push(result);}else result=comments;}
  else if(p.endsWith('/issues/comments/7')){result=comments[0];Object.assign(result,b);}
  else if(p.endsWith('/issues/5')){result=items[0];if(opts.method==='PATCH')Object.assign(result,b);}
  else throw new Error('Unexpected fixture path');
  return new Response(JSON.stringify(result),{status:200});
 };
 const p=mod.createProvider({repository:'acme/app'},{token:'test-secret',fetch:transport});
 const m=await p.createMilestone({title:'Pilot',description:'desc'});assert.equal(m.id,'1');
 const i=await p.createItem({title:'Feature',body:'body',milestoneId:m.id});assert.equal(i.id,'5');assert.equal(i.milestoneId,'1');
 assert.equal((await p.listItems({milestoneId:'1'})).length,1);
 assert.equal((await p.listMilestones()).length,1);
 await p.updateMilestone('1',{state:'closed'});assert.equal((await p.getMilestone('1')).state,'closed');
 await p.updateItem('5',{title:'Edited'});assert.equal((await p.getItem('5')).title,'Edited');
 await p.createComment('5','reported');await p.updateComment('7','updated');assert.equal((await p.listComments('5'))[0].body,'updated');
 assert.throws(()=>mod.createProvider({repository:'acme/app/../../other'}),/repository/);
 await assert.rejects(p.getItem('../secrets'),/id/i);
});
test('canonical numeric repository pagination stays bound to the configured repository',async()=>{
 let count=0;
 const p=mod.createProvider({repository:'acme/app'},{token:'test-secret',fetch:async url=>{
  count++;const u=new URL(url);assert.equal(u.pathname,'/repos/acme/app/milestones');
  if(count===1)return new Response('[]',{headers:{Link:'<https://api.github.com/repositories/123/milestones?state=all&per_page=100&page=2>; rel="next"'}});
  assert.equal(u.searchParams.get('page'),'2');return new Response('[]');
 }});
 assert.deepEqual(await p.listMilestones(),[]);assert.equal(count,2);
});
test('GitHub errors do not leak response/token; cross-origin pagination is rejected',async()=>{
 assert.equal(typeof mod.createProvider,'function');
 const p=mod.createProvider({repository:'acme/app'},{token:'test-secret',fetch:async()=>new Response('test-secret',{status:401})});
 await assert.rejects(p.listMilestones(),e=>e.message.includes('401')&&!e.message.includes('test-secret'));
 const q=mod.createProvider({repository:'acme/app'},{token:'test-secret',fetch:async()=>new Response('[]',{headers:{Link:'<https://evil.test/steal>; rel="next"'}})});
 await assert.rejects(q.listMilestones(),/pagination/);
});
