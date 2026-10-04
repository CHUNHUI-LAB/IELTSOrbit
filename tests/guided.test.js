const counts=require('./catalog-counts.js');
const assert=require('node:assert/strict'),core=require('../assets/core.js'),experience=require('../assets/experience.js'),catalog=core.normalizeCatalog(require('../data/catalog.json'));
for(const history of ['yes','no','unknown'])for(const target of ['unknown','6.5','7','7.5'])for(const minutes of ['15','30','60','90'])for(const weak of ['unknown','listening','reading','writing','speaking']){
 const p=core.buildPlan({examHistory:history,target,dailyMinutes:minutes,weakSkill:weak});assert.equal(p.today.reduce((sum,t)=>sum+t.minutes,0),Number(minutes));assert.equal(p.days.length,7);assert.equal(new Set(p.days.map(d=>d.skill)).size,4);assert.ok(p.today.every(t=>t.minutes>0&&catalog.resources.some(r=>r.id===t.resource&&r.recommendedByDefault!==false)));assert.ok(p.note.includes('不预测分数'));assert.ok(p.note.includes('首考日期'));
}
for(const [skill,guide] of Object.entries(core.learningGuides)){assert.equal(guide.steps.length,3);assert.ok(guide.resources.every(id=>catalog.resources.some(r=>r.id===id&&r.recommendedByDefault!==false)));assert.ok(guide.basis.includes('建议')||guide.basis.includes('编辑'));assert.equal(core.parseRoute('#library/'+skill).skill,skill);}
assert.equal(core.parseRoute('#library/writing/resource/writing-rubric').resource,'writing-rubric');assert.equal(core.parseRoute('#path/step/5').planStep,null);assert.equal(core.parseRoute('#path/step/2').planStep,2);assert.equal(core.parseRoute('#path/result').planResult,true);for(const tab of ['library','path','exams','experience'])assert.equal(core.parseRoute('#'+tab).tab,tab);
const migrated=core.readState(JSON.stringify({saved:['a'],path:{target:'7',examHistory:'yes',dailyMinutes:'60',weakSkill:'speaking',completed:true}}));assert.equal(migrated.path.dailyMinutes,'60');assert.equal(migrated.path.weakSkill,'speaking');assert.equal(migrated.path.baseline,'unknown');assert.deepEqual(core.readState('{"saved":["a"],"path":"bad"}').saved,['a']);
assert.equal(experience.selectCases(catalog.resources).length,6);assert.equal(experience.selectCases(catalog.resources,'all','reference').length,counts.experienceReference);assert.equal(experience.selectCases(catalog.resources,'all','all').length,counts.experiences);for(const topic of Object.keys(experience.topics))assert.ok(experience.selectCases(catalog.resources,topic).length>0);assert.equal(experience.selectCases(catalog.resources,'timing','all').length,counts.timing);
for(const r of catalog.resources.filter(r=>r.sourceType==='experience')){const c=experience.caseContent(r);assert.ok(c.baseline&&c.training.length&&c.outcome&&c.limit&&c.comments.length);}
console.log('PASS: current catalog counts and complete experience coverage; retained source, route, state, and provenance regressions.');

const coverage=[...new Set([...experience.overview.themes,...experience.overview.disagreements].flatMap(section=>section.sourceIds))].sort();
assert.deepEqual(coverage,catalog.resources.filter(r=>r.sourceType==='experience').map(r=>r.id).sort(),'synthesis cites all current experience cases');
assert.equal(experience.overview.themes.slice(0,-1).length,9);assert.equal(experience.overview.themes.length,10);assert.equal(experience.overview.disagreements.length,7);assert.equal(experience.overview.suggestedSequence.length,5);
assert.ok(experience.scopeText(catalog.resources).includes('6篇推荐')&&experience.scopeText(catalog.resources).includes(counts.experienceReference+'篇参考'));assert.ok(experience.overview.scope.includes('未重新核验'));assert.ok(experience.overview.sequenceLabel.includes('不是'));
console.log('PASS: current catalog counts and complete experience coverage; retained source, route, state, and provenance regressions.');

const cases=catalog.resources.filter(r=>r.sourceType==='experience'),caseIds=new Set(cases.map(r=>r.id));
assert.deepEqual([...new Set(Object.values(experience.topicIds).flat())].sort(),[...caseIds].sort(),'every experience has a question topic');
for(const [topic,ids] of Object.entries(experience.topicIds)){
 assert.equal(new Set(ids).size,ids.length,'no duplicate topic memberships');
 assert.ok(ids.every(id=>caseIds.has(id)),'topic IDs resolve to experience records');
 for(const scope of ['recommended','reference','all']){
  const selected=experience.selectCases(catalog.resources,topic,scope);
  assert.deepEqual(selected.map(r=>r.id),cases.filter(r=>ids.includes(r.id)&&(scope==='all'||(scope==='reference'?r.recommendedByDefault===false:r.recommendedByDefault!==false))).map(r=>r.id));
 }
}
for(const section of [...experience.overview.themes,...experience.overview.disagreements]){
 assert.ok(section.title&&section.synthesis&&section.sourceIds.length);
 assert.equal(new Set(section.sourceIds).size,section.sourceIds.length);
 assert.ok(section.sourceIds.every(id=>caseIds.has(id)));
}
for(const r of cases){assert.ok(r.summary?.length>20,'each experience has its own summary');assert.ok(!r.summary.startsWith('建议动作'),'summary is not replaced by editorial action list');}
assert.equal(cases.slice(12,17).filter(r=>r.recommendedByDefault).length,1);
assert.equal(cases.find(r=>r.id==='candice-working-rewrite-case').publishedAt,'2023-03-07');
assert.ok(cases.find(r=>r.id==='candice-working-rewrite-case').caution.includes('考试年份未可靠确认'));
assert.equal(cases.find(r=>r.id==='dcard-working-dictation-review').commentsReview.status,'partially_reviewed');
assert.ok(cases.slice(12,17).every(r=>r.provenance.scope===r.evidenceScope&&r.commercialDisclosure&&r.excludeFromGeneralGuidance.length));
assert.ok(cases.slice(12,17).every(r=>r.access==='open'&&r.accessLabel.includes('公开')&&r.priceLabel.includes('免费')),'new raw schema produces readable labels and correct filter enums');
console.log('PASS: every case has a summary and question membership; all topic/scope combinations, source links, dates, commercial disclosures, comment limits and normalized price/access labels.');

const xhs=cases.find(r=>r.id==='xiaohongshu-self-study-single-skill-gap-2025');assert.equal(xhs.recommendedByDefault,false);assert.equal(xhs.publishedAt,'2025-06-27');assert.ok(xhs.authorContext.outcome.includes('口语5.5'));assert.ok(xhs.evidenceScope.includes('20条')&&xhs.evidenceScope.includes('53条')&&xhs.evidenceScope.includes('其余未读'));assert.ok(experience.overview.themes.some(t=>t.sourceIds.includes(xhs.id)&&t.title.includes('单项')));
console.log('PASS: Xiaohongshu case remains a reference with 20/53 comment boundary and total-versus-component distinction.');

// Synthesis citations are real deep links, including on a fresh page load.
for(const resource of catalog.resources.filter(r=>r.sourceType==='experience')){
 const route=core.parseRoute('#experience-case-'+resource.id);
 assert.equal(route.tab,'experience');assert.equal(route.experienceCase,resource.id);
}
assert.equal(core.parseRoute('#experience-case-').tab,'start');
assert.equal(core.parseRoute('#experience').experienceCase,null);
console.log('PASS: current catalog counts and complete experience coverage; retained source, route, state, and provenance regressions.');
