"""Render an original piano-inspired study loop; needs NumPy and ffmpeg.

Usage: python3 scripts/render_hub_music.py assets/maple-study-loop.mp3
All notes and synthesis are defined here. No recordings, samples or vocals.
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import wave
import numpy as np

RATE = 32000
BPM = 76
BEAT = 60 / BPM
BARS = 16
SAMPLES = round(BEAT * 4 * BARS * RATE)
rng = np.random.default_rng(8216)
mix = np.zeros((SAMPLES, 2), dtype=np.float64)


def note(midi, when, velocity=0.4, length=3.6, pan=0.0, bass=False):
    t = np.arange(round(length * RATE)) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    tone = np.zeros_like(t)
    partials = [1, .22, .105, .035, .012] if not bass else [1, .13, .025]
    for harmonic, amplitude in enumerate(partials, 1):
        # The upper partials decay faster than the warm fundamental.
        tone += amplitude * np.sin(2 * np.pi * frequency * harmonic *
                                  (1 + .00012 * harmonic) * t) * np.exp(-t * (.55 + harmonic * .43))
    envelope = (1 - np.exp(-t / .008)) * np.minimum(1, (length - t) / .2)
    tone *= envelope * velocity
    stereo = np.stack([tone * np.sqrt((1-pan)/2), tone * np.sqrt((1+pan)/2)], axis=1)
    # Wrap the note's release into the beginning to preserve the loop seam.
    positions = (round(when * RATE) + np.arange(len(t))) % SAMPLES
    np.add.at(mix, positions, stereo)


# A light, original 16-bar arrangement in C major, with a second-phrase variation.
chords = [
    [53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62], [57, 60, 64, 67],
    [50, 53, 57, 64], [55, 59, 62, 65], [48, 55, 59, 62], [48, 52, 55, 62],
    [53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62], [57, 60, 64, 67],
    [50, 53, 57, 64], [55, 59, 62, 65], [48, 55, 59, 62], [48, 52, 55, 62]
]
melody = [
    [(1, 76), (2.5, 74)], [(1.5, 71)], [(0.5, 74), (2.5, 71)], [(1, 72), (3, 76)],
    [(1, 77), (2.5, 76)], [(1, 74), (3, 71)], [(1, 72), (2.5, 71)], [(2, 67)],
    [(1, 76), (2.5, 79)], [(1.5, 76), (3, 74)], [(0.5, 71), (2.5, 74)], [(1, 76)],
    [(1, 77), (3, 76)], [(1, 74), (2.5, 71)], [(1, 72), (3, 74)], [(1.5, 72)]
]
for bar, chord in enumerate(chords):
    onset = bar * 4 * BEAT
    note(chord[0]-12, onset, .23, 4.2, -.05, bass=True)
    for step, index in enumerate([0, 2, 1, 3, 2, 1, 3, 2]):
        swing = .045 if step % 2 else 0
        note(chord[index]+12, onset+(step*.5+swing)*BEAT,
             .17 + rng.uniform(-.016, .016), 3.8, [-.24, .18, -.1, .28][index])
    for beat, pitch in melody[bar]:
        note(pitch, onset+beat*BEAT, .25, 4.6, .12)

# Low-level circular room reflections, without loud transients or a vinyl hiss.
dry = mix.copy()
for seconds, level in [(.11, .14), (.23, .09), (.37, .055), (.61, .025)]:
    reflection = np.roll(dry[:, ::-1], round(seconds*RATE), axis=0)
    mix += level * reflection
rms = float(np.sqrt(np.mean(mix**2)))
mix *= .105 / max(rms, 1e-8)
peak = float(np.max(np.abs(mix)))
if peak > .68:
    mix *= .68 / peak
output = Path(sys.argv[1] if len(sys.argv)>1 else 'assets/maple-study-loop.mp3')
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as scratch:
    wav = Path(scratch) / 'maple-study-loop.wav'
    with wave.open(str(wav), 'wb') as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                    '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', str(RATE),
                    '-metadata', 'title=Maple After School — Original Study Loop',
                    '-metadata', 'artist=Maplewood Learning Hub',
                    '-metadata', 'comment=Original synthesized instrumental; no samples or vocals.',
                    str(output)], check=True)
print(json.dumps({'file': str(output), 'seconds': SAMPLES/RATE,
                  'bytes': output.stat().st_size, 'peak': float(np.max(np.abs(mix))),
                  'rms': float(np.sqrt(np.mean(mix**2))),
                  'loop_edge_step': float(np.max(np.abs(mix[0]-mix[-1])))}))
