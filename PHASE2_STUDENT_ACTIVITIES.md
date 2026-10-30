# First activity using student accounts

The student dashboard now includes Unit 6: Writer’s Effect Challenge, using the
two original passages, eleven questions, hints and video from
unit6-writers-effect.html. It opens inside the authenticated dashboard. Students
can save and reopen drafts, then submit once for teacher review. Submission
locks further browser edits. No automatic score is awarded.

Teachers and administrators open a class roster and choose **View Writer’s
Effect** beside a student to read their draft or submission. Drafts are clearly
labelled as still in progress. This step adds reading responses, not grading.

## Deploy after merging

1. Publish the complete updated firestore.rules in Firebase Console.
2. Copy these eight files from the merged main branch into the existing Hosting
   public folder, replacing the previous versions where present:
   student-login.html, student-login.mjs, activity-responses.mjs,
   student-roster.mjs, teacher-login.mjs, admin-login.mjs,
   teacher-login.html, admin-login.html.
3. Deploy the existing Firebase Hosting project:
   firebase deploy --only hosting --project maplewood-english-learning
4. Reload student-login.html and the staff login pages to load the new modules.

No new accounts, index, class documents, package installation, Apps Script
deployment or password change is needed. Publish rules before testing saves.
If a save fails, the UI never reports it as saved. Keep the page open until the
server confirms the write; there is no persistent offline draft storage.

## Owner checks

- Sign in as a student and open the challenge. Enter a few answers and save a
  draft. Sign out and sign in again: the draft reopens.
- Complete all eleven answers and submit. Reopening shows a read-only
  submission. Blank submissions are rejected.
- Sign in as the assigned teacher, open 8 Daisy, then choose View Writer’s
  Effect for that student. Confirm the answers and submitted status.
- Another student must see only their own work. Existing staff login restrictions
  remain in force. Emulator checks cover direct attempts to bypass the UI.
- Refreshing a profile, signing out, or closing the activity warns before
  discarding unsaved edits. Signing out clears the answers on screen.

## Data and access

One document per student:
classes/{classId}/students/{studentId}/responses/writers-effect-v1.
Fields are version (1), status (draft/submitted), answers (exactly q1–q11,
strings up to 4,000 characters each) and updatedAt (server timestamp).
Students cannot supply marks, roles, identities or other fields.

Rules require a current active student profile, active class, active roster
record, and matching authUid. Students can get only their own fixed activity
document, create it, or update a draft. Submitted documents cannot be updated or
deleted by any browser role. Staff can get responses only for classes their
existing role permits. Response listing and unknown activity IDs are denied.
Enrollment changes take effect on the next server request.

Answers use textContent/value in the UI. Pending responses from old sessions,
classes or selected students are discarded. Personal responses and auth tokens
are not saved in localStorage or sessionStorage.

The older lesson pages and Apps Script results remain separate and unchanged.
This does not migrate old submissions or grant the new login access to their
four-digit-code workflow. Only this first activity uses the new response store.
Draft saves from multiple tabs use the latest successful write; work in one tab
at a time. A successful final submission prevents later draft writes.

Official references:
- https://firebase.google.com/docs/firestore/security/rules-fields
- https://firebase.google.com/docs/reference/rules/rules.firestore.Request
