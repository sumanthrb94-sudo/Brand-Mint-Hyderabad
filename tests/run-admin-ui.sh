#!/usr/bin/env bash
# The admin UI, driven like a person.
#
#   bash tests/run-admin-ui.sh
#
# Needs Java (the Firestore emulator is a JVM binary) and firebase-tools.
# Touches nothing live: bm-app.js connects to emulators only from localhost.
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tests/admin-ui.mjs"
