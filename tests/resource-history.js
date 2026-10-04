'use strict';
// 2026-10-04: this five-field Liz correction is frozen in teaching-supplement.test.js.
// Project only those fields back for historical hashes; unrelated fields remain observable.
const beforeSkillAlignmentLizFields = {
  "title": "IELTS Liz 免费分项课程",
  "summary": "按具体弱项选一课，再用练习检验，不连续囤看技巧视频。网站同时推广课程与电子书，教师建议仍需对照官方评分标准。",
  "actionableMethods": [
    "本站建议：打开下方 Office Etiquette 小练习，按页面的一词限制先听一次并作答，再展开答案说明与文字稿。",
    "错题回到对应句，先判断是否因重复词而忽略真正的意思，再看页面的释义解释。",
    "对照该练习要求检查答案是否来自录音原词，以及填入后词性和语法是否合适；把释义误判、原词选择与词形问题分开记录。"
  ],
  "relatedSources": [
    {
      "title": "Office Etiquette · 听力填空与反馈（2017年教师自编小练习）",
      "url": "https://ieltsliz.com/listening-practice-office-etiquette/"
    }
  ],
  "curatorInterpretation": "具体练习补充核读：2026-10-03。Office Etiquette 正文注明2017年，为 Liz 教师自编的公开免费小练习；站点同时销售 Advanced IELTS 等产品。已读正文、题目、答案解释和文字稿；未播放音频。只核读部分2017年评论，不声称读完页面标示的158条评论，评论不作为提分效果证据。这里仅归纳反馈步骤并链接原页，不转载题目、答案或文字稿；短练习不是完整模考，不保证分数或限时迁移效果。原目录条目的核验日保留。"
};
function beforeSkillAlignmentResources(resources){return resources.map(resource=>resource.id==='liz'?{...resource,...beforeSkillAlignmentLizFields}:resource);}
function beforeSkillAlignmentCatalog(catalog){const prior={...catalog,resources:beforeSkillAlignmentResources(catalog.resources)};delete prior.resourceSkillAlignmentReview;return prior;}
// This one dated maintenance adds exactly these two fields to three legacy cards.
// Remove ONLY those additions when verifying earlier immutable-resource digests.
// All original fields, every other resource and the historical hash values remain protected.
const reviewedIds=new Set(['official-samples','bc-mocks','writing-rubric']);
function legacyResources(resources){return beforeTeachingResources(resources).map(resource=>{if(!reviewedIds.has(resource.id))return resource;const prior={...resource};delete prior.actionableMethods;delete prior.curatorInterpretation;return prior;});}
// Later teaching enrichment is separately frozen by teaching-supplement.test.js.
const foundationNoteSuffix=" 基础方法补充核读：2026-10-03。另读 British Council TeachingEnglish 的 Weak forms 主文，仅采用短句听写或数词数提高弱读意识的建议；这是独立于上方模拟练习入口的基础方法说明，未运行课堂活动，也未核验配套音频或答案。主文未标明作者及发布日期，不从相关内容卡推断年龄、CEFR或学习时长，不证明能提高雅思分数。";
function beforeTeachingResources(resources){return beforeSkillAlignmentResources(resources).map(resource=>{
 if(resource.id==='liz'){const prior={...resource};delete prior.actionableMethods;delete prior.relatedSources;delete prior.curatorInterpretation;return prior;}
 if(resource.id==='bc-mocks'&&resource.curatorInterpretation?.endsWith(foundationNoteSuffix)){const prior={...resource,actionableMethods:resource.actionableMethods.slice(0,4),curatorInterpretation:resource.curatorInterpretation.slice(0,-foundationNoteSuffix.length)};delete prior.relatedSources;return prior;}
 return resource;
});}
function beforeTeachingCatalog(catalog){const prior={...catalog,resources:beforeTeachingResources(catalog.resources)};delete prior.teachingSupplementReview;return prior;}
module.exports={legacyResources,reviewedIds,beforeTeachingResources,beforeTeachingCatalog,foundationNoteSuffix};

// 2026-10-03 experience batch: project ONLY its three appended IDs out.
// The batch test pins the exact suffix/order and whole pre-batch catalog digest.
const listeningBatchIds=Object.freeze(['bili-baigang-listening-bottlenecks-2021','note-taku-listening-peak-stability-2026','reddit-gt-reading-improves-writing-falls-2026']);
function beforeListeningBatchCatalog(catalog){const prior=beforeSkillAlignmentCatalog(beforeVerifiedExperienceCatalog(catalog));return {...prior,resources:prior.resources.filter(r=>!listeningBatchIds.includes(r.id))};}
module.exports.listeningBatchIds=listeningBatchIds;
module.exports.beforeListeningBatchCatalog=beforeListeningBatchCatalog;

module.exports.beforeSkillAlignmentCatalog=beforeSkillAlignmentCatalog;
module.exports.beforeSkillAlignmentResources=beforeSkillAlignmentResources;

// Project ONLY the two independently reviewed 2026-10-04 appended IDs.
const verifiedExperienceIds=Object.freeze(["ptt-listening-reading-evidence-review-2018", "ptt-writing-sentence-feedback-eor-2017"]);
function beforeVerifiedExperienceCatalog(catalog){return {...catalog,resources:catalog.resources.filter(r=>!verifiedExperienceIds.includes(r.id))};}
module.exports.verifiedExperienceIds=verifiedExperienceIds;
module.exports.beforeVerifiedExperienceCatalog=beforeVerifiedExperienceCatalog;
