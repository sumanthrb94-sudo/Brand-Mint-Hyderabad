#!/usr/bin/env python3
"""Diff an intended VO script against what the voice actually said.

    python3 vo-qc.py script.txt transcript.txt

Generated speech is not proofread by generating it. Run the audio back through
transcription and diff it against what you wrote — elisions like "shipped so
far" collapsing to "ships so far" are inaudible to whoever wrote the line and
obvious to everyone else.

Normalises the things a transcriber legitimately reformats (acronym spacing,
punctuation, case) so only real divergences surface.
"""
import re, sys, difflib

def norm(t):
    t = t.lower()
    t = re.sub(r"\b([a-z])[-\s]([a-z])[-\s]([a-z])\b", r"\1\2\3", t)  # U-P-I -> upi
    t = t.replace("hi-tech", "hitech").replace("—", " ")
    t = t.replace("brand mint", "brandmint")   # transcribers write it as one token
    t = re.sub(r"[^\w\s]", " ", t)
    return t.split()

a, b = norm(open(sys.argv[1]).read()), norm(open(sys.argv[2]).read())
bad = False
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
    if tag == "equal":
        continue
    bad = True
    ctx = " ".join(a[max(0, i1 - 4):i1])
    print(f"  {tag.upper():<8} after \"...{ctx}\"")
    if a[i1:i2]: print(f"    wrote : {' '.join(a[i1:i2])}")
    if b[j1:j2]: print(f"    said  : {' '.join(b[j1:j2])}")
print("  clean — spoken audio matches the script" if not bad else "\n  ^ fix the script and regenerate")
sys.exit(1 if bad else 0)
