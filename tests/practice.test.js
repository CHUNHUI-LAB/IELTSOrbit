'use strict';
const assert=require('node:assert/strict');
const {harness,KEY}=require('./practice-harness');
(async()=>{
const clone=x=>JSON.parse(JSON.stringify(x));
const shared=new Map([['ieltsorbit.local.v1','{"path":{"target":"7"},"saved":["writing-rubric"]}']]);
const h=harness({saved:shared});
assert.equal(h.nodes.restore.hidden,true);assert.equal(h.writes,0);
await h.click('start');assert.equal(h.nodes.workspace.hidden,false);assert.equal(h.db.current.ids.length,10);
for(const q of h.context.IELTS_CONTENT.questions)await h.input(q.id,q.answers[0]);
await h.input(2,'TRUE');await h.input(10,'');await h.flag(2);await h.advance(30000);
assert.equal(h.db.current.answers[1],'TRUE');assert.equal(h.db.current.flags[2],true);
await h.click('pause');assert.equal(h.db.current.status,'paused');const remaining=h.db.current.remaining;
await h.advance(120000);assert.equal(h.value('K.remaining(state)'),remaining);assert.equal(h.nodes.exercise.hidden,true);
const restored=harness({saved:shared,now:1150000});assert.equal(restored.nodes.restore.hidden,false);
await restored.click('restore');assert.equal(restored.nodes['paused-message'].hidden,false);
await restored.click('pause');assert.equal(restored.db.current.status,'active');await restored.advance(30000);
await restored.click('finish');assert.equal(restored.nodes['submit-dialog'].open,true);assert.match(restored.nodes['submit-summary'].textContent,/1 题未作答，1 题标记/);
await restored.click('cancel-submit');assert.equal(restored.nodes['submit-dialog'].open,false);assert.equal(restored.db.current.status,'active');
await restored.click('finish');await restored.click('confirm-submit');assert.equal(restored.db.current.result.score,8);assert.equal(restored.db.current.result.total,10);assert.equal(restored.db.current.result.unanswered,1);assert.equal(restored.db.current.result.elapsedSeconds,60);assert.equal(restored.db.history.length,1);assert.equal(restored.nodes.results.hidden,false);assert.match(restored.nodes.results.innerHTML,/英文证据/);assert.match(restored.nodes.results.innerHTML,/原文为三天/);
await restored.click('confirm-submit');assert.equal(restored.db.history.length,1,'double submit is idempotent');
const original=clone(restored.db.history[0]);await restored.click('retry');assert.deepEqual(restored.db.current.ids,[2,10]);assert.deepEqual(restored.db.current.answers,{});assert.deepEqual(restored.db.history[0],original);
await restored.input(2,'FALSE');await restored.input(10,'instructions');await restored.click('finish');await restored.click('confirm-submit');assert.equal(restored.db.current.result.score,2);assert.equal(restored.db.current.result.total,2);assert.equal(restored.db.history.length,2);assert.deepEqual(restored.db.history[0],original);
await restored.click('home');assert.equal(restored.nodes.intro.hidden,false);assert.equal(restored.nodes.restore.textContent,'查看上次结果');await restored.click('restore');assert.equal(restored.nodes.results.hidden,false);
assert.equal(shared.get('ieltsorbit.local.v1'),'{"path":{"target":"7"},"saved":["writing-rubric"]}','practice never changes saved learning plan');
const timed=harness({mode:'timed'});await timed.click('start');assert.equal(timed.nodes.pause.hidden,true);await timed.input(1,'TRUE');await timed.advance(900000);assert.equal(timed.db.current.status,'submitted');assert.equal(timed.db.current.result.score,1);assert.equal(timed.db.current.result.elapsedSeconds,900);await timed.input(2,'FALSE');assert.equal(timed.db.current.answers[2],undefined);
const disabled=harness({blocked:true});assert.equal(disabled.nodes['storage-warning'].hidden,false);await disabled.click('start');await disabled.input(1,'TRUE');await disabled.click('finish');await disabled.click('confirm-submit');assert.equal(disabled.value('state.result.score'),1);
const malformed=harness({saved:new Map([[KEY,'{broken']])});assert.equal(malformed.nodes['storage-warning'].hidden,false);await malformed.click('start');assert.equal(malformed.value('state.status'),'active');assert.equal(malformed.saved.get(KEY),'{broken','unreadable existing storage is not overwritten');
const K=h.context.IELTSCore,C=h.context.IELTS_CONTENT;
for(const q of C.questions){assert.equal(K.grade(q,q.answers[0].toUpperCase()+'  ').correct,true);assert.equal(K.grade(q,'').reason,'未作答');}
assert.equal(K.grade(C.questions[7],'a repair log').reason,'词数不符合要求');assert.equal(K.grade(C.questions[9],'instruction').correct,false);
const tampered=clone(original);const state=clone(restored.db.current);state.result.score=0;state.result.rows.forEach(row=>row.correct=false);assert.equal(K.restore(state,C).result.score,2);
console.log('PASS: original practice start, all 10 answers, flags, pause/resume, refresh restoration, submit/cancel/double-submit, 8/10 scoring, evidence and Chinese explanations, wrong-only retry 2/2, old history preservation, intro/results return, timer auto-submit, blocked/malformed storage and unrelated plan isolation. DOM simulation, not rendered browser QA.');

})().catch(error=>{console.error(error);process.exitCode=1;});
