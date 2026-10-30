import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_IDS, responseDocument, responsePayload, parseResponse, activityError} from '../activity-responses.mjs';
const answers = () => Object.fromEntries(QUESTION_IDS.map(id => [id, 'A multiline answer\nwith evidence.']));
test('response path uses the selected linked enrollment and fixed lesson only', () => {
  assert.deepEqual(responseDocument({doc:(...args)=>args},'db','class','student'),
    ['db','classes','class','students','student','responses','writers-effect-v1']);
  for (const id of [null,'','  ','a/b']) assert.throws(() => responseDocument({doc(){}},'db',id,'student'));
});
test('drafts allow empty answers but submissions require every bounded text answer', () => {
  const a=answers(); a.q1='';
  assert.equal(responsePayload(a,'draft','time').answers.q1,'');
  assert.throws(() => responsePayload(a,'submitted',null));
  a.q1=' \n\t '; assert.throws(() => responsePayload(a,'submitted',null));
  a.q1='x'.repeat(4001); assert.throws(() => responsePayload(a,'draft',null));
  a.q1=42; assert.throws(() => responsePayload(a,'draft',null));
  delete a.q1; assert.throws(() => responsePayload(a,'draft',null));
  assert.throws(() => responsePayload({...answers(),mark:10},'draft',null));
  assert.throws(() => responsePayload(answers(),'graded',null));
});
test('payload contains responses only, never a score or a client identity', () => {
  const a=answers(), data=responsePayload(a,'submitted','timestamp');
  a.q1='mutated'; assert.notEqual(data.answers.q1,a.q1);
  assert.deepEqual(Object.keys(data),['version','status','answers','updatedAt']);
});
test('server response parsing handles missing work, validates schema and retains safe answer strings', () => {
  assert.equal(parseResponse({exists:()=>false}),null);
  const data={...responsePayload(answers(),'submitted',{toDate:()=>new Date(0)}),mark:100};
  const result=parseResponse({exists:()=>true,data:()=>data});
  assert.equal(result.date.getTime(),0); assert.equal(result.mark,undefined);
  data.version=2; assert.throws(()=>parseResponse({exists:()=>true,data:()=>data}));
});
test('save errors do not expose raw server details or claim a save succeeded', () => {
  assert.match(activityError({code:'permission-denied'}),/Access is no longer/);
  assert.match(activityError({message:'sensitive'}),/not been confirmed/);
  assert.ok(!activityError({message:'sensitive'}).includes('sensitive'));
});
