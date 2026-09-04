// Clean Canvas Tactical HUD Overlay Renderer
export class HUDEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'minimal'; // 'minimal', 'tactical', 'off'
    this.themePrimary = '#00daf3';
  }

  setThemeColor(color) {
    this.themePrimary = color;
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(targets, itemDetections, scaleX, scaleY) {
    if (this.mode === 'off') return;

    // Render each person target
    targets.forEach(t => {
      const [rx, ry, rw, rh] = t.bbox;
      this._drawPersonHUD(rx, ry, rw, rh, t);
    });

    // Render social dialogue beam if conversing
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const t1 = targets[i], t2 = targets[j];
        if (t1.interactingWith && t1.interactingWith.includes(t2.id)) {
          const [x1, y1, w1, h1] = t1.bbox;
          const [x2, y2, w2, h2] = t2.bbox;
          this._drawSocialBeam(x1 + w1 / 2, y1 + h1 / 2, x2 + w2 / 2, y2 + h2 / 2);
        }
      }
    }

    // Render tactical non-person item boxes if mode === tactical
    if (this.mode === 'tactical') {
      itemDetections.forEach(item => {
        const [x, y, w, h] = item.bbox;
        this._drawItemBox(x * scaleX, y * scaleY, w * scaleX, h * scaleY, item.class.toUpperCase(), Math.round(item.score * 100));
      });
    }
  }

  _drawPersonHUD(x, y, w, h, target) {
    const ctx = this.ctx;
    const color = target.color;
    const cornerLength = Math.min(16, w / 4, h / 4);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = target.match.type === 'CRIMINAL' ? 10 : 4;

    // Thin corner brackets
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLength); ctx.lineTo(x, y); ctx.lineTo(x + cornerLength, y);
    ctx.moveTo(x + w - cornerLength, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLength);
    ctx.moveTo(x + w, y + h - cornerLength); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cornerLength, y + h);
    ctx.moveTo(x + cornerLength, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cornerLength);
    ctx.stroke();

    // Sleek Micro-Pill Tag above head
    const displayName = target.match.type === 'WHITELIST'
      ? `ME (${target.match.name.split(' ')[0]})`
      : (target.match.type === 'CRIMINAL' ? `WANTED: ${target.match.name}` : `${target.id} • ${target.durationFormatted || '0m 01s'}`);

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(displayName).width;
    const pillW = textWidth + 20, pillH = 18;
    const pillX = Math.max(4, Math.min(this.canvas.width - pillW - 4, x + (w - pillW) / 2));
    const pillY = Math.max(pillH + 4, y - pillH - 4);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(6, 14, 28, 0.72)';
    this._roundRect(ctx, pillX, pillY, pillW, pillH, 3, true, false);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this._roundRect(ctx, pillX, pillY, pillW, pillH, 3, false, true);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pillX + 8, pillY + pillH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dae3f6';
    ctx.fillText(displayName, pillX + 15, pillY + 12.5);

    // Carried weapon warning badge (if any)
    const weapon = (target.holding || []).find(i => ['KNIFE', 'SCISSORS', 'GUN'].includes(i.class));
    if (weapon) {
      const tag = `⚠️ ${weapon.class}`;
      const tw = ctx.measureText(tag).width + 12;
      ctx.fillStyle = 'rgba(255, 69, 58, 0.85)';
      this._roundRect(ctx, pillX, pillY - 18, tw, 16, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, pillX + 6, pillY - 6.5);
    }

    // Tactical sub-tag if tactical mode active
    if (this.mode === 'tactical') {
      const subTag = `${target.attire.upper.name} • ${target.biometrics.estHeight.split(' ')[0]}`;
      ctx.font = '8px "JetBrains Mono", monospace';
      const subW = ctx.measureText(subTag).width + 10;
      const subX = Math.max(4, Math.min(this.canvas.width - subW - 4, x + (w - subW) / 2));
      ctx.fillStyle = 'rgba(6, 14, 28, 0.65)';
      this._roundRect(ctx, subX, y + h + 4, subW, 14, 2, true, false);
      ctx.fillStyle = '#849396';
      ctx.fillText(subTag, subX + 5, y + h + 14);
    }

    ctx.restore();
  }

  _drawSocialBeam(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 157, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();

    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.fillStyle = 'rgba(6, 14, 28, 0.8)';
    this._roundRect(ctx, mx - 30, my - 8, 60, 16, 3, true, false);
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([]);
    this._roundRect(ctx, mx - 30, my - 8, 60, 16, 3, false, true);

    ctx.fillStyle = '#00ff9d';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('💬 TALKING', mx, my + 3.5);
    ctx.restore();
  }

  _drawItemBox(x, y, w, h, label, score) {
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

  _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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
}
