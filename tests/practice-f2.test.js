'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {harness,ROOT}=require('./practice-harness');
const cases=[],test=(name,fn)=>cases.push([name,fn]);
const sets=['original-repair-library-001','original-museum-labels-002'];
async function submit(h){await h.click('finish');await h.click('confirm-submit');}
function storageSnapshot(h){return{saved:JSON.stringify([...h.saved]),state:h.value('JSON.stringify(state)'),writes:h.writes};}
function unchanged(h,before){assert.deepEqual(storageSnapshot(h),before);}
for(const setId of sets){
 test(setId+': F2 intro, reading, back and restore retain exact progress and timing',async()=>{
  const h=harness({setId});assert.equal(h.nodes['practice-heading'].hidden,false);assert.equal(h.nodes['set-picker'].hidden,false);
  await h.click('start');assert.equal(h.nodes['practice-heading'].hidden,true);assert.equal(h.nodes['set-picker'].hidden,true);assert.equal(h.nodes['practice-stage'].textContent,'阅读作答');assert.equal(h.active.id,'workspace');
  const q=h.value('C.questions.find(q=>q.type==="text")');await h.input(q.id,q.answers[0]);await h.flag(q.id);await h.advance(30000);
  assert.equal(h.nodes['answer-progress'].textContent,'已答 1 / 10');assert.equal(h.nodes['questions-heading'].textContent,'题目 · 10 题');
  const before=storageSnapshot(h),answerNode=h.nodes['answer-'+q.id];
  await h.click('workspace-home');unchanged(h,before);assert.equal(h.nodes.intro.hidden,false);assert.equal(h.active.id,'intro');assert.equal(h.nodes['practice-stage'].textContent,'练习说明');
  assert.equal(h.nodes['set-picker'].hidden,false);assert.equal(h.nodes.restore.hidden,false);assert.equal(h.nodes.restore.textContent,'继续上次练习');
  await h.click('restore');unchanged(h,before);assert.equal(h.nodes.timer.textContent,'14:30');assert.equal(h.nodes['answer-'+q.id].value,answerNode.value);
  await h.click('pause');assert.equal(h.nodes['question-navigation'].hidden,true);await h.click('workspace-home');const paused=storageSnapshot(h);await h.click('restore');unchanged(h,paused);assert.equal(h.nodes.exercise.hidden,true);assert.equal(h.active.id,'workspace');
  await h.click('pause');assert.equal(h.nodes['question-navigation'].hidden,false);
 });
 test(setId+': review pagination and filters use actual results without persistence',async()=>{
  const h=harness({setId});await h.click('start');const questions=h.value('C.questions');for(const q of questions)await h.input(q.id,q.answers[0]);await h.input(2,'synthetic incorrect');await submit(h);
  assert.equal(h.nodes['practice-stage'].textContent,'结果与解析');assert.equal(h.nodes['result-review-1'].hidden,false);assert.equal(h.nodes['result-review-2'].hidden,true);
  assert.equal(h.nodes['review-prev'].disabled,true);const before=storageSnapshot(h);
  await h.click('review-next');unchanged(h,before);assert.equal(h.nodes['result-review-1'].hidden,true);assert.equal(h.nodes['result-review-2'].hidden,false);assert.equal(h.active.id,'result-review-2');
  await h.click('review-evidence');assert.equal(h.active.id,'result-evidence-2');unchanged(h,before);
  for(let i=0;i<3;i++){await h.click('review-wrong');assert.equal(h.nodes['review-wrong'].getAttribute('aria-pressed'),'true');assert.equal(h.nodes['result-review-2'].hidden,false);assert.equal(h.nodes['review-prev'].disabled,true);assert.equal(h.nodes['review-next'].disabled,true);assert.equal(h.nodes['review-position'].textContent,'第 2 题 / 需要复习 1 题');await h.click('review-all');assert.equal(h.nodes['result-review-1'].hidden,false);assert.equal(h.nodes['review-all'].getAttribute('aria-pressed'),'true');unchanged(h,before);}
  for(let i=0;i<9;i++)await h.click('review-next');assert.equal(h.nodes['result-review-10'].hidden,false);assert.equal(h.nodes['review-next'].disabled,true);await h.click('review-next');assert.equal(h.nodes['result-review-10'].hidden,false);unchanged(h,before);
  await h.click('home');assert.equal(h.nodes.restore.textContent,'查看上次结果');assert.equal(h.active.id,'intro');await h.click('restore');assert.equal(h.nodes['result-review-1'].hidden,false);unchanged(h,before);
 });
 test(setId+': all-correct review has an explicit no-mistakes state and can recover',async()=>{
  const h=harness({setId});await h.click('start');for(const q of h.value('C.questions'))await h.input(q.id,q.answers[0]);await submit(h);const before=storageSnapshot(h);
  await h.click('review-wrong');assert.equal(h.nodes['review-empty'].hidden,false);assert.equal(h.nodes['review-toolbar'].hidden,true);assert.equal(h.nodes['review-evidence'].disabled,true);assert.equal(h.nodes.retry,undefined);
  for(let id=1;id<=10;id++)assert.equal(h.nodes['result-review-'+id].hidden,true);
  await h.click('review-all');assert.equal(h.nodes['review-empty'].hidden,true);assert.equal(h.nodes['review-toolbar'].hidden,false);assert.equal(h.nodes['review-evidence'].disabled,false);assert.equal(h.nodes['result-review-1'].hidden,false);unchanged(h,before);
 });
}
test('Returning through the shared online-practice link waits for queued input',async()=>{
 const h=harness();await h.click('start');h.locks.hold();const answer=h.input(8,'repair log'),back=h.click('practice-home');await Promise.resolve();assert.equal(h.nodes.workspace.hidden,false);h.locks.release();await Promise.all([answer,back]);assert.equal(h.nodes.intro.hidden,false);assert.equal(h.db.current.answers[8],'repair log');assert.equal(h.active.id,'intro');
 const before=storageSnapshot(h);await h.nodes['practice-home'].dispatch('click',{ctrlKey:true});unchanged(h,before);
});
test('Current filtered result survives history detail and repeated return without a write',async()=>{
 const h=harness();await h.click('start');for(const q of h.value('C.questions'))await h.input(q.id,q.answers[0]);await h.input(2,'synthetic incorrect');await h.input(8,'synthetic incorrect');await submit(h);await h.click('review-wrong');await h.click('review-next');
 const before=storageSnapshot(h);assert.equal(h.nodes['result-review-8'].hidden,false);
 for(let i=0;i<2;i++){await h.click('history-open');await h.click('history-entry-0');assert.equal(h.nodes['practice-stage'].textContent,'历史详情');await h.click('history-back');await h.click('history-close');assert.equal(h.nodes.results.hidden,false);assert.equal(h.nodes['practice-stage'].textContent,'结果与解析');assert.equal(h.nodes['review-wrong'].getAttribute('aria-pressed'),'true');assert.equal(h.nodes['result-review-8'].hidden,false);assert.equal(h.nodes['result-review-2'].hidden,true);assert.equal(h.active.id,'history-open');unchanged(h,before);}
});
test('The empty history action returns to instructions without starting an attempt',async()=>{
 const h=harness(),before=storageSnapshot(h);await h.click('intro-history');assert.equal(h.nodes.history.hidden,false);assert.match(h.nodes.history.innerHTML,/还没有练习记录/);assert.equal(h.nodes['practice-stage'].textContent,'练习历史');await h.click('history-privacy');assert.equal(h.nodes['practice-privacy'].open,true);assert.equal(h.active.id,'practice-privacy');await h.click('history-intro');assert.equal(h.nodes.intro.hidden,false);assert.equal(h.active.id,'intro');unchanged(h,before);
});
test('Font adjustment and submit cancellation preserve answers and restore visible focus',async()=>{
 const h=harness();await h.click('start');await h.input(8,'repair log');const before=storageSnapshot(h);for(let i=0;i<3;i++){await h.click('passage-font');assert.equal(h.nodes.passage.getAttribute('data-large'),'true');assert.equal(h.nodes['passage-font'].getAttribute('aria-pressed'),'true');await h.click('passage-font');assert.equal(h.nodes.passage.getAttribute('data-large'),'false');}
 await h.click('finish');assert.equal(h.nodes['submit-dialog'].open,true);await h.click('cancel-submit');assert.equal(h.nodes['submit-dialog'].open,false);assert.equal(h.active.id,'finish');unchanged(h,before);
});
test('Back from a conflict keeps the warning focused and never resumes stale writes',async()=>{
 const saved=new Map(),a=harness({saved});await a.click('start');const b=harness({saved});await b.click('restore');await a.input(1,'TRUE');await b.emit('storage',{key:b.key});const before=storageSnapshot(b);await b.click('workspace-home');assert.equal(b.active.id,'storage-conflict');assert.equal(b.nodes.restore.disabled,true);unchanged(b,before);
});
test('Skip link focuses the current main content without resetting the active view',async()=>{
 const h=harness();await h.click('start');await h.input(8,'repair log');const before=storageSnapshot(h);await h.click('practice-skip-main');assert.equal(h.active.id,'main');assert.equal(h.nodes.workspace.hidden,false);assert.equal(h.nodes.intro.hidden,true);assert.deepEqual(h.navigations,[]);unchanged(h,before);
});
test('F2 design tokens, shared destinations, honest copy and local cache hashes are explicit',()=>{
 const html=fs.readFileSync(path.join(ROOT,'practice-preview/index.html'),'utf8'),css=fs.readFileSync(path.join(ROOT,'practice-preview/assets/practice.css'),'utf8');
 for(const route of ['library','experience','path','exams'])assert.ok(html.includes('href="../#'+route+'"'));
 assert.match(html,/id="practice-home" href="index.html" aria-current="page"/);assert.match(html,/href="#main"/);assert.match(html,/不是官方真题或完整模拟考试/);assert.match(html,/本站当前没有听力题组或音频/);
 assert.doesNotMatch(html,/筹备中|非真实成绩|日期示意|示例作答|示意稿/);
 assert.match(css,/--ink:#121826/);assert.match(css,/--accent:#1759e8/);assert.match(css,/button\.primary\{background:var\(--ink\)/);assert.match(css,/--panel-radius:12px/);assert.match(css,/--control-radius:8px/);assert.match(css,/--hover-duration:160ms/);assert.match(css,/--panel-duration:220ms/);assert.match(css,/font-size:18px;line-height:1\.65/);assert.match(css,/:root\{font-size:16px\}/);assert.match(css,/prefers-reduced-motion:reduce/);assert.doesNotMatch(css,/font-family:Georgia|font-size:(?:1[0-3]|[0-9])px/);
 for(const file of ['assets/practice.js','assets/practice.css']){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'practice-preview',file))).digest('hex').slice(0,12);assert.ok(html.includes(file+'?v='+hash));}
});
(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}console.log(`${cases.length-failed}/${cases.length} focused F2 practice cases passed. Offline DOM/source checks only; no browser rendering claimed.`);if(failed)process.exitCode=1;})();
