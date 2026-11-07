/* SESSION ARCHITECT v18.1 — safer audio metadata + analysis patch.
   Never infer a subgenre from BPM/energy alone. Audio stays in the browser. */
(function () {
  'use strict';

  const EXTRA_GENRES = [
    'Hard Techno', 'Industrial Techno', 'Schranz', 'Hardgroove',
    'Raw Techno', 'Hypnotic Techno', 'Peak Time Techno', 'Acid Techno',
    'Hard House', 'Hardstyle', 'Hardcore', 'UK Garage', 'Garage',
    'Techno (Driving)', 'Techno (Dub)'
  ];
  if (typeof genres !== 'undefined') {
    EXTRA_GENRES.forEach(g => { if (!genres.includes(g)) genres.push(g); });
  }

  const genreAliases = [
    [/schranz/i, 'Schranz'],
    [/industrial\s*techno/i, 'Industrial Techno'],
    [/hard\s*techno/i, 'Hard Techno'],
    [/hardgroove/i, 'Hardgroove'],
    [/raw\s*techno/i, 'Raw Techno'],
    [/hypnotic\s*techno/i, 'Hypnotic Techno'],
    [/peak[\s-]*time/i, 'Peak Time Techno'],
    [/acid\s*techno/i, 'Acid Techno'],
    [/hard\s*house/i, 'Hard House'],
    [/hardstyle/i, 'Hardstyle'],
    [/hardcore/i, 'Hardcore'],
    [/uk\s*garage/i, 'UK Garage'],
    [/\bgarage\b/i, 'Garage'],
    [/melodic\s*techno/i, 'Melodic Techno'],
    [/minimal(?:\s*\/\s*deep)?\s*tech/i, 'Minimal / Deep Tech'],
    [/tech\s*house/i, 'Tech House'],
    [/deep\s*house/i, 'Deep House'],
    [/progressive\s*house/i, 'Progressive House'],
    [/afro\s*house/i, 'Afro House'],
    [/\bhouse\b/i, 'House'],
    [/\btechno\b/i, 'Techno'],
    [/drum\s*(?:&|and|n)\s*bass|\bdnb\b/i, 'Drum & Bass'],
    [/psy[\s-]*trance/i, 'Psy-Trance'],
    [/progressive\s*trance/i, 'Progressive Trance'],
    [/\btrance\b/i, 'Trance'],
    [/breakbeat/i, 'Breakbeat'],
    [/downtempo|ambient/i, 'Downtempo / Ambient'],
    [/disco|nu[\s-]*disco/i, 'Disco / Nu-Disco']
  ];

  function normalizeGenre(value) {
    const raw = Array.isArray(value) ? value.join('; ') : String(value || '');
    if (!raw.trim()) return '';
    for (const [pattern, label] of genreAliases) {
      if (pattern.test(raw)) return label;
    }
    return '';
  }

  // BPM and energy alone are not genre evidence. Keep unknown styles unclassified.
  window.suggestGenre = function (track) {
    if (track && track.genreManual && track.genre) return track.genre;
    return '';
  };

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

  function tagText(value) {
    if (value == null) return '';
    if (typeof value === 'object' && value.text != null) return String(value.text);
    if (typeof value === 'object' && value.data != null) return String(value.data);
    return String(value);
  }

  function tagYear(tags) {
    if (!tags) return null;
    const candidates = [
      tags.year, tags.TDRC, tags.TYER, tags.date, tags.originaldate,
      tags.ORIGINALDATE, tags.TORY
    ];
    for (const candidate of candidates) {
      const match = tagText(candidate).match(/\b(19\d{2}|20\d{2})\b/);
      if (match) {
        const year = Number(match[1]);
        if (year >= 1900 && year <= new Date().getFullYear() + 1) return year;
      }
    }
    return null;
  }

  function tagGenre(tags) {
    if (!tags) return '';
    const candidates = [tags.genre, tags.TCON, tags.GENRE];
    for (const candidate of candidates) {
      const normalized = normalizeGenre(tagText(candidate));
      if (normalized) return normalized;
    }
    return '';
  }

  async function calculateEnergy(blob, bpm) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    try {
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      const channelCount = Math.min(buffer.numberOfChannels, 2);
      const length = buffer.length;
      const hop = Math.max(1, Math.floor(buffer.sampleRate * 0.025)); // 25 ms windows
      const rmsValues = [];
      let sumSquares = 0, sampleCount = 0, peak = 0;
      const sampleStride = Math.max(1, Math.floor(length / 300000));
      for (let ch = 0; ch < channelCount; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i += sampleStride) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
          sumSquares += data[i] * data[i];
          sampleCount++;
        }
      }
      const globalRms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
      const db = 20 * Math.log10(Math.max(globalRms, 1e-7));

      const mono = new Float32Array(length);
      for (let ch = 0; ch < channelCount; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
      }
      let previous = 0, rises = 0, frames = 0;
      for (let start = 0; start < length; start += hop) {
        const end = Math.min(length, start + hop);
        let local = 0;
        for (let i = start; i < end; i++) local += mono[i] * mono[i];
        const value = Math.sqrt(local / Math.max(1, end - start));
        rmsValues.push(value);
        if (previous > 0.0001 && value > previous * 1.65 && value > globalRms * 0.45) rises++;
        previous = value;
        frames++;
      }
      rmsValues.sort((a, b) => a - b);
      const median = rmsValues[Math.floor(rmsValues.length * 0.50)] || globalRms;
      const p90 = rmsValues[Math.floor(rmsValues.length * 0.90)] || globalRms;
      const transientRate = rises / Math.max(1, buffer.duration);
      const loudness = Math.max(0, Math.min(1, (db + 36) / 27));
      const transient = Math.max(0, Math.min(1, transientRate / 4.5));
      const density = Math.max(0, Math.min(1, (p90 / Math.max(median, 0.0001) - 1) / 3));
      const tempo = Math.max(0, Math.min(1, ((Number(bpm) || 110) - 80) / 100));
      const score = Math.max(1, Math.min(10,
        Math.round(1 + 9 * (0.42 * loudness + 0.28 * transient + 0.20 * density + 0.10 * tempo))
      ));
      return { score, db: Math.round(db * 10) / 10, transientRate: Math.round(transientRate * 10) / 10 };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  const originalAnalyzeTrack = window.analyzeTrack;
  if (typeof originalAnalyzeTrack === 'function') {
    window.analyzeTrack = async function (track, quiet) {
      await originalAnalyzeTrack(track, quiet);
      if (!track || !track.blob) return;
      try {
        const [tags, energy] = await Promise.all([
          readEmbeddedTags(track.blob),
          calculateEnergy(track.blob, track.bpm)
        ]);

        // Respect explicit user edits; only fill blank fields from embedded tags.
        if (!track.genreManual && !track.genre) {
          const detected = tagGenre(tags);
          if (detected) {
            track.genre = detected;
            track.genreAuto = true;
            track.genreChecked = true;
            track.genreSource = 'embedded metadata';
          }
        }
        if (!track.year) {
          const year = tagYear(tags);
          if (year) {
            track.year = year;
            track.yearSource = 'embedded metadata';
          }
        }
        if (energy) {
          track.energy = energy.score;
          track.analysisEnergyMethod = 'loudness + transient density + dynamics + tempo';
          track.analysisRmsDb = energy.db;
          track.analysisTransientRate = energy.transientRate;
          if (typeof applyEnergyCategory === 'function') applyEnergyCategory(track);
        }
        const title = tags && tagText(tags.title);
        const artist = tags && tagText(tags.artist);
        if (title) track.embeddedTitle = title;
        if (artist) track.embeddedArtist = artist;
        if (!track.genre && !track.genreManual) {
          track.genreAuto = false;
          track.genreChecked = true;
        }
        track.analysisNote = (track.analysisNote || '') +
          (track.genre ? ' · Género: ' + track.genre + (track.genreSource ? ' (etiqueta)' : '') : ' · Género sin confirmar') +
          (track.year ? ' · Año: ' + track.year : ' · Año sin metadatos');
        await save(track);
        await refresh();
      } catch (error) {
        console.warn('SESSION ARCHITECT v18.1 metadata/energy patch:', error);
      }
    };
  }

  // Update the status hint without changing the existing library workflow.
  window.SESSION_ARCHITECT_ANALYSIS_PATCH = 'v18.1';
})();