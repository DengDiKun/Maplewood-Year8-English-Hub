import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RICH_ACTIVITIES} from '../rich-lessons-data.mjs';
import {RICH_CONTENT} from '../rich-lessons-content.mjs';
import {responsePayload,parseResponse} from '../activity-responses.mjs';
import {UNITS,EXTRA_ACTIVITIES,getActivity} from '../learning-catalogue.mjs';
const answers=activity=>Object.fromEntries(activity.questions.map(q=>[q.id,q.options?.[0] || (q.minWords?'word '.repeat(q.minWords).trim():'A supported interpretation.')]));
const normal=s=>s.replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replace(/\s+/g,' ').trim();
test('all remaining authored lesson and reading-practice responses have independent registered identities',()=>{
  assert.equal(RICH_ACTIVITIES.length,8);assert.equal(EXTRA_ACTIVITIES.length,2);
  for(const a of RICH_ACTIVITIES){assert.deepEqual(getActivity(a.id),a);assert.ok(RICH_CONTENT[a.id]);assert.deepEqual(a.questions.map(q=>q.id),Array.from({length:a.questions.length},(_,i)=>'q'+(i+1)));}
  assert.equal(UNITS.length,9);
});
test('the original poem, story, recovered quotations and article material are retained without legacy identity or transport code',async()=>{
  for(const a of RICH_ACTIVITIES){
    const source=await readFile(new URL('../'+a.source,import.meta.url),'utf8'),material=RICH_CONTENT[a.id];
    assert.ok(!/<script\b|\son[a-z]+\s*=|script\.google\.com|localStorage|sessionStorage/.test(material.html));
    assert.ok(material.css.includes(':host'));
    for(const cls of ['poem','story','quote','verse']){
      const chunks=[...source.matchAll(new RegExp('<div class="'+cls+'">([\\s\\S]*?)<\\/div>','g'))];
      for(const chunk of chunks)assert.ok(normal(material.html).includes(normal(chunk[1])),a.id+' retains '+cls);
    }
  }
});
test('all longer responses save, round-trip and enforce complete submissions while allowing partial drafts',()=>{
  for(const a of RICH_ACTIVITIES){
    const complete=answers(a),stamp={toDate:()=>new Date(0)},payload=responsePayload(complete,'submitted',stamp,a.id);
    assert.deepEqual(parseResponse({exists:()=>true,data:()=>payload},a.id).answers,complete);
    const blank=Object.fromEntries(a.questions.map(q=>[q.id,'']));assert.deepEqual(responsePayload(blank,'draft',stamp,a.id).answers,blank);
    assert.throws(()=>responsePayload({...complete,extra:'forged'},'draft',stamp,a.id));
    for(const q of a.questions){
      assert.throws(()=>responsePayload({...complete,[q.id]:'x'.repeat(4001)},'draft',stamp,a.id));
      if(q.required!==false)assert.throws(()=>responsePayload({...complete,[q.id]:''},'submitted',stamp,a.id));
      if(q.options)assert.throws(()=>responsePayload({...complete,[q.id]:'invented choice'},'draft',stamp,a.id));
    }
  }
});
test('pre-learning gates, multiple selections and the 120-word account requirement survive the shared response model',()=>{
  for(const a of RICH_ACTIVITIES){const complete=answers(a);for(const q of a.questions){
    if(q.submitEquals)assert.throws(()=>responsePayload({...complete,[q.id]:q.options.find(v=>v!==q.submitEquals)},'submitted',null,a.id));
    if(q.minSelections)assert.throws(()=>responsePayload({...complete,[q.id]:q.options.find(v=>v.split('\n').length<q.minSelections)},'submitted',null,a.id));
    if(q.minWords){assert.throws(()=>responsePayload({...complete,[q.id]:'word '.repeat(q.minWords-1).trim()},'submitted',null,a.id));assert.doesNotThrow(()=>responsePayload({...complete,[q.id]:'word '.repeat(q.minWords-1).trim()},'draft',null,a.id));}
  }}
});
test('pre-learning and extras remain distinct from saved lesson answers and have no identity or tracking storage',async()=>{
  const pre=await readFile(new URL('../pre-learning.mjs',import.meta.url),'utf8'),games=await readFile(new URL('../learning-games.mjs',import.meta.url),'utf8');
  assert.ok(pre.includes('youtube-nocookie.com'));
  for(const source of [pre,games])assert.ok(!/localStorage|sessionStorage|script\.google\.com|setDoc\(|getDoc\(/.test(source));
});
