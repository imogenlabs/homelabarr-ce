#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
ID="binder-${DATE}-${SHA}"
DIST="compliance/dist/${ID}"

echo "Building compliance binder: ${ID}"

mkdir -p "${DIST}/evidence" "${DIST}/binders" "${DIST}/governance" "${DIST}/ir" "${DIST}/threat-model" "${DIST}/audit"

# 1. Collect live evidence
echo "  Collecting evidence..."
OUT="${DIST}/evidence" bash compliance/collect-evidence.sh 2>/dev/null || echo "  (evidence collection had warnings — check output)"

# 2. Copy framework binders
cp compliance/cis-docker-v1.6.0.md "${DIST}/binders/"
cp compliance/nist-csf-2.0.md "${DIST}/binders/"
cp compliance/owasp-asvs-v4.0.3-L2.md "${DIST}/binders/"

# 3. Copy governance
if [ -d docs/governance ]; then
  cp docs/governance/*.md "${DIST}/governance/" 2>/dev/null || true
fi

# 4. Copy IR runbook
if [ -d docs/ir ]; then
  cp -r docs/ir/ "${DIST}/ir/"
fi

# 5. Copy threat model
if [ -d docs/threat-model ]; then
  cp -r docs/threat-model/ "${DIST}/threat-model/"
fi

# 6. Copy audit round archives
cp docs/audit/*.md "${DIST}/audit/" 2>/dev/null || true

# 7. Generate index.html
echo "  Rendering index..."
node compliance/render-binder-index.cjs "${DIST}" > "${DIST}/index.html"

# 8. Attestation (before manifest so manifest covers it)
echo "  Generating attestation..."
node compliance/render-attestation.cjs "${DIST}" > "${DIST}/attestation.json"

# 9. SHA-256 manifest (last content file — covers everything including attestation)
echo "  Computing manifest..."
( cd "${DIST}" && find . -type f -not -name manifest.sha256 -print0 | sort -z | xargs -0 shasum -a 256 > manifest.sha256 )

# 10. Zip
echo "  Zipping..."
( cd compliance/dist && zip -qr "${ID}.zip" "${ID}" )

echo ""
echo "Binder built: compliance/dist/${ID}.zip"
echo "Index:        compliance/dist/${ID}/index.html"
echo "Manifest:     compliance/dist/${ID}/manifest.sha256"
