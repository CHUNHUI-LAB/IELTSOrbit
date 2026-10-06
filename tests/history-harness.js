'use strict';
const assert=require('node:assert/strict');
// A session-history/event model for the DOM harness, not a rendered browser.
// Fragment navigation creates an entry, fires popstate, then queues hashchange;
// replaceState creates no entry/event; queued traversal restores state then
// fires popstate and queues hashchange. See the same-document navigation steps:
// https://html.spec.whatwg.org/multipage/browsing-the-web.html#update-document-for-history-step-application
// Reattaching represents reload: JS/DOM are recreated, history entries survive.
function historyHarness(initialHash='#library'){
 const copy=value=>value==null?null:JSON.parse(JSON.stringify(value));
 let entries=[{hash:initialHash,state:null}],index=0,context,events,queue=[],scheduled=false;
 const eventLog=[];
 function fire(event){eventLog.push(event.type);events[event.type]?.(event);}
 function drain(){scheduled=false;while(queue.length){const event=queue.shift();if(typeof event==='function')event();else fire(event);}}
 function enqueue(...next){queue.push(...next);if(!scheduled){scheduled=true;setImmediate(drain);}}
 const api={
  attach(ctx,handlers){context=ctx;events=handlers;queue=[];
   const location={get hash(){return entries[index].hash;},set hash(value){const hash=value?(value.startsWith('#')?value:'#'+value):'';if(hash===entries[index].hash)return;const oldURL=new URL(entries[index].hash,ctx.document.baseURI).href;entries=entries.slice(0,index+1);entries.push({hash,state:null});index++;fire({type:'popstate',state:null});enqueue({type:'hashchange',oldURL,newURL:new URL(hash,ctx.document.baseURI).href});}};
   const history={get state(){return copy(entries[index].state);},get length(){return entries.length;},replaceState(state,title,url){if(url){const resolved=new URL(url,ctx.document.baseURI);assert.equal(resolved.origin,new URL(ctx.document.baseURI).origin);entries[index].hash=resolved.hash;}entries[index].state=copy(state);},back(){api.go(-1);},forward(){api.go(1);},go(delta){api.go(delta);}};
   ctx.location=ctx.window.location=location;ctx.history=ctx.window.history=history;ctx.window.scrollY=0;ctx.window.scrollTo=({top})=>{ctx.window.scrollY=top;};
  },
  follow(link){assert(link,'expected an actual rendered anchor');assert.equal(link.tagName,'a');assert(link.href.startsWith('#'),'only same-document anchors');link.dispatch('click');context.location.hash=link.href;},
  go(delta){enqueue(()=>{const next=index+delta;if(next<0||next>=entries.length||next===index)return;const oldURL=new URL(entries[index].hash,context.document.baseURI).href;index=next;const newURL=new URL(entries[index].hash,context.document.baseURI).href;fire({type:'popstate',state:copy(entries[index].state)});if(oldURL!==newURL)enqueue({type:'hashchange',oldURL,newURL});});},
  back(){api.go(-1);},forward(){api.go(1);},
  get hash(){return entries[index].hash;},get length(){return entries.length;},get index(){return index;},eventLog,
  flush:()=>new Promise(setImmediate)
 };
 return api;
}
module.exports={historyHarness};
