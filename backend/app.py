import os
import uuid
import base64
from pathlib import Path
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

load_dotenv()

PORTKEY_API_KEY = os.getenv("PORTKEY_API_KEY")
PORTKEY_MODEL = os.getenv("PORTKEY_MODEL", "google/gemini-1.5-image")
PORTKEY_URL = os.getenv("PORTKEY_URL", "https://api.portkey.ai/v1/chat/completions")

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

jobs = {}

def _portkey_headers():
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

@app.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(RESULT_DIR, filename)

@app.post("/api/submit")
def submit():
    try:
        photo = request.files["photo"]
        prompt = request.form.get("prompt")
        job_id = str(uuid.uuid4())
        
        upload_path = UPLOAD_DIR / f"{job_id}.png"
        photo.save(upload_path)
        
        out_bytes = generate_image_portkey(prompt, upload_path)
        
        result_name = f"{job_id}_result.png"
        (RESULT_DIR / result_name).write_bytes(out_bytes)
        
        jobs[job_id] = {"status": "done", "image_url": f"/media/{result_name}"}
        return jsonify(job_id=job_id, status="done", image_url=f"/media/{result_name}")
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        return jsonify(error=str(e)), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)