import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import * as sdk from 'firebase/firestore';
import {RICH_ACTIVITIES} from '../rich-lessons-data.mjs';
import {responseDocument,responsePayload,parseResponse} from '../activity-responses.mjs';
import {studentEmail,signInStudent} from '../student-access.mjs';
import {markingRefs,createMarkingClient,parseMarking} from '../marking-data.mjs';
const projectId='demo-maplewood-classes';
const password='Synthetic-merchant-integration-only-123!';
const complete=activity=>Object.fromEntries(activity.questions.map(q=>[q.id,q.options?.[0] || (q.minWords?'word '.repeat(q.minWords).trim():'An explanation supported by the extract.')]));
let environment,student,teacher,studentUid,teacherUid;
const context=uid=>uid?environment.authenticatedContext(uid).firestore():environment.unauthenticatedContext().firestore();
const ref=(db,activityId,studentId='own')=>responseDocument(sdk,db,'daisy',studentId,activityId);
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
test('all remaining lessons save separately and restore after a fresh verified sign-in',async()=>{
  await signInStudent(studentClient(),'MerchantLearner',password);
  for(const activity of RICH_ACTIVITIES){const answers=complete(activity);answers.q1='';await sdk.setDoc(ref(student.db,activity.id),responsePayload(answers,'draft',sdk.serverTimestamp(),activity.id));}
  await signOut(student.auth);await signInStudent(studentClient(),'MerchantLearner',password);
  for(const activity of RICH_ACTIVITIES){const loaded=parseResponse(await sdk.getDocFromServer(ref(student.db,activity.id)),activity.id),expected=complete(activity);expected.q1='';assert.deepEqual(loaded.answers,expected);assert.equal(loaded.status,'draft');}
});
test('server rules validate all text and choice fields, exact shapes, pre-learning checks and minimum-word accounts',async()=>{
  for(const activity of RICH_ACTIVITIES){
    const base=responsePayload(complete(activity),'draft',sdk.serverTimestamp(),activity.id),path=ref(student.db,activity.id);
    for(const question of activity.questions){
      await assertFails(sdk.setDoc(path,{...base,answers:{...base.answers,[question.id]:'x'.repeat(4001)}}));
      if(question.options){
        await assertFails(sdk.setDoc(path,{...base,answers:{...base.answers,[question.id]:'invented choice'}}));
        await assertSucceeds(sdk.setDoc(path,{...base,answers:{...base.answers,[question.id]:question.options.at(-1)}}));
      }
      if(question.required!==false)await assertFails(sdk.setDoc(path,{...base,status:'submitted',answers:{...base.answers,[question.id]:''}}));
      if(question.submitEquals)await assertFails(sdk.setDoc(path,{...base,status:'submitted',answers:{...base.answers,[question.id]:question.options.find(v=>v!==question.submitEquals)}}));
      if(question.minWords)await assertFails(sdk.setDoc(path,{...base,status:'submitted',answers:{...base.answers,[question.id]:'word '.repeat(question.minWords-1).trim()}}));
      if(question.minSelections)await assertFails(sdk.setDoc(path,{...base,status:'submitted',answers:{...base.answers,[question.id]:question.options.find(v=>v.split('\n').length<question.minSelections)}}));
    }
    for(const invalid of [{...base,score:100},{...base,answers:{q1:'only one'}},{...base,answers:{...base.answers,extra:'forged'}}])await assertFails(sdk.setDoc(path,invalid));
    await assertSucceeds(sdk.setDoc(path,base));
  }
});
test('every complete lesson submits and locks, and staff can privately mark and publish its own feedback',async()=>{
  const client=createMarkingClient(sdk,teacher.db,()=>teacher.auth.currentUser?.uid);
  for(const activity of RICH_ACTIVITIES){
    const answers=complete(activity);for(const q of activity.questions.filter(q=>q.required===false))answers[q.id]='';
    const path=ref(student.db,activity.id);await assertSucceeds(sdk.setDoc(path,responsePayload(answers,'submitted',sdk.serverTimestamp(),activity.id)));
    const response=parseResponse(await sdk.getDocFromServer(path),activity.id);assert.deepEqual(response.answers,answers);
    await assertFails(sdk.setDoc(path,responsePayload(answers,'draft',sdk.serverTimestamp(),activity.id)));
    const scope={classId:'daisy',studentId:'own',activityId:activity.id},initial=await client.load(scope,response.updatedAt),values={score:8,maxScore:10,feedback:'Synthetic feedback for '+activity.title};
    await client.save(scope,{values,publish:false,expected:initial.versions,submissionUpdatedAt:response.updatedAt});
    const own=markingRefs(sdk,student.db,scope);await assertFails(sdk.getDocFromServer(own.draft));assert.equal((await sdk.getDocFromServer(own.published)).exists(),false);
    const draft=await client.load(scope,response.updatedAt);await client.save(scope,{values,publish:true,expected:draft.versions,submissionUpdatedAt:response.updatedAt});
    assert.equal(parseMarking(await sdk.getDocFromServer(own.published),response.updatedAt).feedback,values.feedback);
    await assertFails(sdk.setDoc(own.published,{version:1,...values,reviewerUid:studentUid,updatedAt:sdk.serverTimestamp(),submissionUpdatedAt:response.updatedAt}));
  }
});
test('cross-student access, unassigned staff and revoked enrollment remain denied for all new lessons',async()=>{
  for(const activity of RICH_ACTIVITIES)for(const uid of [null,'other','unassigned'])await assertFails(sdk.getDocFromServer(ref(context(uid),activity.id)));
  const change=(path,values)=>environment.withSecurityRulesDisabled(c=>sdk.updateDoc(sdk.doc(c.firestore(),...path),values));
  await change(['classes','daisy'],{teacherUids:[]});
  for(const activity of RICH_ACTIVITIES){await assertFails(sdk.getDocFromServer(ref(teacher.db,activity.id)));await assertSucceeds(sdk.getDocFromServer(ref(context('admin'),activity.id)));}
  await change(['classes','daisy','students','own'],{active:false});await signOut(student.auth);await assert.rejects(signInStudent(studentClient(),'MerchantLearner',password));assert.equal(student.auth.currentUser,null);
});
