#!/usr/bin/env bash
set -euo pipefail

git pull

docker build \
  --build-arg BUILD_ID="$(git rev-parse --short=12 HEAD)" \
  -t meditord \
  .
