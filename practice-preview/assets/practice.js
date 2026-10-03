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
// Keep the existing completed-result records; discard malformed aggregate entries
// and replace the current result with its freshly graded counterpart before a save.
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
 if($('history-running-notice'))$('history-running-notice').hidden=true;
 if($('history-sync-warning'))$('history-sync-warning').hidden=false;
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
function show(name){view=name;for(const id of ['intro','workspace','results','history'])$(id).hidden=id!==name;$('history-open').hidden=name==='history';$('clear').hidden=name==='history';}
// History navigation reads a separate projection. It never installs an old result
// as current state, saves records, starts a retry, or changes the running deadline.
let historyReturnView='intro',historyRecords=[];
const historyTimeValid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=8640000000000000;
function historyDate(value){return historyTimeValid(value)?new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(value):'完成时间未记录';}
function historyMeta(r){
 const mode=r.mode==='practice'?'练习模式':r.mode==='timed'?'计时模式':'模式未记录';
 const elapsed=Number.isInteger(r.elapsedSeconds)&&r.elapsedSeconds>=0&&r.elapsedSeconds<=C.durationSeconds?`用时 ${Math.floor(r.elapsedSeconds/60)} 分 ${r.elapsedSeconds%60} 秒`:'用时未记录';
 return `${historyDate(r.completedAt)} · ${mode} · ${elapsed}`;
}
function historyRows(r){
 if(!Array.isArray(r.rows)||r.rows.length!==r.total)return null;
 const seen=new Set();let score=0;
 for(const row of r.rows){
  if(!row||typeof row!=='object'||Array.isArray(row)||!Number.isInteger(row.id)||seen.has(row.id)||typeof row.value!=='string')return null;
  const q=C.questions.find(q=>q.id===row.id);if(!q)return null;
  const mark=K.grade(q,row.value);
  if(row.correct!==mark.correct||row.reason!==mark.reason)return null;
  seen.add(row.id);if(mark.correct)score++;
 }
 return score===r.score?r.rows.map(row=>({...row})):null;
}
function historyShell(body){
 show('history');
 const running=state&&state.status!=='submitted'&&!storageConflict;
 $('history').innerHTML=`<div class="history-heading"><div><p class="eyebrow">PAST READING REVIEWS</p><h1 id="history-title" tabindex="-1">本题组历史记录</h1></div><button id="history-close" type="button">返回${historyReturnView==='workspace'?'当前练习':historyReturnView==='results'?'本次结果':'练习说明'}</button></div><p class="lead" lang="en">${esc(C.title)}</p><p class="hint">只显示当前题组、内容版本 ${esc(C.version)} 中仍可读取的已完成记录。作答保存在当前浏览器，不上传、不跨设备同步。若上方提示保存失败，新记录可能仅在当前页面。</p><p id="history-sync-warning" class="warning" ${storageConflict?'':'hidden'}>本页记录已与存储内容不同步，以下仅为本页原有历史副本。当前页的计时显示和作答已冻结；请先阅读上方的记录冲突提示。</p>${running?`<p id="history-running-notice" class="notice">${state.status==='paused'?'当前练习已暂停，查看历史不会恢复计时。':'当前练习仍在计时，查看历史不会暂停；到时会自动交卷并显示本次结果。'} 剩余 <span id="history-running-timer"></span></p>`:''}${body}`;
 $('history-close').onclick=()=>{show(historyReturnView);(storageConflict?$('storage-conflict'):$('history-open')).focus();};
 if(running){const s=Math.ceil(K.remaining(state)/1000);$('history-running-timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
}
function renderHistoryList(focusId){
 historyShell(`<h2>已完成记录 · ${historyRecords.length} 次</h2><p>原始分数只用于本练习，不换算 IELTS band。较新的记录排在前面；未记录完成时间的条目列在最后。</p>${historyRecords.length?`<ol class="history-list">${historyRecords.map(({record:r,index})=>`<li><h3>第 ${index+1} 次 · 保存分数 ${r.score} / ${r.total}</h3><p class="hint">${esc(historyMeta(r))}</p><p>${r.total===C.questions.length?'全套练习':`部分题目练习 · ${r.total} 题`} · ${historyRows(r)?'可查看答案与解析':'仅有可用的分数概要'}</p><button id="history-entry-${index}" type="button">查看第 ${index+1} 次记录</button></li>`).join('')}</ol>`:'<p class="notice">暂无可查看的已完成记录。交卷后，能够保存的结果会显示在这里；未提交的练习不列入历史。</p>'}`);
 for(const {index}of historyRecords)$('history-entry-'+index).onclick=()=>renderHistoryDetail(index);
 (storageConflict?$('storage-conflict'):$(focusId)||$('history-title')).focus();
}
function renderHistoryDetail(index){
 const entry=historyRecords.find(item=>item.index===index);if(!entry)return;
 const r=entry.record,rows=historyRows(r);
 historyShell(`<button id="history-back" type="button">← 返回历史记录列表</button><div class="result-hero"><h2>第 ${index+1} 次记录</h2><p class="score">${r.score}<span class="lead"> / ${r.total}</span></p><p>${esc(historyMeta(r))}</p><p>保存的原始分数，仅用于这次原创练习，不代表 IELTS band 或正式考试成绩。</p></div>${rows?`<h2>当时答案与解析</h2><p>答案来自这次已保存的记录；证据与解析来自对应内容版本 ${esc(C.version)} 的题目。此页只读，不会替换当前练习。</p>${rows.map(row=>{const q=C.questions.find(q=>q.id===row.id);return `<section class="review ${row.correct?'correct':'incorrect'}"><h3>${q.id}. ${row.correct?'正确':'需要复习'}${!row.correct?' · '+esc(row.reason):''}</h3><p lang="en">${esc(q.prompt)}</p><p>当时答案：<strong>${esc(row.value)||'未作答'}</strong><br>正确答案：<strong>${esc(q.answers[0])}</strong></p><p class="hint">英文证据 · 段落 ${q.paragraph}${q.type==='tfng'&&q.answers.some(answer=>K.normalize(answer)==='not given')?'（仍须结合全文确认未提及）':''}</p><div class="evidence" lang="en">${esc(q.evidence)}</div><p>${esc(q.explanation)}</p><p class="hint">复习标签：${esc(q.errorTag)}</p></section>`;}).join('')}<details><summary>展开本版本完整文章</summary><article>${C.paragraphs.map(p=>`<p lang="en"><strong>${p.id}</strong> ${esc(p.text)}</p>`).join('')}</article></details>`:'<p class="warning">这条记录的逐题答案缺失、不完整或无法核对，只能显示已保存的分数概要，无法重建当时作答与逐题解析。不会用当前练习的答案补齐。</p>'}`);
 $('history-back').onclick=()=>renderHistoryList('history-entry-'+index);
 (storageConflict?$('storage-conflict'):$('history-title')).focus();
}
$('history-open').onclick=async()=>{
 // Let already-requested input, pause/resume or submission settle first.
 let queue;do{queue=changeQueue;await queue;}while(queue!==changeQueue);
 if(view==='history'||!currentStorage())return;
 historyReturnView=view;
 historyRecords=db.history.map((record,index)=>({record,index})).sort((a,b)=>{
  const at=historyTimeValid(a.record.completedAt)?a.record.completedAt:-1,bt=historyTimeValid(b.record.completedAt)?b.record.completedAt:-1;
  return bt-at||b.index-a.index;
 });
 renderHistoryList();
};
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
function tick(){if(storageConflict||!state||state.status==='submitted')return;const ms=K.remaining(state);if(ms===0)return finish({automatic:true});const s=Math.ceil(ms/1000);$('timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(view==='history'&&$('history-running-timer'))$('history-running-timer').textContent=$('timer').textContent;}
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
