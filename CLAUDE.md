# NKP S3 Gallery — Project Guide

## Overview
Containerized image gallery demo app showcasing Nutanix Kubernetes Platform (NKP) + Nutanix Unified Storage (NUS) S3 integration. Targeted at Nutanix field engineers for customer demos.

## Tech Stack
- **Backend:** Python 3.12, Flask, boto3, gunicorn
- **Frontend:** HTML + CSS + vanilla JS (no build step, served by Flask)
- **Container:** Docker, python:3.12-slim base image
- **Orchestration:** Kubernetes (single YAML deployment)
- **CI/CD:** GitHub Actions → ghcr.io

## Project Structure
```
app/app.py            — Flask application (routes, S3 client, pod identity)
app/templates/         — Jinja2 templates (single page: index.html)
app/static/            — CSS + JS (style.css, app.js)
app/requirements.txt   — Python dependencies
Dockerfile             — Multi-stage build, non-root user
k8s/deploy.yaml        — Namespace + Secret + Deployment + Service
.github/workflows/     — GitHub Actions build pipeline
```

## Key Design Decisions
- **IMAGE_PROXY=true by default** — proxies S3 images through Flask since browsers often can't reach NUS endpoints directly in on-prem environments
- **Pod identity via hostname hash** — deterministic accent color from 12-color palette, changes on scaling to prove load balancing while gallery content stays the same
- **Single YAML deployment** — engineers edit 4 values in the Secret, then `kubectl apply`
- **No frontend build toolchain** — vanilla JS/CSS to keep it simple for non-developers

## Container Image
- Registry: `ghcr.io/icediceice/nkp-s3-gallery:latest`
- Base: `python:3.12-slim` (~63MB compressed)

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Main gallery page |
| `/api/images` | GET | List images with presigned/proxy URLs |
| `/api/upload` | POST | Upload files to S3 |
| `/api/delete/<key>` | DELETE | Remove image from S3 |
| `/api/health` | GET | S3 connectivity check |
| `/api/info` | GET | Pod hostname, color, bucket info |
| `/api/image/<key>` | GET | Proxy image bytes from S3 |

## Environment Variables
`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_VERIFY_SSL`, `IMAGE_PROXY`, `MAX_FILE_SIZE`, `PORT`

## Common Tasks
- **Build image:** `docker build -t nkp-s3-gallery .`
- **Run locally:** `pip install -r app/requirements.txt && python app/app.py`
- **Deploy:** `kubectl apply -f k8s/deploy.yaml`
- **Scale demo:** `kubectl scale deployment gallery-app -n nkp-gallery-demo --replicas=5`
