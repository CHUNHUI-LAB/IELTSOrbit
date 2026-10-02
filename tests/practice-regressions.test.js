'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./practice-harness');
let failures=0;const cases=[];
function test(name,fn){cases.push([name,fn]);}
test('A read-only stale intro tab leaving must not erase a newer answer in another tab',async()=>{
 const saved=new Map();const stale=harness({saved});const newer=harness({saved});
 await newer.click('start');await newer.input(1,'TRUE');const before=saved.get('ieltsorbit.original.practice.v1');
 stale.emit('pagehide');assert.equal(saved.get('ieltsorbit.original.practice.v1'),before);
});
test('Timed wrong-answer retry retains timed mode after reload',async()=>{
 const saved=new Map();const h=harness({saved,mode:'timed'});await h.click('start');await h.input(1,'FALSE');await h.click('finish');await h.click('confirm-submit');
 const reloaded=harness({saved,now:1005000});await reloaded.click('restore');await reloaded.click('retry');assert.equal(reloaded.db.current.mode,'timed');
});
test('Starting moves keyboard focus into visible workspace',async()=>{
 const h=harness();h.nodes.start.focus();await h.click('start');assert.equal(h.active?.id,'workspace');
});
test('Stale active tab input is blocked before it overwrites a newer answer',async()=>{
 const saved=new Map();const original=harness({saved});await original.click('start');
 const stale=harness({saved});await stale.click('restore');await original.input(1,'TRUE');
 const latest=saved.get('ieltsorbit.original.practice.v1');await stale.input(8,'repair log');
 assert.equal(saved.get('ieltsorbit.original.practice.v1'),latest);assert.equal(stale.value('state.answers[8]'),undefined);
 assert.equal(stale.nodes['storage-conflict'].hidden,false);assert.equal(stale.nodes['answer-8'].readOnly,true);assert.equal(stale.nodes.questions.inert,undefined);assert.equal(stale.nodes.finish.disabled,true);assert.equal(stale.nodes.clear.disabled,true);assert.equal(stale.active.id,'storage-conflict');
 await stale.advance(900000);assert.equal(saved.get('ieltsorbit.original.practice.v1'),latest,'stale timer cannot submit');
 await stale.click('clear');assert.equal(saved.get('ieltsorbit.original.practice.v1'),latest,'stale clear cannot delete latest data');
 await stale.click('reload-latest');assert.equal(stale.reloads,1);assert.equal(saved.get('ieltsorbit.original.practice.v1'),latest,'reload handler does not save stale state');
});
test('Cross-tab update closes a pending submit dialog and exposes recovery',async()=>{
 const saved=new Map();const a=harness({saved});await a.click('start');const b=harness({saved});await b.click('restore');await b.click('finish');assert.equal(b.nodes['submit-dialog'].open,true);
 await a.input(1,'TRUE');b.emit('storage',{key:'ieltsorbit.original.practice.v1'});
 assert.equal(b.nodes['submit-dialog'].open,false);assert.equal(b.nodes['storage-conflict'].hidden,false);assert.equal(b.active.id,'storage-conflict');
 const latest=saved.get('ieltsorbit.original.practice.v1');await b.click('confirm-submit');assert.equal(saved.get('ieltsorbit.original.practice.v1'),latest);
});
test('Unrelated storage events leave practice usable; external clear is preserved',async()=>{
 const saved=new Map();const h=harness({saved});await h.click('start');h.emit('storage',{key:'ieltsorbit.local.v1'});assert.equal(h.nodes['storage-conflict'].hidden,true);
 saved.delete('ieltsorbit.original.practice.v1');h.emit('storage',{key:null});assert.equal(h.nodes['storage-conflict'].hidden,false);h.emit('pagehide');assert.equal(saved.has('ieltsorbit.original.practice.v1'),false);
});
test('Navigation saves nothing and a fresh load restores active answers and exact time',async()=>{
 const saved=new Map();const h=harness({saved,mode:'timed'});await h.click('start');await h.input(1,'TRUE');await h.advance(60000);const writes=h.writes;h.emit('pagehide');assert.equal(h.writes,writes);
 const fresh=harness({saved,now:1120000});await fresh.click('restore');assert.equal(fresh.value('state.answers[1]'),'TRUE');assert.equal(fresh.nodes.timer.textContent,'13:00');
});
test('A timed full repeat after reload keeps its mode and visible focus',async()=>{
 const saved=new Map();const h=harness({saved,mode:'timed'});await h.click('start');await h.input(1,'TRUE');await h.click('finish');await h.click('confirm-submit');const fresh=harness({saved});await fresh.click('restore');await fresh.click('again');assert.equal(fresh.db.current.mode,'timed');assert.equal(fresh.nodes.pause.hidden,true);assert.equal(fresh.active.id,'workspace');
 await fresh.click('finish');await fresh.click('confirm-submit');await fresh.click('home');assert.equal(fresh.active.id,'intro');
});
test('Storage unreadable from initial load permits only in-memory practice',async()=>{
 const original='{"current":null,"history":[]}';const saved=new Map([['ieltsorbit.original.practice.v1',original]]);const h=harness({saved,blocked:true});await h.click('start');await h.input(1,'TRUE');await h.click('finish');await h.click('confirm-submit');assert.equal(h.value('state.result.score'),1);assert.equal(h.writes,0);assert.equal(saved.get('ieltsorbit.original.practice.v1'),original);
});
test('A newly unreadable record is not overwritten',async()=>{
 const saved=new Map();const h=harness({saved});await h.click('start');saved.set('ieltsorbit.original.practice.v1','{broken');await h.input(1,'TRUE');assert.equal(saved.get('ieltsorbit.original.practice.v1'),'{broken');assert.equal(h.nodes['storage-conflict'].hidden,false);
});
test('The shared Web Lock serializes a competing answer and reports the losing view',async()=>{
 const saved=new Map();const a=harness({saved});await a.click('start');const b=harness({saved});await b.click('restore');
 let injected=false,pendingB; a.hooks.afterRead=()=>{if(!injected){injected=true;pendingB=b.input(1,'TRUE');}};
 await a.input(8,'repair log');await pendingB;await a.flush();await b.flush();
 const answers=JSON.parse(saved.get('ieltsorbit.original.practice.v1')).current.answers;
 assert.equal(Object.keys(answers).length,1);assert.ok(answers[1]==='TRUE'||answers[8]==='repair log');
 assert.equal(Number(!a.nodes['storage-conflict'].hidden)+Number(!b.nodes['storage-conflict'].hidden),1,'exactly one stale writer is locked');
 assert.ok(a.locks.requests>=3,'all persisted actions used the shared lock');
});
test('Queued input snapshots retain every typed value and finish waits for pending work',async()=>{
 const h=harness();await h.click('start');h.locks.hold();
 const one=h.input(8,'repair'),two=h.input(8,'repair log'),three=h.input(9,'green label'),summary=h.click('finish');
 assert.equal(h.nodes['save-status'].hidden,false);assert.equal(h.nodes['submit-dialog'].open,false);
 let prevented=false;const leave={preventDefault(){prevented=true;}};await h.emit('beforeunload',leave);assert.equal(prevented,true);assert.equal(leave.returnValue,'');
 h.locks.release();await Promise.all([one,two,three,summary]);await h.flush();
 assert.equal(h.db.current.answers[8],'repair log');assert.equal(h.db.current.answers[9],'green label');assert.match(h.nodes['submit-summary'].textContent,/8 题未作答/);assert.equal(h.nodes['save-status'].hidden,true);
 await h.click('confirm-submit');assert.equal(h.db.current.result.score,2);
});
test('Repeated starts and retries do not replace a just-created attempt',async()=>{
 const h=harness();await Promise.all([h.click('start'),h.click('start')]);assert.equal(h.db.current.status,'active');
 await h.input(1,'TRUE');await h.click('finish');await Promise.all([h.click('confirm-submit'),h.click('confirm-submit')]);assert.equal(h.db.history.length,1);
 await Promise.all([h.click('retry'),h.click('retry')]);assert.equal(h.db.history.length,1);assert.equal(h.db.current.ids.length,9);assert.equal(h.db.current.status,'active');
});
test('Immediate clear waits behind queued answers and never restores deleted data',async()=>{
 const h=harness();await h.click('start');h.locks.hold();const input=h.input(8,'repair log'),clear=h.click('clear');h.locks.release();await Promise.all([input,clear]);await h.flush();assert.equal(h.db,null);assert.equal(h.value('state'),null);assert.equal(h.nodes.intro.hidden,false);await h.emit('pagehide');assert.equal(h.db,null);
});
test('No Web Locks means useful in-memory practice with no stored write or clear',async()=>{
 const saved=new Map();const first=harness({saved});await first.click('start');await first.input(1,'TRUE');const original=saved.get('ieltsorbit.original.practice.v1');
 const fallback=harness({saved,locksAvailable:false});assert.equal(fallback.nodes.clear.disabled,true);assert.equal(fallback.nodes['storage-warning'].hidden,false);await fallback.click('restore');await fallback.input(8,'repair log');await fallback.click('finish');await fallback.click('confirm-submit');assert.equal(fallback.value('state.result.score'),2);assert.equal(saved.get('ieltsorbit.original.practice.v1'),original);assert.equal(fallback.writes,0);await fallback.click('clear');assert.equal(saved.get('ieltsorbit.original.practice.v1'),original);
});
test('Lock API rejection falls back to memory without deleting or overwriting saved work',async()=>{
 const saved=new Map();const original=harness({saved});await original.click('start');const before=saved.get('ieltsorbit.original.practice.v1');
 const h=harness({saved,lockManager:{request(){return Promise.reject(Error('unavailable'));}}});await h.click('restore');await h.input(8,'repair log');assert.equal(h.value('state.answers[8]'),'repair log');assert.equal(h.nodes.clear.disabled,true);assert.equal(saved.get('ieltsorbit.original.practice.v1'),before);
});
test('Cross-tab clear also acquires the lock and is rejected after another tab saves',async()=>{
 const saved=new Map();const a=harness({saved});await a.click('start');const b=harness({saved});await b.click('restore');a.locks.hold();
 const latest=a.input(1,'TRUE'),staleClear=b.click('clear');a.locks.release();await Promise.all([latest,staleClear]);assert.equal(a.db.current.answers[1],'TRUE');assert.equal(b.nodes['storage-conflict'].hidden,false);
});
test('Conflicted text answers remain readable/selectable and navigation is usable',async()=>{
 const saved=new Map();const a=harness({saved});await a.click('start');const b=harness({saved});await b.click('restore');await a.input(1,'TRUE');await b.input(8,'repair log');assert.equal(b.nodes['answer-8'].value,'repair log');assert.equal(b.nodes['answer-8'].readOnly,true);assert.equal(b.nodes['answer-8'].disabled,false);assert.equal(b.nodes.questions.inert,undefined);await b.nodes.nav.dispatch('click',{target:{dataset:{goto:'8'}}});assert.equal(b.active.id,'answer-8');
});
test('A pre-deadline answer survives delayed lock acquisition',async()=>{
 const h=harness();await h.click('start');h.locks.hold();h.setNow(1899999);const input=h.input(8,'repair log');h.setNow(1900001);const expiry=h.value('tick()');h.locks.release();await Promise.all([input,expiry]);await h.flush();assert.equal(h.db.current.answers[8],'repair log');assert.equal(h.db.current.status,'submitted');assert.equal(h.db.current.result.score,1);
});
test('A pre-deadline pause cancels a queued automatic expiry',async()=>{
 const h=harness();await h.click('start');h.locks.hold();h.setNow(1899999);const pause=h.click('pause');h.setNow(1900001);const expiry=h.value('tick()');h.locks.release();await Promise.all([pause,expiry]);await h.flush();assert.equal(h.db.current.status,'paused');assert.equal(h.db.current.remaining,1);assert.equal(h.db.history.length,0);assert.equal(h.nodes['paused-message'].hidden,false);
});
test('Late answers cannot be accepted by delayed lock processing',async()=>{
 const h=harness();await h.click('start');h.setNow(1900001);await h.input(8,'repair log');await h.flush();assert.equal(h.db.current.status,'submitted');assert.equal(h.db.current.answers[8],undefined);assert.equal(h.db.current.result.score,0);
});
test('Pending pause or expiry followed by clear cannot render a deleted attempt',async()=>{
 for(const operation of ['pause','expiry']){
  const h=harness();await h.click('start');h.locks.hold();let first;
  if(operation==='pause')first=h.click('pause');else{h.setNow(1900001);first=h.value('tick()');}
  const clear=h.click('clear');h.locks.release();await Promise.all([first,clear]);await h.flush();assert.equal(h.value('state'),null);assert.equal(h.db,null);assert.equal(h.nodes.intro.hidden,false);
 }
});
(async()=>{for(const [name,fn]of cases){try{await fn();console.log('PASS:',name);}catch(e){failures++;console.error('FAIL:',name,'\n ',e.stack);}}if(failures)process.exitCode=1;})();
