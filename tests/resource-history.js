'use strict';
// This one dated maintenance adds exactly these two fields to three legacy cards.
// Remove ONLY those additions when verifying earlier immutable-resource digests.
// All original fields, every other resource and the historical hash values remain protected.
const reviewedIds=new Set(['official-samples','bc-mocks','writing-rubric']);
function legacyResources(resources){return resources.map(resource=>{if(!reviewedIds.has(resource.id))return resource;const prior={...resource};delete prior.actionableMethods;delete prior.curatorInterpretation;return prior;});}
module.exports={legacyResources,reviewedIds};
