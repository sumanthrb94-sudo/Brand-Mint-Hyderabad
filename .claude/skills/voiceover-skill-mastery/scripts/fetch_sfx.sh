#!/usr/bin/env bash
# CC0 sound effects from Sonic Pi's sample library. The repo's own README states
# every sample here is public domain, so they are cleared for commercial use.
set -euo pipefail
OUT="${1:-sfx}"; mkdir -p "$OUT"
BASE="https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/dev/etc/samples"
for f in ambi_swoosh perc_swash elec_blip elec_ping elec_twip elec_pop bd_tek bass_hit_c drum_cymbal_open perc_till; do
  [ -f "$OUT/$f.flac" ] || curl -sSL -o "$OUT/$f.flac" "$BASE/$f.flac"
done
echo "sfx ready in $OUT"
