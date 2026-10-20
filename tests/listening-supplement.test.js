'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {sha256,catalogBytes,paperTrfStage,verifyPaperTrfPolicyStage}=require('./policy-history.js');
const {listeningSupplementStage:stage,reviewedSupplement,beforeListeningSupplementCatalog:prior,
  verifyListeningSupplementStage:verify,replayListeningSupplement:replay}=require('./listening-supplement-history.js');
const bytes=fs.readFileSync(require.resolve('../data/catalog.json'),'utf8'),current=JSON.parse(bytes);
const baseline=verify(current),append=reviewedSupplement();
const find=catalog=>catalog.resources.find(resource=>resource.id==='bc-mocks');
const bc=find(current),old=find(baseline);
assert.equal(bytes,catalogBytes(current),'actual current file preserves canonical bytes');
assert.equal(sha256(bytes),stage.afterCatalogSha256);
assert.equal(stage.beforeCatalogSha256,paperTrfStage.afterCatalogSha256,'new resource stage follows, not rewrites, the prior policy stage');
verifyPaperTrfPolicyStage(baseline);
assert.equal(catalogBytes(replay(baseline,append)),bytes,'forward replay reconstructs the exact release');
assert.equal(catalogBytes(prior(baseline)),catalogBytes(baseline),'inverse is stable on already-historical input');
assert.equal(catalogBytes(current),bytes,'inverse and replay do not mutate their inputs');
assert.deepEqual(Object.keys(bc),Object.keys(old),'no schema or per-resource field changes');
assert.deepEqual(Object.keys(current),Object.keys(baseline),'no top-level schema change');
for(const key of Object.keys(current).filter(key=>key!=='resources'))assert.deepEqual(current[key],baseline[key],key+' remains exact');
for(let index=0;index<current.resources.length;index++){
  if(current.resources[index].id!=='bc-mocks')assert.deepEqual(current.resources[index],baseline.resources[index]);
}
for(const key of Object.keys(old).filter(key=>!['actionableMethods','relatedSources','curatorInterpretation'].includes(key)))assert.deepEqual(bc[key],old[key],key+' remains exact');
assert.deepEqual(bc.actionableMethods.slice(0,-1),old.actionableMethods);
assert.deepEqual(bc.relatedSources.slice(0,-2),old.relatedSources);
assert.equal(bc.curatorInterpretation,old.curatorInterpretation+append.curatorInterpretationSuffix);
assert.equal(current.schemaVersion,1);assert.equal(current.resources.length,51);
assert.equal(current.resources.filter(r=>r.sourceType==='experience').length,34);
assert.equal(current.resources.filter(r=>r.recommendedByDefault!==false).length,22);
assert.equal(current.resources.filter(r=>r.sourceType==='experience'&&r.recommendedByDefault!==false).length,6);
assert.deepEqual(current.resources.map(r=>[r.id,r.provider]),baseline.resources.map(r=>[r.id,r.provider]));
assert.equal(bc.checkedAt,'2026-10-01');assert.equal(bc.actionableMethods.length,6);assert.equal(bc.relatedSources.length,3);
assert.ok(bc.actionableMethods.at(-1).includes('B1+')&&bc.actionableMethods.at(-1).includes('带支架练习')&&bc.actionableMethods.at(-1).includes('不作陌生题诊断'));
for(const boundary of ['未播放录音','不映射雅思分数','不从下载路径推断','不复制题目、答案或文字稿','不保证提分','不作为当前中国大陆考试规则'])assert.ok(append.curatorInterpretationSuffix.includes(boundary));
const auditBytes=fs.readFileSync(require.resolve('../data/maintenance-2026-10-20.json'),'utf8');
assert.equal(sha256(auditBytes),'16a9cffbdcd7ba26f0945b7b69d5fc9b083324d2bf5d0cb651d1bbc5395567cd','source evidence and limitations are pinned independently of history projection');
const audit=JSON.parse(auditBytes);
assert.equal(audit.baseCommit,stage.baseCommit);assert.equal(audit.checkedAt,stage.reviewedAt);
for(const [key,value] of Object.entries(audit.historyStage))assert.deepEqual(value,stage[key]);
assert.deepEqual(audit.updatedResourceIds,['bc-mocks']);assert.deepEqual(audit.newResourceIds,[]);
assert.deepEqual(audit.sources.map(source=>source.url),append.relatedSources.map(source=>source.url));
assert.equal(audit.sources[0].pageCount,11);
for(const source of audit.sources){assert.equal(source.type,'official');assert.equal(source.retrievalStatus,'body_read');assert.equal(source.publishedAt,null);assert.equal(source.updatedAt,null);assert.ok(source.limitations.length);}
assert.ok(audit.sources[0].findings.some(text=>text.includes('Worksheet 2')&&text.includes('陌生题诊断')));
assert.ok(audit.sources[1].limitations.some(text=>text.includes('未成功')&&text.includes('未播放')));

