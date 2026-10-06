'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {historyHarness}=require('./history-harness.js');
const harnessFile=require.resolve('./interactions.test.js');
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0]+'\nglobalThis.makeHarness=harness;',scope);
const card=(h,id)=>h.doc.getElementById('resource-'+id);
const backLink=(h,id)=>card(h,id).querySelector('.reader-back');
const summary=(h,id)=>card(h,id).querySelector('.resource-actions').querySelector('a');
const feedback=(h,id,skill)=>card(h,id).querySelector('.resource-feedback').querySelectorAll('a').find(a=>a.href==='#library/'+skill+'/method');
async function boot(hash,options={}){const history=historyHarness(hash),h=scope.makeHarness({...options,hash,browserHistory:history});await h.flush();return{h,history};}
async function follow(history,link){history.follow(link);await history.flush();}
async function back(history){history.back();await history.flush();}
async function forward(history){history.forward();await history.flush();}
(async()=>{
 // The deployed failure: an anchor fires popstate then queues hashchange, and Back
 // restores the resource entry before popstate + hashchange are dispatched.
 const persisted=JSON.stringify({saved:['cambridge'],path:{examHistory:'yes',baseline:'6',target:'7',dailyMinutes:'30',weakSkill:'writing',completed:true}});
 const {h,history}=await boot('#library',{rawState:persisted});
 await follow(history,summary(h,'cambridge'));assert.equal(backLink(h,'cambridge').href,'#library');
 await follow(history,feedback(h,'cambridge','writing'));assert.equal(h.nodes['panel-library'].dataset.view,'method');
 await back(history);assert.equal(history.hash,'#library/listening/resource/cambridge');
 assert.equal(backLink(h,'cambridge').href,'#library','Back from a cross-skill method must retain the original list, not capture the method as a new origin');
 await forward(history);assert.equal(history.hash,'#library/writing/method');await back(history);
 await follow(history,backLink(h,'cambridge'));assert.equal(history.hash,'#library');assert.equal(h.nodes['panel-library'].dataset.view,'overview');
 // Repeated same-skill and cross-skill feedback must not change this entry.
 for(const skill of ['listening','reading','writing','speaking']){
  await follow(history,summary(h,'cambridge'));
  for(let cycle=0;cycle<2;cycle++){
   await follow(history,feedback(h,'cambridge',skill));await back(history);
   assert.equal(backLink(h,'cambridge').href,'#library');assert.equal(backLink(h,'cambridge').textContent,'← 返回资料列表');
  }
  await follow(history,backLink(h,'cambridge'));
 }
 assert.equal(h.saved.get('ieltsorbit.local.v1'),persisted);assert.equal(h.storageWrites,0);assert.equal(h.fetches,1);

 // Every fallback reader and each of its real feedback anchors, from each real
 // subject entry: 7 resources and 71 origin/target pairs. No hardcoded h.hash.
 const core=require('../assets/core.js'),data=core.normalizeCatalog(require('../data/catalog.json'));
 const resources=data.resources.filter(r=>r.sourceType!=='experience'&&!r.actionableMethods?.length&&r.skills.some(s=>core.learningGuides[s]));
 let pairs=0;
 for(const resource of resources){for(const origin of resource.skills.filter(s=>core.learningGuides[s])){
  const fresh=await boot('#library/'+origin);
  await follow(fresh.history,summary(fresh.h,resource.id));
  for(const destination of resource.skills.filter(s=>core.learningGuides[s])){
   await follow(fresh.history,feedback(fresh.h,resource.id,destination));await back(fresh.history);pairs++;
   assert.equal(backLink(fresh.h,resource.id).href,'#library/'+origin,resource.id+' '+origin+' → '+destination+' → Back');
   assert.equal(fresh.h.nodes['panel-library'].dataset.view,'resource');assert.equal(fresh.h.active,card(fresh.h,resource.id));
  }
 }}

 // Filters, expanded disclosures and scroll belong to that entry, even when
 // the same exact resource URL is later opened from another list and subset.
 const filtered=await boot('#library/listening',{rawState:persisted}),f=filtered.h,fh=filtered.history;
 f.nodes.search.value='Cambridge';f.nodes['source-filter'].value='official';f.nodes['recommendation-filter'].value='all';f.nodes['filter-form'].dispatch('change');
 f.nodes['saved-filter'].dispatch('click');f.doc.getElementById('detail-cambridge').open=true;f.doc.querySelectorAll('.method-detail')[0].open=true;f.context.window.scrollY=476;
 await follow(fh,summary(f,'cambridge'));const firstEntry=fh.index;
 await follow(fh,feedback(f,'cambridge','writing'));await back(fh);await forward(fh);await back(fh);
 await follow(fh,backLink(f,'cambridge'));
 assert.equal(f.nodes.search.value,'Cambridge');assert.equal(f.nodes['source-filter'].value,'official');assert.equal(f.nodes['recommendation-filter'].value,'all');assert.equal(f.nodes['saved-filter'].getAttribute('aria-pressed'),'true');assert.equal(f.context.window.scrollY,476);assert.equal(f.doc.getElementById('detail-cambridge').open,true);assert.equal(f.doc.querySelectorAll('.method-detail')[0].open,true);
 // Use the production tab handler: immediate applyRoute plus queued hashchange.
 f.nodes['tab-library'].dispatch('click');await fh.flush();f.nodes['saved-filter'].dispatch('click');f.nodes.search.value='';f.nodes['source-filter'].value='all';f.nodes['recommendation-filter'].value='recommended';f.nodes['filter-form'].dispatch('change');
 await follow(fh,summary(f,'cambridge'));const secondEntry=fh.index;assert.equal(backLink(f,'cambridge').href,'#library');
 fh.go(firstEntry-fh.index);await fh.flush();assert.equal(backLink(f,'cambridge').href,'#library/listening');
 // Inspect restoration without destroying the Forward entries via a new link.
 await back(fh);assert.equal(f.nodes.search.value,'Cambridge');assert.equal(f.nodes['saved-filter'].getAttribute('aria-pressed'),'true');
 await forward(fh);fh.go(secondEntry-fh.index);await fh.flush();assert.equal(backLink(f,'cambridge').href,'#library');
 await follow(fh,backLink(f,'cambridge'));assert.equal(f.nodes.search.value,'');assert.equal(f.nodes['source-filter'].value,'all');assert.equal(f.nodes['recommendation-filter'].value,'recommended');assert.equal(f.nodes['saved-filter'].getAttribute('aria-pressed'),'false');
 assert.equal(f.saved.get('ieltsorbit.local.v1'),persisted);assert.equal(f.storageWrites,0);

 // Method-origin readers keep the existing explicit method-return contract,
 // with an accurate label. A feedback detour must not become their new origin.
 const method=await boot('#library/writing/method');
 const methodSource=method.h.nodes['learning-guide'].querySelector('.internal-source-links').querySelector('a');
 await follow(method.history,methodSource);const methodId=method.history.hash.split('/').pop();
 assert.equal(backLink(method.h,methodId).href,'#library/writing/method');assert.equal(backLink(method.h,methodId).textContent,'← 返回方法');
 await follow(method.history,backLink(method.h,methodId));assert.equal(method.h.nodes['panel-library'].dataset.view,'method');
 const methodDetour=await boot('#library/reading/method');methodDetour.h.context.window.scrollY=315;
 const computerLink=methodDetour.h.nodes['learning-guide'].querySelector('.internal-source-links').querySelectorAll('a').find(a=>a.href.endsWith('/resource/computer'));
 await follow(methodDetour.history,computerLink);
 for(const destination of ['listening','writing']){
  await follow(methodDetour.history,feedback(methodDetour.h,'computer',destination));await back(methodDetour.history);
  assert.equal(backLink(methodDetour.h,'computer').href,'#library/reading/method');assert.equal(backLink(methodDetour.h,'computer').textContent,'← 返回方法');
  const length=methodDetour.history.length;methodDetour.h.events.hashchange();methodDetour.h.events.popstate({state:methodDetour.h.context.history.state});assert.equal(methodDetour.history.length,length);
 }
 await follow(methodDetour.history,backLink(methodDetour.h,'computer'));assert.equal(methodDetour.h.nodes['panel-library'].dataset.view,'method');assert.equal(methodDetour.h.context.window.scrollY,315);


 // Cold deep links use their actual subject; a copied URL has no previous
 // entry's state. Reload within an existing session preserves that UI context.
 for(const skill of ['listening','reading','writing','speaking']){
  const cold=await boot('#library/'+skill+'/resource/cambridge',{storageBlocked:true});
  assert.equal(backLink(cold.h,'cambridge').href,'#library/'+skill);
  await follow(cold.history,feedback(cold.h,'cambridge','writing'));await back(cold.history);assert.equal(backLink(cold.h,'cambridge').href,'#library/'+skill);
  assert.equal(cold.h.storageWrites,0);assert.equal(cold.h.fetches,1);
 }
 const reload=await boot('#library/reading');reload.h.nodes.search.value='Cambridge';reload.h.nodes['filter-form'].dispatch('input');
 await follow(reload.history,summary(reload.h,'cambridge'));await follow(reload.history,feedback(reload.h,'cambridge','speaking'));
 let reloaded=scope.makeHarness({browserHistory:reload.history});await reloaded.flush();await back(reload.history);
 assert.equal(backLink(reloaded,'cambridge').href,'#library/reading');
 reloaded=scope.makeHarness({browserHistory:reload.history});await reloaded.flush();assert.equal(backLink(reloaded,'cambridge').href,'#library/reading');
 await follow(reload.history,backLink(reloaded,'cambridge'));assert.equal(reloaded.nodes.search.value,'Cambridge');assert.equal(reloaded.nodes['skill-filter'].value,'reading');

 // Resource-to-resource hops retain their own entries; exiting to a different
 // application tab must not leak the previous resource's origin into a cold hop.
 const hop=await boot('#library/reading');await follow(hop.history,summary(hop.h,'cambridge'));
 const second=summary(hop.h,'official-samples');await follow(hop.history,second);assert.equal(backLink(hop.h,'official-samples').href,'#library/reading');
 await back(hop.history);assert.equal(backLink(hop.h,'cambridge').href,'#library/reading');await forward(hop.history);assert.equal(backLink(hop.h,'official-samples').href,'#library/reading');
 hop.h.nodes['tab-path'].dispatch('click');await hop.history.flush();
 const task=hop.h.nodes['path-result'].querySelectorAll('a').find(a=>a.href?.includes('/resource/'));
 await follow(hop.history,task);const taskId=hop.history.hash.split('/').pop(),taskSkill=hop.history.hash.split('/')[1];assert.equal(backLink(hop.h,taskId).href,'#library/'+taskSkill);

 // Preserve unrelated history state. An invalid/resource/external return target
 // must never be trusted as a valid list snapshot on refresh.
 const safe=await boot('#library');safe.h.context.history.replaceState({...safe.h.context.history.state,otherApp:{keep:7}},'');
 safe.h.events.hashchange();assert.deepEqual(safe.h.context.history.state.otherApp,{keep:7});
 for(const badHash of ['https://evil.invalid/','library/reading/resource/cambridge','library/reading/method/extra',['library/reading'],{route:'library/reading'},null,42]){
  const invalid=await boot('#library/reading/resource/cambridge');invalid.h.context.history.replaceState({otherApp:9,ieltsorbitNavigation:{hash:'library/reading/resource/cambridge',returnTo:{hash:badHash,filters:{recommendation:'all',query:'',sourceType:'all',skill:'reading',level:'all',price:'all',access:'all',savedOnly:false},opened:[],scrollY:0,methodOpen:false}}},'');
  const restarted=scope.makeHarness({browserHistory:invalid.history});await restarted.flush();assert.equal(backLink(restarted,'cambridge').href,'#library/reading');assert.equal(restarted.context.history.state.otherApp,9);
 }
 console.log('PASS: '+resources.length+' resources, '+pairs+' cross/same-skill anchor pairs; per-entry repeated Back/Forward, two contexts for one URL, filters/disclosures/scroll, method-origin label, direct links, reload, resource hops, plan origins, blocked localStorage and unrelated/invalid history state.');
 assert(history.eventLog.includes('popstate'));assert(history.eventLog.includes('hashchange'));
 console.log('PASS: original Cambridge cross-skill browser-history event regression. DOM/history model only, not rendered browser QA.');
})().catch(error=>{console.error(error);process.exitCode=1;});
