# The Brand Mint voice

**Chosen: ElevenLabs — `Santhi Prakash — Warm Indian Narrator`**
**`voice_id` UCYikFhJ1MxdJf40ZcRX** · model `eleven_multilingual_v2`

One voice, used on every film, ad and reel from here on. A brand that changes
voice every post has no voice.

⚠️ **Not yet usable.** The voice is gated: every call returns *"You need to be
on the creator tier or above to use this voice."* The tier check runs before
generation, so a blocked attempt costs nothing — this has been tested twice.

## The brief, in the client's words

> Not "an Indian speaking English in USA getting mocked". A professional
> Indian, English professor kind of. From a Telugu state.

That is a precise brief and it rules out most of what the voice libraries
offer. The distinction is between a **performed** accent and an **educated**
one:

| Wrong | Right |
|---|---|
| Thick, exaggerated, comic-relief | Neutral, unhurried, unremarkable |
| Sing-song intonation, rising ends | Level intonation, statements land flat |
| Retroflex consonants pushed hard | Crisp consonants, not caricatured |
| Selling at you | Telling you something |

The reference is Indian English as it is actually spoken by an educated
professional in Hyderabad — an English-medium, convent or university register.
A news anchor on a national English channel. A professor giving a lecture he
has given before. Nothing about it announces the accent; it is simply the
voice of someone who speaks English well and happens to be Indian.

## Specification

- **Male**, late thirties to late forties. Not young.
- **Telugu mother tongue**, Hyderabad or coastal Andhra. English-medium
  educated, so the Telugu is in the vowels and the rhythm rather than in
  anything exaggerated.
- **Mid-to-low register.** Resonant without being a movie-trailer bass.
- **Measured pace**, around 2.2 words per second for the brand read. The
  script is written with real pauses at full stops; the read has to take them.
- **Level, declarative intonation.** Our copy states prices and terms. It
  should sound like a fact being stated, not an offer being pitched.
- **No warmth performed on top.** Warmth comes from the pace, not from smiling
  into the microphone.

## Auditioned so far

| Voice | Verdict |
|---|---|
| Gemini TTS — Charon, Sulafat, Puck | Rejected. Generic, poor pronunciation. |
| ElevenLabs — Amit, Indian Commercial | **Rejected by the client: reads as a performed accent, "getting mocked".** |
| ElevenLabs — Santhi Prakash | **CHOSEN.** "Neutral Indian accent, crisp diction, steady articulate delivery", late thirties. Telugu name. Tier-locked. Preview at `out/santhi-prakash.mp3`. |
| ElevenLabs — Pranab | "Mature, confident, natural and engaging **without sounding overly polished or theatrical**" — the phrase that matters here. Preview at `out/pranab.mp3`. |

Not auditioned, previews blocked by the sandbox egress proxy — audition these
on elevenlabs.io directly:
`Tridev` irQC5HHaVrA6WY7BbPGZ · `Neel` SQ8WYwlpzxrTbbuJgi38 ·
`Arjun — Calm & Clean` dC5hdN77LtL8UVTQj3gZ · `Midhun` yOkKqKIpnYVC7FQVqNmk

## If none of them fit: design the voice

`creative_design_voice` builds one from a description. The description to use,
which is this page's specification compressed to what the model reads:

> A male Indian English voiceover artist in his early forties from Hyderabad,
> Telugu mother tongue, English-medium educated. Neutral, articulate Indian
> English with crisp consonants and level intonation — the register of a
> university lecturer or a national news anchor, never a performed or comic
> accent. Mid-to-low resonant register, measured and unhurried, warm but not
> smiling. Statements land flat and finished. Studio quality, no room tone.

Save the chosen preview with `creative_save_designed_voice` and record the
`voice_id` at the top of this file. It becomes the permanent voice.

## Before anything ships

Run the QC loop in `VO-QC.md` — generate, transcribe with Scribe, diff against
the script. It has already caught "four **ships** so far" and "a **card** that
works everywhere". Generated speech is not proofread by generating it.

## What it takes to unlock it

Two blockers, and one purchase clears both:

| | |
|---|---|
| Creator tier | Required for this voice. $22/month, or $18.33 on annual billing. |
| Credits | 369 needed for the 30s script, **51 on the account**. Creator includes 121,000 credits a month. |

So the credit shortfall is not worth solving separately — 121,000 credits is
roughly 320 runs of the full brand script, which is more voiceover than this
studio will record in a year. Creator also unlocks Professional Voice Cloning,
which is the route to a genuinely owned brand voice later: record a real
Telugu-speaking Hyderabad voice artist once, clone it, and the brand voice
stops depending on which library voices a vendor keeps in stock.

ElevenLabs charges about one credit per character. The 30s brand script is
369 credits — roughly $0.04 a read.

## Once the tier is live

1. Generate the script in `voice_id UCYikFhJ1MxdJf40ZcRX`.
2. Run the QC loop in `VO-QC.md` — transcribe and diff. Do not skip this.
3. Save the WAV to `marketing/video/out/vo-santhi.wav`.
4. Re-time and burn the subtitles against the new read — the timings are
   derived from the audio, so they follow automatically:
   `node marketing/video/subtitles.mjs --script brand --audio out/vo-santhi.wav --font "BrandMint Display" --until 24 --burn out/brandmint-30s.mp4`
5. Remux the film with the new voiceover via `cut-30.sh`.
