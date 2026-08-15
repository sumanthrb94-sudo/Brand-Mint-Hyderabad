#!/usr/bin/env python3
"""
Cue sheet -> mixed WAV. The voice sits at 1.0 and is never moved; effects are
delayed into place around it.

    python3 build_mix.py out/            # reads out/cues.json, writes out/mix.wav

out/cues.json:

    {
      "vo": "vo.wav",
      "cues": [
        {"sfx": "elec_blip", "t": 5.13, "gain": 0.22},
        {"sfx": "bd_tek",    "t": 7.17, "gain": 0.52}
      ]
    }

`t` is absolute seconds in the finished film — place each cue at
`scene_start + element_delay` so a tick lands with the row it belongs to, rather
than sprinkling effects over the whole thing.

The limiter is the trap. `alimiter` looks ahead and delays everything by roughly
its 5 ms window, which drifts the entire film off the captions. `atrim` puts it
back — but the delay is *not* exactly 5 ms. On ffmpeg 7.0 it measures 239
samples at 48 kHz, not the 240 the arithmetic predicts, so the figure is
measured at run time rather than assumed. Check it reads 0 samples in verify.py.
"""

import json
import os
import subprocess
import sys
import wave

SR = 48000
LIMITER = "alimiter=limit=0.94:level=disabled"


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def limiter_delay(tmp):
    """Push noise through the limiter and measure how far it moved.

    Do not hard-code this. 5 ms at 48 kHz is 240 samples, but the filter
    actually delays 239 — and a future ffmpeg may pick a different number.
    """
    import numpy as np
    src, out = os.path.join(tmp, "_cal_in.wav"), os.path.join(tmp, "_cal_out.wav")
    subprocess.run([ff(), "-y", "-v", "error", "-f", "lavfi",
                    "-i", f"anoisesrc=d=2:c=pink:r={SR}:a=0.3",
                    "-ac", "1", "-c:a", "pcm_s16le", src], check=True)
    subprocess.run([ff(), "-y", "-v", "error", "-i", src, "-af", LIMITER,
                    "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", out], check=True)

    def rd(p):
        w = wave.open(p)
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)

    a, b = rd(src), rd(out)
    n = min(len(a), len(b))
    x, y = a[:n] - a[:n].mean(), b[:n] - b[:n].mean()
    cc = np.fft.irfft(np.fft.rfft(x, 2 * n) * np.conj(np.fft.rfft(y, 2 * n)), 2 * n)
    lag = int(np.argmax(np.abs(np.concatenate([cc[-3000:], cc[:3000]])))) - 3000
    for p in (src, out):
        os.remove(p)
    return -lag if lag < 0 else 0


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out"
    sfx_dir = os.environ.get("SFX_DIR", "sfx")
    spec = json.load(open(os.path.join(out, "cues.json")))

    vo = spec["vo"]
    if not os.path.isabs(vo):
        vo = os.path.join(out, vo) if os.path.exists(os.path.join(out, vo)) else vo
    cues = sorted(spec.get("cues", []), key=lambda c: c["t"])

    inputs = ["-i", vo]
    parts = ["[0:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.0[vo]"]
    labels = ["[vo]"]

    for i, c in enumerate(cues, start=1):
        path = c["sfx"]
        if not os.path.exists(path):
            path = os.path.join(sfx_dir, c["sfx"])
            if not os.path.exists(path):
                path += ".flac"
        if not os.path.exists(path):
            sys.exit(f"missing sound effect: {c['sfx']} (looked in {sfx_dir}/)")
        ms = int(round(c["t"] * 1000))
        gain = float(c.get("gain", 0.3))
        inputs += ["-i", path]
        parts.append(
            f"[{i}:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"volume={gain},adelay={ms}|{ms}[s{i}]")
        labels.append(f"[s{i}]")

    delay = limiter_delay(out)
    chain = (f"{''.join(labels)}amix=inputs={len(labels)}:duration=first:normalize=0,"
             f"{LIMITER},"
             f"atrim=start_sample={delay},"
             f"asetpts=PTS-STARTPTS[mix]")

    mix = os.path.join(out, "mix.wav")
    cmd = [ff(), "-y", "-v", "error", *inputs,
           "-filter_complex", ";".join(parts) + ";" + chain,
           "-map", "[mix]", "-ar", str(SR), "-c:a", "pcm_s16le", mix]
    subprocess.run(cmd, check=True)

    # Keep the exact command — reproducing a mix a week later should not be
    # an act of archaeology.
    with open(os.path.join(out, "mixcmd.sh"), "w") as f:
        f.write("#!/usr/bin/env bash\n" + " ".join(
            x if x.startswith("-") or os.path.exists(x) else f"'{x}'" for x in cmd) + "\n")

    print(f"wrote {mix} — voice + {len(cues)} effects, limiter delay {delay} samples")
    print("now run verify.py; the voice offset must read 0 samples")


if __name__ == "__main__":
    main()
