// Multi-Target Spatial Tracking, Social Proximity & Timeline Analytics Engine
export class TrackerEngine {
  constructor() {
    this.activeTracks = new Map();
    this.trackCounter = 100;
  }

  processTracks(personDetections, itemDetections, scaleX, scaleY, visionEngine, dbService, alertCallback) {
    const currentTimeMs = Date.now();
    const timeStr = new Date().toLocaleTimeString();
    const matchedTrackIds = new Set();
    const currentTargets = [];

    personDetections.forEach((personPred) => {
      const [vx, vy, vw, vh] = personPred.bbox;
      const rx = vx * scaleX, ry = vy * scaleY, rw = vw * scaleX, rh = vh * scaleY;
      const cx = rx + rw / 2, cy = ry + rh / 2;
      const confidence = Math.round(personPred.score * 100);

      // Find nearest existing track
      let bestTrackId = null;
      let minDist = 160;

      for (const [tId, t] of this.activeTracks.entries()) {
        if (matchedTrackIds.has(tId)) continue;
        const [tx, ty, tw, th] = t.lastBbox;
        const dist = Math.hypot(cx - (tx + tw / 2), cy - (ty + th / 2));
        if (dist < minDist) {
          minDist = dist;
          bestTrackId = tId;
        }
      }

      const attire = visionEngine.analyzeAttire(vx, vy, vw, vh);
      const biometrics = visionEngine.analyzeBiometrics(vx, vy, vw, vh);
      const heldItems = visionEngine.findHeldItems(personPred.bbox, itemDetections);
      const match = visionEngine.matchIdentity(dbService.whitelist, dbService.criminals);

      let statusColor = '#ffba4b';
      let threatLevel = 'WARNING';
      let isUnknown = false;

      if (match.type === 'WHITELIST') {
        statusColor = '#00ff9d';
        threatLevel = 'NOMINAL';
      } else if (match.type === 'CRIMINAL') {
        statusColor = '#ff453a';
        threatLevel = 'CRITICAL';
      } else {
        isUnknown = true;
      }

      if (heldItems.some(i => ['knife', 'scissors', 'gun'].includes(i.class.toLowerCase()))) {
        statusColor = '#ff453a';
        threatLevel = 'CRITICAL WEAPON';
      }

      let track = null;

      if (bestTrackId) {
        track = this.activeTracks.get(bestTrackId);
        track.lastBbox = [rx, ry, rw, rh];
        track.rawBbox = [vx, vy, vw, vh];
        track.lastSeen = timeStr;
        track.missedFrames = 0;
        track.durationSeconds = Math.max(1, Math.round((currentTimeMs - track.firstSeenTime) / 1000));
        track.durationFormatted = this.formatDuration(track.durationSeconds);
        track.attire = attire;
        track.biometrics = biometrics;
        track.match = match;
        matchedTrackIds.add(bestTrackId);
      } else {
        this.trackCounter++;
        const newTrackId = isUnknown ? `UNK-${Math.floor(1000 + Math.random() * 9000)}` : `T-${this.trackCounter}`;
        const bodyPhoto = visionEngine.cropSnapshot(vx, vy, vw, vh) || dbService.createAvatarDataUrl('#ffba4b', 'UNK');
        const facePhoto = visionEngine.cropSnapshot(vx + vw * 0.2, vy, vw * 0.6, vh * 0.25) || dbService.createAvatarDataUrl('#ffba4b', 'FACE');

        track = {
          id: newTrackId,
          isUnknown,
          status: 'ACTIVE',
          firstSeenTime: currentTimeMs,
          firstSeen: timeStr,
          lastSeen: timeStr,
          durationSeconds: 1,
          durationFormatted: '0m 01s',
          lastBbox: [rx, ry, rw, rh],
          rawBbox: [vx, vy, vw, vh],
          missedFrames: 0,
          score: confidence,
          threat: threatLevel,
          color: statusColor,
          match,
          attire,
          biometrics,
          carriedItems: [],
          interactions: [],
          activityTimeline: [{ time: timeStr, event: `${isUnknown ? 'Unknown individual' : match.name} entered optical view.`, type: 'ENTRY' }],
          photo: bodyPhoto,
          facePhoto,
          summaryReport: ''
        };

        this.activeTracks.set(newTrackId, track);
        matchedTrackIds.add(newTrackId);

        if (isUnknown && alertCallback) {
          alertCallback(`⚠️ Unknown Individual Spotted: [${newTrackId}] - ${biometrics.estHeight}, ${attire.summary}`, 'WARNING', 'OPTICS', confidence);
        }
      }

      // Check new carried items
      heldItems.forEach(item => {
        const itemClass = item.class.toUpperCase();
        const isSuspicious = ['KNIFE', 'SCISSORS', 'GUN'].includes(itemClass);
        if (!track.carriedItems.some(c => c.item === itemClass)) {
          track.carriedItems.push({ item: itemClass, firstSeen: timeStr, isSuspicious });
          track.activityTimeline.push({ time: timeStr, event: `Observed holding item: ${itemClass}`, type: 'ITEM' });
          if (isSuspicious && alertCallback) {
            alertCallback(`⚠️ SUSPICIOUS ITEM DETECTED: [${track.id}] is carrying ${itemClass}`, 'CRITICAL', 'WEAPON', 98);
          }
        }
      });

      currentTargets.push({
        id: track.id,
        trackRef: track,
        bbox: [rx, ry, rw, rh],
        score: confidence,
        threat: threatLevel,
        color: statusColor,
        match,
        attire,
        biometrics,
        holding: heldItems,
        durationFormatted: track.durationFormatted,
        isUnknown
      });
    });

    // Detect social conversations
    this._detectSocialInteractions(currentTargets, timeStr);

    // Clean up departed tracks
    for (const [tId, track] of this.activeTracks.entries()) {
      if (!matchedTrackIds.has(tId)) {
        track.missedFrames++;
        if (track.missedFrames > 60 && track.status === 'ACTIVE') {
          track.status = 'DEPARTED';
          track.activityTimeline.push({ time: timeStr, event: `Departed camera view. Total time: ${track.durationFormatted}.`, type: 'EXIT' });
          track.summaryReport = this.generateSummary(track);
          dbService.syncUnknownTrack(track);
          this.activeTracks.delete(tId);
        }
      } else {
        track.summaryReport = this.generateSummary(track);
        if (track.isUnknown) dbService.syncUnknownTrack(track);
      }
    }

    return currentTargets;
  }

