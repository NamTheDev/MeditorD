#!/usr/bin/env bash
set -euo pipefail

git pull

cd ~/docker

BUILD_ID="$(git rev-parse --short=12 HEAD)" docker compose up --build