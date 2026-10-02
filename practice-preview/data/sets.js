(function(root){
'use strict';
// Keep the original key and envelope in place: old links and old progress still
// address The Repair Library. Each additional set owns a separate key and lock.
const sets=[
 {content:root.IELTS_CONTENT,key:'ieltsorbit.original.practice.v1',focus:'定位、同义替换与词组提取',rights:'文章、问题和中文解析均为本站新写的原创内容；Mereford 是虚构地点，无外部题库、官方音频或真实研究数据。'},
 {content:root.IELTS_MUSEUM_CONTENT,key:'ieltsorbit.original.practice.v1.original-museum-labels-002',focus:'定位与谨慎推断',rights:'文章、问题和中文解析均为本站新写的原创内容；Bellwick Museum、试验与观察结果均为虚构教学情境，未转载或改编外部题文、已发表研究或音频。'}
];
function get(id){return sets.find(set=>set.content.id===id)||null;}
function href(id){return 'index.html?set='+encodeURIComponent(id);}
function words(content){return content.paragraphs.map(p=>p.text).join(' ').trim().split(/\s+/).length;}
function types(content){const labels={tfng:'判断题（TRUE / FALSE / NOT GIVEN）',choice:'单项选择',text:'原文填空'};return Object.entries(labels).filter(([type])=>content.questions.some(q=>q.type===type)).map(([type,label])=>label+' '+content.questions.filter(q=>q.type===type).length+' 题').join(' · ');}
function instructions(content){const groups=[];for(const q of content.questions.filter(q=>q.type==='text')){const last=groups.at(-1);if(last&&last.words===q.requiredWords&&last.ids.at(-1)+1===q.id)last.ids.push(q.id);else groups.push({words:q.requiredWords,ids:[q.id]});}return '交卷后显示答案、英文证据和中文解析。填空题从文章中选词，'+groups.map(g=>'第 '+g.ids[0]+(g.ids.length>1?'–'+g.ids.at(-1):'')+' 题恰好 '+g.words+' 个词').join('，')+'。只按已列出的答案评分，不自动纠正拼写。';}
root.IELTSPracticeSets={sets,get,href,words,types,instructions};
})(globalThis);