let rejected=0;
function rejectMutation(label,mutate){const changed=structuredClone(current);mutate(changed);assert.throws(()=>verify(changed),undefined,label);rejected++;}
// All old fields, not just resource counts or dates, remain protected.
for(let index=0;index<current.resources.length;index++)for(const key of Object.keys(current.resources[index]))rejectMutation('resource '+index+'.'+key,c=>c.resources[index][key]='unreviewed');
for(const key of Object.keys(current).filter(key=>key!=='resources'))rejectMutation('catalog '+key,c=>c[key]={unreviewed:true});
for(let index=0;index<current.policies.length;index++)for(const key of Object.keys(current.policies[index]))rejectMutation('policy '+index+'.'+key,c=>c.policies[index][key]='unreviewed');
for(const [label,mutate] of [
 ['missing entire supplement',c=>c.resources[c.resources.findIndex(r=>r.id==='bc-mocks')]=structuredClone(old)],
 ['missing method',c=>find(c).actionableMethods.pop()],
 ['missing source',c=>find(c).relatedSources.pop()],
 ['missing note',c=>find(c).curatorInterpretation=old.curatorInterpretation],
 ['duplicate supplement',c=>find(c).actionableMethods.push(append.actionableMethods[0])],
 ['reordered sources',c=>find(c).relatedSources.reverse()],
 ['extra source',c=>find(c).relatedSources.push({title:'unreviewed',url:'https://example.org/'})],
 ['extra resource',c=>c.resources.push({id:'unreviewed'})],
 ['duplicate provider card',c=>c.resources.push(structuredClone(bc))],
 ['reordered resources',c=>c.resources.reverse()],
 ['new top-level field',c=>c.unreviewed=true],
 ['invented exam date',c=>c.calendar.dates.push('2026-10-21')],
 ['invented publication date',c=>find(c).publishedAt='2026-06-01']
])rejectMutation(label,mutate);
for(const key of Object.keys(append)){const forged=structuredClone(append);forged[key]='forged';assert.throws(()=>replay(baseline,forged),undefined,'forged append '+key);}
const alteredPrior=structuredClone(baseline);alteredPrior.resources[0].summary+=' changed';assert.throws(()=>replay(alteredPrior,append));
// Projections may remove only the reviewed suffixes; mutations outside them
// must survive even when no full stage verifier is called by an old test.
for(const mutate of [c=>find(c).actionableMethods[0]+=' changed',c=>find(c).relatedSources[0].title+=' changed',c=>find(c).curatorInterpretation='changed '+find(c).curatorInterpretation,c=>find(c).checkedAt='2099-01-01',c=>c.resources[0].summary+=' changed',c=>c.policies[0].text+=' changed',c=>c.unreviewed=true]){
 const changed=structuredClone(current);mutate(changed);assert.notEqual(sha256(catalogBytes(prior(changed))),stage.beforeCatalogSha256);
}
console.log(`PASS: exact new resource stage and old policy-stage replay, unchanged 51/34/22/6 identities/counts, source/audio/date limits, ${rejected} rejected catalog mutations and forged/inverse controls.`);

// The actual production reader must expose the added content and safe links,
// without new persistence, lost favourites, duplicate readers or broken return.
const harnessFile=require.resolve('./interactions.test.js');
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0]+'\nglobalThis.makeHarness=harness;',scope);
(async()=>{
 const persisted=JSON.stringify({saved:['bc-mocks'],path:null});
 for(const skill of ['listening','reading','writing','speaking']){
  const h=scope.makeHarness({hash:'#library/'+skill,rawState:persisted});await h.flush();
  for(let cycle=0;cycle<2;cycle++){
   h.hash('#library/'+skill+'/resource/bc-mocks');const card=h.doc.getElementById('resource-bc-mocks');
   assert.equal(card.dataset.expanded,'true');assert.equal(card.querySelectorAll('.reader-back').length,1);
   assert.equal(card.querySelector('.reader-back').href,'#library/'+skill);
   assert.ok(h.text(card).includes(append.actionableMethods[0]));assert.ok(h.text(card).includes(append.curatorInterpretationSuffix.trim()));
   for(const source of bc.relatedSources){const links=card.querySelectorAll('a').filter(link=>link.href===source.url);assert.equal(links.length,1);assert.equal(links[0].target,'_blank');assert.equal(links[0].rel,'noopener noreferrer');}
   h.hash('#library/'+skill);assert.equal(h.nodes['panel-library'].dataset.view,'overview');
  }
  assert.equal(h.saved.get('ieltsorbit.local.v1'),persisted);
 }
 const blocked=scope.makeHarness({hash:'#library/listening/resource/bc-mocks',storageBlocked:true});await blocked.flush();
 assert.ok(blocked.text(blocked.doc.getElementById('resource-bc-mocks')).includes(append.actionableMethods[0]));assert.equal(blocked.storageWrites,0);
 assert.equal(catalogBytes(current),bytes);
 console.log('PASS: real bc-mocks readers across four skills, all three source links, repeated open/return, cold deep link and blocked-storage boundaries. DOM checks, not browser rendering.');
})().catch(error=>{console.error(error);process.exitCode=1;});
