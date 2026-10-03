'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,KEY,ROOT}=require('./practice-harness');
const OLD='original-repair-library-001',NEW='original-museum-labels-002',NEWKEY=KEY+'.'+NEW;
const cases=[],test=(name,fn)=>cases.push([name,fn]);
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(setId='',{id='saved-attempt-1',time=1000000,mode='practice',ids,answers={}}={}){
 const h=harness({setId}),C=h.value('C'),K=h.context.IELTSCore,s=K.create(C,mode,time,ids);s.id=id;s.answers=answers;K.submit(s,C,time+60000);
 return {state:clone(s),record:clone({...s.result,contentId:C.id,version:C.version,mode})};
}
function seeded(records,options={}){const key=options.setId===NEW?NEWKEY:KEY;return harness({...options,saved:options.saved||new Map([[key,JSON.stringify({current:options.current||null,history:records})]])});}
function unchanged(h,action){const storage=[...h.saved],state=h.value('JSON.stringify(state)'),history=h.value('JSON.stringify(db.history)'),writes=h.writes;return Promise.resolve(action()).then(()=>{assert.deepEqual([...h.saved],storage);assert.equal(h.value('JSON.stringify(state)'),state);assert.equal(h.value('JSON.stringify(db.history)'),history);assert.equal(h.writes,writes);});}
test('Empty history is available, honest, focused and read-only',async()=>{
 const h=harness();await unchanged(h,async()=>{await h.click('history-open');assert.equal(h.nodes.history.hidden,false);assert.match(h.nodes.history.innerHTML,/暂无可查看/);assert.equal(h.active.id,'history-title');assert.equal(h.nodes.clear.hidden,true);assert.equal(h.nodes['history-open'].hidden,true);await h.click('history-close');assert.equal(h.nodes.intro.hidden,false);assert.equal(h.active.id,'history-open');assert.equal(h.nodes.clear.hidden,false);});
});
test('Full and subset completed records sort newest-first with exact saved metadata',async()=>{
 const first=fixture('',{answers:{1:'TRUE',8:'repair log'}}),second=fixture('',{id:'saved-attempt-2',time:2000000,mode:'timed',ids:[2,10],answers:{2:'FALSE',10:'instructions'}});
 const h=seeded([first.record,second.record]);await unchanged(h,async()=>{await h.click('history-open');const html=h.nodes.history.innerHTML;assert.ok(html.indexOf('第 2 次')<html.indexOf('第 1 次'));assert.match(html,/保存分数 2 \/ 2/);assert.match(html,/部分题目练习 · 2 题/);assert.match(html,/全套练习/);assert.match(html,/计时模式/);assert.match(html,/练习模式/);assert.match(html,/用时 1 分 0 秒/);assert.doesNotMatch(html,/完成时间未记录/);await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,/当时答案：<strong>repair log/);assert.match(h.nodes.history.innerHTML,/原文为三天/);assert.match(h.nodes.history.innerHTML,/对应内容版本 1\.0\.1/);assert.equal(h.nodes.history.querySelectorAll('input').length,0);assert.equal(h.nodes.history.querySelectorAll('button').length,2);assert.equal(h.nodes.retry,undefined);assert.equal(h.nodes.again,undefined);assert.equal(h.active.id,'history-title');await h.click('history-back');assert.equal(h.active.id,'history-entry-0');await h.click('history-entry-1');assert.equal((h.nodes.history.innerHTML.match(/<section class="review /g)||[]).length,2);assert.doesNotMatch(h.nodes.history.innerHTML,/当时答案：<strong>repair log/);await h.click('history-close');assert.equal(h.active.id,'history-open');await h.click('history-open');await h.click('history-close');});
});
test('Current submitted result retains its identity after reviewing an older attempt',async()=>{
 const old=fixture('',{id:'old',answers:{1:'TRUE'}}),latest=fixture('',{id:'latest',time:2000000,answers:{8:'repair log'}}),h=seeded([old.record,latest.record],{current:latest.state});await h.click('restore');const currentHTML=h.nodes.results.innerHTML;
 await unchanged(h,async()=>{await h.click('history-open');assert.match(h.nodes.history.innerHTML,/返回本次结果/);await h.click('history-entry-0');await h.click('history-back');await h.click('history-close');assert.equal(h.nodes.results.hidden,false);assert.equal(h.nodes.results.innerHTML,currentHTML);assert.equal(h.value('state.id'),'latest');});
});
test('Active and paused current attempts preserve answers, flags and deadlines during review',async()=>{
 for(const pause of [false,true]){const old=fixture(),h=seeded([old.record]);await h.click('start');await h.input(8,'synthetic current answer');await h.flag(8);if(pause)await h.click('pause');const question=h.nodes['answer-8'];
 await unchanged(h,async()=>{await h.click('history-open');assert.match(h.nodes.history.innerHTML,pause?/查看历史不会恢复计时/:/查看历史不会暂停/);await h.click('history-entry-0');await h.advance(20000);assert.equal(h.nodes['history-running-timer'].textContent,pause?'15:00':'14:40');await h.click('history-back');await h.click('history-close');assert.equal(h.nodes.workspace.hidden,false);assert.equal(h.nodes['answer-8'],question);assert.equal(question.value,'synthetic current answer');assert.equal(h.value('state.flags[8]'),true);});}
});
test('History entry waits for queued pause and resume before stating timing status',async()=>{
 for(const initiallyPaused of [false,true]){const h=seeded([fixture().record]);await h.click('start');if(initiallyPaused)await h.click('pause');h.locks.hold();const toggle=h.click('pause'),open=h.click('history-open');await Promise.resolve();assert.equal(h.nodes.history.hidden,true);h.locks.release();await Promise.all([toggle,open]);assert.equal(h.value('state.status'),initiallyPaused?'active':'paused');assert.match(h.nodes.history.innerHTML,initiallyPaused?/当前练习仍在计时/:/当前练习已暂停/);await h.click('history-close');}
});
test('Natural expiry during history keeps existing single-submit behavior and current-result focus',async()=>{
 const old=fixture(),h=seeded([old.record],{mode:'timed'});await h.click('start');await h.input(1,'TRUE');await h.click('history-open');await h.click('history-entry-0');const writes=h.writes;await h.advance(900000);assert.equal(h.nodes.history.hidden,true);assert.equal(h.nodes.results.hidden,false);assert.equal(h.active.id,'results');assert.equal(h.db.current.status,'submitted');assert.equal(h.db.history.length,2);assert.equal(h.writes,writes+1);await h.advance(30000);assert.equal(h.writes,writes+1);assert.equal(h.nodes.clear.hidden,false);
});
test('Aggregate-only records explicitly lack date, mode, elapsed and answer details',async()=>{
 const r=fixture().record;for(const key of ['completedAt','elapsedSeconds','mode','rows','unanswered'])delete r[key];const h=seeded([r]);await unchanged(h,async()=>{await h.click('history-open');assert.match(h.nodes.history.innerHTML,/完成时间未记录/);assert.match(h.nodes.history.innerHTML,/模式未记录/);assert.match(h.nodes.history.innerHTML,/用时未记录/);assert.match(h.nodes.history.innerHTML,/仅有可用的分数概要/);await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,/无法重建当时作答与逐题解析/);assert.doesNotMatch(h.nodes.history.innerHTML,/当时答案：|英文证据/);});
});
test('Malformed rows and inconsistent marks safely degrade to an explicit summary',async()=>{
 const mutations=[r=>r.rows=null,r=>r.rows.pop(),r=>r.rows[0].id=999,r=>r.rows[1].id=r.rows[0].id,r=>r.rows[0].value={text:'TRUE'},r=>r.rows[0].correct=true,r=>r.rows[0].reason='forged',r=>r.score=9,r=>r.rows[0]=null];
 for(const mutate of mutations){const r=fixture().record;mutate(r);const h=seeded([r]);await unchanged(h,async()=>{await h.click('history-open');await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,/无法重建当时作答/);assert.doesNotMatch(h.nodes.history.innerHTML,/当时答案：/);});}
});
test('HTML-like answers are escaped and valid questions retain their own explanations',async()=>{
 const r=fixture('',{answers:{8:'<img src=x onerror=alert(1)>'}}).record,h=seeded([r]);await unchanged(h,async()=>{await h.click('history-open');await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(h.nodes.history.innerHTML,/<img/);assert.match(h.nodes.history.innerHTML,/正确答案：<strong>repair log/);});
});
test('Invalid optional metadata remains unknown; undated records sort last',async()=>{
 const invalid=fixture('',{id:'undated'}).record;invalid.completedAt='2026-10-03';invalid.mode='unknown';invalid.elapsedSeconds=99999;const dated=fixture('',{id:'dated'}).record;
 const h=seeded([invalid,dated]);await unchanged(h,async()=>{await h.click('history-open');assert.ok(h.nodes.history.innerHTML.indexOf('第 2 次')<h.nodes.history.innerHTML.indexOf('第 1 次'));assert.match(h.nodes.history.innerHTML,/完成时间未记录/);assert.match(h.nodes.history.innerHTML,/模式未记录/);assert.match(h.nodes.history.innerHTML,/用时未记录/);await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,/完成时间未记录/);});
 for(const bad of [-1,NaN,Infinity,8640000000000001,null])assert.equal(h.value(`historyTimeValid(${String(bad)})`),false);
});
test('Different sets keep separate records, source explanations and untouched storage',async()=>{
 const a=fixture('',{answers:{8:'repair log'}}).record,b=fixture(NEW,{answers:{7:'chronological order'}}).record;
 const saved=new Map([[KEY,JSON.stringify({current:null,history:[a]})],[NEWKEY,JSON.stringify({current:null,history:[b]})],['ieltsorbit.local.v1','{"saved":["synthetic"]}']]);
 for(const setId of ['',NEW]){const h=harness({saved,setId});await unchanged(h,async()=>{await h.click('history-open');await h.click('history-entry-0');assert.match(h.nodes.history.innerHTML,setId?/当时答案：<strong>chronological order/:/当时答案：<strong>repair log/);assert.doesNotMatch(h.nodes.history.innerHTML,setId?/当时答案：<strong>repair log/:/当时答案：<strong>chronological order/);await h.click('history-close');await h.click('set-link-'+(setId?OLD:NEW));assert.equal(h.navigations.length,1);});}
});
test('Foreign content/version and duplicate attempt IDs are never leaked into review',async()=>{
 const one=fixture().record,foreign=fixture(NEW).record,oldVersion={...clone(one),attemptId:'old-version',version:'0.0.1'};
 const h=seeded([one,clone(one),foreign,oldVersion]);await unchanged(h,async()=>{await h.click('history-open');assert.match(h.nodes.history.innerHTML,/已完成记录 · 1 次/);assert.equal(h.nodes['history-entry-1'],undefined);await h.click('history-entry-0');assert.doesNotMatch(h.nodes.history.innerHTML,/Bellwick|observation sheet/);});
});
test('Read-only history works without lock support and performs no fallback writes',async()=>{
 const h=seeded([fixture().record],{locksAvailable:false});await unchanged(h,async()=>{await h.click('history-open');await h.click('history-entry-0');await h.click('history-back');await h.click('history-close');assert.equal(h.nodes.clear.disabled,true);});
});
test('Blocked storage has no fabricated completed records or writes',async()=>{
 const h=harness({blocked:true});await unchanged(h,async()=>{await h.click('history-open');assert.match(h.nodes.history.innerHTML,/暂无可查看/);assert.equal(h.nodes['storage-warning'].hidden,false);await h.click('history-close');});
});
test('Stale storage prevents entry and stale notification during review retains warning focus',async()=>{
 const r=fixture().record,h=seeded([r]);h.saved.set(KEY,JSON.stringify({current:null,history:[]}));await unchanged(h,async()=>{await h.click('history-open');assert.equal(h.nodes.history.hidden,true);assert.equal(h.nodes['storage-conflict'].hidden,false);assert.equal(h.active.id,'storage-conflict');});
 const second=seeded([r]);await second.click('history-open');await second.click('history-entry-0');second.saved.set(KEY,JSON.stringify({current:null,history:[]}));await unchanged(second,async()=>{await second.emit('storage',{key:KEY});assert.equal(second.active.id,'storage-conflict');assert.equal(second.nodes['history-sync-warning'].hidden,false);await second.click('history-back');assert.equal(second.active.id,'storage-conflict');assert.match(second.nodes.history.innerHTML,/以下仅为本页原有历史副本/);assert.doesNotMatch(second.nodes.history.innerHTML,/到时会自动交卷/);await second.click('history-entry-0');assert.equal(second.active.id,'storage-conflict');await second.click('history-close');assert.equal(second.active.id,'storage-conflict');assert.equal(second.nodes.intro.hidden,false);});
});
test('Review paths introduce no network, persistence, attempt-start or destructive control',()=>{
 const js=fs.readFileSync(path.join(ROOT,'practice-preview/assets/practice.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'practice-preview/index.html'),'utf8');
 const history=js.slice(js.indexOf('// History navigation reads'),js.indexOf('function renderExercise()'));
 assert.doesNotMatch(history,/commitChange\(|store\.(save|clear)\(|K\.(create|submit|pause|resume)\(|state\s*=|db\.history\s*=/);
 assert.doesNotMatch(history,/window\.scrollTo/);
 assert.doesNotMatch(history,/id="(?:retry|again|clear|start)"|fetch\(|XMLHttpRequest|sendBeacon/);
 assert.match(html,/connect-src 'none'/);assert.match(html,/<section id="history" hidden aria-labelledby="history-title">/);assert.match(history,/id="history-title" tabindex="-1"/);
});
(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}console.log(`${cases.length-failed}/${cases.length} read-only history cases passed (synthetic offline DOM simulation, not rendered browser QA).`);if(failed)process.exitCode=1;})();
