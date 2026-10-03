'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
class Node {
 constructor(id){this.id=id;this.attrs={};this.events={};this.hidden=false;this.dataset={};}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
 addEventListener(k,f){(this.events[k]??=[]).push(f);}
 emit(k,e={}){for(const f of this.events[k]||[])f({target:this,preventDefault(){},...e});}
 focus(){doc.activeElement=this;}
 closest(selector){return selector==='button,a'?this:null;}
 contains(n){return this.children?.includes(n)||false;}
}
const ids=['menu-toggle','main-navigation',...['listening','reading','writing','speaking'].flatMap(s=>['home-tab-'+s,'home-panel-'+s])];
const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));
const subjects=['listening','reading','writing','speaking'].map(skill=>{const n=nodes['home-tab-'+skill];n.dataset.homeSkill=skill;n.attrs['aria-selected']=String(skill==='reading');n.tabIndex=skill==='reading'?0:-1;nodes['home-panel-'+skill].hidden=skill!=='reading';return n;});
const doc={...new Node('document'),getElementById:id=>nodes[id],querySelectorAll:()=>subjects,activeElement:null,addEventListener:Node.prototype.addEventListener,emit:Node.prototype.emit};
const win=new Node('window');nodes['menu-toggle'].attrs['aria-expanded']='false';
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/orbit-ui.js'),'utf8'),{document:doc,window:win});
const menu=nodes['menu-toggle'],nav=nodes['main-navigation'];const navButton=new Node('nav-link');nav.children=[navButton];
menu.emit('click');assert.equal(menu.attrs['aria-expanded'],'true');navButton.focus();nav.emit('click',{target:navButton});assert.equal(menu.attrs['aria-expanded'],'false');assert.equal(doc.activeElement,menu,'closing mobile navigation restores focus to a visible control');
menu.emit('click');doc.emit('keydown',{key:'Escape'});assert.equal(menu.attrs['aria-expanded'],'false');assert.equal(doc.activeElement,menu);
menu.emit('click');navButton.focus();win.emit('hashchange');assert.equal(menu.attrs['aria-expanded'],'false');assert.equal(doc.activeElement,menu);
for(let cycle=0;cycle<2;cycle++)for(const subject of subjects){subject.emit('click');assert.equal(subject.attrs['aria-selected'],'true');assert.equal(subject.tabIndex,0);assert.equal(nodes['home-panel-'+subject.dataset.homeSkill].hidden,false);assert.equal(subjects.filter(n=>n.attrs['aria-selected']==='true').length,1);}
subjects[3].emit('keydown',{key:'ArrowRight'});assert.equal(doc.activeElement,subjects[0]);subjects[0].emit('keydown',{key:'ArrowLeft'});assert.equal(doc.activeElement,subjects[3]);subjects[3].emit('keydown',{key:'Home'});assert.equal(doc.activeElement,subjects[0]);subjects[0].emit('keydown',{key:'End'});assert.equal(doc.activeElement,subjects[3]);
assert(html.includes('id="home-search-form"'));assert(html.includes('for="home-search"'));
for(const skill of ['listening','reading','writing','speaking']){assert(html.includes('aria-controls="home-panel-'+skill+'"'));assert(html.includes('aria-labelledby="home-tab-'+skill+'"'));assert(html.includes('data-intent="'+skill+'"'));}
const js=fs.readFileSync(require.resolve('../assets/orbit-ui.js'),'utf8');for(const forbidden of ['localStorage','fetch(','innerHTML','XMLHttpRequest','sessionStorage'])assert(!js.includes(forbidden));
console.log('PASS: repeated subject selection, roving keyboard tabs, mobile menu close/Escape/hash navigation, visible focus recovery, labelled search, no storage/network access. DOM simulation only.');
