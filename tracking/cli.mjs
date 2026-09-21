#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {resolve,dirname,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEngine} from './lib/engine.mjs';
import {createProvider as github} from './providers/github.mjs';

const commands=['doctor','plan','apply','import','status','check','event','resolve','close-milestone'];
function parse(args){
 const command=args.shift();if(!commands.includes(command))throw new Error('Command required: '+commands.join(', '));
 const flags={};while(args.length){const flag=args.shift();if(!['--config','--scope','--issue','--milestone','--evidence','--apply'].includes(flag)||flag in flags)throw new Error('Unknown or duplicate option');if(flag==='--apply')flags[flag]=true;else{const value=args.shift();if(!value||value.startsWith('--'))throw new Error('Option requires a value');flags[flag]=value;}}
 if(!flags['--config'])throw new Error('Explicit --config path required');
 if(['apply','event','close-milestone'].includes(command)&&!flags['--apply'])throw new Error('Remote mutation requires explicit --apply');
 for(const [cmd,flag] of [['plan','--scope'],['apply','--scope'],['import','--milestone'],['event','--issue'],['event','--evidence'],['resolve','--issue']])if(cmd===command&&!flags[flag])throw new Error(`${cmd} requires ${flag}`);
 return {command,flags};
}
async function json(path){return JSON.parse(await readFile(path,'utf8'));}
try{
 const {command,flags:f}=parse(process.argv.slice(2));const configPath=resolve(f['--config']);const config=await json(configPath);
 if(config.enabled===false)throw new Error('Project tracking disabled');
 if(config.token||config.password||config.apiKey)throw new Error('Credentials must not be stored in configuration');
 if(typeof config.provider!=='string'||!config.provider)throw new Error('Explicit provider required');
 let provider;
 if(config.provider==='github')provider=github(config);
 else{
  if(!config.providerModule||isAbsolute(config.providerModule)||!config.providerModule.startsWith('./'))throw new Error('Custom provider requires explicit trusted ./providerModule relative to config');
  const path=resolve(dirname(configPath),config.providerModule);const factory=(await import(pathToFileURL(path).href)).createProvider;
  if(typeof factory!=='function')throw new Error('Provider module must export createProvider(config)');provider=await factory(config);
 }
 const target=config.target??config.repository;
 const engine=createEngine({provider,target,providerKey:config.provider,statePath:resolve(dirname(configPath),config.stateFile??'tracking-state.json')});
 let result;
 switch(command){
  case 'doctor':if(!provider.doctor)throw new Error('Provider does not support doctor');result=await provider.doctor();break;
  case 'plan':result=await engine.plan(await json(f['--scope']));break;
  case 'apply':result=await engine.apply(await json(f['--scope']),{apply:true});break;
  case 'import':result=await engine.importMilestone(f['--milestone']);break;
  case 'status':result=await engine.status();break;
  case 'check':result=await engine.check();break;
  case 'resolve':result=await engine.resolveItem(f['--issue']);break;
  case 'event':result=await engine.event(f['--issue'],await json(f['--evidence']),{apply:true});break;
  case 'close-milestone':result=await engine.closeMilestone({apply:true});break;
 }
 console.log(JSON.stringify(result,null,2));
}catch(error){
 let message=String(error.message);for(const [name,value] of Object.entries(process.env))if(/TOKEN|SECRET|PASSWORD|KEY/.test(name)&&value&&value.length>=8)message=message.split(value).join('[REDACTED]');
 console.error(JSON.stringify({error:message}));process.exitCode=1;
}
