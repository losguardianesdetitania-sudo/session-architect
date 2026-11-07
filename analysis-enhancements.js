/* SESSION ARCHITECT v18.2 — conservative metadata and analysis corrections.
   Audio analysis stays local. BPM/energy never determine a precise genre. */
(function () {
  'use strict';

  const EXTRA_GENRES = [
    'Hard Techno','Industrial Techno','Schranz','Hardgroove','Raw Techno',
    'Hypnotic Techno','Peak Time Techno','Acid Techno','Driving Techno',
    'Dub Techno','Hard House','Hardstyle','Hardcore','UK Garage','Garage',
    'Electro','Detroit Techno','Minimal Techno','Deep Techno','Techno',
    'Deep House','Classic House','Progressive House','Afro House',
    'Organic House','Melodic House','Melodic Techno','Tech House',
    'Jackin House','Disco House','Trance','Progressive Trance','Psy-Trance',
    'Drum & Bass','Jungle','Breakbeat','UK Bass','Bass House',
    'Disco / Nu-Disco','Downtempo / Ambient'
  ];
  if (typeof genres !== 'undefined') {
    EXTRA_GENRES.forEach(g => { if (!genres.includes(g)) genres.push(g); });
  }

  const genreAliases = [
    [/schranz/i,'Schranz'],
    [/industrial[\s-]*techno/i,'Industrial Techno'],
    [/hard[\s-]*techno/i,'Hard Techno'],
    [/hardgroove/i,'Hardgroove'],
    [/raw[\s-]*techno/i,'Raw Techno'],
    [/hypnotic[\s-]*techno/i,'Hypnotic Techno'],
    [/peak[\s-]*time/i,'Peak Time Techno'],
    [/acid[\s-]*techno/i,'Acid Techno'],
    [/driving[\s-]*techno/i,'Driving Techno'],
    [/dub[\s-]*techno/i,'Dub Techno'],
    [/detroit[\s-]*techno/i,'Detroit Techno'],
    [/minimal[\s-]*techno/i,'Minimal Techno'],
    [/deep[\s-]*techno/i,'Deep Techno'],
    [/hard[\s-]*house/i,'Hard House'],
    [/hardstyle/i,'Hardstyle'],
    [/hardcore/i,'Hardcore'],
    [/uk[\s-]*garage/i,'UK Garage'],
    [/bass[\s-]*house/i,'Bass House'],
    [/jackin[\s-]*house/i,'Jackin House'],
    [/classic[\s-]*house/i,'Classic House'],
    [/deep[\s-]*house/i,'Deep House'],
    [/progressive[\s-]*house/i,'Progressive House'],
    [/afro[\s-]*house/i,'Afro House'],
    [/organic[\s-]*house/i,'Organic House'],
    [/melodic[\s-]*house/i,'Melodic House'],
    [/melodic[\s-]*techno/i,'Melodic Techno'],
    [/tech[\s-]*house/i,'Tech House'],
    [/electro/i,'Electro'],
    [/drum\s*(?:&|and|n)\s*bass|\bdnb\b/i,'Drum & Bass'],
    [/\bjungle\b/i,'Jungle'],
    [/psy[\s-]*trance/i,'Psy-Trance'],
    [/progressive[\s-]*trance/i,'Progressive Trance'],
    [/\btrance\b/i,'Trance'],
    [/breakbeat/i,'Breakbeat'],
    [/uk[\s-]*bass/i,'UK Bass'],
    [/disco|nu[\s-]*disco/i,'Disco / Nu-Disco'],
    [/downtempo|ambient/i,'Downtempo / Ambient'],
    [/\btechno\b/i,'Techno'],
    [/\bhouse\b/i,'House']
  ];

  function normalizeGenre(value) {
    const raw = Array.isArray(value) ? value.join('; ') : String(value || '');
    if (!raw.trim()) return '';
    for (const [pattern, label] of genreAliases) if (pattern.test(raw)) return label;
    return '';
  }

  // Critical safeguard: BPM and energy cannot distinguish Hard Techno from House.
  window.suggestGenre = function (track) {
    return track && track.genreManual && track.genre ? track.genre : '';
  };

  function tagText(value) {
    if (value == null) return '';
    if (typeof value === 'object' && value.text != null) return String(value.text);
    if (typeof value === 'object' && value.data != null) {
      try { return Array.isArray(value.data) ? String.fromCharCode.apply(null, value.data) : String(value.data); }
      catch (_) { return String(value.data); }
    }
    return String(value);
  }

  function readEmbeddedTags(blob) {
    return new Promise(resolve => {
      if (!window.jsmediatags || !blob) return resolve(null);
      try {
        window.jsmediatags.read(blob, {
          onSuccess: result => resolve(result && result.tags ? result.tags : null),
          onError: () => resolve(null)
        });
      } catch (_) { resolve(null); }
    });
  }

  function findYear(value) {
    const match = tagText(value).match(/\b(19\d{2}|20\d{2})\b/);
    if (!match) return null;
    const year = Number(match[1]);
    return year >= 1900 && year <= new Date().getFullYear() + 1 ? year : null;
  }

  function tagYear(tags) {
    if (!tags) return null;
    // Prefer explicit original-release fields over the ordinary recording date.
    const original = [tags.originaldate, tags.ORIGINALDATE, tags.TORY, tags.TDOR];
    for (const value of original) { const year = findYear(value); if (year) return year; }
    const ordinary = [tags.year, tags.TDRC, tags.TYER, tags.date];
    for (const value of ordinary) { const year = findYear(value); if (year) return year; }
    return null;
  }

  function tagGenre(tags) {
    if (!tags) return '';
    for (const value of [tags.genre, tags.TCON, tags.GENRE]) {
      const genre = normalizeGenre(tagText(value));
      if (genre) return genre;
    }
    return '';
  }

  const camelotMap = {
    'C major':'8B','G major':'9B','D major':'10B','A major':'11B',
    'E major':'12B','B major':'1B','F# major':'2B','Gb major':'2B',
    'C# major':'3B','Db major':'3B','G# major':'4B','Ab major':'4B',
    'D# major':'5B','Eb major':'5B','A# major':'6B','Bb major':'6B',
    'F major':'7B','A minor':'8A','E minor':'9A','B minor':'10A',
    'F# minor':'11A','Gb minor':'11A','C# minor':'12A','Db minor':'12A',
    'G# minor':'1A','Ab minor':'1A','D# minor':'2A','Eb minor':'2A',
    'A# minor':'3A','Bb minor':'3A','F minor':'4A','C minor':'5A',
    'G minor':'6A','D minor':'7A'
  };
  function camelotFromAnalysis(track) {
    const key = String(track.analysisMusicalKey || '').replace('♯','#').replace('♭','b').trim();
    const scale = String(track.analysisScale || '').toLowerCase().trim();
    return camelotMap[key + ' ' + scale] || '';
  }

  async function calculateEnergy(blob, bpm) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !blob) return null;
    const context = new AudioContextClass();
    try {
      const audio = await context.decodeAudioData(await blob.arrayBuffer());
      const channelCount = Math.min(audio.numberOfChannels, 2);
      const length = audio.length;
      const hop = Math.max(1, Math.floor(audio.sampleRate * 0.05));
      const rms = [];
      let sumSquares = 0, sampleCount = 0, peak = 0;
      const stride = Math.max(1, Math.floor(length / 250000));
      for (let ch = 0; ch < channelCount; ch++) {
        const data = audio.getChannelData(ch);
        for (let i = 0; i < length; i += stride) {
          const v = data[i];
          sumSquares += v * v;
          sampleCount++;
          peak = Math.max(peak, Math.abs(v));
        }
      }
      const globalRms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
      const db = 20 * Math.log10(Math.max(globalRms, 1e-7));
      let previous = 0, transients = 0, previousDb = -100;
      const monoSample = i => {
        let value = 0;
        for (let ch = 0; ch < channelCount; ch++) value += audio.getChannelData(ch)[i] / channelCount;
        return value;
      };
      for (let start = 0; start < length; start += hop) {
        const end = Math.min(length, start + hop);
        let energy = 0;
        for (let i = start; i < end; i++) { const v = monoSample(i); energy += v * v; }
        const value = Math.sqrt(energy / Math.max(1, end - start));
        rms.push(value);
        const localDb = 20 * Math.log10(Math.max(value, 1e-7));
        if (previousDb > -65 && localDb - previousDb > 4.5 && value > globalRms * 0.25) transients++;
        previousDb = localDb;
        previous = value;
      }
      rms.sort((a,b) => a-b);
      const p10 = rms[Math.floor(rms.length * 0.10)] || globalRms;
      const p50 = rms[Math.floor(rms.length * 0.50)] || globalRms;
      const p90 = rms[Math.floor(rms.length * 0.90)] || globalRms;
      const transientRate = transients / Math.max(1, audio.duration);
      const loudness = Math.max(0, Math.min(1, (db + 38) / 29));
      const punch = Math.max(0, Math.min(1, transientRate / 3.2));
      const density = Math.max(0, Math.min(1, (p90 / Math.max(p50, 1e-5) - 1) / 2.5));
      const dynamics = Math.max(0, Math.min(1, (p90 - p10) / Math.max(p90, 1e-5)));
      const tempo = Math.max(0, Math.min(1, ((Number(bpm) || 120) - 80) / 100));
      const raw = 0.38*loudness + 0.25*punch + 0.18*density + 0.12*dynamics + 0.07*tempo;
      const score = Math.max(1, Math.min(10, Math.round(1 + raw * 9)));
      return {
        score, db: Math.round(db*10)/10,
        transientRate: Math.round(transientRate*100)/100,
        peak: Math.round(peak*1000)/1000,
        method: 'RMS + transitorios + densidad + dinámica + BPM'
      };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  // Mark user edits before the app's own change handler saves the track.
  const rows = document.getElementById('rows');
  if (rows) rows.addEventListener('change', event => {
    const el = event.target;
    const id = el && el.dataset && el.dataset.id;
    if (!id) return;
    const track = (typeof tracks !== 'undefined') ? tracks.find(t => t.id === id) : null;
    if (!track) return;
    if (el.dataset.f === 'bpm') track.bpmManual = true;
    if (el.dataset.f === 'key') track.keyManual = true;
    if (el.dataset.f === 'energy') track.energyManual = true;
    if (el.dataset.f === 'year') track.yearManual = true;
    if (el.dataset.f === 'genre') track.genreManual = true;
    if (el.dataset.c) track.categoriesManual = true;
  }, true);

  const originalAnalyzeTrack = window.analyzeTrack;
  if (typeof originalAnalyzeTrack === 'function') {
    window.analyzeTrack = async function (track, quiet) {
      if (!track || !track.blob) return originalAnalyzeTrack(track, quiet);
      const preserved = {};
      ['bpm','key','energy','year','genre','categories'].forEach(field => {
        const manualFlag = field === 'categories' ? 'categoriesManual' : field + 'Manual';
        if (track[manualFlag]) preserved[field] = Array.isArray(track[field]) ? track[field].slice() : track[field];
      });
      await originalAnalyzeTrack(track, quiet);
      try {
        // Restore all user-entered values after the legacy analyzer has run.
        Object.keys(preserved).forEach(field => { track[field] = preserved[field]; });

        const [tags, energy] = await Promise.all([
          readEmbeddedTags(track.blob),
          track.energyManual ? Promise.resolve(null) : calculateEnergy(track.blob, track.bpm)
        ]);

        if (!track.genreManual && !track.genre) {
          const taggedGenre = tagGenre(tags);
          if (taggedGenre) {
            track.genre = taggedGenre;
            track.genreAuto = true;
            track.genreChecked = true;
            track.genreSource = 'etiqueta incrustada del archivo';
          } else {
            track.genreAuto = false;
            track.genreChecked = true;
            track.genreSource = '';
          }
        }

        if (!track.yearManual && !track.year) {
          const year = tagYear(tags);
          if (year) {
            track.year = year;
            track.yearSource = 'etiqueta del archivo (no verificada externamente)';
          }
        }

        if (energy) {
          track.energy = energy.score;
          track.analysisEnergyMethod = energy.method;
          track.analysisRmsDb = energy.db;
          track.analysisTransientRate = energy.transientRate;
          track.analysisPeak = energy.peak;
          if (!track.categoriesManual && typeof applyEnergyCategory === 'function') applyEnergyCategory(track);
        }

        const embeddedTitle = tags && tagText(tags.title);
        const embeddedArtist = tags && tagText(tags.artist);
        if (embeddedTitle) track.embeddedTitle = embeddedTitle;
        if (embeddedArtist) track.embeddedArtist = embeddedArtist;

        const bpmConfidence = Number(track.analysisBpmConfidence) || 0;
        if (!track.bpmManual && Number.isFinite(Number(track.bpm))) {
          const detected = Number(track.bpm);
          // Prefer a DJ-readable double-time interpretation for clear half-time estimates.
          if (detected >= 40 && detected < 70 && detected * 2 <= 190) {
            track.bpmRaw = detected;
            track.bpm = Math.round(detected * 2 * 10) / 10;
            track.bpmInterpretation = 'doble tiempo (estimación)';
          } else {
            track.bpmRaw = detected;
            track.bpmInterpretation = '';
          }
          if (bpmConfidence > 0 && bpmConfidence < 0.12) {
            track.bpm = null;
            track.bpmConfidenceWarning = true;
          } else {
            track.bpmConfidenceWarning = false;
          }
        }

        // The existing engine returns a musical key and mode; convert only with known mappings.
        if (!track.keyManual && track.analysisMusicalKey && track.analysisScale) {
          const camelot = camelotFromAnalysis(track);
          if (camelot && (Number(track.analysisKeyStrength) >= 0.05 || !track.analysisKeyStrength)) {
            track.key = camelot;
          }
        }

        const note = [];
        note.push(track.bpm ? 'BPM ' + track.bpm + (track.bpmInterpretation ? ' ('+track.bpmInterpretation+')' : '') : 'BPM pendiente');
        note.push(track.key ? 'Camelot ' + track.key : 'Camelot no concluyente');
        note.push(track.energy ? 'Energía ' + track.energy + '/10' : 'Energía pendiente');
        note.push(track.genre ? 'Género ' + track.genre : 'Género sin confirmar');
        note.push(track.year ? 'Año ' + track.year : 'Año sin metadatos');
        track.analysisNote = note.join(' · ');
        track.analysisVersion = '18.2';
        await save(track);
        await refresh();
      } catch (error) {
        console.warn('SESSION ARCHITECT v18.2 enhancement:', error);
      }
    };
  }

  window.SESSION_ARCHITECT_ANALYSIS_PATCH = 'v18.2';
})();