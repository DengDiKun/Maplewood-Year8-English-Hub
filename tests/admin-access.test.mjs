import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, verifyAdministrator, signInAdministrator, errorMessage } from '../admin-access.mjs';

const user = { uid: 'admin-uid', email: 'admin@example.invalid' };
const snapshot = (data) => ({ exists: () => data !== null, data: () => data });
const profile = { displayName: 'Ezzuddin', active: true, role: 'admin' };

test('Firebase Hosting configuration works without Analytics appId and rejects another project', () => {
  const config = { projectId: 'maplewood-english-learning', apiKey: 'public-web-config', authDomain: 'maplewood-english-learning.firebaseapp.com' };
  assert.equal(validateConfig(config), config);
  for (const value of [null, {}, { ...config, projectId: 'another-project' }, { ...config, apiKey: '' }, { ...config, authDomain: 'other.example' }]) {
    assert.throws(() => validateConfig(value), { code: 'setup/config' });
  }
});

test('only an active administrator gets a verified result, read by authenticated UID', async () => {
  let requested;
  const result = await verifyAdministrator(user, async uid => { requested = uid; return snapshot(profile); });
  assert.equal(requested, user.uid);
  assert.deepEqual(result, { name: 'Ezzuddin', email: user.email, uid: user.uid, role: 'admin' });
  assert.ok(Object.isFrozen(result));
});

test('absent identity is rejected before any profile read', async () => {
  for (const identity of [null, {}, { uid: '' }, { uid: '   ' }, { uid: 'users/other-uid' }]) {
    await assert.rejects(verifyAdministrator(identity, () => { throw new Error('Must not read'); }), { code: 'access/denied' });
  }
});

test('missing, inactive, malformed and non-admin profiles fail closed', async () => {
  for (const data of [null, {}, { ...profile, active: false }, { ...profile, active: 'true' }, { ...profile, role: 'teacher' }, { ...profile, role: 'student' }, { ...profile, role: 'Admin' }]) {
    await assert.rejects(verifyAdministrator(user, async () => snapshot(data)), { code: 'access/denied' });
  }
});

test('a server failure is not replaced by browser profile data', async () => {
  const denied = Object.assign(new Error('Denied'), { code: 'permission-denied' });
  await assert.rejects(verifyAdministrator(user, async () => { throw denied; }), error => error === denied);
});

test('login trims the email but preserves the exact password', async () => {
  let credentials;
  const result = await signInAdministrator({
    signIn: async (...args) => { credentials = args; return { user }; },
    loadProfile: async () => snapshot(profile),
    signOut: async () => { throw new Error('Must not sign out on success'); }
  }, ' admin@example.invalid ', ' a password with spaces ');
  assert.deepEqual(credentials, ['admin@example.invalid', ' a password with spaces ']);
  assert.equal(result.uid, user.uid);
});

test('successful Firebase login with a teacher profile is signed out and rejected', async () => {
  let signedOut = 0;
  await assert.rejects(signInAdministrator({
    signIn: async () => ({ user }),
    loadProfile: async () => snapshot({ ...profile, role: 'teacher' }),
    signOut: async () => { signedOut += 1; }
  }, user.email, 'password'), { code: 'access/denied' });
  assert.equal(signedOut, 1);
});

test('a profile network failure also closes the new session', async () => {
  let signedOut = false;
  await assert.rejects(signInAdministrator({
    signIn: async () => ({ user }),
    loadProfile: async () => { throw Object.assign(new Error('Offline'), { code: 'unavailable' }); },
    signOut: async () => { signedOut = true; }
  }, user.email, 'password'), { code: 'unavailable' });
  assert.equal(signedOut, true);
});

test('cleanup failure never converts denied access to success', async () => {
  await assert.rejects(signInAdministrator({
    signIn: async () => ({ user }),
    loadProfile: async () => snapshot(null),
    signOut: async () => { throw new Error('Offline'); }
  }, user.email, 'password'), { code: 'access/denied' });
});

test('incorrect credentials do not read a profile or overwrite the authentication error', async () => {
  await assert.rejects(signInAdministrator({
    signIn: async () => { throw Object.assign(new Error('Private upstream message'), { code: 'auth/invalid-credential' }); },
    loadProfile: async () => { throw new Error('Must not read'); },
    signOut: async () => { throw new Error('Must not sign out'); }
  }, user.email, 'password'), { code: 'auth/invalid-credential' });
});

test('error messages neither enumerate accounts nor expose upstream exception text', () => {
  assert.equal(errorMessage({ code: 'auth/user-not-found' }), errorMessage({ code: 'auth/wrong-password' }));
  assert.ok(!errorMessage(new Error('Sensitive raw error')).includes('Sensitive'));
});
