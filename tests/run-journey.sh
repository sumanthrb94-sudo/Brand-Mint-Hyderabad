#!/usr/bin/env bash
# The whole journey, both sides at once, against local emulators.
#
#   bash tests/run-journey.sh
#
# Needs Java (the Firestore emulator is a JVM binary) and firebase-tools.
# Touches nothing live: bm-app.js only connects to emulators when the page is
# served from localhost.
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tests/journey.mjs"
