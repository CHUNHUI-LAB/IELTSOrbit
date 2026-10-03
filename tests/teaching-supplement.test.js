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
