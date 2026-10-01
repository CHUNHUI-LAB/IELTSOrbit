(function(root){
'use strict';
const overview={
  "scope": "基于本站已收录的12篇经验及其现有核读记录整理：5篇推荐阅读、7篇仅供比较或反思。并非对所有雅思考生的调查；本轮没有重新核验成绩或补读尚未展开的评论。",
  "headline": "先看起点，再看练习过程；把经验变成可检查的下一步",
  "summary": "这批案例最值得借鉴的不是某个备考天数，而是如何发现准备中的遗漏：限时与不限时要分开，写作和口语要实际输出，错题要回到原文或作品解释，日程要独立核对。短期高分案例通常同时披露了长期英语积累；低分或未达目标的复盘也能提示风险，但不能证明某种方法必然有效。",
  "themes": [
    {
      "title": "备考天数相近，起点可能完全不同",
      "synthesis": "C2、长期演讲辩论、英语授课经历与已有国内英语考试基础并非同一起点。先区分长期积累、日历跨度和有效训练时数，再判断经验是否适合自己。",
      "sourceIds": [
        "experience-c2",
        "experience-85",
        "zhihu-case",
        "bili-experience-nonzero-2023",
        "tahsin-high-baseline-2022"
      ]
    },
    {
      "title": "会做和能按时做完，要分别验证",
      "synthesis": "暂停重听的正确率、脑中构思的口语、反复修改的一篇作文，都可能掩盖真实考试条件下的问题。可以把精练与无辅助限时任务分开记录，尤其检查两篇连续写作与英文键盘输入。",
      "sourceIds": [
        "bili-experience-math-2025",
        "ielts-esther-timing-2025",
        "tahsin-high-baseline-2022",
        "ielts-ramadhanight-2025"
      ]
    },
    {
      "title": "复盘要解释错误，不能只记分数",
      "synthesis": "阅读日志可保留定位句、当时判断和误读点；写作可比较修改前后并解释理由，再换题独立完成。这里借鉴的是记录方式，参考案例中的概率猜题、答案字母或AI评分偏移不随之采纳。",
      "sourceIds": [
        "bili-reading-error-log-2023",
        "bili-reading-error-log-pang-2023",
        "reddit-writing-feedback-compare-2026",
        "zhihu-case"
      ]
    },
    {
      "title": "日程、题型熟悉度和语言能力是不同问题",
      "synthesis": "首考复盘提醒：核对到场与各科时间，分清没看懂、题型不熟和时间不足。考场自信、考官反应及是否做完，不能直接用来估计分数。",
      "sourceIds": [
        "v2ex-first-attempt-reflection-2023",
        "ielts-ramadhanight-2025"
      ]
    }
  ],
  "disagreements": [
    {
      "title": "先写哪篇、先做哪类题，没有从这些案例得出的统一最优顺序",
      "synthesis": "部分作者提出个人做题顺序，另一些复盘暴露时间被一项任务耗尽的问题。应在自己的限时记录中比较，不能仅因作者高分就照搬。",
      "sourceIds": [
        "experience-85",
        "bili-experience-nonzero-2023",
        "bili-experience-math-2025",
        "ielts-esther-timing-2025"
      ]
    },
    {
      "title": "AI反馈可以讨论具体修改，分数不能加固定偏移",
      "synthesis": "已有评论串同时出现借助修改建议进步的自述与AI估分不符的经历。可尝试逐句解释和独立重写；不能从中推出AI总是偏严或固定加0.5分。",
      "sourceIds": [
        "reddit-writing-feedback-compare-2026"
      ]
    },
    {
      "title": "技巧、词汇量或练习数量都不能单独解释结果",
      "synthesis": "一些经验包含固定词汇门槛、只考技巧、按选项分布猜题等主张。本站不采用这些泛化；错因分析应能回到题目要求、原文依据和自己的输出。",
      "sourceIds": [
        "zhihu-case",
        "bili-experience-nonzero-2023",
        "bili-reading-error-log-2023",
        "bili-reading-error-log-pang-2023"
      ]
    }
  ],
  "suggestedSequence": [
    "先选一篇与自己起点接近的经验，标出不同之处",
    "选一个具体问题，做一次小任务并保留首份答案或作品",
    "用原文、官方答案或评分维度复盘，再尝试自行修正",
    "换未练过的材料，在适当的限时条件下检查是否能独立完成",
    "临近考试时另做一次日程、地点和设备使用检查"
  ],
  "sequenceLabel": "编辑建议，可按自身情况调整；不是从这些案例验证出的最佳学习顺序",
  "limitations": [
    "成绩均未在本轮独立验证；自报结果不等于方法造成结果",
    "推荐案例和参考案例的证据分量不同；引用某个可用细节不等于推荐整篇方法",
    "视频、图片与评论未读部分按各篇现有记录保留，不因综合归纳而改为已读",
    "历史考试流程不替代当前官方规定"
  ]
};
const topics={all:'全部问题',start:'从哪里开始',input:'听读怎么练',output:'写说怎么练',timing:'时间与考场复盘'};
const topicIds={start:['experience-c2','experience-85','zhihu-case','bili-experience-nonzero-2023','tahsin-high-baseline-2022'],input:['experience-c2','experience-85','bili-experience-math-2025','bili-reading-error-log-2023','bili-reading-error-log-pang-2023','v2ex-first-attempt-reflection-2023'],output:['experience-c2','experience-85','zhihu-case','bili-experience-nonzero-2023','bili-experience-math-2025','tahsin-high-baseline-2022','reddit-writing-feedback-compare-2026','ielts-esther-timing-2025','ielts-ramadhanight-2025'],timing:['bili-experience-math-2025','tahsin-high-baseline-2022','ielts-esther-timing-2025','ielts-ramadhanight-2025','v2ex-first-attempt-reflection-2023']};
const legacy={
 'experience-c2':{baseline:'作者自报已有 C2 与长期英语使用背景',training:['限时练习、段落概括和修改作文'],duration:'自报约四周',outcome:'作者自报总分8.5，未独立核验',limit:'四周是该作者的备考窗口，不能照搬为普通起点的提分周期。'},
 'experience-85':{baseline:'长期参与演讲与辩论；不是未接触英语的起点',training:['分段听力训练可用于小任务试验'],duration:'自报约一周半',outcome:'作者自报 L9/R8.5/W7.5/S8.5，未独立核验',limit:'排斥官方资源、追求超长作文等个体意见不作为统一建议。'},
 'zhihu-case':{baseline:'听读与输出表现不均；完整初始能力记录不足',training:['错因反馈与题型训练'],duration:'自述课程学习横跨约一年、集中复习约一月',outcome:'案例自报总分8，未独立核验',limit:'含课程推广；成绩不能证明课程因果效果，不采信固定词汇量门槛。'}
};
function selectCases(resources,topic='all',scope='recommended'){return resources.filter(r=>r.sourceType==='experience'&&(scope==='all'||scope==='reference'&&r.recommendedByDefault===false||scope==='recommended'&&r.recommendedByDefault!==false)&&(topic==='all'||topicIds[topic]?.includes(r.id)));}
function caseContent(r){const old=legacy[r.id]||{};return{baseline:r.authorContext?.baseline||old.baseline||'未披露可靠起点',training:r.actionableMethods||old.training||['尚缺可核验的具体练习动作'],duration:r.authorContext?.preparationDuration||old.duration||'有效投入时数未披露',outcome:r.authorContext?.outcome||old.outcome||'未取得可核验的结果说明',limit:r.caution||r.selectionReason||old.limit||'仅是个人过程记录，无法证明方法造成结果。',comments:r.commentsReview?Object.entries(r.commentsReview).filter(([key])=>key!=='status').map(([,value])=>String(value)):['原有记录未注明评论核读范围；不声称已核读评论或后续。']};}
function render(catalog,host){
 let topic='all',scope='recommended';const doc=host.ownerDocument||document;
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const items=(values,tag='ul')=>{const n=el(tag);values.forEach(v=>n.append(el('li','',v)));return n;};
 const sources=(ids)=>{const div=el('div','experience-source-links');ids.forEach(id=>{const r=catalog.resources.find(r=>r.id===id);if(r){const link=el('a','',r.title+(r.recommendedByDefault===false?' · 参考案例':' · 推荐阅读')+' · 看详情');link.href='#experience-case-'+id;link.addEventListener('click',event=>{event.preventDefault();topic='all';scope=r.recommendedByDefault===false?'reference':'recommended';update();const card=host.querySelector?.('[data-case-id="'+id+'"]');if(card){const details=card.querySelector?.('details');if(details)details.open=true;card.scrollIntoView?.({block:'start'});}});div.append(link);}});return div;};
 const intro=el('section','experience-synthesis');intro.append(el('p','eyebrow','12篇经验综合 · 5篇推荐阅读 / 7篇参考案例'),el('h3','',overview.headline),el('p','card-summary',overview.summary));
 const scopeDetail=el('details','coverage-details');scopeDetail.append(el('summary','','这份综合依据什么？查看范围与限制'));const scopeBody=el('div','detail-body');scopeBody.append(el('p','',overview.scope),items(overview.limitations));scopeDetail.append(scopeBody);intro.append(scopeDetail);
 const group=(title,records)=>{const detail=el('details','coverage-details');detail.append(el('summary','',title));const body=el('div','detail-body');records.forEach(record=>{const section=el('section','evidence-conflict');section.append(el('h4','',record.title),el('p','',record.synthesis),sources(record.sourceIds));body.append(section);});detail.append(body);return detail;};
 intro.append(group('共同主题：这些案例能提醒什么？（4项）',overview.themes),group('分歧与不能照搬的建议（3项）',overview.disagreements));
 const actions=el('details','coverage-details');actions.append(el('summary','','我现在可以试哪一步？'));const actionBody=el('div','detail-body');actionBody.append(el('p','evidence-label',overview.sequenceLabel),items(overview.suggestedSequence,'ol'));const plan=el('a','secondary-button','把下一步安排进今天');plan.href='#path';actionBody.append(plan);actions.append(actionBody);intro.append(actions);
 const controls=el('div','experience-controls'),question=el('label');question.append(el('span','','你现在遇到什么问题？'));const topicSelect=el('select');topicSelect.id='experience-topic';Object.entries(topics).forEach(([value,text])=>{const o=el('option','',text);o.value=value;topicSelect.append(o);});question.append(topicSelect);const scopeLabel=el('label');scopeLabel.append(el('span','','案例范围'));const scopeSelect=el('select');scopeSelect.id='experience-scope';[['recommended','推荐阅读的经验'],['reference','参考案例（非推荐）'],['all','全部经验（含参考）']].forEach(([value,text])=>{const o=el('option','',text);o.value=value;scopeSelect.append(o);});scopeLabel.append(scopeSelect);controls.append(question,scopeLabel);const count=el('p','experience-count');count.setAttribute('role','status');const cards=el('div','experience-cards');
 function card(r){const c=caseContent(r),article=el('article','experience-card');article.dataset.caseId=r.id;article.id='experience-case-'+r.id;article.append(el('p',r.recommendedByDefault===false?'reference-label':'source-tag experience',r.recommendedByDefault===false?'参考案例 · 非默认推荐':'个人经验 · 可借鉴过程'),el('h3','',r.title),el('p','provider',r.provider));
 const snapshot=el('dl','case-snapshot');[['起点',c.baseline],['具体训练',c.training.slice(0,2).join('；')],['自报结果',c.outcome]].forEach(([label,value])=>{snapshot.append(el('dt','',label),el('dd','',value));});article.append(snapshot);
 const detail=el('details','experience-detail');detail.append(el('summary','','展开可借鉴动作、限制与原帖'));
 const body=el('div','detail-body');body.append(el('h4','','可借鉴的动作'),items(c.training),el('p','','投入时长：'+c.duration),el('h4','','适用限制'),el('p','',c.limit));if(r.excludeFromGeneralGuidance?.length)body.append(items(r.excludeFromGeneralGuidance));if(r.commercialDisclosure)body.append(el('p','','商业关系：'+r.commercialDisclosure));else if(r.commercial)body.append(el('p','','商业关系：原文含课程或推广信息，不能据此认定服务效果。'));
 body.append(el('h4','','原帖与评论的核读边界'),el('p','',r.evidenceScope||'核读范围待补'),items(c.comments),el('p','checked','发表：'+(r.publishedAt||'未标明')+' · 核读：'+(r.checkedAt||'待补')));
 try{const url=new URL(r.url);if(url.protocol==='https:'){const link=el('a','resource-link','最后，阅读原帖与回复 ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}}catch{}
 detail.append(body);article.append(detail);return article;}
 function update(){topicSelect.value=topic;scopeSelect.value=scope;const chosen=selectCases(catalog.resources,topic,scope);count.textContent=chosen.length+'篇 · '+topics[topic]+' · '+(scope==='recommended'?'推荐阅读，不代表保证有效':scope==='reference'?'仅作比较和复盘参考':'含明确标注的参考案例');cards.replaceChildren(...chosen.map(card));if(!chosen.length)cards.append(el('p','notice','这个范围暂无合适案例。可换一个问题，或主动查看“参考案例”；参考不等于推荐。'));}
 topicSelect.addEventListener('change',()=>{topic=topicSelect.value;update();});scopeSelect.addEventListener('change',()=>{scope=scopeSelect.value;update();});host.replaceChildren(intro,controls,count,cards);update();
}
const api={overview,topics,topicIds,selectCases,caseContent,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.IELTSExperience=api;
})(typeof window!=='undefined'?window:globalThis);
