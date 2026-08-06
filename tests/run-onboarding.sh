#!/usr/bin/env bash
# Onboarding six clients through the real UI, checking the client's side at
# each step.
#
#   bash tests/run-onboarding.sh
#
# Emulators only — nothing here can reach the live project.
set -euo pipefail
cd "$(dirname "$0")/.."
export BM_VENDOR_DIR="${BM_VENDOR_DIR:-/tmp/bm-vendor}"
exec npx firebase emulators:exec \
  --only firestore,auth \
  --project brandmintstudios-a5eb7 \
  "node tests/onboarding.mjs"
