(function(){
'use strict';
const core=window.IELTSCore;
const $=id=>document.getElementById(id);
const key='ieltsorbit.local.v1';
let state=core.readState(null), catalog={meta:{},resources:[],policies:[],centers:[],calendars:[]}, savedOnly=false, loadFailed=false;
try{state=core.readState(localStorage.getItem(key));}catch{$('local-status').textContent='浏览器存储不可用；本次选择不会持久保存。';}
const create=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined&&text!==null)node.textContent=String(text);return node;};
function externalLink(text,url,className){const a=create('a',className,text);a.href=core.safeUrl(url)||'https://ielts.neea.cn/';a.target='_blank';a.rel='noopener noreferrer';return a;}
function persist(message){try{localStorage.setItem(key,JSON.stringify(state));if(message)$('local-status').textContent=message;return true;}catch{$('local-status').textContent='浏览器不允许保存；这些选择只在当前页面暂存。';return false;}}
function getFilters(){return{recommendation:$('recommendation-filter').value,query:$('search').value,sourceType:$('source-filter').value,skill:$('skill-filter').value,level:$('level-filter').value,price:$('price-filter').value,access:$('access-filter').value,savedOnly};}
function sourceLabel(resource){return core.labels.sourceType[resource.sourceType]||'来源待分类';}
function resourceCard(resource){
 const card=create('article','resource-card');card.dataset.resourceId=resource.id;
 const top=create('div','card-top');top.append(create('span','source-tag '+resource.sourceType,sourceLabel(resource)));
 const save=create('button','save-button',state.saved.includes(resource.id)?'已收藏':'收藏');save.type='button';save.dataset.save=resource.id;save.setAttribute('aria-pressed',String(state.saved.includes(resource.id)));save.setAttribute('aria-label',(state.saved.includes(resource.id)?'取消收藏：':'收藏：')+resource.title);top.append(save);card.append(top);
 const heading=create('h3');heading.append(externalLink(resource.title,resource.url));card.append(heading,create('p','provider',resource.provider||''),create('p','card-summary',resource.summary||''));
 const tags=create('ul','tag-list');const words=[...resource.skills.map(s=>core.labels.skills[s]||s),resource.priceLabel||core.labels.price[resource.price],resource.accessLabel||core.labels.access[resource.access]].filter(Boolean);words.forEach(text=>tags.append(create('li','',text)));card.append(tags);
 if(resource.recommendedByDefault===false)card.append(create('p','reference-label',(resource.collection||'比较案例')+' · 非默认推荐'));
 if(resource.caution)card.append(create('p','card-caution',resource.caution));
 if(resource.evidenceScope){const detail=create('details','evidence-detail');detail.append(create('summary','',resource.commercial===true?'来源与证据 · 含商业服务':'来源、背景与证据边界'),create('p','',resource.evidenceScope));
  const line=(label,value)=>{if(value)detail.append(create('p','',label+'：'+value));};
  line('原文标题',resource.originalTitle);line('发表日期',resource.publishedAt||'未标明');line('核读日期',resource.checkedAt);line('商业关系',resource.commercialDisclosure);line('选用边界',resource.selectionReason);line('证据质量',resource.quality);
  if(resource.authorContext){line('作者起点',resource.authorContext.baseline);line('投入时长',resource.authorContext.preparationDuration);line('结果性质',resource.authorContext.outcome);}
  if(resource.commentsReview)Object.entries(resource.commentsReview).filter(([key])=>key!=='status').forEach(([,value])=>line('评论核读',value));
  for(const [label,values] of [['可借鉴动作',resource.actionableMethods],['不可推广为规则',resource.excludeFromGeneralGuidance]])if(values?.length){detail.append(create('p','',label));const list=create('ul');values.forEach(text=>list.append(create('li','',text)));detail.append(list);}
  card.append(detail);
 }
 const bottom=create('div','card-bottom');bottom.append(externalLink('查看来源',resource.url,'resource-link'),create('span','checked',resource.checkedAt?'核验 '+resource.checkedAt:'核验日期待补'));card.append(bottom);return card;
}
function renderResources(){const list=core.filterResources(catalog.resources,getFilters(),state.saved);$('resource-grid').replaceChildren(...list.map(resourceCard));$('result-count').textContent=loadFailed?'资料未能加载':`${list.length} 项资料 · ${$('recommendation-filter').value==='recommended'?'默认推荐':$('recommendation-filter').value==='reference'?'比较案例':'全部资料'}${savedOnly?' · 已收藏':''}`;$('saved-count').textContent=String(state.saved.filter(id=>catalog.resources.some(r=>r.id===id)).length);$('saved-filter').setAttribute('aria-pressed',String(savedOnly));$('empty-state').hidden=loadFailed||list.length>0;$('load-error').hidden=!loadFailed;}
function resetFilters(){$('filter-form').reset();savedOnly=false;renderResources();}
function renderPath(){const path=core.getPath($('baseline').value,$('target').value),fragment=document.createDocumentFragment();fragment.append(create('p','path-lede',path.lede));path.steps.forEach((step,index)=>{const row=create('article','path-step');row.append(create('span','step-number',String(index+1).padStart(2,'0')));const body=create('div');body.append(create('h3','',step.title),create('p','',step.body));row.append(body);fragment.append(row);});fragment.append(create('p','path-caveat',path.caveat));$('path-result').replaceChildren(fragment);$('path-save-status').textContent='';}
function renderExams(){
 $('policy-grid').replaceChildren(...catalog.policies.map(policy=>{const card=create('article','policy-card');card.append(create('h3','',policy.title),create('p','',policy.summary||policy.body));if(policy.checkedAt)card.append(create('p','checked','核验 '+policy.checkedAt));if(core.safeUrl(policy.url))card.append(externalLink('核对官方说明',policy.url));return card;}));
 $('center-list').replaceChildren(...catalog.centers.map(center=>{const row=create('article','center-row'),body=create('div');body.append(create('h4','',center.name||center.title));if(center.address)body.append(create('p','',center.address));if(center.summary||center.notes)body.append(create('p','',center.summary||center.notes));if(center.checkedAt)body.append(create('p','checked','信息核验 '+center.checkedAt));row.append(body);if(core.safeUrl(center.url))row.append(externalLink('核对考点',center.url));return row;}));
 $('calendar-list').replaceChildren(...catalog.calendars.map(calendar=>{const row=create('article','calendar-row'),body=create('div');body.append(create('h4','',calendar.title),create('p','',calendar.summary||calendar.body));if(calendar.checkedAt)body.append(create('p','checked','信息核验 '+calendar.checkedAt));row.append(body);const links=create('div','calendar-links');if(core.safeUrl(calendar.url))links.append(externalLink(calendar.linkLabel||'查看官方信息',calendar.url));if(core.safeUrl(calendar.announcementUrl))links.append(externalLink('查看官方公告',calendar.announcementUrl));row.append(links);return row;}));
 $('exam-data-empty').hidden=Boolean(catalog.policies.length||catalog.centers.length||catalog.calendars.length);
 if(core.safeUrl(catalog.meta.bookingUrl))$('booking-link').href=core.safeUrl(catalog.meta.bookingUrl);
}
function renderEvidenceReview(){
 const review=catalog.evidenceReview||{},rows=[];
 rows.push(create('p','',review.selectionNote||''));
 const synthesis=review.methodSynthesis||{};
 for(const [key,title] of [['writingLoop','写作反馈循环'],['speakingLoop','口语录音循环']])if(synthesis[key]){rows.push(create('h4','',title+' · 编辑建议，不是提分证据'));const list=create('ol');synthesis[key].forEach(text=>list.append(create('li','',text)));rows.push(list);}
 for(const [level,text] of Object.entries(synthesis.levels||{}))rows.push(create('p','',level+'：'+text));
 for(const conflict of review.conflicts||[]){const section=create('section','evidence-conflict');section.append(create('h4','',conflict.topic),create('p','',conflict.decision));const links=create('div','methodology-sources');conflict.evidence.forEach(id=>{const resource=catalog.resources.find(r=>r.id===id);if(resource)links.append(externalLink(resource.title,resource.url));});section.append(links);rows.push(section);}
 $('evidence-review').replaceChildren(...rows);
}
function renderContext(){
 renderEvidenceReview();
 $('coverage-list').replaceChildren(...catalog.coverage.map(item=>{const row=create('div','coverage-row');row.append(create('h4','',item.platform),create('p','',item.status+' · '+item.scope));return row;}));
 $('methodology-list').replaceChildren(...(catalog.methodology.principles||[]).map(text=>create('li','',text)));
 $('methodology-sources').replaceChildren(...(catalog.methodology.sources||[]).filter(core.safeUrl).map((url,index)=>externalLink('参考来源 '+(index+1),url)));
}
async function loadCatalog(){loadFailed=false;$('load-error').hidden=true;$('result-count').textContent='正在读取资料…';try{const response=await fetch(new URL('data/catalog.json',document.baseURI),{cache:'no-cache'});if(!response.ok)throw new Error('Data unavailable');const data=await response.json();if(!data||!Array.isArray(data.resources))throw new Error('Invalid catalog');catalog=core.normalizeCatalog(data);renderContext();$('checked-date').textContent=catalog.meta.checkedAt?'最近核验 '+catalog.meta.checkedAt:'首版资料校核中';$('update-status').textContent=catalog.meta.dailyUpdatesEnabled?(catalog.meta.firstScheduledRunVerified?'每日检查已启用':'每日检查已启用 · 首轮待验证'):'首版人工核验 · 自动更新尚未启用';}catch{loadFailed=true;}renderResources();renderExams();}
function switchTab(id,focus){if(!['library','path','exams'].includes(id))id='library';document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('panel-'+button.dataset.tab).hidden=!active;if(active&&focus)button.focus();});}
document.querySelectorAll('[data-tab]').forEach(button=>{button.addEventListener('click',()=>{location.hash=button.dataset.tab;switchTab(button.dataset.tab,false);});button.addEventListener('keydown',event=>{const ids=['library','path','exams'];let index=ids.indexOf(button.dataset.tab);if(event.key==='ArrowRight')index=(index+1)%3;else if(event.key==='ArrowLeft')index=(index+2)%3;else if(event.key==='Home')index=0;else if(event.key==='End')index=2;else return;event.preventDefault();location.hash=ids[index];switchTab(ids[index],true);});});
window.addEventListener('hashchange',()=>switchTab(location.hash.slice(1),false));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.go;switchTab(button.dataset.go,true);}));
$('filter-form').addEventListener('submit',event=>event.preventDefault());$('filter-form').addEventListener('input',renderResources);$('filter-form').addEventListener('change',renderResources);$('reset-filters').addEventListener('click',resetFilters);$('empty-reset').addEventListener('click',resetFilters);$('saved-filter').addEventListener('click',()=>{savedOnly=!savedOnly;renderResources();});
$('resource-grid').addEventListener('click',event=>{const button=event.target.closest('[data-save]');if(!button)return;const id=button.dataset.save;if(state.saved.includes(id))state.saved=state.saved.filter(saved=>saved!==id);else state.saved.push(id);persist();const removed=savedOnly&&!state.saved.includes(id);renderResources();const replacement=Array.from(document.querySelectorAll('[data-save]')).find(node=>node.dataset.save===id);if(replacement)replacement.focus();else if(removed)$('saved-filter').focus();});
$('baseline').addEventListener('change',renderPath);$('target').addEventListener('change',renderPath);$('save-path').addEventListener('click',()=>{state.path={baseline:$('baseline').value,target:$('target').value};$('path-save-status').textContent=persist()?'已保存在本浏览器':'当前页面已暂存，关闭后可能丢失';});
$('clear-local').addEventListener('click',()=>{state={saved:[],path:null};try{localStorage.removeItem(key);$('local-status').textContent='已清除本浏览器保存的收藏与路径选项。';}catch{$('local-status').textContent='已清除当前页面的选择；浏览器存储不可用。';}$('baseline').value='unknown';$('target').value='7';renderPath();renderResources();});
$('retry-load').addEventListener('click',loadCatalog);
if(state.path){$('baseline').value=state.path.baseline;$('target').value=state.path.target;}
switchTab(location.hash.slice(1),false);renderPath();loadCatalog();
})();
