# 🛡️ SENTINEL-EYE | Autonomous Tactical Computer Vision & Intelligence Command

An advanced client-side Computer Vision, Real-time Multi-Target Tracking, and **NVIDIA NIM Multimodal Vision Intelligence** platform. Combines local 60 FPS WebGL tracking with enterprise-grade cloud Vision Foundation Models for automated perimeter surveillance, suspect identification, biometric profiling, and deep forensic dossier generation.

![Sentinel-Eye Tactical Banner](https://img.shields.io/badge/AI%20Core-TensorFlow.js%20%2B%20NVIDIA%20NIM-00e5ff?style=for-the-badge)
![NVIDIA Vision](https://img.shields.io/badge/NVIDIA%20AI-Llama%203.2%20Vision%20%2F%20NeVA-10b981?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active%20Surveillance-00ff9d?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web%20%2F%20HTML5%20%2F%20WebGL-ffba4b?style=for-the-badge)

---

## ⚡ Core Features

### 1. 🧠 NVIDIA NIM Multimodal Vision Intelligence (Deep Reasoning)
- **Deep Multimodal Forensic Scans**: One-click neural visual analysis of subject crops using models like `meta/llama-3.2-11b-vision-instruct`, `meta/llama-3.2-90b-vision-instruct`, and `nvidia/neva-22b`.
- **Automated Threat Assessment**: Classifies subjects into `LOW`, `MODERATE`, `ELEVATED`, or `CRITICAL` risk tiers with concise tactical rationales.
- **Concealed Gear & Weapon Risk Reconnaissance**: Visual inspection for concealed objects, backpacks, face coverings, and suspicious demeanor.
- **Live Optical Sector Interrogation ("Ask AI")**: Real-time Visual Question Answering (VQA) against frozen snapshots of the live camera feed with tactical presets.

### 2. 🔍 Unknown Individual Activity Tracking & Dossier Database
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

### 3. 🛡️ Whitelist Registry (Friendly Personnel)
- Enroll authorized operators/commanders via 1-click live camera facial capture or from existing unknown dossiers.
- Whitelisted personnel are verified with green tactical reticles and bypass intruder alerts.

### 4. 🚨 Criminal & Wanted Fugitive Watchlist
- Cross-references incoming targets against federal and international law enforcement databases (Interpol Red Notices, High Felonies).
- Built-in simulation trigger for tactical response drills.

### 5. 🎛️ Tactical Command HUD & WebGL Optics
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
├── index.html            # Tactical command center UI, modals & WebGL shaders
├── style.css             # Tactical HUD styles, glassmorphism, reticles & animations
├── js/                   # Modular ES6 Application Architecture (Zero-Build)
│   ├── main.js           # SentinelApp orchestrator & detection lifecycle
│   ├── engine/
│   │   ├── tracker.js    # Multi-target spatial tracking & social analytics
│   │   ├── vision.js     # Biometrics, attire classification & item detection
│   │   └── hud.js        # Minimalist canvas tactical reticles & overlays
│   ├── services/
│   │   ├── db.js         # Unified storage service & CSV/JSON exporter
│   │   └── audio.js      # Web Audio synthesizer & siren engine
│   └── ui/
│       └── modals.js     # Modal controllers & forensic inspector dialogs
├── .gitignore            # Git ignore rules
└── README.md             # Documentation
```

---

## 🔒 Privacy & Local Processing
All computer vision, object detection, and biometric sampling occur **100% locally in your browser** on the client side using WebGL/TensorFlow.js. No video frames are uploaded to any external server.
