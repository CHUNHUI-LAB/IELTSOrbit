'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {harness,KEY,ROOT,createLocks}=require('./practice-harness');
const OLD='original-repair-library-001',NEW='original-museum-labels-002',NEWKEY=KEY+'.'+NEW;
const cases=[];function test(name,fn){cases.push([name,fn]);}
const link=id=>'set-link-'+id;
const clone=x=>JSON.parse(JSON.stringify(x));
async function submit(h){await h.click('finish');await h.click('confirm-submit');}
test('Old URLs retain the exact legacy key; new routes own a separate key, no migration',async()=>{
 const old=harness();assert.equal(old.key,KEY);assert.equal(old.value('C.id'),OLD);
 const selected=harness({setId:NEW});assert.equal(selected.key,NEWKEY);assert.equal(selected.value('C.id'),NEW);assert.equal(selected.writes,0);
 assert.equal(harness({setId:OLD}).key,KEY);
 const unknown=harness({search:'?set=unknown'});assert.equal(unknown.key,KEY);assert.equal(unknown.nodes['set-route-warning'].hidden,false);assert.equal(unknown.writes,0);
});
test('Both cards name topic, all question types and exact counts without answer patterns',async()=>{
 const h=harness({setId:NEW});assert.match(h.nodes['set-choices'].innerHTML,/The Repair Library/);assert.match(h.nodes['set-choices'].innerHTML,/Reading Between the Objects/);
 assert.equal(h.nodes[link(NEW)].getAttribute('aria-current'),'page');assert.equal(h.nodes[link(OLD)].getAttribute('aria-current'),undefined);
 assert.equal(h.value('P.words(C)'),636);assert.equal(h.nodes['set-stats'].textContent,'636 词 · 6 段 · 10 题 · 建议 15 分钟');
 assert.equal(h.nodes['set-types'].textContent,'判断题（TRUE / FALSE / NOT GIVEN） 6 题 · 原文填空 4 题');
 assert.match(h.nodes['set-instructions'].textContent,/第 7–9 题恰好 2 个词，第 10 题恰好 1 个词/);
 assert.match(h.nodes['set-rights'].textContent,/Bellwick Museum/);assert.doesNotMatch(h.nodes['set-rights'].textContent,/Mereford/);assert.match(h.nodes['set-notice'].textContent,/虚构教学情境/);
 const old=harness();assert.equal(old.value('P.words(C)'),558);assert.match(old.nodes['set-types'].textContent,/单项选择 3 题/);assert.match(old.nodes['set-instructions'].textContent,/第 8–9/);assert.match(old.nodes['set-rights'].textContent,/1\.0\.1/);
});
test('The old question source remains its own object, new content has unique identity',async()=>{
 const h=harness({setId:NEW});const old=h.context.IELTS_CONTENT,newContent=h.context.IELTS_MUSEUM_CONTENT;
 assert.equal(old.id,OLD);assert.equal(old.version,'1.0.1');assert.equal(newContent.id,NEW);assert.equal(newContent.version,'1.0.0');assert.equal(newContent.questions.length,10);
 const created=h.context.IELTSCore.create(old,'practice',1000000);assert.equal(h.context.IELTSCore.restore(created,newContent),null);
 assert.equal(h.context.IELTSCore.restore(h.context.IELTSCore.create(newContent,'practice',1000000),old),null);
});
test('New set completes 10/10 with exact passage, title, prompts, evidence and two NG hints',async()=>{
 const h=harness({setId:NEW});await h.click('start');assert.equal(h.db.current.contentId,NEW);assert.equal(h.nodes['workspace-title'].textContent,'Reading Between the Objects');
 for(const q of h.context.IELTS_MUSEUM_CONTENT.questions)await h.input(q.id,q.answers[0]);
 assert.equal(h.nodes.questions.querySelectorAll('input').filter(i=>i.type==='text').length,4);assert.match(h.nodes.questions.innerHTML,/QUESTION 7 · EXACTLY TWO WORDS/);assert.match(h.nodes.questions.innerHTML,/QUESTION 10 · EXACTLY ONE WORD/);
 assert.match(h.nodes.passage.innerHTML,/In this fictional case study/);await submit(h);assert.equal(h.db.current.result.score,10);assert.equal(h.db.current.result.total,10);assert.equal(h.db.history.length,1);
 assert.equal((h.nodes.results.innerHTML.match(/仍须结合全文确认未提及/g)||[]).length,2);assert.match(h.nodes.results.innerHTML,/参观小组人数/);assert.equal(h.saved.has(KEY),false);
});
test('Answer normalization and exact word limits remain consistent for the new set',async()=>{
 const h=harness({setId:NEW}),K=h.context.IELTSCore,C=h.context.IELTS_MUSEUM_CONTENT;
 for(const q of C.questions){assert.equal(K.grade(q,'  '+q.answers[0].toUpperCase().replace(/ /g,'   ')+'  ').correct,true);assert.equal(K.grade(q,'').correct,false);}
 const q=C.questions.find(q=>q.id===7);assert.equal(K.grade(q,'order').reason,'词数不符合要求');assert.equal(K.grade(q,'in chronological order').reason,'词数不符合要求');assert.equal(K.grade(q,'chronological orders').correct,false);assert.equal(K.grade(q,'chronological order.').correct,false);
});
test('Switching from active old to new and back restores old answers, flags and deadline',async()=>{
 const saved=new Map([['ieltsorbit.local.v1','{"saved":["example"]}']]);const old=harness({saved});await old.click('start');await old.input(8,'repair log');await old.flag(2);const record=saved.get(KEY);const writes=old.writes;
 await old.click(link(NEW));assert.deepEqual(old.navigations,['index.html?set='+NEW]);assert.equal(old.writes,writes);assert.equal(saved.get(KEY),record);
 const next=harness({saved,setId:NEW,now:1030000});assert.equal(next.nodes.restore.hidden,true);assert.equal(saved.get(KEY),record);await next.click('start');await next.input(7,'chronological order');const museum=saved.get(NEWKEY);
 await next.click(link(OLD));const returned=harness({saved,now:1060000});await returned.click('restore');assert.equal(returned.db.current.answers[8],'repair log');assert.equal(returned.db.current.flags[2],true);assert.equal(returned.nodes.timer.textContent,'14:00');assert.equal(saved.get(NEWKEY),museum);assert.equal(saved.get('ieltsorbit.local.v1'),'{"saved":["example"]}');
});
test('Paused progress survives a round trip and only resume changes its deadline',async()=>{
 const saved=new Map(),a=harness({saved});await a.click('start');await a.advance(60000);await a.click('pause');const before=saved.get(KEY);await a.click(link(NEW));const b=harness({saved,setId:NEW,now:1200000});await b.click('start');await b.click(link(OLD));const back=harness({saved,now:1300000});await back.click('restore');assert.equal(back.db.current.status,'paused');assert.equal(back.value('K.remaining(state)'),840000);assert.equal(saved.get(KEY),before);await back.click('pause');assert.equal(back.db.current.deadline,2140000);
});
test('Selecting a set waits for queued answers before navigation and never saves on unload',async()=>{
 const h=harness();await h.click('start');h.locks.hold();const first=h.input(8,'repair'),second=h.input(8,'repair log'),switching=h.click(link(NEW));await Promise.resolve();assert.equal(h.navigations.length,0);h.locks.release();await Promise.all([first,second,switching]);assert.equal(h.db.current.answers[8],'repair log');assert.equal(h.navigations.length,1);const writes=h.writes;await h.emit('pagehide');assert.equal(h.writes,writes);
});
test('A later current-set selection cancels an older pending navigation',async()=>{
 const h=harness();await h.click('start');h.locks.hold();const input=h.input(8,'repair log'),away=h.click(link(NEW));await h.click(link(OLD));h.locks.release();await Promise.all([input,away]);assert.equal(h.navigations.length,0);assert.equal(h.db.current.answers[8],'repair log');
});
test('A pending answer, submit and switch finish in order without cross-set writes',async()=>{
 const h=harness({setId:NEW});await h.click('start');h.locks.hold();const input=h.input(7,'chronological order'),finish=h.value('finish()'),switching=h.click(link(OLD));h.locks.release();await Promise.all([input,finish,switching]);assert.equal(h.db.current.status,'submitted');assert.equal(h.db.current.result.score,1);assert.equal(h.navigations.length,1);assert.equal(h.saved.has(KEY),false);
});
test('Independent sets can write simultaneously without causing a stale-view conflict',async()=>{
 const saved=new Map(),manager=createLocks(),names=[];const locks={request(name,options,fn){names.push(name);return manager.request(name,options,fn);}};
 const a=harness({saved,lockManager:locks}),b=harness({saved,setId:NEW,lockManager:locks});await Promise.all([a.click('start'),b.click('start')]);await Promise.all([a.input(8,'repair log'),b.input(7,'chronological order')]);
 assert.equal(a.db.current.answers[8],'repair log');assert.equal(b.db.current.answers[7],'chronological order');assert.equal(a.nodes['storage-conflict'].hidden,true);assert.equal(b.nodes['storage-conflict'].hidden,true);
 assert.ok(names.includes(KEY+'.writer'));assert.ok(names.includes(NEWKEY+'.writer'));assert.equal(new Set(names).size,2);
 await a.emit('storage',{key:NEWKEY});await b.emit('storage',{key:KEY});assert.equal(a.nodes['storage-conflict'].hidden,true);assert.equal(b.nodes['storage-conflict'].hidden,true);
});
test('The new set serializes competing stale-tab writes under the same writer lock',async()=>{
 const saved=new Map(),a=harness({saved,setId:NEW});await a.click('start');const b=harness({saved,setId:NEW});await b.click('restore');a.locks.hold();const first=a.input(7,'chronological order'),second=b.input(8,'observation sheet');a.locks.release();await Promise.all([first,second]);assert.equal(a.db.current.answers[7],'chronological order');assert.equal(a.db.current.answers[8],undefined);assert.equal(b.nodes['storage-conflict'].hidden,false);assert.equal(saved.has(KEY),false);
});
test('Other-set clear cannot block this set, and current-set clear cannot delete the other',async()=>{
 const saved=new Map(),a=harness({saved}),b=harness({saved,setId:NEW});await a.click('start');await a.input(8,'repair log');await b.click('start');await b.input(7,'chronological order');const legacy=saved.get(KEY);await b.click('clear');assert.equal(saved.has(NEWKEY),false);assert.equal(saved.get(KEY),legacy);await a.emit('storage',{key:NEWKEY});assert.equal(a.nodes['storage-conflict'].hidden,true);await a.input(9,'green label');assert.equal(a.db.current.answers[9],'green label');
});
test('Timed new-set expiry while away restores exactly once without touching old state',async()=>{
 const saved=new Map(),a=harness({saved});await a.click('start');await a.click('pause');const legacy=saved.get(KEY);const b=harness({saved,setId:NEW,mode:'timed'});await b.click('start');await b.input(7,'chronological order');await b.click(link(OLD));const resumed=harness({saved,setId:NEW,now:1900001});await resumed.flush();assert.equal(resumed.db.current.status,'submitted');assert.equal(resumed.db.current.result.score,1);assert.equal(resumed.db.current.result.elapsedSeconds,900);assert.equal(resumed.db.history.length,1);assert.equal(saved.get(KEY),legacy);const again=harness({saved,setId:NEW,now:2000000});await again.flush();await again.click('restore');assert.equal(again.db.history.length,1);assert.equal(again.writes,0);
});
test('Timed wrong-only retry and full repeat stay inside the selected content',async()=>{
 const saved=new Map(),h=harness({saved,setId:NEW,mode:'timed'});await h.click('start');for(const q of h.context.IELTS_MUSEUM_CONTENT.questions)await h.input(q.id,q.answers[0]);await h.input(6,'FALSE');await h.input(9,'');await submit(h);const oldHistory=clone(h.db.history[0]);await h.click(link(OLD));const back=harness({saved,setId:NEW,now:1100000});await back.click('restore');await back.click('retry');assert.deepEqual(back.db.current.ids,[6,9]);assert.equal(back.db.current.mode,'timed');assert.equal(back.db.current.contentId,NEW);await back.input(6,'NOT GIVEN');await back.input(9,'group size');await submit(back);assert.equal(back.db.current.result.score,2);assert.deepEqual(back.db.history[0],oldHistory);await back.click('again');assert.equal(back.db.current.mode,'timed');assert.equal(back.db.current.ids.length,10);assert.equal(saved.has(KEY),false);
});
test('Submitted legacy results retain exact stored bytes when opening or completing new set',async()=>{
 const saved=new Map(),a=harness({saved});await a.click('start');await a.input(8,'repair log');await submit(a);const before=saved.get(KEY);const b=harness({saved,setId:NEW});await b.click('start');await submit(b);assert.equal(saved.get(KEY),before);const restored=harness({saved});assert.equal(restored.writes,0);await restored.click('restore');assert.equal(restored.db.current.result.score,1);assert.equal(saved.get(KEY),before);
});
test('Memory-only new work cannot be discarded by a same-tab set switch',async()=>{
 const saved=new Map(),original=harness({saved,setId:NEW});await original.click('start');const before=saved.get(NEWKEY);const h=harness({saved,setId:NEW,locksAvailable:false});await h.click('restore');await h.input(7,'chronological order');await h.click(link(OLD));assert.equal(h.navigations.length,0);assert.equal(h.nodes['set-switch-help'].hidden,false);assert.equal(h.nodes['set-open-separate'].getAttribute('href'),'index.html?set='+OLD);assert.equal(h.nodes['set-open-separate'].getAttribute('target'),'_blank');assert.equal(h.value('state.answers[7]'),'chronological order');assert.equal(saved.get(NEWKEY),before);assert.equal(h.writes,0);let warned=false;await h.emit('beforeunload',{preventDefault(){warned=true;}});assert.equal(warned,true);
});
test('Initial no-lock empty page may choose a different topic without modifying storage',async()=>{
 const h=harness({locksAvailable:false});await h.click(link(NEW));assert.equal(h.navigations.length,1);assert.equal(h.writes,0);assert.equal(h.saved.size,0);
});
test('Save failure blocks same-tab switching, while a later safe save clears the warning condition',async()=>{
 const h=harness({setId:NEW});await h.click('start');const before=h.saved.get(NEWKEY);h.hooks.failWrite=()=>true;await h.input(7,'chronological order');await h.click(link(OLD));assert.equal(h.navigations.length,0);assert.equal(h.saved.get(NEWKEY),before);assert.equal(h.nodes['set-switch-help'].hidden,false);h.hooks.failWrite=()=>false;await h.input(8,'observation sheet');await h.click(link(OLD));assert.equal(h.navigations.length,1);assert.equal(h.db.current.answers[7],'chronological order');assert.equal(h.db.current.answers[8],'observation sheet');
});
test('Unreadable new-set storage stays byte-identical and does not disable the old set',async()=>{
 const saved=new Map([[NEWKEY,'{broken']]),h=harness({saved,setId:NEW});await h.click('start');await h.input(7,'chronological order');await h.click(link(OLD));assert.equal(h.navigations.length,0);assert.equal(saved.get(NEWKEY),'{broken');const old=harness({saved});await old.click('start');assert.equal(old.db.current.contentId,OLD);assert.equal(saved.get(NEWKEY),'{broken');
});
test('A stale set cannot navigate away silently with unsaved visible inputs',async()=>{
 const saved=new Map(),a=harness({saved,setId:NEW});await a.click('start');const b=harness({saved,setId:NEW});await b.click('restore');await a.input(7,'chronological order');await b.input(8,'observation sheet');await b.click(link(OLD));assert.equal(b.navigations.length,0);assert.equal(b.nodes['set-switch-help'].hidden,false);assert.equal(b.nodes['answer-8'].value,'observation sheet');assert.equal(b.nodes['answer-8'].readOnly,true);assert.equal(b.db.current.answers[8],undefined);
});
test('A rejected lock manager never overwrites either set on fallback or switch',async()=>{
 const saved=new Map(),a=harness({saved});await a.click('start');const b=harness({saved,setId:NEW});await b.click('start');const before=[saved.get(KEY),saved.get(NEWKEY)];const h=harness({saved,setId:NEW,lockManager:{request(){return Promise.reject(Error('unavailable'));}}});await h.click('restore');await h.input(7,'chronological order');await h.click(link(OLD));assert.deepEqual([saved.get(KEY),saved.get(NEWKEY)],before);assert.equal(h.navigations.length,0);assert.equal(h.writes,0);
});
test('Failed clear leaves current answers available and does not claim deletion',async()=>{
 const h=harness({setId:NEW});await h.click('start');await h.input(7,'chronological order');const before=h.saved.get(NEWKEY);h.hooks.beforeRemove=()=>{throw Error('blocked');};await h.click('clear');assert.equal(h.saved.get(NEWKEY),before);assert.equal(h.value('state.answers[7]'),'chronological order');assert.equal(h.nodes.workspace.hidden,false);assert.equal(h.nodes['storage-warning'].hidden,false);
});
test('No network APIs, unload saves, third-party dependencies or inline scripts were added',()=>{
 const js=fs.readFileSync(path.join(ROOT,'practice-preview/assets/practice.js'),'utf8');assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|addEventListener\('pagehide'/);assert.match(js,/locks\.request\(KEY\+'\.writer'/);
 const html=fs.readFileSync(path.join(ROOT,'practice-preview/index.html'),'utf8');assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/<script[^>]+src="https?:/);assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>[^<]/);
});
(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}console.log(`${cases.length-failed}/${cases.length} set-selection cases passed (DOM simulation, not rendered browser QA).`);if(failed)process.exitCode=1;})();
