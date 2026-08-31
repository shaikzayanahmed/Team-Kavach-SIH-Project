# 🛡️ SENTINEL-EYE | Autonomous Tactical Computer Vision & Intelligence Command

An advanced client-side Computer Vision and Real-time Multi-Target Tracking platform powered by **TensorFlow.js** and **COCO-SSD**. Designed for automated perimeter surveillance, suspect identification, biometric profiling, and persistent unknown subject activity logging.

![Sentinel-Eye Tactical Banner](https://img.shields.io/badge/AI%20Core-TensorFlow.js%20COCO--SSD-00e5ff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active%20Surveillance-00ff9d?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web%20%2F%20HTML5%20%2F%20WebGL-ffba4b?style=for-the-badge)

---

## ⚡ Core Features

### 1. 🔍 Unknown Individual Activity Tracking & Dossier Database
- **Automated Multi-Target Session IDs**: Assigns persistent tracking identifiers (e.g., `UNK-4819`) to any unrecognized individual entering the camera sector.
- **Time-on-Site Analytics**: Measures exact timestamps (`First Seen`, `Last Seen`) and live active presence duration (`0m 45s`, `1m 24s`, etc.).
- **Social Interaction Detection ("Who Was He Talking To")**: Pairwise conversational proximity analysis with real-time HUD connector beams and duration counters (`💬 CONVERSING (24s)`).
- **In-Hand & Carried Item Association**: Detects objects in hands or carried (backpacks, cell phones, laptops, umbrellas, etc.) with automated threat elevation for suspicious items (`KNIFE`, `GUN`, `SCISSORS`).
- **Biometric & Physical Appearance Profiling**:
  - **Height & Stature Estimation**: Normalized vertical scale (`~5'10" - 6'0" (178-183 cm)`).
  - **Facial Complexion & Mask Detection**: Pixel sampling for skin tone (`Fair`, `Medium`, `Olive`, `Deep`) and obstruction/mask detection.
  - **Build & Posture**: Aspect ratio analysis (`Athletic`, `Slender`, `Broad`, `Standing`, `Sitting`).
  - **Attire Recognition**: Upper and lower garment color classification with live hex color swatches.
- **AI Executive Summary & Chronological Timeline**: Generates natural forensic summaries and timestamped activity logs for every target.
- **Dossier Management & Export**: Search, filter, export to **JSON** or **CSV**, and generate printable PDF forensic reports (`window.print()`).

### 2. 🛡️ Whitelist Registry (Friendly Personnel)
- Enroll authorized operators/commanders via 1-click live camera facial capture or from existing unknown dossiers.
- Whitelisted personnel are verified with green tactical reticles and bypass intruder alerts.

### 3. 🚨 Criminal & Wanted Fugitive Watchlist
- Cross-references incoming targets against federal and international law enforcement databases (Interpol Red Notices, High Felonies).
- Built-in simulation trigger for tactical response drills.

### 4. 🎛️ Tactical Command HUD & WebGL Optics
- Military-grade glassmorphic UI with animated WebGL background grid shader.
- Multi-optics filters: **RGB (Normal)**, **NVG (Night Vision)**, **Thermal IR**, and **Edge/Wireframe**.
- Emergency lockdown controls with synthesized Web Audio alarms and sirens.

---

## 🚀 Getting Started

### Prerequisites
All dependencies (TensorFlow.js, COCO-SSD, TailwindCSS, Google Fonts) are loaded via CDN. No local build tools or package managers required.

### Running Locally

You can serve the directory with any local HTTP server:

#### Option 1: Python (Built-in)
```bash
python -m http.server 8080
```

#### Option 2: Node.js (npx)
```bash
npx http-server . -p 8080 -o
```

#### Option 3: VS Code Live Server
Open the folder in VS Code and click **"Go Live"**.

Navigate to **`http://localhost:8080`** and allow camera permissions when prompted.

---

## 📁 Repository Structure

```
.
├── index.html        # Tactical command center UI, modals & WebGL shaders
├── style.css         # Tactical HUD styles, glassmorphism, reticles & animations
├── app.js            # SentinelEngine: CV inference, tracking, biometrics & DB
├── .gitignore        # Git ignore rules
└── README.md         # Documentation
```

---

## 🔒 Privacy & Local Processing
All computer vision, object detection, and biometric sampling occur **100% locally in your browser** on the client side using WebGL/TensorFlow.js. No video frames are uploaded to any external server.
