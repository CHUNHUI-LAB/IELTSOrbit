(function (root) {
  'use strict';
  const labels = {
    sourceType: {official:'官方', teacher:'教师 / 教学平台', experience:'考生经验'},
    skills: {listening:'听力', reading:'阅读', writing:'写作', speaking:'口语', general:'综合 / 考试信息', vocabulary:'词汇'},
    levels: {foundation:'打基础', developing:'进阶练习', advanced:'精细提升'},
    price: {free:'免费', mixed:'免费与付费', paid:'付费'},
    access: {open:'可直接访问', account:'需要账户', varies:'以来源页为准'}
  };
  const asArray = value => Array.isArray(value) ? value.filter(v=>typeof v==='string') : typeof value === 'string' ? [value] : [];
  const safeUrl = value => {try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch {return null;}};
  const cleanResources = list => (Array.isArray(list) ? list : []).filter(r => r && typeof r.id==='string' && typeof r.title==='string' && safeUrl(r.url)).map(r => ({...r, url:safeUrl(r.url),skills:asArray(r.skills),levels:asArray(r.levels)}));
  function normalizeCatalog(data) {
    const skillMap={'听力':'listening','阅读':'reading','写作':'writing','口语':'speaking','入门':'general','词汇':'vocabulary'};
    const levelMap={'入门':'foundation','提升':'developing','冲刺':'advanced'};
    const resources=cleanResources(data.resources).map(r=>{
      const priceLabel=r.price,accessLabel=r.access;
      const price=['free','mixed','paid'].includes(r.price)?r.price:/免费/.test(r.price)?(/付费|报名权益/.test(r.price)?'mixed':'free'):'paid';
      const access=['open','account','varies'].includes(r.access)?r.access:/注册|会员/.test(r.access)?'account':/公开/.test(r.access)?'open':'varies';
      return {...r,skills:r.skills.map(s=>skillMap[s]||s),levels:r.levels.map(s=>levelMap[s]||s),price,access,priceLabel,accessLabel};
    });
    const meta=data.metadata||data.meta||{};
    const calendar=data.calendar;
    return {meta:{...meta,bookingUrl:calendar?.bookingUrl||meta.bookingUrl},resources,policies:(data.policies||[]).map(p=>({...p,summary:p.text||p.summary||p.body})),centers:(data.centers||[]).map(c=>({...c,url:c.sourceUrl||c.url,notes:c.caveat||c.notes})),calendars:calendar?[{...calendar,title:calendar.title,summary:calendar.note,url:calendar.bookingUrl,checkedAt:calendar.checkedAt,linkLabel:'查询官方当期安排',announcementUrl:calendar.announcementUrl}]:data.calendars||[],coverage:data.coverage||[],methodology:data.methodology||{},evidenceReview:data.evidenceReview||{}};
  }
  function filterResources(resources, filters, saved) {
    const query = String(filters.query||'').trim().toLocaleLowerCase();
    return resources.filter(resource => {
      if (filters.recommendation==='recommended' && resource.recommendedByDefault===false) return false;
      if (filters.recommendation==='reference' && resource.recommendedByDefault!==false) return false;
      if (filters.savedOnly && !saved.includes(resource.id)) return false;
      for (const key of ['sourceType','price','access']) {if (filters[key] && filters[key]!=='all' && resource[key]!==filters[key]) return false;}
      if (filters.skill && filters.skill!=='all' && !resource.skills.includes(filters.skill)) return false;
      if (filters.level && filters.level!=='all' && !resource.levels.includes(filters.level)) return false;
      const text = [resource.title,resource.provider,resource.summary,resource.collection,resource.caution,...(resource.actionableMethods||[]),labels.sourceType[resource.sourceType],...resource.skills.map(s=>labels.skills[s]||s),...(resource.tags||[])].join(' ').toLocaleLowerCase();
      return !query || text.includes(query);
    });
  }
  function readState(raw) {
    const blank={saved:[],path:null};
    if (!raw) return blank;
    try {const parsed=JSON.parse(raw); return {saved:Array.isArray(parsed.saved)?[...new Set(parsed.saved.filter(s=>typeof s==='string' && s.length<120))].slice(0,200):[],path:parsed.path && typeof parsed.path==='object' && ('dailyMinutes' in parsed.path || 'examHistory' in parsed.path)?normalizePlan(parsed.path):parsed.path && ['unknown','5.5','6','6.5'].includes(parsed.path.baseline) && ['6.5','7','7.5'].includes(parsed.path.target)?{baseline:parsed.path.baseline,target:parsed.path.target}:null};}catch{return blank;}
  }
  function getPath(baseline,target) {
    const validBaseline=['unknown','5.5','6','6.5'].includes(baseline)?baseline:'unknown';
    const validTarget=['6.5','7','7.5'].includes(target)?target:'7';
    const first={
      unknown:{title:'先做完整测评，找到起点',body:'选官方样题，按规定时间完成听力与阅读；写作和口语保留原始作品，对照评分标准寻求具体反馈。先了解各科差异，再决定把时间放在哪里。'},
      '5.5':{title:'先补反复影响理解的基础',body:'从错题和表达中找出高频词汇、句法与听辨问题。用短篇材料精读、复述和纠错，再回到完整任务确认问题是否减少。'},
      '6':{title:'把失分点变成专项训练',body:'按题型与错因归类练习记录；写作和口语每次只选一个具体指标改进，例如论证展开、信息组织或表达准确度。'},
      '6.5':{title:'用评分标准定位不稳定项',body:'检查同类任务中反复出现的问题，尤其是论证、语篇衔接、用词准确性与表达连贯性。通过复做和针对性反馈确认改进，而不是只增加题量。'}
    };
    const second={title:'练习、反馈、修订，再复做',body:'每次练习留下一份可比较的记录：哪里错、为什么错、怎样改。写作保留初稿与修订稿；口语录音后按标准回听；听读复盘原文依据，避免只记答案。'};
    const third={title:validTarget==='7.5'?'把高标准放进稳定的表现里':'用完整限时练习检查稳定性',body:validTarget==='7.5'?'关注复杂任务中的准确性、清晰度与自然表达，同时持续核对每一项评分要求。高目标不能替代测评；用多次作品和限时练习判断当前表现。':'定期完成完整限时任务，检查时间分配与各科表现。遇到波动，回到对应错因做专项训练；准备报名时，再核对目标项目的总分、单项和有效期要求。'};
    return {baseline:validBaseline,target:validTarget,lede:validBaseline==='unknown'?'不急着估分。先建立一份真实的基线。':`以约 ${Number(validBaseline).toFixed(1)} 为练习参考，先处理最常见、最影响表现的问题。`,steps:[first[validBaseline],second,third],caveat:'这些步骤是可调整的学习建议，不是提分承诺。任何参考分数都不能替代正式考试或完整、可靠的能力评估。'};
  }
  const learningGuides={
    listening:{title:'听力',focus:'先区分“没有听懂”和“听懂却没写对”，再做下一段。',mistakes:['没识别连读、词形或同义表达','跟丢信息位置，后面的题也受影响','拼写、单复数或字数要求出错'],order:['先熟悉题型与作答要求','做一小段，保留第一遍答案','对照原文找错因，再换新材料检验'],methodTitle:'一段音频的三轮练习',steps:['第一遍按材料要求完成作答，标出不确定的位置，不把反复重听的成绩当作模拟成绩。','核对答案后回到对应原文：是词不认识、声音没辨出、信息没跟上，还是答案写错？只选一种问题处理。','针对问题重听并记录一个提醒；下一次换未练过的片段，检查同类错误是否减少。'],output:'留下第一遍答案、一个具体错因和下一次验证动作。',resources:['official-samples','bc-mocks','bili-experience-math-2025'],basis:'练习循环为编辑整理；官方样题用于核对题型，个人复盘仅提醒“精听与模拟要分开记录”，不是方法有效性的证明。'},
    reading:{title:'阅读',focus:'先找原文依据，再解释为什么选这个答案。',mistakes:['定位错段或只匹配同一个单词','没读清题干限制、否定或范围','把原文没说的内容推成自己的判断'],order:['先看题型和答案要求','小组练习并圈出证据句','把定位错、理解错与时间问题分开复盘'],methodTitle:'把一题拆成“题干—证据—判断”',steps:['完成一组题，记录耗时和当时的选择理由；先独立判断，再看答案。','每题写出原文依据：题干问什么、证据句说什么、两者如何对应。找不到依据时不要只背解析。','把错误分为定位、理解或作答要求；选择一个检查动作，在新题里验证。'],output:'留下至少一道错题的证据句、误读点和下次检查动作。',resources:['official-samples','bc-mocks','computer'],basis:'错因分类和练习顺序为编辑建议；官方样题与答案用于核对。考生日志可借鉴记录方式，不能替代官方答案。'},
    writing:{title:'写作',focus:'写出初稿，拿到具体反馈，然后自己重写。',mistakes:['写了相关内容，却没有完整回应题目','论点有了，但解释或例子没说明为什么','只看懂修改，没有在新题中独立使用'],order:['先读官方评分维度','完成一份初稿并定位一两个问题','重写后换题，检查是否会独立应用'],methodTitle:'初稿 → 反馈 → 重写 → 新题检验',steps:['保留初稿，标注是否计时、有无提纲或自动纠错。基础不稳时可以先写一个完整段落。','参照官方评分维度，请反馈指出具体句段和理由。一次优先处理一两类反复出现的问题。','自己重写并解释修改理由，再用新题独立写一段。保留前后版本，不用高级词或AI估分替代检查。'],output:'留下一段初稿、一条有依据的反馈、一段独立重写。',resources:['writing-rubric','all-rubrics','levinson-error-diaries-2006'],basis:'评分维度来自官方资料；本循环综合教学建议与纠错日志思路，是编辑训练建议，不是经验证的个性化提分方案。'},
    speaking:{title:'口语',focus:'实际开口并录下来，比在脑中想“我会说”更有用。',mistakes:['回答偏离问题，或观点没有展开','只关注连接词，忽略清晰和自然表达','背熟答案后表现流利，换题却难以继续'],order:['先了解评分与三部分流程','录一段真实回答','回听一个问题，换新题再说'],methodTitle:'一次录音，只修一个问题',steps:['选一个题目，用自己的经历和观点回答并录音；不先背完整稿。练习方法与考试规定的时间要分开。','回听是否回应问题、是否清晰自然，找一个可观察的问题，例如回答太短或重复停顿。','针对问题调整后，用不同题目再回答。需要完整模拟时，再与搭档连续完成三部分。'],output:'保留一次录音、一条改进重点和下一次新题录音。',resources:['bc-speaking-record-review','idp-speaking-plan-timing','all-rubrics'],basis:'官方资料支持连续模拟、录音与回听；这里的练习顺序和时间分配是编辑建议，不保证成绩。'}
  };
  function normalizePlan(value){
    const v=value||{};return {examHistory:['yes','no','unknown'].includes(v.examHistory)?v.examHistory:'unknown',baseline:['unknown','5.5','6','6.5'].includes(v.baseline)?v.baseline:'unknown',target:['unknown','6.5','7','7.5'].includes(v.target)?v.target:'unknown',dailyMinutes:['15','30','60','90'].includes(String(v.dailyMinutes))?String(v.dailyMinutes):'30',weakSkill:Object.hasOwn(learningGuides,v.weakSkill)?v.weakSkill:'unknown',completed:v.completed===true};
  }
  function buildPlan(value){
    const choices=normalizePlan(value),minutes=Number(choices.dailyMinutes),priority=choices.weakSkill==='unknown'?'listening':choices.weakSkill;
    const skills=[priority,...Object.keys(learningGuides).filter(s=>s!==priority)],setup=minutes===15?3:5,review=minutes===15?3:minutes===30?5:10,practice=minutes-setup-review;
    const days=[{day:1,skill:priority,title:choices.examHistory==='yes'?'整理一次旧练习，选一个问题':'熟悉题型，留下一份起点记录'}, {day:2,skill:priority,title:'把优先项再练一次'}, {day:3,skill:skills[1],title:'观察另一科的具体困难'}, {day:4,skill:skills[2],title:'练到一次真实输出或作答'}, {day:5,skill:skills[3],title:'补齐本周四科观察'}, {day:6,skill:priority,title:'换新材料，检查能否独立完成'}, {day:7,skill:priority,title:'回看记录，决定下周怎么改'}];
    return {choices,minutes,priority,days,today:[{title:choices.examHistory==='yes'?'找一份旧记录，确定今天的问题':'先看题型与方法，明确今天做什么',minutes:setup,skill:priority,body:choices.examHistory==='yes'?'打开最近一次练习或成绩记录，只选一个自己能说明白的问题。没有记录时，先看一份官方样题。':'在站内阅读这科的练习步骤，再打开一份官方样题看清作答要求。今天不用做完整测评。',resource:'official-samples'}, {title:'完成一个小任务，保留第一份答案',minutes:practice,skill:priority,body:learningGuides[priority].steps[0]+' 这段时间不够完成整项时，做一个短片段即可。',resource:learningGuides[priority].resources[0]}, {title:'写下一条错因和明天的动作',minutes:review,skill:priority,body:learningGuides[priority].output,resource:learningGuides[priority].resources[1]}],note:'这是一份按你的时间与优先项编排的可调建议，不是科学验证的个性化方案；不预测分数，也不替你决定首考日期。'};
  }
  function parseRoute(hash){const parts=String(hash||'').replace(/^#/,'').split('/');const experienceCase=/^experience-case-(.+)$/.exec(parts[0])?.[1]||null;const tab=experienceCase?'experience':['start','library','experience','path','exams'].includes(parts[0])?parts[0]:'start';return{tab,experienceCase,skill:tab==='library'&&Object.hasOwn(learningGuides,parts[1])?parts[1]:null,resource:tab==='library'&&parts[2]==='resource'?parts[3]||null:null,planStep:tab==='path'&&parts[1]==='step'&&/^[1-4]$/.test(parts[2])?Number(parts[2]):null,planResult:tab==='path'&&parts[1]==='result'};}

  const api={labels,asArray,safeUrl,cleanResources,normalizeCatalog,filterResources,readState,getPath,learningGuides,normalizePlan,buildPlan,parseRoute};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.IELTSCore=api;
})(typeof window!=='undefined'?window:globalThis);
