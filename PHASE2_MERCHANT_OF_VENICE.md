# Unit 8.1 in the verified student dashboard

Unit 8 now includes **8.1 The Merchant of Venice — Interactive lesson**. It keeps
the earlier lesson's three extracts, casket riddles, artwork, attitude/moral
choices, written explanations, evidence bank and final interpretation across its
five pages. Students use their current account and the shared Save draft,
Submit for teacher review and published feedback controls.

The earlier standalone pages and spreadsheet records remain available through
the earlier Hub. They are not deleted, imported or overwritten. The existing
three-question `unit-8-reading-1-v1` activity also remains separate, preserving
any saved course response. The new full lesson uses `unit-8-merchant-v1`.
Unit 8.2 and 8.3 standalone lessons are still on the earlier workflow.

## Saved answers and marks

All twelve response fields are saved: six character choices, two moral-lesson
explanations, the selected viewpoint and quotation, its explanation and the
final interpretation. Drafts may be incomplete. A final submission requires all
twelve fields, locks editing, and enables the shared staff marking workflow.
After signing in again, the five-page lesson opens from page one with the saved
choices and writing restored. Page navigation remains usable on submitted work.

The existing practice checks still help students improve. Practice points are
calculated from the current answers, so repeated clicks do not award extra
points. They are not saved as an official teacher mark. Check explanation gives
local guidance; only Save draft or final submission reports a server save.
The shared published-feedback panel shows the actual staff mark and comments.

The lesson has no separate login, browser-stored identity, Apps Script request
or cross-window authentication bridge. Its authored HTML and CSS are isolated
from the dashboard styling; student answers are assigned with value/textContent.
Server requests always use the dashboard's current verified profile and session.

## Rules and validation

The new activity has exactly twelve bounded text fields. Server rules check the
known choices independently, allow empty draft fields, reject incomplete final
submissions, extra fields, forged client grades and cross-student access, and
retain the existing enrollment, assignment and final-submission protections.
Marking uses the shared private draft and published result documents.

Tests retain the original texts and controls, check exact choice schemas, and
exercise the production Auth and Firestore SDK flow through draft save, fresh
sign-in, restore, submit, lock, private review, publication and revocation.
Existing course and security checks remain required. Browser checks use only
fictional accounts and answers.

## Deployment after merge

1. Publish the complete updated `firestore.rules`.
2. Copy these fifteen frontend files into the existing Firebase public folder:

   - index.html
   - student-login.html
   - student-login.mjs
   - admin-login.html
   - admin-login.mjs
   - teacher-login.html
   - teacher-login.mjs
   - student-roster.mjs
   - activity-responses.mjs
   - learning-catalogue.mjs
   - learning-units.mjs
   - marking-ui.mjs
   - merchant-data.mjs (new)
   - merchant-content.mjs (new)
   - merchant-lesson.mjs (new)

3. Retain all other public files, then run the usual Firebase hosting deployment
   from the original project containing `firebase.json`, or its public subfolder.

```text
firebase deploy --only hosting --project maplewood-english-learning
```

Entry modules, changed imports and homepage dashboard links use `?v=merchant-1`.
Open `index.html?v=merchant-1` for the first browser check to avoid an older
cached homepage. No new accounts, passwords, composite indexes or Apps Script
deployment are required.

For owner verification, open the new interactive lesson from Unit 8 in the student
dashboard. Save a partial draft, sign out and sign in again, and check both the
choices and writing. Review the same draft through the teacher activity selector.
Use genuinely completed work for a final submission and published feedback;
test-only placeholder answers should remain drafts on a real student's record.
