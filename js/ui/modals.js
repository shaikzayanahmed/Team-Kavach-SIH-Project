// UI Modal Views & Dialog Manager
export class ModalController {
  constructor(dbService, audioService, visionEngine, onWhitelistUpdated, onUnknownUpdated) {
    this.db = dbService;
    this.audio = audioService;
    this.vision = visionEngine;
    this.onWhitelistUpdated = onWhitelistUpdated;
    this.onUnknownUpdated = onUnknownUpdated;
    this.activeInspectorId = null;
    this.bindEvents();
  }

  bindEvents() {
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

    // Whitelist Form
    document.getElementById('save-enroll-btn')?.addEventListener('click', () => this.registerWhitelistUser());
    document.getElementById('clear-whitelist-btn')?.addEventListener('click', () => {
      this.db.whitelist = [{ id: 'WL-001', name: 'Commander / Operator (Me)', role: 'Chief Security Director - Cleared', enrolledAt: new Date().toLocaleDateString(), photo: this.db.createAvatarDataUrl('#00ff9d', 'CMD') }];
      this.db.saveWhitelist();
      this.renderWhitelist();
      if (this.onWhitelistUpdated) this.onWhitelistUpdated();
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

    document.getElementById('export-unknown-json-btn')?.addEventListener('click', () => this.db.exportUnknownJSON());
    document.getElementById('export-unknown-csv-btn')?.addEventListener('click', () => this.db.exportUnknownCSV());
    document.getElementById('clear-unknown-db-btn')?.addEventListener('click', () => {
      if (confirm('Purge all unknown subject dossiers?')) {
        this.db.unknowns = [];
        this.db.saveUnknowns();
        this.renderUnknowns();
        if (this.onUnknownUpdated) this.onUnknownUpdated();
      }
    });

    // Inspector buttons
    document.getElementById('inspector-print-btn')?.addEventListener('click', () => window.print());
    document.getElementById('inspector-whitelist-btn')?.addEventListener('click', () => {
      if (this.activeInspectorId) this.whitelistUnknown(this.activeInspectorId);
    });

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

  open(id) { document.getElementById(id)?.classList.remove('hidden'); }
  close(id) { document.getElementById(id)?.classList.add('hidden'); }

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

  captureFacePreview() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('enroll-preview-canvas');
    if (!canvas || !video || video.readyState !== 4) return;
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 320, 240);
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
    ctx.strokeRect(80, 40, 160, 160);
    document.getElementById('enroll-empty-hint')?.classList.add('hidden');
    this.stagedPhoto = canvas.toDataURL('image/jpeg', 0.85);
  }

  registerWhitelistUser() {
    const name = document.getElementById('enroll-name-input')?.value.trim() || 'Authorized Personnel';
    const role = document.getElementById('enroll-role-input')?.value.trim() || 'Security Cleared';
    if (!this.stagedPhoto) this.captureFacePreview();

    this.db.whitelist.unshift({
      id: `WL-00${this.db.whitelist.length + 1}`,
      name,
      role,
      enrolledAt: new Date().toLocaleDateString(),
      photo: this.stagedPhoto || this.db.createAvatarDataUrl('#00ff9d', 'OK')
    });
    this.db.saveWhitelist();
    this.renderWhitelist();
    this.close('whitelist-modal');
    this.audio.play('friendly');
    if (this.onWhitelistUpdated) this.onWhitelistUpdated();
  }

  renderWhitelist() {
    const container = document.getElementById('whitelist-cards-container');
    if (!container) return;
    container.innerHTML = this.db.whitelist.map((p, idx) => `
      <div class="bg-[#17202e]/80 border border-green-500/30 rounded p-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${p.photo}" class="w-12 h-12 rounded border border-green-400/50 object-cover bg-black" />
          <div class="font-data-mono">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-green-300">${p.name}</span>
              <span class="text-[9px] bg-green-950 text-green-400 px-1.5 py-0.5 rounded border border-green-500/40">AUTHORIZED</span>
            </div>
            <span class="text-[11px] text-gray-400 font-sans">${p.role}</span>
          </div>
        </div>
        <button data-idx="${idx}" class="remove-wl-btn px-2 py-1 text-[10px] font-data-mono text-red-400 hover:text-red-300 border border-red-500/30 rounded">REVOKE</button>
      </div>
    `).join('');

    container.querySelectorAll('.remove-wl-btn').forEach(btn => {
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
      });
    });
  }
}
