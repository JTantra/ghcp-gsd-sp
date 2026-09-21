import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('optional native capability matches the vendored GSD manifest and loop-role contract',async()=>{
 const validator=require('../.github/gsd-core/bin/lib/capability-validator.cjs');
 const cap=JSON.parse(await readFile(new URL('../.gsd/capabilities/project-tracking/capability.json',import.meta.url),'utf8'));
 assert.deepEqual(validator.validateCapability(cap,'project-tracking'),[]);
 assert.deepEqual(validator.validateAgainstContract(cap,'project-tracking'),[]);
});
