#!/usr/bin/env python3
"""
Turn an aligned words.json into a scenes.json, without a human choosing blocks.

This encodes the scene grammar the hand-built films arrived at:

  * cut only on phrase boundaries, never mid-clause
  * a scene whose spoken line IS the typography is `type`, captions hidden
  * a scene whose visual adds something the voice does not say is `support`
  * lists become pills that accumulate, one per spoken item
  * a rupee figure or a duration becomes the peak, once, full-bleed
  * the question before the CTA is hero type held in silence
  * "comment X" becomes the end card, and the film closes on the lockup

It will not out-design a person on any single film. It will make the same
decisions consistently across thirty, which is the thing a person will not do.
"""
import json, re, sys, os

# Whisper reliably mangles the brand and the Indian payment rails.
FIXES = [(r"\bbrand\s*(mind|mint|ment|min|meant)\b", "Brand Mint"),
         (r"\bbrandm[ei]nt?\b", "Brand Mint"), (r"\bbrandment\b", "Brand Mint"),
         (r"\braz[eo]r\s*pay\b", "Razorpay"), (r"\btally\b", "Tally"),
         (r"\bc\.?o\.?d\.?\b", "COD"), (r"\bg\.?s\.?t\.?\b", "GST"),
         (r"\bu\.?a\.?t\.?\b", "UAT"), (r"\brto\b", "RTO")]

def clean(t):
    for pat, rep in FIXES:
        t = re.sub(pat, rep, t, flags=re.I)
    return t

# 12.4cqw Georgia on a 907px stage holds about fifteen characters. The template
# now shrinks the face when a line runs over, so this is the size we would like
# to hold, not a hard ceiling — which is why six lines is safe.
LINE_CHARS = 15
MAX_LINES = 6

RUPEE = re.compile(r"(?:rupees|rs\.?|₹)", re.I)
NUMWORD = {"one":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,
           "nine":9,"ten":10,"eleven":11,"twelve":12,"twenty":20,"thirty":30,"forty":40,
           "fifty":50,"sixty":60,"eighty":80,"hundred":100,"thousand":1000,"lakh":100000}

def phrases(words, gap=0.16):
    """Group words into clauses: a gap in the read, or a sentence-ending mark."""
    out, cur = [], [0]
    for i in range(1, len(words)):
        prev_end, start = words[i-1]["e"], words[i]["s"]
        broke = words[i-1]["w"].rstrip().endswith((".", "?", "!", ":"))
        if broke or (start - prev_end) > gap:
            out.append(cur); cur = []
        cur.append(i)
    if cur: out.append(cur)
    return [p for p in out if p]

