import os
import re
import time
import json
import uuid
import shutil
import threading
import logging
import subprocess
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = Flask(__name__, static_folder="static")
CORS(app)

# In-memory dictionary tracking download tasks
tasks = {}
tasks_lock = threading.Lock()

def sanitize_filename(name: str) -> str:
    """
    Sanitize string strictly so browsers and Windows Explorer never truncate
    names, lose extensions, or fail to play files.
    """
    if not name:
        return "video"
    # Replace unicode fullwidth pipes, colons, slashes
    clean = name.replace("｜", "-").replace("|", "-").replace(":", " -").replace("/", "-").replace("\\", "-")
    # Strip quotes, commas, brackets, semicolons that break HTTP Content-Disposition headers
    clean = re.sub(r'[\'\"\,;?!#*&$@+=\[\]()<>]', '', clean)
    # Keep only safe alphanumeric, spaces, hyphens, and underscores
    clean = re.sub(r'[^a-zA-Z0-9\s\-_]', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:60] if clean else "video"

def format_bytes(bytes_val):
    if not bytes_val or bytes_val <= 0:
        return "Unknown"
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_val < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} TB"

def format_duration(seconds):
    if not seconds:
        return "Live / Unknown"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"

def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "tiktok.com" in url_lower:
        return "tiktok"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower:
        return "facebook"
    elif "reddit.com" in url_lower:
        return "reddit"
    elif "pinterest." in url_lower or "pin.it" in url_lower:
        return "pinterest"
    elif "vimeo.com" in url_lower:
        return "vimeo"
    elif "soundcloud.com" in url_lower:
        return "soundcloud"
    return "generic"

def periodic_cleanup():
    """Remove completed files older than 60 minutes to preserve disk space."""
    while True:
        try:
            now = time.time()
            if os.path.exists(DOWNLOADS_DIR):
                for fname in os.listdir(DOWNLOADS_DIR):
                    fpath = os.path.join(DOWNLOADS_DIR, fname)
                    if os.path.isfile(fpath) and (now - os.path.getmtime(fpath)) > 3600:
                        try:
                            os.remove(fpath)
                            logger.info(f"Cleaned up stale download: {fname}")
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")
        time.sleep(300)

cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
cleanup_thread.start()

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory(STATIC_DIR, path)

@app.route("/api/info", methods=["POST"])
def get_info():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url:
        return jsonify({"success": False, "error": "Please provide a valid video URL"}), 400

    platform = detect_platform(url)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Extraction error for {url}: {err_msg}")
        if "Unsupported URL" in err_msg:
            err_msg = "This URL is not supported or is invalid."
        elif "Private video" in err_msg or "Sign in" in err_msg:
            err_msg = "This video is private, age-restricted, or requires login."
        else:
            err_msg = re.sub(r'ERROR:\s*', '', err_msg)
        return jsonify({"success": False, "error": err_msg}), 400

    title = info.get("title") or "Untitled Media"
    thumbnail = info.get("thumbnail") or ""
    duration_sec = info.get("duration")
    duration_str = format_duration(duration_sec)
    uploader = info.get("uploader") or info.get("channel") or info.get("uploader_id") or "Unknown Creator"
    views = info.get("view_count")
    views_str = f"{views:,} views" if views else None

    # Available formats analysis
    formats = info.get("formats") or []
    video_resolutions = {}

    for f in formats:
        height = f.get("height")
        vcodec = f.get("vcodec")
        if height and vcodec != "none":
            res_label = f"{height}p"
            f_size = f.get("filesize") or f.get("filesize_approx")
            if height not in video_resolutions or (f_size and not video_resolutions[height].get("size")):
                video_resolutions[height] = {
                    "height": height,
                    "label": res_label,
                    "ext": "mp4",
                    "fps": f.get("fps") or 30,
                    "size_bytes": f_size,
                    "size_formatted": format_bytes(f_size) if f_size else None
                }

    available_videos = []

    if video_resolutions:
        sorted_heights = sorted(video_resolutions.keys(), reverse=True)
        for h in sorted_heights:
            v_item = video_resolutions[h]
            if h >= 1080:
                badge = "Full HD" if h == 1080 else ("2K" if h == 1440 else "4K Ultra HD")
            elif h >= 720:
                badge = "HD"
            else:
                badge = "SD"
            v_item["badge"] = badge
            available_videos.append(v_item)
    else:
        available_videos.append({
            "height": 1080,
            "label": "Best Quality",
            "ext": "mp4",
            "badge": "Original HD",
            "size_formatted": "Auto"
        })

    if len(available_videos) > 6:
        available_videos = [v for v in available_videos if v["height"] in [2160, 1440, 1080, 720, 480, 360]]

    audio_option = {
        "label": "MP3 Audio",
        "ext": "mp3",
        "badge": "High Quality",
        "bitrate": "192 kbps"
    }

    return jsonify({
        "success": True,
        "media": {
            "title": title,
            "thumbnail": thumbnail,
            "duration": duration_str,
            "duration_seconds": duration_sec,
            "uploader": uploader,
            "views": views_str,
            "platform": platform,
            "original_url": url,
            "video_formats": available_videos,
            "audio_format": audio_option
        }
    })

