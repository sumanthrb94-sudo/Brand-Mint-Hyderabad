#!/usr/bin/env bash
# Tap targets and keyboard focus, measured at a 390px viewport.
#   bash tests/run-touch-targets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tests/touch-targets.mjs"
