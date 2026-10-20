'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');

// A single reviewed append to three existing fields, not a general resource filter.
// The predecessor was read independently from this exact published commit.
// Earlier policy/resource stages retain every original fixture and SHA value.
const listeningSupplementStage=Object.freeze({
  id:'bc-part3-matching-2026-10-20',
  baseCommit:'65cc6694d1faaa3a5fca5c92e82d7328c3d7ffea',
  beforeCatalogSha256:'49d94f5e024fc393b204b10218223ea916f1118c6013437a467f859a283231eb',
  afterCatalogSha256:'c3f44894183ee8d6071031ef8742c7d594cea69b05915406ceae75cea7ea2ac4',
  beforeResourceSha256:'d3508d61d31acba7ff4fff180792859b11bd35cfb19b1ac5822942b259db3f52',
  afterResourceSha256:'99725a29ea0155113e06c178c0eb845882e19b65d61670c006b1c36da2f1a8b4',
  fixtureSha256:'0908cd9d739e9745679396f07bc41dfa5bf642887631dc3e39396b350cb420c1',
  resourceId:'bc-mocks',
  reviewedAt:'2026-10-20'
});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const catalogBytes=catalog=>JSON.stringify(catalog,null,2)+'\n';
const objectSha256=value=>sha256(JSON.stringify(value));
const fixtureBytes=fs.readFileSync(require.resolve('./fixtures/bc-part3-matching-2026-10-20.json'),'utf8');
assert.equal(sha256(fixtureBytes),listeningSupplementStage.fixtureSha256,'reviewed suffix fixture bytes are immutable');
const fixture=JSON.parse(fixtureBytes);
function reviewedSupplement(){return structuredClone(fixture);}

function beforeListeningSupplementResources(resources){
  return resources.map(resource=>{
    if(resource.id!==listeningSupplementStage.resourceId)return resource;
    const methods=resource.actionableMethods,links=resource.relatedSources,note=resource.curatorInterpretation;
    // No marker means this resource has already crossed the stage (possibly
    // further back into old teaching history). This is not full verification.
    const present=methods?.includes(fixture.actionableMethods[0])||
      links?.some(link=>fixture.relatedSources.some(source=>source.url===link.url))||
      note?.includes(fixture.curatorInterpretationSuffix);
    if(!present)return resource;
    assert.deepEqual(methods?.slice(-fixture.actionableMethods.length),fixture.actionableMethods,'only the exact reviewed method suffix is reversible');
    assert.deepEqual(links?.slice(-fixture.relatedSources.length),fixture.relatedSources,'only the exact reviewed source suffix is reversible');
    assert.ok(note?.endsWith(fixture.curatorInterpretationSuffix),'only the exact reviewed disclosure suffix is reversible');
    // Slice only the added suffixes. Changed prior fields, duplicates, extra
    // fields/records and reordered content remain visible to predecessor SHAs.
    return {...resource,
      actionableMethods:methods.slice(0,-fixture.actionableMethods.length),
      relatedSources:links.slice(0,-fixture.relatedSources.length),
      curatorInterpretation:note.slice(0,-fixture.curatorInterpretationSuffix.length)};
  });
}
function beforeListeningSupplementCatalog(catalog){
  return {...catalog,resources:beforeListeningSupplementResources(catalog.resources)};
}
function verifyListeningSupplementStage(catalog){
  assert.equal(sha256(catalogBytes(catalog)),listeningSupplementStage.afterCatalogSha256,'current release must contain exactly the reviewed supplement');
  const matches=catalog.resources.filter(resource=>resource.id===listeningSupplementStage.resourceId);
  assert.equal(matches.length,1,'supplement retains one existing resource/provider identity');
  assert.equal(objectSha256(matches[0]),listeningSupplementStage.afterResourceSha256,'every current resource field is independently pinned');
  const prior=beforeListeningSupplementCatalog(catalog);
  assert.equal(objectSha256(prior.resources.find(resource=>resource.id===listeningSupplementStage.resourceId)),listeningSupplementStage.beforeResourceSha256,'all old resource fields are recoverable');
  assert.equal(sha256(catalogBytes(prior)),listeningSupplementStage.beforeCatalogSha256,'every predecessor byte, including policy/history/date fields, is recoverable');
  return prior;
}
function replayListeningSupplement(prior,supplement){
  assert.equal(sha256(catalogBytes(prior)),listeningSupplementStage.beforeCatalogSha256,'replay starts only from the exact published predecessor');
  assert.deepEqual(supplement,fixture,'plausible IDs or official URLs do not authorize unreviewed content');
  const current={...prior,resources:prior.resources.map(resource=>resource.id!==fixture.resourceId?resource:{...resource,
    actionableMethods:[...resource.actionableMethods,...structuredClone(supplement.actionableMethods)],
    relatedSources:[...resource.relatedSources,...structuredClone(supplement.relatedSources)],
    curatorInterpretation:resource.curatorInterpretation+supplement.curatorInterpretationSuffix})};
  verifyListeningSupplementStage(current);
  return current;
}
module.exports={listeningSupplementStage,reviewedSupplement,beforeListeningSupplementResources,
  beforeListeningSupplementCatalog,verifyListeningSupplementStage,replayListeningSupplement};
