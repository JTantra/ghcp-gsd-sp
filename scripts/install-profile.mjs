import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {resolve,join,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const start='<!-- azure-profile:begin -->',end='<!-- azure-profile:end -->';
const section=`${start}\n## Azure engineering profile\nFor Azure work, read skills/azure-engineering/SKILL.md and profiles/azure/engineering-standards.md before planning or code changes. Use Microsoft Learn and the configured read-only Azure guidance MCP; report unavailable tools rather than silently skipping required guidance. Apply profiles/azure/review-checklist.md with real evidence. Azure is the preferred cloud for an agreed Azure workload, not permission to migrate unrelated applications. No cloud writes, auth changes or secret reads are authorized by installing this profile.\n${end}`;
const jsonText=x=>JSON.stringify(x,null,2)+'\n';
async function optional(path,fallback){try{return await readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
function mergeBlock(text){const a=text.indexOf(start),b=text.indexOf(end);if((a<0)!==(b<0)||b<a||text.indexOf(start,a+start.length)>=0)throw new Error('Malformed/duplicate Azure profile marker');return a<0?text.trimEnd()+'\n\n'+section+'\n':text.slice(0,a)+section+text.slice(b+end.length);}
export async function installProfile(root,{framework,check=false}={}){
 root=resolve(root);if(!['gsd','speckit'].includes(framework))throw new Error('Explicit framework must be gsd or speckit');
 const manifest=JSON.parse(await readFile(join(source,'profiles/azure/profile.json'),'utf8'));
 const servers=JSON.parse(await readFile(join(source,'profiles/azure/mcp/servers.template.json'),'utf8'));
 const updates=new Map();
 const queue=async(rel,text)=>{const old=await optional(join(root,rel),'');if(check&&old!==text)throw new Error('Missing/changed Azure profile wiring: '+rel);if(!check&&old!==text)updates.set(rel,text);};
 for(const rel of ['profiles/azure/profile.json','profiles/azure/engineering-standards.md','profiles/azure/review-checklist.md','profiles/azure/mcp/servers.template.json','skills/azure-engineering/SKILL.md'])await queue(rel,await readFile(join(source,rel),'utf8'));
 for(const [rel,key] of [['.mcp.json','mcpServers'],['.github/mcp.json','mcpServers'],['.vscode/mcp.json','servers']]){
  const d=JSON.parse(await optional(join(root,rel),'{}'));
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('MCP configuration root must be an object: '+rel);
  if(d[key]===undefined)d[key]={};
  if(!d[key]||typeof d[key]!=='object'||Array.isArray(d[key]))throw new Error('Invalid MCP configuration');
  for(const [name,value] of Object.entries(servers)){
   if(d[key][name]&&!isDeepStrictEqual(d[key][name],value))throw new Error('Conflicting existing MCP server: '+name+' in '+rel+'; review manually');
   d[key][name]=value;
  }await queue(rel,jsonText(d));
 }
 for(const rel of ['AGENTS.md','.github/copilot-instructions.md']){const old=await optional(join(root,rel),'');await queue(rel,mergeBlock(old));}
 await queue('.github/skills/azure-engineering/SKILL.md',await readFile(join(source,'skills/azure-engineering/SKILL.md'),'utf8'));
 await queue('profiles/active.json',jsonText({schema:1,profiles:['azure'],framework}));
 if(framework==='gsd'){
  const rel='.planning/config.json',cfg=JSON.parse(await readFile(join(root,rel),'utf8'));
  if(!cfg||typeof cfg!=='object'||Array.isArray(cfg))throw new Error('GSD config root must be an object');
  if(cfg.agent_skills===undefined)cfg.agent_skills={};
  if(!cfg.agent_skills||typeof cfg.agent_skills!=='object'||Array.isArray(cfg.agent_skills))throw new Error('GSD skill config must be an object');
  for(const role of manifest.gsdRoles){
   const path='.github/agents/'+role+'.agent.md',body=await optional(join(root,path),null);if(body===null)continue;
   const arr=cfg.agent_skills[role]??[];if(!Array.isArray(arr))throw new Error('Invalid skill mapping: '+role);
   cfg.agent_skills[role]=[...new Set([...arr,manifest.skill])];
   const fence=body.indexOf('\n---',4);if(!body.startsWith('---\n')||fence<0)throw new Error('Invalid agent frontmatter: '+role);
   const front=body.slice(0,fence);const match=front.match(/^tools:\s*(\[[^\n]*\])/m);if(!match)throw new Error('Explicit flow-style tools required: '+role);
   const tools=JSON.parse(match[1].replaceAll("'",'"'));if(!Array.isArray(tools)||tools.some(x=>typeof x!=='string'))throw new Error('Invalid agent tools');
   const replacement='tools: '+JSON.stringify([...new Set([...tools,'mslearn/*','azure/*'])]);
   await queue(path,front.replace(match[0],replacement)+body.slice(fence));
  }await queue(rel,jsonText(cfg));
 }
 // All target files are parsed and conflicts checked before any write. No networking or authentication.
 for(const [rel,text] of updates){const path=join(root,rel);await mkdir(dirname(path),{recursive:true});await writeFile(path,text);}
 return {profile:'azure',framework,check,changed:updates.size,cloudWrites:false};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const args=process.argv.slice(2);let framework,check=false;while(args.length){const a=args.shift();if(a==='--framework')framework=args.shift();else if(a==='--check')check=true;else throw new Error('Unknown option: '+a);}console.log(JSON.stringify(await installProfile(process.cwd(),{framework,check})));}catch(e){console.error(e.message);process.exitCode=1;}
}
