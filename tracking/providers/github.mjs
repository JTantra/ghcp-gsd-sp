import { spawn } from 'node:child_process';

async function credential(config){
 const value=process.env[config.tokenEnv??'GITHUB_TOKEN']||process.env.GH_TOKEN;if(value)return value;
 return new Promise((resolve,reject)=>{
  const p=spawn('git',['credential','fill'],{stdio:['pipe','pipe','ignore'],env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
  let output='';const timer=setTimeout(()=>{p.kill();reject(new Error('GitHub credential helper timed out'));},15000);
  p.stdout.on('data',x=>{output+=x;if(output.length>65536){p.kill();}});
  p.on('error',()=>{clearTimeout(timer);reject(new Error('GitHub authentication unavailable; set token environment variable'));});
  p.on('close',code=>{clearTimeout(timer);const secret=output.split('\n').find(x=>x.startsWith('password='))?.slice(9).trim();if(code!==0||!secret)reject(new Error('GitHub authentication required; set token environment variable or sign into Git credential helper'));else resolve(secret);});
  p.stdin.end('protocol=https\nhost=github.com\n\n');
 });
}
const milestone=x=>({id:String(x.number),title:x.title,description:x.description??'',state:x.state,url:x.html_url});
const item=x=>({id:String(x.number),title:x.title,body:x.body??'',state:x.state,milestoneId:x.milestone?String(x.milestone.number):null,url:x.html_url});
const comment=x=>({id:String(x.id),body:x.body??'',url:x.html_url});
const id=x=>{if(!/^[1-9]\d*$/.test(String(x)))throw new Error('Invalid GitHub object id');return String(x);};
export function createProvider(config,options={}){
 if(!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(config.repository??'')||config.repository.split('/').some(x=>x==='.'||x==='..'))throw new Error('Explicit owner/repository required');
 const base=`https://api.github.com/repos/${config.repository}`;const transport=options.fetch??fetch;let cachedToken=options.token;
 async function request(path,method='GET',data){
  const url=path.startsWith('https:')?path:base+path;const u=new URL(url);
  if(u.origin!=='https://api.github.com'||!u.pathname.startsWith(`/repos/${config.repository}/`))throw new Error('Unsafe GitHub pagination target');
  cachedToken??=await credential(config);
  let response;try{response=await transport(url,{method,headers:{Authorization:`Bearer ${cachedToken}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ghcp-gsd-sp-tracking'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(20000),redirect:'error'});}
  catch{throw new Error(`GitHub ${method} request failed or timed out; outcome may be unknown, reconcile before retrying writes`);}
  if(!response.ok)throw Object.assign(new Error(`GitHub HTTP ${response.status} during ${method}; check authorization, rate limits and target; response omitted to protect secrets`),{definiteFailure:[400,401,403,404,405,410,422].includes(response.status)});
  let json;try{json=await response.json();}catch{throw new Error('GitHub returned invalid JSON; reconcile write outcome before retrying');}
  return {json,next:response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1]};
 }
 async function list(path){
  let next=path;const rows=[];const seen=new Set();const original=new URL(base+path);
  while(next){
   if(seen.has(next)||seen.size>=100)throw new Error('GitHub pagination limit or loop');seen.add(next);
   const result=await request(next);if(!Array.isArray(result.json))throw new Error('Invalid GitHub collection');rows.push(...result.json);next=null;
   if(result.next){
    const link=new URL(result.next);const page=link.searchParams.get('page');
    if(link.origin!==original.origin||!page||!/^[1-9]\d*$/.test(page))throw new Error('Unsafe GitHub pagination target');
    // Only take the validated page number; never follow a remotely supplied resource path or filters.
    const bound=new URL(original);bound.searchParams.set('page',page);next=bound.href;
   }
  }return rows;
 }
 const body=(v)=>({...('title'in v?{title:v.title}:{}),...('body'in v?{body:v.body}:{}),...('milestoneId'in v?{milestone:v.milestoneId===null?null:Number(id(v.milestoneId))}:{})});
 return {
  capabilities:{milestones:true,items:true,comments:true},
  async doctor(){const r=await request('/milestones?state=all&per_page=1');return {provider:'github',target:config.repository,readable:Array.isArray(r.json),writeAccess:'not proven by read probe'};},
  async listMilestones(){return (await list('/milestones?state=all&per_page=100')).map(milestone);},
  async getMilestone(n){return milestone((await request(`/milestones/${id(n)}`)).json);},
  async createMilestone(v){return milestone((await request('/milestones','POST',v)).json);},
  async updateMilestone(n,v){return milestone((await request(`/milestones/${id(n)}`,'PATCH',v)).json);},
  async listItems({milestoneId}={}){return (await list('/issues?state=all&per_page=100'+(milestoneId?'&milestone='+id(milestoneId):''))).filter(x=>!x.pull_request).map(item);},
  async getItem(n){const x=(await request(`/issues/${id(n)}`)).json;if(x.pull_request)throw new Error('Expected issue, received pull request');return item(x);},
  async createItem(v){return item((await request('/issues','POST',body(v))).json);},
  async updateItem(n,v){return item((await request(`/issues/${id(n)}`,'PATCH',body(v))).json);},
  async getComment(n){return comment((await request(`/issues/comments/${id(n)}`)).json);},
  async listComments(n){return (await list(`/issues/${id(n)}/comments?per_page=100`)).map(comment);},
  async createComment(n,text){return comment((await request(`/issues/${id(n)}/comments`,'POST',{body:text})).json);},
  async updateComment(n,text){return comment((await request(`/issues/comments/${id(n)}`,'PATCH',{body:text})).json);}
 };
}
