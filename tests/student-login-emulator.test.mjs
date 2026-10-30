import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp,deleteApp } from 'firebase/app';
import { initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut } from 'firebase/auth';
import { getFirestore,connectFirestoreEmulator,doc,getDocFromServer,getDocsFromServer,collection,setDoc,updateDoc } from 'firebase/firestore';
import { initializeTestEnvironment,assertFails } from '@firebase/rules-unit-testing';
import { studentEmail,signInStudent } from '../student-access.mjs';
let app,auth,db,environment,uid;
const projectId='demo-maplewood-classes',username='SyntheticLearner',password='Synthetic-student-password-123!';
before(async()=>{
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  await environment.clearFirestore();
  app=initializeApp({projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'},'student-login-integration');
  auth=initializeAuth(app,{persistence:inMemoryPersistence});connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);
  const credential=await createUserWithEmailAndPassword(auth,studentEmail(username),password);uid=credential.user.uid;
  await signOut(auth);
  await environment.withSecurityRulesDisabled(async context=>{
    const admin=context.firestore();
    await setDoc(doc(admin,'classes','daisy'),{name:'8 Daisy',active:true,teacherUids:[]});
    await setDoc(doc(admin,'classes','daisy','students','sample'),{displayName:'Synthetic Learner',active:true,authUid:uid});
    await setDoc(doc(admin,'users',uid),{displayName:'Synthetic Learner',username,role:'student',active:true,classId:'daisy',studentId:'sample',className:'8 Daisy',branch:'TM',yearGroup:8,academicYear:2026});
  });
});
after(async()=>{if(app)await deleteApp(app);await environment?.cleanup();});
const client=()=>({signIn:(email,pw)=>signInWithEmailAndPassword(auth,email,pw),loadProfile:id=>getDocFromServer(doc(db,'users',id)),signOut:()=>signOut(auth)});
test('actual SDK username sign-in verifies the linked own profile and cannot read roster/class collections',async()=>{
  const profile=await signInStudent(client(),' syntheticLEARNER ',password);
  assert.equal(profile.uid,uid);assert.equal(profile.name,'Synthetic Learner');
  await assertFails(getDocsFromServer(collection(db,'classes')));
  await assertFails(getDocsFromServer(collection(db,'classes','daisy','students')));
  await signOut(auth);
});
test('wrong password is rejected and a disabled enrollment denies the next login with session cleanup',async()=>{
  await assert.rejects(signInStudent(client(),username,'incorrect-password'));
  assert.equal(auth.currentUser,null);
  await environment.withSecurityRulesDisabled(async context=>updateDoc(doc(context.firestore(),'classes','daisy','students','sample'),{active:false}));
  await assert.rejects(signInStudent(client(),username,password));
  assert.equal(auth.currentUser,null);
});

test('the production account setup script works through both emulator REST APIs and safely resumes',async()=>{
 const result=await promisify(execFile)('python3',['tests/student-provision-emulator.py'],{env:process.env,timeout:60000});
 assert.match(result.stdout,/Provisioning protocol passed/);
});
