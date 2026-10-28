# Staff password recovery

Both `admin-login.html` and `teacher-login.html` now offer **Forgot password?**
below Sign in. A user enters their email address and chooses that button; no
password is required to request recovery. The SDK sends the request through
Firebase Authentication's `sendPasswordResetEmail`. The reset link opens the
project's default Firebase password-reset page, where the user sets a new
Learning Hub password.

The shared helper returns the same neutral message for a successful request,
an unregistered address and a disabled-account response. It does not fetch a
profile, sign a user in, create an account, change a role, or edit class
assignments. Invalid email formats and connection/quota failures have separate
safe messages without raw upstream exception text.

The button is disabled while the request runs. After an accepted request, it
shows Email requested for 30 seconds to reduce accidental repeat requests;
normal sign-in remains available. The entered password and Show password state
are cleared after a recovery request. The existing in-memory login persistence,
role checks, server class reads and sign-out cleanup remain in place.

Firebase's email-enumeration protection governs API-level responses. New
projects created on or after September 15, 2023 have it enabled by default; this
UI also normalizes the account-specific errors returned by older configurations
and the emulator. Default Firebase Authentication email templates and its
hosted action handler are used, without adding another backend or custom action
URL.

## Deploy

Copy these five updated frontend files from the same merged commit into the
existing Firebase Hosting `public` folder beside `index.html`, replacing their
previous versions:

- `admin-login.html`
- `admin-login.mjs`
- `teacher-login.html`
- `teacher-login.mjs`
- `admin-access.mjs`

From the existing project directory containing `firebase.json`, run:

```sh
firebase deploy --only hosting --project maplewood-english-learning
```

The existing Firestore rules, class index, account profiles and assignments do
not need to be edited for this update. `firebase.emulators.json` is for local
tests and does not replace the existing Hosting configuration. Merging the PR
does not deploy Firebase Hosting or send any recovery email.

## Owner's live recovery test

1. Open the teacher sign-in page on the existing Firebase Hosting site and
   enter the teacher test account's email address.
2. Leave the password empty and choose Forgot password.
3. Confirm that the neutral message appears and the request button briefly
   shows Email requested. The Sign in button should remain usable.
4. Open that account's inbox and the password-reset email. Set a new Learning
   Hub password on the Firebase reset page.
5. Return to teacher sign-in and sign in with the new password. Confirm the
   role is Teacher and 8 Daisy remains assigned.
6. Sign out, try the previous password, and confirm it is rejected. Then use
   the new password to sign in successfully again.

The account owner performs this test in their own browser. Passwords and reset
links are not needed for reviewing or testing the repository change. Live email
delivery and the hosted reset page need this owner check after deployment.

## Automated verification

```sh
npm ci --ignore-scripts
npm test
npm run test:rules
npm run test:auth
node --check admin-login.mjs
node --check teacher-login.mjs
```

The Auth Emulator tests use the actual Firebase SDK and production reset helper
under the demo-only `demo-maplewood-classes` project. The test process refuses
to run without the loopback Auth Emulator environment. It creates a synthetic
`.invalid` account locally, captures its local reset action, completes the
reset, verifies that the old password fails, confirms the new password works
with the same UID, and verifies that the reset code cannot be reused. A second
test verifies that an unregistered address receives the same neutral helper
result without creating an email action. No real recovery email is sent.

Existing administrator, teacher and Firestore permission tests remain in the
GitHub workflow. New unit tests cover trimmed addresses, empty input, neutral
account-status responses and safe failure messages. Browser checks use isolated
mock SDK fixtures, while the real SDK initialization is checked separately.

Firebase references:

- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/reference/js/auth#sendpasswordresetemail
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/emulator-suite/connect_auth
