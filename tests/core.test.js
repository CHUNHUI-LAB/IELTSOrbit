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
assert.equal(catalog.resources.length,40);
assert.equal(catalog.policies.length,3);
assert.equal(catalog.centers.length,4);
assert.equal(catalog.calendars.length,1);
assert.equal(catalog.meta.checkedAt,'2026-10-01');
assert.equal(core.filterResources(catalog.resources,{sourceType:'teacher'},[]).length,5);
assert.equal(core.filterResources(catalog.resources,{sourceType:'experience'},[]).length,24);
assert.equal(core.filterResources(catalog.resources,{sourceType:'official'},[]).length,11);
assert.ok(core.filterResources(catalog.resources,{skill:'speaking',price:'free'},[]).length>0);
assert.equal(catalog.resources.find(r=>r.id==='simon').price,'paid');
assert.equal(catalog.resources.find(r=>r.id==='liz').price,'mixed');
assert.equal(catalog.resources.find(r=>r.id==='simon').access,'account');
assert.ok(catalog.policies.every(p=>p.summary&&p.url));
assert.ok(catalog.centers.every(c=>c.notes.includes('当前公开机考考点名录')&&c.notes.includes('不是实时可报名场次或余位')&&c.url));
assert.ok(catalog.coverage.some(c=>c.platform==='小红书'&&c.status.includes('评论部分核读')));
assert.ok(catalog.coverage.some(c=>c.platform==='贴吧'&&c.status==='覆盖缺口'));
assert.equal(source.calendar.dates.length,0);
console.log('PASS: actual public catalog adapter, 40 resources, 3 policies, 4 centers, honest calendar/coverage, price/access classes');

const crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(digest(source.resources.slice(0,15)),'dd6b39098a366c6835d5e452b8c40e57d543245fd5cc3fe04debf8ccf690b29b','original 15 resources preserved');
assert.equal(digest(source.metadata),'2c61c1364ee41f79b752e8eab8f0e416fbbba1e9731694b1bcc77a80e3986594','metadata preserved');
assert.equal(digest(source.policies),'5ca2c5ad3691f44032f282741fa67d3e976abf84b10ec28b8a154156fb742a79','policies preserved');
assert.equal(digest(source.centers),'11ec5fcc1d5887dd8fd86604febbb7ee3283ab016c36973aea4ff402cb8bda9b','centers matches the reviewed 2026-10-02 official-directory update');
assert.equal(digest(source.calendar),'4b9dab3a3dd1056736f3ff19afc082cc463c5bcbb27c13389f5d52ce44e5cb49','calendar matches the reviewed 2026-10-02 official-directory update');
assert.equal(digest(source.paths),'8b81304b21530b5d3f1641afe3737746a43a5d14bc6adb74c2a9b47394c8e0e5','paths preserved');
assert.equal(digest(source.methodology),'2a67fc58b539e8648e940dc9881ae3a021320c57b28c6ecbb2e531d2d641a577','methodology preserved');
assert.equal(digest(source.watchSources),'d8923397606416c3d94bf688ffc7b0b56d9fed8ed411d79ea332211ab42919cb','watchSources matches the reviewed 2026-10-02 official-directory update');
const recommended=core.filterResources(catalog.resources,{recommendation:'recommended'},[]);
const reference=core.filterResources(catalog.resources,{recommendation:'reference'},[]);
assert.equal(recommended.length,21);assert.equal(reference.length,19);
assert.deepEqual(recommended.filter(r=>r.id.startsWith('bili-')).map(r=>r.id),['bili-experience-math-2025']);
assert.ok(reference.some(r=>r.id==='reddit-writing-feedback-compare-2026'));
assert.equal(core.filterResources(catalog.resources,{recommendation:'reference',query:'逐行'},[]).length,1);
assert.ok(source.resources.slice(15).every(r=>typeof r.recommendedByDefault==='boolean'&&r.commentsReview&&r.provenance&&r.actionableMethods.length));
assert.ok(source.resources.filter(r=>r.authorContext).every(r=>r.authorContext.baseline&&r.authorContext.outcome));
assert.equal(source.evidenceReview.conflicts.length,5);
assert.equal(source.metadata.dailyUpdatesEnabled,true);assert.equal(source.metadata.firstScheduledRunVerified,false);
console.log('PASS: 15 originals, policies and learning data untouched; official center/calendar refresh verified; 21 default recommendations, 19 comparison cases, 25 additions with provenance; daily-update first run remains pending');

assert.equal(digest(source.resources.slice(0,28)),'cb065c66a2ea2252bee32313b2bb58ac3cf56d56d00bf757b336f00919e10905','all 28 pre-expansion records preserved without edits');
console.log('PASS: all 28 pre-expansion resource records preserved byte-equivalently after JSON parsing.');

