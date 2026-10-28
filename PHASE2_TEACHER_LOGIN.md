# Firebase teacher sign-in and assigned classes

`teacher-login.html` is the Firebase teaching entry point. It accepts active
`teacher` and `admin` profiles, keeps the real server role and queries only
active root class documents assigned to the authenticated UID. An administrator
can teach a class while retaining their `admin` role. The existing
`admin-login.html` remains restricted to administrators.

The page uses the same branded layout as the administrator dashboard. It reads
`users/{UID}` and the class query from the server, displays class details, offers
Refresh classes and clears account/class details on sign-out. Late responses
from a previous login cannot repopulate the page. Reloading requires a fresh
login because authentication remains in memory.

## Access policy

The class query is built by the exported `teachingClassesQuery` helper:

```javascript
query(collection(database, 'classes'),
  where('active', '==', true),
  where('teacherUids', 'array-contains', authenticatedUid))
```

The Firestore Emulator tests import this exact helper, so the frontend query is
checked against the backend rules. The already-published `firestore.rules`
policy permits active teachers to read only their assigned active classes.
Inactive, missing and student profiles cannot read classes, and all client
class/profile writes remain denied. No rule changes are part of this update.

The teaching view also checks returned class cards for exact UID assignment and
active state. This keeps the administrator teaching view limited to teaching
assignments even though an administrator is authorized to read all class
metadata in the administrator dashboard. Unexpected records fail closed.

Teacher access to student records/results is not implemented in this stage.
The existing Apps Script and four-digit-code pages have separate authorization.
The new teaching login never sets their browser access flags or calls those
endpoints.

## Class query index

`firestore.indexes.json` records the recommended composite index for the teaching
query. To create it in the existing Firebase project:

1. Open Firestore Database → Indexes → Composite indexes → Create index.
2. Enter collection ID `classes` and query scope **Collection**.
3. Add these fields, then create the index:

   | Field | Index mode |
   | --- | --- |
   | `teacherUids` | Array contains |
   | `active` | Ascending |

4. Wait for its status to become Enabled before the owner tests the teaching
   page. If the same index already exists and is enabled, use that index.

Firebase recommends combining an array-membership filter and additional clauses
in a composite index to avoid index-merging performance costs. Hosting does not
publish indexes. This file is not an instruction to replace the existing local
Hosting `firebase.json`; the console steps above work with that configuration.
The emulator does not enforce production index requirements, so the owner's
live check below remains necessary.

Reference: https://firebase.google.com/docs/firestore/query-data/index-overview

## Deploy and test with the existing administrator account

1. Copy these three files from the merged commit into the existing Firebase
   Hosting `public` folder, alongside `index.html`:
   - `teacher-login.html` (new)
   - `teacher-login.mjs` (new)
   - `admin-access.mjs` (replace the previous shared module)
2. Run from the existing project folder containing `firebase.json`:

   ```sh
   firebase deploy --only hosting --project maplewood-english-learning
   ```

3. Open `https://maplewood-english-learning.web.app/teacher-login.html` and sign in
   with the existing administrator account. Its profile role stays `admin`.
4. Confirm **Your teaching dashboard**, role **Administrator**, and the active
   **8 Daisy / TM / Year 8 / 2026** class with the assignment message.
5. Refresh classes, sign out and confirm the class/name/email disappear. Reload
   and confirm a fresh login is required.
6. Open the existing administrator login and confirm it still lists classes.

The browser SDK loads public configuration from `/__/firebase/init.json`, checks
the project ID and auth domain, and reads Firestore from the server. No build
step or private key is required. Use the Firebase Hosting domain for this test.

## Add a teacher later

The account owner can create another Email/Password user in Firebase
Authentication → Users. Create a root `users/{that exact UID}` document with:

| Field | Type | Value |
| --- | --- | --- |
| `displayName` | string | Teacher's name |
| `role` | string | `teacher` |
| `active` | boolean | `true` |

Append that teacher's UID as a string in each assigned class's `teacherUids`
array. Keep other assigned teachers' UIDs. No array of class IDs is required on
the user profile. After signing into the teacher page, a teacher with no
assignments sees the empty-state message; they do not receive every class.

Account creation, profile/assignment setup and any communication with the
teacher are manual. This update sends no account invitations or reset emails.

## Verification

```sh
npm ci --ignore-scripts
npm test
npm run test:rules
node --check teacher-login.mjs
node --check admin-login.mjs
```

The existing administrator tests remain part of `npm test`. New tests cover
teacher/admin role acceptance, student/inactive denial, session cleanup,
verified-UID class reads, unexpected class scope and safe errors. The emulator
suite uses the production teaching query for assigned-class reads and also
checks empty assignments and the administrator teaching view. It continues to
cover own-profile isolation, wrong queries, fake role claims, write denial,
subcollection isolation and access revocation.

Tests use the demo-only `demo-maplewood-classes` project and synthetic identities.
They do not connect to production or need real credentials. GitHub runs them
with the pinned tools, Node 24 and Java 21.
