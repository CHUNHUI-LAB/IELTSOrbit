'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const harnessFile=require.resolve('./interactions.test.js');
const prelude=fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0];
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(prelude+'\nglobalThis.makeHarness=harness;',scope);
(async()=>{
 const key='ieltsorbit.local.v1',practiceKey='synthetic.practice.only';
 const raw=JSON.stringify({saved:['writing-rubric'],path:{examHistory:'yes',baseline:'6.5',target:'7.5',dailyMinutes:'60',weakSkill:'writing',completed:true}});
 for(const hash of ['#start','#library/writing','#path/result']){
  const h=scope.makeHarness({rawState:raw,hash});await h.flush();const n=h.nodes;
  h.saved.set(practiceKey,'synthetic practice unchanged');
  let prompts=0,removals=0;const originalRemove=h.context.localStorage.removeItem;
  h.context.localStorage.removeItem=k=>{removals++;originalRemove(k);};
  h.context.window.confirm=message=>{prompts++;assert.match(message,/全部资料收藏和学习计划/);assert.match(message,/原创练习记录不受影响/);assert.match(message,/无法撤销/);return false;};
  const initial={hash:h.context.location.hash,writes:h.storageWrites,weak:n['weak-skill'].value,target:n.target.value,status:n['local-status'].textContent,resultHidden:n['path-result'].hidden,wizardHidden:n['plan-wizard'].hidden};
  for(let i=0;i<2;i++){
   n['clear-local'].focus();n['clear-local'].dispatch('click');
   assert.equal(h.saved.get(key),raw,'cancel preserves byte-exact stored choices');
   assert.equal(h.saved.get(practiceKey),'synthetic practice unchanged');
   assert.equal(removals,0);assert.equal(h.storageWrites,initial.writes);
   assert.equal(h.context.location.hash,initial.hash);assert.equal(n['weak-skill'].value,initial.weak);assert.equal(n.target.value,initial.target);
   assert.equal(n['local-status'].textContent,initial.status);assert.equal(n['path-result'].hidden,initial.resultHidden);assert.equal(n['plan-wizard'].hidden,initial.wizardHidden);
   assert.equal(h.active,n['clear-local'],'cancel restores trigger focus');
  }
  assert.equal(prompts,2,'each attempt requests fresh confirmation');
  h.context.window.confirm=()=>true;n['clear-local'].dispatch('click');
  assert.equal(removals,1);assert.equal(h.saved.has(key),false);assert.equal(n['weak-skill'].value,'unknown');assert.equal(n.target.value,'unknown');
  assert.equal(h.saved.get(practiceKey),'synthetic practice unchanged');
  assert.equal(h.storageWrites,initial.writes,'clearing does not silently re-create a storage entry');
 }
 console.log('PASS: synthetic-only confirmation cancel x2 preserves storage, plan, route, UI and focus across three views; confirmed clear retains practice-key data');
})().catch(error=>{console.error(error);process.exitCode=1;});
