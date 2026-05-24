"""Resculpt the ElevenLabs VO with natural human pauses."""
import subprocess
from pathlib import Path

SRC = "/tmp/vo_in.mp3"
OUT = "/tmp/vo_polished.mp3"
SR = 44100

# Speech segments detected via silencedetect at -40dB threshold.
# (start, end, phrase) — extract each as a WAV, then concat with
# custom-length silences between.
SEGMENTS = [
    (0.000, 3.155, "Positioning... is the only marketing that compounds."),
    (3.395, 4.318, "Ads end."),
    (4.553, 5.903, "Positions stay."),
    (6.030, 7.005, "Logos fade."),
    (7.256, 8.444, "Positions sharpen."),
    (8.529, 9.605, "A position..."),
    (9.899, 12.242, "is the sentence your buyer says about you..."),
    (12.339, 13.713, "when you're not in the room."),
    (13.919, 16.619, "Brand Mint engineers positions that compound."),
    (16.939, 17.395, "Comment"),
    (17.572, 18.479, "'position'"),
    (18.574, 20.634, "— we'll DM your category gap."),
]

# Pause AFTER each segment. Tuned for humanly natural delivery:
#   - long pauses on emphasis (after "compounds.", "sharpen.")
#   - medium between contrasting pairs (stay/fade/sharpen)
#   - micro between CTA fragments
PAUSES = [
    0.55,   # after "compounds." — manifesto pause
    0.35,   # after "Ads end."
    0.50,   # after "Positions stay." — let punch land
    0.35,   # after "Logos fade."
    0.85,   # after "Positions sharpen." — BIG pause before define
    0.30,   # after "A position..."
    0.30,   # mid-define
    0.55,   # after "...in the room." — let metaphor settle
    0.55,   # after "Brand Mint engineers..." — agency-name pause
    0.25,   # after "Comment"
    0.30,   # after "position"
    0.20,   # final tail
]

# Pre-roll silence so the VO doesn't start right at t=0 (small handle).
PREROLL = 0.10

# Extract each segment as wav
tmp = Path("/tmp/vo_segs")
tmp.mkdir(exist_ok=True)
seg_wavs = []
for i, (s, e, _) in enumerate(SEGMENTS):
    dur = e - s
    out = tmp / f"seg_{i:02d}.wav"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", str(s), "-i", SRC, "-t", str(dur),
        "-ac", "1", "-ar", str(SR),
        str(out),
    ], check=True)
    seg_wavs.append(out)

# Generate silence wavs for each pause length
sil_wavs = {}
for p in set([PREROLL] + PAUSES):
    out = tmp / f"sil_{int(p * 1000)}ms.wav"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "lavfi", "-t", str(p),
        "-i", f"anullsrc=channel_layout=mono:sample_rate={SR}",
        str(out),
    ], check=True)
    sil_wavs[p] = out

# Build concat list
concat_list = tmp / "concat.txt"
lines = [f"file '{sil_wavs[PREROLL]}'"]
for seg, pause in zip(seg_wavs, PAUSES):
    lines.append(f"file '{seg}'")
    lines.append(f"file '{sil_wavs[pause]}'")
concat_list.write_text("\n".join(lines))

# Concat to mp3
subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", str(concat_list),
    "-c:a", "libmp3lame", "-b:a", "192k", "-ac", "1", "-ar", str(SR),
    OUT,
], check=True)

# Get duration
dur = subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", OUT,
]).decode().strip()
print(f"polished VO duration: {dur}s")
