'use strict';
// This one dated maintenance adds exactly these two fields to three legacy cards.
// Remove ONLY those additions when verifying earlier immutable-resource digests.
// All original fields, every other resource and the historical hash values remain protected.
const reviewedIds=new Set(['official-samples','bc-mocks','writing-rubric']);
function legacyResources(resources){return beforeTeachingResources(resources).map(resource=>{if(!reviewedIds.has(resource.id))return resource;const prior={...resource};delete prior.actionableMethods;delete prior.curatorInterpretation;return prior;});}
// Later teaching enrichment is separately frozen by teaching-supplement.test.js.
const foundationNoteSuffix=" 基础方法补充核读：2026-10-03。另读 British Council TeachingEnglish 的 Weak forms 主文，仅采用短句听写或数词数提高弱读意识的建议；这是独立于上方模拟练习入口的基础方法说明，未运行课堂活动，也未核验配套音频或答案。主文未标明作者及发布日期，不从相关内容卡推断年龄、CEFR或学习时长，不证明能提高雅思分数。";
function beforeTeachingResources(resources){return resources.map(resource=>{
 if(resource.id==='liz'){const prior={...resource};delete prior.actionableMethods;delete prior.relatedSources;delete prior.curatorInterpretation;return prior;}
 if(resource.id==='bc-mocks'&&resource.curatorInterpretation?.endsWith(foundationNoteSuffix)){const prior={...resource,actionableMethods:resource.actionableMethods.slice(0,4),curatorInterpretation:resource.curatorInterpretation.slice(0,-foundationNoteSuffix.length)};delete prior.relatedSources;return prior;}
 return resource;
});}
function beforeTeachingCatalog(catalog){const prior={...catalog,resources:beforeTeachingResources(catalog.resources)};delete prior.teachingSupplementReview;return prior;}
module.exports={legacyResources,reviewedIds,beforeTeachingResources,beforeTeachingCatalog,foundationNoteSuffix};
