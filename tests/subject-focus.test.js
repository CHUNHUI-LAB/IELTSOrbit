'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {historyHarness}=require('./history-harness.js');
// Reuse the actual application and existing DOM harness. This checks whether
// activation transfers focus to a live replacement button; it does not emulate
// native key-to-click activation, focus loss to body, or rendered focus rings.
const harnessFile=require.resolve('./interactions.test.js');
const prelude=fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0];
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(prelude+'\nglobalThis.makeHarness=harness;',scope);
const skills=['listening','reading','writing','speaking','all'];
const rawState=JSON.stringify({saved:['official-samples'],path:{examHistory:'yes',baseline:'6',target:'7',dailyMinutes:'30',weakSkill:'reading',completed:true}});
function deferredHarness(){
 let release;
 const catalogReady=new Promise(resolve=>{release=resolve;});
 const delayed=prelude.replace('fetch:async url=>{fetches++;','fetch:async url=>{fetches++;await catalogReady;');
 assert.notEqual(delayed,prelude,'defer only the existing catalog fetch in the test harness');
 const delayedScope={require:createRequire(harnessFile),console,setImmediate,URL,catalogReady};
 vm.runInNewContext(delayed+'\nglobalThis.makeHarness=harness;',delayedScope);
 return{h:delayedScope.makeHarness({hash:'#library/listening',rawState}),release};
}
(async()=>{
 let activations=0;
 for(const start of skills){
  const history=historyHarness('#library/'+start);
  const h=scope.makeHarness({rawState,browserHistory:history});await h.flush();
  for(const skill of skills){
   for(let repeat=0;repeat<2;repeat++){
    const navigation=h.nodes['skill-navigation'];
    const before=navigation.children.find(button=>button.dataset.skill===skill);
    assert(before,'subject control exists');before.focus();
    navigation.dispatch('click',{target:before});
    const selected=navigation.children.find(button=>button.dataset.skill===skill);
    assert.equal(h.active===selected,true,'subject activation must focus the live '+skill+' button');
    assert.equal(navigation.children.includes(h.active),true,'focus stays in the current subject controls');
    assert.equal(selected.getAttribute('aria-pressed'),'true');
    assert.equal(navigation.children.filter(button=>button.getAttribute('aria-pressed')==='true').length,1);
    assert.equal(h.nodes['skill-filter'].value,skill);
    assert.equal(history.hash,skill==='all'?'#library':'#library/'+skill);
    assert.equal(h.nodes['panel-library'].hidden,false);
    await history.flush();await h.flush();
    assert.equal(h.active===navigation.children.find(button=>button.dataset.skill===skill),true,'queued history events retain subject focus');
    assert.equal(h.saved.get('ieltsorbit.local.v1'),rawState,'activation preserves saved favorites and plan');
    assert.equal(h.storageWrites,0,'focus repair does not persist navigation');
    activations++;
   }
  }
 }
 for(const skill of skills){
  const {h,release}=deferredHarness(),navigation=h.nodes['skill-navigation'];
  assert.equal(h.nodes['resource-grid'].children.length,0,'catalog is still pending');
  const button=navigation.children.find(item=>item.dataset.skill===skill);button.focus();
  navigation.dispatch('click',{target:button});
  assert.equal(h.active===navigation.children.find(item=>item.dataset.skill===skill),true,'activation focuses its current button before loading completes');
  release();await h.flush();
  assert(h.nodes['resource-grid'].children.length>0,'the delayed catalog completed');
  assert.equal(h.active===navigation.children.find(item=>item.dataset.skill===skill),true,'delayed catalog render preserves the live '+skill+' button focus');
  assert.equal(h.saved.get('ieltsorbit.local.v1'),rawState);assert.equal(h.storageWrites,0);
 }
 for(const id of ['search','recommendation-filter','tab-library']){
  const {h,release}=deferredHarness(),navigation=h.nodes['skill-navigation'];
  const button=navigation.children.find(item=>item.dataset.skill==='reading');button.focus();
  navigation.dispatch('click',{target:button});
  h.nodes[id].focus();release();await h.flush();
  assert.equal(h.active,h.nodes[id],'catalog completion must not steal focus from '+id);
  h.hash('#library/writing');
  assert.equal(h.active,h.nodes[id],'ordinary subject hash navigation must not steal focus from '+id);
  assert.equal(h.saved.get('ieltsorbit.local.v1'),rawState);assert.equal(h.storageWrites,0);
 }
 console.log('PASS: '+activations+' subject activations across five starting subjects, repeated selections, live-button focus, queued history events, and unchanged saved state. DOM model only; browser keyboard and visual checks remain separate.');
 console.log('PASS: five delayed catalog completions retain subject focus; three outside controls retain focus across delayed completion and ordinary hash navigation; no saved-state writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