def split_long(words, groups, cap=11):
    """A clause longer than the type can hold becomes two scenes.

    Hero type tops out near 11 spoken words. Rather than shrink the face or let
    it clip, cut the clause at its own comma or conjunction — which is where a
    reader would breathe anyway.
    """
    out = []
    for g in groups:
        while len(g) > cap:
            best = None
            for j in range(3, len(g) - 2):
                w = words[g[j]]["w"].rstrip()
                if w.endswith(",") or w.lower() in ("and", "or", "but", "then", "because", "so"):
                    if best is None or abs(j - len(g)//2) < abs(best - len(g)//2):
                        best = j
            # After a comma, before a conjunction. A scene that ends on "and"
            # reads as a line that got cut off; one that opens on "And" reads
            # as a deliberate second beat.
            if best is None:
                cut = len(g)//2
            elif words[g[best]]["w"].rstrip().endswith(","):
                cut = best + 1
            else:
                cut = best
            out.append(g[:cut]); g = g[cut:]
        out.append(g)
    return [g for g in out if g]

def merge_to(groups, target):
    """Merge the shortest adjacent pair until we are near the house count."""
    g = [list(x) for x in groups]
    while len(g) > target:
        i = min(range(len(g)-1), key=lambda k: len(g[k]) + len(g[k+1]))
        g[i] = g[i] + g[i+1]; del g[i+1]
    return g

def text_of(words, idx):
    return clean(" ".join(words[i]["w"] for i in idx))

def title_case(s):
    s = s.strip().rstrip(".,;:")
    return s[:1].upper() + s[1:] if s else s

def money(txt):
    """Pull a printable figure out of spoken words: '99,000 rupees' -> ₹99,000."""
    m = re.search(r"([\d,]{2,})\s*(?:rupees|rs)", txt, re.I)
    if m: return "₹" + m.group(1)
    m = re.search(r"(\d+)\s*(lakh|thousand)", txt, re.I)
    if m:
        n = int(m.group(1)) * (100000 if m.group(2).lower()=="lakh" else 1000)
        return "₹" + f"{n:,}"
    w = txt.lower().split()
    for i, t in enumerate(w):
        if t in ("lakh", "thousand") and i and w[i-1] in NUMWORD:
            n = NUMWORD[w[i-1]] * NUMWORD[t]
            return "₹" + f"{n:,}"
    return None

def duration_phrase(txt):
    m = re.search(r"(\d+)\s*(week|weeks|day|days|hour|hours|month|months)", txt, re.I)
    if m: return m.group(1), m.group(2).lower()
    w = txt.lower().replace(",", "").split()
    for i, t in enumerate(w):
        if t.rstrip("s") in ("week","day","hour","month") and i and w[i-1] in NUMWORD:
            return str(NUMWORD[w[i-1]]), t
    return None

def split_lines(txt):
    """Greedy wrap to the measured character budget, never more than MAX_LINES."""
    lines, cur = [], ""
    for w in txt.split():
        trial = (cur + " " + w).strip()
        if cur and len(trial) > LINE_CHARS:
            lines.append(cur); cur = w
        else:
            cur = trial
    if cur: lines.append(cur)
    if len(lines) > MAX_LINES:                    # too long for hero type
        return None
    return lines

def accent(lines):
    """Capitalise the opening, mint the payoff — never the whole line.

    A one-line scene set entirely in mint italic reads as a pull-quote rather
    than as the film's voice, so there the accent falls on the last word or two.
    """
    if not lines: return lines
    out = list(lines)
    out[0] = out[0][:1].upper() + out[0][1:]      # a scene never opens lowercase
    if len(out) == 1:
        w = out[0].split()
        if len(w) <= 2:
            return out                            # too short to divide; leave it cream
        k = 2 if len(w) >= 5 else 1
        out[0] = " ".join(w[:-k]) + f" <em>{' '.join(w[-k:])}</em>"
    else:
        out[-1] = f"<em>{out[-1]}</em>"
    return out

# What the read talks about, and what to draw for it. This is the whole reason
# a scene can be more than its own sentence set large: a named thing becomes a
# drawn thing, and the words move to the captions where they belong.
LEXICON = [
    (r"\b(storefront|store|shop)\b", "store", "Store"),
    (r"\b(product pages?|products?|catalogue|catalog|listings?)\b", "box", "Products"),
    (r"\b(carts?)\b", "cart", "Cart"),
    (r"\b(checkout|checkouts)\b", "card", "Checkout"),
    (r"\b(payments?|razorpay|upi|paid online)\b", "card", "Payments"),
    (r"\b(COD|cash on delivery)\b", "rupee", "COD"),
    (r"\b(price|pricing|cost|costs|invoice|invoices|GST|margin|margins|revenue|rupees)\b", "rupee", "Money"),
    (r"\b(delivery|shipping|courier|couriers|dispatch|ship)\b", "truck", "Delivery"),
    (r"\b(returns?|RTO|refunds?)\b", "refresh", "Returns"),
    (r"\b(stock|inventory|warehouse)\b", "warehouse", "Stock"),
    (r"\b(search|searching)\b", "search", "Search"),
    (r"\b(orders?)\b", "doc", "Orders"),
    (r"\b(customers?|buyers?|shoppers?|clients?)\b", "user", "Customers"),
    (r"\b(whatsapp|chats?|messages?|support|enquir\w+)\b", "chat", "Enquiries"),
    (r"\b(reviews?|ratings?)\b", "star", "Reviews"),
    (r"\b(reports?|dashboards?|analytics|numbers|data)\b", "chart", "Reports"),
    (r"\b(weeks?|days?|hours?|deadline|timeline)\b", "clock", "Timeline"),
    (r"\b(secure|security|trust|safe|verified)\b", "shield", "Trust"),
    (r"\b(phones?|mobiles?)\b", "phone", "Mobile"),
    (r"\b(emails?|newsletters?)\b", "mail", "Email"),
    (r"\b(discounts?|offers?|coupons?|sale)\b", "tag", "Offers"),
    (r"\b(logins?|accounts?|passwords?)\b", "lock", "Accounts"),
    (r"\b(filters?|categor\w+)\b", "filter", "Filters"),
    (r"\b(uploads?|uploading)\b", "upload", "Upload"),
    (r"\b(teams?|staff)\b", "user", "Team"),
    (r"\b(Hyderabad|address|location)\b", "pin", "Hyderabad"),
    (r"\b(notifications?|alerts?|reminders?)\b", "bell", "Alerts"),
    (r"\b(software|systems?|admin|code|tech)\b", "code", "System"),
    (r"\b(brand|logo|identity)\b", "layers", "Brand"),
    (r"\b(pages?|website|site)\b", "layers", "Pages"),
]
# The surfaces a shop actually has. Enough of them in one clause and the scene
# is about the thing itself, so it gets drawn as the thing.
SURFACE = {"store", "box", "cart", "card", "search", "doc", "filter", "upload"}

def subjects(txt):
    """Every drawable thing this clause names, in the order it names them."""
    out, seen = [], set()
    for pat, key, label in LEXICON:
        m = re.search(pat, txt, re.I)
        if m and key not in seen:
            seen.add(key)
            out.append((m.start(), key, label))
    out.sort()
    return [(k, l) for _, k, l in out]

NEG = re.compile(r"\b(not|no|never|without|isn'?t|aren'?t|don'?t|doesn'?t|can'?t|won'?t|stop|instead of)\b", re.I)

# When a line names nothing drawable, it is usually still *doing* something.
# These carry the scenes the lexicon misses — the argument, not the inventory.
VERB_ART = [
    (r"\?\s*$", "chat"),                       # only an actual question
    (r"\b(know|knows|knew|understand)\b", "search"),
    (r"\b(build|built|building|make|made)\b", "layers"),
    (r"\b(send|sends|reach|contact|email|message)\b", "mail"),
    (r"\b(wait|waiting|slow|late|again|month|year)\b", "clock"),
    (r"\b(own|owns|owned|yours|your own|asset)\b", "shield"),
    (r"\b(lose|lost|leak|leaking|drop|drops|fail|fails|broken)\b", "refresh"),
    (r"\b(grow|growth|more|scale|increase|double)\b", "chart"),
    (r"\b(choose|choice|pick|decide|option)\b", "filter"),
    (r"\b(name|names|call|called|list|listed)\b", "doc"),
]

def art_for(txt, subj):
    """One drawn subject for a line: what it names, else what it does."""
    key = subj[0][0] if subj else None
    if key is None:
        for pat, k in VERB_ART:
            if re.search(pat, txt, re.I):
                key = k
                break
    if key is None:
        return None
    return [key, "no"] if NEG.search(txt) else [key]

def build(words, meta, title, cta_word):
    ph = split_long(words, phrases(words))
    scenes_idx = merge_to(ph, 13)
    scenes, used_peak = [], False
    # Each of these is an event. Spending one twice in a film spends both.
    used_device = used_strikes = used_mark = False
    icons_used = 0
    art_used, last_art = {}, None        # a motif may return; it may not stutter

    for k, idx in enumerate(scenes_idx):
        txt = text_of(words, idx)
        low = txt.lower()
        last = k == len(scenes_idx) - 1
        rng = [idx[0], idx[-1]]

        # the ask
        if re.search(r"\bcomment\b", low):
            scenes.append({"words": rng, "mode": "type",
                           "endcard": {"cta": f"Comment “{cta_word}”",
                                       "hint": "One word. The scope comes back."}})
            continue

        # the question, held in silence
        if txt.rstrip().endswith("?"):
            q = split_lines(txt)
            if q:                                  # an unsettable question is not a hero
                scenes.append({"words": rng, "mode": "type", "h1": accent(q)})
                continue

        # a price or a span of time is the peak — once, and not in the first third
        if not used_peak and k >= 3:
            amt = money(txt)
            dur = duration_phrase(txt)
            # No note. A caption under the figure would be a claim the read did
            # not make, and the same claim would then be stamped on all thirty
            # films whether or not it is true of that one.
            if amt:
                scenes.append({"words": rng, "mode": "type", "center": True,
                               "number": {"value": amt}})
                used_peak = True; continue
            if dur and int(dur[0]) > 1:
                scenes.append({"words": rng, "mode": "type", "center": True,
                               "number": {"value": dur[0],
                                          "unit": dur[1] if dur[1].endswith("s") else dur[1]+"s"}})
                used_peak = True; continue

        subj = subjects(txt)

        # A shop's own surfaces, named together, get drawn as the shop —
        # a plane in perspective with the surfaces stacked on it.
        if not used_device and len(subj) >= 3 and sum(1 for k, _ in subj if k in SURFACE) >= 2:
            scenes.append({"words": rng, "mode": "support", "kicker": "One system",
                           "device": {"rows": [[k, l, i == 0] for i, (k, l) in enumerate(subj[:4])]}})
            used_device = True; continue

        # Anything the read names three or more of becomes drawn things, not a
        # sentence. The words are still heard, and the captions still carry them.
        if len(subj) >= 3 and icons_used < 4:
            scenes.append({"words": rng, "mode": "support",
                           "kicker": "What that covers" if not NEG.search(txt) else "What breaks",
                           "icons": [[k, l, False] for k, l in subj[:6]]})
            icons_used += 1; continue

        # A negation with more than one object is a list of things crossed out.
        if NEG.search(txt) and txt.count(",") >= 1 and not used_strikes:
            items = [t.strip(" .?") for t in re.split(r",|\band\b", txt)]
            items = [title_case(i) for i in items if 1 <= len(i.split()) <= 3 and len(i) <= 22]
            if len(items) >= 2:
                scenes.append({"words": rng, "mode": "support", "strikes": items[:4]})
                used_strikes = True; continue

        # a genuine comma list becomes accumulating pills
        if txt.count(",") >= 2:
            items = [t.strip(" .?") for t in re.split(r",|\band\b", txt)]
            items = [i for i in items if 1 <= len(i.split()) <= 3 and len(i) <= 20]
            if len(items) >= 3:
                scenes.append({"words": rng, "mode": "type", "kicker": "What that covers",
                               "pills": [title_case(i) for i in items[:6]]})
                continue

        # Two named things is still two drawn things — a pair of tiles reads
        # better than the same eight words set as a headline.
        if len(subj) == 2 and icons_used < 4 and len(txt.split()) >= 6:
            scenes.append({"words": rng, "mode": "support",
                           "icons": [[k, l, False] for k, l in subj]})
            icons_used += 1; continue

        # The brand naming itself, once, is the monogram drawing itself.
        if not used_mark and re.search(r"\bBrand Mint\b", txt) and k >= 2:
            scenes.append({"words": rng, "mode": "support", "mark": True})
            used_mark = True; continue

        lines = split_lines(txt)
        if lines:
            sc = {"words": rng, "mode": "type", "h1": accent(lines)}
            # Draw what the line is about, above the line. A type scene without
            # this is a subtitle; with it, the frame is composed. Four lines is
            # the most that leaves room for a 24cqw subject above them.
            art = art_for(txt, subj)
            # A subject may come back once, but never twice running — repetition
            # across a film is a motif, repetition back to back is a stall.
            if art and len(lines) <= 4 and art_used.get(art[0], 0) < 2 and art[0] != last_art:
                sc["art"] = art
                art_used[art[0]] = art_used.get(art[0], 0) + 1
                last_art = art[0]
            scenes.append(sc)
        elif subj:
            scenes.append({"words": rng, "mode": "support",
                           "icons": [[k, l, False] for k, l in subj[:6]]})
        else:
            # Nothing named and too long to set. Captions carry the words; the
            # screen carries a shape. Never chop a sentence into fake list cells.
            scenes.append({"words": rng, "mode": "support", "glyph": "crowd"})

    # Only one scene may carry the drawn mark, or it stops being an event.
    seen_mark = False
    for s in scenes:
        if "mark" in s:
            if seen_mark:
                s.pop("mark"); s["mode"] = "support"; s["glyph"] = "crowd"
            seen_mark = True

    end = words[-1]["e"]
    scenes.append({"at": round(end + 0.25, 2), "hold": 3.4, "mode": "type",
                   "lockup": {"mark": True, "word": "Brand <em>Mint</em>", "city": "Hyderabad",
                              "follow": {"text": "Follow to know more",
                                         "handle": "@brandmint.studios"}}})
    return {"title": title, "gate": f"Comment {cta_word}",
            "duration": round(end + 0.25 + 3.4, 2), "scenes": scenes}

def cues_for(spec, words):
    starts = [s["at"] if "at" in s else words[s["words"][0]]["s"] for s in spec["scenes"]]
    cues = []
    for i, s in enumerate(spec["scenes"]):
        t0 = starts[i]
        if "number" in s:
            cues += [{"sfx":"bd_tek","t":round(t0+.06,3),"gain":.52},
                     {"sfx":"drum_cymbal_open","t":round(t0+.10,3),"gain":.22},
                     {"sfx":"elec_ping","t":round(t0+.52,3),"gain":.22}]
        elif "endcard" in s:
            cues += [{"sfx":"bd_tek","t":round(t0+.14,3),"gain":.44},
                     {"sfx":"elec_ping","t":round(t0+.18,3),"gain":.26}]
        elif "lockup" in s:
            cues += [{"sfx":"ambi_swoosh","t":round(t0+.02,3),"gain":.36},
                     {"sfx":"elec_twip","t":round(t0+.34,3),"gain":.28},
                     {"sfx":"elec_ping","t":round(t0+1.02,3),"gain":.30}]
        elif "pills" in s:
            for n in range(len(s["pills"])):
                cues.append({"sfx":"elec_blip","t":round(t0+.12+n*.34,3),"gain":.22})
        elif "icons" in s:
            for n in range(len(s["icons"])):
                cues.append({"sfx":"elec_blip","t":round(t0+.14+n*.11,3),"gain":.20})
        elif "device" in s:
            cues.append({"sfx":"ambi_swoosh","t":round(t0+.04,3),"gain":.26})
            for n in range(len(s["device"].get("rows", []))):
                cues.append({"sfx":"elec_blip","t":round(t0+.24+n*.13,3),"gain":.20})
        elif "strikes" in s:
            for n in range(len(s["strikes"])):
                cues.append({"sfx":"elec_twip","t":round(t0+.16+n*.30,3),"gain":.24})
        elif "mark" in s:
            cues += [{"sfx":"ambi_swoosh","t":round(t0+.02,3),"gain":.30},
                     {"sfx":"elec_ping","t":round(t0+.42,3),"gain":.26}]
        elif "cells" in s:
            for n in range(len(s["cells"])):
                cues.append({"sfx":"elec_blip","t":round(t0+.12+n*.11,3),"gain":.22})
        else:
            cues += [{"sfx":"elec_twip","t":round(t0+.10,3),"gain":.28},
                     {"sfx":"elec_twip","t":round(t0+.20,3),"gain":.24}]
    cues.sort(key=lambda c: c["t"])
    return {"vo":"vo.wav","duration":spec["duration"],"cues":cues}

if __name__ == "__main__":
    out, title, cta = sys.argv[1], sys.argv[2], sys.argv[3]
    wpath = os.path.join(out, "words.json")
    words = json.load(open(wpath))
    # The captions read from this file too, so the brand has to be repaired here
    # rather than only on the way to the typography — otherwise the screen says
    # Brand Mint and the caption under it says Brandment.
    for w in words:
        w["w"] = clean(w["w"])
    json.dump(words, open(wpath, "w"), ensure_ascii=False)
    meta = json.load(open(os.path.join(out, "meta.json")))
    spec = build(words, meta, title, cta)
    json.dump(spec, open(os.path.join(out, "scenes.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(cues_for(spec, words), open(os.path.join(out, "cues.json"), "w"), indent=1)
    modes = {}
    for s in spec["scenes"]:
        b = next((k for k in ("h1","rows","cells","pills","icons","device","strikes","mark","glyph","number","endcard","lockup") if k in s), "?")
        modes[b] = modes.get(b, 0) + 1
    print(f"  {len(spec['scenes'])} scenes {dict(modes)} · {spec['duration']}s")
