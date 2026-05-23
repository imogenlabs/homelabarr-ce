#!/usr/bin/env bash
set -euo pipefail

echo "Reproducibility test: building binder twice..."

# Build 1
bash compliance/build-binder.sh > /dev/null 2>&1
ZIP1=$(ls -t compliance/dist/*.zip 2>/dev/null | head -1)
DIR1="${ZIP1%.zip}"

if [ -z "${ZIP1}" ] || [ ! -d "${DIR1}" ]; then
  echo "FAIL: first build did not produce output"
  exit 1
fi

# Snapshot file list + content hashes (excluding time-varying fields)
( cd "${DIR1}" && find . -type f -not -name manifest.sha256 -not -name attestation.json -not -name index.html | sort > /tmp/repro-files-1 )
( cd "${DIR1}" && find . -type f -not -name manifest.sha256 -not -name attestation.json -not -name index.html -print0 | sort -z | xargs -0 shasum -a 256 | sort > /tmp/repro-hashes-1 )

# Build 2
bash compliance/build-binder.sh > /dev/null 2>&1
ZIP2=$(ls -t compliance/dist/*.zip 2>/dev/null | head -1)
DIR2="${ZIP2%.zip}"

if [ -z "${ZIP2}" ] || [ ! -d "${DIR2}" ]; then
  echo "FAIL: second build did not produce output"
  exit 1
fi

( cd "${DIR2}" && find . -type f -not -name manifest.sha256 -not -name attestation.json -not -name index.html | sort > /tmp/repro-files-2 )
( cd "${DIR2}" && find . -type f -not -name manifest.sha256 -not -name attestation.json -not -name index.html -print0 | sort -z | xargs -0 shasum -a 256 | sort > /tmp/repro-hashes-2 )

echo ""
echo "Excluded from comparison (legitimately time-varying):"
echo "  - manifest.sha256 (contains hashes of time-varying files)"
echo "  - attestation.json (contains build_time_utc)"
echo "  - index.html (contains build timestamp)"
echo ""

# Compare file lists
if ! diff -q /tmp/repro-files-1 /tmp/repro-files-2 > /dev/null 2>&1; then
  echo "FAIL: file lists differ between builds"
  diff /tmp/repro-files-1 /tmp/repro-files-2
  exit 1
fi

# Compare content hashes
if ! diff -q /tmp/repro-hashes-1 /tmp/repro-hashes-2 > /dev/null 2>&1; then
  echo "FAIL: content hashes differ between builds"
  diff /tmp/repro-hashes-1 /tmp/repro-hashes-2
  exit 1
fi

echo "OK: binder is reproducible (${DIR1} == ${DIR2} modulo time-stamped fields)"
