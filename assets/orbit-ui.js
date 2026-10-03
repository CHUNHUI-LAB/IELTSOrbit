(function(){
'use strict';
const menu=document.getElementById('menu-toggle');
const navigation=document.getElementById('main-navigation');
function closeMenu(){const restore=menu.getAttribute('aria-expanded')==='true'&&navigation.contains(document.activeElement);menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','展开导航');if(restore)menu.focus();}
menu.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(expanded));menu.setAttribute('aria-label',expanded?'收起导航':'展开导航');});
navigation.addEventListener('click',event=>{if(event.target.closest('button,a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
window.addEventListener('hashchange',closeMenu);
const subjects=Array.from(document.querySelectorAll('[data-home-skill]'));
function selectSubject(button,focus){subjects.forEach(item=>{const active=item===button;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById('home-panel-'+item.dataset.homeSkill).hidden=!active;});if(focus)button.focus();}
subjects.forEach((button,index)=>{button.addEventListener('click',()=>selectSubject(button,false));button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%subjects.length;else if(event.key==='ArrowLeft')next=(index+subjects.length-1)%subjects.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=subjects.length-1;else return;event.preventDefault();selectSubject(subjects[next],true);});});
})();
