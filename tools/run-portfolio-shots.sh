#!/usr/bin/env bash
# Five portfolio screenshots, from a real instance against the emulator.
#   bash tools/run-portfolio-shots.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tools/portfolio-shots.mjs"
