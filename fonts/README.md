# Fonts, self-hosted

All three are under the SIL Open Font Licence 1.1 — free to use, embed and
redistribute, including commercially. Licence text sits beside each file.

| File | Family | Source | Subset |
|---|---|---|---|
| `plus-jakarta-sans.woff2` | Plus Jakarta Sans, variable 200–800 | [tokotype/PlusJakartaSans](https://github.com/tokotype/PlusJakartaSans) | 61 KB → 25 KB |
| `inter.woff2` | Inter, variable 100–900 | [rsms/inter](https://github.com/rsms/inter) | 352 KB → 68 KB |
| `jetbrains-mono.woff2` | JetBrains Mono, variable 100–800 | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | 114 KB → 39 KB |

Subset to Latin plus the punctuation, arrows and **₹ (U+20B9)** this site
actually renders — 526 KB down to 133 KB.

## Why self-hosted

Google Fonts was the only third party the public pages talked to. Removing it
drops two DNS lookups and two TLS handshakes from the first paint, keeps
visitor IPs from reaching a third party (which is what `privacy.html` claims),
and means the site renders even if that CDN is slow or blocked.

## The rupee sign

**JetBrains Mono has no ₹ glyph.** Prices are set in the mono face, so ₹ was
silently falling back to whatever the OS offered — a mismatched sign in the
middle of every price. `styles.css` fixes it with a `unicode-range` rule that
serves Inter's ₹ inside the JetBrains Mono family. Do not remove it.

## Regenerating

    pip install fonttools brotli
    python3 -m fontTools.subset <font>.woff2 \
      --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20B9,U+20AC,U+2122,U+2190-2199,U+21BB,U+2212,U+2215,U+2713,U+25C6,U+FEFF,U+FFFD" \
      --layout-features='kern,liga,calt,tnum,ccmp,locl,mark,mkmk' \
      --flavor=woff2 --output-file=out.woff2 --no-hinting --desubroutinize
