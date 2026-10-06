'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

// A reviewed, reversible append stage, not a general policy filter.
// The predecessor was read from f7e973b, not regenerated from current data.
// Old history tests keep their original SHA values after this exact inverse.
const paperTrfStage=Object.freeze({
  id:'paper-trf-2026-10-06',
  baseCommit:'f7e973bea4832b66defaaf3c11eddc5939eada24',
  beforeCatalogSha256:'fffd0ca3c20f28fc64e0ce2196b927fa2ee58120365799f23913f5e9e1b756b1',
  afterCatalogSha256:'49d94f5e024fc393b204b10218223ea916f1118c6013437a467f859a283231eb',
  beforePoliciesSha256:'5ca2c5ad3691f44032f282741fa67d3e976abf84b10ec28b8a154156fb742a79',
  addedPolicySha256:'b8a8a4c0a34b26f9a76fffb30d3e7801eb81ac7a2528d0c58221cb588f425547',
  addedPolicyId:'trf-digital-only-2026-10',
  currentPolicyIds:Object.freeze(['computer-2026','fees-2026','osr','trf-digital-only-2026-10']),
  sourceUrl:'https://www.chinaielts.org/press-office/paper-trf',
  sourceStatus:'official_notice_body_read',
  scope:'中国大陆；IELTS/UKVI学术类、培训类全科及单科重考；Life Skills保留纸质且暂不提供电子版',
  effectiveFrom:'2026-10-01',
  reviewedAt:'2026-10-06'
});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const catalogBytes=catalog=>JSON.stringify(catalog,null,2)+'\n';
const objectSha256=value=>sha256(JSON.stringify(value));

function assertReviewedPaperTrfPolicy(policy){
  assert.equal(objectSha256(policy),paperTrfStage.addedPolicySha256,
    'new policy must match the independently reviewed record, including every field and source boundary');
}

function beforePaperTrfPolicyCatalog(catalog){
  assert.ok(Array.isArray(catalog.policies),'policy history requires an explicit policy array');
  const count=paperTrfStage.currentPolicyIds.length;
  // Historical callers may already have crossed this stage. This does not
  // certify the entire catalog: their original full-catalog SHA checks still do.
  if(catalog.policies.length===count-1){
    assert.equal(objectSha256(catalog.policies),paperTrfStage.beforePoliciesSha256,
      'already-historical policies must retain every original field');
    return catalog;
  }
  assert.deepEqual(catalog.policies.map(policy=>policy.id),paperTrfStage.currentPolicyIds,
    'only the exact reviewed policy suffix is reversible; extra, missing or reordered policies fail');
  assertReviewedPaperTrfPolicy(catalog.policies.at(-1));
  const prior={...catalog,policies:catalog.policies.slice(0,-1)};
  assert.equal(objectSha256(prior.policies),paperTrfStage.beforePoliciesSha256,
    'the append cannot conceal changes to the three prior policies');
  return prior;
}

function verifyPaperTrfPolicyStage(catalog){
  assert.deepEqual(catalog.policies.map(policy=>policy.id),paperTrfStage.currentPolicyIds,
    'current release must actually contain the reviewed append');
  const prior=beforePaperTrfPolicyCatalog(catalog);
  assert.equal(sha256(catalogBytes(prior)),paperTrfStage.beforeCatalogSha256,
    'every predecessor catalog field and date must remain byte-reconstructible');
  assert.equal(sha256(catalogBytes(catalog)),paperTrfStage.afterCatalogSha256,
    'current catalog is pinned separately from historical projections');
  return prior;
}

function replayPaperTrfPolicyAppend(prior,reviewedPolicy){
  assert.equal(sha256(catalogBytes(prior)),paperTrfStage.beforeCatalogSha256,
    'replay must start from the exact recorded predecessor');
  assertReviewedPaperTrfPolicy(reviewedPolicy);
  const current={...prior,policies:[...prior.policies,structuredClone(reviewedPolicy)]};
  verifyPaperTrfPolicyStage(current);
  return current;
}

module.exports={paperTrfStage,sha256,catalogBytes,beforePaperTrfPolicyCatalog,
  verifyPaperTrfPolicyStage,replayPaperTrfPolicyAppend};
