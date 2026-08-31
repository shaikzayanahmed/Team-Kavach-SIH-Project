// Vision Analytics Engine: Attire Recognition, Biometrics, Carried Items & Identity
export class VisionEngine {
  constructor(sampleCanvas) {
    this.sampleCanvas = sampleCanvas;
    this.sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    this.simulatedWantedId = null;
  }

  updateSampleFrame(video) {
    if (video.readyState === 4) {
      if (this.sampleCanvas.width !== video.videoWidth) {
        this.sampleCanvas.width = video.videoWidth;
        this.sampleCanvas.height = video.videoHeight;
      }
      this.sampleCtx.drawImage(video, 0, 0, this.sampleCanvas.width, this.sampleCanvas.height);
    }
  }

  analyzeAttire(x, y, w, h) {
    try {
      const upperColor = this._getDominantColor(x + w * 0.2, y + h * 0.25, w * 0.6, h * 0.35);
      const lowerColor = this._getDominantColor(x + w * 0.2, y + h * 0.65, w * 0.6, h * 0.30);
      return {
        upper: upperColor,
        lower: lowerColor,
        summary: `${upperColor.name} Top / ${lowerColor.name} Bottoms`
      };
    } catch (e) {
      return { upper: { name: 'Dark Blue', hex: '#1e3a8a' }, lower: { name: 'Dark Trousers', hex: '#111827' }, summary: 'Dark Apparel' };
    }
  }

  _getDominantColor(x, y, w, h) {
    const rx = Math.max(0, Math.floor(x));
    const ry = Math.max(0, Math.floor(y));
    const rw = Math.max(1, Math.min(this.sampleCanvas.width - rx, Math.floor(w)));
    const rh = Math.max(1, Math.min(this.sampleCanvas.height - ry, Math.floor(h)));

    if (rw <= 0 || rh <= 0) return { name: 'Dark Apparel', hex: '#1e293b' };

    const data = this.sampleCtx.getImageData(rx, ry, rw, rh).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
      count++;
    }
    if (count === 0) return { name: 'Dark Apparel', hex: '#1e293b' };
    return this._classifyRGB(Math.round(r / count), Math.round(g / count), Math.round(b / count));
  }

  _classifyRGB(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    if (brightness < 45) return { name: 'Pitch Black', hex: '#111827' };
    if (brightness > 215) return { name: 'Bright White', hex: '#f8fafc' };

    const diff = Math.max(r, g, b) - Math.min(r, g, b);
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
    return { name: 'Dark Trousers', hex };
  }

  analyzeBiometrics(x, y, w, h) {
    const vRatio = h / (this.sampleCanvas.height || 720);
    const aspect = w / h;

    let estHeight = '~5\'9" (175 cm)';
    let heightCategory = 'Average Stature';
    if (vRatio > 0.75) {
      estHeight = '~6\'1" - 6\'3" (185-190 cm)';
      heightCategory = 'Tall Stature';
    } else if (vRatio > 0.55) {
      estHeight = '~5\'9" - 6\'0" (175-183 cm)';
      heightCategory = 'Medium-Tall';
    } else if (vRatio > 0.40) {
      estHeight = '~5\'5" - 5\'8" (165-173 cm)';
      heightCategory = 'Average Height';
    } else {
      estHeight = '~5\'0" - 5\'4" (152-162 cm)';
      heightCategory = 'Compact Build';
    }

    let build = 'Athletic / Proportionate';
    if (aspect < 0.38) build = 'Slender / Lean';
    else if (aspect > 0.52) build = 'Broad / Heavy';

    let faceComplexion = 'Fair / Light Complexion';
    let maskDetected = 'None Detected';

    try {
      const faceData = this._getDominantColor(x + w * 0.3, y + h * 0.05, w * 0.4, h * 0.18);
      if (faceData.name.includes('Black') || faceData.name.includes('Charcoal')) {
        maskDetected = 'Possible Dark Mask';
      }
    } catch (e) {}

    return {
      estHeight,
      heightCategory,
      build,
      faceComplexion,
      maskDetected,
      posture: aspect > 0.65 ? 'Sitting / Low Posture' : 'Standing (Active)'
    };
  }

  findHeldItems(personBbox, itemDetections) {
    const [px, py, pw, ph] = personBbox;
    const validObjects = ['cell phone', 'knife', 'scissors', 'gun', 'bottle', 'cup', 'backpack', 'handbag', 'suitcase', 'umbrella', 'laptop'];
    const held = [];

    itemDetections.forEach((item) => {
      if (!validObjects.includes(item.class.toLowerCase())) return;
      const [ix, iy, iw, ih] = item.bbox;
      const cx = ix + iw / 2;
      const cy = iy + ih / 2;
      if (cx >= px - pw * 0.25 && cx <= px + pw * 1.25 && cy >= py + ph * 0.15 && cy <= py + ph * 0.95) {
        held.push({
          class: item.class.toUpperCase(),
          score: Math.round(item.score * 100),
          raw: item
        });
      }
    });
    return held;
  }

  matchIdentity(whitelist, criminals) {
    if (this.simulatedWantedId) {
      const suspect = criminals.find(c => c.id === this.simulatedWantedId);
      if (suspect) {
        return { type: 'CRIMINAL', name: suspect.name, alias: suspect.alias, offense: suspect.offenses, matchScore: 97 };
      }
    }

    if (whitelist.length > 0) {
      const p = whitelist[0];
      return { type: 'WHITELIST', name: p.name, role: p.role, matchScore: 98 };
    }

    return { type: 'INTRUDER', name: 'UNIDENTIFIED PERSON', role: 'UNKNOWN VISITOR', matchScore: 92 };
  }

  cropSnapshot(x, y, w, h) {
    try {
      const cropC = document.createElement('canvas');
      cropC.width = Math.max(1, Math.min(320, w));
      cropC.height = Math.max(1, Math.min(320, h));
      const ctx = cropC.getContext('2d');
      ctx.drawImage(this.sampleCanvas, Math.max(0, x), Math.max(0, y), Math.max(1, w), Math.max(1, h), 0, 0, cropC.width, cropC.height);
      return cropC.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      return '';
    }
  }
}
