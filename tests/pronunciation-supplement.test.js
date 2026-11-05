'use strict';
// Static test draft only. This file has NOT been executed in this maintenance.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {sha256,catalogBytes,verifyPaperTrfPolicyStage}=require('./policy-history.js');
const {listeningSupplementStage,verifyListeningSupplementStage}=require('./listening-supplement-history.js');
const {pronunciationSupplementStage:stage,reviewedPronunciationSupplement,
  beforePronunciationSupplementResources:priorResources,beforePronunciationSupplementCatalog:prior,
  verifyPronunciationSupplementStage:verify,replayPronunciationSupplement:replay}=require('./pronunciation-supplement-history.js');
const bytes=fs.readFileSync(require.resolve('../data/catalog.json'),'utf8'),current=JSON.parse(bytes);
assert.equal(bytes,catalogBytes(current),'actual file, not a projected copy, must be canonical');
const baseline=verify(current),append=reviewedPronunciationSupplement();
const find=catalog=>catalog.resources.find(resource=>resource.id===stage.resourceId);
const updated=find(current),old=find(baseline);
assert.equal(sha256(bytes),stage.afterCatalogSha256,'actual latest catalog is independently pinned');
assert.equal(stage.beforeCatalogSha256,listeningSupplementStage.afterCatalogSha256,'new stage follows the exact immutable listening stage');
verifyPaperTrfPolicyStage(verifyListeningSupplementStage(baseline));
assert.equal(catalogBytes(replay(baseline,append)),bytes,'forward replay reconstructs all latest bytes');
assert.equal(catalogBytes(prior(baseline)),catalogBytes(baseline),'inverse is stable on historical input');
assert.equal(catalogBytes(current),bytes,'inverse and replay do not mutate their inputs');
assert.deepEqual(Object.keys(current),Object.keys(baseline),'top-level schema is unchanged');
assert.deepEqual(Object.keys(updated),[...Object.keys(old),'relatedSources','curatorInterpretation'],'only two known optional fields are new');
assert.ok(!Object.hasOwn(old,'relatedSources')&&!Object.hasOwn(old,'curatorInterpretation'),'inverse removes new keys rather than leaving empty values');
assert.deepEqual(updated.actionableMethods.slice(0,-1),old.actionableMethods,'all original methods and order remain exact');
assert.equal(updated.actionableMethods.length,4);
assert.deepEqual(updated.relatedSources,append.relatedSources);
assert.equal(updated.relatedSources.length,1);
assert.equal(updated.curatorInterpretation,append.curatorInterpretation);
for(const key of Object.keys(old).filter(key=>key!=='actionableMethods'))assert.deepEqual(updated[key],old[key],key+' remains unchanged');
for(const key of Object.keys(current).filter(key=>key!=='resources'))assert.deepEqual(current[key],baseline[key],key+' remains unchanged');
for(let index=0;index<current.resources.length;index++)if(current.resources[index].id!==stage.resourceId)assert.deepEqual(current.resources[index],baseline.resources[index]);
assert.deepEqual(current.resources.map(r=>[r.id,r.provider]),baseline.resources.map(r=>[r.id,r.provider]));
assert.equal(current.resources.length,51);
assert.equal(current.resources.filter(r=>r.sourceType==='experience').length,34);
assert.equal(current.resources.filter(r=>r.recommendedByDefault!==false).length,22);
assert.equal(current.resources.filter(r=>r.sourceType==='experience'&&r.recommendedByDefault!==false).length,6);
assert.equal(updated.checkedAt,'2026-10-01');assert.equal(updated.provenance.reviewedAt,'2026-10-01');
assert.ok(!Object.hasOwn(updated,'publishedAt'),'new-source date cannot become the old resource publication date');
assert.equal(updated.relatedSources[0].url,'https://takeielts.britishcouncil.org/blog/how-to-improve-english-pronunciation-ielts-speaking');
for(const boundary of ['Emma Walker','2nd January 2024','2024-06-05','发布日期未确认','未播放或核验外链音视频','本站迁移练习建议','不作估分或提分周期承诺','未注册、购买或提交录音'])assert.ok(updated.curatorInterpretation.includes(boundary));
assert.ok(updated.actionableMethods.at(-1).includes('本站建议')&&updated.actionableMethods.at(-1).includes('非来源已验证的效果'));
const auditBytes=fs.readFileSync(require.resolve('../data/maintenance-2026-11-05-pronunciation.json'),'utf8');
assert.equal(sha256(auditBytes),stage.auditSha256,'source evidence is pinned independently of the inverse');
const audit=JSON.parse(auditBytes),source=audit.sources[0];
assert.equal(audit.baseCommit,stage.baseCommit);assert.equal(audit.checkedAt,stage.reviewedAt);
assert.deepEqual(audit.updatedResourceIds,[stage.resourceId]);assert.deepEqual(audit.newResourceIds,[]);
assert.equal(audit.sources.length,1);assert.equal(source.url,updated.relatedSources[0].url);
assert.equal(source.type,'official');assert.equal(source.retrievalStatus,'body_read');
assert.equal(source.publishedAt,null);assert.equal(source.updatedAt,'2024-01-02');assert.equal(source.author,'Emma Walker');
assert.ok(source.dateEvidence.includes('2024-06-05'));
assert.ok(source.limitations.some(text=>text.includes('未播放')&&text.includes('音视频')));
assert.ok(source.limitations.some(text=>text.includes('本站建议')&&text.includes('不是文章验证')));

