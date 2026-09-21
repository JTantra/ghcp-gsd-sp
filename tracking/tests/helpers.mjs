import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const module = await import('../lib/engine.mjs').catch(() => ({}));
export class MemoryProvider {
  constructor(){this.milestones=[];this.items=[];this.comments=[];this.writes=0;}
  async listMilestones(){return structuredClone(this.milestones);}
  async getMilestone(id){return structuredClone(this.milestones.find(x=>x.id===id));}
  async createMilestone(v){this.writes++;const x={...v,id:`release-${this.milestones.length+1}`,state:'open',url:'https://tracker.test/releases/1'};this.milestones.push(x);return structuredClone(x);}
  async updateMilestone(id,v){this.writes++;Object.assign(this.milestones.find(x=>x.id===id),v);return this.getMilestone(id);}
  async listItems({milestoneId}={}){return structuredClone(this.items.filter(x=>!milestoneId||x.milestoneId===milestoneId));}
  async getItem(id){return structuredClone(this.items.find(x=>x.id===id));}
  async createItem(v){this.writes++;const x={...v,id:`ACME-${this.items.length+1}`,state:'open',url:'https://tracker.test/items/1'};this.items.push(x);return structuredClone(x);}
  async updateItem(id,v){this.writes++;Object.assign(this.items.find(x=>x.id===id),v);return this.getItem(id);}
  async getComment(id){return structuredClone(this.comments.find(c=>c.id===id));}
  async listComments(id){return structuredClone(this.comments.filter(x=>x.itemId===id));}
  async createComment(id,body){this.writes++;const x={id:String(this.comments.length+1),itemId:id,body};this.comments.push(x);return structuredClone(x);}
  async updateComment(id,body){this.writes++;const x=this.comments.find(x=>x.id===id);x.body=body;return structuredClone(x);}
}
export const scope={milestone:{key:'pilot',title:'Pilot'},features:[{key:'persist',title:'Save requests',description:'Persist requests across restarts',acceptanceCriteria:['Saved request survives restart']}]};
export async function setup(){const dir=await mkdtemp(join(tmpdir(),'tracker-test-'));const provider=new MemoryProvider();return {dir,provider,engine:module.createEngine?.({provider,target:'team/project',providerKey:'memory',statePath:join(dir,'state.json')}),cleanup:()=>rm(dir,{recursive:true,force:true})};}
