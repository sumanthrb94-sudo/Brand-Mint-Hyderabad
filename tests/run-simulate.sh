#!/usr/bin/env bash
# A simulated month, shaped like the real business, driven through the CRM.
#
#   bash tests/run-simulate.sh
#
# Emulators only — nothing here can reach the live project.
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tests/simulate.mjs"
