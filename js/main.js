// Sentinel-Eye Main Application Orchestrator (Modular ES6 Architecture)
import { AudioService } from './services/audio.js';
import { DatabaseService } from './services/db.js';
import { NvidiaService } from './services/nvidia.js';
import { VisionEngine } from './engine/vision.js';
import { TrackerEngine } from './engine/tracker.js';
import { HUDEngine } from './engine/hud.js';
import { ModalController } from './ui/modals.js';

export const TACTICAL_THEMES = {
  cyan: {
    id: 'cyan',
    name: 'CYAN MATRIX',
    primary: '#00daf3',
    container: '#00e5ff',
    rgb: [0.0, 0.898, 1.0],
    accentClass: 'text-cyan-300'
  },
  emerald: {
    id: 'emerald',
    name: 'EMERALD OPS',
    primary: '#00ff9d',
    container: '#10b981',
    rgb: [0.0, 1.0, 0.615],
    accentClass: 'text-green-300'
  },
  amber: {
    id: 'amber',
    name: 'AMBER FLIR',
    primary: '#ffba4b',
    container: '#ff9500',
    rgb: [1.0, 0.729, 0.294],
    accentClass: 'text-amber-300'
  },
  crimson: {
    id: 'crimson',
    name: 'CRIMSON RED',
    primary: '#ff453a',
    container: '#ff2a2a',
    rgb: [1.0, 0.27, 0.227],
    accentClass: 'text-red-300'
  },
  violet: {
    id: 'violet',
    name: 'VIOLET SYNTH',
    primary: '#c084fc',
    container: '#a855f7',
    rgb: [0.75, 0.517, 0.988],
    accentClass: 'text-purple-300'
  },
  gold: {
    id: 'gold',
    name: 'SOLAR GOLD',
    primary: '#facc15',
    container: '#eab308',
    rgb: [0.98, 0.8, 0.082],
    accentClass: 'text-yellow-300'
  }
};

class SentinelApp {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('hud-canvas');
    this.sampleCanvas = document.createElement('canvas');

    // Initialize Services & Engines
    this.audio = new AudioService();
    this.db = new DatabaseService();
    this.nvidia = new NvidiaService();
    this.vision = new VisionEngine(this.sampleCanvas);
    this.tracker = new TrackerEngine();
    this.hud = new HUDEngine(this.canvas);
    this.modals = new ModalController(
      this.db,
      this.audio,
      this.vision,
      this.nvidia,
      () => this.updateBadges(),
      () => this.updateBadges(),
      () => this.addAlert(this.nvidia.isConfigured() ? 'NVIDIA NIM Intelligence Core: CONFIGURED' : 'NVIDIA NIM API Key purged', 'INFO', 'NVIDIA', 100)
    );

    this.model = null;
    this.isDetecting = false;
    this.isLockdown = false;
    this.isTargetCardVisible = true;
    this.isTargetCardMinimized = false;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    // Optical Camera Feeds State
    this.cameraFeeds = [
      { id: 'feed-1', name: 'FEED 1: POST 1 (MAIN)', type: 'hardware', deviceId: null, status: 'LIVE', resolution: '1080P/60FPS', label: 'Primary Optics' },
      { id: 'feed-2', name: 'FEED 2: POST 4 (ALPHA)', type: 'preset', status: 'STANDBY', resolution: '1080P/60FPS', label: 'Alpha Sector' },
      { id: 'feed-3', name: 'FEED 3: POST 7 (BETA)', type: 'preset', status: 'MOTION', resolution: '720P/30FPS', label: 'Beta Sector' },
      { id: 'feed-4', name: 'FEED 4: DRONE 9 (UAV)', type: 'preset', status: 'UAV-LOCK', resolution: '4K/60FPS', label: 'Aerial Recon' }
    ];
    this.activeFeedIndex = 0;
    this.currentTheme = localStorage.getItem('sentinel_ui_theme') || 'cyan';

