import os
import socket
import hashlib
import datetime

from flask import Flask, render_template, request, jsonify, Response
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "nkp-gallery-demo")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_VERIFY_SSL = os.environ.get("S3_VERIFY_SSL", "true").lower() == "true"
IMAGE_PROXY = os.environ.get("IMAGE_PROXY", "true").lower() == "true"
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", "10"))  # MB
PORT = int(os.environ.get("PORT", "8080"))

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

# ---------------------------------------------------------------------------
# Pod identity
# ---------------------------------------------------------------------------

ACCENT_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8C471", "#82E0AA",
]


def get_pod_info():
    hostname = socket.gethostname()
    color_index = int(hashlib.md5(hostname.encode()).hexdigest(), 16) % len(ACCENT_COLORS)
    return {"hostname": hostname, "color": ACCENT_COLORS[color_index]}


# ---------------------------------------------------------------------------
# S3 client
# ---------------------------------------------------------------------------


def _build_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT or None,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name=S3_REGION,
        verify=S3_VERIFY_SSL,
        config=Config(signature_version="s3v4"),
    )


s3 = _build_s3_client()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _image_url(key: str) -> str:
    if IMAGE_PROXY:
        return f"/api/image/{key}"
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=3600,
    )


# ---------------------------------------------------------------------------
# Routes — pages
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    pod = get_pod_info()
    return render_template(
        "index.html",
        pod=pod,
        bucket=S3_BUCKET,
        endpoint=S3_ENDPOINT,
    )


# ---------------------------------------------------------------------------
# Routes — API
# ---------------------------------------------------------------------------


@app.route("/api/info")
def api_info():
    pod = get_pod_info()
    return jsonify(
        hostname=pod["hostname"],
        color=pod["color"],
        bucket=S3_BUCKET,
        endpoint=S3_ENDPOINT,
    )


@app.route("/api/health")
def api_health():
    try:
        s3.head_bucket(Bucket=S3_BUCKET)
        return jsonify(status="healthy", bucket=S3_BUCKET), 200
    except Exception as exc:
        return jsonify(status="unhealthy", error=str(exc)), 503


@app.route("/api/images")
def api_images():
    try:
        resp = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix="images/")
        items = []
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/"):
                continue
            # Try to get original filename from metadata
            filename = key.split("/", 1)[-1] if "/" in key else key
            # Strip timestamp prefix if present (format: 20240101T120000_name.jpg)
            if "_" in filename and len(filename) > 16:
                filename = filename.split("_", 1)[1]
            items.append({
                "key": key,
                "filename": filename,
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
                "url": _image_url(key),
            })
        items.sort(key=lambda x: x["last_modified"], reverse=True)
        return jsonify(images=items, count=len(items))
    except Exception as exc:
        return jsonify(error=str(exc)), 500


@app.route("/api/upload", methods=["POST"])
def api_upload():
    if "file" not in request.files:
        return jsonify(error="No file provided"), 400

    uploaded = request.files.getlist("file")
    results = []

    for f in uploaded:
        if not f or not f.filename:
            continue
        if not _allowed_file(f.filename):
            results.append({"filename": f.filename, "error": "File type not allowed"})
            continue

        # Read and check size
        data = f.read()
        if len(data) > MAX_FILE_SIZE * 1024 * 1024:
            results.append({"filename": f.filename, "error": f"File exceeds {MAX_FILE_SIZE}MB limit"})
            continue

        # Check content type
        if f.content_type not in ALLOWED_CONTENT_TYPES:
            results.append({"filename": f.filename, "error": "Invalid content type"})
            continue

        timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%S")
        safe_name = f.filename.replace(" ", "_")
        key = f"images/{timestamp}_{safe_name}"

        try:
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=key,
                Body=data,
                ContentType=f.content_type,
                Metadata={"original-filename": f.filename},
            )
            results.append({
                "filename": f.filename,
                "key": key,
                "size": len(data),
                "url": _image_url(key),
            })
        except Exception as exc:
            results.append({"filename": f.filename, "error": str(exc)})

    if not results:
        return jsonify(error="No valid files uploaded"), 400
    return jsonify(uploaded=results), 201


@app.route("/api/delete/<path:key>", methods=["DELETE"])
def api_delete(key):
    try:
        s3.delete_object(Bucket=S3_BUCKET, Key=key)
        return jsonify(deleted=key), 200
    except Exception as exc:
        return jsonify(error=str(exc)), 500


@app.route("/api/image/<path:key>")
def api_image_proxy(key):
    """Proxy an S3 object through Flask so the browser never needs direct NUS access."""
    try:
        resp = s3.get_object(Bucket=S3_BUCKET, Key=key)
        return Response(
            resp["Body"].read(),
            content_type=resp.get("ContentType", "application/octet-stream"),
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "NoSuchKey":
            return jsonify(error="Image not found"), 404
        return jsonify(error=str(exc)), 500


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
