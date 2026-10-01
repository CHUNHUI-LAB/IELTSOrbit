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
assert.equal(catalog.resources.length,15);
assert.equal(catalog.policies.length,3);
assert.equal(catalog.centers.length,4);
assert.equal(catalog.calendars.length,1);
assert.equal(catalog.meta.checkedAt,'2026-10-01');
assert.equal(core.filterResources(catalog.resources,{sourceType:'teacher'},[]).length,3);
assert.equal(core.filterResources(catalog.resources,{sourceType:'experience'},[]).length,3);
assert.equal(core.filterResources(catalog.resources,{sourceType:'official'},[]).length,9);
assert.ok(core.filterResources(catalog.resources,{skill:'speaking',price:'free'},[]).length>0);
assert.equal(catalog.resources.find(r=>r.id==='simon').price,'paid');
assert.equal(catalog.resources.find(r=>r.id==='liz').price,'mixed');
assert.equal(catalog.resources.find(r=>r.id==='simon').access,'account');
assert.ok(catalog.policies.every(p=>p.summary&&p.url));
assert.ok(catalog.centers.every(c=>c.notes.includes('旧纸笔')&&c.url));
assert.ok(catalog.coverage.some(c=>c.platform==='小红书'&&c.status==='覆盖缺口'));
assert.ok(catalog.coverage.some(c=>c.platform==='贴吧'&&c.status==='覆盖缺口'));
assert.equal(source.calendar.dates.length,0);
console.log('PASS: actual public catalog adapter, 15 resources, 3 policies, 4 centers, honest calendar/coverage, price/access classes');