    this.init();
  }

  async init() {
    this.startClock();
    this.initTheme();
    this.bindUI();
    this.updateBadges();
    await this.initCamera();
    await this.enumerateCameras();
    await this.loadAI();
  }

  startClock() {
    const el = document.getElementById('live-clock');
    setInterval(() => {
      if (el) el.innerText = new Date().toISOString().substring(11, 19) + ' UTC';
    }, 1000);
  }

  initTheme() {
    this.setTheme(this.currentTheme, false);
  }

  setTheme(themeId, notify = true) {
    const theme = TACTICAL_THEMES[themeId] || TACTICAL_THEMES.cyan;
    this.currentTheme = theme.id;
    localStorage.setItem('sentinel_ui_theme', theme.id);

    // Update body theme classes
    document.body.classList.remove('theme-cyan', 'theme-emerald', 'theme-amber', 'theme-crimson', 'theme-violet', 'theme-gold');
    document.body.classList.add(`theme-${theme.id}`);

    // Update HUD Engine theme color
    this.hud.setThemeColor(theme.primary);

    // Update WebGL Grid Shader Uniform
    if (window.setShaderThemeColor) {
      window.setShaderThemeColor(...theme.rgb);
    }

    // Update UI Badges & Buttons active state
    const themeNameLabel = document.getElementById('active-theme-name');
    if (themeNameLabel) themeNameLabel.innerText = theme.name;

    document.querySelectorAll('.theme-select-btn, .settings-theme-btn').forEach(btn => {
      const isSelected = btn.dataset.theme === theme.id;
      if (isSelected) {
        btn.classList.add('ring-2', 'ring-white/80', 'bg-white/10');
      } else {
        btn.classList.remove('ring-2', 'ring-white/80', 'bg-white/10');
      }
    });

    if (notify) {
      this.modals.showToast('UI Color Theme', `Tactical Color Palette switched to ${theme.name}`, 'info');
      this.audio.play('click');
      this.addAlert(`Tactical UI theme switched to ${theme.name}`, 'INFO', 'SYSTEM', 100);
    }
  }

  async enumerateCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      if (videoInputs.length > 0) {
        const hardwareFeeds = videoInputs.map((d, idx) => ({
          id: `cam-hw-${idx}`,
          name: `FEED ${idx + 1}: ${d.label || `CAM 0${idx + 1} (HARDWARE)`}`,
          type: 'hardware',
          deviceId: d.deviceId,
          status: idx === this.activeFeedIndex ? 'LIVE' : 'READY',
          resolution: '1080P/60FPS',
          label: d.label || `Hardware Cam ${idx + 1}`
        }));

        // Keep auxiliary tactical feeds if fewer than 4 hardware cameras
        const auxPresets = [
          { id: 'cam-aux-post4', name: `FEED ${hardwareFeeds.length + 1}: POST 4 (ALPHA)`, type: 'preset', status: 'STANDBY', resolution: '1080P/60FPS', label: 'Post 4 Alpha' },
          { id: 'cam-aux-post7', name: `FEED ${hardwareFeeds.length + 2}: POST 7 (BETA)`, type: 'preset', status: 'MOTION', resolution: '720P/30FPS', label: 'Post 7 Beta' },
          { id: 'cam-aux-drone', name: `FEED ${hardwareFeeds.length + 3}: DRONE 9 (UAV)`, type: 'preset', status: 'UAV-LOCK', resolution: '4K/60FPS', label: 'Drone Sector 9' }
        ];

        this.cameraFeeds = [...hardwareFeeds, ...auxPresets.slice(0, Math.max(1, 4 - hardwareFeeds.length))];
      }

      this.renderCameraFeedsUI();
    } catch (err) {
      console.warn('Camera enumeration error:', err);
    }
  }

  renderCameraFeedsUI() {
    const listContainer = document.getElementById('cam-feed-list');
    const pillsContainer = document.getElementById('viewport-feed-pills-container');
    const selectEl = document.getElementById('settings-camera-select');
    const countTag = document.getElementById('cam-count-tag');

    if (countTag) countTag.innerText = `${this.cameraFeeds.length} FEEDS`;

    // 1. Populate Dropdown Menu
    if (listContainer) {
      listContainer.innerHTML = '';
      this.cameraFeeds.forEach((feed, idx) => {
        const isActive = idx === this.activeFeedIndex;
        const item = document.createElement('button');
        item.className = `w-full p-2 rounded-lg text-left transition-all flex items-center justify-between border ${
          isActive ? 'bg-primary-container/20 border-primary/50 text-primary-fixed' : 'bg-black/40 hover:bg-white/5 border-white/5 text-gray-300'
        }`;
        item.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}"></span>
            <div>
              <span class="font-bold block text-[11px] truncate max-w-[150px]">${feed.name}</span>
              <span class="text-[9px] text-gray-400">${feed.resolution} • ${feed.type.toUpperCase()}</span>
            </div>
          </div>
          <span class="text-[9px] px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold' : 'bg-black/60 text-gray-400'}">${feed.status}</span>
        `;
        item.addEventListener('click', () => {
          this.switchCamera(idx);
          document.getElementById('cam-selector-dropdown')?.classList.add('hidden');
        });
        listContainer.appendChild(item);
      });
    }

    // 2. Populate Viewport Top Quick Switcher Pills
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      this.cameraFeeds.slice(0, 4).forEach((feed, idx) => {
        const isActive = idx === this.activeFeedIndex;
        const pill = document.createElement('button');
        pill.className = `px-2.5 py-1 rounded-full font-data-mono text-[10px] transition-all flex items-center gap-1.5 ${
          isActive
            ? 'bg-primary-container/30 text-primary-fixed border border-primary/60 font-bold shadow-md scale-105'
            : 'bg-black/40 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
        }`;
        pill.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}"></span>
          <span>FEED ${idx + 1}</span>
        `;
        pill.addEventListener('click', () => this.switchCamera(idx));
        pillsContainer.appendChild(pill);
      });
    }

    // 3. Populate Settings Modal Select
    if (selectEl) {
      selectEl.innerHTML = '';
      this.cameraFeeds.forEach((feed, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.innerText = `${feed.name} (${feed.resolution})`;
        opt.selected = idx === this.activeFeedIndex;
        selectEl.appendChild(opt);
      });
    }

    // 4. Update Header Label
    const activeFeed = this.cameraFeeds[this.activeFeedIndex];
    const headerLabel = document.getElementById('active-feed-label');
    if (headerLabel && activeFeed) {
      headerLabel.innerText = activeFeed.name.split(':')[0] || 'CAM 1';
    }

    // 5. Update Bottom Auxiliary Tiles Active Border
    [1, 2, 3].forEach(n => {
      const tile = document.getElementById(`aux-feed-${n}`);
      if (tile) {
        if (this.activeFeedIndex === n) {
          tile.classList.add('ring-2', 'ring-primary-container', 'border-primary-container');
        } else {
          tile.classList.remove('ring-2', 'ring-primary-container', 'border-primary-container');
        }
      }
    });
  }

  async switchCamera(feedIndex, deviceId = null) {
    if (feedIndex < 0 || feedIndex >= this.cameraFeeds.length) return;
    this.activeFeedIndex = feedIndex;
    const feed = this.cameraFeeds[feedIndex];
    const targetDeviceId = deviceId || feed.deviceId;

    this.renderCameraFeedsUI();
    this.audio.play('ping');

    try {
      if (this.video.srcObject) {
        const tracks = this.video.srcObject.getTracks();
        tracks.forEach(t => t.stop());
      }

      const constraints = {
        video: targetDeviceId ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await new Promise(res => { this.video.onloadedmetadata = () => { this.video.play(); res(); }; });

      this.resizeCanvas();
      this.modals.showToast('Optics Re-Routed', `Switched active surveillance feed to ${feed.name}`, 'success');
      this.addAlert(`Optical input switched to ${feed.name} (${feed.resolution})`, 'INFO', 'OPTICS', 100);
    } catch (err) {
      this.modals.showToast('Feed Switch Active', `Viewing sector: ${feed.name}`, 'info');
      this.addAlert(`Surveillance optics active on sector: ${feed.name}`, 'INFO', 'OPTICS', 95);
    }
  }

  async initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = stream;
      await new Promise(res => { this.video.onloadedmetadata = () => { this.video.play(); res(); }; });

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      this.addAlert('Optical video stream synchronized successfully (Post 1)', 'INFO', 'OPTICS', 100);
      this.audio.play('ping');
    } catch (err) {
      this.addAlert('Camera access denied or unavailable. Operating in synthetic simulation mode.', 'WARNING', 'HARDWARE', 0);
    }
  }

  resizeCanvas() {
    if (this.video.videoWidth && this.video.videoHeight) {
      this.canvas.width = this.video.clientWidth;
      this.canvas.height = this.video.clientHeight;
      this.hud.resize(this.video.clientWidth, this.video.clientHeight);
    }
  }

  async loadAI() {
    const badge = document.getElementById('ai-model-status');
    try {
      if (window.cocoSsd) {
        this.model = await window.cocoSsd.load();
        if (badge) {
          badge.innerText = 'AI NEURAL CORE: ONLINE (CLEAN HUD)';
          badge.className = 'font-data-mono text-[11px] text-cyan-400 border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 rounded';
        }
        this.addAlert('COCO-SSD AI Core active with 60 FPS WebGL acceleration', 'INFO', 'NEURAL', 99);
      }
    } catch (e) {
      if (badge) badge.innerText = 'CV SENSORS: ONLINE';
    }
    this.isDetecting = true;
    this.loop();
  }

  async loop() {
    if (!this.isDetecting) return;

    // Calculate FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.innerText = `${this.fps} FPS`;
    }

    if (this.canvas.width !== this.video.clientWidth || this.canvas.height !== this.video.clientHeight) {
      this.resizeCanvas();
    }

    this.hud.clear();

    if (this.model && this.video.readyState === 4) {
      try {
        this.vision.updateSampleFrame(this.video);
        const predictions = await this.model.detect(this.video);

        const persons = [], items = [];
        predictions.forEach(p => {
          if (p.score < 0.4) return;
          if (p.class === 'person') persons.push(p);
          else items.push(p);
        });

        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;

        const targets = this.tracker.processTracks(
          persons,
          items,
          scaleX,
          scaleY,
          this.vision,
          this.db,
          (msg, lvl, src, conf) => {
            this.addAlert(msg, lvl, src, conf);
            if (lvl === 'CRITICAL') this.audio.play('critical');
            else if (lvl === 'WARNING') this.audio.play('alert');
          }
        );

        this.hud.render(targets, items, scaleX, scaleY);
        this.updateTargetCard(targets[0] || null);
        this.updateBadges(targets.length);
      } catch (err) {}
    }

    requestAnimationFrame(() => this.loop());
  }

  updateTargetCard(target) {
    const card = document.getElementById('live-target-card');
    if (!card) return;
    if (!target || !this.isTargetCardVisible) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');

    const idVal = document.getElementById('target-identity-val');
    const durVal = document.getElementById('target-duration-text');
    const holdVal = document.getElementById('target-holding-text');
    const heightVal = document.getElementById('target-height-val');
    const interVal = document.getElementById('target-interaction-val');
    const badge = document.getElementById('target-id-badge');

    if (badge) {
      if (target.match.type === 'WHITELIST') {
        badge.innerText = 'FRIENDLY';
        badge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-green-950 text-green-300 border border-green-500/40 font-bold';
      } else if (target.match.type === 'CRIMINAL') {
        badge.innerText = 'WANTED MATCH';
        badge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 font-bold animate-pulse';
      } else {
        badge.innerText = target.id;
        badge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold';
      }
    }

    if (idVal) idVal.innerText = target.match.type === 'WHITELIST' ? target.match.name : (target.match.type === 'CRIMINAL' ? target.match.name : target.id);
    if (durVal) durVal.innerText = target.durationFormatted || '0m 01s';
    if (holdVal) holdVal.innerText = target.holding.length > 0 ? target.holding.map(i => i.class).join(', ') : 'HANDS CLEAR';
    if (heightVal && target.biometrics) heightVal.innerText = `${target.biometrics.estHeight.split(' ')[0]} / ${target.biometrics.build.split(' ')[0]}`;
    if (interVal) interVal.innerText = target.interactingWith ? `With ${target.interactingWith.split(' ')[0]}` : 'Solo';
  }

  updateBadges(activeCount = 0) {
    const wl = this.db.whitelist.length;
    const cr = this.db.criminals.length;
    const unk = this.db.unknowns.length;

    ['whitelist-count-badge', 'side-whitelist-count', 'modal-whitelist-count'].forEach(id => {
      const el = document.getElementById(id); if (el) el.innerText = wl;
    });
    ['criminal-count-badge', 'side-criminal-count'].forEach(id => {
      const el = document.getElementById(id); if (el) el.innerText = cr;
    });
    ['unknown-count-badge', 'side-unknown-count', 'unknown-logged-val', 'footer-unknown-count'].forEach(id => {
      const el = document.getElementById(id); if (el) el.innerText = unk;
    });
    const actEl = document.getElementById('active-trackers-val');
    if (actEl) actEl.innerText = activeCount;
  }

  addAlert(message, level = 'INFO', source = 'OPTICS', confidence = 95) {
    const container = document.getElementById('alert-feed-container');
    if (!container) return;

    const timeStr = new Date().toISOString().substring(11, 19) + ' UTC';
    const alertDiv = document.createElement('div');
    const barColor = level === 'CRITICAL' ? 'bg-[#ff453a]' : (level === 'WARNING' ? 'bg-[#ffba4b]' : 'bg-[#00e5ff]');

    alertDiv.className = 'border border-cyan-500/20 bg-[#17202e]/60 rounded p-2 flex gap-2 relative overflow-hidden transition-all';
    alertDiv.innerHTML = `
      <div class="absolute left-0 top-0 bottom-0 w-1 ${barColor}"></div>
      <div class="flex flex-col gap-0.5 w-full pl-1.5 font-data-mono text-xs">
        <div class="flex justify-between">
          <span class="text-cyan-400 text-[10px]">${timeStr}</span>
          <span class="text-[9px] px-1 rounded bg-black/40 text-gray-300 font-bold">${level}</span>
        </div>
        <p class="text-[#dae3f6] font-sans text-xs">${message}</p>
      </div>
    `;

    container.insertBefore(alertDiv, container.firstChild);
    while (container.children.length > 30) container.removeChild(container.lastChild);
  }

  captureSnapshot() {
    this.audio.play('shutter');
    try {
      const c = document.createElement('canvas');
      c.width = this.canvas.width || 1280;
      c.height = this.canvas.height || 720;
      const ctx = c.getContext('2d');
      if (this.video.readyState === 4) {
        ctx.drawImage(this.video, 0, 0, c.width, c.height);
      }
      ctx.drawImage(this.canvas, 0, 0, c.width, c.height);

      const link = document.createElement('a');
      link.download = `sentinel-tactical-frame-${Date.now()}.png`;
      link.href = c.toDataURL('image/png');
      link.click();
      this.modals.showToast('Snapshot Captured', 'High-res tactical frame saved to downloads', 'success');
    } catch (e) {
      this.modals.showToast('Snapshot Error', 'Could not export frame', 'critical');
    }
  }

  toggleLockdown() {
    this.isLockdown = !this.isLockdown;
    const overlay = document.getElementById('lockdown-overlay');
    if (overlay) overlay.style.display = this.isLockdown ? 'flex' : 'none';
    if (this.isLockdown) {
      this.audio.startSiren();
      this.modals.showToast('EMERGENCY LOCKDOWN', 'All perimeter seals engaged', 'critical');
    } else {
      this.audio.stopSiren();
      this.modals.showToast('Lockdown Disengaged', 'Perimeter status restored to nominal', 'info');
    }
  }

  bindUI() {
    // Camera Selector Dropdown Toggle
    const camBtn = document.getElementById('cam-selector-btn');
    const camDropdown = document.getElementById('cam-selector-dropdown');
    camBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      camDropdown?.classList.toggle('hidden');
      themeDropdown?.classList.add('hidden');
      this.audio.play('click');
    });

    // Theme Palette Dropdown Toggle
    const themeBtn = document.getElementById('theme-palette-btn');
    const themeDropdown = document.getElementById('theme-palette-dropdown');
    themeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDropdown?.classList.toggle('hidden');
      camDropdown?.classList.add('hidden');
      this.audio.play('click');
    });

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
      if (camDropdown && !camDropdown.contains(e.target) && e.target !== camBtn && !camBtn?.contains(e.target)) {
        camDropdown.classList.add('hidden');
      }
      if (themeDropdown && !themeDropdown.contains(e.target) && e.target !== themeBtn && !themeBtn?.contains(e.target)) {
        themeDropdown.classList.add('hidden');
      }
    });

    // Header Theme Select Buttons
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const themeId = e.currentTarget.dataset.theme;
        this.setTheme(themeId, true);
        themeDropdown?.classList.add('hidden');
      });
    });

    // Settings Modal Theme Select Buttons
    document.querySelectorAll('.settings-theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const themeId = e.currentTarget.dataset.theme;
        this.setTheme(themeId, true);
      });
    });

    // Settings Modal Camera Select Dropdown
    document.getElementById('settings-camera-select')?.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      this.switchCamera(idx);
    });

    // Refresh Camera Hardware Devices Button
    document.getElementById('refresh-cams-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enumerateCameras();
      this.modals.showToast('Hardware Scan', 'Re-scanned available optical video inputs', 'info');
      this.audio.play('click');
    });

    // Bottom Auxiliary Camera Feeds Direct Switch
    document.getElementById('aux-feed-1')?.addEventListener('click', () => this.switchCamera(1));
    document.getElementById('aux-feed-2')?.addEventListener('click', () => this.switchCamera(2));
    document.getElementById('aux-feed-3')?.addEventListener('click', () => this.switchCamera(3));

    // Sensitivity Slider
    const sensSlider = document.getElementById('sensitivity-slider');
    const sensDisplay = document.getElementById('sensitivity-display');
    sensSlider?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (sensDisplay) sensDisplay.innerText = `${val}%`;
      this.minConfidence = parseInt(val, 10) / 100;
    });

    // Lockdown
    document.getElementById('lockdown-btn')?.addEventListener('click', () => this.toggleLockdown());
    document.getElementById('cancel-lockdown-btn')?.addEventListener('click', () => this.toggleLockdown());

    // Snapshot button
    document.getElementById('snapshot-btn')?.addEventListener('click', () => this.captureSnapshot());

    // Clear alerts button
    document.getElementById('clear-alerts-btn')?.addEventListener('click', () => {
      const container = document.getElementById('alert-feed-container');
      if (container) container.innerHTML = '';
      this.addAlert('Alert feed cleared by operator', 'INFO', 'SYSTEM', 100);
      this.audio.play('click');
    });

    // Vision mode buttons
    document.querySelectorAll('.vision-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        const wrapper = document.getElementById('video-wrapper');
        if (wrapper) wrapper.className = `relative flex-1 w-full h-full bg-[#060e1c] overflow-hidden flex items-center justify-center vision-${mode}`;
        document.querySelectorAll('.vision-btn').forEach(b => {
          b.className = (b.dataset.mode === mode)
            ? 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
            : 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
        });
        this.audio.play('click');
      });
    });

    // HUD Mode buttons
    document.querySelectorAll('.hud-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.hudMode;
        this.hud.mode = mode;
        document.querySelectorAll('.hud-mode-btn').forEach(b => {
          b.className = (b.dataset.hudMode === mode)
            ? 'hud-mode-btn px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 font-bold'
            : 'hud-mode-btn px-2 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
        });
        this.audio.play('click');
      });
    });

    // Toggle target card
    document.getElementById('toggle-target-card-btn')?.addEventListener('click', (e) => {
      this.isTargetCardVisible = !this.isTargetCardVisible;
      e.target.innerText = this.isTargetCardVisible ? 'VISIBLE' : 'HIDDEN';
      const card = document.getElementById('live-target-card');
      if (card) card.classList.toggle('hidden', !this.isTargetCardVisible);
      this.audio.play('click');
    });

    // Minimize target card button
    document.getElementById('minimize-target-card-btn')?.addEventListener('click', (e) => {
      this.isTargetCardMinimized = !this.isTargetCardMinimized;
      const body = document.getElementById('target-card-body');
      if (body) body.classList.toggle('hidden', this.isTargetCardMinimized);
      e.target.innerText = this.isTargetCardMinimized ? '＋' : '─';
    });

    // Toggle Scanlines
    document.getElementById('toggle-scanlines-btn')?.addEventListener('click', (e) => {
      const scan = document.getElementById('scanlines-layer');
      const vig = document.getElementById('vignette-layer');
      const isOff = scan?.classList.toggle('scanlines-off');
      vig?.classList.toggle('vignette-off', isOff);
      e.target.innerText = isOff ? 'CLEAN' : 'SCANLINES';
      this.audio.play('click');
    });

    // Sound toggle
    document.getElementById('sound-toggle-btn')?.addEventListener('click', () => {
      this.audio.soundEnabled = !this.audio.soundEnabled;
      const icon = document.getElementById('sound-icon');
      if (icon) icon.innerText = this.audio.soundEnabled ? 'volume_up' : 'volume_off';
      this.modals.showToast('Audio Mute', `Tactical Audio ${this.audio.soundEnabled ? 'Unmuted' : 'Muted'}`, 'info');
      if (this.audio.soundEnabled) this.audio.play('click');
    });

    // Quick whitelist me
    document.getElementById('quick-enroll-btn')?.addEventListener('click', () => {
      this.modals.captureFacePreview();
      this.modals.registerWhitelistUser();
    });

    // Brand logo / Live optics link
    ['nav-brand-logo', 'nav-live-optics', 'side-command-hud-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.modals.close('incident-intelligence-modal');
        this.modals.close('camera-deepdive-modal');
        this.modals.close('watchlist-match-modal');
        this.modals.close('camera-matrix-modal');
        this.modals.close('sensor-telemetry-modal');
        this.modals.close('analytics-modal');
        this.modals.close('health-modal');
        this.modals.close('settings-modal');
        this.modals.close('schedule-modal');
        this.modals.close('help-modal');
        this.modals.close('terminal-logs-modal');
        this.audio.play('click');
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.captureSnapshot();
      } else if (e.key === 'l' || e.key === 'L') {
        this.toggleLockdown();
      } else if (e.key === 'm' || e.key === 'M') {
        this.audio.soundEnabled = !this.audio.soundEnabled;
        const icon = document.getElementById('sound-icon');
        if (icon) icon.innerText = this.audio.soundEnabled ? 'volume_up' : 'volume_off';
        this.modals.showToast('Audio', this.audio.soundEnabled ? 'Audio Enabled' : 'Audio Muted', 'info');
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const modes = ['normal', 'night', 'thermal', 'wireframe'];
        const mode = modes[parseInt(e.key, 10) - 1];
        const wrapper = document.getElementById('video-wrapper');
        if (wrapper && mode) {
          wrapper.className = `relative flex-1 w-full h-full bg-[#060e1c] overflow-hidden flex items-center justify-center vision-${mode}`;
          document.querySelectorAll('.vision-btn').forEach(b => {
            b.className = (b.dataset.mode === mode)
              ? 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
              : 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
          });
          this.audio.play('click');
        }
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.sentinel = new SentinelApp();
});
