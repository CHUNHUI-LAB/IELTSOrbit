const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const raw=require('../data/catalog.json');
const core=require('../assets/core.js');
const experience=require('../assets/experience.js');
const catalog=core.normalizeCatalog(raw);
const ids=[
 'csdn-four-attempts-output-gap-2020',
 'ptt-working-four-tests-speaking-gap-2025',
 'siang-long-gap-writing-time-2024',
 'mudlady-seven-attempts-writing-output-2023',
 'sunny-working-speaking-osr-2025',
 'reddit-writing55-unresolved-thread-2026',
 'reddit-three-attempts-conditions-writing-flat-2026'
];
const byId=id=>raw.resources.find(r=>r.id===id);
const additions=ids.map(byId);
assert.deepEqual(raw.resources.slice(33,40).map(r=>r.id),ids,'the seven reviewed plateau additions remain unchanged');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(raw.resources.slice(0,33))).digest('hex'),'b483ec9868ada2c0a80365105a3e800fe7b9c367b8d3b868623bab05b41deabb','every original record unchanged');
assert.equal(new Set(raw.resources.map(r=>new URL(r.url).href)).size,41,'no duplicate source URL');
assert.equal(raw.experienceBatchReview.acceptedCount,7);
assert.equal(raw.experienceBatchReview.recommendedCount,0);
assert.deepEqual(raw.experienceBatchReview.sourceIds,ids);
assert.equal(core.filterResources(catalog.resources,{recommendation:'recommended'},[]).length,22);
assert.equal(core.filterResources(catalog.resources,{recommendation:'reference'},[]).length,19);
for(const r of additions){
 assert.equal(r.recommendedByDefault,false);
 assert.equal(r.sourceType,'experience');
 assert.ok(r.summary.length>40&&r.summary.length<600);
 assert.ok(r.reportedRoutine.length&&r.actionableMethods.length);
 assert.ok(r.caution.includes('未独立核验'));
 assert.ok(r.authorContext.outcome.includes('未独立核验')||r.authorContext.outcome.includes('未核验'));
 assert.ok(r.commercialDisclosure&&r.excludeFromGeneralGuidance.length&&r.commentsReview.detail);
 assert.equal(r.provenance.scope,r.evidenceScope);
 assert.equal(r.provenance.sourceUrl,r.url);
 const normalized=catalog.resources.find(x=>x.id===r.id);
 assert.equal(normalized.price,'free');
 assert.equal(normalized.access,'open');
 assert.ok(Object.values(experience.topicIds).some(topic=>topic.includes(r.id)));
 assert.ok([...experience.overview.themes,...experience.overview.disagreements].some(s=>s.sourceIds.includes(r.id)));
}
assert.ok(byId(ids[0]).summary.includes('没有独立写过完整作文'));
assert.ok(byId(ids[0]).authorContext.outcome.includes('未明示顺序'));
assert.ok(byId(ids[1]).summary.includes('仍未达到'));
assert.ok(byId(ids[1]).commercialDisclosure.includes('代发'));
assert.ok(byId(ids[2]).sourceDateCaveat.includes('发表日期不等于考试日期'));
assert.ok(byId(ids[2]).caution.includes('不是统一配时规定'));
assert.ok(byId(ids[3]).summary.includes('停考')&&byId(ids[3]).summary.includes('后段已转全职'));
assert.ok(byId(ids[4]).summary.includes('付费口语课')&&byId(ids[4]).summary.includes('>6.5'));
assert.ok(byId(ids[4]).authorContext.preparationDuration.includes('请假'));
assert.ok(byId(ids[4]).reportedRoutine[1].startsWith('作者建议'));
assert.ok(byId(ids[6]).reportedRoutine[1].startsWith('口语部分建议'));
const unresolved=byId(ids[5]);
assert.equal(unresolved.outcomeClass,'unresolved');
assert.equal(unresolved.discussionEvidence.length,1);
assert.ok(unresolved.discussionEvidence[0].attributionCaveat.includes('未确认同一人'));
assert.ok(!unresolved.authorContext.preparationDuration.includes('100'));
assert.ok(!unresolved.reportedRoutine.join(' ').includes('AI'));
assert.ok(byId(ids[6]).summary.includes('没有净提升'));
assert.ok(byId(ids[6]).excludeFromGeneralGuidance.some(x=>x.includes('固定分差')));
for(const id of ids.slice(-2)){
 const r=byId(id);
 assert.equal(r.publishedAt,null,'do not invent absolute dates from a relative timestamp');
 assert.ok(r.sourceDateCaveat.includes('相对时间'));
}
assert.ok(experience.overview.limitations.some(x=>x.includes('夜班')));
assert.ok(experience.overview.limitations.some(x=>x.includes('低起点长期追踪仍不足')));
console.log('PASS: seven reference additions, 33-object preservation, source/provenance/topic coverage, commercial and unresolved-outcome guardrails, deleted-account separation and honest dates.');
