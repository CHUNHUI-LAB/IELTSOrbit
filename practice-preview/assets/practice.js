'use strict';
const P=IELTSPracticeSets,requestedSet=new URLSearchParams(window.location.search).get('set');
const selectedSet=P.get(requestedSet)||P.sets[0],C=selectedSet.content,K=IELTSCore,$=id=>document.getElementById(id),KEY=selectedSet.key;
let backend;try{backend=window.localStorage;}catch{backend=null;}
const store=K.storage(backend,KEY),loaded=store.load();
let storageSnapshot=loaded.ok?JSON.stringify(loaded.data):undefined,storageConflict=false,memoryDirty=false;
const locks=window.navigator?.locks;
let lockingAvailable=typeof locks?.request==='function',pendingChanges=0,changeQueue=Promise.resolve();
const envelope=loaded.data&&typeof loaded.data==='object'&&!Array.isArray(loaded.data)&&Array.isArray(loaded.data.history)&&Object.hasOwn(loaded.data,'current');
let db=envelope?loaded.data:{current:null,history:[]};let state=K.restore(db.current,C);let view='intro';
if(!loaded.ok)$('storage-warning').hidden=false;
if(loaded.ok&&loaded.data!==null&&(!envelope||(db.current!==null&&!state))){
 $('storage-warning').textContent='上次练习记录格式不完整或内容版本已更新，无法恢复。可以重新开始；本站其他模块的记录未改动。';$('storage-warning').hidden=false;
 db={current:null,history:[]};
}
// History is a local count ledger only; discard malformed entries and replace the
// current result with its freshly graded counterpart before any future save.
db.history=db.history.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.attemptId==='string'&&r.contentId===C.id&&r.version===C.version&&Number.isInteger(r.total)&&r.total>0&&r.total<=C.questions.length&&Number.isInteger(r.score)&&r.score>=0&&r.score<=r.total);
db.history=db.history.filter((r,i,all)=>all.findIndex(other=>other.attemptId===r.attemptId)===i);
if(state?.status==='submitted')db.history=db.history.filter(r=>r.attemptId!==state.id).concat({...state.result,contentId:C.id,version:C.version,mode:state.mode});
db.current=state;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function memoryWarning(){
 $('storage-warning').hidden=false;
 if(!lockingAvailable)$('storage-warning').textContent='此浏览器暂不能安全协调多标签页保存。本次可继续在当前页面练习，但不会改写已保存记录；刷新或离开后，本次未保存的内容会丢失。';
 $('clear').disabled=!lockingAvailable;
}
function lockStaleView(){
 storageConflict=true;$('storage-conflict').hidden=false;
 if($('submit-dialog').open)$('submit-dialog').close();
 // Keep text answers readable and selectable during recovery. Do not use inert,
 // which would remove the current answers from the accessibility tree.
 for(const input of $('questions').querySelectorAll('input')){
  if(input.type==='radio')input.disabled=true;else input.readOnly=true;
 }
 for(const button of $('questions').querySelectorAll('button'))button.disabled=true;
 for(const id of ['start','restore','pause','finish','retry','again','home','clear','confirm-submit'])if($(id))$(id).disabled=true;
 $('storage-conflict').focus();
}
function currentStorage(){
 if(storageConflict)return false;
 if(storageSnapshot===undefined)return true;
 const latest=store.load();
 if(!latest.ok||JSON.stringify(latest.data)!==storageSnapshot){lockStaleView();return false;}
 return true;
}
function saveStatus(){$('save-status').hidden=pendingChanges===0;}
function commitChange(change,{clear=false}={}){
 pendingChanges++;saveStatus();
 const task=changeQueue.then(async()=>{
  if(storageConflict)return false;
  const execute=()=>{
   if(!currentStorage())return false;
   // A failed removal must not erase the still-readable in-memory attempt.
   if(clear&&!store.clear()){$('storage-warning').hidden=false;return false;}
   if(change()===false)return false;
   db.current=state;
   if(clear){storageSnapshot='null';memoryDirty=false;}
   else if(!lockingAvailable||storageSnapshot===undefined){memoryDirty=true;memoryWarning();}
   else if(!store.save(db)){memoryDirty=true;$('storage-warning').hidden=false;}
   else {storageSnapshot=JSON.stringify(db);memoryDirty=false;}
   updateHistory();return true;
  };
  // With no lock manager, practice is in-memory only. No competing stored record
  // is written or deleted. The same-origin named lock serializes updated tabs.
  if(!lockingAvailable||(!clear&&storageSnapshot===undefined)){
   if(clear){memoryWarning();return false;}
   return execute();
  }
  let entered=false;
  try{return await locks.request(KEY+'.writer',{mode:'exclusive'},()=>{entered=true;return execute();});}
  catch(error){
   if(entered)throw error;
   lockingAvailable=false;memoryWarning();
   return clear?false:execute();
  }
 });
 changeQueue=task.catch(()=>{});
 return task.finally(()=>{pendingChanges--;saveStatus();});
}
function updateHistory(){$('history-count').textContent=`当前题组「${C.title}」本机已完成 ${db.history.length} 次练习（含重练）`;}
function show(name){view=name;for(const id of ['intro','workspace','results'])$(id).hidden=id!==name;}
function renderExercise(){show('workspace');$('passage').innerHTML=C.paragraphs.map(p=>`<p id="para-${p.id}" lang="en"><span class="paragraph-label">${p.id}</span>${esc(p.text)}</p>`).join('');$('questions').innerHTML=C.questions.filter(q=>state.ids.includes(q.id)).map(q=>{let options=q.type==='tfng'?{'TRUE':'TRUE','FALSE':'FALSE','NOT GIVEN':'NOT GIVEN'}:q.options;return `<fieldset class="question" id="q-${q.id}" tabindex="-1"><legend>QUESTION ${q.id} · ${q.type==='text'?`EXACTLY ${q.requiredWords===2?'TWO WORDS':'ONE WORD'}`:q.type==='tfng'?'TRUE / FALSE / NOT GIVEN':'CHOOSE ONE ANSWER'}</legend><p lang="en"><strong>${q.id}. ${esc(q.prompt)}</strong></p>${q.type==='text'?`<label for="answer-${q.id}" class="hint">从文章选词，恰好 ${q.requiredWords} 个词</label><input id="answer-${q.id}" class="text-answer" data-q="${q.id}" value="${esc(state.answers[q.id]||'')}" spellcheck="false" autocapitalize="off" aria-label="第 ${q.id} 题答案">`:Object.entries(options).map(([value,label])=>`<label class="option" lang="en"><input type="radio" data-q="${q.id}" name="q${q.id}" value="${esc(value)}" ${state.answers[q.id]===value?'checked':''}><span>${q.type==='choice'?value+'. ':''}${esc(label)}</span></label>`).join('')}<button type="button" class="flag" data-flag="${q.id}" aria-pressed="${!!state.flags[q.id]}">${state.flags[q.id]?'已标记 · 取消标记':'标记待检查'}</button></fieldset>`;}).join('');updateNav();syncPause();tick();if(view==='workspace'&&!storageConflict)$('workspace').focus();}
function updateNav(){$('nav').innerHTML=state.ids.map(id=>`<button type="button" data-goto="${id}" class="${K.normalize(state.answers[id])?'answered ':''}${state.flags[id]?'flagged':''}" aria-label="第 ${id} 题，${K.normalize(state.answers[id])?'已答':'未答'}${state.flags[id]?'，已标记':''}">${id}${state.flags[id]?' ·':''}</button>`).join('');}
function syncPause(){const paused=state.status==='paused';$('exercise').hidden=paused;$('nav').hidden=paused;$('paused-message').hidden=!paused;$('pause').hidden=state.mode!=='practice';$('pause').textContent=paused?'继续':'暂停';}
async function start(ids,mode=document.querySelector('input[name="mode"]:checked').value){
 if(!currentStorage())return;
 const previousId=state?.id??null;let startedId;
 const changed=await commitChange(()=>{
  if((state?.id??null)!==previousId)return false;
  state=K.create(C,mode,Date.now(),ids);startedId=state.id;
 });
 if(changed&&!storageConflict&&state?.id===startedId&&state.status!=='submitted'){renderExercise();window.scrollTo(0,0);}
}
async function finish({automatic=false,requestedAt=Date.now()}={}){
 if(!state||state.status==='submitted'||storageConflict)return;
 const attemptId=state.id;
 const changed=await commitChange(()=>{
  if(state?.id!==attemptId||state.status==='submitted')return false;
  if(automatic&&(state.status!=='active'||K.remaining(state)>0))return false;
  const result=K.submit(state,C,automatic?Date.now():requestedAt);
  if(!db.history.some(r=>r.attemptId===result.attemptId))db.history.push({...result,contentId:C.id,version:C.version,mode:state.mode});
 });
 if(changed&&!storageConflict&&state?.id===attemptId&&state.status==='submitted'){if($('submit-dialog').open)$('submit-dialog').close();renderResults();}
}
function renderResults(){show('results');const r=state.result;const wrong=r.rows.filter(x=>!x.correct);$('results').innerHTML=`<div class="result-hero"><p class="eyebrow">YOUR READING REVIEW</p><h1>${r.total===C.questions.length?'本次练习完成':'错题重练完成'}</h1><p class="score">${r.score}<span class="lead"> / ${r.total}</span></p><p>准确率 ${Math.round(r.score/r.total*100)}% · 未答 ${r.unanswered} 题 · 用时 ${Math.floor(r.elapsedSeconds/60)} 分 ${r.elapsedSeconds%60} 秒</p><p>原创模拟自测结果，不代表 IELTS band 或正式考试成绩。</p><div class="result-actions">${wrong.length?'<button id="retry" class="primary">只重练本次错题</button>':''}<button id="again">重新练习全部 ${C.questions.length} 题</button><button id="home">返回练习说明</button></div></div><h2>答案与证据</h2><p>先看原文证据，再看推理。重练会创建新记录，不会改写本次结果。</p>${r.rows.map(row=>{const q=C.questions.find(x=>x.id===row.id);return `<section class="review ${row.correct?'correct':'incorrect'}"><h3>${q.id}. ${row.correct?'正确':'需要复习'}${!row.correct?' · '+esc(row.reason):''}</h3><p lang="en">${esc(q.prompt)}</p><p>你的答案：<strong>${esc(row.value)||'未作答'}</strong><br>正确答案：<strong>${esc(q.answers[0])}</strong></p><p class="hint">英文证据 · 段落 ${q.paragraph}${q.type==='tfng'&&q.answers.some(answer=>K.normalize(answer)==='not given')?'（仍须结合全文确认未提及）':''}</p><div class="evidence" lang="en">${esc(q.evidence)}</div><p>${esc(q.explanation)}</p><p class="hint">复习标签：${esc(q.errorTag)}</p></section>`;}).join('')}<details><summary>展开完整文章</summary><article>${C.paragraphs.map(p=>`<p lang="en"><strong>${p.id}</strong> ${esc(p.text)}</p>`).join('')}</article></details>`;$('retry')?.addEventListener('click',()=>start(wrong.map(x=>x.id),state.mode));$('again').onclick=()=>start(undefined,state.mode);$('home').onclick=()=>{show('intro');$('restore').hidden=false;$('restore').textContent='查看上次结果';$('intro').focus();window.scrollTo(0,0);};$('results').focus();window.scrollTo(0,0);}
function tick(){if(storageConflict||!state||state.status==='submitted')return;const ms=K.remaining(state);if(ms===0)return finish({automatic:true});const s=Math.ceil(ms/1000);$('timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
$('start').onclick=()=>{if(!currentStorage())return;if(state&&state.status!=='submitted'&&!confirm('开始新练习会替换尚未交卷的进度。继续吗？'))return;return start();};
$('restore').hidden=!state;$('restore').textContent=state?.status==='submitted'?'查看上次结果':'继续上次练习';$('restore').onclick=()=>{if(!currentStorage())return;state.status==='submitted'?renderResults():renderExercise();};
$('questions').addEventListener('submit',e=>e.preventDefault());
$('questions').addEventListener('input',async e=>{
 if(!e.target.dataset.q||state?.status!=='active'||!currentStorage())return;
 const id=e.target.dataset.q,value=e.target.value,attemptId=state.id,eventAt=Date.now();
 const changed=await commitChange(()=>{
  if(state?.id!==attemptId||state.status!=='active'||K.remaining(state,eventAt)<=0)return false;
  state.answers[id]=value;
 });
 if(changed&&!storageConflict&&state?.id===attemptId)updateNav();
 else if(!storageConflict&&state?.id===attemptId&&K.remaining(state)<=0)return finish({automatic:true});
});
$('questions').addEventListener('click',async e=>{
 const id=e.target.dataset.flag;if(!id||state?.status!=='active'||!currentStorage())return;
 const attemptId=state.id,eventAt=Date.now();
 const changed=await commitChange(()=>{
  if(state?.id!==attemptId||state.status!=='active'||K.remaining(state,eventAt)<=0)return false;
  state.flags[id]=!state.flags[id];e.target.setAttribute('aria-pressed',String(state.flags[id]));e.target.textContent=state.flags[id]?'已标记 · 取消标记':'标记待检查';
 });
 if(changed&&!storageConflict&&state?.id===attemptId)updateNav();
 else if(!storageConflict&&state?.id===attemptId&&K.remaining(state)<=0)return finish({automatic:true});
});
$('nav').onclick=e=>{const id=e.target.dataset.goto;if(id){const q=$('q-'+id);q.scrollIntoView({block:'start'});(q.querySelector('input:not(:disabled)')||q).focus({preventScroll:true});}};
$('pause').onclick=async()=>{
 if(!state||!currentStorage())return;const attemptId=state.id,eventAt=Date.now();
 const changed=await commitChange(()=>{
  if(state?.id!==attemptId||state.status==='submitted'||K.remaining(state,eventAt)<=0)return false;
  state.status==='paused'?K.resume(state,eventAt):K.pause(state,eventAt);
 });
 if(changed&&!storageConflict&&state?.id===attemptId&&state.status!=='submitted'){syncPause();tick();}
 else if(!storageConflict&&state?.id===attemptId&&K.remaining(state)<=0)return finish({automatic:true});
};
$('finish').onclick=async()=>{
 await changeQueue;if(!state||state.status==='submitted'||!currentStorage())return;
 if(K.remaining(state)<=0)return finish({automatic:true});
 const missing=state.ids.filter(id=>!K.normalize(state.answers[id])).length,flags=state.ids.filter(id=>state.flags[id]).length;
 $('submit-summary').textContent=`共 ${state.ids.length} 题，${missing} 题未作答，${flags} 题标记待检查。`;$('submit-dialog').showModal();
};
$('cancel-submit').onclick=()=>$('submit-dialog').close();$('confirm-submit').onclick=finish;
$('clear').onclick=async()=>{
 if(!lockingAvailable){memoryWarning();return;}
 if(!currentStorage()||!confirm(`清空当前题组「${C.title}」在此浏览器的记录及当前进度？其他题组不受影响。此操作无法撤销。`)||!currentStorage())return;
 const changed=await commitChange(()=>{state=null;db={current:null,history:[]};},{clear:true});
 if(changed&&!storageConflict&&!state){show('intro');$('restore').hidden=true;updateHistory();$('intro').focus();}
};
// Mutation and persistence share the lock. Absolute deadlines restore timing;
// never save a stale tab on pagehide. Warn for queued or unsaved in-memory work.
window.addEventListener('beforeunload',e=>{if(pendingChanges>0||memoryDirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)currentStorage();});
$('reload-latest').onclick=()=>window.location.reload();

let setNavigation=0;
function renderSetMetadata(){
 document.title='IELTSOrbit · '+C.title;
 $('set-title').textContent=C.title+' · '+C.subtitle;
 $('workspace-title').textContent=C.title;
 $('set-stats').textContent=`${P.words(C)} 词 · ${C.paragraphs.length} 段 · ${C.questions.length} 题 · 限时 ${C.durationSeconds/60} 分钟`;
 $('set-timing').textContent=`两种模式均按 ${C.durationSeconds/60} 分钟倒计时，时间用完会自动交卷；练习模式可暂停。未暂停时，刷新、离开或切换题组仍继续计时。`;
 $('set-types').textContent=P.types(C);
 $('set-notice').textContent=C.notice;
 $('set-instructions').textContent=P.instructions(C);
 $('set-rights').textContent=selectedSet.rights+' 内容版本：'+C.version+'。此页面为原创练习，不代表 IELTS 官方认可。';
 $('set-route-warning').hidden=!requestedSet||!!P.get(requestedSet);
 $('set-choices').innerHTML=P.sets.map(set=>`<a id="set-link-${set.content.id}" class="set-card${set===selectedSet?' selected':''}" href="${P.href(set.content.id)}" ${set===selectedSet?'aria-current="page"':''}><span class="hint">${set===selectedSet?'当前题组':'另一套原创练习'} · ${esc(set.focus)}</span><strong lang="en">${esc(set.content.title)}</strong><span>${esc(set.content.subtitle)}</span><span class="hint">${P.words(set.content)} 词 · ${set.content.questions.length} 题 · 限时 ${set.content.durationSeconds/60} 分钟</span><span class="hint">${esc(P.types(set.content))}</span></a>`).join('');
 for(const set of P.sets)$('set-link-'+set.content.id).onclick=e=>{
  // Modified clicks retain the current document and use native link semantics.
  if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();return switchSet(set.content.id);
 };
}
async function switchSet(id){
 const target=P.get(id);if(!target)return false;
 const request=++setNavigation;
 if(id===C.id)return false;
 // No state is copied between sets and there is no unload write. Wait until the
 // current queue is stable before leaving, including input captured before click.
 let queue;do{queue=changeQueue;await queue;}while(queue!==changeQueue);
 if(request!==setNavigation)return false;
 if(!currentStorage()||memoryDirty){
  $('set-open-separate').setAttribute('href',P.href(id));
  $('set-switch-help').hidden=false;$('set-switch-help').focus();return false;
 }
 window.location.assign(P.href(id));return true;
}
renderSetMetadata();

if(!lockingAvailable)memoryWarning();
updateHistory();setInterval(tick,500);if(state&&state.status==='active'&&K.remaining(state)===0)finish({automatic:true});
