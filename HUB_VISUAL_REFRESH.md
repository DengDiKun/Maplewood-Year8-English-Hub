# Maplewood Hub visual refresh

The homepage, student sign-in, chapter menu and optional extras now share an
anime-inspired illustrated style. The school’s teal, navy and gold remain, with
bold typography, comic borders, coloured chapter cards and original stickers.
Vocabulary Arena and Learning Arcade remain separate from the nine units.

## Maple and movement

Maple is an original anime-style fox learning companion. The lightweight
transparent illustration floats gently on navigation screens. Clicking or
tapping the character reveals a short encouragement. Chapter and game icons
are original SVG artwork; they have no third-party scripts or image requests.

“Reduce motion” stops decorative movement and is remembered as a browser visual
preference. The device’s reduced-motion setting is respected automatically.
Lesson reading screens have no floating mascot banner. Game animation and
keyboard/touch controls keep their existing behaviour.

The image is served locally as `assets/maple-mascot.webp` (about 75 KB). The
original was created with the built-in image generator, then resized and encoded
to WebP for delivery, preserving transparency.

Final image prompt (built-in generator):

```text
Use case: stylized-concept. Asset type: transparent cutout mascot sticker for the Maplewood Year 8 English Learning Hub. Create one original, delightful anime-inspired chibi fox student mascot named Maple, with warm orange fur, cream muzzle and tail tip, large expressive amber eyes, a playful wink, clean bold dark-navy outlines and polished cel shading. Maple wears a navy varsity jacket with teal trim, a tiny golden maple-leaf pin and simple teal sneakers. Floating in a cheerful seated pose, one paw waves towards the viewer and the other holds an open teal-and-gold book with tiny abstract marks rather than readable text. A large fluffy fox tail curls around the body. Friendly and cool for 12–14-year-old students, suitable for a school learning and retro arcade dashboard. Full character completely inside the canvas, centered with a little breathing room, strong readable silhouette and carefully drawn paws. Transparent background with no rectangle, no scenery, no ground, no drop shadow, no surrounding text, no watermark, no logos. Crisp high-quality 2D anime game sticker illustration, not photorealistic or 3D.
```

## Existing work

This is a frontend presentation update. Authentication, roles, enrollment
checks, response IDs, lesson content, draft saving and staff marking retain
their current implementation. There are no database schema or Firestore rule
changes. Browser verification uses fictional student data only.

Validation results and the final CI run are recorded on the pull request.

## One hosting deployment

After merging the pull request, extract the replacement package and copy its
contents into the existing Firebase `public` folder. Replace matching files,
merge the `assets` folder, and retain other files. The package contains ten
frontend files, including `assets/maple-mascot.webp` at that exact relative path.

Run the existing command from the Firebase project directory:

```text
firebase deploy --only hosting --project maplewood-english-learning
```

Open `index.html?v=anime-1` for the initial check. A Firestore rules publication
is not part of this visual update.
