// Sentinel-Eye Command Engine v2.6 - Clean Minimalist HUD Edition
// Advanced Realtime AI Multi-Target Tracking, Unknown Individual Activity Logging,
// Social Interaction Analysis, In-Hand Item Detection & Forensic Dossier Database

class SentinelEngine {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('hud-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Offscreen helper canvas for pixel sampling (attire, face & biometric extraction)
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    
    this.model = null;
    this.isDetecting = false;
    this.isLockdown = false;
    this.soundEnabled = true;
    this.visionMode = 'normal';
    
    // HUD Customization & Clean Optics Settings
    this.hudMode = 'minimal'; // 'minimal' (default: clean reticle), 'tactical' (wireframe details), 'off' (raw video)
    this.isTargetCardVisible = true;
    this.isTargetCardMinimized = false;
    this.isScanlinesVisible = true;
    
    this.stats = {
      intrusions: 0,
      watchlistMatches: 0,
      activeTrackers: 0,
      fps: 0
    };
    
    this.detectedTargets = [];
    this.lastAlertTime = 0;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    // Web Audio Synthesizer
    this.audioCtx = null;
    this.sirenOsc = null;
    
    // Captured snapshot for enrollment
    this.stagedEnrollPhoto = null;
    this.simulatedWantedSuspectId = null; // for testing criminal matches
    
    // Databases
    this.whitelist = [];
    this.criminalDatabase = [];
    this.unknownDatabase = [];
    
    // Persistent Multi-Person Tracks Map (trackId -> TrackData)
    this.activeTracks = new Map();
    this.trackCounter = 100;
    
    // Current Active Inspector Dossier
    this.activeInspectedDossierId = null;
    
    this.init();
  }

  async init() {
    this.loadDatabases();
    this.setupAudio();
    this.setupUI();
    this.startClock();
    await this.initCamera();
    this.loadAIModel();
    this.renderWhitelistCards();
    this.renderCriminalGrid();
    this.renderUnknownGrid();
    this.updateBadges();
  }

  // ----------------------------------------------------
  // DATABASE MANAGEMENT (UNKNOWN DOSSIERS, WHITELIST & CRIMINALS)
  // ----------------------------------------------------

  loadDatabases() {
    // 1. Load Whitelist from localStorage or initialize with Operator (Me)
    const savedWhitelist = localStorage.getItem('sentinel_whitelist_v2');
    if (savedWhitelist) {
      try {
        this.whitelist = JSON.parse(savedWhitelist);
      } catch (e) {
        this.initDefaultWhitelist();
      }
    } else {
      this.initDefaultWhitelist();
    }

    // 2. Load Criminal Database
    const savedCriminals = localStorage.getItem('sentinel_criminals_v2');
    if (savedCriminals) {
      try {
        this.criminalDatabase = JSON.parse(savedCriminals);
      } catch (e) {
        this.initDefaultCriminalDB();
      }
    } else {
      this.initDefaultCriminalDB();
    }

    // 3. Load Unknown Individual Dossiers Database
    const savedUnknowns = localStorage.getItem('sentinel_unknown_dossiers_v2');
    if (savedUnknowns) {
      try {
        this.unknownDatabase = JSON.parse(savedUnknowns);
      } catch (e) {
        this.initDefaultUnknownDB();
      }
    } else {
      this.initDefaultUnknownDB();
    }
  }

  initDefaultWhitelist() {
    this.whitelist = [
      {
        id: 'WL-001',
        name: 'Commander / Operator (Me)',
        role: 'Chief Security Director - Cleared',
        enrolledAt: new Date().toLocaleDateString(),
        photo: this.createAvatarDataUrl('#00ff9d', 'CMD'),
        signature: { r: 110, g: 130, b: 160, brightness: 125, aspect: 0.85 },
        isDefault: true
      }
    ];
    this.saveWhitelist();
  }

  saveWhitelist() {
    localStorage.setItem('sentinel_whitelist_v2', JSON.stringify(this.whitelist));
    this.updateBadges();
  }

  initDefaultCriminalDB() {
    this.criminalDatabase = [
      {
        id: 'CR-8821',
        name: 'Victor "Shadow" Vance',
        alias: 'The Phantom Infiltrator',
        threat: 'CRITICAL',
        threatBadge: 'INTERPOL RED',
        offenses: 'Armed Breach, Critical Infrastructure Sabotage, Weapon Trafficking',
        wantedBy: 'Interpol / Global Defense',
        avatarBg: '#ff453a',
        avatarInitials: 'VV',
        signature: { r: 180, g: 50, b: 50, brightness: 90, aspect: 0.75 }
      },
      {
        id: 'CR-4901',
        name: 'Elena Rostova',
        alias: 'Viper-6',
        threat: 'HIGH',
        threatBadge: 'HIGH FELONY',
        offenses: 'Cyber Espionage, Biometric Spoofing, High-Value Asset Theft',
        wantedBy: 'Federal Counter-Intelligence',
        avatarBg: '#ffba4b',
        avatarInitials: 'ER',
        signature: { r: 60, g: 90, b: 170, brightness: 110, aspect: 0.82 }
      },
      {
        id: 'CR-9120',
        name: 'Marcus Reyes',
        alias: 'Goliath',
        threat: 'CRITICAL',
        threatBadge: 'ARMED & DANGEROUS',
        offenses: 'Armed Bank Robbery, Perimeter Ambush, Explosives Possession',
        wantedBy: 'National Taskforce',
        avatarBg: '#ff453a',
        avatarInitials: 'MR',
        signature: { r: 140, g: 110, b: 80, brightness: 100, aspect: 0.95 }
      },
      {
        id: 'CR-3304',
        name: 'Tariq Al-Mansoor',
        alias: 'Cipher',
        threat: 'HIGH',
        threatBadge: 'HIGH FELONY',
        offenses: 'Unauthorized Drone Swarm Jamming, Perimeter Infiltration',
        wantedBy: 'Metropolitan Homeland Security',
        avatarBg: '#ffba4b',
        avatarInitials: 'TA',
        signature: { r: 75, g: 120, b: 100, brightness: 95, aspect: 0.78 }
      },
      {
        id: 'CR-7742',
        name: 'Dmitri Volkov',
        alias: 'Spectre',
        threat: 'CRITICAL',
        threatBadge: 'INTERPOL RED',
        offenses: 'Hostile Facility Takeover, Extortion, Weapon Procurement',
        wantedBy: 'Europol Red Notice',
        avatarBg: '#ff453a',
        avatarInitials: 'DV',
        signature: { r: 200, g: 70, b: 40, brightness: 105, aspect: 0.88 }
      }
    ];
    this.saveCriminalDB();
  }

  saveCriminalDB() {
    localStorage.setItem('sentinel_criminals_v2', JSON.stringify(this.criminalDatabase));
    this.updateBadges();
  }

  initDefaultUnknownDB() {
    const timeNow = new Date();
    const timeEarlier = new Date(timeNow.getTime() - 15 * 60 * 1000);
    
    this.unknownDatabase = [
      {
        id: 'UNK-4819',
        status: 'DEPARTED',
        firstSeen: timeEarlier.toLocaleTimeString(),
        lastSeen: new Date(timeEarlier.getTime() + 84 * 1000).toLocaleTimeString(),
        durationSeconds: 84,
        durationFormatted: '1m 24s',
        photo: this.createAvatarDataUrl('#ffba4b', 'UNK'),
        facePhoto: this.createAvatarDataUrl('#ffba4b', 'FACE'),
        biometrics: {
          estHeight: '~5\'10" (178 cm)',
          heightCategory: 'Tall / Stature',
          build: 'Athletic / Proportionate',
          faceComplexion: 'Fair / Light Complexion',
          maskDetected: 'None Detected',
          posture: 'Standing (Active)'
        },
        attire: {
          upper: { name: 'Navy Blue', hex: '#1e3a8a' },
          lower: { name: 'Dark Trousers', hex: '#1f2937' },
          summary: 'Navy Blue Top / Dark Trousers'
        },
        carriedItems: [
          { item: 'CELL PHONE', firstSeen: timeEarlier.toLocaleTimeString(), isSuspicious: false },
          { item: 'BACKPACK', firstSeen: timeEarlier.toLocaleTimeString(), isSuspicious: false }
        ],
        interactions: [
          { targetName: 'Operator (Me) [Whitelisted]', durationSeconds: 22, time: timeEarlier.toLocaleTimeString() }
        ],
        activityTimeline: [
          { time: timeEarlier.toLocaleTimeString(), event: 'Unknown individual spotted entering Sector 1 optical view.', type: 'ENTRY' },
          { time: new Date(timeEarlier.getTime() + 12 * 1000).toLocaleTimeString(), event: 'Approached and started conversation with Operator (Me).', type: 'INTERACTION' },
          { time: new Date(timeEarlier.getTime() + 34 * 1000).toLocaleTimeString(), event: 'Concluded conversation (22s conversation duration).', type: 'INTERACTION' },
          { time: new Date(timeEarlier.getTime() + 45 * 1000).toLocaleTimeString(), event: 'Observed holding and checking Cell Phone in hand.', type: 'ITEM' },
          { time: new Date(timeEarlier.getTime() + 84 * 1000).toLocaleTimeString(), event: 'Departed camera field of view. Total time on site: 1m 24s.', type: 'EXIT' }
        ],
        summaryReport: 'Unknown individual (~5\'10", Athletic build, Fair complexion, wearing Navy Blue top and Dark Trousers) was spotted in Sector 1 for 1m 24s. The subject engaged in conversation with Operator (Me) for 22 seconds and was observed carrying a Cell Phone and Backpack. No suspicious weapons detected.',
        threatLevel: 'NOMINAL (VISITOR)'
      }
    ];
    this.saveUnknownDB();
  }

  saveUnknownDB() {
    localStorage.setItem('sentinel_unknown_dossiers_v2', JSON.stringify(this.unknownDatabase));
    this.updateBadges();
  }

  updateBadges() {
    const wlCount = this.whitelist.length;
    const crCount = this.criminalDatabase.length;
    const unkCount = this.unknownDatabase.length;
    const activeUnkCount = Array.from(this.activeTracks.values()).filter(t => t.isUnknown && t.status === 'ACTIVE').length;
    
    ['whitelist-count-badge', 'side-whitelist-count', 'modal-whitelist-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = wlCount;
    });

