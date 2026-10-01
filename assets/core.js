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
    return {meta:{...meta,bookingUrl:calendar?.bookingUrl||meta.bookingUrl},resources,policies:(data.policies||[]).map(p=>({...p,summary:p.text||p.summary||p.body})),centers:(data.centers||[]).map(c=>({...c,url:c.sourceUrl||c.url,notes:c.caveat||c.notes})),calendars:calendar?[{title:calendar.title,summary:calendar.note,url:calendar.bookingUrl,checkedAt:calendar.checkedAt,linkLabel:'查询官方当期安排',announcementUrl:calendar.announcementUrl}]:data.calendars||[],coverage:data.coverage||[],methodology:data.methodology||{},evidenceReview:data.evidenceReview||{}};
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
    try {const parsed=JSON.parse(raw); return {saved:Array.isArray(parsed.saved)?[...new Set(parsed.saved.filter(s=>typeof s==='string' && s.length<120))].slice(0,200):[],path:parsed.path && ['unknown','5.5','6','6.5'].includes(parsed.path.baseline) && ['6.5','7','7.5'].includes(parsed.path.target)?{baseline:parsed.path.baseline,target:parsed.path.target}:null};}catch{return blank;}
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
  const api={labels,asArray,safeUrl,cleanResources,normalizeCatalog,filterResources,readState,getPath};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.IELTSCore=api;
})(typeof window!=='undefined'?window:globalThis);
