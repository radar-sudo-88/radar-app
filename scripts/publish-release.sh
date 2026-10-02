#!/bin/sh
# Uploads an IPA to a GitHub Release (tag mobile-<build number>). Needs GITHUB_TOKEN + GITHUB_REPOSITORY.
set -e
IPA="$1"
TAG="mobile-${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}-$(basename "$IPA" | cut -d. -f2)"
API="https://api.github.com/repos/${GITHUB_REPOSITORY}"

RELEASE=$(curl -fsS -X POST "$API/releases" \
  -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
  -d "{\"tag_name\":\"$TAG\",\"name\":\"Aero Sentry $TAG\",\"body\":\"Sideload: IPA via Sideloadly, APK directly on Android.\"}")
UPLOAD_URL=$(printf '%s' "$RELEASE" | python3 -c "import sys,json;print(json.load(sys.stdin)['upload_url'].split('{')[0])")

curl -fsS -X POST "$UPLOAD_URL?name=$(basename "$IPA")" \
  -H "Authorization: Bearer $GITHUB_TOKEN" -H "Content-Type: application/octet-stream" \
  --data-binary @"$IPA" > /dev/null
echo "Published $TAG"
