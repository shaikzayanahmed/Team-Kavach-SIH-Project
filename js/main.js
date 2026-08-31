// Sentinel-Eye Main Application Orchestrator (Modular ES6 Architecture)
import { AudioService } from './services/audio.js';
import { DatabaseService } from './services/db.js';
import { VisionEngine } from './engine/vision.js';
import { TrackerEngine } from './engine/tracker.js';
import { HUDEngine } from './engine/hud.js';
import { ModalController } from './ui/modals.js';

class SentinelApp {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('hud-canvas');
    this.sampleCanvas = document.createElement('canvas');

    // Initialize Services & Engines
    this.audio = new AudioService();
    this.db = new DatabaseService();
    this.vision = new VisionEngine(this.sampleCanvas);
    this.tracker = new TrackerEngine();
    this.hud = new HUDEngine(this.canvas);
    this.modals = new ModalController(
      this.db,
      this.audio,
      this.vision,
      () => this.updateBadges(),
      () => this.updateBadges()
    );

    this.model = null;
    this.isDetecting = false;
    this.isLockdown = false;
    this.isTargetCardVisible = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    this.init();
  }

  async init() {
    this.startClock();
    this.bindUI();
    this.updateBadges();
    await this.initCamera();
    await this.loadAI();
  }

  startClock() {
    const el = document.getElementById('live-clock');
    setInterval(() => {
      if (el) el.innerText = new Date().toISOString().substring(11, 19) + ' UTC';
    }, 1000);
  }

  async initCamera() {
    const statusText = document.getElementById('camera-status-text');
    try {
      if (statusText) statusText.innerText = 'CONNECTING...';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = stream;
      await new Promise(res => { this.video.onloadedmetadata = () => { this.video.play(); res(); }; });

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      if (statusText) statusText.innerText = 'POST 1 - OPTICS';
      this.addAlert('Optical video stream synchronized successfully (Post 1)', 'INFO', 'OPTICS', 100);
      this.audio.play('ping');
    } catch (err) {
      if (statusText) statusText.innerText = 'NO CAMERA';
      this.addAlert('Camera access denied or unavailable.', 'CRITICAL', 'HARDWARE', 0);
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
        this.addAlert('COCO-SSD AI Core active', 'INFO', 'NEURAL', 99);
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

    if (idVal) idVal.innerText = target.match.type === 'WHITELIST' ? target.match.name : (target.match.type === 'CRIMINAL' ? target.match.name : target.id);
    if (durVal) durVal.innerText = target.durationFormatted || '0m 01s';
    if (holdVal) holdVal.innerText = target.holding.length > 0 ? target.holding.map(i => i.class).join(', ') : 'CLEAR';
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
    while (container.children.length > 25) container.removeChild(container.lastChild);
  }

  bindUI() {
    // Lockdown
    document.getElementById('lockdown-btn')?.addEventListener('click', () => {
      this.isLockdown = !this.isLockdown;
      const overlay = document.getElementById('lockdown-overlay');
      if (overlay) overlay.style.display = this.isLockdown ? 'block' : 'none';
      if (this.isLockdown) this.audio.startSiren();
      else this.audio.stopSiren();
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
      });
    });

    // Toggle target card
    document.getElementById('toggle-target-card-btn')?.addEventListener('click', (e) => {
      this.isTargetCardVisible = !this.isTargetCardVisible;
      e.target.innerText = this.isTargetCardVisible ? 'VISIBLE' : 'HIDDEN';
      const card = document.getElementById('live-target-card');
      if (card) card.classList.toggle('hidden', !this.isTargetCardVisible);
    });

    // Toggle Scanlines
    document.getElementById('toggle-scanlines-btn')?.addEventListener('click', (e) => {
      const scan = document.getElementById('scanlines-layer');
      const vig = document.getElementById('vignette-layer');
      const isOff = scan?.classList.toggle('scanlines-off');
      vig?.classList.toggle('vignette-off', isOff);
      e.target.innerText = isOff ? 'CLEAN' : 'SCANLINES';
    });

    // Sound toggle
    document.getElementById('sound-toggle-btn')?.addEventListener('click', () => {
      this.audio.soundEnabled = !this.audio.soundEnabled;
    });

    // Quick whitelist me
    document.getElementById('quick-enroll-btn')?.addEventListener('click', () => {
      this.modals.captureFacePreview();
      this.modals.registerWhitelistUser();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.sentinel = new SentinelApp();
});