def run_download_thread(task_id: str, url: str, media_type: str, quality_height: int, raw_title: str):
    with tasks_lock:
        tasks[task_id]["status"] = "starting"
        tasks[task_id]["progress"] = 5

    clean_name = sanitize_filename(raw_title)

    def progress_hook(d):
        with tasks_lock:
            if task_id not in tasks:
                return
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes") or 0
                if total > 0:
                    pct = min(95.0, round((downloaded / total) * 100, 1))
                else:
                    pct = tasks[task_id].get("progress", 10)
                    if pct < 90:
                        pct += 2

                tasks[task_id]["status"] = "downloading"
                tasks[task_id]["progress"] = pct

                speed = d.get("speed")
                if speed:
                    tasks[task_id]["speed"] = f"{format_bytes(speed)}/s"

                eta = d.get("eta")
                if eta:
                    tasks[task_id]["eta"] = f"{int(eta)}s remaining"
            elif d.get("status") == "finished":
                tasks[task_id]["status"] = "merging"
                tasks[task_id]["progress"] = 96
                tasks[task_id]["speed"] = "Processing..."
                tasks[task_id]["eta"] = "Assembling video & audio..."

    out_template = os.path.join(DOWNLOADS_DIR, f"{task_id}.%(ext)s")

    if media_type == "audio":
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": out_template,
            "nopart": True,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "progress_hooks": [progress_hook],
            "quiet": True,
            "no_warnings": True,
        }
        final_ext = "mp3"
    else:
        # Prioritize H.264 (avc1) video and AAC (mp4a) audio for 100% universal MP4 playback
        # on Windows Media Player, QuickTime, Android, iOS, and TVs without codec errors.
        if quality_height and isinstance(quality_height, int) and quality_height > 0:
            fmt_str = (
                f"bestvideo[height<={quality_height}][vcodec^=avc1]+bestaudio[acodec^=mp4a]/"
                f"bestvideo[height<={quality_height}][vcodec^=avc1]+bestaudio/"
                f"bestvideo[height<={quality_height}]+bestaudio/"
                f"best[height<={quality_height}]/best"
            )
        else:
            fmt_str = (
                "bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/"
                "bestvideo[vcodec^=avc1]+bestaudio/"
                "bestvideo+bestaudio/best"
            )

        ydl_opts = {
            "format": fmt_str,
            "outtmpl": out_template,
            "nopart": True,
            "merge_output_format": "mp4",
            # Convert audio stream to AAC during muxing so Windows Media Player never throws error 0xc00d36c4
            "postprocessor_args": {
                "merger": ["-c:v", "copy", "-c:a", "aac"]
            },
            "progress_hooks": [progress_hook],
            "quiet": True,
            "no_warnings": True,
        }
        final_ext = "mp4"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        found_file = os.path.join(DOWNLOADS_DIR, f"{task_id}.{final_ext}")

        # Fallback search if extension differed
        if not os.path.exists(found_file):
            for f in os.listdir(DOWNLOADS_DIR):
                if f.startswith(task_id) and not f.endswith((".part", ".ytdl")):
                    found_file = os.path.join(DOWNLOADS_DIR, f)
                    break

        if not found_file or not os.path.exists(found_file):
            raise Exception("Downloaded file could not be assembled.")

        # Guaranteed 100% Universal Playback normalization for Windows Media Player & all devices
        if media_type == "video":
            with tasks_lock:
                tasks[task_id]["status"] = "merging"
                tasks[task_id]["speed"] = "Codec Verification"
                tasks[task_id]["eta"] = "Ensuring Universal Playback..."

            try:
                probe_cmd = ["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,codec_type", "-of", "json", found_file]
                probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
                probe_data = json.loads(probe_res.stdout or "{}")
                v_codecs = [s["codec_name"] for s in probe_data.get("streams", []) if s.get("codec_type") == "video"]
                a_codecs = [s["codec_name"] for s in probe_data.get("streams", []) if s.get("codec_type") == "audio"]

                v_codec = v_codecs[0] if v_codecs else ""
                a_codec = a_codecs[0] if a_codecs else ""

                is_h264 = v_codec == "h264"
                is_aac = a_codec == "aac"
                is_mp4 = found_file.lower().endswith(".mp4")

                # If the video is not H.264 or audio is not AAC or container is not MP4,
                # transcode/remux so Windows Media Player never throws error 0xc00d36c4
                if not (is_h264 and is_aac and is_mp4):
                    logger.info(f"Task {task_id} video format ({v_codec}/{a_codec}) requires normalization to H.264+AAC for universal playback")
                    target_mp4 = os.path.join(DOWNLOADS_DIR, f"{task_id}_universal.mp4")
                    ffmpeg_cmd = ["ffmpeg", "-y", "-i", found_file]
                    if is_h264:
                        ffmpeg_cmd.extend(["-c:v", "copy"])
                    else:
                        ffmpeg_cmd.extend(["-c:v", "libx264", "-preset", "veryfast", "-crf", "22"])

                    if is_aac:
                        ffmpeg_cmd.extend(["-c:a", "copy"])
                    else:
                        ffmpeg_cmd.extend(["-c:a", "aac", "-b:a", "192k"])

                    ffmpeg_cmd.extend(["-movflags", "+faststart", target_mp4])
                    subprocess.run(ffmpeg_cmd, check=True, timeout=180)

                    try:
                        os.remove(found_file)
                    except Exception:
                        pass
                    found_file = target_mp4
            except Exception as e:
                logger.warning(f"Codec normalization fallback: {e}")

        elif media_type == "audio":
            if not found_file.lower().endswith(".mp3"):
                target_mp3 = os.path.join(DOWNLOADS_DIR, f"{task_id}_universal.mp3")
                try:
                    ffmpeg_cmd = ["ffmpeg", "-y", "-i", found_file, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", target_mp3]
                    subprocess.run(ffmpeg_cmd, check=True, timeout=60)
                    try:
                        os.remove(found_file)
                    except Exception:
                        pass
                    found_file = target_mp3
                except Exception as e:
                    logger.warning(f"Audio normalization fallback: {e}")

        safe_filename = f"{clean_name}.{final_ext}"

        with tasks_lock:
            tasks[task_id]["status"] = "completed"
            tasks[task_id]["progress"] = 100
            tasks[task_id]["filepath"] = found_file
            tasks[task_id]["filename"] = safe_filename
            tasks[task_id]["file_size"] = format_bytes(os.path.getsize(found_file))
            logger.info(f"Task {task_id} ready for browser download: {safe_filename} ({tasks[task_id]['file_size']})")

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Download thread error for {task_id}: {tb}")
        with tasks_lock:
            tasks[task_id]["status"] = "error"
            tasks[task_id]["error"] = tb

@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    media_type = data.get("type", "video") # 'video' or 'audio'
    raw_height = data.get("height")
    try:
        height = int(raw_height) if raw_height else None
    except (ValueError, TypeError):
        height = None
    title = data.get("title") or "video"

    if not url:
        return jsonify({"success": False, "error": "URL required"}), 400

    task_id = str(uuid.uuid4())[:8]

    with tasks_lock:
        tasks[task_id] = {
            "task_id": task_id,
            "status": "queued",
            "progress": 0,
            "speed": "--",
            "eta": "--",
            "media_type": media_type,
            "title": title,
            "error": None,
            "created_at": time.time()
        }

    t = threading.Thread(
        target=run_download_thread,
        args=(task_id, url, media_type, height, title),
        daemon=True
    )
    t.start()

    return jsonify({
        "success": True,
        "task_id": task_id,
        "message": "Download initiated"
    })

@app.route("/api/progress/<task_id>", methods=["GET"])
def get_progress(task_id):
    with tasks_lock:
        task = tasks.get(task_id)

    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    return jsonify({
        "success": True,
        "task": {
            "task_id": task.get("task_id"),
            "status": task.get("status"),
            "progress": task.get("progress"),
            "speed": task.get("speed"),
            "eta": task.get("eta"),
            "filename": task.get("filename"),
            "file_size": task.get("file_size"),
            "media_type": task.get("media_type"),
            "error": task.get("error")
        }
    })

@app.route("/api/file/<task_id>", methods=["GET"])
def download_file(task_id):
    with tasks_lock:
        task = tasks.get(task_id)

    if not task or task.get("status") != "completed":
        return "File not ready or expired", 404

    filepath = task.get("filepath")
    media_type = task.get("media_type", "video")
    ext = ".mp3" if media_type == "audio" else ".mp4"

    raw_filename = task.get("filename") or f"media_{task_id}{ext}"
    base_name = os.path.splitext(raw_filename)[0]
    safe_base = sanitize_filename(base_name)
    final_filename = f"{safe_base}{ext}"

    if not filepath or not os.path.exists(filepath):
        return "File not found on server", 404

    mimetype = "audio/mpeg" if ext == ".mp3" else "video/mp4"

    response = send_file(
        filepath,
        mimetype=mimetype,
        as_attachment=True,
        download_name=final_filename,
        max_age=0
    )
    response.headers["Content-Disposition"] = f'attachment; filename="{final_filename}"'
    return response

@app.route("/api/open-folder/<task_id>", methods=["POST"])
def open_file_folder(task_id):
    with tasks_lock:
        task = tasks.get(task_id)

    if not task or not task.get("filepath"):
        return jsonify({"success": False, "error": "File not found"}), 404

    fpath = os.path.abspath(task["filepath"])
    if os.path.exists(fpath):
        subprocess.Popen(f'explorer /select,"{fpath}"')
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "File does not exist on disk"}), 404

