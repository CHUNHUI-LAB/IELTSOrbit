'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const raw=require('../data/catalog.json'),experience=require('../assets/experience.js'),core=require('../assets/core.js');
const {beforeListeningBatchCatalog,listeningBatchIds}=require('./resource-history.js');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Captured independently from remote fc9bbd75d1841ad0cd92792abee099d3218e6bec;
// reverified unchanged against live F2 main 6399f3beeafaa9c9a9ab89a11b3c14982e70c426.
const baselineHash='53a867d832578bd288dc2182a1b4c89ab635a6fa9c92d6d3b5320d8081811810';
assert.equal(hash(beforeListeningBatchCatalog(raw)),baselineHash,'whole pre-batch catalog, including old 44 objects and every history field, remains exact');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(beforeListeningBatchCatalog(raw),null,2)+'\n').digest('hex'),'1ea5bfae8da0a1b8329cae718c3aa55147bbc9d3464a7bb8b0ffa7470c058630','original published catalog bytes exactly reconstruct with original formatting');
assert.equal(raw.resources.length,47);
assert.deepEqual(raw.resources.slice(44).map(r=>r.id),listeningBatchIds,'exact append-only suffix and ordering');
assert.equal(new Set(raw.resources.map(r=>r.id)).size,47);
assert.equal(new Set(raw.resources.map(r=>r.url.replace(/\/$/,''))).size,47);
assert.equal(raw.resources.filter(r=>r.sourceType==='experience').length,30);
assert.equal(raw.resources.filter(r=>r.recommendedByDefault!==false).length,22);
assert.equal(raw.resources.filter(r=>r.sourceType==='experience'&&r.recommendedByDefault!==false).length,6);
assert.equal(hash(experience.overview.themes.slice(0,8)),'209ac55578c3e1f6820ed2556d8469394392af183272cfae4a5d7ac9ba2f42c7','all eight prior themes remain byte-equivalent under JSON serialization');
const historicalTopics=Object.fromEntries(Object.entries(experience.topicIds).map(([key,ids])=>[key,ids.filter(id=>!listeningBatchIds.includes(id))]));
assert.equal(hash(historicalTopics),'5a1e8616d854ddd70db043f49c7cf520b1f53a0415ad0a595c8e784a4b921250','all previous topic memberships and ordering preserved');
assert.deepEqual(experience.overview.themes[8].sourceIds,listeningBatchIds);
const coverage=[...new Set([...experience.overview.themes,...experience.overview.disagreements].flatMap(x=>x.sourceIds))].sort();
assert.deepEqual(coverage,raw.resources.filter(r=>r.sourceType==='experience').map(r=>r.id).sort());
assert.ok(experience.scopeText(raw.resources).includes('30篇经验：6篇推荐阅读、24篇参考案例'));
for(const r of raw.resources.slice(44)){
 assert.equal(r.sourceType,'experience');assert.equal(r.recommendedByDefault,false);assert.equal(r.checkedAt,'2026-10-03');
 assert.ok(r.originalTitle&&r.originalTitle!==r.title&&r.summary.length>20);
 assert.ok(r.reportedRoutine.length&&r.actionableMethods.every(x=>x.startsWith('本站建议：'))&&r.curatorInterpretation);
 assert.ok(r.authorContext.outcome.includes('未独立核验'));assert.ok(r.caution.includes('未独立核验'));
 assert.ok(r.commercialDisclosure&&r.excludeFromGeneralGuidance.length&&r.sourceDateCaveat);
 assert.equal(r.provenance.scope,r.evidenceScope);assert.equal(r.provenance.sourceUrl,r.url);assert.equal(r.provenance.reviewedAt,r.checkedAt);
 assert.ok(r.commentsReview.detail&&r.evidenceScope.includes('未'));
 assert.ok(experience.topicIds.input.includes(r.id)&&experience.topicIds.timing.includes(r.id));
 const n=core.normalizeCatalog(raw).resources.find(x=>x.id===r.id);assert.equal(n.access,'open');assert.equal(n.price,'mixed','free article mentions paid materials; existing normalizer conservatively retains mixed label');
 assert.equal(core.parseRoute('#experience-case-'+r.id).experienceCase,r.id);
}
const [b,n,g]=raw.resources.slice(44);
assert.ok(b.caution.includes('原文未明确考试为Academic或GT'));assert.ok(b.summary.includes('总分7、最低单项6'));
assert.equal(b.publishedAt,'2021-12-02');assert.ok(b.summary.includes('2019年')&&b.summary.includes('2021年'));assert.equal(b.commentsReview.status,'not_reviewed');assert.ok(b.evidenceScope.includes('视频'));
assert.ok(n.summary.includes('首次7.5约用70小时')&&n.summary.includes('另投入70–80小时'));assert.ok(n.authorContext.preparationDuration.includes('自学习开始约半年'));assert.ok(!JSON.stringify(n).includes('14天'));
assert.equal(n.publishedAt,'2026-04-19');assert.ok(n.sourceDateCaveat.includes('考试经历年份未核实'));assert.ok(n.actionableMethods[1].includes('编辑建议'));assert.equal(n.commentsReview.status,'not_reviewed');
assert.ok(g.summary.includes('阅读由6.5升至8')&&g.summary.includes('写作由7降至6.5'));assert.ok(g.authorContext.baseline.includes('口语保持7.5'));
assert.equal(g.publishedAt,null);assert.ok(g.authorContext.baseline.includes('旧听力未给具体分数'));assert.ok(g.sourceDateCaveat.includes('2026-01-29'));assert.equal(g.commentsReview.status,'partial');assert.ok(g.commentsReview.detail.includes('6条')&&g.commentsReview.detail.includes('More replies'));assert.ok(g.curatorInterpretation.includes('其他评论者'));assert.ok(g.caution.includes('General Training')&&g.caution.includes('Academic'));
// Negative controls: historical edits, added fields and unrelated additions cannot hide in projection.
for(const mutate of [c=>c.resources[0].summary+=' changed',c=>c.metadata.unapproved=true,c=>c.resources.push({id:'unreviewed'})]){const c=structuredClone(raw);mutate(c);assert.notEqual(hash(beforeListeningBatchCatalog(c)),baselineHash);}
console.log('PASS: dated 3-case append-only batch; exact prior 44/catalog/history/themes/topics; 47/30 counts, source attribution, author/editor/comment boundaries and mutation controls');
