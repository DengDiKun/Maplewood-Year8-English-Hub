import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import * as sdk from 'firebase/firestore';
import {responsePayload,QUESTION_IDS,responseDocument} from '../activity-responses.mjs';
import {studentEmail,signInStudent} from '../student-access.mjs';
import {markingRefs,createMarkingClient,parseMarking} from '../marking-data.mjs';
const projectId='demo-maplewood-classes',activityId='writers-effect-v1';
const password='Synthetic-marking-integration-only-123!';
const submittedAt=sdk.Timestamp.fromMillis(1000);
const answers=Object.fromEntries(QUESTION_IDS.map(id=>[id,'Synthetic evidence and explanation.']));
const scope=(studentId='own')=>({classId:'daisy',studentId,activityId});
let environment,teacherApp,studentApp,teacherAuth,studentAuth,teacherDb,studentDb,teacherUid,studentUid;
const context=uid=>uid?environment.authenticatedContext(uid).firestore():environment.unauthenticatedContext().firestore();
const refs=(db,studentId='own')=>markingRefs(sdk,db,scope(studentId));
const marking=(overrides={})=>({version:1,score:7,maxScore:10,feedback:'Synthetic feedback.',reviewerUid:teacherUid,updatedAt:sdk.serverTimestamp(),submissionUpdatedAt:submittedAt,...overrides});
const adminChange=(path,data)=>environment.withSecurityRulesDisabled(c=>sdk.updateDoc(sdk.doc(c.firestore(),...path),data));
before(async()=>{
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  await environment.clearFirestore();
  const make=name=>{
    const app=initializeApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},name);
    const auth=initializeAuth(app,{persistence:inMemoryPersistence});
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    const db=sdk.getFirestore(app);sdk.connectFirestoreEmulator(db,'127.0.0.1',8080);
    return {app,auth,db};
  };
  const teacher=make('marking-teacher'),student=make('marking-student');
  teacherApp=teacher.app;teacherAuth=teacher.auth;teacherDb=teacher.db;
  studentApp=student.app;studentAuth=student.auth;studentDb=student.db;
  teacherUid=(await createUserWithEmailAndPassword(teacherAuth,'synthetic-marking-teacher@example.invalid',password)).user.uid;
  studentUid=(await createUserWithEmailAndPassword(studentAuth,studentEmail('MarkingLearner'),password)).user.uid;
  await signOut(studentAuth);
  await environment.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await sdk.setDoc(sdk.doc(db,'classes','daisy'),{name:'8 Daisy',active:true,teacherUids:[teacherUid]});
    for(const [uid,data] of Object.entries({
      [teacherUid]:{role:'teacher',active:true},admin:{role:'admin',active:true},
      unassigned:{role:'teacher',active:true},disabled:{role:'teacher',active:false},
      owner:{role:'student',active:true,classId:'daisy',studentId:'own'},
      otherStudent:{role:'student',active:true,classId:'daisy',studentId:'other'},
      [studentUid]:{displayName:'Synthetic Learner',username:'MarkingLearner',role:'student',active:true,classId:'daisy',studentId:'live',className:'8 Daisy',branch:'TM',yearGroup:8,academicYear:2026}
    }))await sdk.setDoc(sdk.doc(db,'users',uid),data);
    for(const [id,authUid,status] of [['own','owner','submitted'],['other','otherStudent','submitted'],['unfinished','unfinished','draft'],['live',studentUid,'draft']]){
      await sdk.setDoc(sdk.doc(db,'classes','daisy','students',id),{displayName:'Synthetic '+id,active:true,authUid});
      await sdk.setDoc(responseDocument(sdk,db,'daisy',id),{...responsePayload(answers,status,submittedAt)});
    }
  });
});
after(async()=>{if(teacherApp)await deleteApp(teacherApp);if(studentApp)await deleteApp(studentApp);await environment?.cleanup();});
test('only assigned staff can save marking drafts; students cannot read or write those drafts',async()=>{
  await assertSucceeds(sdk.setDoc(refs(context(teacherUid)).draft,marking()));
  await assertSucceeds(sdk.getDocFromServer(refs(context(teacherUid)).draft));
  await assertSucceeds(sdk.getDocFromServer(refs(context('admin')).draft));
  await assertSucceeds(sdk.setDoc(refs(context('admin')).draft,marking({reviewerUid:'admin'})));
  for(const uid of [null,'owner','otherStudent','unassigned','disabled']){
    const db=context(uid);
    await assertFails(sdk.getDocFromServer(refs(db).draft));
    await assertFails(sdk.setDoc(refs(db).draft,marking({reviewerUid:uid??'anonymous'})));
  }
  const missing=await assertSucceeds(sdk.getDocFromServer(refs(context('owner')).published));
  assert.equal(missing.exists(),false);
  await assertFails(sdk.setDoc(refs(context(teacherUid),'unfinished').draft,marking()));
  await assertFails(sdk.setDoc(refs(context(teacherUid),'missing').published,marking()));
});
test('published marks are visible only to the linked student and authorized staff, and cannot be listed or deleted',async()=>{
  await assertSucceeds(sdk.setDoc(refs(context(teacherUid)).published,marking()));
  for(const uid of ['owner',teacherUid,'admin'])await assertSucceeds(sdk.getDocFromServer(refs(context(uid)).published));
  for(const uid of [null,'otherStudent','unassigned','disabled']){
    await assertFails(sdk.getDocFromServer(refs(context(uid)).published));
    await assertFails(sdk.setDoc(refs(context(uid)).published,marking({reviewerUid:uid??'anonymous'})));
  }
  await assertFails(sdk.setDoc(refs(context('owner')).published,marking({reviewerUid:'owner',score:10})));
  await assertFails(sdk.getDocFromServer(refs(environment.authenticatedContext('otherStudent',{role:'admin'}).firestore()).published));
  for(const uid of ['owner',teacherUid,'admin']){
    for(const kind of ['markingDrafts','feedback']){
      await assertFails(sdk.getDocsFromServer(sdk.collection(context(uid),'classes','daisy','students','own',kind)));
      await assertFails(sdk.deleteDoc(sdk.doc(context(uid),'classes','daisy','students','own',kind,activityId)));
    }
  }
});
test('marking validation rejects forged attribution, invalid marks, hidden fields and stale submissions',async()=>{
  const ref=refs(context(teacherUid)).published;
  for(const invalid of [
    {score:-1},{score:11},{score:1.5},{score:'7'},{maxScore:0},{maxScore:1001},
    {feedback:'x'.repeat(4001)},{feedback:3},{reviewerUid:'admin'},{version:2},
    {updatedAt:sdk.Timestamp.fromMillis(0)},{submissionUpdatedAt:sdk.Timestamp.fromMillis(2)},
    {privateNote:'must not reach the student'},{role:'admin'}
  ])await assertFails(sdk.setDoc(ref,marking(invalid)));
  const incomplete=marking();delete incomplete.feedback;
  await assertFails(sdk.setDoc(ref,incomplete));
  await assertSucceeds(sdk.setDoc(ref,marking({score:0,maxScore:1,feedback:''})));
});
test('changing enrollment, assignment or account state revokes the next grading or student feedback request',async()=>{
  for(const [path,change,restore] of [
    [['classes','daisy'],{teacherUids:[]},{teacherUids:[teacherUid]}],
    [['users',teacherUid],{active:false},{active:true}],
    [['classes','daisy'],{active:false},{active:true}]
  ]){
    await adminChange(path,change);
    try{
      await assertFails(sdk.getDocFromServer(refs(context(teacherUid)).published));
      await assertFails(sdk.setDoc(refs(context(teacherUid)).published,marking()));
      await assertSucceeds(sdk.getDocFromServer(refs(context('admin')).published));
    }finally{await adminChange(path,restore);}
  }
  for(const [path,change,restore] of [
    [['users','owner'],{active:false},{active:true}],
    [['classes','daisy'],{active:false},{active:true}],
    [['classes','daisy','students','own'],{active:false},{active:true}],
    [['classes','daisy','students','own'],{authUid:'changed'},{authUid:'owner'}],
    [['users','owner'],{studentId:'other'},{studentId:'own'}],
    [['classes','daisy','students','own','responses',activityId],{updatedAt:sdk.Timestamp.fromMillis(3)},{updatedAt:submittedAt}]
  ]){
    await adminChange(path,change);
    try{await assertFails(sdk.getDocFromServer(refs(context('owner')).published));}
    finally{await adminChange(path,restore);}
  }
});
test('production SDK flow submits, saves a private review, publishes, rejects a stale editor and retains published feedback during private edits',async()=>{
  const client={signIn:(email,pw)=>signInWithEmailAndPassword(studentAuth,email,pw),loadProfile:id=>sdk.getDocFromServer(sdk.doc(studentDb,'users',id)),signOut:()=>signOut(studentAuth)};
  const profile=await signInStudent(client,'MarkingLearner',password);
  const liveScope=scope(profile.studentId),studentRefs=markingRefs(sdk,studentDb,liveScope);
  await sdk.setDoc(studentRefs.response,responsePayload(answers,'submitted',sdk.serverTimestamp()));
  const submissionUpdatedAt=(await sdk.getDocFromServer(studentRefs.response)).data().updatedAt;
  const teacher=createMarkingClient(sdk,teacherDb,()=>teacherAuth.currentUser?.uid);
  const first=await teacher.load(liveScope,submissionUpdatedAt);
  const values={score:8,maxScore:10,feedback:'Synthetic teacher comment <img src=x onerror=alert(1)>'};
  await teacher.save(liveScope,{values,publish:false,expected:first.versions,submissionUpdatedAt});
  assert.equal((await sdk.getDocFromServer(studentRefs.published)).exists(),false);
  await assertFails(sdk.getDocFromServer(studentRefs.draft));
  const ready=await teacher.load(liveScope,submissionUpdatedAt);
  assert.equal(ready.draft.score,8);
  await teacher.save(liveScope,{values,publish:true,expected:ready.versions,submissionUpdatedAt});
  const published=parseMarking(await sdk.getDocFromServer(studentRefs.published),submissionUpdatedAt);
  assert.equal(published.score,8);assert.equal(published.feedback,values.feedback);
  await assert.rejects(teacher.save(liveScope,{values:{...values,score:3},publish:true,expected:ready.versions,submissionUpdatedAt}),{code:'marking/conflict'});
  const edit=await teacher.load(liveScope,submissionUpdatedAt);
  await teacher.save(liveScope,{values:{...values,score:9},publish:false,expected:edit.versions,submissionUpdatedAt});
  assert.equal(parseMarking(await sdk.getDocFromServer(studentRefs.published),submissionUpdatedAt).score,8);
  await assertFails(sdk.setDoc(studentRefs.response,responsePayload(answers,'draft',sdk.serverTimestamp())));
  await signOut(studentAuth);
  await assertFails(sdk.getDocFromServer(studentRefs.published));
});
