# The Brand Mint voice

One voice, used on every film, ad and reel from here on. A brand that changes
voice every post has no voice.

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
| ElevenLabs — Santhi Prakash | Best written match: "neutral Indian accent, crisp diction, steady articulate delivery", late thirties. Telugu name. **Tier-locked — needs the creator tier.** Preview at `out/santhi-prakash.mp3`. |
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

## Cost

ElevenLabs charges about one credit per character; the 30s brand script is
369 credits, roughly $0.04. The account currently has **51 credits** and the
full script cannot run until it is topped up.
