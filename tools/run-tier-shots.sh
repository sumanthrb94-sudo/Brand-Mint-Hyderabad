#!/usr/bin/env bash
# Screenshots of the three-tier rebuild, from a real instance.
#   bash tools/run-tier-shots.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tools/tier-shots.mjs"