  _detectSocialInteractions(targets, timeStr) {
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const t1 = targets[i], t2 = targets[j];
        const [x1, y1, w1, h1] = t1.bbox;
        const [x2, y2, w2, h2] = t2.bbox;
        const dist = Math.hypot((x1 + w1 / 2) - (x2 + w2 / 2), (y1 + h1 / 2) - (y2 + h2 / 2));

        if (dist < Math.max(w1, w2) * 1.8) {
          t1.interactingWith = t2.trackRef.match.name || t2.id;
          t2.interactingWith = t1.trackRef.match.name || t1.id;

          this._recordInteraction(t1.trackRef, t2.trackRef.match.name || t2.id, timeStr);
          this._recordInteraction(t2.trackRef, t1.trackRef.match.name || t1.id, timeStr);
        }
      }
    }
  }

  _recordInteraction(track, partnerName, timeStr) {
    let inter = track.interactions.find(i => i.targetName === partnerName);
    if (!inter) {
      track.interactions.push({ targetName: partnerName, durationSeconds: 1, time: timeStr });
      track.activityTimeline.push({ time: timeStr, event: `Engaged in conversation with ${partnerName}.`, type: 'INTERACTION' });
    } else {
      inter.durationSeconds++;
    }
  }

  generateSummary(track) {
    const timeSpent = track.durationFormatted || 'under 1 minute';
    const bio = track.biometrics || {};
    const attire = track.attire ? track.attire.summary : 'Dark Apparel';
    let inter = 'remained solo with no observed interactions';
    if (track.interactions && track.interactions.length > 0) {
      inter = `engaged in conversation with ${track.interactions.map(i => `${i.targetName} (${i.durationSeconds}s)`).join(', ')}`;
    }
    let items = (track.carriedItems || []).map(i => i.item).join(', ');
    const itemsStr = items ? `carrying ${items}` : 'no carried items detected';
    return `Subject ${track.id} spotted in Sector 1 for ${timeSpent} (${bio.estHeight || '~5\'10"'}, ${bio.build || 'Athletic'}, ${bio.faceComplexion || 'Fair'}, wearing ${attire}). During surveillance, subject ${inter} and observed ${itemsStr}.`;
  }

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }
}
