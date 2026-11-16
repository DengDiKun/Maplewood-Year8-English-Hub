import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MERCHANT_ACTIVITY,MERCHANT_CLAIMS,MERCHANT_EVIDENCE} from '../merchant-data.mjs';
import {MERCHANT_MARKUP,MERCHANT_CSS} from '../merchant-content.mjs';
import {getUnit,getActivity} from '../learning-catalogue.mjs';
import {responsePayload,parseResponse} from '../activity-responses.mjs';
const complete=()=>Object.fromEntries(MERCHANT_ACTIVITY.questions.map(q=>[q.id,q.options?.[0] || 'An explanation supported by the extract.']));
test('the new lesson retains all three original extracts, riddles, question choices, artwork and five pages',async()=>{
  const original=await readFile(new URL('../unit8-1-core.html',import.meta.url),'utf8');
  const blocks=(html,cls)=>[...html.matchAll(new RegExp('<div class="'+cls+'">([\\s\\S]*?)<\\/div>','g'))].map(m=>m[1]);
  assert.equal(blocks(original,'verse').length,3);
  assert.deepEqual(blocks(MERCHANT_MARKUP,'verse'),blocks(original,'verse'));
  assert.deepEqual(blocks(MERCHANT_MARKUP,'scroll gold'),blocks(original,'scroll gold'));
  for(const [name,values] of [['data-claim',MERCHANT_CLAIMS],['data-e',MERCHANT_EVIDENCE]]){
    for(const value of values)assert.ok(MERCHANT_MARKUP.includes(name+'="'+value.key+'"'));
  }
  assert.equal((MERCHANT_MARKUP.match(/data-page=/g)||[]).length,5);
  assert.equal((MERCHANT_MARKUP.match(/<select /g)||[]).length,6);
  assert.equal((MERCHANT_MARKUP.match(/<textarea /g)||[]).length,3);
  assert.ok(MERCHANT_MARKUP.includes('<svg'));
  assert.ok(!/<script\b|on(?:click|load)=|localStorage|sessionStorage|script.google.com/.test(MERCHANT_MARKUP));
  assert.ok(MERCHANT_CSS.includes(':host{'));
});
test('the interactive lesson is added to Unit 8 alongside the existing saved course response',()=>{
  assert.equal(getUnit(8).activities[0].id,'unit-8-merchant-v1');
  assert.ok(getActivity('unit-8-reading-1-v1'));
  assert.equal(getActivity('unit-8-merchant-v1').questions.length,12);
  assert.deepEqual(Object.keys(responsePayload(complete(),'draft','stamp','unit-8-merchant-v1').answers),Array.from({length:12},(_,i)=>'q'+(i+1)));
});
test('all choices and written answers round-trip; empty drafts are allowed and incomplete or invented choices cannot be submitted',()=>{
  const answers=complete(),time={toDate:()=>new Date(0)};
  const payload=responsePayload(answers,'submitted',time,'unit-8-merchant-v1');
  assert.deepEqual(parseResponse({exists:()=>true,data:()=>payload},'unit-8-merchant-v1').answers,answers);
  const blank=Object.fromEntries(Object.keys(answers).map(id=>[id,'']));
  assert.deepEqual(responsePayload(blank,'draft',time,'unit-8-merchant-v1').answers,blank);
  for(const id of Object.keys(answers))assert.throws(()=>responsePayload({...answers,[id]:''},'submitted',time,'unit-8-merchant-v1'));
  for(const question of MERCHANT_ACTIVITY.questions.filter(q=>q.options))assert.throws(()=>responsePayload({...answers,[question.id]:'invented option'},'draft',time,'unit-8-merchant-v1'));
  assert.throws(()=>responsePayload({...answers,score:100},'draft',time,'unit-8-merchant-v1'));
});
