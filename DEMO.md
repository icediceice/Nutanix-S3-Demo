# Demo Talk Track

Suggested narration for field engineers presenting this demo to customers.

---

## 1. Open the App

> "This is a containerized application running on Nutanix Kubernetes Platform. It is a simple image gallery — but what makes it interesting is *where* the data lives."

## 2. Upload 3-4 Images

> "I am uploading some images. These are being stored via the S3 API into Nutanix Unified Storage — our on-prem, S3-compatible object storage running on the same Nutanix cluster."

## 3. Show the Gallery

> "Every image you see is served from the S3 bucket. Notice up top — you can see the pod name and a unique color. That tells us which container is serving this request right now."

## 4. Scale Up

Run this command live:

```bash
kubectl scale deployment gallery-app -n nkp-gallery-demo --replicas=5
```

> "I just scaled this application from 1 container to 5."

## 5. Refresh Repeatedly

> "Watch the banner color and pod name change — you are hitting 5 different containers now. But the images? All the same. That is because object storage is **decoupled** from compute. Every pod reads from the same S3 bucket."

## 6. (Optional) Show Prism Central

> "And here in Prism Central, you can see the actual objects in the bucket. You can set lifecycle policies, versioning, WORM compliance — all the enterprise data management features you expect."

## 7. The Punchline

> "This is the modern application pattern — **stateless compute on Kubernetes, persistent data in S3 object storage** — all running on Nutanix, nothing leaving your data center."

---

## Quick Reference Commands

```bash
# Deploy
kubectl apply -f k8s/deploy.yaml

# Watch pods
kubectl get pods -n nkp-gallery-demo -w

# Scale up
kubectl scale deployment gallery-app -n nkp-gallery-demo --replicas=5

# Scale back down
kubectl scale deployment gallery-app -n nkp-gallery-demo --replicas=1

# Cleanup
kubectl delete namespace nkp-gallery-demo
```
