#!/usr/bin/env python3
"""Check every caption in CAPTIONS.md against the rules the playbook sets.

    python3 marketing/social/check-captions.py

Five hashtags is the one that is enforced by Instagram itself — over five and
publishing either fails or the extras are stripped, so a caption with six is
not a style problem, it is a post that does not go out as written. The
question and the comment CTA are the two cheapest measured effects available
(+36.70% and +202.78% comments, Metricool 2026), and they are easy to forget
on the tenth caption of a batch.
"""
import re, sys, pathlib

MD = pathlib.Path(__file__).with_name("CAPTIONS.md")
sections = re.split(r"^## ", MD.read_text(encoding="utf-8"), flags=re.M)[1:]

fails = []
checked = 0
for sec in sections:
    title = sec.splitlines()[0].strip()
    # Captions are the numbered sections; the rest is reference prose.
    if not re.match(r"\d+ ·", title) or "#hyderabadbusiness" not in sec:
        continue
    # Everything quoted in this section, blank lines between paragraphs and all.
    body = "\n".join(l[2:] if l.startswith("> ") else "" for l in sec.splitlines()
                     if l.startswith(">"))
    tags = re.findall(r"#[a-z0-9_]+", body)
    checked += 1
    bad = []
    if len(tags) != 5:
        bad.append(f"{len(tags)} hashtags, must be exactly 5")
    if len(set(tags)) != len(tags):
        bad.append("a hashtag is repeated")
    if "?" not in body:
        bad.append("no question anywhere in the caption")
    if not re.search(r"\bcomments?\b", body, re.I):
        bad.append("no comment CTA")
    first = next((l for l in body.splitlines() if l.strip()), "")
    if "Hyderabad" not in first and "Diwali" not in first:
        bad.append("first line is not a local query (no 'Hyderabad')")
    print(("  ok  " if not bad else "  FAIL ") + title)
    for b in bad:
        print(f"         - {b}")
        fails.append((title, b))

print(f"\n  {checked} captions checked, {len(fails)} problems")
sys.exit(1 if fails else 0)
