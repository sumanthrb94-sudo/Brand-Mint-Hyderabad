#!/usr/bin/env python3
"""Re-resolve an existing generated image at 4K, keeping the same picture.

    GEMINI_API_KEY=... python3 scripts/upscale.py images/ppl-*.png

Not a resampler. The image is sent back to gemini-3-pro-image with imageSize
4K and an instruction to reproduce it rather than reinterpret it, so the model
resolves real detail in skin, fabric and background instead of interpolating
pixels. 928x1152 comes back 3712x4608.

This preserves identity, which matters: these covers are already rendered into
109 posted slides. Regenerating them from the original prompts would return
different people in different rooms and every one of those slides would have
to be rebuilt. Upscaling returns the same photograph, larger.

$0.24 an image. The original is kept alongside as <name>.1k.png until you are
satisfied, because a bad upscale is only visible next to what it replaced.
"""
import base64, json, os, pathlib, sys, time, urllib.request, urllib.error

KEY = os.environ.get("GEMINI_API_KEY", "")
if not KEY: sys.exit("No GEMINI_API_KEY")
files = [pathlib.Path(a) for a in sys.argv[1:] if not a.startswith("--")]
if not files: sys.exit("usage: upscale.py <file.png> [...]")

PROMPT = ("Reproduce this exact photograph at maximum resolution. Identical composition, "
          "identical people, identical clothing, identical framing, identical colours and "
          "lighting. Do not reinterpret, restyle, recrop or change anything — only resolve "
          "finer detail in skin, fabric and background.")

done = failed = 0
for f in files:
    keep = f.with_suffix(".1k.png")
    if keep.exists():
        print(f"  skip  {f.name} (already upscaled)"); continue
    body = {"contents":[{"parts":[
        {"text": PROMPT},
        {"inline_data":{"mime_type":"image/png","data":base64.b64encode(f.read_bytes()).decode()}}]}],
      "generationConfig":{"responseModalities":["IMAGE"],
                          "imageConfig":{"aspectRatio":"4:5","imageSize":"4K"}}}
    req = urllib.request.Request(
      f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key={KEY}",
      data=json.dumps(body).encode(), headers={"Content-Type":"application/json"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=900))
        parts = [x for x in d["candidates"][0]["content"]["parts"] if "inlineData" in x]
        if not parts:
            raise RuntimeError(d["candidates"][0].get("finishReason", "no image"))
        out = base64.b64decode(parts[0]["inlineData"]["data"])
        f.rename(keep)                    # keep the 1K next to it
        f.write_bytes(out)
        print(f"  ok    {f.name}  {len(out)//1024} KB")
        done += 1
    except Exception as e:
        msg = e.read()[:160].decode(errors="replace") if isinstance(e, urllib.error.HTTPError) else str(e)[:160]
        print(f"  FAIL  {f.name}: {msg}")
        failed += 1
    time.sleep(2)

print(f"\n  {done} upscaled, {failed} failed  ~${done*0.24:.2f}")
