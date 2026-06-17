import os
import uuid
import base64
import json
import threading
import time
from pathlib import Path
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from markupsafe import escape

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(PROJECT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

PORTKEY_API_KEY = os.getenv("PORTKEY_API_KEY")
PORTKEY_MODEL = os.getenv("PORTKEY_MODEL", "google/gemini-1.5-image")
PORTKEY_URL = os.getenv("PORTKEY_URL", "https://api.portkey.ai/v1/chat/completions")
FAKE_MODE = os.getenv("FAKE_MODE", "false").lower() == "true"
JOB_TTL_SECONDS = int(os.getenv("JOB_TTL_SECONDS", "1800"))
PUBLIC_QR_BASE_URL = os.getenv("PUBLIC_QR_BASE_URL", "").rstrip("/")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

jobs = {}
jobs_lock = threading.Lock()

def _delete_file(path):
    try:
        if path and path.exists():
            path.unlink()
    except OSError as error:
        print(f"DEBUG CLEANUP ERROR: {error}")

def _delete_job_files(job):
    for key in ("upload_name", "result_name"):
        filename = job.get(key)
        if not filename:
            continue

        target_dir = UPLOAD_DIR if key == "upload_name" else RESULT_DIR
        _delete_file(target_dir / filename)

def _cleanup_old_jobs():
    now = time.time()
    expired_jobs = []

    with jobs_lock:
        for job_id, job in list(jobs.items()):
            created_at = job.get("created_at", now)
            if now - created_at > JOB_TTL_SECONDS:
                expired_jobs.append(jobs.pop(job_id))

    for job in expired_jobs:
        _delete_job_files(job)

    for directory in (UPLOAD_DIR, RESULT_DIR):
        for path in directory.iterdir():
            if path.is_file() and now - path.stat().st_mtime > JOB_TTL_SECONDS:
                _delete_file(path)

def _job_response(job_id, job):
    data = {
        "job_id": job_id,
        "status": job.get("status", "unknown")
    }

    if job.get("image_url"):
        data["image_url"] = job["image_url"]
    if job.get("upload_name"):
        data["photo_url"] = f"/api/photo/{job_id}"
    if job.get("error"):
        data["error"] = job["error"]

    return data

def _allowed_photo_suffix(photo):
    if photo.mimetype == "image/jpeg":
        return ".jpg"
    if photo.mimetype == "image/png":
        return ".png"
    return ".jpg"

def _portkey_headers():
    if not PORTKEY_API_KEY:
        raise RuntimeError("Missing PORTKEY_API_KEY in .env")

    return {
        "Content-Type": "application/json",
        "x-portkey-api-key": PORTKEY_API_KEY,
        "x-portkey-provider": "google",
    }

def _data_url_from_file(path: Path):
    ext = path.suffix.lower().lstrip(".")
    mime = f"image/{ext}" if ext in ("png", "webp") else "image/jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{b64}"

def _extract_first_image_bytes(resp_json):
    """
    Specifically targets: choices[0].message.images[0].image_url.url
    """
    choices = resp_json.get("choices", [])
    if not choices:
        raise RuntimeError(f"No choices in response: {resp_json}")

    msg = choices[0].get("message", {})
    images = msg.get("images", [])
    
    # Check the 'images' key found in your logs
    if images:
        img_item = images[0]
        # Handle the specific nested image_url structure
        data = None
        if isinstance(img_item, dict):
            # Try images[0].image_url.url
            data = img_item.get("image_url", {}).get("url") or img_item.get("url") or img_item.get("data")
        elif isinstance(img_item, str):
            data = img_item

        if data:
            if "base64," in data:
                return base64.b64decode(data.split("base64,")[1])
            return base64.b64decode(data)

    # Fallback to content parts
    for part in msg.get("content_parts", []):
        if part.get("type") == "image":
            b64 = part.get("data") or (part.get("image_url", {}).get("url") if "image_url" in part else None)
            if b64:
                return base64.b64decode(b64.split("base64,")[-1])

    raise RuntimeError(f"Could not find image in message. Keys present: {list(msg.keys())}")

def generate_image_portkey(prompt, input_image_path):
    image_data_url = _data_url_from_file(input_image_path)
    
    payload = {
        "model": PORTKEY_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}}
                ]
            }
        ],
        # Forces Gemini to return an actual image instead of just text
        "extra_body": {"modalities": ["text", "image"]} 
    }

    r = requests.post(PORTKEY_URL, headers=_portkey_headers(), json=payload, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"API Error {r.status_code}: {r.text}")
    
    return _extract_first_image_bytes(r.json())

