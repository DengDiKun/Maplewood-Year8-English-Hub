import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import * as sdk from 'firebase/firestore';
import {MERCHANT_ACTIVITY} from '../merchant-data.mjs';
import {responseDocument,responsePayload,parseResponse} from '../activity-responses.mjs';
import {studentEmail,signInStudent} from '../student-access.mjs';
import {markingRefs,createMarkingClient,parseMarking} from '../marking-data.mjs';
const projectId='demo-maplewood-classes',activityId='unit-8-merchant-v1';
const password='Synthetic-merchant-integration-only-123!';
const complete=()=>Object.fromEntries(MERCHANT_ACTIVITY.questions.map(q=>[q.id,q.options?.[0] || 'An explanation supported by the extract.']));
let environment,student,teacher,studentUid,teacherUid;
const context=uid=>uid?environment.authenticatedContext(uid).firestore():environment.unauthenticatedContext().firestore();
const ref=(db,studentId='own')=>responseDocument(sdk,db,'daisy',studentId,activityId);
const scope={classId:'daisy',studentId:'own',activityId};
before(async()=>{
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  await environment.clearFirestore();
  const make=name=>{const app=initializeApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},name),auth=initializeAuth(app,{persistence:inMemoryPersistence});connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const db=sdk.getFirestore(app);sdk.connectFirestoreEmulator(db,'127.0.0.1',8080);return {app,auth,db};};
  student=make('merchant-student');teacher=make('merchant-teacher');
  studentUid=(await createUserWithEmailAndPassword(student.auth,studentEmail('MerchantLearner'),password)).user.uid;
  teacherUid=(await createUserWithEmailAndPassword(teacher.auth,'synthetic-merchant-teacher@example.invalid',password)).user.uid;
  await signOut(student.auth);
  await environment.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await sdk.setDoc(sdk.doc(db,'classes','daisy'),{name:'8 Daisy',active:true,teacherUids:[teacherUid]});
    await sdk.setDoc(sdk.doc(db,'classes','daisy','students','own'),{displayName:'Synthetic Merchant Learner',active:true,authUid:studentUid});
    await sdk.setDoc(sdk.doc(db,'classes','daisy','students','other'),{displayName:'Synthetic Other Learner',active:true,authUid:'other'});
    await sdk.setDoc(sdk.doc(db,'users',studentUid),{displayName:'Synthetic Merchant Learner',username:'MerchantLearner',role:'student',active:true,classId:'daisy',studentId:'own',className:'8 Daisy',branch:'TM',yearGroup:8,academicYear:2026});
    for(const [id,data] of Object.entries({[teacherUid]:{role:'teacher',active:true},unassigned:{role:'teacher',active:true},admin:{role:'admin',active:true},other:{role:'student',active:true,classId:'daisy',studentId:'other'}}))await sdk.setDoc(sdk.doc(db,'users',id),data);
  });
});
after(async()=>{if(student)await deleteApp(student.app);if(teacher)await deleteApp(teacher.app);await environment?.cleanup();});
const studentClient=()=>({signIn:(email,pw)=>signInWithEmailAndPassword(student.auth,email,pw),loadProfile:uid=>sdk.getDocFromServer(sdk.doc(student.db,'users',uid)),signOut:()=>signOut(student.auth)});
test('a real student SDK session saves a partial lesson draft and restores all twelve fields after a fresh sign-in',async()=>{
  const profile=await signInStudent(studentClient(),'MerchantLearner',password);assert.equal(profile.uid,studentUid);
  const answers=complete();answers.q7='';answers.q10='';
  await sdk.setDoc(ref(student.db),responsePayload(answers,'draft',sdk.serverTimestamp(),activityId));
  await signOut(student.auth);await signInStudent(studentClient(),'MerchantLearner',password);
  const loaded=parseResponse(await sdk.getDocFromServer(ref(student.db)),activityId);
  assert.equal(loaded.status,'draft');assert.deepEqual(loaded.answers,answers);
  await assertSucceeds(sdk.getDocFromServer(ref(context(teacherUid))));
});
test('server rules reject missing fields, unknown choice values, oversized text and client grades while allowing edits to a draft',async()=>{
  const base=responsePayload(complete(),'draft',sdk.serverTimestamp(),activityId);
  for(const question of MERCHANT_ACTIVITY.questions.filter(q=>q.options))await assertFails(sdk.setDoc(ref(student.db),{...base,answers:{...base.answers,[question.id]:'invented choice'}}));
  for(const invalid of [{...base,answers:{q1:base.answers.q1}},{...base,score:100},
    {...base,answers:{...base.answers,extra:'forged'}},
    {...base,answers:{...base.answers,q7:'x'.repeat(4001)}},
    {...base,status:'submitted',answers:{...base.answers,q11:' \n\t '}}])await assertFails(sdk.setDoc(ref(student.db),invalid));
  await assertSucceeds(sdk.setDoc(ref(student.db),base));
  for(const uid of [null,'other','unassigned'])await assertFails(sdk.getDocFromServer(ref(context(uid))));
  await assertFails(sdk.setDoc(ref(context(teacherUid)),base));
});
test('complete work submits and locks, and the shared marking client keeps a draft private before publishing feedback to its student',async()=>{
  const answers=complete();await sdk.setDoc(ref(student.db),responsePayload(answers,'submitted',sdk.serverTimestamp(),activityId));
  const submission=parseResponse(await sdk.getDocFromServer(ref(student.db)),activityId);
  assert.deepEqual(submission.answers,answers);
  await assertFails(sdk.setDoc(ref(student.db),responsePayload(answers,'draft',sdk.serverTimestamp(),activityId)));
  const teacherClient=createMarkingClient(sdk,teacher.db,()=>teacher.auth.currentUser?.uid);
  const state=await teacherClient.load(scope,submission.updatedAt),values={score:8,maxScore:10,feedback:'Synthetic feedback on the quotation and interpretation.'};
  await teacherClient.save(scope,{values,publish:false,expected:state.versions,submissionUpdatedAt:submission.updatedAt});
  const own=markingRefs(sdk,student.db,scope);assert.equal((await sdk.getDocFromServer(own.published)).exists(),false);await assertFails(sdk.getDocFromServer(own.draft));
  const draft=await teacherClient.load(scope,submission.updatedAt);
  await teacherClient.save(scope,{values,publish:true,expected:draft.versions,submissionUpdatedAt:submission.updatedAt});
  const published=parseMarking(await sdk.getDocFromServer(own.published),submission.updatedAt);assert.equal(published.score,8);assert.equal(published.feedback,values.feedback);
  await assertFails(sdk.getDocFromServer(markingRefs(sdk,context('other'),scope).published));
  await assertFails(sdk.setDoc(own.published,{version:1,...values,reviewerUid:studentUid,updatedAt:sdk.serverTimestamp(),submissionUpdatedAt:submission.updatedAt}));
  await signOut(student.auth);await assertFails(sdk.getDocFromServer(ref(student.db)));
});
test('revoking class assignment or enrollment blocks the next review or student request for this lesson',async()=>{
  const change=(path,values)=>environment.withSecurityRulesDisabled(c=>sdk.updateDoc(sdk.doc(c.firestore(),...path),values));
  await change(['classes','daisy'],{teacherUids:[]});await assertFails(sdk.getDocFromServer(ref(teacher.db)));await assertSucceeds(sdk.getDocFromServer(ref(context('admin'))));
  await change(['classes','daisy','students','own'],{active:false});await assert.rejects(signInStudent(studentClient(),'MerchantLearner',password));assert.equal(student.auth.currentUser,null);
});
