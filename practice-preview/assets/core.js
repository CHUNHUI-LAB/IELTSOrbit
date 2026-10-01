(function(root){
'use strict';
const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
function grade(q,value){const n=normalize(value);if(!n)return {correct:false,reason:'未作答'};if(q.requiredWords && n.split(' ').length!==q.requiredWords)return {correct:false,reason:'词数不符合要求'};if(q.maxWords && n.split(' ').length>q.maxWords)return {correct:false,reason:'超过词数限制'};const correct=q.answers.some(a=>normalize(a)===n);return {correct,reason:correct?'正确':q.errorTag};}
function create(content,mode,now=Date.now(),ids=content.questions.map(q=>q.id)){return {id:now+'-'+Math.random().toString(36).slice(2),contentId:content.id,version:content.version,mode,status:'active',startedAt:now,deadline:now+content.durationSeconds*1000,remaining:content.durationSeconds*1000,ids,answers:{},flags:{},result:null};}
function remaining(s,now=Date.now()){return s.status==='paused'?s.remaining:Math.max(0,Math.min(s.remaining,s.deadline-now));}
function pause(s,now=Date.now()){if(s.mode!=='practice'||s.status!=='active')return false;s.remaining=remaining(s,now);s.status='paused';return true;}
function resume(s,now=Date.now()){if(s.status!=='paused')return false;s.deadline=now+s.remaining;s.status='active';return true;}
function submit(s,content,now=Date.now()){if(s.result)return s.result;const rows=content.questions.filter(q=>s.ids.includes(q.id)).map(q=>({id:q.id,value:s.answers[q.id]||'',...grade(q,s.answers[q.id])}));const left=remaining(s,now);s.result={attemptId:s.id,completedAt:now,score:rows.filter(r=>r.correct).length,total:rows.length,unanswered:rows.filter(r=>!normalize(r.value)).length,elapsedSeconds:Math.round((content.durationSeconds*1000-left)/1000),rows};s.remaining=left;s.deadline=now+left;s.status='submitted';return s.result;}
function storage(store,key){return {load(){try{return {ok:true,data:JSON.parse(store.getItem(key)||'null')};}catch{return {ok:false,data:null};}},save(v){try{store.setItem(key,JSON.stringify(v));return true;}catch{return false;}},clear(){try{store.removeItem(key);return true;}catch{return false;}}};}
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function valid(s,c){
 if(!record(s)||s.contentId!==c.id||s.version!==c.version||typeof s.id!=='string'||!s.id||!['active','paused','submitted'].includes(s.status)||!['practice','timed'].includes(s.mode))return false;
 if(s.status==='paused'&&s.mode!=='practice')return false;
 if(!finite(s.startedAt)||s.startedAt<0||!finite(s.deadline)||s.deadline<s.startedAt||!finite(s.remaining)||s.remaining<0||s.remaining>c.durationSeconds*1000)return false;
 if(!Array.isArray(s.ids)||!s.ids.length||new Set(s.ids).size!==s.ids.length||!s.ids.every(id=>Number.isInteger(id)&&c.questions.some(q=>q.id===id)))return false;
 if(!record(s.answers)||!record(s.flags))return false;
 const allowed=new Set(s.ids.map(String));
 if(!Object.entries(s.answers).every(([id,value])=>allowed.has(id)&&typeof value==='string')||!Object.entries(s.flags).every(([id,value])=>allowed.has(id)&&typeof value==='boolean'))return false;
 if(s.status!=='submitted')return s.result===null;
 const r=s.result;
 if(!record(r)||r.attemptId!==s.id||!finite(r.completedAt)||r.completedAt<s.startedAt||!Number.isInteger(r.score)||r.score<0||r.score>s.ids.length||r.total!==s.ids.length||!Number.isInteger(r.unanswered)||r.unanswered<0||r.unanswered>r.total||!Number.isInteger(r.elapsedSeconds)||r.elapsedSeconds<0||r.elapsedSeconds>c.durationSeconds)return false;
 if(!Array.isArray(r.rows)||r.rows.length!==s.ids.length)return false;
 const seen=new Set();
 return r.rows.every(row=>{if(!record(row)||!s.ids.includes(row.id)||seen.has(row.id)||typeof row.value!=='string'||typeof row.correct!=='boolean'||typeof row.reason!=='string')return false;seen.add(row.id);return true;});
}
function restore(s,c){
 if(!valid(s,c))return null;
 const copy=JSON.parse(JSON.stringify(s));
 if(copy.status==='submitted'){
  const completedAt=copy.result.completedAt;
  copy.result=null;copy.status='active';
  // Rebuild score and review from validated answers, never trust stored marks.
  submit(copy,c,completedAt);
 }
 return copy;
}
const api={normalize,grade,create,remaining,pause,resume,submit,storage,valid,restore};root.IELTSCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
