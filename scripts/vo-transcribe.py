#!/usr/bin/env python3
"""Transcribe a generated voiceover with Gemini and diff it against the script.

    python3 scripts/vo-transcribe.py marketing/video/out/vo-brand-gacrux.wav

VO-QC.md's loop used ElevenLabs Scribe, which costs credits and needs a plan
this account no longer has spare. Gemini reads audio on the same key that
generated the speech, so the check now runs wherever the generation does.

The point is not a perfect transcript. It is that a defect like "four SHIPS so
far" for "four SHIPPED so far", or "a CARD that works everywhere" for "a CART
that works everywhere", is invisible in the script and inaudible to someone who
already knows what the line is meant to say. A transcriber does not know, so it
writes down what was actually said.
"""
import base64, json, os, re, subprocess, sys, urllib.request

KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = "gemini-3.6-flash"
if not KEY:
    sys.exit("No GEMINI_API_KEY")
if len(sys.argv) < 2:
    sys.exit("usage: vo-transcribe.py <audio.wav> [script.txt]")

audio = sys.argv[1]
data = base64.b64encode(open(audio, "rb").read()).decode()
body = {
    "contents": [{"parts": [
        {"text": "Transcribe this audio word for word, exactly as spoken. "
                 "Output only the transcript, no commentary, no timestamps. "
                 "Write acronyms as the letters you hear them as."},
        {"inline_data": {"mime_type": "audio/wav", "data": data}},
    ]}],
    "generationConfig": {"temperature": 0},
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}",
    data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=300) as r:
    out = json.load(r)
said = out["candidates"][0]["content"]["parts"][0]["text"].strip()

# The spoken half of SCRIPTS.brand, without the direction that is never read.
SCRIPT = """Your customers are already looking for you. They find a phone number, a WhatsApp,
and nothing else. So you answer the same four questions all day. We build the thing that
answers them for you. An online store, on your own domain. UPI, cash on delivery, GST
invoices, orders straight to WhatsApp. Fixed price, in writing, before anyone starts.
Brand Mint. Hyderabad."""
if len(sys.argv) > 2:
    SCRIPT = open(sys.argv[2], encoding="utf-8").read()

def norm(t):
    t = t.lower().replace("whatsapp", "whatsapp").replace("brandmint", "brand mint")
    t = re.sub(r"\bu\.?\s?p\.?\s?i\.?\b", "upi", t)
    t = re.sub(r"\bg\.?\s?s\.?\s?t\.?\b", "gst", t)
    return re.findall(r"[a-z']+", t)

import difflib
a, b = norm(SCRIPT), norm(said)
diff = [d for d in difflib.ndiff(a, b) if d[0] in "+-"]
name = os.path.basename(audio)
if not diff:
    print(f"  ok    {name}  transcript matches the script")
else:
    print(f"  CHECK {name}  {len(diff)} word(s) diverge")
    for d in diff[:20]:
        print(f"          {'script only' if d[0]=='-' else 'spoken only'}: {d[2:]}")
print(f"\n  heard: {said[:300]}")
