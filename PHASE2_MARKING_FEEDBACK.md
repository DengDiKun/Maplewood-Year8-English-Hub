# Teacher marking and published feedback

The goal is one student and teacher account system for Units 1–9. This change
adds reusable marking data, staff controls and student feedback display.
The connected Writer’s Effect activity is the first caller. Other unit pages
still use the older Hub until their activities are connected; this release does
not claim to migrate them.

## Staff workflow

Open a class roster, then View Writer’s Effect beside a student. Draft responses
remain viewable. Marking opens only after the student submits completed work.

Enter an overall mark, choose the total for that activity, and add optional
comments. Whole-number totals from 1 to 1,000 are supported. No maximum or
mark allocation is assumed from the number of questions.

- Save marking draft keeps those edits private to authorized staff.
- Publish feedback makes the current mark and comments visible to that student.
- Later private edits leave the previous published result visible until the next
  explicit publication.
- Refresh review reloads saved marking. If another staff member has changed the
  review, a stale editor must refresh before saving.

Submitted answers remain read-only. This release does not add per-question marks,
an automatic answer checker, or a resubmission workflow.

## Student workflow

Open a submitted activity. Teacher feedback appears below its response controls.
Before publication, the student sees that their work is awaiting feedback.
Refresh feedback requests the current published result from the server.
Signing out, closing the activity or refreshing the profile clears it from view.

## Deployment after merge

1. Publish the complete updated firestore.rules.
2. Copy all eleven frontend files into the existing Firebase Hosting public
   folder, replacing matching filenames:

   - student-login.html
   - student-login.mjs
   - activity-responses.mjs
   - student-roster.mjs
   - admin-login.html
   - admin-login.mjs
   - teacher-login.html
   - teacher-login.mjs
   - marking-data.mjs
   - marking-ui.mjs
   - marking.css

3. Run firebase deploy --only hosting --project maplewood-english-learning.
4. Reload the student and staff login pages.

The changed entry modules and dependencies use ?v=feedback-1 release URLs to
avoid reusing the earlier scripts after the page refreshes. Future changes to
these modules should advance that release value together.

No new accounts, class documents, index, password change or Apps Script
deployment is needed.

## Validation and first live use

Emulator tests use synthetic accounts and responses. They cover private drafts,
published feedback, invalid grades, student and unassigned-teacher denial,
revocations, and the production SDK transaction flow. Browser fixtures use
synthetic data only.

For live verification, use a student's genuinely completed submission. Avoid
submitting placeholder answers on a real student record: submission locks them.
Save a private marking draft, check the student sees no new result, publish,
then refresh student feedback and confirm the mark and comments.

## Data and access

Each activity uses its existing class/student scope:

- responses/{activityId}: the submitted response.
- markingDrafts/{activityId}: staff-only saved marking.
- feedback/{activityId}: the student-visible published result.

Marking documents contain only version (1), score, maxScore, feedback,
reviewerUid, updatedAt and submissionUpdatedAt. Server rules validate the
current staff role and class assignment, bound marks and comment length, enforce
the reviewer UID and server timestamp, and require a matching submitted response.
Students can get only feedback for their active linked enrollment and current
submission. They cannot read marking drafts, award marks, list feedback or
delete either kind of record.

The production transaction reads the submission and both marking documents
before writing. Changes since the editor loaded are rejected, including a
different submission timestamp. A publication writes the marking draft and
published result atomically. A private save writes only the draft.

All fields render with textContent/value. Request generations and authenticated
session identities prevent old requests from repopulating a closed review.
Unsaved staff edits warn on navigation; saves report success only after server
acknowledgment. Work in one activity at a time while a save is pending.

Official references:
- https://firebase.google.com/docs/firestore/security/rules-fields
- https://firebase.google.com/docs/firestore/manage-data/transactions
