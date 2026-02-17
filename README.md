# NKP Gallery — Nutanix S3 Demo

A containerized image gallery that demonstrates **Nutanix Kubernetes Platform (NKP)** and **Nutanix Unified Storage (NUS)** S3 integration. Upload, view, and delete images — all stored in an S3-compatible object store. Scale to multiple pods and watch the shared storage in action.

```
┌─────────────────────────────────────────┐
│        Nutanix Kubernetes Platform      │
│                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │  Pod 1   │ │  Pod 2   │ │  Pod 3   │ │
│   │  Gallery │ │  Gallery │ │  Gallery │ │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│        └──────┬──────┘──────┬─────┘       │
│               │  K8s Service│              │
│               └──────┬──────┘              │
└──────────────────────┼─────────────────┘
                       │ S3 API (HTTPS)
               ┌───────▼────────┐
               │  Nutanix NUS    │
               │  Object Store   │
               └─────────────────┘
```

---

## What You Will Need

- An **NKP cluster** with `kubectl` access
- A **NUS Object Store** with a bucket created (via Prism Central)
- **S3 access key + secret key** for that bucket
- Internet access to pull the container image (or a pre-loaded image)

---

## Deployment (Under 10 Minutes)

### Step 1: Create an S3 Bucket in NUS

In Prism Central, navigate to **Objects > Object Stores**, select your store, and create a bucket named `nkp-gallery-demo` (or any name you choose). Generate an access key and secret key.

### Step 2: Edit Configuration

Open `k8s/deploy.yaml` and fill in these four values in the **Secret** section:

| Field | Description |
|-------|-------------|
| `S3_ENDPOINT` | Your NUS Object Store endpoint URL |
| `S3_ACCESS_KEY` | S3 access key from Prism Central |
| `S3_SECRET_KEY` | S3 secret key from Prism Central |
| `S3_BUCKET` | The bucket name you created |

Also update the **Deployment** `image` field to point to your container registry.

### Step 3: Deploy

```bash
kubectl apply -f k8s/deploy.yaml
```

### Step 4: Access the App

```bash
# Find a node IP
kubectl get nodes -o wide

# Open in browser
http://<any-node-ip>:30080
```

---

## Demo Script: Scaling Demo

This is the key demo moment. After uploading a few images:

```bash
# Scale to 5 replicas
kubectl scale deployment gallery-app -n nkp-gallery-demo --replicas=5

# Watch pods come up
kubectl get pods -n nkp-gallery-demo -w
```

Now **refresh the browser several times**. Notice:
- The **banner color and pod name change** on each refresh — you are hitting different containers
- The **gallery images stay the same** — because all pods share the same S3 object storage

This demonstrates the modern cloud-native pattern: **stateless compute on Kubernetes, persistent data in S3 object storage — all running on Nutanix**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Images do not load | Ensure `IMAGE_PROXY=true` (default). This proxies images through Flask so the browser does not need direct access to the NUS endpoint. |
| S3 connection error | Verify the `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` in your Secret. Check that the bucket exists. |
| SSL/TLS errors | Set `S3_VERIFY_SSL=false` in the Secret (common for lab environments with self-signed certs). |
| Pod stuck in CrashLoopBackOff | Check logs: `kubectl logs -n nkp-gallery-demo deployment/gallery-app` |
| NodePort not reachable | Verify no firewall blocks port `30080`. Alternatively, use `kubectl port-forward` for quick access. |

---

## Cleanup

```bash
kubectl delete namespace nkp-gallery-demo
```

This removes all resources (Deployment, Service, Secret, and Namespace).

---

## Local Development

```bash
# Set environment variables
export S3_ENDPOINT="https://your-nus-endpoint"
export S3_ACCESS_KEY="your-key"
export S3_SECRET_KEY="your-secret"
export S3_BUCKET="nkp-gallery-demo"
export S3_VERIFY_SSL="false"

# Install dependencies
pip install -r app/requirements.txt

# Run
python app/app.py
```

Open `http://localhost:8080`.

---

## Building the Container Image

```bash
docker build -t nkp-s3-gallery .
docker tag nkp-s3-gallery ghcr.io/YOUR_ORG/nkp-s3-gallery:latest
docker push ghcr.io/YOUR_ORG/nkp-s3-gallery:latest
```

Or push to `main` and GitHub Actions will build and push automatically.
