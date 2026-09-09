# Voiceover QC — generated speech is not proofread by generating it

Three defects shipped in the first two passes of the brand film VO, none of
them visible in the script and all of them audible to anyone listening:

| written | spoken |
|---|---|
| four **shipped** so far | four **ships** so far |
| a **cart** that works everywhere | a **card** that works everywhere |
| **we build** online stores | **we built** online stores |

The first was caught only after the user complained. The other two were caught
by this loop, before he heard them.

## The loop

1. Generate the speech.
2. Extract nothing — upload the mp3 as an asset, place it on a flow, run
   `creative_transcribe_audio` (Scribe) over it.
3. `python3 vo-qc.py script.txt transcript.txt` — diffs word by word,
   normalising what a transcriber legitimately reformats: acronym spacing,
   punctuation, case, "Hi-Tech"/"Hitech", "Brand Mint"/"BrandMint".
4. Non-zero exit means something diverged. Read it before shipping.

Roughly **$0.05 per QC pass** on a forty-second read. A defective take costs
more than that in a single reshoot.

## Rewrite, do not re-roll

TTS is non-deterministic: the second pass fixed "ships" and introduced "card"
and "built" in the same breath. Re-rolling the same fragile line is a coin
flip. Rewrite the phrase so the failure has nowhere to live:

| fragile | why | replacement |
|---|---|---|
| "a cart that works" | cart/card are near-homophones, and this is a payments sentence | "a checkout that works" |
| "we build online stores" | build/built collapse in connected speech | "Brand Mint builds online stores" |
| "four shipped so far" | shipped/ships elide after a numeral | "four brands shipped so far" |

## Account limits worth knowing

- **Two concurrent requests.** A third generation in the same call fails with a
  subscription error. Keep `generations_count` at 2.
- The documentary-grade voices (Rishab and similar) need Creator tier. The
  campaign voice is **Raj — Indian English Ads & Social**
  (`FwuKjlVpi0N3exead7ji`), `eleven_multilingual_v2`.
