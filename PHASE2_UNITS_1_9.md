# Units 1–9 in the verified student dashboard

Students can choose any of nine units after the existing username/password login.
The connected catalogue contains 47 reading response activities, 27 writing,
speaking/reflection and language activities, and the existing Unit 6 Writer’s
Effect Challenge: 75 separately saved activities.

## Content carried over

Unit titles, textbook page references, reading titles, extension prompts, outcomes,
video links and two-question practice checks are carried over from
`unit-course.html`. No missing publisher passages or exact textbook questions
have been invented. Students use the textbook reading assigned by their teacher;
speaking activities accept a written plan or reflection, not an audio upload.

The original Writer’s Effect texts, hints and eleven questions remain intact.
Its document ID (`writers-effect-v1`) and answer keys (`q1` to `q11`) are unchanged,
so existing drafts, submissions and published feedback still open in Unit 6.

The Skill Lab remains an unsaved practice check, as before, and now explicitly
says that its answers are not submitted. It does not create official grades.

Existing standalone lessons, games, exam practice and Apps Script pages remain
available through the earlier Hub. This change connects the nine-unit course
response tasks; it does not migrate those separate activities or their historical
spreadsheet submissions. The earlier pages and backend are not rewritten.

## Student and staff workflow

Students choose a unit, then an activity. Save draft waits for the Firestore
server acknowledgement. Reopening the same activity fetches that student's saved
work from the server. All answers are required for final submission; submitted
answers remain read-only. Published feedback uses the existing shared marking
workflow for that exact activity.

Staff open a class and select a unit and activity above its roster. View activity
beside a student shows the question prompts and that student's answers. Marking
is available only for submitted work. Unit 6 / Writer’s Effect is the initial
staff selection so earlier saved work stays easy to find.

Activity switching, returning to units, profile refresh and sign-out check for
unsaved changes. Navigation waits during a save or load. Signing out removes the
current responses and feedback. Destroyed activity editors remove their unload
listeners and discard late requests from previous activities or sessions.

## Data and security

There is no new account setup, password change, index or Apps Script deployment.
Each response stays under the authenticated student's existing class/student
record. Client helpers allow only registered catalogue IDs. Server rules
independently allow the known activity IDs and require exactly three bounded text
answers for reading, one for each extension, or eleven for Writer’s Effect.
Unknown IDs, additional answer fields, client scores and identities, missing or
oversized answers and incomplete submissions are rejected. Students cannot list
responses, read another student's answers, alter submitted work or publish marks.
Current enrollment and staff assignment checks remain in force.

## Deployment after merge

Publish the complete updated `firestore.rules`, then replace these files in the
original Firebase Hosting **public** folder:

- student-login.html
- student-login.mjs
- activity-responses.mjs
- student-roster.mjs
- admin-login.html
- admin-login.mjs
- teacher-login.html
- teacher-login.mjs
- marking-ui.mjs
- learning-catalogue.mjs (new)
- learning-units.mjs (new)
- learning-units.css (new)

Retain every other existing public file, including `marking-data.mjs`,
`marking.css`, `student-access.mjs` and `admin-access.mjs`. Run the usual deployment
from the existing project containing `firebase.json` (or its public subfolder):

```text
firebase deploy --only hosting --project maplewood-english-learning
```

This replacement bundle is not a separate Firebase project. Do not run Firebase
initialisation or deploy the replacement folder on its own. Entry scripts and
changed module imports share the `?v=units-1-9-v1` release URL.

## Validation

Unit tests compare all nine units against the existing source curriculum,
exercise the registered IDs and answer shapes, and retain the original Writer’s
Effect payload. Emulator checks save and reopen all 75 activities, validate and
lock each submitted response, reject cross-student and unknown-activity access,
publish separate private and public feedback for every unit, and check revocation.
Existing authentication, roster, response and marking checks remain required.
Browser checks use fictional accounts and local fixtures; no real student answer
or mark is changed by implementation checks.

For owner verification, use drafts to test several units and reopen them after
signing in again. Check that the original Writer’s Effect draft is still present.
Final submission and marking should use genuinely completed work rather than
placeholder answers on a real student's record.
