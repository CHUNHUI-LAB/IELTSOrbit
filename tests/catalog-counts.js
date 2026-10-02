// Independent raw-data expectations for changing catalog size; release identity is pinned separately.
const raw=require('../data/catalog.json');
const resources=raw.resources,experience=resources.filter(r=>r.sourceType==='experience');
module.exports={resources:resources.length,reference:resources.filter(r=>r.recommendedByDefault===false).length,experiences:experience.length,experienceReference:experience.filter(r=>r.recommendedByDefault===false).length,timing:experience.filter(r=>require('../assets/experience.js').topicIds.timing.includes(r.id)).length};
