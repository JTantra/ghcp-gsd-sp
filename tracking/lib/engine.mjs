import { readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stamp = value => hash([value.title, value.body ?? value.description ?? '', value.milestoneId ?? null]);
const keyPattern=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const validKey=key=>typeof key==='string'&&keyPattern.test(key)&&!['constructor','prototype','__proto__'].includes(key);
const marker=(kind,key)=>`<!-- project-tracking:${kind}:${key} -->`;
const withoutMarkers=s=>String(s??'').replace(/\n?<!-- project-tracking:[^>]+ -->/g,'').trim();
const required=(condition,message)=>{if(!condition)throw new Error(message);};
function validateScope(s){
 required(s?.milestone&&validKey(s.milestone.key),'Valid milestone key required');
 required(typeof s.milestone.title==='string'&&s.milestone.title.trim(),'Milestone title required');
 required(Array.isArray(s.features)&&s.features.length>0,'Nonempty features required');
 const seen=new Set();for(const f of s.features){
  required(validKey(f.key)&&!seen.has(f.key),'Invalid or duplicate feature key');seen.add(f.key);
  required(typeof f.title==='string'&&f.title.trim()&&typeof f.description==='string'&&f.description.trim(),'Feature title and description required');
  required(Array.isArray(f.acceptanceCriteria)&&f.acceptanceCriteria.length>0&&f.acceptanceCriteria.every(x=>typeof x==='string'&&x.trim()),'Nonempty acceptance criteria required');
 }
}
const milestonePayload=s=>({title:s.milestone.title,description:`${s.milestone.description??''}\n${marker('milestone',s.milestone.key)}`.trim()});
const itemPayload=(f,id,milestoneKey)=>({title:f.title,body:`${f.description}\n\n## Acceptance criteria\n${f.acceptanceCriteria.map(x=>`- [ ] ${x}`).join('\n')}\n\n${marker('item',`${milestoneKey}/${f.key}`)}`,milestoneId:id});

export function createEngine({provider,target,providerKey,statePath}){
 required(provider&&typeof target==='string'&&target.trim(),'Explicit provider target required');
 const file=resolve(statePath);const identity={target,providerKey};
 async function load(){
  try{const state=JSON.parse(await readFile(file,'utf8'));required(state.schema===1&&state.target===target&&state.providerKey===providerKey,'State belongs to a different tracker target');return state;}
  catch(e){if(e.code==='ENOENT')return {schema:1,...identity,milestone:null,items:{}};throw e;}
 }
 async function save(s){await mkdir(dirname(file),{recursive:true});const temp=`${file}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(s,null,2)+'\n',{mode:0o600});await rename(temp,file);}
 async function createSafely(state,operation,eventKey){
  try{return await operation();}catch(error){if(error.definiteFailure===true){if(eventKey)delete state.events[eventKey];else delete state.pending;await save(state);}throw error;}
 }
 async function locked(fn){
  await mkdir(dirname(file),{recursive:true});let lock;
  try{lock=await open(file+'.lock','wx',0o600);}catch(e){if(e.code==='EEXIST')throw new Error('Tracker state locked by another writer; inspect before removing stale lock');throw e;}
  try{await lock.writeFile(JSON.stringify({pid:process.pid}));return await fn();}finally{await lock.close();await unlink(file+'.lock');}
 }
 async function prepare(scope){
  validateScope(scope);const state=await load();
  required(!state.pending||state.pending.scopeHash===hash(scope),'Pending uncertain operation belongs to different scope; reconcile first');
  required(!state.milestone||state.milestone.key===scope.milestone.key,'Different active milestone; use a separate state file');
  const ms=await provider.listMilestones();const wanted=milestonePayload(scope);
  const found=state.milestone?[await provider.getMilestone(state.milestone.id)].filter(Boolean):ms.filter(m=>(m.description??'').includes(marker('milestone',scope.milestone.key)));
  required(found.length<=1,'Duplicate milestone identity requires reconciliation');const current=found[0];
  required(!state.milestone||current,'Mapped milestone missing remotely');
  required(!current||state.milestone||state.pending?.kind==='milestone','Remote marker is not binding authority; explicitly import/rebind existing milestone');
  required(current||state.pending?.kind!=='milestone','Pending uncertain milestone creation; recovery not visible yet, do not retry create');
  if(current){required(current.state==='open','Milestone is closed');required(!state.milestone||stamp(current)===state.milestone.fingerprint,'Milestone scope conflict: remote was edited');}
  const ops=[];if(!current)ops.push({kind:'create-milestone',key:scope.milestone.key});else if(current.title!==wanted.title||current.description!==wanted.description){
   required(!!state.milestone,'Recovered milestone content differs; import/reconcile before editing');ops.push({kind:'update-milestone',key:scope.milestone.key});
  }
  const remoteItems=await provider.listItems({});const rows=[];
  for(const f of scope.features){
   const mapping=state.items[f.key];const candidates=mapping?[await provider.getItem(mapping.id)].filter(Boolean):remoteItems.filter(i=>(i.body??'').includes(marker('item',`${scope.milestone.key}/${f.key}`)));
   required(candidates.length<=1,`Duplicate item identity: ${f.key}`);const item=candidates[0];
   required(!mapping||item,`Mapped issue missing: ${f.key}`);
   required(!item||mapping||(state.pending?.kind==='item'&&state.pending.key===f.key),'Remote marker is not binding authority; explicitly import/rebind existing issue');
   required(item||state.pending?.key!==f.key,`Pending uncertain issue creation: ${f.key}; reconcile, do not retry create`);
   if(item){required(!mapping||stamp(item)===mapping.fingerprint,`Issue scope conflict: ${item.id} was edited`);}
   const payload=itemPayload(f,current?.id??null,scope.milestone.key);
   if(!item)ops.push({kind:'create-item',key:f.key});else if(item.title!==payload.title||item.body!==payload.body||item.milestoneId!==payload.milestoneId){
    required(item.state==='open',`Issue ${item.id} is closed; scope edits require explicit reopen`);required(!!mapping,`Recovered issue ${item.id} differs; import/reconcile before editing`);ops.push({kind:'update-item',key:f.key});
   }
   rows.push({feature:f,item,payload});
  }
  const removed=Object.keys(state.items).filter(k=>!scope.features.some(f=>f.key===k));required(!removed.length,'Scope removal requires explicit reconciliation; issues were not deleted');
  return {state,current,wanted,rows,operations:ops};
 }
 async function plan(scope){const p=await prepare(scope);return {target,provider:providerKey,operations:p.operations};}
 async function apply(scope,{apply:authorized=false}={}){
  required(authorized,'Remote writes require explicit --apply authorization');return locked(async()=>{
   const p=await prepare(scope);let m=p.current;
   if(!m){p.state.pending={kind:'milestone',key:scope.milestone.key,scopeHash:hash(scope)};await save(p.state);m=await createSafely(p.state,()=>provider.createMilestone(p.wanted));}
   else if(p.operations.some(x=>x.kind==='update-milestone'))m=await provider.updateMilestone(m.id,p.wanted);
   p.state.milestone={key:scope.milestone.key,id:m.id,url:m.url,fingerprint:stamp(m)};if(p.state.pending?.kind==='milestone')delete p.state.pending;await save(p.state);
   for(const row of p.rows){let item=row.item;const payload=itemPayload(row.feature,m.id,scope.milestone.key);
    if(!item){p.state.pending={kind:'item',key:row.feature.key,scopeHash:hash(scope)};await save(p.state);item=await createSafely(p.state,()=>provider.createItem(payload));}
    else if(p.operations.some(x=>x.kind==='update-item'&&x.key===row.feature.key))item=await provider.updateItem(item.id,payload);
    p.state.items[row.feature.key]={id:item.id,url:item.url,fingerprint:stamp(item)};if(p.state.pending?.key===row.feature.key)delete p.state.pending;await save(p.state);
   }
   p.state.scope=scope;await save(p.state);return p.state;
  });
 }
 async function status(){
  const state=await load();required(state.milestone,'No linked milestone; apply or import scope first');
  const m=await provider.getMilestone(state.milestone.id);required(m,'Mapped milestone missing remotely');
  const items=[];for(const [key,link] of Object.entries(state.items)){
   const item=await provider.getItem(link.id);items.push({key,id:link.id,url:item?.url,state:item?.state??'missing',scopeChanged:!item||stamp(item)!==link.fingerprint});
  }
  return {target,provider:providerKey,milestone:{id:m.id,url:m.url,state:m.state,scopeChanged:stamp(m)!==state.milestone.fingerprint},items};
 }
 async function check(){
  const s=await status();required(!s.milestone.scopeChanged&&!s.items.some(i=>i.scopeChanged),'Tracker scope conflict; review changes and explicitly re-import/replan');return s;
 }
 async function importMilestone(id){return locked(async()=>{
  const m=await provider.getMilestone(id);required(m,'Milestone not found');const remote=await provider.listItems({milestoneId:id});
  const key=(m.description??'').match(/<!-- project-tracking:milestone:([^ ]+) -->/)?.[1]??`milestone-${hash(id).slice(0,12)}`;
  required(validKey(key),'Invalid imported milestone key');
  const scope={milestone:{key,title:m.title,description:withoutMarkers(m.description)},features:[]};const state={schema:1,...identity,milestone:{key,id:m.id,url:m.url,fingerprint:stamp(m)},items:{}};
  for(const item of remote){
   const key=(item.body??'').match(/<!-- project-tracking:item:([^ ]+) -->/)?.[1]?.split('/').at(-1)??`item-${hash(item.id).slice(0,12)}`;
   required(validKey(key)&&!Object.hasOwn(state.items,key),'Invalid or duplicate imported item key');const body=withoutMarkers(item.body);const split=body.split('\n\n## Acceptance criteria\n');
   const criteria=(split[1]??'').split('\n').filter(x=>/^- \[[ xX]\] /.test(x)).map(x=>x.slice(6));
   scope.features.push({key,title:item.title,description:split[0],acceptanceCriteria:criteria});state.items[key]={id:item.id,url:item.url,fingerprint:stamp(item)};
  }
  const previous=await load();if(previous.milestone?.id===id&&previous.events)state.events=previous.events;
  state.scope=scope;await save(state);return {scope,state};
 });}
 async function resolveItem(id){
  const state=await load();const entry=Object.entries(state.items).find(([,v])=>v.id===id);required(entry,'Issue is not linked in this project');
  const snapshot=await check();required(snapshot.milestone.state==='open','Milestone is closed');
  const item=await provider.getItem(id);required(item?.state==='open','Issue is closed');const feature=state.scope?.features.find(f=>f.key===entry[0]);
  required(feature?.description?.trim()&&feature.acceptanceCriteria?.length,'Task content or acceptance criteria missing; do not fall back to stale plan');
  return {description:feature.description,acceptance_criteria:feature.acceptanceCriteria,done:'Acceptance criteria verified; PR reviewed under repository policy. Do not close this issue automatically.'};
 }
 async function event(id,evidence,{apply:authorized=false}={}){
  required(authorized,'Remote writes require explicit --apply authorization');
  required(['in_progress','blocked','verified','in_review'].includes(evidence?.status),'Invalid evidence status');
  required(typeof evidence.summary==='string'&&evidence.summary.trim(),'Evidence summary required');
  required(Array.isArray(evidence.references)&&evidence.references.every(x=>typeof x==='string'&&x.trim()),'Evidence references must be strings');
  required(!['verified','in_review'].includes(evidence.status)||evidence.references.length,'Verification/review requires evidence references');
  return locked(async()=>{
   const s=await check();required(s.items.some(i=>i.id===id),'Issue is not linked');
   const state=await load();state.events??={};const eventKey=hash(id);let record=state.events[eventKey];
   const mark=record?.marker??marker('event',randomUUID());
   const body=`${mark}\n## Reported engineering progress\n\nStatus: ${evidence.status}\n\n${evidence.summary}\n\nEvidence references (reported, not independently verified by this adapter):\n${evidence.references.map(x=>'- '+x).join('\n')}`;
   let current;
   if(record?.id){current=await provider.getComment(record.id);required(hash(current.body)===record.bodyHash,'Reported comment was edited remotely; reconcile before updating');}
   else if(record){
    const matches=(await provider.listComments(id)).filter(c=>c.body.includes(mark));required(matches.length===1&&hash(matches[0].body)===record.bodyHash,'Pending uncertain comment creation; reconcile before retry');current=matches[0];
   }
   if(!current){state.events[eventKey]={marker:mark,bodyHash:hash(body)};await save(state);current=await createSafely(state,()=>provider.createComment(id,body),eventKey);}
   else if(current.body!==body)current=await provider.updateComment(current.id,body);
   state.events[eventKey]={marker:mark,id:current.id,bodyHash:hash(current.body)};await save(state);return current;
  });
 }
 async function closeMilestone({apply:authorized=false}={}){
  required(authorized,'Remote writes require explicit --apply authorization');return locked(async()=>{
   const s=await check();const all=await provider.listItems({milestoneId:s.milestone.id});required(s.items.every(i=>i.state==='closed')&&all.every(i=>i.state==='closed'),'Milestone still has open work items');
   if(s.milestone.state==='closed')return s.milestone;
   return provider.updateMilestone(s.milestone.id,{state:'closed'});
  });
 }
 return {plan,apply,status,check,importMilestone,resolveItem,event,closeMilestone};
}
