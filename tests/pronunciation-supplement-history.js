'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');

// Static code draft only: not executed, tested, committed or published.
// This stage follows the exact published f1218e94 catalog. Its new keys did
// not exist on the predecessor resource, so inverse removes those keys fully.
const pronunciationSupplementStage=Object.freeze({
  "id": "bc-speaking-pronunciation-2026-11-05",
  "baseCommit": "f1218e94c5964afdfa3e9938dd020ed2d0061d70",
  "beforeCatalogSha256": "c3f44894183ee8d6071031ef8742c7d594cea69b05915406ceae75cea7ea2ac4",
  "afterCatalogSha256": "585c4f0e6915bee7303a5df742b50572e5684dc756f3b3fb91237356ebec0839",
  "beforeResourceSha256": "e8dcd0111eefe47e726c4363361c8a216e5d3cf5dc522afcf83ec3f4366c5a38",
  "afterResourceSha256": "2c14885bd8ea05d1c5420da4e17e621b6482b7754189263747eab1788d59f48c",
  "fixtureSha256": "61ff1e0fcbc8d61f3aeff4b47c0c843026513b0961fd4e9410fb879550de2f30",
  "auditSha256": "49f747eb88c312663a40bae7bb1f33e9d51605594616af1aa8d5d5e679f24aa3",
  "resourceId": "bc-speaking-record-review",
  "reviewedAt": "2026-11-05"
});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const catalogBytes=catalog=>JSON.stringify(catalog,null,2)+'\n';
const objectSha256=value=>sha256(JSON.stringify(value));
const fixtureBytes=fs.readFileSync(require.resolve('./fixtures/bc-speaking-pronunciation-2026-11-05.json'),'utf8');
assert.equal(sha256(fixtureBytes),pronunciationSupplementStage.fixtureSha256,'pronunciation fixture bytes are independently pinned');
const fixture=JSON.parse(fixtureBytes);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function reviewedPronunciationSupplement(){return structuredClone(fixture);}

// A narrow historical projection, NOT a substitute for full release verification.
// Missing all markers means already-historical input. Legacy whole-catalog
// hashes still detect changed prior fields; verify below rejects a missing stage.
function beforePronunciationSupplementResources(resources){
  return resources.map(resource=>{
    if(resource.id!==pronunciationSupplementStage.resourceId)return resource;
    const present=own(resource,'relatedSources')||own(resource,'curatorInterpretation')||
      resource.actionableMethods?.includes(fixture.actionableMethods[0]);
    if(!present)return resource;
    assert.ok(Array.isArray(resource.actionableMethods),'reviewed method array is required');
    assert.deepEqual(resource.actionableMethods.slice(-fixture.actionableMethods.length),fixture.actionableMethods,'only the exact reviewed method suffix is reversible');
    assert.deepEqual(resource.relatedSources,fixture.relatedSources,'the entire newly added sources field must match');
    assert.equal(resource.curatorInterpretation,fixture.curatorInterpretation,'the entire newly added disclosure field must match');
    const prior={...resource,actionableMethods:resource.actionableMethods.slice(0,-fixture.actionableMethods.length)};
    delete prior.relatedSources;
    delete prior.curatorInterpretation;
    return prior;
  });
}
function beforePronunciationSupplementCatalog(catalog){
  return {...catalog,resources:beforePronunciationSupplementResources(catalog.resources)};
}
function verifyPronunciationSupplementStage(catalog){
  assert.equal(sha256(catalogBytes(catalog)),pronunciationSupplementStage.afterCatalogSha256,'the actual latest release is pinned before any historical projection');
  const matches=catalog.resources.filter(resource=>resource.id===pronunciationSupplementStage.resourceId);
  assert.equal(matches.length,1,'one existing provider/resource identity must remain');
  assert.equal(objectSha256(matches[0]),pronunciationSupplementStage.afterResourceSha256,'every current resource field is independently pinned');
  const prior=beforePronunciationSupplementCatalog(catalog);
  assert.equal(objectSha256(prior.resources.find(resource=>resource.id===pronunciationSupplementStage.resourceId)),pronunciationSupplementStage.beforeResourceSha256,'every prior resource field and absence of new keys is recovered');
  assert.equal(sha256(catalogBytes(prior)),pronunciationSupplementStage.beforeCatalogSha256,'every predecessor catalog byte, including all history and dates, is reconstructed');
  return prior;
}
function replayPronunciationSupplement(prior,supplement){
  assert.equal(sha256(catalogBytes(prior)),pronunciationSupplementStage.beforeCatalogSha256,'forward replay starts only from the exact published predecessor');
  assert.deepEqual(supplement,fixture,'official-looking URLs do not authorize altered additions');
  const current={...prior,resources:prior.resources.map(resource=>{
    if(resource.id!==pronunciationSupplementStage.resourceId)return resource;
    assert.ok(!own(resource,'relatedSources')&&!own(resource,'curatorInterpretation'),'new keys must be absent before this stage');
    return {...resource,actionableMethods:[...resource.actionableMethods,...structuredClone(supplement.actionableMethods)],
      relatedSources:structuredClone(supplement.relatedSources),curatorInterpretation:supplement.curatorInterpretation};
  })};
  verifyPronunciationSupplementStage(current);
  return current;
}
module.exports={pronunciationSupplementStage,reviewedPronunciationSupplement,
  beforePronunciationSupplementResources,beforePronunciationSupplementCatalog,
  verifyPronunciationSupplementStage,replayPronunciationSupplement};
