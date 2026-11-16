# Optional background music

The homepage and student pages have a compact music player beside the motion
control. The original piano-inspired instrumental, **Maple After School**, loops
for approximately 51 seconds. It is synthesized from the notes defined in
`scripts/render_hub_music.py`, with no external recordings, samples or vocals.

- Music is always off when a page opens. It starts only after an explicit Play.
- Play/Pause, Mute/Unmute and volume are available on desktop and phone.
- Volume begins at 25%. Only the volume and mute preference are remembered;
  playback intent and account information are never stored by the player.
- Music pauses when the page is hidden, when leaving the page, when a student
  signs out, when another native media element plays, or when focus enters a
  video iframe. Returning to the page does not start it again.
- Playback errors offer a retry instead of claiming that music is playing.
- Native audio playback is routed through a GainNode when available so the
  volume control works on mobile browsers too, with native volume as fallback.

The MP3 is served from the existing project and is about 405 KB. It uses
`preload="none"`, rather than downloading or starting it as part of sign-in.
The 64 kbps stereo track has deliberately gentle dynamics and no loud effects.
To regenerate it, run the included Python script with NumPy and ffmpeg available;
the hosting package already includes the finished audio file.

The player follows the media playback promise rather than assuming that a play
request succeeded. Reference: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play>.

Validation includes controller tests for silent startup, validated preferences,
explicit playback, mute/volume, cancelled starts, failed playback, external
pauses and disposal. Final browser and CI results are recorded on the pull
request. Browser checks use fictional student data.

## One hosting deployment

After merging the pull request, copy the seven frontend replacement files into
the existing Firebase `public` folder, retaining the `assets` directory:

- index.html
- student-login.html
- hub-visuals.mjs
- hub-music.mjs
- hub-music-state.mjs
- hub-music.css
- assets/maple-study-loop.mp3

The package contains seven files, including the MP3. Merge its `assets` folder
with the existing folder and retain all other public files. Then run:

```text
firebase deploy --only hosting --project maplewood-english-learning
```

Open `index.html?v=music-1` for the first check. No database or Firestore rules
change is part of this update.
