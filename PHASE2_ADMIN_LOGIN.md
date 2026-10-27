# Firebase administrator login pilot

The new `admin-login.html` page signs in the existing Firebase Email/Password
account and reads only `users/{authenticated UID}` from Firestore. The account
panel appears only when that server document has `active: true` (boolean) and
`role: "admin"`. No student records, class data, marks or Apps Script endpoints
are requested by this page.

The existing teacher and student pages are not part of this change. The pilot
does not set the old four-digit profile, teacher-mode or progress storage keys.
This is an account connection test, not the completed administrator dashboard.

## Deploy and test

1. Copy `admin-login.html`, `admin-login.mjs` and `admin-access.mjs` into the same
   local Firebase Hosting public directory as the current `index.html`.
2. From the existing Firebase project directory, deploy Hosting:

   ```sh
   firebase deploy --only hosting --project maplewood-english-learning
   ```

   Keep the existing Hosting configuration. This change does not introduce a
   replacement `firebase.json` or select a different Hosting public directory.
3. Open `https://maplewood-english-learning.web.app/admin-login.html`.
4. Sign in with the Email/Password account already created in Firebase Console.
5. Confirm the page shows the correct name, email and Administrator role.
6. Sign out and confirm the credentials form reappears. Reloading also requires
   a fresh login, because the pilot uses in-memory Firebase Auth persistence.

The page obtains the project's public web configuration from the Firebase
Hosting reserved URL `/__/firebase/init.json`. It checks the project ID and
Firebase auth domain before initializing the SDK. This works on the existing
Firebase Hosting domain; serving these files directly on GitHub Pages does not
provide that reserved URL. No service-account JSON or private key is needed.

## Account and rules

The administrator's document ID must equal the Authentication UID. Fields:

| Field | Type | Required value |
| --- | --- | --- |
| `displayName` | string | The administrator's name |
| `role` | string | `admin` |
| `active` | boolean | `true` |

`firestore.rules` records the rules published manually during setup. It permits
only an active user's own profile get and denies collection queries and all
client writes. A profile with another role may be readable by its owner under
these rules; the pilot then rejects administrator access and signs out. The
current rules grant no access to classes, submissions or other collections.

The four Rules Playground checks during setup were:

| Simulation | Expected result |
| --- | --- |
| Unauthenticated get of the administrator profile | Denied |
| Get with the administrator's matching UID | Allowed |
| Get with another simulated UID | Denied |
| Delete with the administrator's matching UID | Denied |

Before adding protected data or enabling wider use, implement and test that
data's backend permission checks. The old Google Apps Script endpoints have
their own authorization; these Firestore rules do not secure those endpoints.
Never bridge the new login into old teacher access by writing a browser role
flag. Teacher assignment and class access require their own server-enforced
rules.

## Local verification

```sh
node --test tests/admin-access.test.mjs
node --check admin-login.mjs
```

Tests cover denied/malformed roles, strict boolean active state, profile read
failures, session cleanup, email/password handling and safe error messages.
They do not use real accounts or credentials. A live login still needs to be
verified by the account owner after Firebase Hosting deployment.

Firebase references:

- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/hosting/reserved-urls
- https://firebase.google.com/docs/firestore/security/rules-conditions
