'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
// Reuse the actual DOM interaction harness without running its suite twice.
const harnessFile=require.resolve('./interactions.test.js');
const prelude=fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0];
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(prelude+'\nglobalThis.makeHarness=harness;',scope);
(async()=>{
 const h=scope.makeHarness({hash:'#library/reading'});await h.flush();const n=h.nodes;
 for(let cycle=0;cycle<3;cycle++){
  h.hash('#library/reading/resource/official-samples');
  assert.equal(n['panel-library'].dataset.view,'resource');
  const card=h.doc.getElementById('resource-official-samples');
  assert.equal(h.active,card,'resource route focuses the visible reader');assert.equal(card.dataset.expanded,'true');assert.equal(card.querySelector('.resource-title').tagName,'h1','reader promotes its visible title');assert(h.doc.getElementById('detail-official-samples').open);
  assert.equal(card.querySelectorAll('.reader-back').length,1);
  assert.equal(card.querySelector('.reader-back').href,'#library/reading');
  const save=card.querySelector('[data-save]');n['resource-grid'].dispatch('click',{target:save});
  assert.equal(h.doc.getElementById('resource-official-samples').dataset.expanded,'true','save rerender keeps the reader visible');
  assert.equal(h.doc.getElementById('resource-official-samples').querySelectorAll('.reader-back').length,1);
  h.hash('#library/reading');assert.equal(n['panel-library'].dataset.view,'overview');assert.equal(h.active,h.doc.getElementById('resource-official-samples').querySelector('.resource-actions').querySelector('a'),'Back restores a visible summary control');assert.equal(h.doc.getElementById('resource-official-samples').querySelector('.resource-title').tagName,'h3','Back demotes the card title below the library H1');
 }
 h.hash('#library/reading/resource/official-samples');h.hash('#library/reading/resource/missing');assert.equal(h.doc.getElementById('resource-official-samples').querySelector('.resource-title').tagName,'h3','invalid reader address cannot leave an extra H1 in the list');
 h.hash('#library/reading/resource/official-samples');const beforeSkip=h.context.location.hash;n['skip-main'].dispatch('click');assert.equal(h.active,n.main);assert.equal(h.context.location.hash,beforeSkip,'skip link must not reset application route');h.hash('#library/reading');
 // Method reader uses the existing authored steps, not fictional example content.
 h.hash('#library/reading/method');assert.equal(n['panel-library'].dataset.view,'method');assert.equal(h.active,n['learning-guide'],'method link focuses visible content');assert(h.doc.querySelectorAll('.method-detail')[0].open);
 h.hash('#library/reading/resource/official-samples');assert.equal(h.doc.getElementById('resource-official-samples').querySelector('.reader-back').href,'#library/reading/method');h.hash('#library/reading/method');assert.equal(h.active,n['learning-guide']);h.hash('#library/reading');assert.equal(n['panel-library'].dataset.view,'overview');
 // Saved-only removal must return to a usable list instead of hiding every card.
 const only=scope.makeHarness({hash:'#library/reading',rawState:JSON.stringify({saved:['official-samples'],path:null})});await only.flush();
 only.nodes['saved-filter'].dispatch('click');only.hash('#library/reading/resource/official-samples');
 const remove=only.doc.getElementById('resource-official-samples').querySelector('[data-save]');only.nodes['resource-grid'].dispatch('click',{target:remove});
 assert.equal(only.nodes['panel-library'].dataset.view,'overview');assert.equal(only.nodes['empty-state'].hidden,false);
 // Experience reader and browser Back retain the selection, without new persistence.
 const e=scope.makeHarness({hash:'#experience'});await e.flush();
 const root=e.nodes['experience-root'],topic=e.doc.getElementById('experience-topic');
 const id=root.querySelectorAll('.experience-card')[0].dataset.caseId;
 for(let cycle=0;cycle<3;cycle++){
  e.hash('#experience-case-'+id);assert.equal(root.dataset.view,'detail');assert.equal(e.nodes['experience-title'].getAttribute('aria-level'),'2');
  const chosen=root.querySelectorAll('.experience-card').filter(c=>c.dataset.reader==='true');
  assert.equal(chosen.length,1);assert.equal(chosen[0].querySelector('.case-title').tagName,'h1');assert.equal(e.active,chosen[0],'experience route focuses the visible reader');assert(chosen[0].querySelector('details').open);assert.equal(chosen[0].querySelector('.case-reader-back').href,'#experience');
  e.hash('#experience');assert.equal(root.dataset.view,'overview');assert.equal(e.nodes['experience-title'].getAttribute('aria-level'),'1');assert.equal(e.active,root.querySelectorAll('.experience-card').find(c=>c.dataset.caseId===id).querySelector('.case-reader-link'),'experience Back restores a visible summary control');
 }
 for(const record of require('../data/catalog.json').resources.filter(r=>r.sourceType==='experience')){e.hash('#experience-case-'+record.id);const selected=root.querySelectorAll('.experience-card').filter(c=>c.dataset.reader==='true');assert.equal(selected.length,1);assert.equal(selected[0].dataset.caseId,record.id);assert.equal(e.active,selected[0]);e.hash('#experience');}
 e.hash('#experience-case-'+id);e.hash('#experience-case-missing');assert.equal(root.dataset.view,'overview');assert.equal(e.nodes['experience-title'].getAttribute('aria-level'),'1');assert.equal(e.active,topic);assert.equal(root.querySelectorAll('.experience-card').filter(c=>c.dataset.reader==='true').length,0);assert(e.text(root).includes('未找到这篇经验'));e.hash('#experience-case-missing');assert.equal((e.text(root).match(/未找到这篇经验/g)||[]).length,1,'repeated missing routes do not duplicate notices');
 assert.equal(e.nodes['experience-title'].getAttribute('aria-level'),'1','missing case restores the overview heading');assert.equal(e.saved.size,0);
 const all=scope.makeHarness({hash:'#library'});await all.flush();all.nodes['skill-filter'].value='all';all.nodes['recommendation-filter'].value='all';all.nodes['filter-form'].dispatch('change');const entries=all.nodes['resource-grid'].children.map(card=>({id:card.dataset.resourceId,hash:card.querySelector('.resource-actions').querySelector('a').href}));assert.equal(entries.length,require('../data/catalog.json').resources.length);for(const entry of entries){all.hash(entry.hash);const card=all.doc.getElementById('resource-'+entry.id);assert(card,'every real catalog record is reachable: '+entry.id);assert.equal(card.dataset.expanded,'true');assert.equal(card.querySelector('.resource-title').tagName,'h1');assert.equal(all.active,card);all.hash('#library');}for(const legacyHash of ['#library/listening/resource/score','#library/all/resource/score']){const cold=scope.makeHarness({hash:legacyHash});await cold.flush();assert.equal(cold.doc.getElementById('resource-score').dataset.expanded,'true');assert.equal(cold.nodes['skill-filter'].value,'all');assert.equal(cold.doc.getElementById('resource-score').querySelector('.reader-back').href,'#library');}
 const plan=scope.makeHarness({hash:'#path/step/1'});await plan.flush();for(let step=0;step<4;step++)plan.nodes['plan-next'].dispatch('click');assert.equal(plan.active,plan.nodes['path-result'],'Generate focuses the visible plan');plan.nodes['edit-plan'].dispatch('click');assert.equal(plan.active,plan.nodes['plan-step-1'],'Edit focuses the first visible fieldset');plan.nodes['cancel-plan-edit'].dispatch('click');assert.equal(plan.active,plan.nodes['path-result'],'Cancel restores focus to visible result');
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.equal((html.match(/class="home-task"/g)||[]).length,3);
 for(const [panel,next] of [['library','experience'],['experience','path'],['path','exams']])assert.equal((html.split('id="panel-'+panel+'"')[1].split('id="panel-'+next+'"')[0].match(/<h1(?: |>|\n)/g)||[]).length,1,'one native overview H1 for '+panel);
 assert(html.includes('<h1>杭州考点与考期</h1>'));assert.equal((html.split('id="panel-start"')[0].match(/<h1(?: |>|\n)/g)||[]).length,1,'homepage has only its own title H1');
 for(const field of ['baseline','target','exam-history','weak-skill'])assert(html.includes('id="'+field+'"'));
 assert(html.includes('value="unknown"'));assert(!html.includes('hero-orbits'));
 const css=fs.readFileSync(require.resolve('../assets/orbit-ui.css'),'utf8');
 for(const token of ['--hover-time:160ms','--panel-time:220ms','--radius:12px','font:18px/1.65','body{font-size:16px}','min-height:44px','prefers-reduced-motion:reduce','focus-visible'])assert(css.includes(token),token);
 assert(!css.includes('@import'));assert(!css.includes('url(http'));
 console.log('PASS F2: dedicated resource/method/experience readers, repeated navigation, save rerender, saved-only removal, Back, optional plan fields, 3-task home, typography/motion/focus contract. DOM/static checks, not a rendering pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});