let rejected=0;
function rejectMutation(label,mutate){const changed=structuredClone(current);mutate(changed);assert.throws(()=>verify(changed),undefined,label);rejected++;}
for(let index=0;index<current.resources.length;index++)for(const key of Object.keys(current.resources[index]))rejectMutation('resource '+index+'.'+key,c=>c.resources[index][key]='unreviewed');
for(const key of Object.keys(current).filter(key=>key!=='resources'))rejectMutation('catalog '+key,c=>c[key]={unreviewed:true});
for(let index=0;index<current.policies.length;index++)for(const key of Object.keys(current.policies[index]))rejectMutation('policy '+index+'.'+key,c=>c.policies[index][key]='unreviewed');
for(const [label,mutate] of [
 ['missing entire supplement',c=>c.resources[c.resources.findIndex(r=>r.id===stage.resourceId)]=structuredClone(old)],
 ['missing method',c=>find(c).actionableMethods.pop()],
 ['missing sources key',c=>delete find(c).relatedSources],
 ['missing note key',c=>delete find(c).curatorInterpretation],
 ['empty sources',c=>find(c).relatedSources=[]],
 ['empty note',c=>find(c).curatorInterpretation=''],
 ['duplicate method',c=>find(c).actionableMethods.push(append.actionableMethods[0])],
 ['reordered methods',c=>find(c).actionableMethods.reverse()],
 ['duplicate source',c=>find(c).relatedSources.push(structuredClone(append.relatedSources[0]))],
 ['source extra field',c=>find(c).relatedSources[0].verified=true],
 ['extra resource',c=>c.resources.push({id:'unreviewed'})],
 ['duplicate provider',c=>c.resources.push(structuredClone(updated))],
 ['reordered resources',c=>c.resources.reverse()],
 ['new top-level field',c=>c.unreviewed=true],
 ['new resource field',c=>find(c).unreviewed=true],
 ['invented source date',c=>find(c).publishedAt='2026-11-05'],
 ['invented exam date',c=>c.calendar.dates.push('2026-11-06')],
 ['invented seats',c=>c.centers[0].seatsAvailable=1]
])rejectMutation(label,mutate);
for(const key of Object.keys(append)){
 const forged=structuredClone(append);forged[key]='forged';assert.throws(()=>replay(baseline,forged),undefined,'forged append '+key);
}
const extra=structuredClone(append);extra.unreviewed=true;assert.throws(()=>replay(baseline,extra));
const alteredPrior=structuredClone(baseline);alteredPrior.resources[0].summary+=' changed';assert.throws(()=>replay(alteredPrior,append));
// Narrow projection does not hide old mutations. Malformed new fields cannot
// be deleted without first matching the independently pinned complete fixture.
for(const mutate of [c=>find(c).relatedSources[0].title+=' changed',c=>find(c).curatorInterpretation+=' changed',c=>find(c).actionableMethods[3]+=' changed',c=>delete find(c).relatedSources]){
 const changed=structuredClone(current);mutate(changed);assert.throws(()=>prior(changed));
}
for(const mutate of [c=>find(c).actionableMethods[0]+=' changed',c=>find(c).checkedAt='2099-01-01',c=>c.resources[0].summary+=' changed',c=>c.policies[0].text+=' changed',c=>c.unreviewed=true,c=>find(c).unreviewed=true]){
 const changed=structuredClone(current);mutate(changed);assert.notEqual(sha256(catalogBytes(prior(changed))),stage.beforeCatalogSha256);
}
const corruptedMethod=structuredClone(current);find(corruptedMethod).actionableMethods[3]+=' changed';assert.throws(()=>priorResources(corruptedMethod.resources));
assert.equal(catalogBytes(replay(baseline,reviewedPronunciationSupplement())),bytes);
console.log(`PASS: exact pronunciation current/predecessor, reversible new keys, immutable old history, dates/media/editor boundaries, ${rejected} rejected mutations and replay/inverse controls.`);
