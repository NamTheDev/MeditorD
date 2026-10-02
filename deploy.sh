#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

IMAGE_NAME="${MEDITORD_IMAGE:-meditord}"
CONTAINER_NAME="${MEDITORD_CONTAINER:-meditord}"
HOST_PORT="${MEDITORD_PORT:-3000}"
DATABASE_DIR="${MEDITORD_DATABASE_DIR:-$ROOT_DIR/database}"

echo "Updating MeditorD source on host..."
git pull --ff-only

BUILD_ID="$(git rev-parse --short=12 HEAD)"

echo "Building Docker image ${IMAGE_NAME} from ${BUILD_ID}..."
docker build   --build-arg "BUILD_ID=${BUILD_ID}"   -t "$IMAGE_NAME"   .

mkdir -p "$DATABASE_DIR"

if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "Replacing existing container ${CONTAINER_NAME}..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

echo "Starting ${CONTAINER_NAME} on host port ${HOST_PORT}..."
docker run -d   --name "$CONTAINER_NAME"   --restart unless-stopped   -p "${HOST_PORT}:3000"   -v "${DATABASE_DIR}:/app/database"   "$IMAGE_NAME"

echo "MeditorD is running from host revision ${BUILD_ID}."
