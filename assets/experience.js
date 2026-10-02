(function(root){
'use strict';
const overview={
  "scope": "基于本站24篇经验的核读记录整理：6篇推荐阅读、18篇参考案例，经验页默认全部展示。本轮新增7篇均为参考，其完整可提取正文已重新核读；原17篇沿用已披露的核读边界。本轮没有重新核验任何成绩，也未完整观看外链视频或体验课程；未读评论与图片继续逐篇注明。",
  "headline": "先看起点，再看练习过程；把经验变成可检查的下一步",
  "summary": "先辨认起点、实际输出与仍未解决的问题：短期高分可能伴随长期积累，在职与全职、日历跨度与训练时数不能混算。新案例补入多次5.5、写作反复停滞、总分提高而单科无净提升，以及尚未达标的结局。可借鉴的是留下真实初稿或录音、定位具体问题、复练并换题检查；这些是本站建议，不证明课程、AI、次数或备考时长决定结果。",
  "themes": [
    {
      "title": "备考天数相近，起点可能完全不同",
      "synthesis": "长期英语积累、听读较强但输出弱、久未使用英语，与前三次总分5.5不是同一起点。七考博客的五年含停考及后段全职，口语重考案例的半年含低频周末与请假。先分开既有能力、日历跨度和实际训练，不能把末轮20天或半年换算成自己的提分周期。",
      "sourceIds": [
        "experience-c2",
        "experience-85",
        "zhihu-case",
        "bili-experience-nonzero-2023",
        "tahsin-high-baseline-2022",
        "linuxdo-work-gap-study-2026",
        "ptt-repeated-writing-attempts-2018",
        "csdn-four-attempts-output-gap-2020",
        "siang-long-gap-writing-time-2024",
        "mudlady-seven-attempts-writing-output-2023",
        "sunny-working-speaking-osr-2025"
      ]
    },
    {
      "title": "会做和能按时做完，要分别验证",
      "synthesis": "暂停重听、脑中构思、反复修改的正确率可能掩盖限时问题。Dcard作者先熟悉题型再整套计时，LINUX DO作者到考场才暴露用时遗漏，久未用英语的博客作者另练Task 1速度。可分开记录完成度、质量与耗时；个人15分钟目标不是通用配时规定。",
      "sourceIds": [
        "bili-experience-math-2025",
        "ielts-esther-timing-2025",
        "tahsin-high-baseline-2022",
        "ielts-ramadhanight-2025",
        "dcard-working-dictation-review",
        "linuxdo-work-gap-study-2026",
        "siang-long-gap-writing-time-2024"
      ]
    },
    {
      "title": "复盘要解释错误，不能只记分数",
      "synthesis": "阅读日志保留定位与误读，CSDN作者开始区分错因；Dcard作者描述对照听力文本，Candice案例与七考博客提供反馈修改或交初稿的过程。本站建议保留首稿、解释改动，再换材料独立检查；不表示这些作者全部执行了这套流程。",
      "sourceIds": [
        "bili-reading-error-log-2023",
        "bili-reading-error-log-pang-2023",
        "reddit-writing-feedback-compare-2026",
        "zhihu-case",
        "dcard-working-dictation-review",
        "candice-working-rewrite-case",
        "csdn-four-attempts-output-gap-2020",
        "mudlady-seven-attempts-writing-output-2023"
      ]
    },
    {
      "title": "日程、题型熟悉度和语言能力是不同问题",
      "synthesis": "首考复盘提醒核对到场与各科时间，三考Reddit案例另调整路程、休息与模拟时段。分清没看懂、题型不熟、时间不足和考试日执行条件；考官反应或一次状态变化不能预测分数，也不能量化为固定分差。",
      "sourceIds": [
        "v2ex-first-attempt-reflection-2023",
        "ielts-ramadhanight-2025",
        "linuxdo-work-gap-study-2026",
        "reddit-three-attempts-conditions-writing-flat-2026"
      ]
    },
    {
      "title": "在职与反复应考，需要看每阶段实际发生了什么",
      "synthesis": "在职案例的条件各异：有人低频周末学习，有人考前请假，有人后段已转全职；新PTT案例还是弹性工时。密集重考可能挤压练习与恢复，但这些自述不能决定每个人的考试间隔。记录阶段条件、已做的改动及未解决的问题，不只比较月份和次数。",
      "sourceIds": [
        "dcard-working-dictation-review",
        "linuxdo-work-gap-study-2026",
        "candice-working-rewrite-case",
        "ptt-repeated-writing-attempts-2018",
        "ptt-working-four-tests-speaking-gap-2025",
        "mudlady-seven-attempts-writing-output-2023",
        "sunny-working-speaking-osr-2025"
      ]
    },
    {
      "title": "总分达标，不表示每个单项都达到自己的要求",
      "synthesis": "小红书作者总分7而口语5.5；新PTT作者写作到7.5、口语仍为5.5–6；三考Reddit作者总分提高但写作没有净提升。另有写作连续5.5且尚无后续结果的求助帖。总分、单项、用途门槛要分开记录，口语重考6.5也不能被写成已满足文中“>6.5”要求。",
      "sourceIds": [
        "xiaohongshu-self-study-single-skill-gap-2025",
        "linuxdo-work-gap-study-2026",
        "ptt-repeated-writing-attempts-2018",
        "csdn-four-attempts-output-gap-2020",
        "ptt-working-four-tests-speaking-gap-2025",
        "sunny-working-speaking-osr-2025",
        "reddit-writing55-unresolved-thread-2026",
        "reddit-three-attempts-conditions-writing-flat-2026"
      ]
    },
    {
      "title": "先分清没有输出、缺少诊断和限时不稳",
      "synthesis": "CSDN作者承认只分析范文而没有独立作文；七考博客后来主动提交初稿和提纲；另一博客单独处理完成速度。写作5.5求助帖没有足够训练细节，不能替作者诊断病因。相同分数可以对应不同待查问题，先拿出作品和用时记录。",
      "sourceIds": [
        "csdn-four-attempts-output-gap-2020",
        "siang-long-gap-writing-time-2024",
        "mudlady-seven-attempts-writing-output-2023",
        "reddit-writing55-unresolved-thread-2026"
      ]
    },
    {
      "title": "口语反馈要落到可观察的问题",
      "synthesis": "口语6到6.5的作者提到时态、重复词与停顿，并建议回听录音或转写；三考作者建议准备要点与例子。本站据此提出“录音、定位一个问题、再回答、换题检查”，这是编辑练习建议，不能当作各作者共同执行过的已验证方案。",
      "sourceIds": [
        "sunny-working-speaking-osr-2025",
        "reddit-three-attempts-conditions-writing-flat-2026"
      ]
    }
  ],
  "disagreements": [
    {
      "title": "先写哪篇、先做哪类题，没有从这些案例得出的统一最优顺序",
      "synthesis": "部分作者倾向先写某篇作文，Dcard作者另有个人阅读顺序；其他复盘则显示修改过久或前篇耗时导致最后来不及。这些个案没有建立统一最优顺序，应在自己的整套限时记录中比较，不能仅因作者达标就照搬。",
      "sourceIds": [
        "experience-85",
        "bili-experience-nonzero-2023",
        "bili-experience-math-2025",
        "ielts-esther-timing-2025",
        "dcard-working-dictation-review",
        "linuxdo-work-gap-study-2026"
      ]
    },
    {
      "title": "预估分与正式结果可能一致，也可能不同",
      "synthesis": "既有案例的教师或AI估分有吻合也有不符；新博客记录教师判断与正式写作结果的差距。写作5.5讨论里谈AI估分的删除账号身份无法与楼主关联，不能合成轨迹。估分只可提出待核查问题，不给统一偏移，也不由差距断言工具导致低分。",
      "sourceIds": [
        "reddit-writing-feedback-compare-2026",
        "linuxdo-work-gap-study-2026",
        "dcard-working-dictation-review",
        "siang-long-gap-writing-time-2024",
        "sunny-working-speaking-osr-2025",
        "reddit-writing55-unresolved-thread-2026"
      ]
    },
    {
      "title": "技巧、词汇量或练习数量都不能单独解释结果",
      "synthesis": "一些经验包含固定词汇门槛、只考技巧、按选项分布猜题等主张；新自学案例还提到个人每日背词量与AI练习。本站不把这些定额或工具与分数绑定，也不采纳保证性说法。错因分析应能回到题目要求、原文依据和自己的输出。",
      "sourceIds": [
        "zhihu-case",
        "bili-experience-nonzero-2023",
        "bili-reading-error-log-2023",
        "bili-reading-error-log-pang-2023",
        "linuxdo-work-gap-study-2026",
        "dcard-working-dictation-review",
        "ptt-repeated-writing-attempts-2018",
        "xiaohongshu-self-study-single-skill-gap-2025",
        "csdn-four-attempts-output-gap-2020",
        "ptt-working-four-tests-speaking-gap-2025",
        "siang-long-gap-writing-time-2024",
        "reddit-three-attempts-conditions-writing-flat-2026"
      ]
    },
    {
      "title": "付费反馈有过程可看，不能据此判断购课因果效果",
      "synthesis": "机构成功案例、教师代发经验、独立博客推荐课程，商业背景不同。标题“无补习”的口语复盘实际含约10堂付费课。可看反馈是否具体、学习者是否真实输出，不用单个成绩变化认定课程效果，更不据此推广教师或服务。",
      "sourceIds": [
        "candice-working-rewrite-case",
        "ptt-repeated-writing-attempts-2018",
        "dcard-working-dictation-review",
        "zhihu-case",
        "ptt-working-four-tests-speaking-gap-2025",
        "mudlady-seven-attempts-writing-output-2023",
        "sunny-working-speaking-osr-2025"
      ]
    },
    {
      "title": "尚未达标的故事同样值得保留",
      "synthesis": "新PTT案例与写作5.5求助帖保留发帖时尚未解决的状态，三考复盘保留写作没有净提升。这些案例帮助发现问题和边界，既不能补造后来成功，也不能据其结果证明某种方法无效。",
      "sourceIds": [
        "ptt-working-four-tests-speaking-gap-2025",
        "reddit-writing55-unresolved-thread-2026",
        "reddit-three-attempts-conditions-writing-flat-2026"
      ]
    },
    {
      "title": "已删除的评论账号不能自动归到楼主",
      "synthesis": "写作5.5主帖与“写了上百篇、AI给6–6.5”的回应都显示已删除，本次提取没有可识别的OP标记。本站保留评论来源链接和身份不明限制，主帖只记录已明确披露的结果。",
      "sourceIds": [
        "reddit-writing55-unresolved-thread-2026"
      ]
    }
  ],
  "suggestedSequence": [
    "先记录自己的起点、四科差距与每周可用时间，再选一篇条件相近的案例",
    "选一个具体问题，保留本周一份无辅助初稿、答案或录音，并记实际耗时",
    "用原文、官方答案或评分维度复盘，再尝试自行修正",
    "换未练过的材料，在适当的限时条件下检查是否能独立完成",
    "临近考试时另做一次日程、地点和设备使用检查"
  ],
  "sequenceLabel": "编辑建议，可按自身情况调整；不是从这些案例验证出的最佳学习顺序",
  "limitations": [
    "成绩均未在本轮独立验证；自报结果和时间先后不等于方法造成结果",
    "这些是选择性收录的公开自述，不代表考生总体，也不能计算成功率或提分概率",
    "推荐案例和参考案例的证据分量不同；引用某个细节不等于推荐整篇方法或文中课程",
    "个人帖子中的教师推荐与机构发布的案例均单独披露商业背景；没有独立评估服务效果",
    "视频、图片与评论未读部分按各篇记录保留，不因综合归纳而改为已读",
    "历史考试流程、纸笔誊写技巧和费用不替代当前官方规定",
    "低起点长期追踪仍不足：4.5主要来自标题，缺完整分项链；没有据此声称已覆盖所有基础",
    "缺少夜班、照护和预算受限者的细致时间日志，以及低分持续未达标的长期后续",
    "本批未新增B站、知乎独立原帖、小红书或贴吧正文；搜索候选不计为核读覆盖"
  ]
};
const topics={all:'全部问题',start:'从哪里开始',input:'听读怎么练',output:'写说怎么练',timing:'时间与考场复盘'};
const topicIds={"start":["experience-c2","experience-85","zhihu-case","bili-experience-nonzero-2023","tahsin-high-baseline-2022","linuxdo-work-gap-study-2026","dcard-working-dictation-review","candice-working-rewrite-case","ptt-repeated-writing-attempts-2018","xiaohongshu-self-study-single-skill-gap-2025","csdn-four-attempts-output-gap-2020","ptt-working-four-tests-speaking-gap-2025","siang-long-gap-writing-time-2024","mudlady-seven-attempts-writing-output-2023","sunny-working-speaking-osr-2025"],"input":["experience-c2","experience-85","bili-experience-math-2025","bili-reading-error-log-2023","bili-reading-error-log-pang-2023","v2ex-first-attempt-reflection-2023","linuxdo-work-gap-study-2026","dcard-working-dictation-review","xiaohongshu-self-study-single-skill-gap-2025","csdn-four-attempts-output-gap-2020","siang-long-gap-writing-time-2024"],"output":["experience-c2","experience-85","zhihu-case","bili-experience-nonzero-2023","bili-experience-math-2025","tahsin-high-baseline-2022","reddit-writing-feedback-compare-2026","ielts-esther-timing-2025","ielts-ramadhanight-2025","linuxdo-work-gap-study-2026","dcard-working-dictation-review","candice-working-rewrite-case","ptt-repeated-writing-attempts-2018","xiaohongshu-self-study-single-skill-gap-2025","csdn-four-attempts-output-gap-2020","ptt-working-four-tests-speaking-gap-2025","siang-long-gap-writing-time-2024","mudlady-seven-attempts-writing-output-2023","sunny-working-speaking-osr-2025","reddit-writing55-unresolved-thread-2026","reddit-three-attempts-conditions-writing-flat-2026"],"timing":["bili-experience-math-2025","tahsin-high-baseline-2022","ielts-esther-timing-2025","ielts-ramadhanight-2025","v2ex-first-attempt-reflection-2023","linuxdo-work-gap-study-2026","dcard-working-dictation-review","candice-working-rewrite-case","ptt-repeated-writing-attempts-2018","csdn-four-attempts-output-gap-2020","ptt-working-four-tests-speaking-gap-2025","siang-long-gap-writing-time-2024","mudlady-seven-attempts-writing-output-2023","sunny-working-speaking-osr-2025","reddit-three-attempts-conditions-writing-flat-2026"]};
const legacy={
 'experience-c2':{baseline:'作者自报已有 C2 与长期英语使用背景',training:['限时练习、段落概括和修改作文'],duration:'自报约四周',outcome:'作者自报总分8.5，未独立核验',limit:'四周是该作者的备考窗口，不能照搬为普通起点的提分周期。'},
 'experience-85':{baseline:'长期参与演讲与辩论；不是未接触英语的起点',training:['分段听力训练可用于小任务试验'],duration:'自报约一周半',outcome:'作者自报 L9/R8.5/W7.5/S8.5，未独立核验',limit:'排斥官方资源、追求超长作文等个体意见不作为统一建议。'},
 'zhihu-case':{baseline:'听读与输出表现不均；完整初始能力记录不足',training:['错因反馈与题型训练'],duration:'自述课程学习横跨约一年、集中复习约一月',outcome:'案例自报总分8，未独立核验',limit:'含课程推广；成绩不能证明课程因果效果，不采信固定词汇量门槛。'}
};
function selectCases(resources,topic='all',scope='recommended'){return resources.filter(r=>r.sourceType==='experience'&&(scope==='all'||scope==='reference'&&r.recommendedByDefault===false||scope==='recommended'&&r.recommendedByDefault!==false)&&(topic==='all'||topicIds[topic]?.includes(r.id)));}
function caseContent(r){const old=legacy[r.id]||{};return{baseline:r.authorContext?.baseline||old.baseline||'未披露可靠起点',training:r.actionableMethods||old.training||['尚缺可核验的具体练习动作'],duration:r.authorContext?.preparationDuration||old.duration||'有效投入时数未披露',outcome:r.authorContext?.outcome||old.outcome||'未取得可核验的结果说明',limit:r.caution||r.selectionReason||old.limit||'仅是个人过程记录，无法证明方法造成结果。',comments:r.commentsReview?Object.entries(r.commentsReview).filter(([key])=>key!=='status').map(([,value])=>String(value)):['原有记录未注明评论核读范围；不声称已核读评论或后续。']};}
function render(catalog,host){
 let topic='all',scope='all';const doc=host.ownerDocument||document;
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const items=(values,tag='ul')=>{const n=el(tag);values.forEach(v=>n.append(el('li','',v)));return n;};
 const sources=(ids)=>{const div=el('div','experience-source-links');ids.forEach(id=>{const r=catalog.resources.find(r=>r.id===id);if(r){const link=el('a','',r.title+(r.recommendedByDefault===false?' · 参考案例':' · 推荐阅读')+' · 看详情');link.href='#experience-case-'+id;link.addEventListener('click',event=>{if(event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();openCase(id);if(root.location)root.location.hash='#experience-case-'+id;});div.append(link);}});return div;};
 const intro=el('section','experience-synthesis');intro.append(el('p','eyebrow',selectCases(catalog.resources,'all','all').length+'篇经验综合 · '+selectCases(catalog.resources).length+'篇推荐阅读 / '+selectCases(catalog.resources,'all','reference').length+'篇参考案例'),el('h3','',overview.headline),el('p','card-summary',overview.summary));
 const scopeDetail=el('details','coverage-details');scopeDetail.append(el('summary','','这份综合依据什么？查看范围与限制'));const scopeBody=el('div','detail-body');scopeBody.append(el('p','',overview.scope),items(overview.limitations));scopeDetail.append(scopeBody);intro.append(scopeDetail);
 const group=(title,records)=>{const detail=el('details','coverage-details');detail.append(el('summary','',title));const body=el('div','detail-body');records.forEach(record=>{const section=el('section','evidence-conflict');section.append(el('h4','',record.title),el('p','',record.synthesis),sources(record.sourceIds));body.append(section);});detail.append(body);return detail;};
 intro.append(group('共同主题：这些案例能提醒什么？（'+overview.themes.length+'项）',overview.themes),group('分歧与不能照搬的建议（'+overview.disagreements.length+'项）',overview.disagreements));
 const actions=el('details','coverage-details');actions.append(el('summary','','我现在可以试哪一步？'));const actionBody=el('div','detail-body');actionBody.append(el('p','evidence-label',overview.sequenceLabel),items(overview.suggestedSequence,'ol'));const plan=el('a','secondary-button','把下一步安排进今天');plan.href='#path';actionBody.append(plan);actions.append(actionBody);intro.append(actions);
 const controls=el('div','experience-controls'),question=el('label');question.append(el('span','','你现在遇到什么问题？'));const topicSelect=el('select');topicSelect.id='experience-topic';Object.entries(topics).forEach(([value,text])=>{const o=el('option','',text);o.value=value;topicSelect.append(o);});question.append(topicSelect);const scopeLabel=el('label');scopeLabel.append(el('span','','案例范围'));const scopeSelect=el('select');scopeSelect.id='experience-scope';[['recommended','推荐阅读的经验'],['reference','参考案例（非推荐）'],['all','全部经验（含参考）']].forEach(([value,text])=>{const o=el('option','',text);o.value=value;scopeSelect.append(o);});scopeLabel.append(scopeSelect);controls.append(question,scopeLabel);const count=el('p','experience-count');count.setAttribute('role','status');const cards=el('div','experience-cards');
 function card(r){const c=caseContent(r),article=el('article','experience-card');article.dataset.caseId=r.id;article.id='experience-case-'+r.id;article.append(el('p',r.recommendedByDefault===false?'reference-label':'source-tag experience',r.recommendedByDefault===false?'参考案例 · 非默认推荐':'个人经验 · 可借鉴过程'),el('h3','',r.title),el('p','provider',r.provider),el('p','card-summary',r.summary||'此案例的摘要尚待补充，请查看已核读的作者情况与证据边界。'));
 const snapshot=el('dl','case-snapshot');[['起点',c.baseline],['建议动作',c.training.slice(0,2).join('；')],['自报结果',c.outcome]].forEach(([label,value])=>{snapshot.append(el('dt','',label),el('dd','',value));});article.append(snapshot);
 const detail=el('details','experience-detail');detail.append(el('summary','','展开可借鉴动作、限制与原帖'));
 const body=el('div','detail-body');if(r.reportedRoutine?.length)body.append(el('h4','','原文自述与作者建议'),items(r.reportedRoutine));body.append(el('h4','','本站提炼的可借鉴做法'),el('p','evidence-label','以下是本站从这篇经历中提炼的建议，不表示作者已全部执行，也不证明这些动作导致了作者的自报成绩。'),items(c.training),el('p','','原记录披露的投入时长：'+c.duration),el('h4','','适用限制'),el('p','',c.limit));if(r.excludeFromGeneralGuidance?.length)body.append(items(r.excludeFromGeneralGuidance));if(r.commercialDisclosure)body.append(el('p','','商业关系：'+r.commercialDisclosure));else if(r.commercial)body.append(el('p','','商业关系：原文含课程或推广信息，不能据此认定服务效果。'));
 body.append(el('h4','','原帖与评论的核读边界'),el('p','',r.evidenceScope||'核读范围待补'),items(c.comments),el('p','checked','发表：'+(r.publishedAt||'未标明')+' · 核读：'+(r.checkedAt||'待补')));
 if(r.sourceDateCaveat)body.append(el('p','','日期说明：'+r.sourceDateCaveat));
 if(r.discussionEvidence?.length){body.append(el('h4','','楼内讨论：身份归属与结论边界'));r.discussionEvidence.forEach(record=>{body.append(el('p','',record.claim),el('p','',record.attributionCaveat));try{const url=new URL(record.url);if(url.protocol==='https:'){const link=el('a','resource-link','查看这条评论 ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}}catch{}});}
 try{const url=new URL(r.url);if(url.protocol==='https:'){const link=el('a','resource-link','最后，阅读原帖与回复 ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}}catch{}
 detail.append(body);article.append(detail);return article;}
 function openCase(id){
  const resource=catalog.resources.find(r=>r.id===id&&r.sourceType==='experience');if(!resource)return false;
  topic='all';scope=resource.recommendedByDefault===false?'reference':'recommended';update();
  const target=host.querySelector?.('[data-case-id="'+id+'"]');if(!target)return false;
  const details=target.querySelector?.('details');if(details)details.open=true;
  target.scrollIntoView?.({block:'start'});return true;
 }
 function update(){topicSelect.value=topic;scopeSelect.value=scope;const chosen=selectCases(catalog.resources,topic,scope);count.textContent=chosen.length+'篇 · '+topics[topic]+' · '+(scope==='recommended'?'推荐阅读，不代表保证有效':scope==='reference'?'仅作比较和复盘参考':'含明确标注的参考案例');cards.replaceChildren(...chosen.map(card));if(!chosen.length)cards.append(el('p','notice','这个范围暂无合适案例。可换一个问题，或主动查看“参考案例”；参考不等于推荐。'));}
 topicSelect.addEventListener('change',()=>{topic=topicSelect.value;update();});scopeSelect.addEventListener('change',()=>{scope=scopeSelect.value;update();});host.replaceChildren(intro,controls,count,cards);update();return{openCase};
}
const api={overview,topics,topicIds,selectCases,caseContent,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.IELTSExperience=api;
})(typeof window!=='undefined'?window:globalThis);
