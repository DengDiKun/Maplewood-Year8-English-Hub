# Units 1–9, pre-learning and independent extras

This is one combined release for the existing Firebase Learning Hub. Students
keep their current username/password account. Staff keep their current verified
role and class assignments.

## Lessons and pre-learning

Every saved activity in Units 1–9 now has an optional pre-learning panel with a
unit illustration, an interactive picture/wording challenge and the unit's
existing video or learning-resource link. The challenge gives immediate
feedback. Video embeds include the origin referrer required by YouTube, a
separate watch link, and a picture/discussion alternative when the video is
unavailable. The eight existing YouTube unit video links were checked against
YouTube's oEmbed metadata during implementation.

The six remaining authored standalone lessons join the verified dashboard:

| Unit | Lesson | Saved responses |
| --- | --- | ---: |
| 2 | Climbing the mountains alone | 4 |
| 3 | Oak Island Mystery | 4 |
| 6 | Monsters below ground | 1 |
| 7 | The Plantation, Activities 4 and 5 | 4 |
| 8 | Life choices | 27 |
| 8 | Making decisions | 27 |

The original supplied reading passages, recovered quotations, visuals,
instructions and answer-method examples are retained. Existing textbook-only
response tasks still use the assigned textbook: missing publisher passages and
exact questions have not been invented. The full lessons have their own menu
section, and the existing course responses remain separately accessible.

Life choices and Making decisions preserve their pre-learning checks. Watching
the video or reading the fallback scenario and answering the quiz correctly
unlocks the lesson. Draft saving includes the quiz answers, checklist choices,
feeling-word selections, group decision and written responses. Making decisions
retains the 120-word submission minimum for its account, with a 150-word target.
Optional planning checklists and feeling-word selections do not block submission.
Post-submission method guides appear only after a confirmed submission.

The earlier Unit 6 Writer's Effect and Unit 8.1 Merchant of Venice activities
keep their document IDs, answer shapes, saved work and feedback. All other
existing course response IDs are retained as well.

## Separate extras

The dashboard has a distinct Extras area. Vocabulary and arcade games open
independently of lessons and do not read or write lesson responses or official
marks.

- **Unlimited Vocabulary Arena:** 69 words across A2, B1 and B2; definitions,
  sentence gaps, synonyms, antonyms, word families and mixed challenges. Students
  choose endless play or 10/20-question rounds. The pool reshuffles when used up;
  there is no round limit. Immediate explanations, accuracy, streak badges and
  words to revisit belong to the current practice session.
- **Block Stacker:** falling-block play, rotations, wall collision, line clears,
  level progression, hard/soft drop, pause and restart.
- **Maze Chase:** an original connected maze, collectibles, power items, three
  lives, moving chasers, pause, win/loss and restart.
- **Word Match:** six word/meaning pairs, move count, matching feedback and
  repeatable shuffled boards.

The arcade supports keyboard and on-screen controls. It stops its animation,
timers and keyboard handlers when closed or when the student signs out. The
action games pause when their browser tab is hidden. Game points and badges
reset with the session; they are not submitted as teacher grades.

The two complete existing reading papers also appear under Extras: the
four-section reading exam practice (35 response fields) and The Haze Strikes
Back (32). Their reading material, choices, hints and guidance are retained.
Accessible selects replace drag-only matching/gap controls. These papers use
the same save/submit/teacher-feedback workflow as lessons. Fixed-choice practice
checks are clearly separate from the teacher's published mark; open writing is
reviewed by the teacher. The practice papers bring the registered total to 84
independently saved activities.

## Data and validation

New lesson/practice responses use independent document IDs under each student's
existing enrollment. Exact answer keys, bounded text, permitted choices,
pre-learning completion, required selection counts and the minimum account
length are validated by server rules. Shared enrollment lookups are reused to
keep the longer papers inside Firestore's evaluation limit, while retaining
active profile/class/roster checks, authenticated ownership and current staff
assignment requirements. Unknown activities, spoofed grades, extra fields,
cross-student reads and edits to submitted answers remain denied.

Teachers choose a unit or Extras, select the activity and review the responses.
Private marking drafts and student-visible published feedback remain separate.
Existing earlier-Hub pages, topic-booking tools and historical spreadsheet
records remain available through the earlier Hub; they are not rewritten or
imported by this release.

The automated suite includes source/shape regression checks, game engine
invariants, all 84 activity round trips and the real Auth/Firestore SDK flow for
the eight new response activities. Browser QA uses fictional accounts only.
Final CI and browser results are recorded on the pull request.

## One deployment after merge

1. Publish the complete updated `firestore.rules` once.
2. Copy the combined frontend replacement package into the existing Firebase
   `public` folder. Replace matching files and retain every other public file.
3. Run the usual hosting command from the original Firebase project:

```text
firebase deploy --only hosting --project maplewood-english-learning
```

The replacement package contains these twenty frontend files:

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
- merchant-lesson.mjs
- rich-lessons-data.mjs (new)
- rich-lessons-content.mjs (new)
- rich-lessons.mjs (new)
- pre-learning.mjs (new)
- learning-games.mjs (new)
- game-logic.mjs (new)
- vocabulary-bank.mjs (new)

Changed entry points and imports use `?v=hub-complete-1`. Open
`index.html?v=hub-complete-1` for the first live check. No new accounts, passwords,
composite indexes or Apps Script deployment are required. Check partial draft
restoration on a real account, and reserve final submission for genuinely
completed work rather than placeholder answers.