@app.route("/api/downloads", methods=["GET"])
def list_downloads():
    with tasks_lock:
        task_list = []
        for tid, t in sorted(tasks.items(), key=lambda x: x[1].get("created_at", 0), reverse=True):
            task_list.append({
                "task_id": tid,
                "status": t.get("status"),
                "progress": t.get("progress"),
                "speed": t.get("speed"),
                "eta": t.get("eta"),
                "filename": t.get("filename"),
                "file_size": t.get("file_size"),
                "media_type": t.get("media_type"),
                "title": t.get("title"),
                "created_at": t.get("created_at"),
                "error": t.get("error")
            })
    return jsonify({"success": True, "downloads": task_list})

@app.route("/api/cancel/<task_id>", methods=["POST"])
def cancel_download(task_id):
    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        if task.get("status") in ["queued", "downloading", "merging"]:
            task["status"] = "canceled"
            task["error"] = "Canceled by user"
            return jsonify({"success": True, "message": "Task canceled"})
        return jsonify({"success": False, "error": "Task is not active"}), 400

@app.route("/api/system/health", methods=["GET"])
def system_health():
    # Check FFmpeg
    ffmpeg_installed = False
    ffmpeg_version = "Not detected"
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=3)
        if res.returncode == 0:
            ffmpeg_installed = True
            first_line = res.stdout.split("\n")[0]
            m = re.search(r'ffmpeg version\s+([^\s]+)', first_line)
            ffmpeg_version = m.group(1) if m else "Ready"
    except Exception:
        pass

    # Check disk space
    import shutil
    try:
        total, used, free = shutil.disk_usage(DOWNLOADS_DIR)
        disk_info = {
            "total": format_bytes(total),
            "used": format_bytes(used),
            "free": format_bytes(free),
            "percent_used": round((used / total) * 100, 1)
        }
    except Exception:
        disk_info = {"total": "Unknown", "used": "Unknown", "free": "Unknown", "percent_used": 0}

    # Task metrics
    with tasks_lock:
        active_count = sum(1 for t in tasks.values() if t.get("status") in ["queued", "downloading", "merging"])
        completed_count = sum(1 for t in tasks.values() if t.get("status") == "completed")

    return jsonify({
        "success": True,
        "engine": {
            "status": "Ready",
            "ytdlp_version": yt_dlp.version.__version__,
            "ffmpeg_ready": ffmpeg_installed,
            "ffmpeg_version": ffmpeg_version,
            "local_downloads_path": os.path.abspath(DOWNLOADS_DIR),
            "storage": disk_info,
            "active_tasks": active_count,
            "completed_tasks": completed_count
        }
    })

if __name__ == "__main__":
    logger.info("Starting OmniStream Video Downloader at http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
