'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {historyHarness}=require('./history-harness.js');
const {verifyPronunciationSupplementStage,reviewedPronunciationSupplement}=require('./pronunciation-supplement-history.js');
const raw=require('../data/catalog.json'),original=JSON.stringify(raw),append=reviewedPronunciationSupplement();
verifyPronunciationSupplementStage(raw);
const id=append.resourceId,record=raw.resources.find(r=>r.id===id);
const harnessFile=require.resolve('./interactions.test.js');
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0]+'\nglobalThis.makeHarness=harness;',scope);
const card=h=>h.doc.getElementById('resource-'+id);
const summary=h=>card(h).querySelector('.resource-actions').querySelector('a');
async function boot(hash,options={}){const history=historyHarness(hash),h=scope.makeHarness({...options,hash,browserHistory:history});await h.flush();return{h,history};}
async function follow(history,link){history.follow(link);await history.flush();}
function checkReader(h,returnHash){
 const reader=card(h);assert(reader);assert.equal(reader.dataset.expanded,'true');
 assert.equal(reader.querySelector('.resource-title').tagName,'h1');
 assert.equal(reader.querySelectorAll('.reader-back').length,1);
 assert.equal(reader.querySelector('.reader-back').href,returnHash);
 const text=h.text(reader);for(const method of record.actionableMethods)assert(text.includes(method));
 assert(text.includes(append.curatorInterpretation));assert(text.includes('2026-10-01'));
 const links=reader.querySelectorAll('a').filter(link=>link.href===append.relatedSources[0].url);
 assert.equal(links.length,1);assert(links[0].textContent.startsWith('相关原文：'));
 assert.equal(links[0].target,'_blank');assert.equal(links[0].rel,'noopener noreferrer');
 assert.equal(reader.querySelector('.resource-link').href,record.url,'original primary source is retained');
}
(async()=>{
 const plan={examHistory:'yes',baseline:'6',target:'7',dailyMinutes:'30',weakSkill:'speaking',completed:true};
 const persisted=JSON.stringify({saved:[id],path:plan});
 const {h,history}=await boot('#library/speaking',{rawState:persisted});
 h.nodes.search.value='British Council';h.nodes['source-filter'].value='official';
 h.nodes['recommendation-filter'].value='all';h.nodes['filter-form'].dispatch('change');
 h.nodes['saved-filter'].dispatch('click');h.context.window.scrollY=438;
 for(let cycle=0;cycle<2;cycle++){
  await follow(history,summary(h));checkReader(h,'#library/speaking');assert.equal(h.active,card(h));
  const length=history.length;h.events.hashchange();h.events.popstate({state:h.context.history.state});
  assert.equal(history.length,length);checkReader(h,'#library/speaking');
  history.back();await history.flush();assert.equal(h.nodes['panel-library'].dataset.view,'overview');
  history.forward();await history.flush();checkReader(h,'#library/speaking');
  await follow(history,card(h).querySelector('.reader-back'));
  assert.equal(h.nodes.search.value,'British Council');assert.equal(h.nodes['source-filter'].value,'official');
  assert.equal(h.nodes['recommendation-filter'].value,'all');assert.equal(h.nodes['saved-filter'].getAttribute('aria-pressed'),'true');
  assert.equal(h.context.window.scrollY,438);assert.equal(h.active,summary(h));
 }
 assert.equal(h.saved.get('ieltsorbit.local.v1'),persisted);assert.equal(h.storageWrites,0);

 const toggle=await boot('#library/speaking/resource/'+id,{rawState:persisted});
 checkReader(toggle.h,'#library/speaking');
 for(const expected of [false,true]){
  toggle.h.nodes['resource-grid'].dispatch('click',{target:card(toggle.h).querySelector('[data-save]')});
  await toggle.history.flush();checkReader(toggle.h,'#library/speaking');
  assert.equal(card(toggle.h).querySelector('[data-save]').getAttribute('aria-pressed'),String(expected));
  const saved=JSON.parse(toggle.h.saved.get('ieltsorbit.local.v1'));assert.equal(saved.saved.includes(id),expected);assert.deepEqual(saved.path,plan);
 }
 assert.equal(toggle.h.storageWrites,2,'only explicit favorite toggles persist');

 const only=await boot('#library/speaking',{rawState:persisted});only.h.nodes['saved-filter'].dispatch('click');
 await follow(only.history,summary(only.h));
 only.h.nodes['resource-grid'].dispatch('click',{target:card(only.h).querySelector('[data-save]')});await only.history.flush();
 assert.equal(only.h.nodes['panel-library'].dataset.view,'overview');assert.equal(only.h.nodes['empty-state'].hidden,false);
 assert.equal(JSON.parse(only.h.saved.get('ieltsorbit.local.v1')).saved.includes(id),false);

 const blocked=await boot('#library/speaking/resource/'+id,{storageBlocked:true});
 checkReader(blocked.h,'#library/speaking');assert.equal(blocked.h.storageWrites,0);
 await follow(blocked.history,card(blocked.h).querySelector('.reader-back'));assert.equal(blocked.h.nodes['panel-library'].dataset.view,'overview');
 assert.equal(JSON.stringify(raw),original,'reader flows preserve every catalog field and source date');
 console.log('PASS: pronunciation source/method/disclosure rendering; repeated open, Back/Forward, filtered return, cold deep link, favorites and saved-only removal, blocked storage and immutable catalog. DOM simulation, not browser rendering.');
})().catch(error=>{console.error(error);process.exitCode=1;});
