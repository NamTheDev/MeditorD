#!/usr/bin/env bash
set -euo pipefail

git pull --ff-only

BUILD_ID="$(git rev-parse --short=12 HEAD)"

(
  cd ~/docker
  BUILD_ID="$BUILD_ID" docker compose up --build -d meditord
)