# Firebase administrator login and class dashboard

`admin-login.html` signs in the existing Firebase Email/Password account and
checks `users/{authenticated UID}` on the server. Only an active profile with
`role: "admin"` can open the administrator dashboard. It then loads the root
`classes` collection from Firestore and marks classes whose `teacherUids` array
contains this administrator's UID. Administrators retain their `admin` role
when assigned to teach a class.

The class view displays name, branch, year group, academic year, active state
and assignment status. Refresh clears old cards before another server read;
sign-out clears the name, email and class cards. Responses from an earlier
session cannot repopulate the page after sign-out. Empty results, invalid class
records and permission/network failures have separate visible messages. Class
content is inserted with `textContent`, never interpreted as HTML.

This stage is read-only. Class creation and teacher assignments use the Firebase
Console. Student records and results are future work. Staff password recovery
is described in `PHASE2_PASSWORD_RECOVERY.md`.
Teacher sign-in is described in `PHASE2_TEACHER_LOGIN.md`.
The existing Apps Script and four-digit-code pages have their own
authorization and are not secured by these Firestore rules. This page does not
set legacy login flags or call the legacy backend.

## Data setup

The administrator's profile document ID must equal their Firebase
Authentication UID:

| Path | Field | Console type | Value |
| --- | --- | --- | --- |
| `users/{UID}` | `displayName` | string | Administrator's name |
| `users/{UID}` | `role` | string | `admin` |
| `users/{UID}` | `active` | boolean | `true` |

Create `classes` at the database root, beside `users`, not inside the user's
document. The first class is `classes/tm-y8-daisy-2026`:

| Field | Console type | Value |
| --- | --- | --- |
| `name` | string | `8 Daisy` |
| `branch` | string | `TM` |
| `yearGroup` | int64 | `8` |
| `academicYear` | int64 | `2026` |
| `active` | boolean | `true` |
| `teacherUids` | array of strings | Copy the assigned teacher's Authentication UID |

Copy UIDs exactly; do not type them from screenshots. An empty `teacherUids`
array is valid for an unassigned class. Incomplete or incorrectly typed class
records are counted for review instead of displayed as valid class cards.

## Backend permissions

`firestore.rules` must be published separately from Hosting:

| Requester | Own active profile | Class documents |
| --- | --- | --- |
| Signed out | Denied | Denied |
| Active administrator | Get only | Get/list all classes, including inactive ones |
| Active teacher | Get only | Get/list only assigned active classes |
| Active student | Get only | Denied |
| Inactive or missing profile | Denied | Denied |

All client profile/class writes and profile collection queries remain denied,
including administrator writes. A user cannot change their own role or assign
themselves to a class. Role checks read `users/{request.auth.uid}` on the server,
not browser state or caller-supplied role claims. Other collections and nested
subcollections remain denied.

Firestore rules do not filter query results. A future teacher page must use
both `where('active', '==', true)` and
`where('teacherUids', 'array-contains', authenticatedUid)`; an unrestricted class
query is denied to teachers. The administrator's collection query is permitted
because their active server profile grants access to every class document.
The administrator page continues to reject teacher logins. Teachers use the
separate `teacher-login.html` entry point, which uses the constrained query
above. Administrators may also open that page to see their teaching assignments.

## Publish and deploy

1. Open Firebase Console for `maplewood-english-learning` → Firestore Database
   → Rules. Replace the editor contents with this repository's `firestore.rules`
   and publish. The rules do not create or modify database records.
2. Copy these three frontend files from the same commit into the existing local
   Firebase Hosting `public` directory beside the current `index.html`, replacing
   their previous versions:
   - `admin-login.html`
   - `admin-login.mjs`
   - `admin-access.mjs`
3. From the existing Firebase project directory, deploy Hosting:

   ```sh
   firebase deploy --only hosting --project maplewood-english-learning
   ```

Keep the existing Hosting `firebase.json`. The separate
`firebase.emulators.json` in this repository is only for local tests and is not
a replacement Hosting configuration. Hosting deployment alone does not publish
Firestore rules. There is no automatic deployment in this change.

The page loads public web configuration from `/__/firebase/init.json` and checks
the project ID and auth domain before SDK initialization. Use the existing
Firebase Hosting domain; Netlify and GitHub Pages do not provide that reserved
URL. No private key or service-account file is required.

## Owner's live verification

1. Open `https://maplewood-english-learning.web.app/admin-login.html` and sign in
   with the already-created administrator account.
2. Confirm the dashboard lists **8 Daisy**, branch **TM**, year group **8**,
   academic year **2026**, state **Active** and
   **You are assigned to this class**.
3. Refresh classes and confirm it reloads successfully.
4. Sign out. The account and class cards must disappear. Reloading also requires
   a fresh sign-in because Firebase Auth uses in-memory persistence.

If login succeeds but class access fails, check that the new rules were
published to this same Firebase project. If no classes appear, verify the root
collection path and field types. Check `teacherUids` against Authentication if
the class appears without the teaching-assignment message.

## Local verification

Node 24.12 or newer and Java 21 or newer are required by the pinned test tools.
The frontend itself remains plain browser modules with no build step.

```sh
npm ci --ignore-scripts
npm test
npm run test:rules
node --check admin-login.mjs
```

The rules tests run against a local Firestore Emulator under the demo-only
project `demo-maplewood-classes`. They never connect to the live project and
require no account credentials. They cover unauthenticated access, own-profile
isolation, active admin access, assigned teacher queries, malformed UID arrays,
inactive/missing/student profiles, fake role claims, write denial, subcollection
isolation and access revocation. Unit tests cover login failures, session
cleanup, safe errors, class parsing and exact UID assignment matching.

The `Firebase access checks` GitHub workflow runs these checks on relevant pull
requests and main-branch changes with Node 24 and Java 21. It has read-only
repository permission and does not deploy anything.

Firebase references:

- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/hosting/reserved-urls
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/security/rules-query
- https://firebase.google.com/docs/rules/unit-tests
