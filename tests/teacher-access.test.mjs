import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTeachingStaff, signInTeachingStaff, loadTeachingClasses, teachingClassesQuery, teachingSignInErrorMessage, teachingClassErrorMessage } from '../admin-access.mjs';

const user = { uid: 'teacher-uid', email: 'teacher@example.invalid' };
const teacher = { displayName: 'Teacher Example', active: true, role: 'teacher' };
const snapshot = data => ({ exists: () => data !== null, data: () => data });
const classData = { name: '8 Daisy', branch: 'TM', yearGroup: 8, academicYear: 2026, active: true, teacherUids: ['teacher-uid'] };
const classSnapshot = data => ({ docs: data.map((value, i) => ({ id: `class-${i}`, data: () => value })) });

test('an active teacher profile is read by the authenticated UID and retains its teacher role', async () => {
  let requested;
  const result = await verifyTeachingStaff(user, async uid => { requested = uid; return snapshot(teacher); });
  assert.equal(requested, user.uid);
  assert.deepEqual(result, { name: 'Teacher Example', email: user.email, uid: user.uid, role: 'teacher' });
  assert.ok(Object.isFrozen(result));
});

test('an administrator can use the teaching view without changing their role', async () => {
  const result = await verifyTeachingStaff(user, async () => snapshot({ ...teacher, displayName: '', role: 'admin' }));
  assert.equal(result.role, 'admin');
  assert.equal(result.name, 'Administrator');
});

test('missing, inactive, incorrectly typed and student profiles are rejected', async () => {
  for (const data of [null, {}, { ...teacher, active: false }, { ...teacher, active: 'true' }, { ...teacher, role: 'student' }, { ...teacher, role: 'Teacher' }]) {
    await assert.rejects(verifyTeachingStaff(user, async () => snapshot(data)), { code: 'access/denied' });
  }
});

test('a valid teacher login opens the teaching context and a rejected profile closes the session', async () => {
  const client = {
    signIn: async () => ({ user }),
    loadProfile: async () => snapshot(teacher),
    signOut: async () => { throw new Error('Must not sign out on success'); }
  };
  assert.equal((await signInTeachingStaff(client, user.email, 'synthetic-test-value')).role, 'teacher');
  let signedOut = false;
  await assert.rejects(signInTeachingStaff({
    ...client,
    loadProfile: async () => snapshot({ ...teacher, role: 'student' }),
    signOut: async () => { signedOut = true; }
  }, user.email, 'synthetic-test-value'), { code: 'access/denied' });
  assert.equal(signedOut, true);
});

test('teaching class reads use the verified UID and return the assigned active class', async () => {
  let requested;
  const profile = { uid: user.uid, role: 'teacher' };
  const result = await loadTeachingClasses(profile, async uid => { requested = uid; return classSnapshot([classData]); });
  assert.equal(requested, user.uid);
  assert.equal(result.classes.length, 1);
  assert.equal(result.classes[0].assignedToYou, true);
  assert.equal(result.classes[0].name, '8 Daisy');
  assert.ok(!Object.hasOwn(result.classes[0], 'teacherUids'));
  assert.deepEqual(await loadTeachingClasses(profile, async () => classSnapshot([])), { classes: [], invalidCount: 0 });
});

test('even an administrator teaching view rejects an unexpected inactive or unassigned class result', async () => {
  for (const role of ['teacher', 'admin']) {
    for (const data of [{ ...classData, active: false }, { ...classData, teacherUids: [] }, { ...classData, teacherUids: ['other-teacher-uid'] }]) {
      await assert.rejects(loadTeachingClasses({ uid: user.uid, role }, async () => classSnapshot([data])), { code: 'access/class-scope' });
    }
  }
});

test('invalid identities and student roles cannot invoke a teaching class read', async () => {
  for (const profile of [null, { uid: '', role: 'teacher' }, { uid: 'users/other', role: 'teacher' }, { uid: user.uid, role: 'student' }]) {
    await assert.rejects(loadTeachingClasses(profile, () => { throw new Error('Must not read'); }), { code: 'access/denied' });
  }
});

test('an invalid UID cannot construct a collection query', () => {
  const sdk = new Proxy({}, { get() { throw new Error('Must not use the SDK'); } });
  for (const uid of [null, undefined, '', ' ', 1, 'users/other']) {
    assert.throws(() => teachingClassesQuery(sdk, {}, uid), { code: 'access/denied' });
  }
});

test('a server failure is never replaced by a local teaching class list', async () => {
  const failure = Object.assign(new Error('Private upstream details'), { code: 'permission-denied' });
  await assert.rejects(loadTeachingClasses({ uid: user.uid, role: 'teacher' }, async () => { throw failure; }), error => error === failure);
});

test('teaching errors explain access problems without enumerating accounts or exposing internal setup links', () => {
  assert.match(teachingSignInErrorMessage({ code: 'permission-denied' }), /teacher or administrator/);
  assert.equal(teachingSignInErrorMessage({ code: 'auth/user-not-found' }), teachingSignInErrorMessage({ code: 'auth/wrong-password' }));
  assert.ok(!teachingClassErrorMessage({ code: 'failed-precondition', message: 'Private setup URL' }).includes('Private'));
  assert.ok(!teachingSignInErrorMessage(new Error('Private upstream details')).includes('Private'));
});
