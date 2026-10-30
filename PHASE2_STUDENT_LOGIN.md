# Student username sign-in

This stage adds student-login.html, student-login.mjs and student-access.mjs.
Students use their existing school username and a separate Learning Hub password.
The page shows only their own verified profile and class summary. Activities,
results, student password changes and migration of legacy Apps Script pages are
future work. The existing homepage and staff sign-in pages are unchanged.

## Authentication and enrollment

A case-insensitive username containing 1–64 ASCII letters/digits maps to
`lowercaseusername@students.maplewood.invalid` for Firebase Email/Password Auth.
This is an internal login identifier, not a deliverable email address. Original
username capitalization is retained in the profile. No directory lookup is
exposed to anonymous users. Students ask their teacher for sign-in help; this
page does not send recovery emails to the internal identifier.

The page uses the same Firebase Hosting init configuration, SDK 13.1.0 and
in-memory Auth persistence as the staff pages. Reload requires signing in again.
After authentication, it reads users/{authenticatedUid} from the server. The UI
accepts only an active student profile with the expected username/alias and
complete class fields. A rejected profile closes the session. Refresh clears old
personal data before the server read. Sign-out clears the panel and invalidates
pending replies. No role/auth data is written to browser storage.

Firestore independently permits a student's own active profile read only when:
- its parent class is active;
- the referenced roster record is active;
- that roster record's authUid equals the authenticated UID.

Students cannot list users, read another profile, read class documents, read even
their own roster document, list any roster, write data, or access results or
submissions. Class summaries in the student profile are written by the trusted
setup script; they are not a directory of classmates or teacher UIDs. Class,
roster and profile deactivation block the next profile server read. This page is
not a live permission-change subscription. Existing staff/roster rules remain.

## Private setup script

scripts/provision_students.py is generic; it contains no actual usernames,
student names, passwords or private-file contents. Run it privately in Cloud
Shell using the Google account that owns the Firebase project. No packages or
service-account key are required. It obtains an access token through gcloud and
uses Google Authentication/Firestore REST APIs for this fixed project/class.

Use the previously prepared 8_Daisy_Learning_Hub_Accounts_PRIVATE.json from the
private ZIP. Keep that JSON, its teacher login sheet and the ZIP out of GitHub and
Hosting public. Distribute only each student's own login after live testing.

Default invocation is read-only preview:

```sh
python3 provision_students.py --file 8_Daisy_Learning_Hub_Accounts_PRIVATE.json
```

After reviewing the names and create/resume/ready statuses:

```sh
python3 provision_students.py --file 8_Daisy_Learning_Hub_Accounts_PRIVATE.json --apply
```

The script validates all 23 entries and their existing roster records before any
write. It verifies the class is TM / 8 Daisy / 2026 and active. Each username has a
stable reserved UID and internal alias. Existing UID/email collisions, disabled
accounts, changed names, incorrect profiles and conflicting bindings stop setup.

It creates missing Auth accounts and atomically creates each users/{uid} profile
with an authUid binding on its existing roster record. The roster update preserves
all other fields and requires its previously read updateTime; profile creation
requires that no profile exists. The profile contains displayName, username,
role=student, active=true, classId, studentId, className, branch, yearGroup,
academicYear and provisioningVersion. Passwords go only to Authentication and are
not included in Firestore, terminal output or repository files.

Auth creation and Firestore commits are separate services: partial setup is
possible. An Auth account without its linked profile grants no student data
access. If interrupted, run preview again and rerun --apply after reviewing; it
resumes missing bindings without resetting existing passwords. Complete matching
accounts are skipped. No accounts/records are deleted. The script never resets
an existing password or reenables an existing disabled account. If an owner
changes an Auth password later, the original teacher sheet will no longer match;
setup verification checks identity/binding, not existing password equality.

## Deployment and owner checks

1. Merge the PR. Publish the complete merged firestore.rules in Firebase Console.
2. Copy these three new files into the original Hosting public folder:
   student-login.html, student-login.mjs, student-access.mjs.
   Keep the existing admin-access.mjs beside them; do not change firebase.json.
3. Deploy Hosting with the existing command:
   `firebase deploy --only hosting --project maplewood-english-learning`
4. Download scripts/provision_students.py from the merged repository. Upload it
   and the private JSON to Cloud Shell. Run preview, then --apply as above.
5. Open https://maplewood-english-learning.web.app/student-login.html. Privately
   choose one prepared login from the teacher sheet and confirm that student's
   name and 8 Daisy. Check Refresh my profile, sign-out and rejection of a wrong
   password. Reload requires signing in again. Do not send credentials in chat.
6. Confirm a student cannot sign in to administrator/teacher pages. The emulator
   tests cover direct unauthorized reads and profile/class/roster revocation.

No Firestore index changes, real student email addresses, extra backend service,
paid Firebase tier, or legacy endpoint changes are part of this stage. The
reserved alias is only an implementation detail, not text students must type.

## Verification

npm test covers existing access/recovery/roster functions and the student helper.
npm run test:rules checks Firestore access isolation and revocation.
npm run test:auth keeps the staff password-recovery tests.
npm run test:student runs Auth and Firestore together: actual SDK username login,
wrong-password rejection, revoked enrollment/session cleanup, denied collections,
and the production Python provisioning REST protocol with synthetic accounts.
The latter covers preview, 23 account/profile links, interrupted-run resume,
unchanged rerun and a real emulator password sign-in.
Python unit tests cover manifest scope, duplicates, preflight conflicts, no-write
preview, resume and protection of existing staff profiles. Browser checks use
isolated synthetic SDK fixtures. Production account creation/deployment and live
student sign-in remain owner steps.

References:
- https://firebase.google.com/docs/auth/admin/manage-users
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects/accounts
- https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit
