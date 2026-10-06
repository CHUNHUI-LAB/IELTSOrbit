const {paperTrfStage}=require('./policy-history.js');
const counts=require('./catalog-counts.js');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=require('../assets/core.js'),data=require('../data/catalog.json');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function harness({rawState,hash='',offline=false,storageBlocked=false,mobile=false,catalogData=data,browserHistory=null}={}){
 let active,fetches=0,storageWrites=0;
 const nodes={},saved=new Map(rawState?[['ieltsorbit.local.v1',rawState]]:[]),events={};
 const descendants=n=>n.children.flatMap(c=>[c,...descendants(c)]);
 const match=(node,selector)=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?String(node.className||'').split(' ').includes(selector.slice(1)):selector.startsWith('[data-')?(()=>{const [raw,value]=selector.slice(1,-1).split('=');const key=raw.slice(5).replace(/-([a-z])/g,(_,v)=>v.toUpperCase());return value?node.dataset[key]===value.replace(/"/g,''):Object.hasOwn(node.dataset,key);})():node.tagName===selector;
 class Element{
  constructor(tag='div',id=''){this.tagName=tag;this.id=id;this.children=[];this.dataset={};this.attrs={};this.events={};this.hidden=false;this.value='';this.textContent='';this.parent=null;this.open=false;this.ownerDocument=doc;}
  append(...children){children.forEach(c=>{c.parent=this;this.children.push(c);});}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  addEventListener(k,f){(this.events[k]??=[]).push(f);}
  dispatch(k,event={}){if(this.disabled)return;const e={target:this,preventDefault(){},...event};for(const f of this.events[k]||[])f(e);}
  focus(){active=this;}scrollIntoView(options){this.lastScroll=options;}
  closest(selector){return match(this,selector)?this:this.parent?.closest(selector)||null;}
  querySelectorAll(selector){return descendants(this).filter(n=>match(n,selector));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  reset(){for(const id of ['source-filter','level-filter','price-filter','access-filter'])nodes[id].value='all';nodes['skill-filter'].value='listening';nodes.search.value='';nodes['recommendation-filter'].value='recommended';}
 }
 const doc={get activeElement(){return active;},baseURI:'https://example.test/IELTSOrbit/',getElementById:id=>nodes[id]||Object.values(nodes).flatMap(descendants).find(n=>n.id===id)||null,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('fragment'),querySelectorAll:selector=>selector==='[data-intent]'?intents:Object.values(nodes).flatMap(n=>[n,...descendants(n)]).filter(n=>match(n,selector))};
 [...html.matchAll(/\bid="([^"]+)"/g)].forEach(m=>nodes[m[1]]=new Element('div',m[1]));
 for(const id of ['source-filter','level-filter','price-filter','access-filter'])nodes[id].value='all';nodes['skill-filter'].value='listening';nodes['recommendation-filter'].value='recommended';
 for(const tab of ['start','library','experience','path','exams'])nodes['tab-'+tab].dataset.tab=tab;
 nodes['main-navigation'].contains=node=>['start','library','experience','path','exams'].some(t=>nodes['tab-'+t]===node);
 const intents=['listening','reading','writing','speaking','experience'].map(value=>{const n=new Element('button');n.dataset.intent=value;return n;});
 const context={window:{IELTSCore:core,confirm:()=>true,matchMedia:()=>({matches:mobile}),addEventListener:(k,f)=>events[k]=f},document:doc,location:{hash},localStorage:{getItem:k=>{if(storageBlocked)throw new Error('blocked');return saved.get(k);},setItem:(k,v)=>{if(storageBlocked)throw new Error('blocked');saved.set(k,v);storageWrites++;},removeItem:k=>{if(storageBlocked)throw new Error('blocked');saved.delete(k);}},fetch:async url=>{fetches++;assert.equal(String(url),'https://example.test/IELTSOrbit/data/catalog.json');if(offline)throw new Error('offline');return{ok:true,json:async()=>catalogData};},URL,console};
 context.window.location=context.location;
 if(browserHistory)browserHistory.attach(context,events);
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/experience.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/app.js'),'utf8'),context);
 return{nodes,doc,intents,saved,context,events,descendants,get active(){return active;},get fetches(){return fetches;},get storageWrites(){return storageWrites;},text:n=>[n,...descendants(n)].map(n=>n.textContent).join(' '),hash:value=>{context.location.hash=value;events.hashchange();},flush:()=>new Promise(setImmediate)};
}
(async()=>{
 const h=harness(),{nodes:n,doc}=h;await h.flush();
 // Current selection counts come from loaded resources, never a dated review's prose.
 const assertCurrentSelection=(view,raw)=>{
  const records=raw.resources,experiences=records.filter(r=>r.sourceType==='experience');
  const recommended=records.filter(r=>r.recommendedByDefault!==false).length,experienceRecommended=experiences.filter(r=>r.recommendedByDefault!==false).length;
  const current=view.nodes['evidence-review'].querySelector('.current-selection');
  assert.equal(current.textContent,`当前${records.length}项资料：${recommended}项默认推荐、${records.length-recommended}项参考案例；其中${experiences.length}篇经验默认全部展示，${experienceRecommended}篇推荐阅读、${experiences.length-experienceRecommended}篇参考案例仍可筛选。`);
  assert.equal(current.closest('details'),null,'the current count precedes the historical disclosure');
  const history=view.nodes['evidence-review'].querySelector('.evidence-history');
  if(raw.evidenceReview?.selectionNote){
   assert(history);assert.equal(history.open,false);assert.equal(history.querySelector('summary').textContent,`${raw.evidenceReview.checkedAt||'未注明日期'} 选材审核记录（数量仅指当次）`);
   assert.equal(history.querySelector('p').textContent,raw.evidenceReview.selectionNote.replace(/^当前/,'当次'),'dated original wording remains intact apart from its present-tense prefix');
  }else assert.equal(history,null);
 };
 const originalCatalog=JSON.stringify(data);assertCurrentSelection(h,data);
 const expanded=JSON.parse(originalCatalog);
 expanded.resources.push({...expanded.resources.find(r=>r.sourceType==='official'),id:'count-regression-official',url:'https://example.org/count-regression-official'}, {...expanded.resources.find(r=>r.sourceType==='experience'),id:'count-regression-reference',url:'https://example.org/count-regression-reference',recommendedByDefault:false});
 const expandedView=harness({catalogData:expanded});await expandedView.flush();assertCurrentSelection(expandedView,expanded);
 assert.match(expandedView.nodes['scope-help'].textContent,new RegExp(`共 ${expanded.resources.length} 项`));
 expanded.evidenceReview.selectionNote='当前999项资源；这是用于验证历史文案与当前统计独立的测试记录。';
 const staleView=harness({catalogData:expanded});await staleView.flush();assertCurrentSelection(staleView,expanded);
 delete expanded.evidenceReview;
 const noHistory=harness({catalogData:expanded});await noHistory.flush();assertCurrentSelection(noHistory,expanded);
 assert.equal(JSON.stringify(data),originalCatalog,'rendering never changes records, historical notes or source dates');
 const readmeCurrent=fs.readFileSync(require.resolve('../README.md'),'utf8').split('## 2026-10-01 引导式学习流程')[0];
 assert(readmeCurrent.includes(`当前共 ${counts.resources} 项资料，默认推荐 ${counts.resources-counts.reference} 项；另外 ${counts.reference} 项`));
 assert(readmeCurrent.includes(`按问题浏览${counts.experiences}篇经验`));
 assert(readmeCurrent.includes(`筛选${counts.experiences-counts.experienceReference}篇推荐阅读或${counts.experienceReference}篇参考案例`));
 assert(readmeCurrent.includes(`默认展示全部${counts.experiences}篇，${counts.experiences-counts.experienceReference}篇推荐阅读与${counts.experienceReference}篇参考案例`));
 console.log('PASS: live-data selection counts, stale/missing historical note, catalog immutability and README current overview');

 // Teaching sources use neutral labels and remain clickable without being called an experience case.
 const teaching=harness({hash:'#library/listening'});await teaching.flush();
 for(const [id,url] of [['liz','https://ieltsliz.com/listening-practice-office-etiquette/'],['bc-mocks','https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/t-w/weak-forms']]){
  const card=teaching.doc.getElementById('resource-'+id),link=card.querySelectorAll('a').find(a=>a.href===url);assert(link);assert(link.textContent.startsWith('相关原文：'));assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
 }
 // Mobile task navigation must focus a visible panel, never collapsed header tabs.
 const mobileUI=harness({mobile:true});await mobileUI.flush();mobileUI.intents.find(n=>n.dataset.intent==='writing').dispatch('click');assert.equal(mobileUI.active,mobileUI.nodes['panel-library']);assert.equal(mobileUI.active.hidden,false);assert.equal(mobileUI.active.tabIndex,-1);assert.equal(mobileUI.active.lastScroll.block,'start');
 mobileUI.nodes['tab-path'].focus();mobileUI.nodes['tab-path'].dispatch('click');assert.equal(mobileUI.active,mobileUI.nodes['panel-path']);assert.equal(mobileUI.active.hidden,false);assert.equal(mobileUI.active.lastScroll.block,'start');
 // Homepage search opens all subjects without stale filters or writes.
 const homeSearch=harness({rawState:JSON.stringify({saved:['writing-rubric'],path:null})});await homeSearch.flush();
 const hs=homeSearch.nodes,beforeHomeSearch=homeSearch.saved.get('ieltsorbit.local.v1');hs['source-filter'].value='experience';hs['price-filter'].value='paid';hs['home-search'].value='  写作  ';hs['home-search-form'].dispatch('submit');
 assert.equal(homeSearch.context.location.hash,'library');assert.equal(hs['panel-library'].hidden,false);assert.equal(hs.search.value,'写作');assert.equal(hs['skill-filter'].value,'all');assert.equal(hs['source-filter'].value,'all');assert.equal(hs['price-filter'].value,'all');assert.equal(homeSearch.active,hs.search);assert.equal(homeSearch.saved.get('ieltsorbit.local.v1'),beforeHomeSearch);
 hs['home-search'].value='<img src=x onerror=alert(1)>';hs['home-search-form'].dispatch('submit');assert.equal(hs['empty-state'].hidden,false);hs['home-search'].value='';hs['home-search-form'].dispatch('submit');assert.equal(hs['empty-state'].hidden,true);assert.equal(hs.search.value,'');assert.equal(homeSearch.saved.get('ieltsorbit.local.v1'),beforeHomeSearch);

 // The library entry preserves real learning conclusions while exposing its first action earlier.
 const savedListeningPlan=JSON.stringify({saved:['writing-rubric'],path:{examHistory:'yes',baseline:'6',target:'7',dailyMinutes:'30',weakSkill:'listening',completed:true}});
 for(const [skill,guide] of Object.entries(core.learningGuides)){
  const compact=harness({hash:'#library/'+skill,rawState:savedListeningPlan});await compact.flush();
  const root=compact.nodes['learning-guide'],subject=root.children[0],lead=subject.querySelector('.guide-lead'),columns=subject.querySelector('.guide-columns');
  assert(lead&&columns);assert(subject.children.indexOf(lead)<subject.children.indexOf(columns));
  assert(compact.text(lead).includes(guide.focus));
  const content=compact.text(columns);for(const text of [...guide.mistakes,...guide.order])assert(content.includes(text),skill+': '+text);
  assert.equal(columns.querySelectorAll('li').length,6);
  assert.equal(lead.closest('details'),null);assert.equal(columns.closest('details'),null,'subject conclusions remain visible without opening a disclosure');
  const primary=lead.querySelector('.primary-button');assert(primary);assert.equal(primary.href,'#library/'+skill+'/resource/'+guide.resources[0]);
  assert.equal(lead.querySelectorAll('.primary-button').length,1);assert.equal(subject.querySelector('.method-detail').open,false,'only the existing extended procedure stays folded');
  const planLink=lead.querySelector('.text-button');assert.equal(planLink.textContent,'查看或调整学习计划');assert.equal(planLink.href,'#path','generic navigation makes no promise to schedule this subject');
  compact.hash(planLink.href);assert.equal(compact.nodes['path-result'].hidden,false);assert.equal(compact.nodes['daily-time'].value,'30');assert.equal(compact.nodes['weak-skill'].value,'listening');
  assert.equal(compact.saved.get('ieltsorbit.local.v1'),savedListeningPlan,'opening the plan from any subject never changes saved choices');
 }
 // Both experience overview plan links are navigation only, with the same truthful label.
 const experiencePlan=harness({hash:'#experience',rawState:savedListeningPlan});await experiencePlan.flush();
 const planLinks=experiencePlan.nodes['experience-root'].querySelectorAll('a').filter(a=>a.href==='#path');
 assert.equal(planLinks.length,2);
 for(const link of planLinks){
  assert.equal(link.textContent,'查看或调整学习计划');experiencePlan.hash(link.href);
  assert.equal(experiencePlan.nodes['path-result'].hidden,false);assert.equal(experiencePlan.nodes['daily-time'].value,'30');assert.equal(experiencePlan.nodes['weak-skill'].value,'listening');
  assert.equal(experiencePlan.saved.get('ieltsorbit.local.v1'),savedListeningPlan,'neither experience CTA schedules a step or replaces the saved plan');
  experiencePlan.hash('#experience');
 }
 const libraryMarkup=html.split('id="panel-library"')[1].split('id="panel-experience"')[0];
 assert(!libraryMarkup.includes('class="journey-steps"'));assert(libraryMarkup.includes('答案、初稿或录音'));
 const hierarchyCss=fs.readFileSync(require.resolve('../assets/styles.css'),'utf8').split('/* Library entry')[1];
 assert(hierarchyCss.includes('#panel-library'));assert(!hierarchyCss.includes('display:none'));assert(!hierarchyCss.includes('animation:')&&!hierarchyCss.includes('transition:'));

 // Compact filter feedback exposes collapsed choices and preserves the active subject.
 const feedback=harness({hash:'#library/writing',rawState:JSON.stringify({saved:['writing-rubric'],path:null})});await feedback.flush();const fn=feedback.nodes;
 assert.equal(fn['active-filters'].hidden,true);
 fn.search.value='<img src=x onerror=alert(1)>';fn['source-filter'].value='official';fn['source-filter'].selectedOptions=[{textContent:'官方'}];fn['price-filter'].value='free';fn['price-filter'].selectedOptions=[{textContent:'免费'}];fn['filter-form'].dispatch('input');
 assert.equal(fn['active-filters'].children.length,3);assert.match(fn['advanced-filter-summary'].textContent,/2 项/);assert.equal(fn['advanced-filters'].open,false);assert.equal(fn['empty-state'].hidden,false);
 assert.ok(fn['active-filters'].children[0].textContent.includes('<img src=x onerror=alert(1)>'));assert.equal(fn['active-filters'].children[0].children.length,0,'search text never becomes markup');
 const existingChip=fn['active-filters'].children[0];existingChip.focus();fn['filter-form'].dispatch('input');assert.equal(fn['active-filters'].children[0],existingChip,'unchanged feedback retains DOM identity');assert.equal(feedback.active,existingChip);
 const localBefore=feedback.saved.get('ieltsorbit.local.v1');fn['active-filters'].children[0].dispatch('click');assert.equal(fn.search.value,'');assert.equal(fn['source-filter'].value,'official');assert.equal(feedback.active,fn['active-filters'].children[0]);
 fn['active-filters'].children[1].dispatch('click');assert.equal(fn['price-filter'].value,'all');assert.equal(feedback.active,fn['active-filters'].children[0]);assert.equal(fn['skill-filter'].value,'writing');
 fn['active-filters'].children[0].dispatch('click');assert.equal(fn['active-filters'].hidden,true);assert.equal(feedback.active,fn.search);assert.equal(fn['skill-filter'].value,'writing');assert.equal(feedback.saved.get('ieltsorbit.local.v1'),localBefore);
 fn['saved-filter'].dispatch('click');assert.equal(fn['active-filters'].children[0].textContent,'仅看已收藏 ×');fn['active-filters'].children[0].dispatch('click');assert.equal(fn['saved-filter'].attrs['aria-pressed'],'false');assert.equal(feedback.saved.get('ieltsorbit.local.v1'),localBefore);
 fn['recommendation-filter'].value='reference';fn['filter-form'].dispatch('input');fn['active-filters'].children[0].dispatch('click');assert.equal(fn['recommendation-filter'].value,'recommended');
 fn.search.value='no matching resource';fn['filter-form'].dispatch('input');fn['empty-reset'].dispatch('click');assert.equal(feedback.active,fn.search);assert.equal(fn['skill-filter'].value,'writing');

 // Resource links and recovery preserve the reader's current subject and result scope.
 const nav=harness({hash:'#library/writing'});await nav.flush();const nn=nav.nodes;
 const writingCount=nn['resource-grid'].children.length;
 assert.equal(writingCount,19);nav.doc.querySelectorAll('.method-detail')[0].open=true;nav.hash('#library/writing/resource/writing-rubric');
 assert.equal(nn['recommendation-filter'].value,'recommended');assert.equal(nn['resource-grid'].children.length,writingCount);
 nav.hash('#library/writing/resource/writing-rubric');nav.hash('#library/writing');
 assert.equal(nn['recommendation-filter'].value,'recommended');assert.equal(nav.doc.getElementById('detail-writing-rubric').open,false,'Back restores prior disclosure state');assert.equal(nav.doc.querySelectorAll('.method-detail')[0].open,true,'Back retains expanded guide steps containing the source link');
 nn.search.value='no match';nn['filter-form'].dispatch('input');assert.equal(nn['empty-state'].hidden,false);nn['empty-reset'].dispatch('click');
 assert.equal(nn['skill-filter'].value,'writing');assert.equal(nn['resource-grid'].children.length,writingCount);
 nn['recommendation-filter'].value='reference';nn.search.value='写作';nn['filter-form'].dispatch('change');const previousCount=nn['resource-grid'].children.length;
 nav.hash('#library/writing/resource/writing-rubric');assert.equal(nn['recommendation-filter'].value,'recommended');
 nav.hash('#library/writing');assert.equal(nn['recommendation-filter'].value,'reference');assert.equal(nn.search.value,'写作');assert.equal(nn['resource-grid'].children.length,previousCount);
 nav.hash('#library/writing/resource/writing-rubric');nav.hash('#library/writing');assert.equal(nn.search.value,'写作','forward and back repeat restores the same subset');
 assert.equal(nav.saved.size,0,'navigation and recovery never persist personal choices');
 const cold=harness({hash:'#library/writing/resource/reddit-writing55-unresolved-thread-2026'});await cold.flush();assert.ok(cold.doc.getElementById('detail-reddit-writing55-unresolved-thread-2026').open);assert.equal(cold.nodes['recommendation-filter'].value,'reference');

 assert.equal(n['update-status'].textContent,'每日检查已启用','completed bounded refresh removes first-run pending label');
 assert.equal(n['panel-start'].hidden,false);assert.equal(n['site-intro'].hidden,false);assert.equal(n['resource-grid'].children.length,core.filterResources(core.normalizeCatalog(data).resources,{skill:'listening',recommendation:'recommended'},[]).length);
 assert.equal(n['advanced-filters'].open,false,'advanced filters collapsed');assert.ok(h.text(n['learning-guide']).includes('优先排查的错因'));
 h.intents.find(b=>b.dataset.intent==='writing').dispatch('click');assert.equal(n['skill-filter'].value,'writing');assert.equal(n['panel-library'].hidden,false);assert.equal(n['site-intro'].hidden,true);assert.match(h.context.location.hash,/library\/writing/);
 h.intents.find(b=>b.dataset.intent==='experience').dispatch('click');assert.equal(n['panel-experience'].hidden,false);assert.equal(doc.querySelectorAll('.experience-card').length,counts.experiences,'all current experiences shown initially');assert.equal(doc.getElementById('experience-scope').value,'all');assert.equal(doc.querySelectorAll('.experience-card').filter(c=>h.text(c).includes('参考案例 · 非默认推荐')).length,counts.experienceReference,'reference status remains explicit');assert.ok(h.text(n['experience-root']).includes('起点'));assert.ok(h.text(n['experience-root']).includes('评论'));
 const introDetails=doc.querySelectorAll('.experience-synthesis')[0].querySelectorAll('details');assert.equal(introDetails.length,4);assert.ok(introDetails.every(d=>!d.open),'synthesis themes and disagreements collapsed initially');assert.ok(h.text(n['experience-root']).includes(counts.experiences+'篇经验综合'));const referenceJump=doc.querySelectorAll('.experience-source-links').flatMap(x=>x.children).find(x=>x.textContent.includes('首考复盘：核对口试日程'));assert.ok(referenceJump.textContent.includes('参考案例'));referenceJump.dispatch('click');assert.equal(doc.getElementById('experience-scope').value,'reference');assert.equal(doc.querySelectorAll('[data-case-id]').find(c=>c.dataset.caseId==='v2ex-first-attempt-reflection-2023').querySelector('details').open,true,'summary source opens exact reference case');const v2ex=doc.querySelectorAll('[data-case-id]').find(c=>c.dataset.caseId==='v2ex-first-attempt-reflection-2023');assert.ok(h.text(v2ex).includes('未仔细核对口试日程'),'article summary preserves what actually happened');assert.ok(h.text(v2ex).includes('建议动作'));assert.ok(!h.text(v2ex).includes('具体训练'),'curated actions are not described as completed author training');assert.ok(h.text(v2ex).includes('不表示作者已全部执行'));assert.equal(v2ex.querySelector('.card-summary').textContent,data.resources.find(r=>r.id==='v2ex-first-attempt-reflection-2023').summary,'per-case summary uses existing reviewed text');const scope=doc.getElementById('experience-scope');scope.value='recommended';scope.dispatch('change');assert.equal(doc.querySelectorAll('.experience-card').length,6,'recommended filter still shows six');scope.value='reference';scope.dispatch('change');assert.equal(doc.querySelectorAll('.experience-card').length,counts.experienceReference);scope.value='all';scope.dispatch('change');assert.equal(doc.querySelectorAll('.experience-card').length,counts.experiences);

 for(const r of data.resources.filter(r=>r.sourceType==='experience')){
  const card=doc.querySelectorAll('[data-case-id]').find(c=>c.dataset.caseId===r.id);
  assert.equal(card.querySelector('.card-summary').textContent,r.summary,'all current per-case summaries render from reviewed records');
  assert.ok(h.text(card).includes('建议动作')&&h.text(card).includes('不表示作者已全部执行'));
  if(r.reportedRoutine?.length){assert.ok(h.text(card).includes('原文自述与作者建议'));assert.ok(r.reportedRoutine.every(text=>h.text(card).includes(text)));}
  if(r.updatedAt)assert.ok(h.text(card).includes(r.updatedAt));if(r.curatorInterpretation)assert.ok(h.text(card).includes(r.curatorInterpretation));if(r.relatedSources)assert.ok(r.relatedSources.every(s=>card.querySelectorAll('a').some(a=>a.href===s.url)));
  if(r.sourceDateCaveat)assert.ok(h.text(card).includes(r.sourceDateCaveat));
  if(r.discussionEvidence?.length){assert.ok(h.text(card).includes(r.discussionEvidence[0].attributionCaveat));assert.ok(card.querySelectorAll('a').some(a=>a.href===r.discussionEvidence[0].url));}
 }
 for(const r of data.resources.slice(28,40)){
  const link=doc.querySelectorAll('.experience-source-links').flatMap(n=>n.children).find(n=>n.href==='#experience-case-'+r.id);
  assert.ok(link,'new source is reachable from synthesis');link.dispatch('click');link.dispatch('click');
  assert.equal(doc.getElementById('experience-scope').value,r.recommendedByDefault===false?'reference':'recommended');
  const card=doc.querySelectorAll('[data-case-id]').find(c=>c.dataset.caseId===r.id);
  assert.ok(card.querySelector('details').open,'source jump opens exact new case after repeat');
  assert.ok(h.text(card).includes(r.commercialDisclosure));
 }
 scope.value='all';scope.dispatch('change');
 const question=doc.getElementById('experience-topic');question.value='timing';question.dispatch('change');assert.equal(doc.querySelectorAll('.experience-card').length,counts.timing);
 n['tab-start'].dispatch('keydown',{key:'ArrowLeft'});assert.equal(h.active,n['tab-exams']);n['tab-exams'].dispatch('keydown',{key:'ArrowRight'});assert.equal(h.active,n['tab-start']);
 h.hash('#library/reading/resource/official-independent-reading-project');
 const readingProject=doc.getElementById('detail-official-independent-reading-project');
 assert.ok(readingProject.open,'new official resource opens through existing detail route');
 assert.ok(h.text(readingProject).includes('20分钟')&&h.text(readingProject).includes('不是官方考试限时'));
 assert.ok(readingProject.querySelectorAll('a').some(a=>a.href===data.resources.find(r=>r.id==='official-independent-reading-project').url),'source link points to reviewed official article');
 h.hash('#library');n['skill-navigation'].dispatch('click',{target:n['skill-navigation'].children.find(b=>b.dataset.skill==='all')});assert.equal(n['resource-grid'].children.length,22);n['recommendation-filter'].value='all';n['filter-form'].dispatch('change');assert.equal(n['resource-grid'].children.length,counts.resources);n['recommendation-filter'].value='reference';n['filter-form'].dispatch('change');assert.equal(n['resource-grid'].children.length,counts.reference);
 for(const r of [...data.resources.slice(33,40),...data.resources.slice(41)]){const card=n['resource-grid'].children.find(c=>c.dataset.resourceId===r.id);assert.ok(card);assert.ok(h.text(card).includes('原文自述与作者建议'));if(r.sourceDateCaveat)assert.ok(h.text(card).includes(r.sourceDateCaveat));if(r.updatedAt)assert.ok(h.text(card).includes(r.updatedAt));if(r.curatorInterpretation)assert.ok(h.text(card).includes(r.curatorInterpretation));if(r.relatedSources)assert.ok(r.relatedSources.every(s=>card.querySelectorAll('a').some(a=>a.href===s.url)));if(r.discussionEvidence?.length)assert.ok(h.text(card).includes(r.discussionEvidence[0].attributionCaveat));}
 n.search.value='nothing matches';n['filter-form'].dispatch('input');assert.equal(n['empty-state'].hidden,false);n['empty-reset'].dispatch('click');assert.equal(n['skill-filter'].value,'all');assert.equal(n['recommendation-filter'].value,'recommended');
 let save=doc.querySelectorAll('[data-save]')[0];const id=save.dataset.save;const detail=doc.getElementById('detail-'+id);detail.open=true;n['resource-grid'].dispatch('click',{target:save});assert.ok(JSON.parse(h.saved.get('ieltsorbit.local.v1')).saved.includes(id));assert.equal(doc.getElementById('detail-'+id).open,true,'bookmark preserves open detail');n['saved-filter'].dispatch('click');assert.equal(n['resource-grid'].children.length,1);save=doc.querySelectorAll('[data-save]')[0];n['resource-grid'].dispatch('click',{target:save});assert.equal(n['resource-grid'].children.length,0);assert.equal(h.active,n['saved-filter']);
 h.hash('#path');assert.equal(n['plan-step-1'].hidden,false);assert.equal(n['path-result'].hidden,true);n['exam-history'].value='no';n['plan-next'].dispatch('click');assert.equal(n['plan-step-2'].hidden,false);assert.equal(h.active,n['plan-step-2']);n.target.value='7';n['plan-next'].dispatch('click');n['daily-time'].value='60';n['plan-next'].dispatch('click');n['weak-skill'].value='writing';
 h.hash('#path/step/3');assert.equal(n['plan-step-3'].hidden,false);assert.equal(n['daily-time'].value,'60','back retains draft');h.hash('#path/step/4');n['plan-next'].dispatch('click');assert.equal(n['path-result'].hidden,false);assert.equal(n['plan-wizard'].hidden,true);assert.equal(doc.querySelectorAll('.today-task').length,3);assert.equal(doc.querySelectorAll('.week-day').length,7);assert.ok(h.text(n['path-result']).includes('每天约 60 分钟'));assert.equal(JSON.parse(h.saved.get('ieltsorbit.local.v1')).path.completed,true);
 n['plan-next'].dispatch('click');assert.equal(doc.querySelectorAll('.today-task').length,3,'repeat generate never duplicates');h.hash('#library/writing/resource/writing-rubric');assert.equal(doc.getElementById('detail-writing-rubric').open,true);assert.equal(n['panel-library'].hidden,false);h.hash('#path/result');assert.equal(n['path-result'].hidden,false);assert.equal(n['weak-skill'].value,'writing');
 n['edit-plan'].dispatch('click');assert.equal(n['plan-step-1'].hidden,false);n['plan-back'].dispatch('click');assert.equal(n['plan-step-1'].hidden,false,'back at first bounded');
 h.hash('#exams');assert.equal(doc.querySelectorAll('.center-card').length,4);assert.equal(doc.querySelectorAll('.policy-card').length,paperTrfStage.currentPolicyIds.length);
 for(const [index,policy] of data.policies.entries()){const card=doc.querySelectorAll('.policy-card')[index];assert.ok(h.text(card).includes(policy.title)&&h.text(card).includes(policy.text),'every current policy text renders in source order');assert.ok(card.querySelectorAll('a').some(link=>link.href===policy.url),'each current policy retains its official source');}
 assert.ok(h.text(doc.querySelectorAll('.policy-card').at(-1)).includes('Life Skills仍提供纸质成绩单')); assert.ok(h.text(n['exam-overview']).includes('尚无逐日核验'));assert.ok(h.text(n['center-list']).includes('尚未取得该地点'));
 n['clear-local'].dispatch('click');assert.equal(h.saved.has('ieltsorbit.local.v1'),false);assert.equal(n['weak-skill'].value,'unknown');assert.equal(n.target.value,'unknown');
 h.context.fetch=async()=>{throw new Error('offline');};n['retry-load'].dispatch('click');n['retry-load'].dispatch('click');await h.flush();assert.equal(n['load-error'].hidden,false);assert.equal(n['empty-state'].hidden,true);assert.equal(n['retry-load'].disabled,false);
 let recoverFetches=0,resolve;h.context.fetch=()=>{recoverFetches++;return new Promise(r=>resolve=r);};n['retry-load'].dispatch('click');n['retry-load'].dispatch('click');assert.equal(recoverFetches,1,'in-flight reload is deduplicated');resolve({ok:true,json:async()=>data});await h.flush();assert.equal(n['load-error'].hidden,true);assert.equal(doc.querySelectorAll('.experience-card').length,counts.experiences,'retry renders all experiences once');assert.equal(doc.getElementById('experience-scope').value,'all');
 // Visible overviews and reversible navigation must never silently change a saved plan.
 const personal=JSON.stringify({saved:['writing-rubric'],path:{examHistory:'yes',baseline:'6.5',target:'7.5',dailyMinutes:'60',weakSkill:'writing',completed:true}});
 const overview=harness({rawState:personal,hash:'#path'});await overview.flush();const on=overview.nodes;
 assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal,'reading the saved plan does not rewrite it');
 assert.equal(on['plan-return'].hidden,false);
 assert.ok(overview.text(on['path-result']).includes('一眼看懂这份安排'));
 assert.ok(overview.text(on['path-result']).includes('今天 60 分钟：准备 5 → 练习 45 → 复盘 10 分钟'));
 assert.equal(overview.doc.querySelectorAll('.week-output').length,7,'all week items expose their expected output in the summary');
 assert.ok(overview.doc.querySelectorAll('.week-output').every(n=>n.textContent.startsWith('成果：')&&!n.textContent.includes('留下：留下')),'day output labels avoid repeated verbs');
 on['edit-plan'].dispatch('click');assert.equal(on['cancel-plan-edit'].hidden,false);on['daily-time'].value='15';on['weak-skill'].value='reading';
 assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal,'draft edits do not overwrite a saved plan');
 on['cancel-plan-edit'].dispatch('click');assert.equal(on['daily-time'].value,'60');assert.equal(on['weak-skill'].value,'writing');assert.equal(on['path-result'].hidden,false);assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal,'cancel returns to original choices without a storage write');
 on['recommendation-filter'].value='reference';on.search.value='old search';on['saved-filter'].dispatch('click');
 const methodLink=overview.doc.querySelectorAll('.today-task')[0].querySelectorAll('a').find(a=>a.href==='#library/writing');
 methodLink.dispatch('click',{ctrlKey:true});assert.equal(on['recommendation-filter'].value,'reference','modifier click leaves current tab untouched');
 methodLink.dispatch('click');assert.equal(on['recommendation-filter'].value,'recommended');assert.equal(on.search.value,'');assert.equal(on['skill-filter'].value,'writing');assert.ok(on['resource-grid'].children.some(n=>n.dataset.resourceId==='writing-rubric'),'plan method link reveals official resources despite stale filters');
 assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal);
 overview.hash('#library');on['skill-navigation'].dispatch('click',{target:on['skill-navigation'].children.find(b=>b.dataset.skill==='all')});
 assert.equal(on['skill-navigation'].children.find(b=>b.dataset.skill==='all').textContent,'全部科目','subject label no longer falsely promises all resources');
 assert.equal(overview.doc.querySelectorAll('.learning-overview-grid')[0].children.length,4);assert.equal(on['recommendation-filter'].value,'recommended');assert.equal(on['resource-grid'].children.length,22);
 assert.ok(overview.text(on['scope-help']).includes(counts.resources+' 项：22 项默认推荐、'+counts.reference+' 项参考案例'));
 overview.hash('#experience');const takeaways=overview.doc.querySelectorAll('.experience-takeaways')[0];assert.equal(takeaways.querySelectorAll('li').length,4);assert.equal(takeaways.querySelectorAll('details').length,0,'four takeaways are not hidden in a disclosure');
 const next=overview.doc.querySelectorAll('.experience-next')[0];assert.ok(next.querySelectorAll('a').some(a=>a.href==='#path'));next.querySelector('button').dispatch('click');assert.equal(overview.active,overview.doc.getElementById('experience-topic'),'browse shortcut focuses the question filter');
 overview.hash('#experience-case-v2ex-first-attempt-reflection-2023');overview.doc.getElementById('experience-case-v2ex-first-attempt-reflection-2023').querySelector('.experience-return').dispatch('click');assert.equal(overview.context.location.hash,'#experience');assert.equal(overview.doc.getElementById('experience-scope').value,'all');assert.equal(overview.doc.querySelectorAll('.experience-card').length,counts.experiences);assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal,'all case and plan return journeys leave saved state unchanged');
 // Back from a citation restores the original subset, while manual filter changes clear a stale case URL.
 const priorTopic=overview.doc.getElementById('experience-topic');priorTopic.value='timing';priorTopic.dispatch('change');
 overview.hash('#experience-case-experience-c2');assert.equal(overview.doc.getElementById('experience-scope').value,'recommended');overview.hash('#experience');assert.equal(priorTopic.value,'timing');assert.equal(overview.doc.getElementById('experience-scope').value,'all');assert.equal(overview.doc.querySelectorAll('.experience-card').length,counts.timing);
 overview.hash('#experience-case-experience-c2');const selectedScope=overview.doc.getElementById('experience-scope');selectedScope.value='reference';selectedScope.dispatch('change');assert.equal(overview.context.location.hash,'#experience','manual scope changes stop sharing an unrelated exact-case hash');assert.equal(overview.doc.querySelectorAll('.experience-card').length,counts.experienceReference);assert.equal(overview.saved.get('ieltsorbit.local.v1'),personal);
 // Interrupted draft work remains visible as a draft; only explicit save replaces original choices.
 const interrupted=harness({rawState:personal,hash:'#path'});await interrupted.flush();const dn=interrupted.nodes;
 assert.equal(dn['plan-draft-status'].hidden,true);dn['edit-plan'].dispatch('click');dn['daily-time'].value='15';dn['weak-skill'].value='reading';interrupted.hash('#library');interrupted.hash('#path/result');
 assert.ok(interrupted.text(dn['path-result']).includes('每天约 15 分钟'));assert.equal(dn['plan-draft-status'].hidden,false);assert.ok(dn['plan-draft-status'].textContent.includes('尚未保存的调整'));assert.equal(dn['save-path'].textContent,'保存当前调整');assert.equal(dn['edit-plan'].textContent,'继续调整草稿');assert.equal(dn['discard-plan-draft'].hidden,false);assert.equal(interrupted.saved.get('ieltsorbit.local.v1'),personal,'leaving and re-entering result preserves original storage and live draft');
 dn['discard-plan-draft'].dispatch('click');assert.equal(dn['daily-time'].value,'60');assert.equal(dn['weak-skill'].value,'writing');assert.equal(dn['plan-draft-status'].hidden,true);assert.equal(dn['discard-plan-draft'].hidden,true);assert.equal(interrupted.saved.get('ieltsorbit.local.v1'),personal,'discard restores the original without writing');
 dn['edit-plan'].dispatch('click');dn['daily-time'].value='15';interrupted.hash('#path/result');dn['save-path'].dispatch('click');assert.equal(JSON.parse(interrupted.saved.get('ieltsorbit.local.v1')).path.dailyMinutes,'15','explicit save alone accepts draft');assert.equal(dn['plan-draft-status'].hidden,true);assert.equal(dn['save-path'].textContent,'保存这组选择');assert.ok(dn['path-save-status'].textContent.includes('已保存在本浏览器'));

 // Regression: complete all four editing steps before generating, never skip straight to result.
 const storageKey='ieltsorbit.local.v1';
 const editedPlan={examHistory:'no',baseline:'unknown',target:'7',dailyMinutes:'15',weakSkill:'reading',completed:true};
 const generateEditedPreview=view=>{
  const pn=view.nodes,original=view.saved.get(storageKey),writes=view.storageWrites;
  pn['edit-plan'].dispatch('click');
  assert.equal(pn['plan-step-1'].hidden,false);
  pn['exam-history'].value=editedPlan.examHistory;pn.baseline.value=editedPlan.baseline;
  pn['plan-next'].dispatch('click');assert.equal(pn['plan-step-2'].hidden,false);
  pn.target.value=editedPlan.target;
  pn['plan-next'].dispatch('click');assert.equal(pn['plan-step-3'].hidden,false);
  pn['daily-time'].value=editedPlan.dailyMinutes;
  pn['plan-next'].dispatch('click');assert.equal(pn['plan-step-4'].hidden,false);
  pn['weak-skill'].value=editedPlan.weakSkill;
  assert.equal(pn['plan-next'].textContent,'生成今天与本周计划');
  pn['plan-next'].dispatch('click');
  assert.equal(pn['plan-wizard'].hidden,true);assert.equal(pn['path-result'].hidden,false);
  assert.equal(pn['plan-result-actions'].hidden,false);
  assert.match(view.text(pn['path-result']),/每天约 15 分钟，先练阅读/);
  assert.equal(pn['plan-draft-status'].hidden,false);
  assert.match(pn['plan-draft-status'].textContent,/点击“保存当前调整”才会替换原计划/);
  assert.equal(pn['save-path'].textContent,'保存当前调整');
  assert.equal(pn['discard-plan-draft'].hidden,false);
  assert.equal(pn['path-save-status'].textContent,'','preview never announces a save');
  assert.equal(view.saved.get(storageKey),original,'full four-step generate preserves byte-exact original storage');
  assert.equal(view.storageWrites,writes,'generating an existing plan performs no storage write');
 };
 const fullDiscard=harness({rawState:personal,hash:'#path'});await fullDiscard.flush();
 generateEditedPreview(fullDiscard);
 fullDiscard.hash('#library');fullDiscard.hash('#path/result');
 assert.equal(fullDiscard.saved.get(storageKey),personal);
 assert.equal(fullDiscard.nodes['plan-draft-status'].hidden,false);
 fullDiscard.nodes['discard-plan-draft'].dispatch('click');
 assert.equal(fullDiscard.nodes['daily-time'].value,'60');assert.equal(fullDiscard.nodes['weak-skill'].value,'writing');
 assert.match(fullDiscard.text(fullDiscard.nodes['path-result']),/每天约 60 分钟，先练写作/);
 assert.equal(fullDiscard.nodes['plan-draft-status'].hidden,true);
 assert.equal(fullDiscard.saved.get(storageKey),personal);assert.equal(fullDiscard.storageWrites,0);
 // Repeat after discard, then navigate back/forward through step 4 and regenerate.
 generateEditedPreview(fullDiscard);
 fullDiscard.hash('#path/step/4');fullDiscard.nodes['plan-next'].dispatch('click');
 assert.equal(fullDiscard.saved.get(storageKey),personal);assert.equal(fullDiscard.storageWrites,0);
 assert.equal(fullDiscard.doc.querySelectorAll('.today-task').length,3);
 assert.equal(fullDiscard.doc.querySelectorAll('.week-day').length,7);
 fullDiscard.nodes['edit-plan'].dispatch('click');fullDiscard.nodes['cancel-plan-edit'].dispatch('click');
 assert.equal(fullDiscard.nodes['daily-time'].value,'60');assert.equal(fullDiscard.saved.get(storageKey),personal);

 const fullRefresh=harness({rawState:personal,hash:'#path'});await fullRefresh.flush();
 generateEditedPreview(fullRefresh);
 const refreshedPreview=harness({rawState:fullRefresh.saved.get(storageKey),hash:'#path/result'});await refreshedPreview.flush();
 assert.equal(refreshedPreview.nodes['daily-time'].value,'60');assert.equal(refreshedPreview.nodes['weak-skill'].value,'writing');
 assert.equal(refreshedPreview.nodes['plan-draft-status'].hidden,true);
 assert.equal(refreshedPreview.saved.get(storageKey),personal);assert.equal(refreshedPreview.storageWrites,0);

 const fullSave=harness({rawState:personal,hash:'#path'});await fullSave.flush();
 generateEditedPreview(fullSave);
 fullSave.nodes['save-path'].dispatch('click');
 const accepted=JSON.parse(fullSave.saved.get(storageKey));
 assert.deepEqual(accepted,{saved:['writing-rubric'],path:editedPlan});
 assert.equal(fullSave.storageWrites,1);assert.equal(fullSave.nodes['plan-draft-status'].hidden,true);
 assert.equal(fullSave.nodes['discard-plan-draft'].hidden,true);
 assert.match(fullSave.nodes['path-save-status'].textContent,/已保存在本浏览器/);
 const refreshedSave=harness({rawState:fullSave.saved.get(storageKey),hash:'#path/result'});await refreshedSave.flush();
 assert.equal(refreshedSave.nodes['daily-time'].value,'15');assert.equal(refreshedSave.nodes['weak-skill'].value,'reading');
 assert.equal(refreshedSave.nodes['plan-draft-status'].hidden,true);
 assert.deepEqual(JSON.parse(refreshedSave.saved.get(storageKey)),accepted);

 // A separate bookmark write while previewing must also persist the ORIGINAL plan.
 const bookmarkDuringPreview=harness({rawState:personal,hash:'#path'});await bookmarkDuringPreview.flush();
 generateEditedPreview(bookmarkDuringPreview);
 bookmarkDuringPreview.hash('#library/writing');
 const saveResource=bookmarkDuringPreview.doc.getElementById('resource-writing-rubric').querySelector('[data-save]');
 bookmarkDuringPreview.nodes['resource-grid'].dispatch('click',{target:saveResource});
 assert.deepEqual(JSON.parse(bookmarkDuringPreview.saved.get(storageKey)).path,JSON.parse(personal).path);
 assert.deepEqual(JSON.parse(bookmarkDuringPreview.saved.get(storageKey)).saved,[]);
 bookmarkDuringPreview.hash('#path/result');
 assert.equal(bookmarkDuringPreview.nodes['plan-draft-status'].hidden,false);
 bookmarkDuringPreview.nodes['discard-plan-draft'].dispatch('click');
 assert.equal(bookmarkDuringPreview.nodes['daily-time'].value,'60');
 assert.deepEqual(JSON.parse(bookmarkDuringPreview.saved.get(storageKey)).path,JSON.parse(personal).path);

 // First creation keeps auto-save, explicitly named in the final step's action.
 for(const rawState of [undefined,JSON.stringify({saved:['writing-rubric'],path:{baseline:'6.5',target:'7.5'}})]){
  const first=harness({rawState,hash:'#path'});await first.flush();
  const before=first.saved.get(storageKey);
  for(let step=1;step<4;step++){assert.equal(first.nodes['plan-step-'+step].hidden,false);first.nodes['plan-next'].dispatch('click');assert.equal(first.saved.get(storageKey),before);}
  assert.equal(first.nodes['plan-next'].textContent,'生成并保存今天与本周计划');
  first.nodes['plan-next'].dispatch('click');assert.equal(first.storageWrites,1);
  assert.equal(JSON.parse(first.saved.get(storageKey)).path.completed,true);
  assert.match(first.nodes['path-save-status'].textContent,/已生成并保存在本浏览器/);
  const restored=harness({rawState:first.saved.get(storageKey),hash:'#path/result'});await restored.flush();
  assert.equal(restored.nodes['plan-draft-status'].hidden,true);
  assert.equal(restored.saved.get(storageKey),first.saved.get(storageKey));
 }
 console.log('PASS: full four-step plan preview is read-only; discard/cancel, regenerate, refresh, explicit save, bookmark isolation, and first/legacy creation autosave.');
 const unsavedResult=harness({hash:'#path/result'});await unsavedResult.flush();assert.equal(unsavedResult.nodes['plan-draft-status'].hidden,false);assert.equal(unsavedResult.nodes['discard-plan-draft'].hidden,true);assert.equal(unsavedResult.saved.size,0,'read-only result preview does not save');
 console.log('PASS: interrupted live drafts are explicitly labeled; discard restores original without writes; explicit save accepts draft and clears notice; unsaved previews remain unsaved.');
 const visibleScope=html.indexOf('id="recommendation-filter"'),advanced=html.indexOf('<details id="advanced-filters"');assert.ok(visibleScope<advanced,'scope control is outside the collapsed advanced filters');
 const initial=harness({hash:'#path'});await initial.flush();assert.equal(initial.nodes['cancel-plan-edit'].hidden,true,'no misleading cancel-to-saved-plan control before a plan exists');assert.equal(initial.saved.size,0);
 console.log('PASS: always-visible scope and four-skill/experience/plan overviews; seven visible day outputs; plan filter reset, modifier clicks, explicit returns, cancel draft, and byte-exact preserved saved state.');
 const old=harness({rawState:JSON.stringify({saved:['writing-rubric'],path:{baseline:'6.5',target:'7.5'}}),hash:'#path'});await old.flush();assert.equal(old.nodes.baseline.value,'6.5');assert.equal(old.nodes.target.value,'7.5');assert.equal(old.nodes['plan-step-1'].hidden,false,'legacy state enters new guide');
 const blocked=harness({storageBlocked:true,offline:true,hash:'#path'});await blocked.flush();for(let i=0;i<4;i++)blocked.nodes['plan-next'].dispatch('click');assert.equal(blocked.nodes['path-result'].hidden,false,'offline plan usable');assert.ok(blocked.text(blocked.nodes['path-save-status']).includes('暂存'));assert.ok(blocked.text(blocked.nodes['path-result']).includes('不表示判断听力'));assert.ok(blocked.text(blocked.nodes['path-result']).includes('不改变本周练习内容'));assert.ok(blocked.text(blocked.nodes['experience-root']).includes('未加载成功'));
 const short=harness({hash:'#path'});await short.flush();short.nodes['daily-time'].value='15';short.nodes['weak-skill'].value='reading';for(let i=0;i<4;i++)short.nodes['plan-next'].dispatch('click');assert.ok(short.text(short.nodes['path-result']).includes('不安排完整阅读卷或15分钟的整组原创练习'));assert.equal(short.descendants(short.nodes['path-result']).filter(n=>n.href==='./practice-preview/').length,0,'15 minute day does not link a 15 minute quiz plus additional tasks');
 // Cold-loaded / shared synthesis citations resolve after catalog loading.
 for(const resource of data.resources.filter(r=>r.sourceType==='experience')){
  const hash='#experience-case-'+resource.id,deep=harness({hash});await deep.flush();
  assert.equal(deep.nodes['panel-experience'].hidden,false,'deep link selects experience tab');
  assert.equal(deep.nodes['panel-start'].hidden,true,'deep link does not silently show home');
  const target=deep.doc.getElementById('experience-case-'+resource.id);
  assert.ok(target?.querySelector('details').open,'exact cited case opens on fresh load');
  assert.equal(deep.doc.getElementById('experience-scope').value,resource.recommendedByDefault===false?'reference':'recommended');
  assert.equal(deep.saved.size,0,'citation navigation does not write personal state');
  deep.hash('#library');deep.hash(hash);
  assert.equal(deep.nodes['panel-experience'].hidden,false,'history replay returns to experience');
  assert.ok(deep.doc.getElementById('experience-case-'+resource.id).querySelector('details').open);
 }
 const jump=harness({hash:'#experience'});await jump.flush();
 const jumpLink=jump.doc.querySelectorAll('.experience-source-links').flatMap(n=>n.children).find(n=>n.href==='#experience-case-experience-c2');
 let prevented=false;jumpLink.dispatch('click',{ctrlKey:true,preventDefault(){prevented=true;}});
 assert.equal(prevented,false,'modified clicks keep native open-in-new-tab behavior');
 assert.equal(jump.context.location.hash,'#experience','modified clicks leave current page unchanged');
 jumpLink.dispatch('click');assert.equal(jump.context.location.hash,'#experience-case-experience-c2','ordinary citation click updates shareable URL');
 jumpLink.dispatch('click');assert.ok(jump.doc.getElementById('experience-case-experience-c2').querySelector('details').open,'repeated click keeps case expanded');
 const unknown=harness({hash:'#experience-case-not-a-real-case'});await unknown.flush();
 assert.equal(unknown.nodes['panel-experience'].hidden,false);assert.equal(unknown.doc.querySelectorAll('.experience-card').length,counts.experiences,'unknown ID retains usable experience index');
 const wrongKind=harness({hash:'#experience-case-official-samples'});await wrongKind.flush();
 assert.equal(wrongKind.doc.querySelectorAll('.experience-card').length,counts.experiences,'only experience records become case targets');
 console.log('PASS: current catalog counts and complete experience coverage; retained source, route, state, and provenance regressions.');
 console.log('PASS: current catalog counts and complete experience coverage; retained source, route, state, and provenance regressions.');
})();
