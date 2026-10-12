# Amit — the Brand Mint voice

| | |
|---|---|
| Voice | **Amit - Indian Commercial Voice** (ElevenLabs voice library, professional) |
| voice_id | `GmxTc9oJaW27NFnQFhtv` |
| Model | `eleven_v4` (default settings, no tags) |
| Labels | Male, middle-aged, `en-indian` |
| Finalised | 12 Oct 2026 |

Use this voice, with this model, for every Brand Mint reel, ad and film. Don't
swap voices per post.

## How to direct it

Amit reads well when the script does the pacing for him:

- **Short sentences, one idea each.** "Orders in one tab. Payments in another."
- **Write the pauses in.** Put `...` between beats. Every `...` comes back as a
  clean 0.2–0.4 s gap, and those gaps are what the edit cuts on.
- **Write "Brand Mint" as two words.** He says it as one: *Brandmint*. That's
  correct, and Scribe transcribes it the same way.
- **Say times as words.** Write "two a.m.", not "2 AM", so the read stays even.
- **No prices, no build counts** (the Instagram rule). "8+ years" is approved.

## Generating

ElevenLabs MCP, `creative_generate_speech`:

```
voice_id: GmxTc9oJaW27NFnQFhtv
model_id: eleven_v4
prompt:   <the script, beats separated by "...">
```

Generate four takes and pick one. Each costs about one credit per character
(a 22 s reel script is ~300 credits).

**Account note (12 Oct 2026).** The first ElevenLabs workspace had its free
tier disabled ("unusual activity", which the sandbox proxy can trigger). The
second ElevenLabs connector (`ElevenLabs-e7e2ec2e`, voice and speech only)
still works and has this voice. Use that one.

## Cutting it into a reel

1. Transcribe the chosen take with Scribe (`eleven_scribe_v1`): upload it with
   `creative_create_asset_upload`, then PUT it, finalise it and transcribe.
   That gives per-word start and end times.
2. Diff the transcript against the script before anything else (see `../../VO-QC.md`).
3. Cut each line out of the take at its word timings, then place it at the
   matching on-screen beat with ffmpeg (`atrim` → `adelay` → `amix`). That keeps
   Amit's natural pace while the edit sets the rhythm. Never time-stretch him;
   change the gaps instead.
4. Mix with music ducked under the voice (sidechain), with sound effects at the
   cue times. Master to −14 LUFS / −1 dBTP (`mix2.py` from the
   mint-creative-engine skill does all of this).

## Reference takes (`samples/`)

| File | Script | Length | Used in |
|---|---|---|---|
| `amit_2am_take2_selected.mp3` | 2 AM (below) | 17.2 s | 2 AM reels v1–v3 |
| `amit_2am_take1.mp3`, `_take3` | 2 AM | 16.8 s, 16.4 s | — |
| `amit_dashboard_take2_selected.mp3` | One dashboard (below) | 20.0 s | One dashboard reel |
| `amit_dashboard_take1/3/4.mp3` | One dashboard | 19.6–20.2 s | — |

Raw takes are around −21 LUFS; the mix brings them to −14.

### "2 AM" script

> Two a.m. ... Someone wants to buy from you. They message. ... They wait. ...
> You're asleep. ... By morning, they've bought it somewhere else. ... At Brand
> Mint, we build stores that stay open. They browse. They pay. And the order is
> waiting when you wake up.

### "One dashboard" script

> How many logins run your business? ... Orders in one tab. ... Payments in
> another. ... Stock in a spreadsheet. ... Something always slips. ... At Brand
> Mint, we build one dashboard for every channel. ... Built around how you work.
> ... One login. Yours to keep. ... Brand Mint. Custom software, one dashboard.

Scribe transcript of the selected take: word for word, with "Brandmint" as one word.

| Line | Take time (s) | Placed at (s) |
|---|---|---|
| How many logins run your business? | 0.05–2.00 | 0.15 |
| Orders in one tab. | 2.22–3.60 | 2.57 |
| Payments in another. | 3.74–4.95 | 3.74 |
| Stock in a spreadsheet. | 5.22–6.66 | 5.41 |
| Something always slips. | 6.92–8.56 | 7.08 |
| At Brandmint, we build one dashboard for every channel. | 8.80–12.48 | 9.20 |
| Built around how you work. | 12.62–14.28 | 14.20 |
| One login. Yours to keep. | 14.46–16.30 | 16.45 |
| Brandmint. Custom software, one dashboard. | 16.56–19.80 | 19.65 (end card) |

The placement times are on the 107.7 BPM beat grid of the music
("Sketchbook 2024-05-01_02", CC0).
