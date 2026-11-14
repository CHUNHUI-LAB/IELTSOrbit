'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {undo,replay,verifyChain,beforeWordLimitCatalog}=require('./listening-word-limit-history.js');
const current=JSON.parse(fs.readFileSync(require.resolve('../data/catalog.json'),'utf8')),serialize=x=>JSON.stringify(x,null,2)+'\n';
const original=serialize(current),prior=verifyChain(current);assert.equal(serialize(replay(prior)),original);assert.equal(serialize(beforeWordLimitCatalog(current)),serialize(prior));assert.equal(serialize(current),original);assert.equal(Object.hasOwn(prior.resources.find(x=>x.id==='official-samples'),'relatedSources'),false);
assert.throws(()=>undo(prior));assert.throws(()=>replay(current));
let mutations=0;function paths(x,p=[]){if(x&&typeof x==='object')return Object.keys(x).flatMap(k=>paths(x[k],[...p,k]));return [p];}
for(const p of paths(current)){const c=structuredClone(current);let o=c;for(const k of p.slice(0,-1))o=o[k];o[p.at(-1)]=typeof o[p.at(-1)]==='string'?o[p.at(-1)]+' mutation':o[p.at(-1)]===null?'mutation':null;assert.throws(()=>verifyChain(c));mutations++;}
const extra=structuredClone(current);extra.unreviewed=true;assert.throws(()=>verifyChain(extra));
const target=c=>c.resources.find(x=>x.id==='official-samples');
const changed=structuredClone(current);target(changed).title+=' old field mutation';assert.equal(target(beforeWordLimitCatalog(changed)).title,target(changed).title);assert.throws(()=>verifyChain(changed));
assert.equal(target(current).checkedAt,target(prior).checkedAt);assert.deepEqual(target(current).actionableMethods.slice(0,-1),target(prior).actionableMethods);
console.log('PASS: new exact history stage, replay, immutable inputs, missing-field restoration and '+mutations+' scalar mutations rejected');
