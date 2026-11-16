import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import {ACTIVITIES,getUnit} from '../learning-catalogue.mjs';
import {responseDocument,responsePayload,parseResponse} from '../activity-responses.mjs';
import {createMarkingClient,markingRefs,parseMarking} from '../marking-data.mjs';
let environment;
const projectId='demo-maplewood-classes';
const context=uid=>uid?environment.authenticatedContext(uid).firestore():environment.unauthenticatedContext().firestore();
const ref=(db,id,studentId='own')=>responseDocument(sdk,db,'daisy',studentId,id);
const answers=activity=>Object.fromEntries(activity.questions.map(q=>[q.id,q.options?.[0] || 'Synthetic evidence for '+activity.id]));
before(async()=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await sdk.setDoc(sdk.doc(db,'classes','daisy'),{name:'8 Daisy',active:true,teacherUids:['teacher']});
    for(const [uid,data] of Object.entries({owner:{role:'student',active:true,classId:'daisy',studentId:'own'},other:{role:'student',active:true,classId:'daisy',studentId:'other'},teacher:{role:'teacher',active:true},unassigned:{role:'teacher',active:true},admin:{role:'admin',active:true}}))await sdk.setDoc(sdk.doc(db,'users',uid),data);
    for(const id of ['own','other'])await sdk.setDoc(sdk.doc(db,'classes','daisy','students',id),{displayName:'Synthetic '+id,active:true,authUid:id==='own'?'owner':'other'});
  });
});
after(async()=>{await environment?.cleanup();});
test('all registered activities save and reopen independently, retaining the original eleven-answer activity',async()=>{
  const db=context('owner');
  for(const activity of ACTIVITIES){
    const data=responsePayload(answers(activity),'draft',sdk.serverTimestamp(),activity.id);
    await assertSucceeds(sdk.setDoc(ref(db,activity.id),data));
    const loaded=parseResponse(await sdk.getDocFromServer(ref(db,activity.id)),activity.id);
    assert.deepEqual(loaded.answers,answers(activity));
  }
  const first=await sdk.getDocFromServer(ref(db,'unit-1-writing-v1'));
  const ninth=await sdk.getDocFromServer(ref(db,'unit-9-writing-v1'));
  assert.notEqual(first.data().answers.q1,ninth.data().answers.q1);
  assert.equal(Object.keys((await sdk.getDocFromServer(ref(db,'writers-effect-v1'))).data().answers).length,11);
});
test('new activity drafts reject forged fields, missing answers, non-text values and incomplete final submissions',async()=>{
  const db=context('owner');
  for(const id of ['unit-1-writing-v1','unit-5-reading-1-v1','unit-9-language-v1']){
    const activity=ACTIVITIES.find(a=>a.id===id),value=responsePayload(answers(activity),'draft',sdk.serverTimestamp(),id);
    for(const invalid of [{...value,score:100},{...value,studentId:'other'},{...value,version:2},
      {...value,answers:{}},{...value,answers:{...value.answers,q1:12}},
      {...value,answers:{...value.answers,q1:'x'.repeat(4001)}},
      {...value,status:'submitted',answers:{...value.answers,q1:' \n\t '}}])await assertFails(sdk.setDoc(ref(db,id),invalid));
  }
});
test('every registered activity validates answer shape, permits a complete submission and locks it afterwards',async()=>{
  const db=context('owner');
  for(const activity of ACTIVITIES){
    const value=responsePayload(answers(activity),'submitted',sdk.serverTimestamp(),activity.id);
    await assertFails(sdk.setDoc(ref(db,activity.id),{...value,answers:{...value.answers,extra:'forged'}}));
    await assertSucceeds(sdk.setDoc(ref(db,activity.id),value));
    await assertFails(sdk.setDoc(ref(db,activity.id),responsePayload(answers(activity),'draft',sdk.serverTimestamp(),activity.id)));
  }
});
test('unknown IDs, additional answers, forged scores and cross-student access stay denied',async()=>{
  const db=context('owner');
  for(const id of ['unit-7-reading-4-v1','unit-8-reading-6-v1','unit-9-reading-6-v1','unit-0-writing-v1','unit-10-speaking-v1','unit-1-writing-v2','unregistered']){
    const path=sdk.doc(db,'classes','daisy','students','own','responses',id);
    await assertFails(sdk.getDocFromServer(path));
    await assertFails(sdk.setDoc(path,{version:1,status:'draft',answers:{q1:'forged'},updatedAt:sdk.serverTimestamp()}));
  }
  for(const uid of [null,'other','unassigned'])for(const unit of [1,5,9])await assertFails(sdk.getDocFromServer(ref(context(uid),getUnit(unit).activities[0].id)));
  for(const unit of [1,5,9]){
    const id=getUnit(unit).activities[0].id;
    await assertFails(sdk.setDoc(ref(db,id,'other'),{version:1,status:'draft',answers:{q1:'forged'},score:100,updatedAt:sdk.serverTimestamp()}));
    await assertSucceeds(sdk.getDocFromServer(ref(context('teacher'),id)));
    await assertFails(sdk.deleteDoc(ref(context('admin'),id)));
  }
  await assertFails(sdk.getDocsFromServer(sdk.collection(db,'classes','daisy','students','own','responses')));
});
test('the production marking client publishes feedback for each unit without leaking private drafts or overwriting another activity',async()=>{
  const teacher=createMarkingClient(sdk,context('teacher'),()=>'teacher');
  for(let number=1;number<=9;number++){
    const activity=getUnit(number).activities.find(a=>a.kind==='writing'),scope={classId:'daisy',studentId:'own',activityId:activity.id};
    const submissionUpdatedAt=(await sdk.getDocFromServer(ref(context('teacher'),activity.id))).data().updatedAt;
    const initial=await teacher.load(scope,submissionUpdatedAt),values={score:number,maxScore:10,feedback:'Synthetic unit '+number+' feedback'};
    await teacher.save(scope,{values,publish:false,expected:initial.versions,submissionUpdatedAt});
    const studentRefs=markingRefs(sdk,context('owner'),scope);
    assert.equal((await sdk.getDocFromServer(studentRefs.published)).exists(),false);
    await assertFails(sdk.getDocFromServer(studentRefs.draft));
    const draft=await teacher.load(scope,submissionUpdatedAt);
    await teacher.save(scope,{values,publish:true,expected:draft.versions,submissionUpdatedAt});
    const published=parseMarking(await sdk.getDocFromServer(studentRefs.published),submissionUpdatedAt);
    assert.equal(published.score,number);assert.equal(published.feedback,values.feedback);
    await assertFails(sdk.getDocFromServer(markingRefs(sdk,context('other'),scope).published));
  }
});
test('revoking enrollment or assignment denies the next request for the new unit activities',async()=>{
  const change=(path,value)=>environment.withSecurityRulesDisabled(c=>sdk.updateDoc(sdk.doc(c.firestore(),...path),value));
  await change(['classes','daisy','students','own'],{active:false});
  await assertFails(sdk.getDocFromServer(ref(context('owner'),'unit-9-writing-v1')));
  await change(['classes','daisy','students','own'],{active:true});
  await change(['classes','daisy'],{teacherUids:[]});
  await assertFails(sdk.getDocFromServer(ref(context('teacher'),'unit-1-writing-v1')));
  await assertSucceeds(sdk.getDocFromServer(ref(context('admin'),'unit-1-writing-v1')));
});
