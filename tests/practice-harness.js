'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=process.env.IELTS_ROOT||path.join(__dirname,'..');
const KEY='ieltsorbit.original.practice.v1',sharedLocks=new WeakMap();
function createLocks(){
 const tails=new Map();let gate=Promise.resolve(),release=()=>{},requests=0,callbacks=0;
 return{
  request(name,options,fn){requests++;const previous=tails.get(name)||Promise.resolve();const next=previous.catch(()=>{}).then(()=>gate).then(()=>{callbacks++;const result=fn({name,mode:options.mode});if(result&&typeof result.then==='function')throw Error('Lock callback must remain synchronous');return result;});tails.set(name,next);return next;},
  hold(){gate=new Promise(resolve=>release=resolve);},release(){release();},get requests(){return requests;},get callbacks(){return callbacks;}
 };
}
function harness({saved=new Map(),now=1000000,mode='practice',blocked=false,locksAvailable=true,lockManager,hooks={},setId='',search=''}={}){
 const nodes={},events={},intervals=[];let active=null,clock=now,selectedMode=mode,writes=0,confirmation=true,reloads=0,navigations=[];
 if(!sharedLocks.has(saved))sharedLocks.set(saved,createLocks());const manager=lockManager||sharedLocks.get(saved);
 const descend=node=>node.children.flatMap(n=>[n,...descend(n)]);
 class Element{
  constructor(id='',tag='div'){this.id=id;this.tagName=tag;this.type=tag==='input'?'text':'';this.hidden=false;this.open=false;this.value='';this.dataset={};this.attrs={};this.events={};this.textContent='';this._html='';this.children=[];this.disabled=false;this.readOnly=false;}
  set innerHTML(html){
   for(const child of descend(this))if(child.id&&nodes[child.id]===child)delete nodes[child.id];this.children=[];this._html=html;
   const stack=[this],voids=new Set(['input','br','meta','link','hr','img']);
   for(const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/g)){
    if(m[1]){if(stack.length>1)stack.pop();continue;}
    const attrs={};for(const a of m[3].matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';
    const node=new Element(attrs.id||'',m[2]);node.attrs=attrs;node.hidden=Object.hasOwn(attrs,'hidden');node.disabled=Object.hasOwn(attrs,'disabled');node.type=attrs.type||(m[2]==='input'?'text':'');node.value=attrs.value||'';
    for(const [key,value]of Object.entries(attrs))if(key.startsWith('data-'))node.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=value;
    stack[stack.length-1].children.push(node);if(node.id)nodes[node.id]=node;if(!voids.has(m[2]))stack.push(node);
   }
  }
  get innerHTML(){return this._html;}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  dispatch(type,event={}){if(this.disabled)return Promise.resolve();const e={target:this,preventDefault(){},...event};return Promise.all([this['on'+type]?.(e),...(this.events[type]||[]).map(f=>f(e))]);}
  setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){return this.attrs[key];}
  focus(){if(!this.disabled)active=this;}scrollIntoView(){}showModal(){this.open=true;}close(){this.open=false;}
  querySelectorAll(selector){return descend(this).filter(n=>selector==='input:not(:disabled)'?n.tagName==='input'&&!n.disabled:n.tagName===selector);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 }
 const root=new Element('root');root.innerHTML=fs.readFileSync(path.join(ROOT,'practice-preview/index.html'),'utf8');
 const document={getElementById:id=>nodes[id]||null,querySelector:selector=>{if(selector==='input[name="mode"]:checked')return{value:selectedMode};throw Error('Unsupported selector '+selector);}};
 const storage={
  getItem(k){if(blocked||hooks.failRead?.())throw Error('blocked');const value=saved.get(k)||null;hooks.afterRead?.(k,value);return value;},
  setItem(k,v){if(blocked||hooks.failWrite?.())throw Error('blocked');hooks.beforeWrite?.(k,v);writes++;saved.set(k,v);},
  removeItem(k){if(blocked)throw Error('blocked');hooks.beforeRemove?.(k);saved.delete(k);}
 };
 const context={document,console,URLSearchParams,Date:{now:()=>clock},Math,confirm:()=>{hooks.duringConfirm?.();return confirmation;},setInterval:f=>intervals.push(f)};
 context.window={navigator:locksAvailable?{locks:manager}:{},location:{search:search||(setId?'?set='+encodeURIComponent(setId):''),assign(url){navigations.push(url);},reload(){reloads++;}},localStorage:storage,scrollTo(){},addEventListener:(type,fn)=>{(events[type]??=[]).push(fn);}};
 vm.createContext(context);for(const file of ['data/content.js','data/museum-labels.js','data/sets.js','assets/core.js','assets/practice.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'practice-preview',file),'utf8'),context,{filename:file});
 async function flush(){await new Promise(setImmediate);await vm.runInContext('changeQueue',context);await new Promise(setImmediate);}
 return{
  nodes,saved,context,hooks,navigations,locks:manager,flush,get active(){return active;},get writes(){return writes;},get reloads(){return reloads;},
  click(id){return nodes[id].dispatch('click');},
  input(id,value){let target=nodes.questions.querySelectorAll('input').find(n=>n.dataset.q===String(id)&&(n.type!=='radio'||n.value===value));if(!target){target=new Element('synthetic-input','input');target.dataset.q=String(id);}if(target.disabled||target.readOnly)return Promise.resolve();target.value=value;return nodes.questions.dispatch('input',{target});},
  flag(id){const target=nodes.questions.querySelectorAll('button').find(n=>n.dataset.flag===String(id));return nodes.questions.dispatch('click',{target});},
  async advance(ms){clock+=ms;intervals.forEach(f=>f());await flush();},
  emit(type,event={}){return Promise.all((events[type]||[]).map(f=>f(event)));},
  setNow(value){clock=value;},selectMode(value){selectedMode=value;},confirm(value){confirmation=value;},value(expr){return vm.runInContext(expr,context);},get key(){return vm.runInContext('KEY',context);},get db(){const key=vm.runInContext('KEY',context);return saved.has(key)?JSON.parse(saved.get(key)):null;}
 };
}
module.exports={harness,KEY,ROOT,createLocks};
