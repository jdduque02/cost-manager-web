#!/bin/sh
# Build + push de la imagen del frontend y despliegue a Cloud Run.
#
# A diferencia de Sprig-api/deploy/gcp/deploy-api.sh (que usa
# `gcloud builds submit --tag`), aquí se hace `docker build` local porque
# necesitamos pasar --build-arg VITE_API_URL: TanStack Start lo embebe en el
# bundle del cliente en build time (ver Dockerfile, ARG/ENV VITE_API_URL).
# No crea recursos de GCP (proyecto, Artifact Registry, servicio) — asume
# que ya existen (mismo proyecto/repositorio que ya usa el API).
set -eu

PROJECT_ID="${PROJECT_ID:-cultivated-era-326901}"
REGION="${REGION:-us-east4}"
REPOSITORY="${REPOSITORY:-sprig}"
SERVICE_NAME="${SERVICE_NAME:-sprig-web}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$(dirname "$0")/.." rev-parse --short HEAD)}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/web:${IMAGE_TAG}"
IMAGE_LATEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/web:latest"

# URL del API en build time, embebida en el bundle del cliente (no es un
# secreto: es pública, viaja en el JS servido al navegador). Apunta al dominio
# sprig.fans; sobrescríbela con VITE_API_URL=<url> si hace falta otra.
VITE_API_URL="${VITE_API_URL:-https://api.sprig.fans/api/v1}"

# Memoria/CPU: el server SSR corre con srvx sobre un bundle Node ya podado
# (pnpm prune --prod), sin trabajo pesado (no hay procesamiento de imágenes,
# PDFs ni IA como en el API) — 512Mi/1 CPU es razonable como punto de
# partida. Si se ven OOM/cold starts lentos en Cloud Run, subir a 1Gi.
MEMORY="${MEMORY:-512Mi}"
CPU="${CPU:-1}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Build de la imagen: ${IMAGE} (VITE_API_URL=${VITE_API_URL})"
docker build \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  -t "${IMAGE}" \
  -t "${IMAGE_LATEST}" \
  "${REPO_ROOT}"

echo "==> Push de la imagen a Artifact Registry"
docker push "${IMAGE}"
docker push "${IMAGE_LATEST}"

echo "==> Deploy a Cloud Run: ${SERVICE_NAME} (${REGION})"
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --platform managed \
  --min-instances=0 \
  --cpu-boost \
  --memory "${MEMORY}" \
  --cpu "${CPU}" \
  --port 8080 \
  --allow-unauthenticated

echo "==> Listo. VITE_API_URL quedó embebido en el bundle de esta imagen;"
echo "    para cambiarlo hay que reconstruir y"
echo "    re-desplegar con VITE_API_URL=<nueva-url> $0, no basta con un"
echo "    redeploy de la misma imagen."
