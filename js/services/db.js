// Database & Storage Service for Whitelist, Criminals & Unknown Dossiers
export class DatabaseService {
  constructor() {
    this.whitelist = [];
    this.criminals = [];
    this.unknowns = [];
    this.loadAll();
  }

  loadAll() {
    this.whitelist = this._load('sentinel_whitelist_v2', () => [
      {
        id: 'WL-001',
        name: 'Commander / Operator (Me)',
        role: 'Chief Security Director - Cleared',
        enrolledAt: new Date().toLocaleDateString(),
        photo: this.createAvatarDataUrl('#00ff9d', 'CMD'),
        signature: { r: 110, g: 130, b: 160, brightness: 125, aspect: 0.85 },
        isDefault: true
      }
    ]);

    this.criminals = this._load('sentinel_criminals_v2', () => [
      {
        id: 'CR-8821',
        name: 'Victor "Shadow" Vance',
        alias: 'The Phantom Infiltrator',
        threat: 'CRITICAL',
        threatBadge: 'INTERPOL RED',
        offenses: 'Armed Breach, Critical Infrastructure Sabotage, Weapon Trafficking',
        wantedBy: 'Interpol / Global Defense',
        avatarInitials: 'VV'
      },
      {
        id: 'CR-4901',
        name: 'Elena Rostova',
        alias: 'Viper-6',
        threat: 'HIGH',
        threatBadge: 'HIGH FELONY',
        offenses: 'Cyber Espionage, Biometric Spoofing, High-Value Asset Theft',
        wantedBy: 'Federal Counter-Intelligence',
        avatarInitials: 'ER'
      },
      {
        id: 'CR-9120',
        name: 'Marcus Reyes',
        alias: 'Goliath',
        threat: 'CRITICAL',
        threatBadge: 'ARMED & DANGEROUS',
        offenses: 'Armed Bank Robbery, Perimeter Ambush, Explosives Possession',
        wantedBy: 'National Taskforce',
        avatarInitials: 'MR'
      }
    ]);

    this.unknowns = this._load('sentinel_unknown_dossiers_v2', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 15 * 60 * 1000);
      return [
        {
          id: 'UNK-4819',
          status: 'DEPARTED',
          firstSeen: earlier.toLocaleTimeString(),
          lastSeen: new Date(earlier.getTime() + 84 * 1000).toLocaleTimeString(),
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
          carriedItems: [{ item: 'CELL PHONE', firstSeen: earlier.toLocaleTimeString(), isSuspicious: false }],
          interactions: [{ targetName: 'Operator (Me) [Whitelisted]', durationSeconds: 22, time: earlier.toLocaleTimeString() }],
          activityTimeline: [
            { time: earlier.toLocaleTimeString(), event: 'Unknown individual spotted entering Sector 1 optical view.', type: 'ENTRY' },
            { time: new Date(earlier.getTime() + 12 * 1000).toLocaleTimeString(), event: 'Engaged in conversation with Operator (Me).', type: 'INTERACTION' },
            { time: new Date(earlier.getTime() + 84 * 1000).toLocaleTimeString(), event: 'Departed camera field of view. Total time: 1m 24s.', type: 'EXIT' }
          ],
          summaryReport: 'Unknown individual (~5\'10", Athletic build, Fair complexion, wearing Navy Blue top) was spotted in Sector 1 for 1m 24s. Engaged in conversation with Operator (Me) for 22 seconds and was carrying a Cell Phone.',
          threatLevel: 'NOMINAL (VISITOR)'
        }
      ];
    });
  }

  _load(key, defaultFn) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const def = defaultFn();
    localStorage.setItem(key, JSON.stringify(def));
    return def;
  }

  saveWhitelist() {
    localStorage.setItem('sentinel_whitelist_v2', JSON.stringify(this.whitelist));
  }

  saveCriminals() {
    localStorage.setItem('sentinel_criminals_v2', JSON.stringify(this.criminals));
  }

  saveUnknowns() {
    localStorage.setItem('sentinel_unknown_dossiers_v2', JSON.stringify(this.unknowns));
  }

  syncUnknownTrack(track) {
    if (!track.isUnknown) return;
    const existingIdx = this.unknowns.findIndex(d => d.id === track.id);
    const data = {
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

    if (existingIdx >= 0) this.unknowns[existingIdx] = data;
    else this.unknowns.unshift(data);
    this.saveUnknowns();
  }

  exportUnknownJSON() {
    const blob = new Blob([JSON.stringify(this.unknowns, null, 2)], { type: 'application/json' });
    this._downloadFile(blob, `sentinel-unknown-dossiers-${Date.now()}.json`);
  }

  exportUnknownCSV() {
    const headers = ['ID', 'Status', 'First Spotted', 'Last Seen', 'Total Time (s)', 'Height', 'Build', 'Complexion', 'Upper Attire', 'Lower Attire', 'Carried Items', 'Interacted With', 'Summary Report'];
    const rows = this.unknowns.map(d => {
      const bio = d.biometrics || {};
      const attire = d.attire || { upper: {}, lower: {} };
      const items = (d.carriedItems || []).map(i => i.item).join('; ');
      const inter = (d.interactions || []).map(i => `${i.targetName} (${i.durationSeconds}s)`).join('; ');
      return [
        `"${d.id}"`, `"${d.status}"`, `"${d.firstSeen}"`, `"${d.lastSeen}"`, `"${d.durationSeconds || 0}"`,
        `"${bio.estHeight || ''}"`, `"${bio.build || ''}"`, `"${bio.faceComplexion || ''}"`,
        `"${attire.upper ? attire.upper.name : ''}"`, `"${attire.lower ? attire.lower.name : ''}"`,
        `"${items}"`, `"${inter}"`, `"${(d.summaryReport || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    this._downloadFile(blob, `sentinel-unknown-log-${Date.now()}.csv`);
  }

  _downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
}
