import test from 'node:test';
import assert from 'node:assert/strict';
import { studentEmail, studentProfile, signInStudent, studentError } from '../student-access.mjs';
const user = { uid:'student-uid', email:studentEmail('SampleLearner') };
const data = { displayName:'Sample Learner', username:'SampleLearner', role:'student', active:true,
  classId:'daisy', studentId:'sample', className:'8 Daisy', branch:'TM', yearGroup:8, academicYear:2026 };
const snap = value => ({ exists:() => value !== null, data:() => value });
test('username alias is deterministic and case-insensitive; emails and paths are rejected', () => {
  assert.equal(studentEmail(' SampleLearner '), 'samplelearner@students.maplewood.invalid');
  for (const value of ['',null,'test/name','user@example.com','space name','x'.repeat(65)]) assert.throws(() => studentEmail(value));
});
test('an active student profile supplies only its own display fields', () => {
  const result = studentProfile(snap({...data, extra:'private'}), user, 'samplelearner');
  assert.equal(result.name,'Sample Learner'); assert.equal(result.username,'SampleLearner');
  assert.equal(result.className,'8 Daisy'); assert.equal(result.extra,undefined);
});
test('staff, missing, inactive, mismatched and malformed profiles are rejected', () => {
  for (const value of [null,{...data,role:'admin'},{...data,role:'teacher'},{...data,active:'true'},
    {...data,active:false},{...data,username:'Other'},{...data,classId:'a/b'},
    {...data,studentId:''},{...data,yearGroup:'8'},{...data,className:''}]) {
    assert.throws(() => studentProfile(snap(value),user,'SampleLearner'));
  }
  assert.throws(() => studentProfile(snap(data),{...user,email:'other@example.invalid'},'SampleLearner'));
});
test('student login preserves password and checks profile with the authenticated UID',async () => {
  const calls=[];
  const result=await signInStudent({signIn:async (...args)=>{calls.push(args);return {user};},
    loadProfile:async uid=>{assert.equal(uid,user.uid);return snap(data);},signOut:async()=>assert.fail()},' SampleLearner ',' secret ');
  assert.deepEqual(calls,[[user.email,' secret ']]); assert.equal(result.uid,user.uid);
});
test('a rejected profile or revoked read signs out without returning an account',async () => {
  for(const loadProfile of [async()=>snap({...data,role:'teacher'}),async()=>{throw {code:'permission-denied'};}]) {
    let out=0;await assert.rejects(signInStudent({signIn:async()=>({user}),loadProfile,signOut:async()=>{out++;}},'SampleLearner','secret'));
    assert.equal(out,1);
  }
});
test('incorrect credentials never fetch a profile and safe messages do not leak upstream details',async () => {
  await assert.rejects(signInStudent({signIn:async()=>{throw {code:'auth/invalid-credential'};},loadProfile:()=>assert.fail()},'SampleLearner','wrong'));
  assert.equal(studentError({code:'auth/user-not-found'}),studentError({code:'auth/wrong-password'}));
  assert.ok(!studentError({message:'Sensitive exception'}).includes('Sensitive'));
});
