# Read-only class student lists

Both staff dashboards now have View students on each class card. The selected
class opens a roster in the same page, with Back to classes and Refresh students.
No second login or browser-stored role flag is used. Signing out, going back or
refreshing classes clears student names and invalidates pending replies. Each
refresh clears previous rows before a fresh server read. Access revocation is
checked on the next server request; an already displayed list is not a live
subscription.

## Data and access

Student roster documents live at:
`classes/{classId}/students/{studentId}`

Required fields:

| Field | Firestore type | Example |
| --- | --- | --- |
| displayName | string | Sample Student A |
| active | boolean | true |

Use an automatic document ID. This ID is a roster record ID, not a Firebase
Authentication UID. These records do not create student login accounts.
Do not add passwords, email addresses, contact details, marks or medical data to
roster documents. The page displays names and active/inactive status only, but an
authorized reader can retrieve the entire roster document through the SDK.

Active administrators can read rosters under every existing class, including
inactive classes. Active teachers can read a roster only while its parent class
is active and its teacherUids array contains their authenticated UID. Both active
and inactive student records are included. Student/anonymous/unassigned/disabled
accounts cannot read rosters. Browser writes remain denied for all roles.
Other subcollections, results, submissions, root students and collection-group
student queries remain denied. Parentless rosters are denied even to admins.
The teacher dashboard still lists only assigned active classes; administrators
use their administrator dashboard to review all classes.

Malformed records are skipped with a visible count, not silently treated as valid
students. Empty rosters and connection/access failures have separate messages.
Names are inserted using textContent. Activity/result integration is future work;
legacy Apps Script endpoints keep their existing separate authorization.

## Deployment order

1. Merge this PR into main.
2. In Firebase Console, Firestore Database → Rules, replace the existing rules
   with the complete merged firestore.rules and Publish. These rules add roster
   reads only for the staff permissions described above. Existing class/profile
   permissions are retained. No index changes are needed.
3. Copy these five frontend files from the merged commit into the original
   Hosting public folder, replacing previous versions where present:
   - admin-login.html
   - admin-login.mjs
   - teacher-login.html
   - teacher-login.mjs
   - student-roster.mjs (new)
4. Keep the existing admin-access.mjs and firebase.json. Do not replace Hosting
   firebase.json with firebase.emulators.json.
5. Deploy from the original Firebase project:
   `firebase deploy --only hosting --project maplewood-english-learning`

## Sample records and owner checks

Start with synthetic names, before importing a real class list. No sample records
are automatically written to the live project by this change or its tests.

In Firestore Data, open the root classes collection, then tm-y8-daisy-2026.
Inside that class document choose Start collection, enter students, then use an
Auto-ID document. Add displayName (string) Sample Student A and active (boolean)
true. Save. Add Sample Student B the same way. These belong under the class,
not under users and not in a root students collection.

On the teacher sign-in page, sign in with the existing assigned teacher test
account. Choose View students in 8 Daisy. Confirm both sample names, refresh,
go back and reopen. Sign out and check that no student names remain. Sign back
in on the administrator page with the administrator account and repeat.

Before adding actual students, check an unassigned teacher account cannot read
this class. The emulator suite covers direct-document and query requests for
unassigned/inactive/anonymous/student users, revoked assignments, denied writes,
parentless data and unrelated subcollections without changing live accounts.
A teacher with no class assignment should see no active classes.

## Verification

npm test runs existing staff/recovery tests and roster parsing, scope, error and
request-generation checks. npm run test:rules runs the real Firestore Emulator
permission suite; npm run test:auth retains the existing real-SDK recovery tests.
GitHub CI runs both emulators with Java 21. Browser layout/interaction checks use
isolated synthetic fixtures; production account checks are performed by the owner
after publishing rules and deploying Hosting.
