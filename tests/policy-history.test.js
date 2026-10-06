'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {paperTrfStage:stage,sha256,catalogBytes,beforePaperTrfPolicyCatalog:prior,
  verifyPaperTrfPolicyStage:verify,replayPaperTrfPolicyAppend:replay}=require('./policy-history.js');
const bytes=fs.readFileSync(require.resolve('../data/catalog.json'),'utf8');
const current=JSON.parse(bytes),baseline=verify(current),policy=current.policies.at(-1);

assert.equal(sha256(bytes),stage.afterCatalogSha256,'actual file bytes, not only parsed JSON, are pinned');
assert.equal(bytes,catalogBytes(current),'current serialization preserves the original catalog formatting');
assert.equal(sha256(catalogBytes(baseline)),stage.beforeCatalogSha256,'published f7e973b catalog is reconstructed byte-for-byte');
assert.equal(catalogBytes(replay(baseline,policy)),bytes,'forward replay restores every current byte');
assert.equal(catalogBytes(prior(baseline)),catalogBytes(baseline),'already-replayed historical input stays exact');
assert.equal(catalogBytes(current),bytes,'neither inverse nor replay mutates its input');
assert.equal(current.schemaVersion,1);
assert.equal(current.resources.length,51);
assert.equal(current.resources.filter(resource=>resource.sourceType==='experience').length,34);
assert.deepEqual(current.resources,baseline.resources);
assert.deepEqual(current.policies.slice(0,-1),baseline.policies);
for(const key of Object.keys(baseline).filter(key=>key!=='policies')){
  assert.deepEqual(current[key],baseline[key],'all old catalog fields and dates retained: '+key);
}

// Current policy semantics are tested separately from immutable historical data.
assert.deepEqual(Object.keys(policy),['id','title','text','url','effectiveFrom','checkedAt']);
assert.equal(policy.id,stage.addedPolicyId);
assert.equal(policy.url,stage.sourceUrl);
assert.equal(policy.effectiveFrom,'2026-10-01');
assert.equal(policy.checkedAt,'2026-10-06');
assert.ok(policy.text.startsWith('中国大陆自2026年10月1日考试起'));
assert.ok(policy.text.includes('IELTS与IELTS for UKVI学术类、培训类全科及单科重考'));
assert.ok(policy.text.includes('Life Skills仍提供纸质成绩单，暂不提供电子成绩单'));
assert.ok(policy.text.includes('全科考生可在成绩发布后第二日10点后'));
assert.ok(policy.text.includes('单科重考通过官方服务小程序获取，具体下载时间以公告及平台显示为准'));
const auditBytes=fs.readFileSync(require.resolve('../data/maintenance-2026-10-06.json'),'utf8');
assert.equal(sha256(auditBytes),'e6b4a2552d88c001729d181982a5d8a0f70ba06f61ec457b864ece2a734881d5',
  'original source audit, including its initial failed-test status, remains a historical record');
const audit=JSON.parse(auditBytes),source=audit.sources.find(source=>source.url===policy.url);
assert.equal(audit.baseCommit,stage.baseCommit);
assert.deepEqual(audit.addedPolicyIds,[policy.id]);
assert.equal(source.type,'official');
assert.equal(source.retrievalStatus,'body_read');
assert.equal(source.publishedAt,null,'review date must not become a fabricated publication date');
assert.equal(source.effectiveDates.paperTrfDiscontinued,policy.effectiveFrom);
assert.equal(source.effectiveDates.eTrfEligibility,'2026-09-01','eTRF eligibility and paper withdrawal are distinct dates');
assert.ok(source.limitations.some(limit=>limit.includes('单科重考')&&limit.includes('精确下载时间不作统一推断')));
assert.deepEqual(current.calendar.dates,[]);
assert.deepEqual(current.calendar.centerSessions,[]);
assert.equal(current.calendar.seatsAvailable,null);
assert.ok(current.centers.every(center=>center.sessions.length===0&&center.seatsAvailable===null));

let rejected=0;
function rejectMutation(label,mutate){
  const changed=structuredClone(current);mutate(changed);
  assert.throws(()=>verify(changed),undefined,label);rejected++;
}
// Every old resource, old policy field and catalog section is still protected.
for(let index=0;index<current.resources.length;index++){
  rejectMutation('old resource date '+index,catalog=>catalog.resources[index].checkedAt='2099-01-01');
}
for(let index=0;index<baseline.policies.length;index++){
  for(const key of Object.keys(baseline.policies[index])){
    rejectMutation('old policy '+index+'.'+key,catalog=>catalog.policies[index][key]='unreviewed');
  }
}
for(const key of Object.keys(current).filter(key=>!['resources','policies'].includes(key))){
  rejectMutation('old catalog section '+key,catalog=>catalog[key]={unreviewed:true});
}
// A plausible ID or official-looking URL never grants admission to new content.
for(const key of Object.keys(policy)){
  const forged=structuredClone(policy);forged[key]='forged';
  rejectMutation('forged policy field '+key,catalog=>catalog.policies[catalog.policies.length-1]=forged);
  assert.throws(()=>replay(baseline,forged),undefined,'forward replay refuses forged '+key);
  assert.throws(()=>prior({...current,policies:[...baseline.policies,forged]}),undefined,'inverse refuses forged '+key);
}
for(const [label,mutate] of [
  ['missing reviewed append',catalog=>catalog.policies.pop()],
  ['undeclared extra policy',catalog=>catalog.policies.push({id:'unreviewed'})],
  ['duplicate reviewed append',catalog=>catalog.policies.push(structuredClone(policy))],
  ['reordered policies',catalog=>catalog.policies.reverse()],
  ['new unreviewed field',catalog=>catalog.policies.at(-1).approved=true],
  ['missing Life Skills exception',catalog=>catalog.policies.at(-1).text=catalog.policies.at(-1).text.split('Life Skills')[0]],
  ['unreviewed resource',catalog=>catalog.resources.push({id:'unreviewed'})],
  ['new top-level field',catalog=>catalog.unreviewed=true],
  ['invented Hangzhou date',catalog=>catalog.calendar.dates.push('2026-10-07')],
  ['invented seats',catalog=>catalog.centers[0].seatsAvailable=0]
])rejectMutation(label,mutate);
const alteredPrior=structuredClone(baseline);alteredPrior.resources[0].summary+=' unreviewed';
assert.throws(()=>replay(alteredPrior,policy),undefined,'forward replay refuses an altered predecessor');
// A non-policy alteration is not erased by the narrow inverse, so legacy SHA
// assertions remain capable of detecting it as well as the new stage verifier.
const changed=structuredClone(current);changed.resources[0].summary+=' unreviewed';
assert.notEqual(sha256(catalogBytes(prior(changed))),stage.beforeCatalogSha256);
assert.equal(catalogBytes(replay(baseline,structuredClone(policy))),bytes,'only the compliant reviewed append passes');
console.log(`PASS: exact f7e973b predecessor/current SHA and reversible bytes; 51 resources/34 experiences/3 historical policies retained; sourced mainland TRF scope, Life Skills exception and dates; ${rejected} rejected catalog mutations plus forged replay/inverse controls`);
