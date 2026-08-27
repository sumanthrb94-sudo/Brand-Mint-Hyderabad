#!/usr/bin/env python3
"""
Transcribe a voiceover and give every word of the known script a real timestamp.

The script is known, so the job is timing, not wording. A Zipformer transducer
supplies per-token timestamps; the known script is then aligned onto them, which
keeps true timing while discarding the model's mishearings ("BRANDMENT",
"RAZOR PAY", "GSD").

    python3 transcribe_align.py vo.wav "$(cat script.txt)" out/

Writes out/words.json  [{w, s, e}, …]  and out/meta.json {duration, phrases}.
"""

import json, os, statistics, sys, wave
import difflib
import numpy as np

MODEL = os.environ.get("ZIPFORMER_DIR", "models/sherpa-onnx-zipformer-gigaspeech-2023-12-12")
SR = 16000


def to_16k(src, dst):
    import imageio_ffmpeg, subprocess
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, "-y", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR),
                    "-sample_fmt", "s16", dst], check=True)


def load(path):
    w = wave.open(path)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    return a, w.getframerate()


def speech_chunks(sig, sr, max_len=18.0):
    """Split on silence. The models have a length limit; long reads must chunk."""
    hop = int(sr * 0.01)
    env = np.array([np.sqrt((sig[i:i + hop] ** 2).mean()) for i in range(0, len(sig) - hop, hop)])
    env /= max(env.max(), 1e-9)
    floor = statistics.median(sorted(env)[: max(1, len(env) // 10)])
    voiced = env > max(floor * 3.5, 0.045)

    i = 0                                   # close pauses under 300 ms
    while i < len(voiced):
        if not voiced[i]:
            j = i
            while j < len(voiced) and not voiced[j]:
                j += 1
            if 0 < i and j < len(voiced) and (j - i) < 30:
                voiced[i:j] = True
            i = j
        else:
            i += 1

    segs, i = [], 0
    while i < len(voiced):
        if voiced[i]:
            j = i
            while j < len(voiced) and voiced[j]:
                j += 1
            if j - i >= 12:
                segs.append((i / 100, j / 100))
            i = j
        else:
            i += 1
    if not segs:
        return [(0.0, len(sig) / sr)], []

    chunks, (cs, ce) = [], segs[0]
    for a, b in segs[1:]:
        if b - cs > max_len:
            chunks.append((cs, ce)); cs, ce = a, b
        else:
            ce = b
    chunks.append((cs, ce))
    return chunks, segs


def decode(sig, chunks):
    import sherpa_onnx
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{MODEL}/encoder-epoch-30-avg-1.int8.onnx",
        decoder=f"{MODEL}/decoder-epoch-30-avg-1.onnx",
        joiner=f"{MODEL}/joiner-epoch-30-avg-1.int8.onnx",
        tokens=f"{MODEL}/tokens.txt", num_threads=4)
    heard = []
    for a, b in chunks:
        lo, hi = max(0, int((a - .15) * SR)), min(len(sig), int((b + .15) * SR))
        st = rec.create_stream(); st.accept_waveform(SR, sig[lo:hi]); rec.decode_stream(st)
        off, started = lo / SR, False
        for tok, ts in zip(st.result.tokens, st.result.timestamps):
            # A leading space marks a new word in this model's BPE vocabulary.
            if tok.startswith(" ") or not heard or not started:
                heard.append({"w": tok.strip(), "s": float(ts) + off}); started = True
            else:
                heard[-1]["w"] += tok
    return heard


def align(heard, script, duration):
    """Map the known script onto heard timings, then fill any gap by spacing."""
    norm = lambda s: "".join(c for c in s.lower() if c.isalnum())
    sm = difflib.SequenceMatcher(a=[norm(h["w"]) for h in heard],
                                 b=[norm(x) for x in script], autojunk=False)
    times = [None] * len(script)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(j2 - j1):
                times[j1 + k] = heard[i1 + k]["s"]
        elif tag == "replace":
            span = max(1, i2 - i1)
            for k in range(j2 - j1):
                times[j1 + k] = heard[min(i1 + int(k * span / max(1, j2 - j1)), len(heard) - 1)]["s"]

    direct = sum(t is not None for t in times)
    for i, t in enumerate(times):
        if t is None:
            prv = next((times[j] for j in range(i - 1, -1, -1) if times[j] is not None), 0.0)
            nxt = next((times[j] for j in range(i + 1, len(times)) if times[j] is not None), duration)
            gap = sum(1 for j in range(i, len(times)) if times[j] is None)
            times[i] = prv + (nxt - prv) / (gap + 1)
    for i in range(1, len(times)):                       # keep it monotonic
        if times[i] <= times[i - 1]:
            times[i] = times[i - 1] + 0.06

    words = []
    for i, (w, t) in enumerate(zip(script, times)):
        nxt = times[i + 1] if i + 1 < len(times) else duration
        e = min(nxt - 0.02, t + 1.0)
        if e <= t + 0.05:
            e = t + 0.14
        words.append({"w": w, "s": round(t, 3), "e": round(e, 3)})
    return words, direct


def main():
    if len(sys.argv) < 4:
        sys.exit("usage: transcribe_align.py <vo.wav> <script text> <out dir>")
    src, script_text, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)

    wav16 = os.path.join(out, "vo16k.wav")
    to_16k(src, wav16)
    sig, sr = load(wav16)
    duration = len(sig) / sr

    chunks, segs = speech_chunks(sig, sr)
    heard = decode(sig, chunks)
    script = script_text.split()
    words, direct = align(heard, script, duration)

    json.dump(words, open(os.path.join(out, "words.json"), "w"), indent=0)
    json.dump({"duration": round(duration, 3), "phrases": segs,
               "heard": " ".join(h["w"] for h in heard)},
              open(os.path.join(out, "meta.json"), "w"), indent=1)

    print(f"{len(words)} words over {duration:.2f}s · {direct}/{len(script)} aligned directly")
    print(f"{len(segs)} speech phrases detected — scene cuts should land on these")


if __name__ == "__main__":
    main()
