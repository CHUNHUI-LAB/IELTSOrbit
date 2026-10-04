'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const raw=require('./resource-history.js').beforeListeningBatchCatalog(require('../data/catalog.json')),core=require('../assets/core.js');
const {beforeTeachingCatalog,foundationNoteSuffix}=require('./resource-history.js');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(digest(beforeTeachingCatalog(raw)),'99666d881eaf8c15db6ab341fbb21a8380fbbadf2532da7b6d6ea3f6a03d9ba1','entire9c6241a catalog preserved behind only explicitly allowed teaching additions');
assert.equal(raw.resources.length,44);assert.equal(raw.resources.filter(r=>r.sourceType==='experience').length,27);
const liz=raw.resources.find(r=>r.id==='liz'),bc=raw.resources.find(r=>r.id==='bc-mocks');
assert.equal(liz.sourceType,'teacher');assert.equal(liz.commercial,true);assert.equal(liz.checkedAt,'2026-10-01');assert.equal(liz.actionableMethods.length,3);assert(liz.actionableMethods[0].startsWith('本站建议：'));
assert(liz.curatorInterpretation.includes('2017年'));assert(liz.curatorInterpretation.includes('未播放音频'));assert(liz.curatorInterpretation.includes('部分2017年评论'));assert(liz.curatorInterpretation.includes('158条评论'));assert(liz.curatorInterpretation.includes('商业')||liz.curatorInterpretation.includes('销售 Advanced IELTS'));
assert.deepEqual(liz.relatedSources,[{title:'Office Etiquette · 听力填空与反馈（2017年教师自编小练习）',url:'https://ieltsliz.com/listening-practice-office-etiquette/'}]);
assert.equal(bc.actionableMethods.length,5);assert(bc.actionableMethods[4].startsWith('听力基础补充（非模拟题组）：'));assert(bc.actionableMethods[4].includes('短句听写或数词数'));assert(bc.curatorInterpretation.endsWith(foundationNoteSuffix));assert.equal(bc.relatedSources.length,1);assert.equal(bc.relatedSources[0].url,'https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/t-w/weak-forms');assert(bc.relatedSources[0].title.includes('非模拟题组'));
const normalized=core.normalizeCatalog(raw);for(const id of ['liz','bc-mocks']){const r=normalized.resources.find(r=>r.id===id);assert.equal(r.relatedSources.length,1);assert(r.relatedSources[0].url.startsWith('https://'));assert(r.actionableMethods.length>=3);}
assert.deepEqual(raw.teachingSupplementReview.updatedResourceIds,['liz','bc-mocks']);assert.deepEqual(raw.teachingSupplementReview.newResourceIds,[]);assert.equal(raw.teachingSupplementReview.sources.length,2);assert.equal(raw.teachingSupplementReview.sources[1].sourceYear,null);
const review=JSON.stringify(raw.teachingSupplementReview);assert(!review.includes('ielts.com.au'));assert(!review.includes('using-phonemic'));
const app=fs.readFileSync(require.resolve('../assets/app.js'),'utf8');assert(app.includes("externalLink('相关原文：'+record.title"));assert(!app.includes('同一案例配套原文：'));
console.log('PASS:2 bounded teaching deep links; Liz2017/free-commercial/audio-unplayed/partial-comment boundaries; BCweakforms foundation separated;44/27 preserved; entire prior catalog/history exact; neutral related-source label.');

