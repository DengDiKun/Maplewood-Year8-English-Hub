# One starting page for Maplewood English Learning

The normal root URL and `index.html` now show a public homepage with Student,
Teacher and Administrator sign-in links. They open the already-deployed
username/password dashboards and their current versioned entry URLs.
The homepage works without an old code profile and does not read browser
identity or role flags, load Firebase, query the old registry or collect passwords.
Each destination continues to verify its own account and access on the server.

## Earlier lessons during the transition

`earlier-hub.html` preserves the previous homepage, curriculum map, filtering,
four-digit-code login and lesson links. Its title and login heading identify the
earlier Hub; the login panel and footer link back to the new main homepage.
Its lesson-return allowlist also includes the existing speaking-assessment route.
No earlier lessons or spreadsheet records are deleted or migrated by this change.

Some existing lessons return an unsigned visitor to `index.html?next=...`.
`home-entry.mjs` forwards only the four observed local targets (Unit 8.1, 8.2,
8.3 and the speaking assessment) to the earlier Hub's existing login. That login
returns the student to the requested lesson. Missing, duplicate, external or
unrecognised targets stay on the normal new homepage. URL parameters and cached
old profiles never establish a new dashboard session or staff role.

The homepage's Earlier lessons and activities section explains when a student
needs their earlier four-digit code. Current Units 1–9 course activities continue
to use the new student account, independently of the earlier Hub.

## Deployment after merge

Copy exactly these three frontend files into the existing Firebase public folder:

- index.html (replace)
- earlier-hub.html (new)
- home-entry.mjs (new)

Keep every other existing public file. This is a replacement bundle, not a new
Firebase project. Run the usual command from the existing project folder that
contains `firebase.json`, or its public subfolder:

```text
firebase deploy --only hosting --project maplewood-english-learning
```

There are no Firestore rule, password, account, index or Apps Script changes to
publish for this update. Existing bookmark and student-work data remain intact.
Refresh the root homepage after deployment. A versioned `index.html?v=home-1`
link can be used for the first check if Chrome still has the earlier HTML cached.

## Verification

Run the existing unit suite plus the new routing regression checks. Those cover
the four actual earlier lesson return routes and reject external URLs, path
encoding, duplicate targets and unknown destinations. Required CI checks remain
in place. Browser verification should cover the three sign-in destinations,
earlier Hub access and return to the main homepage, a known lesson bookmark,
an ignored external target, and the phone layout. No real credentials or student
work are required to check these navigation changes.