assert.equal(digest(source.resources.slice(0,33)),'b483ec9868ada2c0a80365105a3e800fe7b9c367b8d3b868623bab05b41deabb','all 33 pre-batch records preserved without edits');
console.log('PASS: all 33 pre-batch resource objects preserved; official center/calendar refresh checked separately.');

// Official directory facts must never be promoted into bookable dates or seats.
assert.equal(source.schemaVersion,1,'additive metadata remains compatible with the existing adapter');
assert.equal(digest(source.resources),'0cba66ebeeac758b10bc3cba92945c51773d04385e4d1cf3c0047e6ad195b8ab','all 40 learning-resource objects unchanged');
assert.deepEqual(source.centers.map(c=>[c.id,c.neeaCenterCode,c.address,c.writtenTestVenue]),[
 ['zj-exam','100197','浙江省杭州市西湖区学院路35号','浙江教育综合大楼'],
 ['zju-huajiachi','100369','浙江省杭州市上城区凯旋路268号浙江大学（华家池校区）','中心大楼-南楼1楼'],
 ['hdu-xiasha','100374','杭州市钱塘区2号大街1158号杭州电子科技大学下沙校区','第11教学楼（求新楼）5层'],
 ['zust','150079','浙江省杭州市西湖区留和路359号','浙江省杭州市西湖区留和路359号12幢2层']
],'preserve stable IDs; use the four current NEEA computer-directory records only');
assert.equal(new Set(source.centers.map(c=>c.neeaCenterCode)).size,4);
for(const center of source.centers){
 assert.equal(center.city,'杭州');
 assert.equal(center.mode,'computer');
 assert.equal(center.examLabel,'雅思考试','this directory selection does not establish UKVI sessions');
 assert.equal(center.status,'official_directory_listing');
 assert.equal(center.sourceUrl,'https://ielts.neea.cn/showTestCenters');
 assert.equal(center.sourcePublisher,'教育部教育考试院雅思报名网站');
 assert.equal(center.checkedAt,'2026-10-02');
 assert.equal(center.observedAtUtc,'2026-10-02T02:41:30Z');
 assert.equal(center.writtenTestVenue,center.speakingTestVenue);
 assert.match(center.postalCode,/^\d{6}$/);
 assert.equal(center.seatsAvailable,null,'unknown seats must not become false, zero, or availability');
 assert.deepEqual(center.sessions,[],'a center directory is not dated session evidence');
 assert.ok(center.caveat.includes(center.writtenTestVenue),'venue details remain readable in the existing UI');
 assert.ok(!center.caveat.includes('旧纸笔'));
 assert.ok(!center.address.includes('2号大街1号'));
 const normalized=catalog.centers.find(c=>c.id===center.id);
 assert.equal(normalized.neeaCenterCode,center.neeaCenterCode);
 assert.equal(normalized.notes,center.caveat);
 assert.equal(normalized.url,center.sourceUrl);
}
assert.equal(source.centers.find(c=>c.id==='hdu-xiasha').entrance,'位于文泽路的教学区东门');
assert.ok(source.centers.find(c=>c.id==='hdu-xiasha').caveat.includes('文泽路'));
assert.ok(!source.centers.some(c=>/idp|gongshu/i.test(c.id)),'uncorroborated separate-provider candidate stays out of verified records');
assert.equal(source.calendar.publishedAt,'2026-08-28');
assert.equal(source.calendar.checkedAt,'2026-10-02');
assert.equal(source.calendar.status,'announcement_verified_dates_not_transcribed');
assert.equal(source.calendar.announcementUrl,'https://ielts.neea.cn/allnews?locale=zh_CN');
assert.deepEqual(source.calendar.dates,[]);
assert.deepEqual(source.calendar.centerSessions,[]);
assert.equal(source.calendar.seatsAvailable,null);
assert.ok(source.calendar.note.includes('已于2026-08-28列出')&&source.calendar.note.includes('系统升级通知'));
assert.deepEqual(source.calendar.evidenceSources.slice(1).map(s=>s.retrievalStatus),['maintenance_redirect','index_only','announcement_read_calendar_images_unreadable']);
assert.ok(source.calendar.evidenceSources.every(s=>core.safeUrl(s.url)));
assert.ok(source.watchSources.includes('https://ielts.neea.cn/showTestCenters'));
assert.ok(source.watchSources.includes('https://ielts.neea.cn/allnews?locale=zh_CN'));
console.log('PASS: four current NEEA codes/venues, HDU 1158 address, official provenance, unchanged 40-resource catalog, announced Q4 with unreadable details, no invented sessions or seats, separate IDP candidate excluded.');
