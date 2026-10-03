'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {harness,ROOT}=require('./practice-harness');
const cases=[];function test(name,fn){cases.push([name,fn]);}
for(const setId of ['original-repair-library-001','original-museum-labels-002']){
 test(setId+': intro and cards disclose a hard limit and automatic submission before starting',()=>{
  const h=harness({setId}),minutes=h.value('C.durationSeconds/60');
  assert.equal(h.writes,0);assert.equal(h.nodes.intro.hidden,false);
  assert.match(h.nodes['set-stats'].textContent,new RegExp('限时 '+minutes+' 分钟'));
  assert.equal((h.nodes['set-choices'].innerHTML.match(/限时 15 分钟/g)||[]).length,2);
  assert.doesNotMatch(h.nodes['set-choices'].innerHTML,/建议 \d+ 分钟/);
  assert.equal(h.nodes['set-timing'].hidden,false);
  assert.equal(h.nodes['set-timing'].textContent,`两种模式均按 ${minutes} 分钟倒计时，时间用完会自动交卷；练习模式可暂停。未暂停时，刷新、离开或切换题组仍继续计时。`);
  assert.match(h.nodes['set-notice'].textContent,/非 IELTS 官方真题/);
  assert.match(h.nodes['set-notice'].textContent,/不换算 IELTS band/);
 });
 for(const mode of ['practice','timed'])test(setId+': '+mode+' behavior agrees with the displayed limit',async()=>{
  const h=harness({setId,mode});await h.click('start');
  const ms=h.value('C.durationSeconds*1000');await h.advance(ms-1000);
  assert.equal(h.db.current.status,'active');assert.equal(h.nodes.timer.textContent,'00:01');
  await h.advance(1000);assert.equal(h.db.current.status,'submitted');assert.equal(h.nodes.results.hidden,false);
  assert.equal(h.db.history.length,1);assert.equal(h.db.current.result.elapsedSeconds,ms/1000);
 });
 test(setId+': the practice pause exception retains the remaining time',async()=>{
  const h=harness({setId,mode:'practice'});await h.click('start');await h.advance(60000);await h.click('pause');
  await h.advance(900000);assert.equal(h.db.current.status,'paused');assert.equal(h.value('K.remaining(state)'),840000);
  await h.click('pause');await h.advance(840000);assert.equal(h.db.current.status,'submitted');
 });
}
test('Static fallback copy matches the disclosure and the script cache is fresh',()=>{
 const html=fs.readFileSync(path.join(ROOT,'practice-preview/index.html'),'utf8');
 assert.match(html,/<p id="set-stats">558 词 · 5 段 · 10 题 · 限时 15 分钟<\/p>/);
 assert.match(html,/<p id="set-timing" class="hint">两种模式均按 15 分钟倒计时，时间用完会自动交卷/);
 assert.match(html,/练习时长为本站设置，未经考生试测校准/);
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'practice-preview/assets/practice.js'))).digest('hex').slice(0,12);
 assert.ok(html.includes('assets/practice.js?v='+hash));
});
(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}console.log(`${cases.length-failed}/${cases.length} timing-copy cases passed (isolated DOM simulation).`);if(failed)process.exitCode=1;})();
