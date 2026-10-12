#!/usr/bin/env bash
set -euo pipefail

git pull --ff-only

docker build \
  --build-arg BUILD_ID="$(git rev-parse --short=12 HEAD)" \
  -t meditord \
  .

docker run --rm \
  -p 3000:3000 \
  -v "$(pwd)/database:/app/database" \
  meditord
