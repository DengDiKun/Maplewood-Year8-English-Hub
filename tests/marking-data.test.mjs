import test from 'node:test';
import assert from 'node:assert/strict';
import {markingRefs,markValues,stampKey,parseMarking,createMarkingClient,markingError} from '../marking-data.mjs';
const stamp=(seconds=1)=>({seconds,nanoseconds:0,toDate:()=>new Date(seconds*1000)});
const snapshot=data=>({exists:()=>data!==null,data:()=>data});
const scope={classId:'daisy',studentId:'learner',activityId:'writers-effect-v1'};
const marks={score:8,maxScore:10,feedback:'Evidence selected well. Explain the effect further.'};
const record=(time=2)=>({version:1,...marks,reviewerUid:'teacher',submissionUpdatedAt:stamp(),updatedAt:stamp(time)});
test('marking paths support every unit and keep drafts separate from student feedback',()=>{
  const sdk={doc:(_, ...path)=>path.join('/')};
  for(const unit of [1,6,9]){
    const refs=markingRefs(sdk,{}, {...scope,activityId:'unit-'+unit+'-reading'});
    assert.match(refs.draft,/markingDrafts\/unit-/);assert.match(refs.published,/feedback\/unit-/);
    assert.match(refs.response,/responses\/unit-/);
  }
  for(const field of ['classId','studentId','activityId'])for(const bad of ['',null,'a/b']){
    assert.throws(()=>markingRefs(sdk,{}, {...scope,[field]:bad}));
  }
});
test('marks require bounded whole numbers and expose only the editable grading fields',()=>{
  assert.deepEqual(markValues(0,1,''),{score:0,maxScore:1,feedback:''});
  assert.deepEqual(markValues(1000,1000,'x'),{score:1000,maxScore:1000,feedback:'x'});
  for(const [score,total] of [[-1,10],[11,10],[1.5,10],[1,0],[1,1001],[NaN,10],['1',10],[1,Infinity]]){
    assert.throws(()=>markValues(score,total,'x'));
  }
  assert.throws(()=>markValues(1,10,'x'.repeat(4001)));
  assert.throws(()=>markValues(1,10,null));
});
test('published feedback parsing checks submission identity and excludes staff identity or extra data',()=>{
  assert.equal(parseMarking(snapshot(null),stamp()),null);
  const parsed=parseMarking(snapshot({...record(),privateNote:'secret'}),stamp());
  assert.equal(parsed.score,8);assert.equal(parsed.privateNote,undefined);assert.equal(parsed.reviewerUid,undefined);
  assert.throws(()=>parseMarking(snapshot(record()),stamp(3)));
  assert.throws(()=>parseMarking(snapshot({...record(),score:11}),stamp()));
  assert.throws(()=>stampKey({seconds:1,nanoseconds:-1}));
});
function harness(initial={}) {
  let uid='teacher';
  const data=new Map(Object.entries(initial)), writes=[];
  const sdk={doc:(_, ...path)=>path.join('/'),getDocFromServer:async ref=>snapshot(data.get(ref)??null),
    serverTimestamp:()=>stamp(99),runTransaction:async(_,fn)=>{
      const staged=[];await fn({get:async ref=>snapshot(data.get(ref)??null),set:(ref,value)=>staged.push([ref,value])});
      for(const item of staged){writes.push(item);data.set(...item);}
    }};
  const refs=markingRefs(sdk,{},scope);
  data.set(refs.response,{status:'submitted',updatedAt:stamp()});
  return {client:createMarkingClient(sdk,{},()=>uid),refs,data,writes,uid:value=>{uid=value;}};
}
test('saving a marking draft does not publish, and publishing records the verified staff UID',async()=>{
  const h=harness();const state=await h.client.load(scope,stamp());
  await h.client.save(scope,{values:marks,publish:false,expected:state.versions,submissionUpdatedAt:stamp()});
  assert.equal(h.writes.length,1);assert.equal(h.data.has(h.refs.published),false);
  const loaded=await h.client.load(scope,stamp());
  await h.client.save(scope,{values:marks,publish:true,expected:loaded.versions,submissionUpdatedAt:stamp()});
  assert.equal(h.writes.length,3);
  assert.equal(h.data.get(h.refs.published).reviewerUid,'teacher');
  assert.equal(h.data.get(h.refs.published).score,8);
});
test('concurrent staff edits and changed or unfinished submissions cannot be overwritten',async()=>{
  for(const target of ['draft','published','response']){
    const h=harness(),state=await h.client.load(scope,stamp());
    h.data.set(h.refs[target],target==='response'?{status:'submitted',updatedAt:stamp(5)}:record(4));
    await assert.rejects(h.client.save(scope,{values:marks,publish:true,expected:state.versions,submissionUpdatedAt:stamp()}),{code:'marking/conflict'});
    assert.equal(h.writes.length,0);
  }
  const h=harness();h.data.set(h.refs.response,{status:'draft',updatedAt:stamp()});
  await assert.rejects(h.client.save(scope,{values:marks,publish:true,expected:{draft:null,published:null},submissionUpdatedAt:stamp()}),{code:'marking/conflict'});
  h.uid(null);await assert.rejects(h.client.save(scope,{}),{code:'access/denied'});
});
test('an older published result remains unchanged when a later edit is saved privately',async()=>{
  const h=harness();h.data.set(h.refs.published,record());
  const state=await h.client.load(scope,stamp());
  await h.client.save(scope,{values:{...marks,score:9},publish:false,expected:state.versions,submissionUpdatedAt:stamp()});
  assert.equal(h.data.get(h.refs.published).score,8);
  assert.equal(h.data.get(h.refs.draft).score,9);
});
test('marking error messages help recover without exposing upstream details',()=>{
  assert.match(markingError({code:'marking/conflict'}),/Refresh/);
  assert.match(markingError({code:'permission-denied'}),/access is no longer/);
  assert.ok(!markingError({message:'private details'}).includes('private details'));
});