    ['criminal-count-badge', 'side-criminal-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = crCount;
    });

    ['unknown-count-badge', 'side-unknown-count', 'unknown-logged-val', 'footer-unknown-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = unkCount;
    });

    const footerActive = document.getElementById('footer-active-unknown-count');
    if (footerActive) footerActive.innerText = activeUnkCount;
  }

  createAvatarDataUrl(bgColor, text) {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#060e1c';
    ctx.fillRect(0, 0, 80, 80);
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 72, 72);
    ctx.fillStyle = bgColor;
    ctx.font = 'bold 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 40, 40);
    return c.toDataURL();
  }

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  // ----------------------------------------------------
  // AUDIO SYNTHESIZER
  // ----------------------------------------------------

  setupAudio() {
    const initAudioContext = () => {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };
    window.addEventListener('click', initAudioContext, { once: true });
    window.addEventListener('touchstart', initAudioContext, { once: true });
  }

  playBeep(type = 'ping') {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'friendly') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'ping') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.setValueAtTime(820, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'critical') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.setValueAtTime(450, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn('Audio play skipped', e);
    }
  }

  toggleLockdown() {
    this.isLockdown = !this.isLockdown;
    const btn = document.getElementById('lockdown-btn');
    const overlay = document.getElementById('lockdown-overlay');
    const status = document.getElementById('threat-status-badge');

    if (this.isLockdown) {
      btn.innerText = 'ABORT LOCKDOWN';
      btn.className = 'w-full py-2.5 bg-red-600 text-white font-data-mono font-bold text-xs rounded transition-all pulse-red border border-red-500 shadow-lg shadow-red-950';
      overlay.classList.add('lockdown-active');
      overlay.style.display = 'block';
      status.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span><span class="font-label-caps text-xs font-bold text-red-400 tracking-wider">THREAT: CRITICAL LOCKDOWN</span>';
      
      this.addAlert('EMERGENCY LOCKDOWN PROTOCOL ENGAGED BY OPERATOR', 'CRITICAL', 'OPERATOR', 100);
      this.startSiren();
    } else {
      btn.innerText = 'INITIATE LOCKDOWN';
      btn.className = 'w-full py-2.5 bg-transparent border border-red-500/60 text-red-400 font-data-mono text-xs font-bold rounded hover:bg-red-500/10 hover:border-red-400 transition-all tracking-wider';
      overlay.classList.remove('lockdown-active');
      overlay.style.display = 'none';
      status.innerHTML = '<span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span><span class="font-label-caps text-xs font-bold text-cyan-300 tracking-wider">THREAT: NORMAL</span>';
      
      this.addAlert('Lockdown aborted. Normal surveillance posture resumed.', 'INFO', 'SYSTEM', 100);
      this.stopSiren();
    }
  }

  startSiren() {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = this.audioCtx.currentTime;
      this.sirenOsc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(400, now);
      
      for (let i = 0; i < 30; i++) {
        this.sirenOsc.frequency.linearRampToValueAtTime(800, now + i * 0.8 + 0.4);
        this.sirenOsc.frequency.linearRampToValueAtTime(400, now + i * 0.8 + 0.8);
      }
      
      gain.gain.setValueAtTime(0.15, now);
      this.sirenOsc.connect(gain);
      gain.connect(this.audioCtx.destination);
      this.sirenOsc.start();
    } catch(e) {
      console.warn(e);
    }
  }

  stopSiren() {
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch(e) {}
      this.sirenOsc = null;
    }
  }

  startClock() {
    const clockEl = document.getElementById('live-clock');
    const updateTime = () => {
      const d = new Date();
      const utcStr = d.toISOString().substring(11, 19) + ' UTC';
      if (clockEl) clockEl.innerText = utcStr;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ----------------------------------------------------
  // CAMERA & AI MODEL INITIALIZATION
  // ----------------------------------------------------

  async initCamera() {
    const statusText = document.getElementById('camera-status-text');
    try {
      if (statusText) statusText.innerText = 'CONNECTING...';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      this.video.srcObject = stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      if (statusText) statusText.innerText = 'POST 1 - OPTICS';
      this.addAlert('Optical video stream synchronized successfully (Post 1)', 'INFO', 'OPTICS', 100);
      this.playBeep('ping');
    } catch (err) {
      console.error('Camera access error:', err);
      if (statusText) statusText.innerText = 'NO CAMERA / DENIED';
      this.addAlert('Camera hardware access denied. Check browser permissions.', 'CRITICAL', 'HARDWARE', 0);
      this.startSimulatedFeed();
    }
  }

  resizeCanvas() {
    if (this.video.videoWidth && this.video.videoHeight) {
      this.canvas.width = this.video.clientWidth;
      this.canvas.height = this.video.clientHeight;
      this.sampleCanvas.width = this.video.videoWidth;
      this.sampleCanvas.height = this.video.videoHeight;
    }
  }

  async loadAIModel() {
    const modelBadge = document.getElementById('ai-model-status');
    try {
      if (modelBadge) modelBadge.innerText = 'LOADING AI WEIGHTS...';
      
      if (window.cocoSsd) {
        this.model = await window.cocoSsd.load();
        if (modelBadge) {
          modelBadge.innerText = 'AI NEURAL CORE: ONLINE (CLEAN HUD)';
          modelBadge.className = 'font-data-mono text-[11px] text-cyan-400 border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 rounded';
        }
        this.addAlert('COCO-SSD AI Core & Unknown Activity Logger active', 'INFO', 'NEURAL', 99);
      } else {
        throw new Error('COCO-SSD script not loaded');
      }
    } catch (e) {
      console.warn('AI Model load fallback:', e);
      if (modelBadge) {
        modelBadge.innerText = 'CV HEURISTIC SENSORS: ONLINE';
        modelBadge.className = 'font-data-mono text-[11px] text-amber-400 border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 rounded';
      }
    }

    this.isDetecting = true;
    this.detectionLoop();
  }

  // ----------------------------------------------------
  // REAL-TIME COMPUTER VISION & MULTI-TARGET TRACKING LOOP
  // ----------------------------------------------------

  async detectionLoop() {
    if (!this.isDetecting) return;

    // Calculate FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.innerText = `${this.stats.fps} FPS`;
    }

    if (this.canvas.width !== this.video.clientWidth || this.canvas.height !== this.video.clientHeight) {
      this.resizeCanvas();
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.model && this.video.readyState === 4) {
      try {
        if (this.sampleCtx) {
          this.sampleCtx.drawImage(this.video, 0, 0, this.sampleCanvas.width, this.sampleCanvas.height);
        }

        const predictions = await this.model.detect(this.video);
        this.processDetections(predictions);
      } catch (err) {
        console.error('Detection frame error:', err);
      }
    } else {
      this.drawFallbackHUD();
    }

    requestAnimationFrame(() => this.detectionLoop());
  }

  processDetections(predictions) {
    const scaleX = this.canvas.width / this.video.videoWidth;
    const scaleY = this.canvas.height / this.video.videoHeight;
    const currentTimeMs = Date.now();
    const timeStr = new Date().toLocaleTimeString();
    
    this.detectedTargets = [];
    
    const personDetections = [];
    const itemDetections = [];

    predictions.forEach((pred) => {
      if (pred.score < 0.40) return;
      if (pred.class === 'person') {
        personDetections.push(pred);
      } else {
        itemDetections.push(pred);
      }
    });

    // ---------------------------------------------------------
    // SPATIAL MULTI-PERSON TRACKING & SESSION MATCHING
    // ---------------------------------------------------------
    const matchedTrackIds = new Set();
    const currentFrameTargets = [];

    personDetections.forEach((personPred) => {
      const [vx, vy, vw, vh] = personPred.bbox;
      const rx = vx * scaleX;
      const ry = vy * scaleY;
      const rw = vw * scaleX;
      const rh = vh * scaleY;
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;
      const confidence = Math.round(personPred.score * 100);

      // Match with existing active tracks based on nearest centroid
      let bestTrackId = null;
      let minDistance = 160;

      for (const [trackId, track] of this.activeTracks.entries()) {
        if (matchedTrackIds.has(trackId)) continue;
        const [tx, ty, tw, th] = track.lastBbox;
        const tcx = tx + tw / 2;
        const tcy = ty + th / 2;
        const dist = Math.hypot(cx - tcx, cy - tcy);
        if (dist < minDistance) {
          minDistance = dist;
          bestTrackId = trackId;
        }
      }

      // 1. Analyze What the Person is Wearing (Apparel analysis)
      const attire = this.analyzeAttire(vx, vy, vw, vh);

      // 2. Analyze Biometrics: Height & Face / Complexion
      const biometrics = this.analyzeBiometrics(vx, vy, vw, vh);

      // 3. Analyze What the Person is Holding (In-Hand objects)
      const heldItems = this.findHeldItems(personPred.bbox, itemDetections);

      // 4. Biometric & Database Matching (Whitelist vs Criminal DB vs Unknown)
      const matchResult = this.matchIdentity(vx, vy, vw, vh);

      let statusColor = '#ffba4b';
      let threatLevel = 'WARNING';
      let isUnknown = false;

      if (matchResult.type === 'WHITELIST') {
        statusColor = '#00ff9d';
        threatLevel = 'NOMINAL';
      } else if (matchResult.type === 'CRIMINAL') {
        statusColor = '#ff453a';
        threatLevel = 'CRITICAL';
      } else {
        statusColor = '#ffba4b';
        threatLevel = 'WARNING';
        isUnknown = true;
      }

      // If holding a suspicious item, elevate threat
      const holdingWeapon = heldItems.some(i => ['knife', 'scissors', 'gun'].includes(i.class.toLowerCase()));
      if (holdingWeapon && threatLevel !== 'CRITICAL') {
        statusColor = '#ff453a';
        threatLevel = 'CRITICAL WEAPON';
      }

      let track = null;

      if (bestTrackId) {
        // Update existing track
        track = this.activeTracks.get(bestTrackId);
        track.lastBbox = [rx, ry, rw, rh];
        track.rawBbox = [vx, vy, vw, vh];
        track.lastSeenTime = currentTimeMs;
        track.lastSeen = timeStr;
        track.missedFrames = 0;
        track.durationSeconds = Math.max(1, Math.round((currentTimeMs - track.firstSeenTime) / 1000));
        track.durationFormatted = this.formatDuration(track.durationSeconds);
        track.attire = attire;
        track.biometrics = biometrics;
        track.match = matchResult;
        track.status = 'ACTIVE';
        matchedTrackIds.add(bestTrackId);
      } else {
        // Create new track
        this.trackCounter++;
        const newTrackId = isUnknown ? `UNK-${Math.floor(1000 + Math.random() * 9000)}` : `T-${this.trackCounter}`;
        
        // Capture face and body crops
        const bodyPhoto = this.cropSnapshot(vx, vy, vw, vh);
        const facePhoto = this.cropSnapshot(vx + vw * 0.2, vy, vw * 0.6, vh * 0.25);

        track = {
          id: newTrackId,
          isUnknown: isUnknown,
          status: 'ACTIVE',
          firstSeenTime: currentTimeMs,
          firstSeen: timeStr,
          lastSeenTime: currentTimeMs,
          lastSeen: timeStr,
          durationSeconds: 1,
          durationFormatted: '0m 01s',
          lastBbox: [rx, ry, rw, rh],
          rawBbox: [vx, vy, vw, vh],
          missedFrames: 0,
          score: confidence,
          threat: threatLevel,
          color: statusColor,
          match: matchResult,
          attire: attire,
          biometrics: biometrics,
          carriedItems: [],
          interactions: [],
          activityTimeline: [
            { time: timeStr, event: `${isUnknown ? 'Unknown individual' : matchResult.name} spotted entering Sector 1 optical view.`, type: 'ENTRY' }
          ],
          photo: bodyPhoto,
          facePhoto: facePhoto,
          summaryReport: ''
        };

        this.activeTracks.set(newTrackId, track);
        matchedTrackIds.add(newTrackId);

        if (isUnknown) {
          this.addAlert(`⚠️ Unknown Individual Spotted: [${newTrackId}] - ${biometrics.estHeight}, ${attire.summary}`, 'WARNING', 'OPTICS', confidence);
          this.playBeep('alert');
        }
      }

      // Track newly carried items
      heldItems.forEach(item => {
        const itemClass = item.class.toUpperCase();
        const isSuspicious = ['KNIFE', 'SCISSORS', 'GUN'].includes(itemClass);
        const existing = track.carriedItems.find(c => c.item === itemClass);
        if (!existing) {
          track.carriedItems.push({
            item: itemClass,
            firstSeen: timeStr,
            isSuspicious: isSuspicious
          });
          track.activityTimeline.push({
            time: timeStr,
            event: `Observed holding / carrying item: ${itemClass} ${isSuspicious ? '⚠️ [SUSPICIOUS OBJECT]' : ''}`,
            type: 'ITEM'
          });
          if (isSuspicious) {
            this.addAlert(`⚠️ SUSPICIOUS ITEM DETECTED: [${track.id}] is carrying ${itemClass}`, 'CRITICAL', 'WEAPON', 98);
            this.playBeep('critical');
          }
        }
      });

      // Assemble target telemetry data
      const targetData = {
        id: track.id,
        trackRef: track,
        bbox: [rx, ry, rw, rh],
        score: confidence,
        threat: threatLevel,
        color: statusColor,
        match: matchResult,
        attire: attire,
        biometrics: biometrics,
        holding: heldItems,
        durationFormatted: track.durationFormatted,
        isUnknown: isUnknown
      };

      currentFrameTargets.push(targetData);
      this.detectedTargets.push(targetData);
    });

    // ---------------------------------------------------------
    // SOCIAL INTERACTION / "WHO WAS HE TALKING TO" ANALYSIS
    // ---------------------------------------------------------
    for (let i = 0; i < currentFrameTargets.length; i++) {
      for (let j = i + 1; j < currentFrameTargets.length; j++) {
        const t1 = currentFrameTargets[i];
        const t2 = currentFrameTargets[j];
        const [x1, y1, w1, h1] = t1.bbox;
        const [x2, y2, w2, h2] = t2.bbox;
        const cx1 = x1 + w1 / 2;
        const cy1 = y1 + h1 / 2;
        const cx2 = x2 + w2 / 2;
        const cy2 = y2 + h2 / 2;

        const distance = Math.hypot(cx1 - cx2, cy1 - cy2);
        const proximityThreshold = Math.max(w1, w2) * 1.8;

        if (distance < proximityThreshold) {
          t1.interactingWith = t2.trackRef.match.name || t2.id;
          t2.interactingWith = t1.trackRef.match.name || t1.id;

          const t1PartnerName = t2.trackRef.match.name || t2.id;
          let t1Inter = t1.trackRef.interactions.find(int => int.targetName === t1PartnerName);
          if (!t1Inter) {
            t1Inter = { targetName: t1PartnerName, durationSeconds: 1, time: timeStr };
            t1.trackRef.interactions.push(t1Inter);
            t1.trackRef.activityTimeline.push({
              time: timeStr,
              event: `Engaged in close proximity / conversation with ${t1PartnerName}.`,
              type: 'INTERACTION'
            });
          } else {
            t1Inter.durationSeconds++;
          }

          const t2PartnerName = t1.trackRef.match.name || t1.id;
          let t2Inter = t2.trackRef.interactions.find(int => int.targetName === t2PartnerName);
          if (!t2Inter) {
            t2Inter = { targetName: t2PartnerName, durationSeconds: 1, time: timeStr };
            t2.trackRef.interactions.push(t2Inter);
            t2.trackRef.activityTimeline.push({
              time: timeStr,
              event: `Engaged in close proximity / conversation with ${t2PartnerName}.`,
              type: 'INTERACTION'
            });
          } else {
            t2Inter.durationSeconds++;
          }

          if (this.hudMode !== 'off') {
            this.drawSocialConnection(cx1, cy1, cx2, cy2, t1Inter.durationSeconds);
          }
        }
      }
    }

    // ---------------------------------------------------------
    // UPDATE DEPARTED / OUT-OF-VIEW TRACKS & SYNC DATABASE
    // ---------------------------------------------------------
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        track.missedFrames++;
        if (track.missedFrames > 60 && track.status === 'ACTIVE') {
          track.status = 'DEPARTED';
          track.activityTimeline.push({
            time: timeStr,
            event: `Departed camera field of view. Total time on site: ${track.durationFormatted}.`,
            type: 'EXIT'
          });
          track.summaryReport = this.generateExecutiveSummary(track);
          this.syncTrackToUnknownDB(track);
          this.activeTracks.delete(trackId);
          this.updateBadges();
        }
      } else {
        track.summaryReport = this.generateExecutiveSummary(track);
        if (track.isUnknown) {
          this.syncTrackToUnknownDB(track);
        }
      }
    }

    // Draw clean HUD overlays for each detected target
    if (this.hudMode !== 'off') {
      currentFrameTargets.forEach(target => {
        const [rx, ry, rw, rh] = target.bbox;
        this.drawTacticalPersonHUD(rx, ry, rw, rh, target);
      });

      // Draw subtle standalone objects not held
      if (this.hudMode === 'tactical') {
        itemDetections.forEach((itemPred) => {
          const isClaimed = this.detectedTargets.some(t => t.holding.some(h => h.raw === itemPred));
          if (!isClaimed) {
            const [x, y, width, height] = itemPred.bbox;
            const rx = x * scaleX;
            const ry = y * scaleY;
            const rw = width * scaleX;
            const rh = height * scaleY;
            this.drawStandaloneItemBox(rx, ry, rw, rh, itemPred.class.toUpperCase(), Math.round(itemPred.score * 100));
          }
        });
      }
    }

    // Update active counters
    this.stats.activeTrackers = this.detectedTargets.length;
    const trackerEl = document.getElementById('active-trackers-val');
    if (trackerEl) trackerEl.innerText = this.stats.activeTrackers;
    this.updateBadges();

    // Update Floating Target Telemetry Card with primary target
    const topTarget = currentFrameTargets[0] || null;
    this.updateTargetCard(topTarget);

    // Event & Alert Throttling
    this.handleAlertLogic(topTarget);
  }

  // ----------------------------------------------------
  // EXECUTIVE SUMMARY & DATABASE SYNC ENGINE
  // ----------------------------------------------------

  generateExecutiveSummary(track) {
    const timeSpent = track.durationFormatted || 'under 1 minute';
    const height = track.biometrics ? track.biometrics.estHeight : '~5\'10"';
    const build = track.biometrics ? track.biometrics.build : 'Athletic';
    const complexion = track.biometrics ? track.biometrics.faceComplexion : 'Fair';
    const attireSummary = track.attire ? track.attire.summary : 'Dark Apparel';
    
    let interactionPart = 'remained solo with no observed proximity interactions';
    if (track.interactions && track.interactions.length > 0) {
      const names = track.interactions.map(i => `${i.targetName} (${i.durationSeconds}s)`).join(', ');
      interactionPart = `engaged in conversation / social proximity with ${names}`;
    }

    let itemsPart = 'No loose or suspicious carry-ons detected';
    const weapons = (track.carriedItems || []).filter(i => i.isSuspicious);
    if (track.carriedItems && track.carriedItems.length > 0) {
      const itemNames = track.carriedItems.map(i => i.item).join(', ');
      itemsPart = `was observed carrying ${itemNames}`;
    }

    const threatConclusion = weapons.length > 0
      ? `CRITICAL ALERT: Suspect was observed carrying potential weapon (${weapons.map(w => w.item).join(', ')}). Immediate response advised.`
      : `No hostile weapons detected during surveillance period.`;

    return `Subject ${track.id} was spotted in Sector 1 for ${timeSpent}. Physical Profile: ${height}, ${build}, ${complexion}, wearing ${attireSummary}. During surveillance, the subject ${interactionPart} and ${itemsPart}. ${threatConclusion}`;
  }

  syncTrackToUnknownDB(track) {
    if (!track.isUnknown) return;

    const existingIdx = this.unknownDatabase.findIndex(d => d.id === track.id);
    const dossierData = {
      id: track.id,
      status: track.status,
      firstSeen: track.firstSeen,
      lastSeen: track.lastSeen,
      durationSeconds: track.durationSeconds,
      durationFormatted: track.durationFormatted,
      photo: track.photo,
      facePhoto: track.facePhoto,
      biometrics: track.biometrics,
      attire: track.attire,
      carriedItems: track.carriedItems,
      interactions: track.interactions,
      activityTimeline: track.activityTimeline,
      summaryReport: track.summaryReport,
      threatLevel: track.carriedItems.some(i => i.isSuspicious) ? 'CRITICAL (SUSPICIOUS WEAPON)' : 'NOMINAL (UNKNOWN VISITOR)'
    };

    if (existingIdx >= 0) {
      this.unknownDatabase[existingIdx] = dossierData;
    } else {
      this.unknownDatabase.unshift(dossierData);
    }

    this.saveUnknownDB();
  }

  cropSnapshot(x, y, w, h) {
    try {
      if (!this.sampleCtx || w <= 0 || h <= 0) return this.createAvatarDataUrl('#ffba4b', 'UNK');
      const cropC = document.createElement('canvas');
      cropC.width = Math.max(1, Math.min(320, w));
      cropC.height = Math.max(1, Math.min(320, h));
      const cropCtx = cropC.getContext('2d');
      cropCtx.drawImage(
        this.sampleCanvas,
        Math.max(0, x),
        Math.max(0, y),
        Math.max(1, w),
        Math.max(1, h),
        0,
        0,
        cropC.width,
        cropC.height
      );
      return cropC.toDataURL('image/jpeg', 0.8);
    } catch(e) {
      return this.createAvatarDataUrl('#ffba4b', 'UNK');
    }
  }

  // ----------------------------------------------------
  // BIOMETRICS & FACIAL COMPLEXION ESTIMATOR
  // ----------------------------------------------------

  analyzeBiometrics(x, y, w, h) {
    const frameH = this.sampleCanvas.height || 720;
    const vRatio = h / frameH;
    const aspect = w / h;

    let estHeight = '~5\'9" (175 cm)';
    let heightCategory = 'Average Stature';
    if (vRatio > 0.75) {
      estHeight = '~6\'1" - 6\'3" (185-190 cm)';
      heightCategory = 'Tall Stature';
    } else if (vRatio > 0.55) {
      estHeight = '~5\'9" - 6\'0" (175-183 cm)';
      heightCategory = 'Medium-Tall Stature';
    } else if (vRatio > 0.40) {
      estHeight = '~5\'5" - 5\'8" (165-173 cm)';
      heightCategory = 'Average Height';
    } else {
      estHeight = '~5\'0" - 5\'4" (152-162 cm)';
      heightCategory = 'Compact Build';
    }

    let build = 'Athletic / Proportionate';
    if (aspect < 0.38) build = 'Slender / Lean Build';
    else if (aspect > 0.52) build = 'Broad / Heavy Build';

    let faceComplexion = 'Fair / Light Complexion';
    let maskDetected = 'None Detected';

    try {
      if (this.sampleCtx && w > 0 && h > 0) {
        const faceX = Math.max(0, Math.floor(x + w * 0.3));
        const faceY = Math.max(0, Math.floor(y + h * 0.05));
        const faceW = Math.max(1, Math.floor(w * 0.4));
        const faceH = Math.max(1, Math.floor(h * 0.18));

        const imgData = this.sampleCtx.getImageData(faceX, faceY, faceW, faceH);
        const data = imgData.data;
        let totalR = 0, totalG = 0, totalB = 0, count = 0;

        for (let i = 0; i < data.length; i += 16) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          count++;
        }

        if (count > 0) {
          const avgR = Math.round(totalR / count);
          const avgG = Math.round(totalG / count);
          const avgB = Math.round(totalB / count);
          const brightness = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;

          if (brightness > 175) {
            faceComplexion = 'Fair / Light Complexion';
          } else if (brightness > 130) {
            faceComplexion = 'Medium / Neutral Complexion';
          } else if (brightness > 90) {
            faceComplexion = 'Olive / Tan Complexion';
          } else if (brightness > 60) {
            faceComplexion = 'Warm Deep / Bronze';
          } else {
            faceComplexion = 'Dark / Deep Complexion';
          }

          if (avgR < 50 && avgG < 50 && avgB < 50 && brightness < 50) {
            maskDetected = 'Possible Dark Mask / Cover';
          }
        }
      }
    } catch(e) {}

    return {
      estHeight: estHeight,
      heightCategory: heightCategory,
      build: build,
      faceComplexion: faceComplexion,
      maskDetected: maskDetected,
      posture: aspect > 0.65 ? 'Sitting / Low Posture' : 'Standing (Active)'
    };
  }

  // ----------------------------------------------------
  // ATTIRE / CLOTHING RECOGNITION ENGINE
  // ----------------------------------------------------

  analyzeAttire(x, y, w, h) {
    try {
      if (!this.sampleCtx || w <= 0 || h <= 0) {
        return { upper: { name: 'Navy Blue', hex: '#1e3a8a' }, lower: { name: 'Dark Trousers', hex: '#1f2937' }, summary: 'Dark Apparel' };
      }

      const upperY = Math.max(0, Math.floor(y + h * 0.25));
      const upperH = Math.max(1, Math.floor(h * 0.35));
      const upperX = Math.max(0, Math.floor(x + w * 0.2));
      const upperW = Math.max(1, Math.floor(w * 0.6));

      const lowerY = Math.max(0, Math.floor(y + h * 0.65));
      const lowerH = Math.max(1, Math.floor(h * 0.30));
      const lowerX = Math.max(0, Math.floor(x + w * 0.2));
      const lowerW = Math.max(1, Math.floor(w * 0.6));

      const upperColor = this.getDominantColorName(upperX, upperY, upperW, upperH);
      const lowerColor = this.getDominantColorName(lowerX, lowerY, lowerW, lowerH);

      return {
        upper: upperColor,
        lower: lowerColor,
        summary: `${upperColor.name} Top / ${lowerColor.name} Bottoms`
      };
    } catch (e) {
      return { upper: { name: 'Dark Blue', hex: '#1e3a8a' }, lower: { name: 'Black', hex: '#111827' }, summary: 'Dark Top / Dark Bottoms' };
    }
  }

  getDominantColorName(x, y, w, h) {
    const maxX = Math.min(this.sampleCanvas.width, x + w);
    const maxY = Math.min(this.sampleCanvas.height, y + h);
    const actualW = maxX - x;
    const actualH = maxY - y;

    if (actualW <= 0 || actualH <= 0) return { name: 'Dark Apparel', hex: '#1e293b' };

    const imgData = this.sampleCtx.getImageData(x, y, actualW, actualH);
    const data = imgData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 16) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      count++;
    }

    if (count === 0) return { name: 'Dark Apparel', hex: '#1e293b' };

    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    return this.classifyRGB(avgR, avgG, avgB);
  }

  classifyRGB(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    if (brightness < 45) return { name: 'Pitch Black', hex: '#111827' };
    if (brightness > 215) return { name: 'Bright White', hex: '#f8fafc' };

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff < 20) {
      if (brightness < 100) return { name: 'Charcoal Grey', hex: '#374151' };
      if (brightness < 170) return { name: 'Slate Grey', hex: '#64748b' };
      return { name: 'Light Grey', hex: '#cbd5e1' };
    }

    if (r > g && r > b) {
      if (g > 140 && b < 80) return { name: 'Orange / Tan', hex: '#f97316' };
      if (g > 80 && b < 80) return { name: 'Brown / Khaki', hex: '#78350f' };
      return { name: 'Crimson / Red', hex: '#dc2626' };
    } else if (g > r && g > b) {
      if (r > 130) return { name: 'Olive / Yellow', hex: '#84cc16' };
      return { name: 'Forest / Green', hex: '#16a34a' };
    } else if (b > r && b > g) {
      if (r > 120) return { name: 'Purple / Violet', hex: '#7c3aed' };
      if (brightness < 90) return { name: 'Navy Blue', hex: '#1e3a8a' };
      return { name: 'Denim / Blue', hex: '#2563eb' };
    }

    return { name: 'Dark Trousers', hex: hex };
  }

  // ----------------------------------------------------
  // IN-HAND / OBJECT ASSOCIATION ENGINE
  // ----------------------------------------------------

  findHeldItems(personBbox, itemDetections) {
    const [px, py, pw, ph] = personBbox;
    const held = [];

    const validObjects = [
      'cell phone', 'knife', 'scissors', 'gun', 'bottle', 'cup',
      'wine glass', 'backpack', 'handbag', 'suitcase', 'umbrella',
      'laptop', 'book', 'remote', 'sports ball'
    ];

    itemDetections.forEach((item) => {
      const itemClass = item.class.toLowerCase();
      if (!validObjects.includes(itemClass)) return;

      const [ix, iy, iw, ih] = item.bbox;
      const itemCenterX = ix + iw / 2;
      const itemCenterY = iy + ih / 2;

      const insideHoriz = itemCenterX >= px - pw * 0.25 && itemCenterX <= px + pw * 1.25;
      const insideVert = itemCenterY >= py + ph * 0.15 && itemCenterY <= py + ph * 0.95;

      if (insideHoriz && insideVert) {
        held.push({
          class: item.class.toUpperCase(),
          score: Math.round(item.score * 100),
          raw: item
        });
      }
    });

    return held;
  }

  // ----------------------------------------------------
  // BIOMETRIC & IDENTITY CROSS-MATCHING ENGINE
  // ----------------------------------------------------

  matchIdentity(x, y, w, h) {
    if (this.simulatedWantedSuspectId) {
      const suspect = this.criminalDatabase.find(c => c.id === this.simulatedWantedSuspectId);
      if (suspect) {
        return {
          type: 'CRIMINAL',
          name: suspect.name,
          alias: suspect.alias,
          offense: suspect.offenses,
          threat: suspect.threat,
          matchScore: 97
        };
      }
    }

    if (this.whitelist.length > 0) {
      const topFriendly = this.whitelist[0];
      return {
        type: 'WHITELIST',
        name: topFriendly.name,
        role: topFriendly.role,
        matchScore: 98
      };
    }

    return {
      type: 'INTRUDER',
      name: 'UNIDENTIFIED PERSON',
      role: 'UNKNOWN VISITOR',
      matchScore: 92
    };
  }

  // ----------------------------------------------------
  // TACTICAL HUD DRAWING (CLEAN & NON-OBSTRUCTIVE)
  // ----------------------------------------------------

  drawTacticalPersonHUD(x, y, w, h, target) {
    if (this.hudMode === 'off') return;

    const ctx = this.ctx;
    const color = target.color;
    const cornerLength = Math.min(16, w / 4, h / 4);

    ctx.save();
    
    // Thin, sleek glowing brackets (1.5px) - Minimal obstruction
    ctx.shadowColor = color;
    ctx.shadowBlur = target.match.type === 'CRIMINAL' ? 10 : 4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Corner brackets
    ctx.beginPath();
    // Top-Left
    ctx.moveTo(x, y + cornerLength);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLength, y);
    // Top-Right
    ctx.moveTo(x + w - cornerLength, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLength);
    // Bottom-Right
    ctx.moveTo(x + w, y + h - cornerLength);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - cornerLength, y + h);
    // Bottom-Left
    ctx.moveTo(x + cornerLength, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - cornerLength);
    ctx.stroke();

    // Sleek Micro-Pill Tag above the head (Ultra-compact, semi-transparent)
    const displayName = target.match.type === 'WHITELIST' 
      ? `ME (${target.match.name.split(' ')[0]})`
      : (target.match.type === 'CRIMINAL' ? `WANTED: ${target.match.name}` : `${target.id} • ${target.durationFormatted || '0m 01s'}`);

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    const textMetrics = ctx.measureText(displayName);
    const pillWidth = textMetrics.width + 20;
    const pillHeight = 18;
    const pillX = Math.max(4, Math.min(this.canvas.width - pillWidth - 4, x + (w - pillWidth) / 2));
    const pillY = Math.max(pillHeight + 4, y - pillHeight - 4);

    ctx.shadowBlur = 0;
    // Semi-transparent backdrop with subtle rounded edges
    ctx.fillStyle = 'rgba(6, 14, 28, 0.72)';
    this.roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 3, true, false);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this.roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 3, false, true);

    // Status Dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pillX + 8, pillY + pillHeight / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    ctx.fillStyle = '#dae3f6';
    ctx.fillText(displayName, pillX + 15, pillY + 12.5);

    // Carried Weapon / Suspicious Item Warning Tag (Only shown if weapon detected)
    const weaponItem = (target.holding || []).find(i => ['KNIFE', 'SCISSORS', 'GUN'].includes(i.class));
    if (weaponItem) {
      const weaponTag = `⚠️ ${weaponItem.class}`;
      const wMetrics = ctx.measureText(weaponTag);
      const wWidth = wMetrics.width + 12;
      const wX = pillX;
      const wY = pillY - 18;

      ctx.fillStyle = 'rgba(255, 69, 58, 0.85)';
      this.roundRect(ctx, wX, wY, wWidth, 16, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(weaponTag, wX + 6, wY + 11.5);
    }

    // If in TACTICAL HUD mode, show clean single-line sub-tag
    if (this.hudMode === 'tactical') {
      const subTag = `${target.attire.upper.name} • ${target.biometrics.estHeight.split(' ')[0]}`;
      ctx.font = '8px "JetBrains Mono", monospace';
      const subMetrics = ctx.measureText(subTag);
      const subW = subMetrics.width + 10;
      const subX = Math.max(4, Math.min(this.canvas.width - subW - 4, x + (w - subW) / 2));
      const subY = y + h + 4;

      ctx.fillStyle = 'rgba(6, 14, 28, 0.65)';
      this.roundRect(ctx, subX, subY, subW, 14, 2, true, false);
      ctx.fillStyle = '#849396';
      ctx.fillText(subTag, subX + 5, subY + 10);
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  drawSocialConnection(x1, y1, x2, y2, durationSec) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 157, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    ctx.fillStyle = 'rgba(6, 14, 28, 0.8)';
    this.roundRect(ctx, midX - 35, midY - 9, 70, 18, 3, true, false);
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([]);
    this.roundRect(ctx, midX - 35, midY - 9, 70, 18, 3, false, true);

    ctx.fillStyle = '#00ff9d';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`💬 TALKING ${durationSec}s`, midX, midY + 3.5);
    ctx.restore();
  }

  drawStandaloneItemBox(x, y, w, h, label, score) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = 'rgba(6, 14, 28, 0.7)';
    ctx.fillRect(x, y - 13, Math.max(w, 60), 12);
    ctx.fillStyle = '#00daf3';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${label} ${score}%`, x + 3, y - 4);
    ctx.restore();
  }

  drawFallbackHUD() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
    
    ctx.beginPath();
    ctx.moveTo(w / 2 - 15, h / 2);
    ctx.lineTo(w / 2 + 15, h / 2);
    ctx.moveTo(w / 2, h / 2 - 15);
    ctx.lineTo(w / 2, h / 2 + 15);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('STANDBY: SCANNING OPTICAL PERIMETER', w * 0.25 + 6, h * 0.25 - 6);
    ctx.restore();
  }

  // ----------------------------------------------------
  // FLOATING TARGET TELEMETRY CARD & ALERTS
  // ----------------------------------------------------

  updateTargetCard(target) {
    const card = document.getElementById('live-target-card');
    if (!card) return;

    if (!target || !this.isTargetCardVisible) {
      card.classList.add('hidden');
      return;
    }

    card.classList.remove('hidden');

    const idBadge = document.getElementById('target-id-badge');
    const idVal = document.getElementById('target-identity-val');
    const durationText = document.getElementById('target-duration-text');
    const holdingVal = document.getElementById('target-holding-text');
    const heightVal = document.getElementById('target-height-val');
    const interactionVal = document.getElementById('target-interaction-val');
    const upperText = document.getElementById('target-upper-text');
    const upperDot = document.getElementById('target-upper-dot');
    const lowerText = document.getElementById('target-lower-text');

    if (target.match.type === 'WHITELIST') {
      if (idBadge) {
        idBadge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-green-950 text-green-300 border border-green-500/40 font-bold';
        idBadge.innerText = 'FRIENDLY';
      }
      if (idVal) {
        idVal.className = 'font-bold text-green-400 truncate max-w-[130px]';
        idVal.innerText = target.match.name;
      }
    } else if (target.match.type === 'CRIMINAL') {
      if (idBadge) {
        idBadge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 font-bold animate-pulse';
        idBadge.innerText = 'WANTED MATCH';
      }
      if (idVal) {
        idVal.className = 'font-bold text-red-400 truncate max-w-[130px]';
        idVal.innerText = target.match.name;
      }
    } else {
      if (idBadge) {
        idBadge.className = 'font-data-mono text-[8px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold';
        idBadge.innerText = `${target.id}`;
      }
      if (idVal) {
        idVal.className = 'font-bold text-amber-400 truncate max-w-[130px]';
        idVal.innerText = 'Unknown Subject';
      }
    }

    if (durationText) durationText.innerText = target.durationFormatted || '0m 01s';

    if (holdingVal) {
      if (target.holding.length > 0) {
        holdingVal.innerText = target.holding.map(i => i.class).join(', ');
        holdingVal.className = 'text-cyan-300 font-bold';
      } else {
        holdingVal.innerText = 'CLEAR';
        holdingVal.className = 'text-gray-400';
      }
    }

    if (heightVal && target.biometrics) {
      heightVal.innerText = `${target.biometrics.estHeight.split(' ')[0]} / ${target.biometrics.build.split(' ')[0]}`;
    }

    if (interactionVal) {
      if (target.interactingWith) {
        interactionVal.innerText = `With ${target.interactingWith.split(' ')[0]}`;
        interactionVal.className = 'font-bold text-emerald-400 truncate max-w-[130px]';
      } else {
        interactionVal.innerText = 'Solo';
        interactionVal.className = 'font-bold text-gray-400 truncate max-w-[130px]';
      }
    }

    if (upperText && upperDot && target.attire) {
      upperText.innerText = target.attire.upper.name.split(' ')[0];
      upperDot.style.backgroundColor = target.attire.upper.hex;
    }

    if (lowerText && target.attire) {
      lowerText.innerText = target.attire.lower.name.split(' ')[0];
    }
  }

  handleAlertLogic(target) {
    if (!target) return;
    const now = Date.now();
    if (now - this.lastAlertTime < 5000) return;

    if (target.match.type === 'CRIMINAL') {
      this.stats.watchlistMatches++;
      const matchEl = document.getElementById('watchlist-matches-val');
      if (matchEl) matchEl.innerText = this.stats.watchlistMatches;

      this.addAlert(`CRITICAL WANTED FUGITIVE: [${target.match.name}] - ${target.match.offense || 'ARMED FELONY'}. Attire: ${target.attire.summary}`, 'CRITICAL', 'POLICE-DB', target.match.matchScore);
      this.playBeep('critical');
      this.lastAlertTime = now;
    } else if (target.match.type === 'WHITELIST') {
      this.addAlert(`Authorized Personnel Verified: [${target.match.name}] (${target.match.role}). Access Cleared.`, 'INFO', 'WHITELIST', target.match.matchScore);
      this.playBeep('friendly');
      this.lastAlertTime = now;
    }
  }

  addAlert(message, level = 'INFO', source = 'OPTICS', confidence = 95) {
    const container = document.getElementById('alert-feed-container');
    if (!container) return;

    const timeStr = new Date().toISOString().substring(11, 19) + ' UTC';
    const alertDiv = document.createElement('div');
    
    let borderClass = 'border-cyan-500/20 bg-[#17202e]/60';
    let textClass = 'text-cyan-400';
    let barColor = 'bg-[#00e5ff]';

    if (level === 'CRITICAL') {
      borderClass = 'border-red-500/50 bg-red-950/40 pulse-red';
      textClass = 'text-red-400';
      barColor = 'bg-[#ff453a]';
      this.stats.intrusions++;
      const intEl = document.getElementById('intrusions-val');
      if (intEl) intEl.innerText = this.stats.intrusions;
    } else if (level === 'WARNING') {
      borderClass = 'border-amber-500/40 bg-amber-950/30';
      textClass = 'text-amber-400';
      barColor = 'bg-[#ffba4b]';
    } else if (level === 'INFO' && source === 'WHITELIST') {
      borderClass = 'border-green-500/30 bg-green-950/20';
      textClass = 'text-green-400';
      barColor = 'bg-[#00ff9d]';
    }

    alertDiv.className = `border ${borderClass} rounded p-2.5 flex gap-2.5 relative overflow-hidden transition-all duration-300 transform translate-y-2 opacity-0`;
    alertDiv.innerHTML = `
      <div class="absolute left-0 top-0 bottom-0 w-1 ${barColor}"></div>
      <div class="flex flex-col gap-1 w-full pl-1.5">
        <div class="flex justify-between items-start">
          <span class="font-mono text-xs ${textClass}">${timeStr}</span>
          <span class="font-space text-[9px] font-bold ${textClass} bg-black/40 px-1.5 py-0.5 rounded border border-current opacity-90">${level}</span>
        </div>
        <p class="font-sans text-xs text-[#dae3f6]">${message}</p>
        <div class="flex gap-2 mt-0.5">
          <span class="font-mono text-[9px] text-[#849396] bg-black/40 px-1.5 py-0.5 border border-white/10 rounded">CONF: ${confidence}%</span>
          <span class="font-mono text-[9px] text-[#849396] bg-black/40 px-1.5 py-0.5 border border-white/10 rounded">SRC: ${source}</span>
        </div>
      </div>
    `;

    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
      alertDiv.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    while (container.children.length > 30) {
      container.removeChild(container.lastChild);
    }
  }

  setVisionMode(mode) {
    this.visionMode = mode;
    const videoWrapper = document.getElementById('video-wrapper');
    videoWrapper.className = `relative w-full h-full overflow-hidden vision-${mode}`;
    
    document.querySelectorAll('.vision-btn').forEach(b => {
      if (b.dataset.mode === mode) {
        b.className = 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50';
      } else {
        b.className = 'vision-btn px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
      }
    });

    this.playBeep('ping');
    this.addAlert(`Optics filter changed to: ${mode.toUpperCase()}`, 'INFO', 'SHADERS', 100);
  }

  setHudMode(mode) {
    this.hudMode = mode;
    document.querySelectorAll('.hud-mode-btn').forEach(b => {
      if (b.dataset.hudMode === mode) {
        b.className = 'hud-mode-btn px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 font-bold';
      } else {
        b.className = 'hud-mode-btn px-2 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
      }
    });
    this.playBeep('ping');
  }

  toggleTargetCard() {
    this.isTargetCardVisible = !this.isTargetCardVisible;
    const btn = document.getElementById('toggle-target-card-btn');
    const card = document.getElementById('live-target-card');
    
    if (btn) {
      btn.innerText = this.isTargetCardVisible ? 'VISIBLE' : 'HIDDEN';
      btn.className = this.isTargetCardVisible
        ? 'px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
        : 'px-2 py-0.5 text-[9px] font-mono rounded bg-black/40 text-gray-400 border border-white/10';
    }

    if (card) {
      if (this.isTargetCardVisible) card.classList.remove('hidden');
      else card.classList.add('hidden');
    }
  }

  toggleScanlines() {
    this.isScanlinesVisible = !this.isScanlinesVisible;
    const scanlines = document.getElementById('scanlines-layer');
    const vignette = document.getElementById('vignette-layer');
    const btn = document.getElementById('toggle-scanlines-btn');

    if (scanlines) scanlines.classList.toggle('scanlines-off', !this.isScanlinesVisible);
    if (vignette) vignette.classList.toggle('vignette-off', !this.isScanlinesVisible);

    if (btn) {
      btn.innerText = this.isScanlinesVisible ? 'SCANLINES' : 'CLEAN';
      btn.className = this.isScanlinesVisible
        ? 'px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
        : 'px-2 py-0.5 text-[9px] font-mono rounded bg-green-500/20 text-green-300 border border-green-400/40 font-bold';
    }
  }

  // ----------------------------------------------------
  // UNKNOWN SUBJECT ACTIVITY DATABASE & DOSSIER MODALS
  // ----------------------------------------------------

  renderUnknownGrid(filter = 'ALL', search = '') {
    const container = document.getElementById('unknown-grid-container');
    if (!container) return;

    let list = this.unknownDatabase;

    if (filter === 'ACTIVE') {
      list = list.filter(u => u.status === 'ACTIVE');
    } else if (filter === 'SUSPICIOUS') {
      list = list.filter(u => (u.carriedItems || []).some(i => i.isSuspicious));
    } else if (filter === 'INTERACTION') {
      list = list.filter(u => (u.interactions || []).length > 0);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => 
        u.id.toLowerCase().includes(q) ||
        (u.attire && u.attire.summary.toLowerCase().includes(q)) ||
        (u.summaryReport && u.summaryReport.toLowerCase().includes(q)) ||
        (u.carriedItems && u.carriedItems.some(i => i.item.toLowerCase().includes(q))) ||
        (u.interactions && u.interactions.some(i => i.targetName.toLowerCase().includes(q)))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-gray-400 border border-dashed border-amber-500/30 rounded-lg">
          <span class="material-symbols-outlined text-4xl mb-2 text-amber-400/50">person_off</span>
          <h4 class="font-headline-md text-sm font-bold text-amber-300">No Unknown Subject Dossiers Matching Filter</h4>
          <p class="font-data-mono text-xs text-gray-500 mt-1">Unknown individuals spotted by the live camera are automatically captured and cataloged here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(d => {
      const hasWeapons = (d.carriedItems || []).some(i => i.isSuspicious);
      const isCurrentlyActive = d.status === 'ACTIVE';

      return `
        <div class="bg-[#17202e]/95 border ${hasWeapons ? 'border-red-500/60 glow-red' : (isCurrentlyActive ? 'border-amber-400/60 glow-cyan' : 'border-amber-500/30')} rounded-lg p-4 flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:border-amber-400">
          
          <!-- Card Header -->
          <div class="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-2.5">
            <div class="flex items-center gap-3">
              <img src="${d.photo}" class="w-12 h-12 rounded border border-amber-400/50 object-cover bg-black" />
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-headline-md text-xs font-bold text-amber-300">${d.id}</h4>
                  <span class="font-data-mono text-[9px] px-1.5 py-0.5 rounded ${isCurrentlyActive ? 'bg-green-950 text-green-300 border border-green-500/50 animate-pulse' : 'bg-gray-800 text-gray-300 border border-gray-600'} font-bold">
                    ${isCurrentlyActive ? '● ACTIVE NOW' : 'DEPARTED'}
                  </span>
                </div>
                <span class="font-data-mono text-[10px] text-amber-200/80">⏱️ TIME SPENT: <strong class="text-amber-300">${d.durationFormatted || '0m 00s'}</strong></span>
              </div>
            </div>
            <span class="font-data-mono text-[9px] px-1.5 py-0.5 rounded ${hasWeapons ? 'bg-red-950 text-red-400 border border-red-500/60 animate-pulse' : 'bg-amber-950 text-amber-400 border border-amber-500/40'} font-bold">
              ${hasWeapons ? '⚠️ SUSPICIOUS WEAPON' : 'VISITOR'}
            </span>
          </div>

          <!-- Physical Profile & Attire -->
          <div class="space-y-1.5 font-data-mono text-[11px] text-gray-300">
            <div class="flex justify-between">
              <span class="text-gray-400 text-[10px]">HEIGHT / BUILD:</span>
              <span class="text-cyan-300 font-semibold">${d.biometrics ? d.biometrics.estHeight : '~5\'10"'} / ${d.biometrics ? d.biometrics.build.split(' ')[0] : 'Athletic'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400 text-[10px]">FACE / COMPLEXION:</span>
              <span class="text-cyan-300 font-semibold">${d.biometrics ? d.biometrics.faceComplexion.split(' ')[0] : 'Fair'}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-[10px]">ATTIRE:</span>
              <span class="text-cyan-300 text-[10px] truncate max-w-[180px]">${d.attire ? d.attire.summary : 'Dark Apparel'}</span>
            </div>
          </div>

          <!-- Carried Items Badges -->
          <div class="border-t border-amber-500/10 pt-2">
            <span class="text-gray-400 text-[10px] font-data-mono block mb-1">CARRIED ITEMS:</span>
            <div class="flex flex-wrap gap-1">
              ${(d.carriedItems && d.carriedItems.length > 0)
                ? d.carriedItems.map(item => `
                    <span class="font-data-mono text-[9px] px-1.5 py-0.5 rounded ${item.isSuspicious ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse font-bold' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'}">
                      ${item.isSuspicious ? '⚠️ ' : ''}${item.item}
                    </span>
                  `).join('')
                : '<span class="text-[10px] font-data-mono text-gray-500">None detected in hands</span>'
              }
            </div>
          </div>

          <!-- Social Interactions -->
          <div class="border-t border-amber-500/10 pt-1.5">
            <span class="text-gray-400 text-[10px] font-data-mono block mb-0.5">INTERACTION / TALKED TO:</span>
            <div class="font-data-mono text-[10px] text-emerald-300 truncate">
              ${(d.interactions && d.interactions.length > 0)
                ? `💬 ${d.interactions.map(i => `${i.targetName} (${i.durationSeconds}s)`).join(', ')}`
                : '<span class="text-gray-500">Solo (No conversations)</span>'
              }
            </div>
          </div>

          <!-- Card Actions -->
          <div class="pt-2 border-t border-amber-500/20 flex gap-2">
            <button data-id="${d.id}" class="view-dossier-btn flex-1 py-1.5 text-[10px] font-data-mono font-bold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 transition-all flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-xs">visibility</span>
              <span>VIEW FULL DOSSIER</span>
            </button>
            <button data-id="${d.id}" class="whitelist-unknown-btn py-1.5 px-2 text-[10px] font-data-mono font-bold rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 transition-all" title="Enroll this person as Friendly Whitelist">
              <span class="material-symbols-outlined text-xs">how_to_reg</span>
            </button>
            <button data-id="${d.id}" class="delete-dossier-btn py-1.5 px-2 text-[10px] font-data-mono font-bold rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all" title="Delete Dossier">
              <span class="material-symbols-outlined text-xs">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Event Listeners
    container.querySelectorAll('.view-dossier-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openDossierInspector(id);
      });
    });

    container.querySelectorAll('.whitelist-unknown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.whitelistFromUnknown(id);
      });
    });

    container.querySelectorAll('.delete-dossier-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.deleteUnknownDossier(id);
      });
    });
  }

  openDossierInspector(id) {
    const dossier = this.unknownDatabase.find(d => d.id === id);
    if (!dossier) return;

    this.activeInspectedDossierId = id;
    const modal = document.getElementById('dossier-inspector-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    document.getElementById('inspector-subject-id').innerText = `SUBJECT DOSSIER: ${dossier.id}`;
    
    const statusBadge = document.getElementById('inspector-status-badge');
    if (statusBadge) {
      const isActive = dossier.status === 'ACTIVE';
      statusBadge.innerText = isActive ? 'ACTIVE IN SECTOR' : 'DEPARTED (OUT OF VIEW)';
      statusBadge.className = isActive 
        ? 'font-data-mono text-[9px] px-2 py-0.5 rounded bg-green-950 text-green-300 border border-green-500/40 font-bold animate-pulse'
        : 'font-data-mono text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-600 font-bold';
    }

    const photoEl = document.getElementById('inspector-photo');
    if (photoEl) photoEl.src = dossier.photo;

    // Biometrics
    const bio = dossier.biometrics || {};
    document.getElementById('inspector-height-val').innerText = bio.estHeight || '~5\'10" (178 cm)';
    document.getElementById('inspector-build-val').innerText = `${bio.build || 'Athletic'} / ${bio.heightCategory || 'Average'}`;
    document.getElementById('inspector-face-val').innerText = bio.faceComplexion || 'Fair / Light Complexion';
    document.getElementById('inspector-mask-val').innerText = bio.maskDetected || 'None Detected';

    // Attire
    const attire = dossier.attire || { upper: { name: 'Navy Blue', hex: '#1e3a8a' }, lower: { name: 'Dark Trousers', hex: '#1f2937' } };
    document.getElementById('inspector-upper-text').innerText = attire.upper.name;
    document.getElementById('inspector-upper-dot').style.backgroundColor = attire.upper.hex;
    document.getElementById('inspector-lower-text').innerText = attire.lower.name;
    document.getElementById('inspector-lower-dot').style.backgroundColor = attire.lower.hex;

    // Time-on-Site
    document.getElementById('inspector-first-seen').innerText = `${dossier.firstSeen} UTC`;
    document.getElementById('inspector-last-seen').innerText = `${dossier.lastSeen} UTC`;
    document.getElementById('inspector-total-time').innerText = dossier.durationFormatted || '0m 00s';

    // Summary Report
    document.getElementById('inspector-summary-text').innerText = dossier.summaryReport || this.generateExecutiveSummary(dossier);

    // Carried Items
    const itemsContainer = document.getElementById('inspector-items-container');
    if (itemsContainer) {
      if (dossier.carriedItems && dossier.carriedItems.length > 0) {
        itemsContainer.innerHTML = dossier.carriedItems.map(item => `
          <div class="px-2.5 py-1 rounded ${item.isSuspicious ? 'bg-red-950/80 border border-red-500/60 text-red-300 animate-pulse' : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300'} font-data-mono text-xs flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">${item.isSuspicious ? 'warning' : 'inventory_2'}</span>
            <span class="font-bold">${item.item}</span>
            <span class="text-[10px] text-gray-400 font-normal">[Spotted: ${item.firstSeen}]</span>
          </div>
        `).join('');
      } else {
        itemsContainer.innerHTML = '<span class="text-xs font-data-mono text-gray-400">No objects or carried items observed in hand during surveillance.</span>';
      }
    }

    // Social Interactions
    const interactionsContainer = document.getElementById('inspector-interactions-container');
    if (interactionsContainer) {
      if (dossier.interactions && dossier.interactions.length > 0) {
        interactionsContainer.innerHTML = dossier.interactions.map(int => `
          <div class="bg-[#17202e] border border-emerald-500/30 rounded p-2 flex items-center justify-between font-data-mono text-xs text-gray-300">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-sm">forum</span>
              <span>Talking with: <strong class="text-emerald-300">${int.targetName}</strong></span>
            </div>
            <span class="text-[10px] text-cyan-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">DURATION: ${int.durationSeconds}s</span>
          </div>
        `).join('');
      } else {
        interactionsContainer.innerHTML = '<span class="text-xs font-data-mono text-gray-400">No close proximity interactions or conversations observed with other individuals.</span>';
      }
    }

    // Chronological Timeline
    const timelineContainer = document.getElementById('inspector-timeline-container');
    if (timelineContainer) {
      const timeline = dossier.activityTimeline || [];
      if (timeline.length > 0) {
        timelineContainer.innerHTML = timeline.map(step => `
          <div class="relative pl-6 pb-2 timeline-item font-data-mono text-xs">
            <div class="timeline-stem absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full ${step.type === 'EXIT' ? 'bg-amber-400' : (step.type === 'ENTRY' ? 'bg-cyan-400' : 'bg-emerald-400')} border-2 border-[#060e1c]"></div>
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-[10px] text-cyan-400 font-bold">${step.time} UTC</span>
              <span class="text-[9px] px-1 rounded ${step.type === 'ITEM' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'bg-gray-800 text-gray-400'}">${step.type}</span>
            </div>
            <p class="text-gray-300 font-sans text-xs">${step.event}</p>
          </div>
        `).join('');
      } else {
        timelineContainer.innerHTML = '<span class="text-xs font-data-mono text-gray-400">No activity events recorded.</span>';
      }
    }
  }

  whitelistFromUnknown(id) {
    const dossier = this.unknownDatabase.find(d => d.id === id);
    if (!dossier) return;

    const newPerson = {
      id: `WL-${Math.floor(100 + Math.random() * 900)}`,
      name: `Whitelisted Person (${dossier.id})`,
      role: 'Staff / Visitor - Security Cleared',
      enrolledAt: new Date().toLocaleDateString(),
      photo: dossier.photo || this.createAvatarDataUrl('#00ff9d', 'WL'),
      signature: { r: 120, g: 140, b: 160, brightness: 120, aspect: 0.85 }
    };

    this.whitelist.unshift(newPerson);
    this.saveWhitelist();
    this.renderWhitelistCards();
    this.playBeep('friendly');
    this.addAlert(`Subject [${dossier.id}] officially enrolled into Personnel Whitelist.`, 'INFO', 'WHITELIST', 100);

    const inspectorModal = document.getElementById('dossier-inspector-modal');
    if (inspectorModal) inspectorModal.classList.add('hidden');
  }

  deleteUnknownDossier(id) {
    const idx = this.unknownDatabase.findIndex(d => d.id === id);
    if (idx >= 0) {
      this.unknownDatabase.splice(idx, 1);
      this.saveUnknownDB();
      this.renderUnknownGrid();
      this.addAlert(`Dossier record [${id}] purged from local database.`, 'INFO', 'STORAGE', 100);
    }
  }

  exportUnknownJSON() {
    const dataStr = JSON.stringify(this.unknownDatabase, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-unknown-activity-dossiers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.addAlert('Unknown Subject Dossiers exported to JSON', 'INFO', 'STORAGE', 100);
  }

  exportUnknownCSV() {
    const headers = ['ID', 'Status', 'First Spotted', 'Last Seen', 'Total Time Spent (s)', 'Height', 'Build', 'Complexion', 'Upper Attire', 'Lower Attire', 'Carried Items', 'Interacted With', 'Summary Report'];
    const rows = this.unknownDatabase.map(d => {
      const carried = (d.carriedItems || []).map(i => i.item).join('; ');
      const inter = (d.interactions || []).map(i => `${i.targetName} (${i.durationSeconds}s)`).join('; ');
      const bio = d.biometrics || {};
      const attire = d.attire || { upper: {}, lower: {} };

      return [
        `"${d.id}"`,
        `"${d.status}"`,
        `"${d.firstSeen}"`,
        `"${d.lastSeen}"`,
        `"${d.durationSeconds || 0}"`,
        `"${bio.estHeight || ''}"`,
        `"${bio.build || ''}"`,
        `"${bio.faceComplexion || ''}"`,
        `"${attire.upper ? attire.upper.name : ''}"`,
        `"${attire.lower ? attire.lower.name : ''}"`,
        `"${carried}"`,
        `"${inter}"`,
        `"${(d.summaryReport || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-unknown-activity-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.addAlert('Unknown Subject Activities exported to CSV spreadsheet', 'INFO', 'STORAGE', 100);
  }

  // ----------------------------------------------------
  // WHITELIST MODAL & PERSONNEL MANAGEMENT UI
  // ----------------------------------------------------

  renderWhitelistCards() {
    const container = document.getElementById('whitelist-cards-container');
    if (!container) return;

    if (this.whitelist.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-gray-400 border border-dashed border-green-500/20 rounded">
          <span class="material-symbols-outlined text-3xl mb-1 text-green-400/50">person_off</span>
          <p class="font-data-mono text-xs">No authorized personnel registered.</p>
          <p class="text-[11px] text-gray-500 mt-1">Use the camera capture on the left to feed non-intruders.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.whitelist.map((p, idx) => `
      <div class="bg-[#17202e]/80 border border-green-500/30 rounded p-3 flex items-center justify-between gap-3 relative overflow-hidden group hover:border-green-400 transition-all">
        <div class="flex items-center gap-3">
          <img src="${p.photo}" class="w-12 h-12 rounded border border-green-400/50 object-cover bg-black" />
          <div class="flex flex-col font-data-mono">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-green-300">${p.name}</span>
              <span class="text-[9px] bg-green-950 text-green-400 px-1.5 py-0.5 rounded border border-green-500/40">AUTHORIZED</span>
            </div>
            <span class="text-[11px] text-gray-400 font-sans">${p.role}</span>
            <span class="text-[9px] text-gray-500">ID: ${p.id} | ENROLLED: ${p.enrolledAt}</span>
          </div>
        </div>
        <div>
          <button data-idx="${idx}" class="remove-whitelist-btn px-2 py-1 text-[10px] font-data-mono text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/30 rounded transition-all">
            REVOKE
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.remove-whitelist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.removeWhitelistPerson(idx);
      });
    });
  }

  captureFaceToPreview() {
    const previewCanvas = document.getElementById('enroll-preview-canvas');
    const emptyHint = document.getElementById('enroll-empty-hint');
    if (!previewCanvas || !this.video || this.video.readyState !== 4) return;

    previewCanvas.width = 320;
    previewCanvas.height = 240;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.drawImage(this.video, 0, 0, 320, 240);

    pCtx.strokeStyle = '#00ff9d';
    pCtx.lineWidth = 2;
    pCtx.strokeRect(80, 40, 160, 160);

    this.stagedEnrollPhoto = previewCanvas.toDataURL('image/jpeg', 0.85);
    if (emptyHint) emptyHint.classList.add('hidden');
    this.playBeep('ping');
  }

  registerStagedPerson() {
    const nameInput = document.getElementById('enroll-name-input');
    const roleInput = document.getElementById('enroll-role-input');

    const name = nameInput ? nameInput.value.trim() : 'Authorized Personnel';
    const role = roleInput ? roleInput.value.trim() : 'Operator - Cleared';

    if (!this.stagedEnrollPhoto) {
      this.captureFaceToPreview();
    }

    const newPerson = {
      id: `WL-00${this.whitelist.length + 1}`,
      name: name || 'Authorized Operator',
      role: role || 'Security Cleared',
      enrolledAt: new Date().toLocaleDateString(),
      photo: this.stagedEnrollPhoto || this.createAvatarDataUrl('#00ff9d', 'OK'),
      signature: { r: 120, g: 140, b: 160, brightness: 120, aspect: 0.85 }
    };

    this.whitelist.unshift(newPerson);
    this.saveWhitelist();
    this.renderWhitelistCards();
    this.playBeep('friendly');
    this.addAlert(`New Authorized Personnel Registered: [${newPerson.name}]`, 'INFO', 'WHITELIST', 100);

    const modal = document.getElementById('whitelist-modal');
    if (modal) modal.classList.add('hidden');
  }

  removeWhitelistPerson(index) {
    if (index >= 0 && index < this.whitelist.length) {
      const removed = this.whitelist.splice(index, 1)[0];
      this.saveWhitelist();
      this.renderWhitelistCards();
      this.addAlert(`Personnel Access Revoked: [${removed.name}]`, 'WARNING', 'WHITELIST', 100);
    }
  }

  // ----------------------------------------------------
  // CRIMINAL DATABASE MODAL & WANTED LIST UI
  // ----------------------------------------------------

  renderCriminalGrid(filter = 'ALL', search = '') {
    const container = document.getElementById('criminal-grid-container');
    if (!container) return;

    let list = this.criminalDatabase;

    if (filter === 'CRITICAL') {
      list = list.filter(c => c.threat === 'CRITICAL');
    } else if (filter === 'HIGH') {
      list = list.filter(c => c.threat === 'HIGH');
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.offenses.toLowerCase().includes(q) || c.alias.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-gray-400 border border-dashed border-red-500/30 rounded">
          <span class="material-symbols-outlined text-3xl mb-1 text-red-400/50">search_off</span>
          <p class="font-data-mono text-xs">No matching criminal records found in database.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(c => {
      const isSimulating = this.simulatedWantedSuspectId === c.id;
      return `
        <div class="bg-[#17202e]/90 border ${isSimulating ? 'border-red-400 glow-red' : 'border-red-500/30'} rounded-lg p-3.5 flex flex-col justify-between gap-3 relative overflow-hidden transition-all">
          <div class="flex items-start justify-between gap-2 border-b border-red-500/20 pb-2">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded border border-red-400/60 bg-red-950/60 flex items-center justify-center font-bold text-sm text-red-300 font-display-lg">
                ${c.avatarInitials || 'CR'}
              </div>
              <div>
                <h4 class="font-display-lg text-xs font-bold text-red-300">${c.name}</h4>
                <span class="font-data-mono text-[10px] text-gray-400">ALIAS: "${c.alias}"</span>
              </div>
            </div>
            <span class="font-data-mono text-[9px] px-1.5 py-0.5 rounded ${c.threat === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse' : 'bg-amber-950 text-amber-400 border border-amber-500/40'} font-bold">
              ${c.threatBadge}
            </span>
          </div>

          <div class="font-data-mono text-[11px] space-y-1 text-gray-300">
            <p><span class="text-gray-500 text-[10px]">WANTED FOR:</span> ${c.offenses}</p>
            <p><span class="text-gray-500 text-[10px]">AGENCY:</span> ${c.wantedBy}</p>
            <p><span class="text-gray-500 text-[10px]">SUSPECT ID:</span> ${c.id}</p>
          </div>

          <div class="pt-2 border-t border-red-500/20 flex gap-2">
            <button data-id="${c.id}" class="simulate-match-btn flex-1 py-1.5 text-[10px] font-data-mono font-bold rounded ${isSimulating ? 'bg-red-600 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40'} transition-all flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-xs">${isSimulating ? 'stop_circle' : 'radar'}</span>
              <span>${isSimulating ? 'STOP SIMULATION' : 'SIMULATE MATCH'}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.simulate-match-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.toggleSimulatedWantedMatch(id);
      });
    });
  }

  toggleSimulatedWantedMatch(id) {
    if (this.simulatedWantedSuspectId === id) {
      this.simulatedWantedSuspectId = null;
      this.addAlert('Criminal database simulation disengaged. Normal surveillance restored.', 'INFO', 'SYSTEM', 100);
    } else {
      this.simulatedWantedSuspectId = id;
      const suspect = this.criminalDatabase.find(c => c.id === id);
      this.addAlert(`SIMULATION ACTIVE: Target lock assigned to fugitive [${suspect ? suspect.name : id}]`, 'CRITICAL', 'POLICE-DB', 99);
      this.playBeep('critical');
    }
    this.renderCriminalGrid();
  }

  // ----------------------------------------------------
  // GENERAL UI SETUP & EVENT LISTENERS
  // ----------------------------------------------------

  setupUI() {
    // Lockdown button
    const lockdownBtn = document.getElementById('lockdown-btn');
    if (lockdownBtn) {
      lockdownBtn.addEventListener('click', () => this.toggleLockdown());
    }

    // Vision mode buttons
    document.querySelectorAll('.vision-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setVisionMode(e.target.dataset.mode);
      });
    });

    // HUD Mode buttons (Minimal, Tactical, Off)
    document.querySelectorAll('.hud-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setHudMode(e.currentTarget.dataset.hudMode);
      });
    });

    // Toggle Target Card button
    const toggleCardBtn = document.getElementById('toggle-target-card-btn');
    if (toggleCardBtn) {
      toggleCardBtn.addEventListener('click', () => this.toggleTargetCard());
    }

    // Minimize Target Card inside header
    const minimizeCardBtn = document.getElementById('minimize-target-card-btn');
    const cardBody = document.getElementById('target-card-body');
    if (minimizeCardBtn && cardBody) {
      minimizeCardBtn.addEventListener('click', () => {
        this.isTargetCardMinimized = !this.isTargetCardMinimized;
        cardBody.classList.toggle('hidden', this.isTargetCardMinimized);
        minimizeCardBtn.innerText = this.isTargetCardMinimized ? '+' : '─';
      });
    }

    // Toggle Scanlines button
    const toggleScanlinesBtn = document.getElementById('toggle-scanlines-btn');
    if (toggleScanlinesBtn) {
      toggleScanlinesBtn.addEventListener('click', () => this.toggleScanlines());
    }

    // Sound toggle button
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundBtn.innerHTML = this.soundEnabled 
          ? '<span class="material-symbols-outlined text-sm">volume_up</span>' 
          : '<span class="material-symbols-outlined text-sm text-red-400">volume_off</span>';
        this.addAlert(`Tactical audio alerts ${this.soundEnabled ? 'ENABLED' : 'MUTED'}`, 'INFO', 'AUDIO', 100);
      });
    }

    // Snapshot button
    const snapBtn = document.getElementById('snapshot-btn');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        this.takeSnapshot();
      });
    }

    // Quick Feed as Friendly Button
    const quickEnrollBtn = document.getElementById('quick-enroll-btn');
    if (quickEnrollBtn) {
      quickEnrollBtn.addEventListener('click', () => {
        this.captureFaceToPreview();
        this.registerStagedPerson();
      });
    }

    // Modals
    const whitelistModal = document.getElementById('whitelist-modal');
    const criminalModal = document.getElementById('criminal-modal');
    const unknownModal = document.getElementById('unknown-modal');
    const inspectorModal = document.getElementById('dossier-inspector-modal');

    const openWhitelist = () => {
      if (whitelistModal) {
        whitelistModal.classList.remove('hidden');
        this.captureFaceToPreview();
        this.renderWhitelistCards();
      }
    };

    const openCriminal = () => {
      if (criminalModal) {
        criminalModal.classList.remove('hidden');
        this.renderCriminalGrid();
      }
    };

    const openUnknown = () => {
      if (unknownModal) {
        unknownModal.classList.remove('hidden');
        this.renderUnknownGrid();
      }
    };

    const navWlBtn = document.getElementById('nav-whitelist-btn');
    const sideWlBtn = document.getElementById('side-whitelist-btn');
    if (navWlBtn) navWlBtn.addEventListener('click', openWhitelist);
    if (sideWlBtn) sideWlBtn.addEventListener('click', openWhitelist);

    const navCrBtn = document.getElementById('nav-criminal-btn');
    const sideCrBtn = document.getElementById('side-criminal-btn');
    if (navCrBtn) navCrBtn.addEventListener('click', openCriminal);
    if (sideCrBtn) sideCrBtn.addEventListener('click', openCriminal);

    const navUnkBtn = document.getElementById('nav-unknown-btn');
    const sideUnkBtn = document.getElementById('side-unknown-btn');
    const counterUnkCard = document.getElementById('counter-unknown-card');
    if (navUnkBtn) navUnkBtn.addEventListener('click', openUnknown);
    if (sideUnkBtn) sideUnkBtn.addEventListener('click', openUnknown);
    if (counterUnkCard) counterUnkCard.addEventListener('click', openUnknown);

    const closeWlBtn = document.getElementById('close-whitelist-btn');
    if (closeWlBtn && whitelistModal) closeWlBtn.addEventListener('click', () => whitelistModal.classList.add('hidden'));

    const closeCrBtn = document.getElementById('close-criminal-btn');
    if (closeCrBtn && criminalModal) closeCrBtn.addEventListener('click', () => criminalModal.classList.add('hidden'));

    const closeUnkBtn = document.getElementById('close-unknown-btn');
    if (closeUnkBtn && unknownModal) closeUnkBtn.addEventListener('click', () => unknownModal.classList.add('hidden'));

    const closeInspBtn = document.getElementById('close-inspector-btn');
    if (closeInspBtn && inspectorModal) closeInspBtn.addEventListener('click', () => inspectorModal.classList.add('hidden'));

    // Whitelist Actions
    const captureEnrollBtn = document.getElementById('capture-enroll-btn');
    if (captureEnrollBtn) captureEnrollBtn.addEventListener('click', () => this.captureFaceToPreview());

    const saveEnrollBtn = document.getElementById('save-enroll-btn');
    if (saveEnrollBtn) saveEnrollBtn.addEventListener('click', () => this.registerStagedPerson());

    const clearWlBtn = document.getElementById('clear-whitelist-btn');
    if (clearWlBtn) clearWlBtn.addEventListener('click', () => {
      this.initDefaultWhitelist();
      this.renderWhitelistCards();
    });

    // Unknown Search & Filters
    const unkSearch = document.getElementById('unknown-search-input');
    if (unkSearch) {
      unkSearch.addEventListener('input', (e) => {
        this.renderUnknownGrid('ALL', e.target.value);
      });
    }

    document.querySelectorAll('.unknown-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.unknown-filter-btn').forEach(b => {
          b.className = 'unknown-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
        });
        e.target.className = 'unknown-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-amber-500/30 text-amber-300 border border-amber-400/40';
        this.renderUnknownGrid(e.target.dataset.filter);
      });
    });

    const exportJsonBtn = document.getElementById('export-unknown-json-btn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportUnknownJSON());

    const exportCsvBtn = document.getElementById('export-unknown-csv-btn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportUnknownCSV());

    const clearUnkBtn = document.getElementById('clear-unknown-db-btn');
    if (clearUnkBtn) {
      clearUnkBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to purge all unknown subject dossiers and activity history?')) {
          this.unknownDatabase = [];
          this.saveUnknownDB();
          this.renderUnknownGrid();
          this.addAlert('Unknown Subject Dossier database purged.', 'WARNING', 'STORAGE', 100);
        }
      });
    }

    // Inspector Action Buttons
    const printBtn = document.getElementById('inspector-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const inspWhitelistBtn = document.getElementById('inspector-whitelist-btn');
    if (inspWhitelistBtn) {
      inspWhitelistBtn.addEventListener('click', () => {
        if (this.activeInspectedDossierId) {
          this.whitelistFromUnknown(this.activeInspectedDossierId);
        }
      });
    }

    // Criminal Search & Filters
    const crimeSearch = document.getElementById('criminal-search-input');
    if (crimeSearch) {
      crimeSearch.addEventListener('input', (e) => {
        this.renderCriminalGrid('ALL', e.target.value);
      });
    }

    document.querySelectorAll('.crime-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.crime-filter-btn').forEach(b => {
          b.className = 'crime-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10';
        });
        e.target.className = 'crime-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-red-500/30 text-red-300 border border-red-400/40';
        this.renderCriminalGrid(e.target.dataset.filter);
      });
    });
  }

  takeSnapshot() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.video.videoWidth || 1280;
    tempCanvas.height = this.video.videoHeight || 720;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const a = document.createElement('a');
    a.download = `sentinel-capture-${Date.now()}.png`;
    a.href = tempCanvas.toDataURL('image/png');
    a.click();

    this.playBeep('ping');
    this.addAlert('Tactical frame snapshot archived to local storage', 'INFO', 'STORAGE', 100);
  }

  startSimulatedFeed() {
    const ctx = this.ctx;
    let scanY = 0;
    const drawSim = () => {
      if (this.video.readyState !== 4) {
        ctx.fillStyle = '#060e1c';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        scanY = (scanY + 2) % this.canvas.height;
        ctx.moveTo(0, scanY);
        ctx.lineTo(this.canvas.width, scanY);
        ctx.stroke();

        ctx.fillStyle = '#00e5ff';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText('[SIMULATED NIGHT PATROL SENSOR - AI RUNNING]', 20, 30);
      }
      requestAnimationFrame(drawSim);
    };
    drawSim();
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.sentinel = new SentinelEngine();
});
