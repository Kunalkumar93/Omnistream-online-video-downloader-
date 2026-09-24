# OmniStream — Universal Desktop Media Utility & Downloader ⚡

OmniStream is a high-performance, desktop-grade local web utility that allows you to inspect, analyze, and download video and audio from popular social media platforms including **YouTube**, **Instagram**, **X (Twitter)**, **TikTok**, **Reddit**, **Vimeo**, **SoundCloud**, and more.

Built with an engineered backend pipeline powered by **yt-dlp** and **FFmpeg**, OmniStream guarantees **100% universal playback compatibility (H.264 + AAC in MP4 container with faststart metadata)** across all desktop and mobile operating systems, eliminating the notorious Windows Media Player `0xc00d36c4` codec error.

---

## ✨ Key Features

- 🎯 **Universal Playback Guarantee**: Every downloaded video is verified and normalized to standard H.264 video and AAC audio with `+faststart` metadata, ensuring smooth playback on Windows Media Player, QuickTime, iOS, Android, and web browsers.
- 🌐 **Multi-Platform Support**: Seamlessly downloads from YouTube, Instagram Reels & Stories, X/Twitter, TikTok, Reddit, Vimeo, Facebook, Twitch clips, SoundCloud, and 15+ other platforms.
- 📊 **Stream Inspector & Progressive Quality Selector**: Intelligently parses source video streams, presenting recommended best-quality profiles alongside complete progressive quality grids (4K, 1440p, 1080p, 720p, 480p, 360p).
- 🎵 **High-Fidelity Audio Extraction**: One-click audio ripping with automatic conversion to crystal-clear 192kbps MP3 (`libmp3lame`).
- ⚡ **Interactive Desktop UI**:
  - Persistent 240px navigation sidebar with real-time queue badges.
  - Command Palette (`Ctrl+K` / `Cmd+K`) for lightning-fast keyboard-driven actions.
  - Native Windows File Explorer integration to reveal saved files instantly.
  - Real-time download progress bar with transfer speed and ETA estimates.
  - System Diagnostics view displaying live FFmpeg version, disk space, and engine status.
  - Local session history persisted in browser storage.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python 3, Flask, yt-dlp, FFmpeg / FFprobe
- **Frontend**: Modern Vanilla JavaScript (ES6+), Semantic HTML5, CSS Custom Properties (Desktop Dark Slate theme)
- **Audio/Video Encoding**: H.264 (libx264), AAC, MP3 (libmp3lame)

---

## 🚀 Quick Start Guide

### Prerequisites

1. **Python 3.8+** installed and added to PATH.
2. **FFmpeg** installed and accessible via system PATH (run `ffmpeg -version` to verify).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kunalkumar93/Omnistream-online-video-downloader-.git
   cd Omnistream-online-video-downloader-
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch the application**:
   - On Windows: Simply double-click `run.bat` or run:
     ```bash
     python app.py
     ```
   - Open your browser and navigate to:
     ```
     http://127.0.0.1:5000/
     ```

---

## 📁 Project Structure

```text
├── app.py              # Flask server, task queue, and FFmpeg universal pipeline
├── download.py         # Helper script for standalone downloads
├── requirements.txt    # Python dependencies (flask, flask-cors, yt-dlp)
├── run.bat             # Windows one-click start script
├── downloads/          # Local destination folder for completed media files
└── static/
    ├── index.html      # Desktop workspace UI & modular views
    ├── css/
    │   └── style.css   # Modern dark desktop theme & responsive design system
    └── js/
        └── app.js      # Client router, progressive disclosure & download manager
```

---

## 🌐 Deployment (Local vs Cloud vs Vercel)

### 1. Local Machine (Recommended for Full Power & FFmpeg Muxing)
- Run `run.bat` or `python app.py`.
- Full FFmpeg transcoding, 4K/UHD merging, and lossless MP3 conversion are supported with zero timeouts.

### 2. Vercel Serverless Deployment
- Pre-configured with `vercel.json` for one-click deployment.
- **Note on Serverless Limits**: Vercel functions have a 10-15s execution timeout and a read-only filesystem. OmniStream automatically adapts by using `/tmp` and providing **Instant Direct Save** buttons to download directly from the source CDN.
- YouTube bot protections on cloud IPs are automatically handled via Android/iOS client extractors.

### 3. Persistent Cloud Hosting (Render / Railway / Docker)
- For a 24/7 web-accessible server with full background downloading and FFmpeg support, deploy on **Render** (Web Service), **Railway**, or **Fly.io** using Python 3 and FFmpeg buildpacks.

---

## 🛡️ License & Disclaimer

This project is intended strictly for personal archiving and educational purposes. Always respect content creators' rights, copyright regulations, and platform terms of service.
