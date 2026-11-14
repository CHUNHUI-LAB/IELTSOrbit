'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),bytes=x=>JSON.stringify(x,null,2)+'\n';
const raw=fs.readFileSync(require.resolve('./fixtures/listening-word-limit.json'),'utf8');
assert.equal(hash(raw),'6b256a534d46342f47869ea4a300f35372840e1cc8b4a542c4ea40d770dd4cfb');
const fixture=JSON.parse(raw);
const stage=Object.freeze({beforeSha256:'c3f44894183ee8d6071031ef8742c7d594cea69b05915406ceae75cea7ea2ac4',afterSha256:'3901d4a21f4b594acfd000f3a67983796cb5996b8407d676e5458581f383efaa',baseCommit:'f1218e94c5964afdfa3e9938dd020ed2d0061d70'});
function cross(c,from,to,oldResource,newResource){assert.equal(hash(bytes(c)),from);const out=structuredClone(c);const matches=out.resources.filter(x=>x.id==='official-samples');assert.equal(matches.length,1);assert.deepEqual(matches[0],oldResource);out.resources[out.resources.findIndex(x=>x.id==='official-samples')]=structuredClone(newResource);assert.equal(hash(bytes(out)),to);return out;}
function undo(c){return cross(c,stage.afterSha256,stage.beforeSha256,fixture.afterResource,fixture.beforeResource);}
function replay(c){return cross(c,stage.beforeSha256,stage.afterSha256,fixture.beforeResource,fixture.afterResource);}
function verifyChain(c){const prior=undo(c);const old=require('./listening-supplement-history.js').verifyListeningSupplementStage(prior);require('./policy-history.js').verifyPaperTrfPolicyStage(old);return prior;}
module.exports={stage,undo,replay,verifyChain};

// Only the reviewed suffix is projected. Unrelated mutations remain observable.
function beforeWordLimitResources(resources){return resources.map(r=>{
 if(r.id!=='official-samples')return r;
 const method=fixture.afterResource.actionableMethods.at(-1),suffix=fixture.afterResource.curatorInterpretation.slice(fixture.beforeResource.curatorInterpretation.length),links=fixture.afterResource.relatedSources;
 const present=r.actionableMethods?.includes(method)||r.curatorInterpretation?.includes(suffix)||r.relatedSources?.some(x=>links.some(y=>x.url===y.url));
 if(!present)return r;
 assert.equal(r.actionableMethods?.at(-1),method);assert.ok(r.curatorInterpretation?.endsWith(suffix));assert.deepEqual(r.relatedSources,links);
 const out={...r,actionableMethods:r.actionableMethods.slice(0,-1),curatorInterpretation:r.curatorInterpretation.slice(0,-suffix.length)};delete out.relatedSources;return out;
});}
function beforeWordLimitCatalog(c){return {...c,resources:beforeWordLimitResources(c.resources)};}
Object.assign(module.exports,{beforeWordLimitResources,beforeWordLimitCatalog});