def _generate_job(job_id, prompt):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return

        job["status"] = "generating"
        job["prompt"] = prompt
        upload_name = job.get("upload_name")

    upload_path = UPLOAD_DIR / upload_name

    try:
        result_name = f"{job_id}_result.png"
        result_path = RESULT_DIR / result_name

        if FAKE_MODE:
            result_path.write_bytes(upload_path.read_bytes())
        else:
            out_bytes = generate_image_portkey(prompt, upload_path)
            result_path.write_bytes(out_bytes)

        with jobs_lock:
            job = jobs.get(job_id)
            if job:
                job.update({
                    "status": "done",
                    "image_url": f"/media/{result_name}",
                    "result_name": result_name,
                    "updated_at": time.time()
                })
    except Exception as error:
        print(f"DEBUG GENERATION ERROR: {str(error)}")
        with jobs_lock:
            job = jobs.get(job_id)
            if job:
                job.update({
                    "status": "error",
                    "error": str(error),
                    "updated_at": time.time()
                })

@app.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(RESULT_DIR, filename)

@app.route("/api/photo/<job_id>")
def photo_preview(job_id):
    _cleanup_old_jobs()

    with jobs_lock:
        job = jobs.get(job_id)
        upload_name = job.get("upload_name") if job else None

    if not upload_name:
        return jsonify(error="Photo not found"), 404

    return send_from_directory(UPLOAD_DIR, upload_name)

@app.route("/view/<path:filename>")
def view_result(filename):
    safe_filename = escape(filename)
    image_url = f"/media/{safe_filename}"
    download_url = f"/download/{safe_filename}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Movie Character</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="share-page">
  <main class="share-shell">
    <p class="screen-kicker">Your movie character</p>
    <img class="share-image" src="{image_url}" alt="Generated movie character">
    <a class="share-save-button" href="{download_url}" download>Save Image</a>
    <p class="share-hint">On iPhone or Android: tap Save Image, or press and hold the picture to add it to Photos.</p>
  </main>
</body>
</html>"""

@app.route("/download/<path:filename>")
def download(filename):
    return send_from_directory(RESULT_DIR, filename, as_attachment=True)

@app.route("/")
def index():
    return send_from_directory(PROJECT_DIR, "index.html")

@app.route("/config.js")
def frontend_config():
    public_url = PUBLIC_QR_BASE_URL or request.host_url.rstrip("/")
    config = {"publicQrBaseUrl": public_url}
    return app.response_class(
        response=f"window.APP_CONFIG = {json.dumps(config)};",
        mimetype="application/javascript"
    )

@app.route("/<path:filename>")
def frontend(filename):
    return send_from_directory(PROJECT_DIR, filename)

@app.get("/api/status/<job_id>")
def status(job_id):
    _cleanup_old_jobs()

    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return jsonify({"status": "unknown"})
        return jsonify(_job_response(job_id, job))

@app.delete("/api/job/<job_id>")
def delete_job(job_id):
    with jobs_lock:
        job = jobs.pop(job_id, None)

    if not job:
        return jsonify(status="deleted")

    _delete_job_files(job)

    return jsonify(status="deleted")

@app.post("/api/photo")
def upload_photo():
    try:
        _cleanup_old_jobs()

        if "photo" not in request.files:
            return jsonify(error="Missing uploaded photo"), 400

        photo = request.files["photo"]
        job_id = str(uuid.uuid4())
        suffix = _allowed_photo_suffix(photo)
        upload_path = UPLOAD_DIR / f"{job_id}{suffix}"
        photo.save(upload_path)

        with jobs_lock:
            jobs[job_id] = {
                "status": "photo_ready",
                "upload_name": upload_path.name,
                "created_at": time.time(),
                "updated_at": time.time()
            }

        return jsonify(job_id=job_id, status="photo_ready", photo_url=f"/api/photo/{job_id}")
    except Exception as e:
        print(f"DEBUG PHOTO ERROR: {str(e)}")
        return jsonify(error=str(e)), 500

@app.post("/api/submit")
def submit():
    try:
        _cleanup_old_jobs()

        job_id = request.form.get("job_id", "").strip()
        prompt = request.form.get("prompt", "").strip()
        if not prompt:
            return jsonify(error="Missing prompt"), 400

        if not job_id:
            return jsonify(error="Missing job_id"), 400

        with jobs_lock:
            job = jobs.get(job_id)
            if not job or not job.get("upload_name"):
                return jsonify(error="Photo job not found"), 404
            if job.get("status") == "generating":
                return jsonify(_job_response(job_id, job))

            job["status"] = "queued"
            job["prompt"] = prompt
            job["updated_at"] = time.time()

        thread = threading.Thread(target=_generate_job, args=(job_id, prompt), daemon=True)
        thread.start()

        with jobs_lock:
            return jsonify(_job_response(job_id, jobs[job_id]))
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        return jsonify(error=str(e)), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=FLASK_DEBUG,
        use_reloader=FLASK_DEBUG
    )
