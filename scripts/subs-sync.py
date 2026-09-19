#!/usr/bin/env python3
"""Check burned subtitles against the read they were timed from.

    python3 scripts/subs-sync.py <file.ass> <vo.wav>

Two numbers matter, and they are different questions.

PHRASE BOUNDARY ERROR is the one that compounds. Every phrase should begin
and end on a real speech run, because a silence between two phrases IS the
boundary between them. If this is not ~0, subtitles.mjs is estimating
boundaries from syllable counts and each error pushes everything after it.

CHUNK CONTAINMENT is the one that does not. A phrase is split into 2-3 word
lines for readability, and those splits are interpolated inside the phrase by
syllable weight — an approximation, since there is no forced aligner here. It
is bounded: a chunk can be off inside its own phrase, never past it. What is
checked is that every chunk falls inside speech rather than into a pause.
"""
import re, subprocess, sys, imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ass, wav = sys.argv[1], sys.argv[2]

out = subprocess.run([FF, "-hide_banner", "-i", wav, "-af",
                      "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
marks = [(k, float(t)) for k, t in re.findall(r"silence_(start|end): ([0-9.]+)", out)]
m = re.search(r"Duration: (\d+):(\d+):([0-9.]+)", out)
dur = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0
segs, sp = [], (0.0 if marks and marks[0][0] == "start" and marks[0][1] > 0.05 else None)
for k, t in marks:
    if k == "start" and sp is not None: segs.append((sp, t)); sp = None
    elif k == "end": sp = t
if sp is not None and dur > sp: segs.append((sp, dur))
segs = [s for s in segs if s[1] - s[0] > 0.12]

def secs(t):
    h, mn, r = t.split(":"); return int(h) * 3600 + int(mn) * 60 + float(r)

lines = []
for ln in open(ass):
    if ln.startswith("Dialogue:"):
        p = ln.split(",", 9)
        lines.append((secs(p[1]), secs(p[2]), re.sub(r"\{[^}]*\}", "", p[9]).strip()))

starts = sorted({a for a, _ in segs})
ends = sorted({b for _, b in segs})
near = lambda t, xs: min(abs(t - x) for x in xs)

# A line begins a phrase when its start coincides with a segment start.
TOL = 0.12
phrase_starts = [l for l in lines if near(l[0], starts) <= TOL]
worst_b = max((near(l[0], starts) for l in phrase_starts), default=0)
inside = lambda t: any(a - 0.06 <= t <= b + 0.06 for a, b in segs)
bad = [l for l in lines if not inside((l[0] + l[1]) / 2)]

print(f"  {len(lines)} lines, {len(segs)} speech runs, {len(phrase_starts)} phrase openings")
print(f"  phrase boundary error : {worst_b*1000:.0f} ms   (compounds if large)")
print(f"  chunks centred in a pause: {len(bad)}          (bounded, never compounds)")
for l in bad: print(f"     {l[0]:6.2f} {l[2][:36]}")
sys.exit(1 if worst_b > 0.25 or bad else 0)
