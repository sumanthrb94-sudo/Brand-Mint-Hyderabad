#!/usr/bin/env python3
"""
Verify the delivered MP4 — not the sources it was built from.

    python3 verify.py out/

Exits non-zero if any check fails. Do not ship on a failing report.
"""

import json, os, subprocess, sys, wave
import numpy as np


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def load(path):
    w = wave.open(path)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)
    if w.getnchannels() == 2:
        a = a.reshape(-1, 2).mean(1)
    return a, w.getframerate()


def offset_samples(a, b, limit=3000):
    n = min(len(a), len(b))
    x, y = a[:n] - a[:n].mean(), b[:n] - b[:n].mean()
    f, g = np.fft.rfft(x, 2 * n), np.fft.rfft(y, 2 * n)
    cc = np.fft.irfft(f * np.conj(g), 2 * n)
    cc = np.concatenate([cc[-limit:], cc[:limit]])
    return int(np.argmax(np.abs(cc))) - limit


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out"
    mp4 = os.path.join(out, "reel.mp4")
    words = json.load(open(os.path.join(out, "words.json")))
    log = json.load(open(os.path.join(out, "render-log.json")))
    scenes = json.load(open(os.path.join(out, "scenes.json")))["scenes"]
    by_frame = {r["i"]: r for r in log}
    fails = []

    # A · the voice must sit exactly where it did in the source.
    # Compare at the delivery rate, 48 kHz. Measuring at 24 kHz halves the
    # resolution and quietly rounds a one-sample error away to zero.
    src_wav = os.path.join(out, "vo48k.wav")
    subprocess.run([ff(), "-y", "-v", "error", "-i", sys.argv[2] if len(sys.argv) > 2 else
                    os.path.join(out, "vo.wav"), "-ac", "1", "-ar", "48000",
                    "-sample_fmt", "s16", src_wav], check=True)
    got_wav = os.path.join(out, "mp4-audio.wav")
    subprocess.run([ff(), "-y", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000",
                    "-sample_fmt", "s16", got_wav], check=True)
    src, sr = load(src_wav)
    got, _ = load(got_wav)
    lag = offset_samples(src, got)
    peak_db = 20 * np.log10(max(np.abs(got).max(), 1) / 32768)
    print(f"A  voice offset                {lag:+d} samples ({lag / sr * 1000:+.2f} ms)")
    print(f"   peak level                  {peak_db:.2f} dBFS")
    if lag != 0:
        fails.append("A: voice is offset from the source")
    if peak_db >= 0:
        fails.append("A: audio is clipping")

    # B · decoded frames must match what was rendered
    from PIL import Image
    worst, probes = 0.0, 0
    for i, w in enumerate(words[:: max(1, len(words) // 24)]):
        t = (w["s"] + w["e"]) / 2
        fi = int(round(t * 30))
        shot = os.path.join(out, f"probe_{i}.png")
        subprocess.run([ff(), "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", mp4,
                        "-frames:v", "1", shot], check=True)
        ref = os.path.join(out, "frames", f"{fi:05d}.png")
        if not os.path.exists(ref):
            continue
        a = np.asarray(Image.open(shot).convert("RGB"), dtype=np.int16)
        b = np.asarray(Image.open(ref).convert("RGB"), dtype=np.int16)
        if a.shape == b.shape:
            worst = max(worst, float(np.abs(a - b).mean())); probes += 1
        os.remove(shot)
    print(f"B  frame match ({probes} probes)      worst mean delta {worst:.2f}/255")
    if worst > 12:
        fails.append("B: decoded frames differ from the render")

    # D/E · captioned words must be lit on their own syllable
    caption_words = []
    for sc in scenes:
        if sc.get("mode") in ("support", "broll"):
            caption_words += list(range(sc["words"][0], sc["words"][1] + 1))
    missD = [words[i]["w"] for i in caption_words
             if (r := by_frame.get(int(round(((words[i]["s"] + words[i]["e"]) / 2) * 30)))) is None
             or words[i]["w"] not in [z.strip() for z in r["active"]]]
    missE = [words[i]["w"] for i in caption_words
             if (r := by_frame.get(int(round(((words[i]["s"] + words[i]["e"]) / 2) * 30))))
             and words[i]["w"] not in r["caption"]]
    n = len(caption_words)
    print(f"D  word lit at its midpoint    {n - len(missD)}/{n}")
    print(f"E  spoken word on screen       {n - len(missE)}/{n}")
    if missD:
        fails.append(f"D: not highlighted — {missD[:5]}")
    if missE:
        fails.append(f"E: not on screen — {missE[:5]}")

    # F · no silent gap in the captions once speech has started
    gaps = [r for r in log if words[0]["s"] <= r["t"] <= words[-1]["e"]
            and scenes[r["scene"]].get("mode") in ("support", "broll")
            and not r["caption"].strip()]
    print(f"F  caption gaps                {len(gaps)} frames")
    if gaps:
        fails.append("F: captions dropped out mid-speech")

    # G · the duplication rule — captions must never sit on a type scene
    dupes = [r for r in log if r["caption"].strip() and scenes[r["scene"]].get("mode") == "type"]
    print(f"G  caption over hero type      {len(dupes)} frames")
    if dupes:
        fails.append("G: the same words are on screen twice")

    print()
    if fails:
        print("FAILED:"); [print("  ·", f) for f in fails]
        sys.exit(1)
    print("All checks pass. Clear to post.")


if __name__ == "__main__":
    main()
