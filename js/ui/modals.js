// UI Modal Views & Tactical Dialog Manager
export class ModalController {
  constructor(dbService, audioService, visionEngine, nvidiaService, onWhitelistUpdated, onUnknownUpdated, onNvidiaStatusChanged) {
    this.db = dbService;
    this.audio = audioService;
    this.vision = visionEngine;
    this.nvidia = nvidiaService;
    this.onWhitelistUpdated = onWhitelistUpdated;
    this.onUnknownUpdated = onUnknownUpdated;
    this.onNvidiaStatusChanged = onNvidiaStatusChanged;
    this.activeInspectorId = null;
    this.currentInterrogateFrame = null;
    this.activeDeepDiveFeed = 'POST 4 - ALPHA';
    this.bindEvents();
    this.updateNvidiaUI();
  }

  bindEvents() {
    // Navigation bar buttons
    document.getElementById('nav-operations-btn')?.addEventListener('click', () => this.openIncidentPanel());
    document.getElementById('side-operations-btn')?.addEventListener('click', () => this.openIncidentPanel());
    document.getElementById('close-incident-btn')?.addEventListener('click', () => this.close('incident-intelligence-modal'));
    document.getElementById('counter-intrusions-card')?.addEventListener('click', () => this.openIncidentPanel());
    document.getElementById('dispatch-guard-btn')?.addEventListener('click', () => this.dispatchGuardPost());

    // Watchlist Match Verification (Drill / Match from Stitch 5f434c2373404c8fbc6ab08ed996e7b9)
    document.getElementById('side-intercept-btn')?.addEventListener('click', () => this.openWatchlistMatchModal());
    document.getElementById('counter-watchlist-card')?.addEventListener('click', () => this.openWatchlistMatchModal());
    document.getElementById('close-watchlist-match-btn')?.addEventListener('click', () => this.close('watchlist-match-modal'));
    document.getElementById('dismiss-match-btn')?.addEventListener('click', () => this.dismissMatch());
    document.getElementById('confirm-match-btn')?.addEventListener('click', () => this.confirmMatchAndEscalate());

    // Camera Deep-Dive (SEC-07A from Stitch ff6e17d9eb204220baa80fd60d5a8947)
    document.getElementById('aux-feed-1')?.addEventListener('click', () => this.openCameraDeepDive('POST 4 - ALPHA'));
    document.getElementById('aux-feed-2')?.addEventListener('click', () => this.openCameraDeepDive('POST 7 - BETA'));
    document.getElementById('aux-feed-3')?.addEventListener('click', () => this.openCameraDeepDive('DRONE SECTOR 9'));
    document.getElementById('close-deepdive-btn')?.addEventListener('click', () => this.close('camera-deepdive-modal'));
    document.getElementById('map-deepdive-btn')?.addEventListener('click', () => this.openCameraDeepDive('POST 4 - ALPHA'));
    document.getElementById('deepdive-make-primary-btn')?.addEventListener('click', () => {
      this.showToast('Optics Re-Routed', `Active Primary Stream set to ${this.activeDeepDiveFeed}`, 'success');
      this.close('camera-deepdive-modal');
    });

    // Interactive Map Pins
    document.getElementById('pin-p1')?.addEventListener('click', () => {
      this.showToast('Sector Switched', 'Viewing Primary Live Camera (Post 1)', 'info');
      this.audio.play('click');
    });
    document.getElementById('pin-p4')?.addEventListener('click', () => this.openCameraDeepDive('POST 4 - ALPHA'));
    document.getElementById('pin-p7')?.addEventListener('click', () => this.openCameraDeepDive('POST 7 - BETA'));
    document.getElementById('pin-p9')?.addEventListener('click', () => this.openCameraDeepDive('DRONE SECTOR 9'));

    // Deep-dive filter buttons
    document.querySelectorAll('.deepdive-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        const img = document.getElementById('deepdive-stream-img');
        if (img) {
          img.className = `w-full h-full object-cover vision-${filter}`;
        }
        document.querySelectorAll('.deepdive-filter-btn').forEach(b => {
          b.className = (b.dataset.filter === filter)
            ? 'deepdive-filter-btn px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
            : 'deepdive-filter-btn px-2 py-1 rounded bg-black/40 text-gray-400 border border-white/10 hover:text-white';
        });
        this.audio.play('click');
      });
    });

    // PTZ buttons
    document.querySelectorAll('.ptz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.play('click');
        this.showToast('PTZ Vector', 'Camera pan/tilt motors calibrated', 'info');
      });
    });

    // Multi-Camera Grid Matrix
    document.getElementById('side-cameras-btn')?.addEventListener('click', () => this.openCameraMatrix());
    document.getElementById('close-matrix-btn')?.addEventListener('click', () => this.close('camera-matrix-modal'));

    // Sensors Telemetry
    document.getElementById('side-sensors-btn')?.addEventListener('click', () => this.openSensors());
    document.getElementById('close-sensors-btn')?.addEventListener('click', () => this.close('sensor-telemetry-modal'));

    // Analytics Modal
    document.getElementById('nav-analytics-btn')?.addEventListener('click', () => this.openAnalytics());
    document.getElementById('close-analytics-btn')?.addEventListener('click', () => this.close('analytics-modal'));

    // System Health Modal
    document.getElementById('side-health-btn')?.addEventListener('click', () => this.openHealth());
    document.getElementById('close-health-btn')?.addEventListener('click', () => this.close('health-modal'));

    // Settings Modal
    document.getElementById('nav-settings-btn')?.addEventListener('click', () => this.openSettings());
    document.getElementById('close-settings-btn')?.addEventListener('click', () => this.close('settings-modal'));
    document.getElementById('setting-audio-toggle')?.addEventListener('click', (e) => {
      this.audio.soundEnabled = !this.audio.soundEnabled;
      e.target.innerText = this.audio.soundEnabled ? 'ENABLED' : 'MUTED';
      e.target.className = this.audio.soundEnabled 
        ? 'px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/40 rounded font-bold'
        : 'px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded font-bold';
      this.showToast('Audio Settings', `Tactical Audio ${this.audio.soundEnabled ? 'Enabled' : 'Muted'}`, 'info');
    });

    // Duty Schedule Modal
    document.getElementById('nav-schedule-btn')?.addEventListener('click', () => this.openSchedule());
    document.getElementById('close-schedule-btn')?.addEventListener('click', () => this.close('schedule-modal'));

    // Operator Manual & Help
    document.getElementById('side-help-btn')?.addEventListener('click', () => this.openHelp());
    document.getElementById('close-help-btn')?.addEventListener('click', () => this.close('help-modal'));

    // Terminal Logs
    document.getElementById('side-logs-btn')?.addEventListener('click', () => this.openTerminalLogs());
    document.getElementById('close-terminal-logs-btn')?.addEventListener('click', () => this.close('terminal-logs-modal'));

    // Notifications Center Drawer
    document.getElementById('nav-notifications-btn')?.addEventListener('click', () => this.toggleNotificationsDrawer());
    document.getElementById('close-notifications-drawer-btn')?.addEventListener('click', () => this.closeNotificationsDrawer());

    // Whitelist buttons
    document.getElementById('nav-whitelist-btn')?.addEventListener('click', () => this.openWhitelist());
    document.getElementById('side-whitelist-btn')?.addEventListener('click', () => this.openWhitelist());
    document.getElementById('close-whitelist-btn')?.addEventListener('click', () => this.close('whitelist-modal'));

    // Criminal buttons
    document.getElementById('nav-criminal-btn')?.addEventListener('click', () => this.openCriminals());
    document.getElementById('side-criminal-btn')?.addEventListener('click', () => this.openCriminals());
    document.getElementById('close-criminal-btn')?.addEventListener('click', () => this.close('criminal-modal'));

    // Unknown buttons
    document.getElementById('nav-unknown-btn')?.addEventListener('click', () => this.openUnknowns());
    document.getElementById('side-unknown-btn')?.addEventListener('click', () => this.openUnknowns());
    document.getElementById('counter-unknown-card')?.addEventListener('click', () => this.openUnknowns());
    document.getElementById('close-unknown-btn')?.addEventListener('click', () => this.close('unknown-modal'));
    document.getElementById('close-inspector-btn')?.addEventListener('click', () => this.close('dossier-inspector-modal'));

    // NVIDIA NIM buttons
    document.getElementById('nav-nvidia-btn')?.addEventListener('click', () => this.openNvidiaModal());
    document.getElementById('side-nvidia-btn')?.addEventListener('click', () => this.openNvidiaModal());
    document.getElementById('close-nvidia-btn')?.addEventListener('click', () => this.close('nvidia-modal'));
    document.getElementById('nvidia-save-btn')?.addEventListener('click', () => this.saveNvidiaConfig());
    document.getElementById('nvidia-clear-btn')?.addEventListener('click', () => this.clearNvidiaConfig());
    document.getElementById('nvidia-test-btn')?.addEventListener('click', () => this.testNvidiaConnection());
    document.getElementById('nvidia-toggle-key-visibility')?.addEventListener('click', () => this.toggleKeyVisibility());

    // Live Interrogation buttons
    document.getElementById('interrogate-scene-btn')?.addEventListener('click', () => this.openInterrogateModal());
    document.getElementById('close-interrogate-btn')?.addEventListener('click', () => this.close('scene-interrogate-modal'));
    document.getElementById('interrogate-refresh-frame-btn')?.addEventListener('click', () => this.captureLiveInterrogateFrame());
    document.getElementById('interrogate-execute-btn')?.addEventListener('click', () => this.executeSceneInterrogation());

    document.querySelectorAll('.interrogate-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const promptInput = document.getElementById('interrogate-prompt-input');
        if (promptInput) {
          promptInput.value = e.target.dataset.prompt;
          this.executeSceneInterrogation();
        }
      });
    });

    // Whitelist Form
    document.getElementById('capture-enroll-btn')?.addEventListener('click', () => this.captureFacePreview());
    document.getElementById('save-enroll-btn')?.addEventListener('click', () => this.registerWhitelistUser());
    document.getElementById('clear-whitelist-btn')?.addEventListener('click', () => {
      this.db.whitelist = [{ id: 'WL-001', name: 'Commander / Operator (Me)', role: 'Chief Security Director - Cleared', enrolledAt: new Date().toLocaleDateString(), photo: this.db.createAvatarDataUrl('#00ff9d', 'CMD') }];
      this.db.saveWhitelist();
      this.renderWhitelist();
      if (this.onWhitelistUpdated) this.onWhitelistUpdated();
      this.showToast('Whitelist Reset', 'Restored default authorized personnel registry', 'info');
    });

    // Unknown search & filters
    document.getElementById('unknown-search-input')?.addEventListener('input', (e) => this.renderUnknowns('ALL', e.target.value));
    document.querySelectorAll('.unknown-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.unknown-filter-btn').forEach(b => b.className = 'unknown-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10');
        e.target.className = 'unknown-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-amber-500/30 text-amber-300 border border-amber-400/40';
        this.renderUnknowns(e.target.dataset.filter);
      });
    });

    document.getElementById('export-unknown-json-btn')?.addEventListener('click', () => {
      this.db.exportUnknownJSON();
      this.showToast('Export Ready', 'Exported dossiers as JSON archive', 'success');
    });
    document.getElementById('export-unknown-csv-btn')?.addEventListener('click', () => {
      this.db.exportUnknownCSV();
      this.showToast('Export Ready', 'Exported dossiers as CSV spreadsheet', 'success');
    });
    document.getElementById('clear-unknown-db-btn')?.addEventListener('click', () => {
      if (confirm('Purge all unknown subject dossiers?')) {
        this.db.unknowns = [];
        this.db.saveUnknowns();
        this.renderUnknowns();
        if (this.onUnknownUpdated) this.onUnknownUpdated();
        this.showToast('Database Purged', 'Cleared all logged unknown records', 'info');
      }
    });

    // Inspector buttons
    document.getElementById('inspector-print-btn')?.addEventListener('click', () => window.print());
    document.getElementById('inspector-whitelist-btn')?.addEventListener('click', () => {
      if (this.activeInspectorId) this.whitelistUnknown(this.activeInspectorId);
    });
    document.getElementById('inspector-nvidia-btn')?.addEventListener('click', () => this.runInspectorNvidiaScan());

    // Criminal search & filters
    document.getElementById('criminal-search-input')?.addEventListener('input', (e) => this.renderCriminals('ALL', e.target.value));
    document.querySelectorAll('.crime-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.crime-filter-btn').forEach(b => b.className = 'crime-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-black/40 text-gray-400 hover:text-white border border-white/10');
        e.target.className = 'crime-filter-btn px-2.5 py-1 text-[10px] font-mono rounded bg-red-500/30 text-red-300 border border-red-400/40';
        this.renderCriminals(e.target.dataset.filter);
      });
    });
  }

  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      this.audio.play('click');
    }
  }

  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const borderCol = type === 'critical' ? 'border-red-500 bg-red-950/90 text-red-100' : (type === 'success' ? 'border-green-500 bg-[#061e16]/90 text-green-100' : 'border-cyan-500 bg-[#061426]/90 text-cyan-100');

    toast.className = `pointer-events-auto border ${borderCol} p-3 rounded-lg shadow-xl font-data-mono text-xs max-w-sm flex items-start gap-2.5 backdrop-blur-md animate-fade-in`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-base mt-0.5">${type === 'critical' ? 'warning' : (type === 'success' ? 'check_circle' : 'info')}</span>
      <div class="flex-1">
        <span class="font-bold block">${title}</span>
        <span class="text-[11px] opacity-90">${message}</span>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  openIncidentPanel() {
    this.open('incident-intelligence-modal');
    // Refresh timeline timestamps
    const now = new Date();
    ['ekg-time-1', 'ekg-time-2', 'ekg-time-3', 'ekg-time-4'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) {
        const d = new Date(now.getTime() - (4 - i) * 20000);
        el.innerText = d.toISOString().substring(11, 19);
      }
    });
  }

  dispatchGuardPost() {
    this.audio.play('radio');
    this.showToast('SECURITY DISPATCHED', 'Nearest Sector Response Unit notified via tactical radio encrypted relay.', 'critical');
    const btn = document.getElementById('dispatch-guard-btn');
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-outlined text-base">check</span> <span>DISPATCH CONFIRMED (SECTOR ALPHA)</span>';
      btn.className = 'px-8 py-3 bg-green-600 text-white font-label-caps text-xs uppercase tracking-wider font-bold rounded-lg flex items-center gap-2 transition-all';
      setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined text-base">local_police</span> <span>NOTIFY NEAREST GUARD POST</span>';
        btn.className = 'px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-label-caps text-xs uppercase tracking-wider font-bold rounded-lg flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,69,58,0.4)]';
      }, 4000);
    }
  }

  openWatchlistMatchModal() {
    this.open('watchlist-match-modal');
    const liveImg = document.getElementById('match-live-preview-img');
    const knownImg = document.getElementById('match-known-photo');
    
    // Grab live frame or fallback
    const video = document.getElementById('webcam-video');
    if (video && video.readyState === 4 && liveImg) {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 240;
      c.getContext('2d').drawImage(video, 0, 0, 320, 240);
      liveImg.src = c.toDataURL('image/jpeg', 0.85);
    } else if (liveImg) {
      liveImg.src = this.db.createAvatarDataUrl('#00e5ff', 'TGT');
    }

    if (knownImg) {
      const wanted = this.db.criminals[0];
      knownImg.src = wanted ? wanted.photo : this.db.createAvatarDataUrl('#ff453a', 'WNT');
    }
  }

  dismissMatch() {
    this.close('watchlist-match-modal');
    this.audio.play('click');
    this.showToast('Match Dismissed', 'Incident record updated: False positive dismissed by operator.', 'info');
  }

  confirmMatchAndEscalate() {
    this.close('watchlist-match-modal');
    this.audio.play('critical');
    this.showToast('CRITICAL ESCALATION', 'Fugitive record confirmed. Automated sector lockdown & alert dispatches active.', 'critical');
  }

  openCameraDeepDive(feedName = 'POST 4 - ALPHA') {
    this.activeDeepDiveFeed = feedName;
    this.open('camera-deepdive-modal');
    
    const title = document.getElementById('deepdive-camera-title');
    const feedText = document.getElementById('deepdive-feed-name');
    const streamImg = document.getElementById('deepdive-stream-img');

    if (title) title.innerText = `OPTICAL DEEP-DIVE: ${feedName}`;
    if (feedText) feedText.innerText = `${feedName} (1080P/60FPS HDR)`;

    // Create high-res simulated feed preview
    if (streamImg) {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 360;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#060e1c';
      ctx.fillRect(0, 0, 640, 360);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke(); }
      for (let y = 0; y < 360; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }

      // Target reticle
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(280, 140, 80, 120);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`TARGET #${feedName.includes('7') ? 'B419' : 'A231'} [0.94 CONF]`, 280, 130);

      streamImg.src = c.toDataURL('image/jpeg', 0.9);
    }
  }

  openCameraMatrix() { this.open('camera-matrix-modal'); }
  openSensors() { this.open('sensor-telemetry-modal'); }
  openAnalytics() { this.open('analytics-modal'); }
  openHealth() { this.open('health-modal'); }
  openSettings() { this.open('settings-modal'); }
  openSchedule() { this.open('schedule-modal'); }
  openHelp() { this.open('help-modal'); }
  openTerminalLogs() { this.open('terminal-logs-modal'); }

  toggleNotificationsDrawer() {
    const drawer = document.getElementById('notifications-drawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
      this.audio.play('click');
    }
  }

  closeNotificationsDrawer() {
    const drawer = document.getElementById('notifications-drawer');
    if (drawer) drawer.classList.add('hidden');
  }

  openWhitelist() {
    this.open('whitelist-modal');
    this.captureFacePreview();
    this.renderWhitelist();
  }

  openCriminals() {
    this.open('criminal-modal');
    this.renderCriminals();
  }

  openUnknowns() {
    this.open('unknown-modal');
    this.renderUnknowns();
  }

  openNvidiaModal() {
    const input = document.getElementById('nvidia-api-key-input');
    const select = document.getElementById('nvidia-model-select');
    if (input) input.value = this.nvidia.apiKey || '';
    if (select) select.value = this.nvidia.model || 'meta/llama-3.2-11b-vision-instruct';
    
    const resultBox = document.getElementById('nvidia-test-result-box');
    if (resultBox) resultBox.classList.add('hidden');
    
    this.open('nvidia-modal');
  }

  updateNvidiaUI() {
    const isReady = this.nvidia.isConfigured();
    const pill = document.getElementById('nvidia-status-pill');
    const sideStatus = document.getElementById('side-nvidia-status');
    
    if (pill) {
      pill.innerText = isReady ? 'ONLINE' : 'CONFIG';
      pill.className = isReady ? 'text-[10px] text-emerald-300 font-bold' : 'text-[10px] text-amber-400';
    }
    if (sideStatus) {
      sideStatus.innerText = isReady ? 'NIM ACTIVE' : 'NO KEY';
      sideStatus.className = isReady 
        ? 'font-data-mono text-[10px] bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-500/40' 
        : 'font-data-mono text-[10px] bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/40';
    }
  }

  toggleKeyVisibility() {
    const input = document.getElementById('nvidia-api-key-input');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  saveNvidiaConfig() {
    const input = document.getElementById('nvidia-api-key-input');
    const select = document.getElementById('nvidia-model-select');
    if (input) this.nvidia.setApiKey(input.value);
    if (select) this.nvidia.setModel(select.value);

    this.updateNvidiaUI();
    this.audio.play('friendly');
    
    const resultBox = document.getElementById('nvidia-test-result-box');
    const resultText = document.getElementById('nvidia-test-result-text');
    if (resultBox && resultText) {
      resultBox.classList.remove('hidden');
      resultBox.className = 'p-3 rounded bg-emerald-950/60 border border-emerald-500/50 text-xs';
      resultText.innerText = '✅ NVIDIA NIM Configuration saved successfully to local browser storage.';
    }

    if (this.onNvidiaStatusChanged) this.onNvidiaStatusChanged();
    setTimeout(() => this.close('nvidia-modal'), 1200);
  }

  clearNvidiaConfig() {
    if (confirm('Purge saved NVIDIA API Key from this browser?')) {
      this.nvidia.clearApiKey();
      const input = document.getElementById('nvidia-api-key-input');
      if (input) input.value = '';
      this.updateNvidiaUI();
      const resultBox = document.getElementById('nvidia-test-result-box');
      if (resultBox) resultBox.classList.add('hidden');
      if (this.onNvidiaStatusChanged) this.onNvidiaStatusChanged();
    }
  }

  async testNvidiaConnection() {
    const input = document.getElementById('nvidia-api-key-input');
    const key = input ? input.value : this.nvidia.apiKey;
    const resultBox = document.getElementById('nvidia-test-result-box');
    const resultText = document.getElementById('nvidia-test-result-text');
    const testBtn = document.getElementById('nvidia-test-btn');

    if (!key) {
      alert('Please enter an NVIDIA NIM API key first.');
      return;
    }

    if (testBtn) testBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> <span>TESTING...</span>';
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.className = 'p-3 rounded bg-black/60 border border-cyan-500/40 text-xs';
      resultText.innerText = 'Connecting to NVIDIA NIM Gateway (https://integrate.api.nvidia.com)...';
    }

    try {
      const response = await this.nvidia.testConnection(key);
      if (resultBox && resultText) {
        resultBox.className = 'p-3 rounded bg-emerald-950/60 border border-emerald-500/50 text-xs';
        resultText.innerText = `✅ NVIDIA NIM CONNECTION ACTIVE: "${response.trim()}"`;
      }
      this.audio.play('friendly');
    } catch (err) {
      if (resultBox && resultText) {
        resultBox.className = 'p-3 rounded bg-red-950/60 border border-red-500/50 text-xs';
        resultText.innerText = `❌ Connection Failed: ${err.message}`;
      }
      this.audio.play('alert');
    } finally {
      if (testBtn) testBtn.innerHTML = '<span class="material-symbols-outlined text-sm">wifi_tethering</span> <span>TEST CONNECTION</span>';
    }
  }

  openInterrogateModal() {
    this.open('scene-interrogate-modal');
    this.captureLiveInterrogateFrame();
  }

  captureLiveInterrogateFrame() {
    const video = document.getElementById('webcam-video');
    const imgEl = document.getElementById('interrogate-preview-img');
    if (!video || video.readyState !== 4) return;

    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth || 1280;
      c.height = video.videoHeight || 720;
      const ctx = c.getContext('2d');
      ctx.drawImage(video, 0, 0, c.width, c.height);
      this.currentInterrogateFrame = c.toDataURL('image/jpeg', 0.85);
      if (imgEl) imgEl.src = this.currentInterrogateFrame;
    } catch (e) {
      console.warn('Frame capture error:', e);
    }
  }

  async executeSceneInterrogation() {
    if (!this.currentInterrogateFrame) {
      this.captureLiveInterrogateFrame();
    }
    if (!this.currentInterrogateFrame) {
      alert('No camera stream available to interrogate.');
      return;
    }

    if (!this.nvidia.isConfigured()) {
      this.openNvidiaModal();
      return;
    }

    const promptInput = document.getElementById('interrogate-prompt-input');
    const promptText = promptInput ? promptInput.value.trim() : 'Assess tactical threat level and summarize activity in this sector.';
    const responseBox = document.getElementById('interrogate-response-box');
    const statusBadge = document.getElementById('interrogate-status-badge');
    const executeBtn = document.getElementById('interrogate-execute-btn');
    const executeText = document.getElementById('interrogate-execute-text');

    if (executeText) executeText.innerText = 'PROCESSING...';
    if (executeBtn) executeBtn.disabled = true;
    if (statusBadge) {
      statusBadge.innerText = 'NVIDIA REASONING...';
      statusBadge.className = 'text-[9px] text-emerald-300 font-data-mono animate-pulse';
    }
    if (responseBox) {
      responseBox.innerText = '📡 Streaming multimodal inference from NVIDIA Foundation Model...';
      responseBox.classList.add('ai-scan-running');
    }

    try {
      const reply = await this.nvidia.interrogateScene(this.currentInterrogateFrame, promptText);
      if (responseBox) {
        responseBox.innerText = reply;
        responseBox.classList.remove('ai-scan-running');
      }
      if (statusBadge) {
        statusBadge.innerText = 'COMPLETE';
        statusBadge.className = 'text-[9px] text-emerald-400 font-data-mono font-bold';
      }
      this.audio.play('friendly');
    } catch (err) {
      if (responseBox) {
        responseBox.innerText = `⚠️ NVIDIA NIM Request Error: ${err.message}`;
        responseBox.classList.remove('ai-scan-running');
      }
      if (statusBadge) {
        statusBadge.innerText = 'ERROR';
        statusBadge.className = 'text-[9px] text-red-400 font-data-mono font-bold';
      }
      this.audio.play('alert');
    } finally {
      if (executeText) executeText.innerText = 'ANALYZE';
      if (executeBtn) executeBtn.disabled = false;
    }
  }

  captureFacePreview() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('enroll-preview-canvas');
    if (!canvas || !video || video.readyState !== 4) return;

    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const hint = document.getElementById('enroll-empty-hint');
    if (hint) hint.style.display = 'none';
  }

  registerWhitelistUser() {
    const nameInput = document.getElementById('enroll-name-input');
    const roleInput = document.getElementById('enroll-role-input');
    const canvas = document.getElementById('enroll-preview-canvas');

    const name = nameInput ? nameInput.value.trim() : 'Operator';
    const role = roleInput ? roleInput.value.trim() : 'Security Personnel';
    let photo = '';

    if (canvas && canvas.width > 0) {
      photo = canvas.toDataURL('image/jpeg', 0.85);
    } else {
      photo = this.db.createAvatarDataUrl('#00ff9d', name.substring(0, 3).toUpperCase());
    }

    this.db.whitelist.unshift({
      id: `WL-${Math.floor(100 + Math.random() * 900)}`,
      name,
      role,
      enrolledAt: new Date().toLocaleDateString(),
      photo
    });

    this.db.saveWhitelist();
    this.renderWhitelist();
    this.audio.play('friendly');
    this.showToast('Friendly Enrolled', `${name} registered as Whitelisted / Non-Intruder`, 'success');
    if (this.onWhitelistUpdated) this.onWhitelistUpdated();
  }

  renderWhitelist() {
    const container = document.getElementById('whitelist-cards-container');
    const countEl = document.getElementById('modal-whitelist-count');
    if (countEl) countEl.innerText = this.db.whitelist.length;
    if (!container) return;

    container.innerHTML = this.db.whitelist.map((p, idx) => `
      <div class="bg-[#17202e] border border-green-500/30 rounded-lg p-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${p.photo}" class="w-10 h-10 rounded-full border border-green-400/50 object-cover bg-black" />
          <div>
            <h4 class="font-headline-md text-xs font-bold text-green-300">${p.name}</h4>
            <p class="font-data-mono text-[10px] text-gray-300">${p.role}</p>
            <span class="font-data-mono text-[9px] text-gray-500">Enrolled: ${p.enrolledAt}</span>
          </div>
        </div>
        ${idx > 0 ? `<button data-idx="${idx}" class="del-wl-btn p-1 text-gray-400 hover:text-red-400 transition-colors"><span class="material-symbols-outlined text-sm pointer-events-none">delete</span></button>` : '<span class="font-data-mono text-[9px] text-green-400/80 px-2 py-0.5 rounded bg-green-950 border border-green-500/30">DEFAULT</span>'}
      </div>
    `).join('');

    container.querySelectorAll('.del-wl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.db.whitelist.splice(parseInt(e.target.dataset.idx, 10), 1);
        this.db.saveWhitelist();
        this.renderWhitelist();
        if (this.onWhitelistUpdated) this.onWhitelistUpdated();
      });
    });
  }

  renderUnknowns(filter = 'ALL', search = '') {
    const container = document.getElementById('unknown-grid-container');
    if (!container) return;
    let list = this.db.unknowns;

    if (filter === 'ACTIVE') list = list.filter(u => u.status === 'ACTIVE');
    else if (filter === 'SUSPICIOUS') list = list.filter(u => (u.carriedItems || []).some(i => i.isSuspicious));
    else if (filter === 'INTERACTION') list = list.filter(u => (u.interactions || []).length > 0);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.id.toLowerCase().includes(q) || (u.attire && u.attire.summary.toLowerCase().includes(q)));
    }

    container.innerHTML = list.map(d => `
      <div class="bg-[#17202e]/95 border ${(d.carriedItems || []).some(i => i.isSuspicious) ? 'border-red-500/60' : 'border-amber-500/30'} rounded-lg p-3.5 flex flex-col justify-between gap-2.5">
        <div class="flex items-start justify-between border-b border-amber-500/20 pb-2">
          <div class="flex items-center gap-2.5">
            <img src="${d.photo}" class="w-10 h-10 rounded border border-amber-400/50 object-cover bg-black" />
            <div>
              <h4 class="font-headline-md text-xs font-bold text-amber-300">${d.id}</h4>
              <span class="font-data-mono text-[9px] text-amber-200/80">⏱️ ${d.durationFormatted || '0m 00s'}</span>
            </div>
          </div>
          <span class="font-data-mono text-[8px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40">${d.status}</span>
        </div>
        <div class="font-data-mono text-[10px] space-y-0.5 text-gray-300">
          <p><span class="text-gray-400">PROFILE:</span> ${d.biometrics?.estHeight || '~5\'10"'} / ${d.biometrics?.build?.split(' ')[0] || 'Athletic'}</p>
          <p><span class="text-gray-400">ATTIRE:</span> ${d.attire?.summary || 'Dark Apparel'}</p>
        </div>
        <div class="flex gap-2 pt-1 border-t border-amber-500/20">
          <button data-id="${d.id}" class="view-dossier-btn flex-1 py-1 text-[9px] font-data-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">VIEW DOSSIER</button>
          <button data-id="${d.id}" class="wl-unk-btn py-1 px-2 text-[9px] font-data-mono font-bold rounded bg-green-500/20 text-green-300 border border-green-500/40" title="Enroll Friendly">WHITELIST</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.view-dossier-btn').forEach(btn => btn.addEventListener('click', (e) => this.openInspector(e.currentTarget.dataset.id)));
    container.querySelectorAll('.wl-unk-btn').forEach(btn => btn.addEventListener('click', (e) => this.whitelistUnknown(e.currentTarget.dataset.id)));
  }

  openInspector(id) {
    const d = this.db.unknowns.find(u => u.id === id);
    if (!d) return;
    this.activeInspectorId = id;
    this.open('dossier-inspector-modal');

    document.getElementById('inspector-subject-id').innerText = `SUBJECT DOSSIER: ${d.id}`;
    document.getElementById('inspector-photo').src = d.photo;
    document.getElementById('inspector-height-val').innerText = d.biometrics?.estHeight || '~5\'10"';
    document.getElementById('inspector-build-val').innerText = d.biometrics?.build || 'Athletic';
    document.getElementById('inspector-face-val').innerText = d.biometrics?.faceComplexion || 'Fair';
    document.getElementById('inspector-total-time').innerText = d.durationFormatted || '0m 00s';
    document.getElementById('inspector-summary-text').innerText = d.summaryReport || 'No report available';

    // NVIDIA AI Section state
    const modelTag = document.getElementById('inspector-nvidia-model-tag');
    if (modelTag) {
      modelTag.innerText = this.nvidia.model.split('/')[1]?.toUpperCase() || 'NVIDIA NIM';
    }

    const placeholder = document.getElementById('inspector-nvidia-placeholder');
    const resultBox = document.getElementById('inspector-nvidia-result');
    const btnText = document.getElementById('inspector-nvidia-btn-text');

    if (d.nvidiaAnalysis) {
      if (placeholder) placeholder.classList.add('hidden');
      if (resultBox) {
        resultBox.classList.remove('hidden');
        resultBox.innerText = d.nvidiaAnalysis;
      }
      if (btnText) btnText.innerText = 'RE-SCAN WITH NVIDIA AI';
    } else {
      if (placeholder) placeholder.classList.remove('hidden');
      if (resultBox) {
        resultBox.classList.add('hidden');
        resultBox.innerText = '';
      }
      if (btnText) btnText.innerText = 'SCAN WITH NVIDIA AI';
    }

    const timelineEl = document.getElementById('inspector-timeline-container');
    if (timelineEl) {
      timelineEl.innerHTML = (d.activityTimeline || []).map(s => `
        <div class="relative pl-5 pb-2 timeline-item font-data-mono text-xs">
          <div class="timeline-stem absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-[#060e1c]"></div>
          <span class="text-[9px] text-cyan-400 font-bold">${s.time}</span>
          <p class="text-gray-300 text-xs">${s.event}</p>
        </div>
      `).join('');
    }
  }

  async runInspectorNvidiaScan() {
    if (!this.activeInspectorId) return;
    const d = this.db.unknowns.find(u => u.id === this.activeInspectorId);
    if (!d) return;

    if (!this.nvidia.isConfigured()) {
      this.openNvidiaModal();
      return;
    }

    const placeholder = document.getElementById('inspector-nvidia-placeholder');
    const resultBox = document.getElementById('inspector-nvidia-result');
    const btnText = document.getElementById('inspector-nvidia-btn-text');
    const btn = document.getElementById('inspector-nvidia-btn');

    if (placeholder) placeholder.classList.add('hidden');
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.innerText = '📡 Transmitting target surveillance crop to NVIDIA NIM Vision Foundation Model...';
      resultBox.classList.add('ai-scan-running');
    }
    if (btnText) btnText.innerText = 'ANALYZING...';
    if (btn) btn.disabled = true;

    try {
      const context = {
        subjectId: d.id,
        biometrics: d.biometrics,
        attire: d.attire,
        carriedItems: d.carriedItems,
        duration: d.durationFormatted
      };

      const analysis = await this.nvidia.analyzeSubject(d.photo, context);
      d.nvidiaAnalysis = analysis;
      this.db.saveUnknowns();

      if (resultBox) {
        resultBox.innerText = analysis;
        resultBox.classList.remove('ai-scan-running');
      }
      if (btnText) btnText.innerText = 'RE-SCAN WITH NVIDIA AI';
      this.audio.play('friendly');
    } catch (err) {
      if (resultBox) {
        resultBox.innerText = `⚠️ NVIDIA NIM Analysis Failed: ${err.message}`;
        resultBox.classList.remove('ai-scan-running');
      }
      if (btnText) btnText.innerText = 'RETRY SCAN';
      this.audio.play('alert');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  whitelistUnknown(id) {
    const d = this.db.unknowns.find(u => u.id === id);
    if (!d) return;
    this.db.whitelist.unshift({
      id: `WL-${Math.floor(100 + Math.random() * 900)}`,
      name: `Person (${d.id})`,
      role: 'Security Cleared Staff',
      enrolledAt: new Date().toLocaleDateString(),
      photo: d.photo
    });
    this.db.saveWhitelist();
    this.close('dossier-inspector-modal');
    this.audio.play('friendly');
    this.showToast('Friendly Enrolled', `${d.id} converted to authorized personnel`, 'success');
    if (this.onWhitelistUpdated) this.onWhitelistUpdated();
  }

  renderCriminals(filter = 'ALL', search = '') {
    const container = document.getElementById('criminal-grid-container');
    if (!container) return;
    let list = this.db.criminals;
    if (filter === 'CRITICAL') list = list.filter(c => c.threat === 'CRITICAL');
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    container.innerHTML = list.map(c => {
      const isSim = this.vision.simulatedWantedId === c.id;
      return `
        <div class="bg-[#17202e]/90 border ${isSim ? 'border-red-400 glow-red' : 'border-red-500/30'} rounded-lg p-3 flex flex-col justify-between gap-2">
          <div class="flex items-center justify-between border-b border-red-500/20 pb-1.5">
            <div>
              <h4 class="font-display-lg text-xs font-bold text-red-300">${c.name}</h4>
              <span class="font-data-mono text-[9px] text-gray-400">ALIAS: "${c.alias}"</span>
            </div>
            <span class="font-data-mono text-[8px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/40 font-bold">${c.threat}</span>
          </div>
          <p class="font-data-mono text-[10px] text-gray-300"><span class="text-gray-500">OFFENSE:</span> ${c.offenses}</p>
          <button data-id="${c.id}" class="sim-crime-btn py-1 text-[9px] font-data-mono font-bold rounded ${isSim ? 'bg-red-600 text-white' : 'bg-red-500/20 text-red-300 border border-red-400/40'}">
            ${isSim ? 'STOP SIMULATION' : 'SIMULATE MATCH'}
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.sim-crime-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.vision.simulatedWantedId = (this.vision.simulatedWantedId === id) ? null : id;
        this.renderCriminals();
        this.showToast('Simulation State', this.vision.simulatedWantedId ? `Simulating match for ${id}` : 'Stopped simulation drill', 'info');
      });
    });
  }
}
