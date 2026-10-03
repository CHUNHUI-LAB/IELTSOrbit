'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const sources=['../assets/styles.css','../assets/orbit-ui.css'].map(p=>fs.readFileSync(require.resolve(p),'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
// A bounded cascade audit for the legacy ID-scoped library layer. This is not
// a browser layout engine; actual rendering still requires visual QA.
function flatten(source,media=[],out=[]){let offset=0;while(offset<source.length){const open=source.indexOf('{',offset);if(open<0)break;const selector=source.slice(offset,open).trim();let depth=1,end=open+1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}assert.equal(depth,0,'CSS braces balance');const body=source.slice(open+1,end-1);if(selector.startsWith('@media'))flatten(body,[...media,selector],out);else if(!selector.startsWith('@'))for(const part of selector.split(','))out.push({selector:part.trim(),body,media,order:out.length});offset=end;}return out;}
const rules=flatten(sources);
function weight(s){const ids=(s.match(/#/g)||[]).length,classes=(s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length,tags=(s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?/g,' ').match(/\b[a-z][\w-]*\b/g)||[]).length;return ids*10000+classes*100+tags;}
function value(selectors,property,width,selectedRules=rules){const hits=[];for(const r of selectedRules){if(!selectors.includes(r.selector))continue;if(!r.media.every(m=>{const max=/max-width:\s*(\d+)px/.exec(m),min=/min-width:\s*(\d+)px/.exec(m);return !m.includes('prefers-reduced-motion')&&(!max||width<=+max[1])&&(!min||width>=+min[1]);}))continue;for(const declaration of r.body.split(';')){const colon=declaration.indexOf(':');if(declaration.slice(0,colon).trim()===property)hits.push({...r,value:declaration.slice(colon+1).trim(),weight:weight(r.selector)});}}hits.sort((a,b)=>a.weight-b.weight||a.order-b.order);assert(hits.length,property+' has a value');return hits.at(-1).value;}
for(const width of [1280,1000,768,600,390]){
 const narrow=width<=600;
 assert.equal(value(['h1','.section-heading h1','#panel-library .library-heading h1'],'font-size',width),narrow?'32px':'40px');
 assert.equal(value(['.section-heading p:not(.eyebrow)','#panel-library .library-heading p'],'font-size',width),narrow?'18px':'20px');
 assert.equal(value(['.guide-columns ul','#panel-library .guide-columns ul'],'font-size',width),narrow?'16px':'18px');
 assert.equal(value(['.guide-lead','#panel-library .guide-lead'],'display',width),width<=1100?'block':'grid');
 assert.equal(value(['.primary-button','.guide-next .primary-button','#panel-library .guide-next .primary-button'],'font-size',width),'16px');
 assert.equal(value(['.panel:not(#panel-start)','#panel-library'],'padding-top',width),narrow?'32px':'48px');
}
const practiceRules=flatten(fs.readFileSync(require.resolve('../practice-preview/assets/practice.css'),'utf8'));
for(const width of [1280,1182,1000,851]){
 assert.equal(value(['.header-inner'],'padding-top',width),'0');assert.equal(value(['.header-inner'],'padding-bottom',width),'0');assert.equal(value(['.section-nav'],'margin-left',width),'0');assert.equal(value(['.section-nav'],'align-self',width),'stretch');
 assert.equal(value(['.header-inner'],'min-height',width),value(['.header-inner'],'min-height',width,practiceRules));
 assert.equal(value(['.header-inner'],'gap',width),value(['.header-inner'],'gap',width,practiceRules));
 for(const property of ['font-size','font-weight','letter-spacing'])assert.equal(value(['.brand'],property,width),value(['.brand'],property,width,practiceRules),'matching desktop brand '+property+' at '+width);
 assert.equal(value(['.section-nav button'],'min-height',width),value(['.main-navigation a'],'min-height',width,practiceRules));
 assert.equal(value(['.resource-main .resource-title'],'line-height',width),'1.35');assert.equal(value(['.resource-main .resource-title'],'letter-spacing',width),'-.02em');assert.equal(value(['.resource-main .resource-title'],'overflow-wrap',width),'anywhere');
 assert.equal(value(['.experience-card .case-title'],'line-height',width),'1.45');
}
console.log('PASS F2 cascade: actual late ID-specific library winners at 1280/1000/768/600/390px; title, lead, body, controls, and top spacing. Static cascade audit, not rendering.');