// 2026-10-04 is a bounded content correction, not a reset of prior source checks.
const current=require('./resource-history.js').beforeVerifiedExperienceCatalog(require('../data/catalog.json'));
const {beforeSkillAlignmentCatalog}=require('./resource-history.js');
const beforeAlignment=beforeSkillAlignmentCatalog(current);
const baselineAlignmentHash='590b88cb0ebc281baf407268e8529f324d91c37627390aff875031b6a0a65e76';
assert.equal(digest(beforeAlignment),baselineAlignmentHash,'entire febb1890 catalog is exactly recoverable after only the five reviewed Liz fields and new review are projected out');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(beforeAlignment,null,2)+'\n').digest('hex'),'f4fe891c1d828786b19b324e358162512c77f4f2f2433ba330da92495063b676','published baseline catalog bytes retained');
const currentLiz=current.resources.find(r=>r.id==='liz');
const lizAlignmentHash='14ae4929d12702fe77c46be59fe4da543dbd410c62c24861e31927685083368c';
assert.equal(digest(currentLiz),lizAlignmentHash,'all current Liz fields are reviewed; historical projection cannot conceal unreviewed edits');
assert.equal(digest(current.resourceSkillAlignmentReview),'d3faac155841814efe82dd3038462554dc0f890a89cec7b480cc9cd8ab97c06d','exact dated source-read scope and limits');
assert.equal(currentLiz.title,'IELTS Liz 分项学习目录与免费练习');
assert.equal(currentLiz.url,'https://ieltsliz.com/free-ielts-preparation-blog/');
assert.equal(currentLiz.checkedAt,'2026-10-01');assert.equal(currentLiz.commercial,true);assert.equal(currentLiz.sourceType,'teacher');
assert.deepEqual(currentLiz.skills,['听力','阅读','写作','口语','词汇']);
assert.equal(currentLiz.actionableMethods.length,6);assert(currentLiz.actionableMethods[0].startsWith('本站建议：先按下面的科目标签'));
const skillLinks={
 '听力':'https://ieltsliz.com/listening-practice-office-etiquette/',
 '阅读':'https://ieltsliz.com/reading-skills-for-ielts-paraphrasing/',
 '写作':'https://ieltsliz.com/ielts-writing-task-2-essay-planning-tips/',
 '口语':'https://ieltsliz.com/common-mistake-in-speaking-part-3/',
 '词汇':'https://ieltsliz.com/lack-vocabulary-and-sample-sentences/'
};
for(const [skill,url] of Object.entries(skillLinks)){
 const methods=currentLiz.actionableMethods.filter(step=>step.startsWith(skill+'｜'));
 assert.equal(methods.length,1,'one clearly labelled independent action per current skill: '+skill);
 assert(currentLiz.relatedSources.some(source=>source.url===url));
 assert(current.resourceSkillAlignmentReview.sources.some(source=>source.url===url));
 if(skill!=='听力')assert(!methods[0].includes('Office Etiquette')&&!methods[0].includes('先听一次'));
}
assert(currentLiz.actionableMethods[3].includes('Task 2')&&currentLiz.actionableMethods[3].includes('段落'));
assert(currentLiz.curatorInterpretation.startsWith(liz.curatorInterpretation),'2026-10-03 interpretation preserved exactly as the historical prefix');
assert(currentLiz.curatorInterpretation.includes('2026-10-04')&&currentLiz.curatorInterpretation.includes('未播放音视频'));
assert.deepEqual(current.resourceSkillAlignmentReview.updatedResourceIds,['liz']);assert.deepEqual(current.resourceSkillAlignmentReview.newResourceIds,[]);
assert.equal(current.resourceSkillAlignmentReview.checkedAt,'2026-10-04');assert.equal(current.metadata.lastScheduledCheckAt,'2026-10-03');
assert.equal(current.resources.length,47);assert.equal(current.resources.filter(r=>r.sourceType==='experience').length,30);
// Both the inverse historical projection and the new reviewed record have negative controls.
for(const mutate of [c=>c.resources.find(r=>r.id==='liz').url='https://example.org/',c=>c.resources.find(r=>r.id==='simon').summary+=' changed',c=>c.teachingSupplementReview.checkedAt='2026-10-04',c=>c.resources[0].skills=['听力'],c=>c.metadata.checkedAt='2026-10-04']){
 const changed=structuredClone(current);mutate(changed);assert.notEqual(digest(beforeSkillAlignmentCatalog(changed)),baselineAlignmentHash);
}
for(const key of ['title','summary','actionableMethods','relatedSources','curatorInterpretation']){
 const changed=structuredClone(currentLiz);if(Array.isArray(changed[key]))changed[key].pop();else changed[key]+=' changed';
 assert.notEqual(digest(changed),lizAlignmentHash,'approved-field mutation cannot hide behind history projection: '+key);
}
console.log('PASS: Liz multi-skill classification backed by five labelled actions and six deep links; exact old catalog/history and current record; dated scope, commercial/audio/comment limits and negative mutation controls.');
