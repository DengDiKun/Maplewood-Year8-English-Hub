import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword } from 'firebase/auth';
import { PASSWORD_RESET_MESSAGE, requestPasswordReset } from '../admin-access.mjs';

const projectId = 'demo-maplewood-classes';
const origin = 'http://127.0.0.1:9099';
const address = 'recovery-test@example.invalid';
const oldPassword = 'Synthetic-old-password-123!';
const newPassword = 'Synthetic-new-password-456!';
let app, auth, originalUid;

async function listCodes() {
  const response = await fetch(`${origin}/emulator/v1/projects/${projectId}/oobCodes`);
  assert.equal(response.status, 200);
  return (await response.json()).oobCodes || [];
}

before(async () => {
  // All SDK operations and test-admin requests must stay on this local emulator.
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.ok(projectId.startsWith('demo-'));
  const cleared = await fetch(`${origin}/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });
  assert.equal(cleared.status, 200);
  app = initializeApp({ projectId, apiKey: 'demo-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'password-reset-emulator');
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, origin, { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(auth, address, oldPassword);
  originalUid = credential.user.uid;
  await signOut(auth);
});

after(async () => { if (app) await deleteApp(app); });

test('the production reset helper completes a real emulator recovery while preserving the account UID', async () => {
  assert.equal(auth.currentUser, null);
  const result = await requestPasswordReset(email => sendPasswordResetEmail(auth, email), address);
  assert.equal(result, PASSWORD_RESET_MESSAGE);
  assert.equal(auth.currentUser, null);
  const codes = await listCodes();
  const reset = codes.find(item => item.email === address && item.requestType === 'PASSWORD_RESET');
  assert.ok(reset, 'The emulator should contain the reset email action.');
  assert.equal(await verifyPasswordResetCode(auth, reset.oobCode), address);
  await confirmPasswordReset(auth, reset.oobCode, newPassword);
  await assert.rejects(signInWithEmailAndPassword(auth, address, oldPassword));
  const credential = await signInWithEmailAndPassword(auth, address, newPassword);
  assert.equal(credential.user.uid, originalUid);
  await signOut(auth);
  await assert.rejects(verifyPasswordResetCode(auth, reset.oobCode));
});

test('an unregistered address gets the same neutral response and creates no reset email action', async () => {
  const before = (await listCodes()).length;
  const result = await requestPasswordReset(email => sendPasswordResetEmail(auth, email), 'unregistered@example.invalid');
  assert.equal(result, PASSWORD_RESET_MESSAGE);
  assert.equal(auth.currentUser, null);
  assert.equal((await listCodes()).length, before);
});
