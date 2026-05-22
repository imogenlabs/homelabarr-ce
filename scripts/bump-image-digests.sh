#!/usr/bin/env bash
set -eu
TAG="${1:?usage: $0 <tag e.g. v2.2.0>}"
for img in homelabarr-frontend homelabarr-backend; do
  digest=$(docker buildx imagetools inspect "ghcr.io/smashingtags/$img:$TAG" --format '{{.Manifest.Digest}}')
  sed -i.bak -E \
    "s|ghcr.io/smashingtags/$img:[^@\"'[:space:]]+(@sha256:[a-f0-9]+)?|ghcr.io/smashingtags/$img:$TAG@$digest|g" \
    homelabarr.yml
done
rm -f homelabarr.yml.bak
echo "Pinned to $TAG with current digests."
echo "Verify with: cosign verify --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' ghcr.io/smashingtags/homelabarr-backend:$TAG"
