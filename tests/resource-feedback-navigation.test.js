'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const core=require('../assets/core.js'),raw=require('../data/catalog.json');
const data=core.normalizeCatalog(raw),before=JSON.stringify(raw);
const harnessFile=require.resolve('./interactions.test.js');
const scope={require:createRequire(harnessFile),console,setImmediate,URL};
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8').split('(async()=>{')[0]+'\nglobalThis.makeHarness=harness;',scope);
const expected=['all-rubrics','cambridge','ready-cn','computer','simon','advantage','idp-writing'];
const candidates=data.resources.filter(r=>r.sourceType!=='experience'&&!r.actionableMethods?.length&&r.skills.some(s=>core.learningGuides[s]));
assert.deepEqual(candidates.map(r=>r.id),expected);
(async()=>{
 const persisted=JSON.stringify({saved:['all-rubrics'],path:{examHistory:'yes',baseline:'6',target:'7',dailyMinutes:'30',weakSkill:'writing',completed:true}});
 let pairs=0;
 for(const r of candidates){
  for(const skill of r.skills.filter(s=>core.learningGuides[s])){
   pairs++;
   const route='#library/'+skill+'/resource/'+r.id;
   const h=scope.makeHarness({hash:route,rawState:persisted});await h.flush();
   for(let cycle=0;cycle<2;cycle++){
    const card=h.doc.getElementById('resource-'+r.id),block=card.querySelector('.resource-feedback');
    assert(block,r.id+' needs a feedback-method entry in its generic reader fallback');
    assert.equal(card.querySelectorAll('.resource-feedback').length,1);
    assert(h.text(block).includes('本站建议：练习后的反馈与复盘'));
    assert(h.text(block).includes('不代表已体验这份资料的反馈服务'));
    assert.equal(block.querySelectorAll('a').length,r.skills.filter(s=>core.learningGuides[s]).length);
    for(const s of r.skills.filter(s=>core.learningGuides[s])){
     const link=block.querySelectorAll('a').find(a=>a.href==='#library/'+s+'/method');
     assert(link,r.id+' / '+s+' has its own method link');
     assert(h.text(link.parent).includes(core.learningGuides[s].output));
    }
    const source=card.querySelector('.resource-link');assert.equal(source.href,r.url);assert.equal(source.target,'_blank');assert.equal(source.rel,'noopener noreferrer');
    assert(h.text(card).includes(r.checkedAt));assert(h.text(card).includes(r.evidenceScope));
    const link=block.querySelectorAll('a').find(a=>a.href==='#library/'+skill+'/method');h.hash(link.href);
    assert.equal(h.nodes['panel-library'].dataset.view,'method');assert.equal(h.active,h.nodes['learning-guide']);
    assert.equal(h.nodes['skill-filter'].value,skill);assert(h.doc.querySelectorAll('.method-detail')[0].open);
    assert(h.text(h.nodes['learning-guide']).includes(core.learningGuides[skill].output));
    h.hash(route);assert.equal(h.nodes['panel-library'].dataset.view,'resource');assert.equal(h.active,h.doc.getElementById('resource-'+r.id));
    assert.equal(h.saved.get('ieltsorbit.local.v1'),persisted);
   }
  }
 }
 const all=scope.makeHarness({hash:'#library'});await all.flush();all.nodes['skill-filter'].value='all';all.nodes['recommendation-filter'].value='all';all.nodes['filter-form'].dispatch('change');
 for(const r of data.resources){
  const card=all.doc.getElementById('resource-'+r.id);assert(card);
  assert.equal(card.querySelectorAll('.resource-feedback').length,expected.includes(r.id)?1:0,r.id+' must keep its existing bespoke / experience / information-only treatment');
 }
 const blocked=scope.makeHarness({hash:'#library/writing/resource/all-rubrics',storageBlocked:true});await blocked.flush();
 const link=blocked.doc.getElementById('resource-all-rubrics').querySelector('.resource-feedback').querySelector('a');blocked.hash(link.href);
 assert.equal(blocked.nodes['panel-library'].dataset.view,'method');assert.equal(blocked.storageWrites,0);
 assert.equal(JSON.stringify(raw),before,'rendering and navigation preserve every catalog field and date');
 console.log('PASS: 7 fallback readers, '+pairs+' real resource/skill pairs, exact published outputs, source/date preservation, repeated cold-reader → method → Back transitions, storage failure and all 51 record boundaries. DOM only; not browser rendering.');
})().catch(error=>{console.error(error);process.exitCode=1;});
