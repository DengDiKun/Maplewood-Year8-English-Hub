import test from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD_RESET_MESSAGE, requestPasswordReset, passwordResetErrorMessage } from '../admin-access.mjs';

test('password recovery trims the email and requests instructions without a password or login', async () => {
  let requested;
  const result = await requestPasswordReset(async (...args) => { requested = args; }, ' teacher@example.invalid ');
  assert.deepEqual(requested, ['teacher@example.invalid']);
  assert.equal(result, PASSWORD_RESET_MESSAGE);
});

test('registered, absent and disabled accounts receive the same neutral UI result', async () => {
  const accepted = await requestPasswordReset(async () => {}, 'teacher@example.invalid');
  for (const code of ['auth/user-not-found', 'auth/user-disabled']) {
    const result = await requestPasswordReset(async () => { throw Object.assign(new Error('Private account state'), { code }); }, 'other@example.invalid');
    assert.equal(result, accepted);
    assert.ok(!result.includes('Private'));
  }
});

test('missing email input is rejected before any reset request', async () => {
  for (const address of [null, undefined, 123, '', '   ']) {
    await assert.rejects(requestPasswordReset(() => { throw new Error('Must not request'); }, address), { code: 'reset/invalid-email' });
  }
});

test('network and quota failures are not presented as a successful reset request', async () => {
  for (const code of ['auth/network-request-failed', 'auth/too-many-requests', 'auth/quota-exceeded']) {
    await assert.rejects(requestPasswordReset(async () => { throw Object.assign(new Error('Private upstream details'), { code }); }, 'teacher@example.invalid'), { code });
    assert.ok(!passwordResetErrorMessage({ code, message: 'Private upstream details' }).includes('Private'));
  }
});

test('an invalid email gets a validation message instead of an account-status message', async () => {
  await assert.rejects(requestPasswordReset(async () => { throw Object.assign(new Error('Invalid'), { code: 'auth/invalid-email' }); }, 'invalid-address'), { code: 'auth/invalid-email' });
  assert.match(passwordResetErrorMessage({ code: 'auth/invalid-email' }), /valid email address/);
});

test('unexpected reset errors do not expose internal exception text or codes', () => {
  const message = passwordResetErrorMessage({ code: 'internal/private-code', message: 'Sensitive raw exception' });
  assert.ok(!message.includes('private-code'));
  assert.ok(!message.includes('Sensitive'));
});
