const assert=require('node:assert/strict');
const core=require('../assets/core.js');
const fixture=core.cleanResources([
 {id:'a',title:'官方写作样题',url:'https://example.org/a',provider:'Official',summary:'写作与评分标准',sourceType:'official',skills:['writing'],levels:['foundation','developing'],price:'free',access:'open'},
 {id:'b',title:'口语练习',url:'https://example.org/b',provider:'Teacher',summary:'反馈练习',sourceType:'teacher',skills:['speaking'],levels:['advanced'],price:'mixed',access:'varies'},
 {id:'c',title:'考生经验',url:'https://example.org/c',sourceType:'experience',skills:['general'],levels:['developing'],price:'free',access:'account'},
 {id:'unsafe',title:'bad',url:'javascript:alert(1)'}
]);
assert.equal(fixture.length,3);
assert.equal(core.safeUrl('javascript:alert(1)'),null);
assert.equal(core.safeUrl('http://example.org'),null);
assert.equal(core.filterResources(fixture,{sourceType:'official'},[]).length,1);
assert.equal(core.filterResources(fixture,{skill:'speaking',level:'advanced'},[])[0].id,'b');
assert.equal(core.filterResources(fixture,{price:'free',access:'account'},[])[0].id,'c');
assert.equal(core.filterResources(fixture,{query:'评分'},[])[0].id,'a');
assert.equal(core.filterResources(fixture,{query:'no such thing'},[]).length,0);
assert.equal(core.filterResources(fixture,{savedOnly:true},['b'])[0].id,'b');
assert.deepEqual(core.readState('invalid'),{saved:[],path:null});
assert.deepEqual(core.readState('{"saved":["a","a",9],"path":{"baseline":"unknown","target":"7"}}'),{saved:['a'],path:{baseline:'unknown',target:'7'}});
assert.equal(core.readState('{"path":{"baseline":"9","target":"9"}}').path,null);
for(const baseline of ['unknown','5.5','6','6.5'])for(const target of ['6.5','7','7.5']){const p=core.getPath(baseline,target);assert.equal(p.steps.length,3);assert.ok(p.caveat.includes('不是提分承诺'));}
assert.equal(core.getPath('bad','bad').baseline,'unknown');
console.log('PASS: 12 learning-path combinations, source/skill/level/price/access/search/saved filters, safe URLs, malformed and valid local state');

const source=require('../data/catalog.json');
const catalog=core.normalizeCatalog(source);
assert.equal(catalog.resources.length,24);
assert.equal(catalog.policies.length,3);
assert.equal(catalog.centers.length,4);
assert.equal(catalog.calendars.length,1);
assert.equal(catalog.meta.checkedAt,'2026-10-01');
assert.equal(core.filterResources(catalog.resources,{sourceType:'teacher'},[]).length,5);
assert.equal(core.filterResources(catalog.resources,{sourceType:'experience'},[]).length,8);
assert.equal(core.filterResources(catalog.resources,{sourceType:'official'},[]).length,11);
assert.ok(core.filterResources(catalog.resources,{skill:'speaking',price:'free'},[]).length>0);
assert.equal(catalog.resources.find(r=>r.id==='simon').price,'paid');
assert.equal(catalog.resources.find(r=>r.id==='liz').price,'mixed');
assert.equal(catalog.resources.find(r=>r.id==='simon').access,'account');
assert.ok(catalog.policies.every(p=>p.summary&&p.url));
assert.ok(catalog.centers.every(c=>c.notes.includes('旧纸笔')&&c.url));
assert.ok(catalog.coverage.some(c=>c.platform==='小红书'&&c.status==='覆盖缺口'));
assert.ok(catalog.coverage.some(c=>c.platform==='贴吧'&&c.status==='覆盖缺口'));
assert.equal(source.calendar.dates.length,0);
console.log('PASS: actual public catalog adapter, 24 resources, 3 policies, 4 centers, honest calendar/coverage, price/access classes');

const crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(digest(source.resources.slice(0,15)),'dd6b39098a366c6835d5e452b8c40e57d543245fd5cc3fe04debf8ccf690b29b','original 15 resources preserved');
assert.equal(digest(source.metadata),'2c61c1364ee41f79b752e8eab8f0e416fbbba1e9731694b1bcc77a80e3986594','metadata preserved');
assert.equal(digest(source.policies),'5ca2c5ad3691f44032f282741fa67d3e976abf84b10ec28b8a154156fb742a79','policies preserved');
assert.equal(digest(source.centers),'f336754aca365d76542ebb82d4860721bbe38fee24c1ffd716e1c30ed10aa652','centers preserved');
assert.equal(digest(source.calendar),'b43bac94150223fc4df5b50182ff96bd801d01bd5b850e3feb709a63b1fa2e49','calendar preserved');
assert.equal(digest(source.paths),'8b81304b21530b5d3f1641afe3737746a43a5d14bc6adb74c2a9b47394c8e0e5','paths preserved');
assert.equal(digest(source.methodology),'2a67fc58b539e8648e940dc9881ae3a021320c57b28c6ecbb2e531d2d641a577','methodology preserved');
assert.equal(digest(source.watchSources),'01cb9b073742d9c7262e5f75ed5b52724564200b423e5eb3beff727aa4c27513','watchSources preserved');
const recommended=core.filterResources(catalog.resources,{recommendation:'recommended'},[]);
const reference=core.filterResources(catalog.resources,{recommendation:'reference'},[]);
assert.equal(recommended.length,20);assert.equal(reference.length,4);
assert.deepEqual(recommended.filter(r=>r.id.startsWith('bili-')).map(r=>r.id),['bili-experience-math-2025']);
assert.ok(reference.some(r=>r.id==='reddit-writing-feedback-compare-2026'));
assert.equal(core.filterResources(catalog.resources,{recommendation:'reference',query:'逐行'},[]).length,1);
assert.ok(source.resources.slice(15).every(r=>typeof r.recommendedByDefault==='boolean'&&r.commentsReview&&r.provenance&&r.actionableMethods.length));
assert.ok(source.resources.filter(r=>r.authorContext).every(r=>r.authorContext.baseline&&r.authorContext.outcome));
assert.equal(source.evidenceReview.conflicts.length,5);
assert.equal(source.metadata.dailyUpdatesEnabled,true);assert.equal(source.metadata.firstScheduledRunVerified,false);
console.log('PASS: 15 originals and formal data untouched; 20 default recommendations, 4 comparison cases, 9 additions with provenance; daily-update first run remains pending');
