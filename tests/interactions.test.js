const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../assets/core.js');
let active;
class Element {
 constructor(tag='div',id=''){this.tagName=tag;this.id=id;this.children=[];this.dataset={};this.attrs={};this.events={};this.hidden=false;this.value='';this.textContent='';this.parent=null;}
 append(...children){children.forEach(c=>{c.parent=this;this.children.push(c);});}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
 addEventListener(k,f){(this.events[k]??=[]).push(f);}
 dispatch(k,event={}){const e={target:this,preventDefault(){},...event};for(const f of this.events[k]||[])f(e);}
 focus(){active=this;}
 closest(selector){return selector==='[data-save]'&&this.dataset.save?this:this.parent?.closest(selector)||null;}
 reset(){for(const id of ['source-filter','skill-filter','level-filter','price-filter','access-filter'])nodes[id].value='all';nodes.search.value='';nodes['recommendation-filter'].value='recommended';}
}
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const nodes=Object.fromEntries(ids.map(id=>[id,new Element('div',id)]));
for(const id of ['source-filter','skill-filter','level-filter','price-filter','access-filter'])nodes[id].value='all';
nodes['recommendation-filter'].value='recommended';
nodes.baseline.value='unknown';nodes.target.value='7';
for(const name of ['start','library','path','exams'])nodes['tab-'+name].dataset.tab=name;
const intents=['listening','reading','writing','speaking','experience'].map(value=>{const n=new Element('button');n.dataset.intent=value;return n;});
function descendants(node){return node.children.flatMap(c=>[c,...descendants(c)]);}
const doc={baseURI:'https://example.test/IELTSOrbit/',getElementById:id=>nodes[id],createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('fragment'),querySelectorAll:selector=>selector==='[data-tab]'?['start','library','path','exams'].map(id=>nodes['tab-'+id]):selector==='[data-go]'?[]:selector==='[data-intent]'?intents:selector==='[data-save]'?descendants(nodes['resource-grid']).filter(n=>n.dataset.save):[]};
const data={meta:{checkedAt:'2026-10-01'},resources:[{id:'a',title:'Official writing',provider:'Official',url:'https://example.test/a',sourceType:'official',skills:['writing'],levels:['foundation'],price:'free',access:'open'},{id:'b',title:'Teacher speaking',url:'https://example.test/b',sourceType:'teacher',skills:['speaking'],levels:['advanced'],price:'mixed',access:'varies'}],policies:[],centers:[],calendars:[]};
data.resources.push({id:'c',title:'Comparison',url:'https://example.test/c',sourceType:'experience',skills:['writing'],levels:['foundation'],price:'free',access:'open',recommendedByDefault:false,evidenceScope:'Public text read',authorContext:{baseline:'unknown',outcome:'self-report'},actionableMethods:['Compare drafts'],commentsReview:{status:'not_reviewed',detail:'Comments not read'}});
const saved=new Map();const windowEvents={};const context={window:{IELTSCore:core,addEventListener:(k,f)=>windowEvents[k]=f},document:doc,location:{hash:''},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},fetch:async url=>{assert.equal(String(url),'https://example.test/IELTSOrbit/data/catalog.json');return{ok:true,json:async()=>data};},URL,console};
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/app.js'),'utf8'),context);
(async()=>{
 await new Promise(setImmediate);
 assert.equal(nodes['panel-start'].hidden,false,'first arrival shows start');assert.equal(nodes['panel-library'].hidden,true,'library is not the first arrival');assert.equal(nodes['resource-grid'].children.length,2,'initial recommended resources');
 intents.find(n=>n.dataset.intent==='writing').dispatch('click');assert.equal(nodes['skill-filter'].value,'writing');assert.equal(nodes['panel-library'].hidden,false);assert.equal(nodes['resource-grid'].children.length,1);intents.find(n=>n.dataset.intent==='experience').dispatch('click');assert.equal(nodes['source-filter'].value,'experience');assert.equal(nodes['recommendation-filter'].value,'all');assert.equal(nodes['resource-grid'].children[0].dataset.resourceId,'c');nodes['reset-filters'].dispatch('click');nodes['tab-start'].dispatch('keydown',{key:'ArrowLeft'});assert.equal(active,nodes['tab-exams'],'keyboard wraps to last');nodes['tab-exams'].dispatch('keydown',{key:'ArrowRight'});assert.equal(active,nodes['tab-start'],'keyboard wraps to start');
 nodes['recommendation-filter'].value='all';nodes['filter-form'].dispatch('change');assert.equal(nodes['resource-grid'].children.length,3,'all resources include comparisons');
 nodes['recommendation-filter'].value='reference';nodes['filter-form'].dispatch('change');assert.equal(nodes['resource-grid'].children.length,1,'reference only');assert.equal(nodes['resource-grid'].children[0].dataset.resourceId,'c');
 assert.ok(descendants(nodes['resource-grid']).some(n=>n.textContent.includes('非默认推荐')),'case badge');
 assert.ok(descendants(nodes['resource-grid']).some(n=>n.textContent.includes('self-report')),'context visible in details');
 nodes['reset-filters'].dispatch('click');assert.equal(nodes['recommendation-filter'].value,'recommended');assert.equal(nodes['resource-grid'].children.length,2,'reset returns default');
 nodes['source-filter'].value='teacher';nodes['filter-form'].dispatch('change');assert.equal(nodes['resource-grid'].children.length,1,'source filter');
 nodes.search.value='nothing matches';nodes['filter-form'].dispatch('input');assert.equal(nodes['empty-state'].hidden,false,'empty state');
 nodes['empty-reset'].dispatch('click');assert.equal(nodes['resource-grid'].children.length,2,'empty-state reset');
 let saveButton=doc.querySelectorAll('[data-save]')[0];nodes['resource-grid'].dispatch('click',{target:saveButton});assert.ok(saved.get('ieltsorbit.local.v1').includes('a'),'bookmark saved locally');
 nodes['saved-filter'].dispatch('click');assert.equal(nodes['resource-grid'].children.length,1,'saved filter');
 saveButton=doc.querySelectorAll('[data-save]')[0];nodes['resource-grid'].dispatch('click',{target:saveButton});assert.equal(nodes['resource-grid'].children.length,0,'remove last saved');assert.equal(active,nodes['saved-filter'],'focus retained when card disappears');
 nodes['tab-path'].dispatch('click');assert.equal(nodes['panel-path'].hidden,false);assert.equal(nodes['panel-library'].hidden,true);
 nodes['tab-path'].dispatch('keydown',{key:'ArrowRight'});assert.equal(active,nodes['tab-exams'],'keyboard tab movement');assert.equal(nodes['panel-exams'].hidden,false);
 context.location.hash='#library';windowEvents.hashchange();assert.equal(nodes['panel-library'].hidden,false,'hash navigation/back');
 nodes.baseline.value='6.5';nodes.target.value='7.5';nodes['save-path'].dispatch('click');assert.equal(JSON.parse(saved.get('ieltsorbit.local.v1')).path.target,'7.5','path persistence');
 nodes['clear-local'].dispatch('click');assert.equal(saved.has('ieltsorbit.local.v1'),false,'clear local');assert.equal(nodes.baseline.value,'unknown');
 context.fetch=async()=>{throw new Error('test offline');};nodes['retry-load'].dispatch('click');await new Promise(setImmediate);assert.equal(nodes['load-error'].hidden,false,'load error visible');assert.equal(nodes['empty-state'].hidden,true,'error distinct from no matches');
 console.log('PASS: DOM simulation for filter/reset/empty state/bookmark/remove focus/tab keyboard/hash history/path save/clear/offline error; nested Pages path verified. This is not a rendered browser test.');
})();
