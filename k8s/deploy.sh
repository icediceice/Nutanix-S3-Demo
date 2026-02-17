#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="nkp-gallery-demo"
SERVICE="gallery-app"
MANIFEST="$(dirname "$0")/deploy.yaml"

echo "Applying manifest..."
kubectl apply -f "$MANIFEST"

echo "Waiting for LoadBalancer IP to be assigned..."
for i in $(seq 1 60); do
  EXTERNAL_IP=$(kubectl get svc "$SERVICE" -n "$NAMESPACE" \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)

  if [ -n "$EXTERNAL_IP" ]; then
    echo ""
    echo "Gallery is live at: http://${EXTERNAL_IP}"
    exit 0
  fi

  printf "."
  sleep 3
done

echo ""
echo "Timed out waiting for external IP. Check status with:"
echo "  kubectl get svc -n ${NAMESPACE}"
exit 1
