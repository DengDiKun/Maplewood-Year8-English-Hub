import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {UNITS,ACTIVITIES,getUnit,getActivity} from '../learning-catalogue.mjs';
import {responseDocument,responsePayload,parseResponse} from '../activity-responses.mjs';

test('all nine units retain the existing curriculum titles, reading lessons, extension prompts and practice checks',async()=>{
  const html=await readFile(new URL('../unit-course.html',import.meta.url),'utf8');
  const original={};
  for(const name of ['U','exactSubunits','strandTasks','quizData']){
    const match=html.match(new RegExp('const '+name+'=([\\s\\S]*?);\\n'));
    original[name]=JSON.parse(JSON.stringify(vm.runInNewContext('('+match[1]+')',Object.create(null),{timeout:1000})));
  }
  assert.deepEqual(UNITS.map(unit=>unit.number),[1,2,3,4,5,6,7,8,9]);
  for(const unit of UNITS){
    const old=original.U[unit.number];
    for(const key of ['title','page','types','writing','speaking','language','video'])assert.deepEqual(unit[key],old[key]);
    assert.deepEqual(unit.readings,original.exactSubunits[unit.number] || old.reading);
    for(const kind of ['writing','speaking','language'])assert.equal(unit.activities.find(a=>a.kind===kind).questions[0].label,original.strandTasks[unit.number][kind]);
    assert.deepEqual(unit.quiz,original.quizData[unit.number]);
  }
});
test('every activity has a unique stable document ID and the original Writer’s Effect identity is retained',()=>{
  assert.equal(ACTIVITIES.length,76);
  assert.equal(new Set(ACTIVITIES.map(a=>a.id)).size,76);
  assert.equal(ACTIVITIES.filter(a=>a.kind==='reading').length,47);
  assert.equal(getActivity('writers-effect-v1').questions.length,11);
  assert.equal(getUnit(6).activities[0].id,'writers-effect-v1');
  for(const activity of ACTIVITIES){
    assert.equal(getActivity(activity.id),activity);
    assert.match(activity.id,/^[a-z0-9-]{1,64}$/);
    assert.equal(responseDocument({doc:(_, ...path)=>path},null,'class','student',activity.id).at(-1),activity.id);
  }
  assert.equal(getActivity('unit-7-reading-4-v1'),undefined);
  for(const id of ['unit-10-writing-v1','unit-1-reading-0-v1','arbitrary','../writers-effect-v1'])assert.throws(()=>responseDocument({doc(){}},null,'class','student',id));
  assert.throws(()=>{getActivity('unit-1-writing-v1').questions[0].label='changed';},TypeError);
});
test('each activity accepts exactly its own answers, with bounded drafts and complete submissions',()=>{
  for(const activity of ACTIVITIES){
    const answers=Object.fromEntries(activity.questions.map(q=>[q.id,q.options?.[0] || 'A supported response.']));
    const payload=responsePayload(answers,'submitted',{toDate:()=>new Date(0)},activity.id);
    assert.deepEqual(parseResponse({exists:()=>true,data:()=>payload},activity.id).answers,answers);
    assert.throws(()=>responsePayload({...answers,extra:'not allowed'},'draft',null,activity.id));
    assert.throws(()=>responsePayload({...answers,q1:'x'.repeat(4001)},'draft',null,activity.id));
    assert.throws(()=>responsePayload({...answers,q1:' \n '},'submitted',null,activity.id));
    assert.equal(responsePayload({...answers,q1:''},'draft',null,activity.id).answers.q1,'');
  }
  const previous=Object.fromEntries(Array.from({length:11},(_,i)=>['q'+(i+1),'Existing saved answer '+(i+1)]));
  assert.deepEqual(responsePayload(previous,'draft','timestamp').answers,previous);
});
