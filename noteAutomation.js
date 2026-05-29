// Note Automation: analyze the loaded audio and auto-generate notes.
// Mirrors the createAnalysisRenderer pattern in analysis.js for maintainability.
function createNoteAutomation(config) {
  const {
    state,
    elements,
    getBpm,
    getLPB,
    getOffsetSeconds,
    createNoteId,
    hasOverlappingNote,
    pushHistory,
    sortNotes,
    refreshUi,
    draw,
    // canvas helpers for preview overlay
    canvasCtx,
    getCanvasMetrics,
    xFromTime,
    getLanes,
    getNoteSize,
  } = config;

  const FRAME_SIZE = 1024;
  const HOP_SIZE = 512;
  const PREVIEW_COLOR = "#ffcc66";

  // Cached audio features for the currently analyzed buffer.
  let features = null; // { sampleRate, frameTimes, rms, flux, bandFlux:{low,mid,high} }
  let analyzedBufferRef = null;
  let previewNotes = [];
  let previewing = false;

  // ----------------------------------------------------------------- helpers
  function getMonoSamples(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    for (let c = 0; c < channels; c += 1) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i += 1) mono[i] += data[i];
    }
    if (channels > 1) {
      for (let i = 0; i < length; i += 1) mono[i] /= channels;
    }
    return mono;
  }

  // Iterative radix-2 FFT (in-place). re/im are Float32Array of length n (power of 2).
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k += 1) {
          const a = i + k;
          const b = i + k + len / 2;
          const tr = re[b] * cr - im[b] * ci;
          const ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
  }

  // Compute RMS, spectral flux and per-band flux in a single pass.
  function computeFeatures(audioBuffer) {
    const samples = getMonoSamples(audioBuffer);
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = Math.max(0, Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE) + 1);
    const frameTimes = new Float32Array(frameCount);
    const rms = new Float32Array(frameCount);
    const flux = new Float32Array(frameCount);
    const bandLow = new Float32Array(frameCount);
    const bandMid = new Float32Array(frameCount);
    const bandHigh = new Float32Array(frameCount);

    const bins = FRAME_SIZE / 2;
    const prevMag = new Float32Array(bins);
    const window = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)); // Hann
    }

    // Band split boundaries (Hz): low < 250, mid < 2000, high otherwise.
    const hzPerBin = sampleRate / FRAME_SIZE;
    const lowMax = Math.min(bins, Math.round(250 / hzPerBin));
    const midMax = Math.min(bins, Math.round(2000 / hzPerBin));

    const re = new Float32Array(FRAME_SIZE);
    const im = new Float32Array(FRAME_SIZE);

    for (let f = 0; f < frameCount; f += 1) {
      const start = f * HOP_SIZE;
      frameTimes[f] = start / sampleRate;
      let sumSq = 0;
      for (let i = 0; i < FRAME_SIZE; i += 1) {
        const s = samples[start + i];
        sumSq += s * s;
        re[i] = s * window[i];
        im[i] = 0;
      }
      rms[f] = Math.sqrt(sumSq / FRAME_SIZE);

      fft(re, im);

      let fluxSum = 0;
      let low = 0;
      let mid = 0;
      let high = 0;
      for (let b = 0; b < bins; b += 1) {
        const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
        const diff = mag - prevMag[b];
        if (diff > 0) {
          fluxSum += diff;
          if (b < lowMax) low += diff;
          else if (b < midMax) mid += diff;
          else high += diff;
        }
        prevMag[b] = mag;
      }
      flux[f] = fluxSum;
      bandLow[f] = low;
      bandMid[f] = mid;
      bandHigh[f] = high;
    }

    return {
      sampleRate,
      frameTimes,
      rms,
      flux,
      bandFlux: { low: bandLow, mid: bandMid, high: bandHigh },
    };
  }

  // Adaptive peak-picking on a detection function. Returns frame indices.
  function pickPeaks(df, sensitivity) {
    const n = df.length;
    if (!n) return [];
    // sensitivity 0..100 -> factor high(strict) .. low(loose)
    const factor = 1.7 - (sensitivity / 100) * 1.25; // ~1.7 .. 0.45
    const win = 16; // local-mean window (frames)
    const guard = 3; // local-max neighborhood
    let maxVal = 0;
    for (let i = 0; i < n; i += 1) if (df[i] > maxVal) maxVal = df[i];
    const floor = maxVal * 0.04; // ignore near-silence
    const peaks = [];
    for (let i = 0; i < n; i += 1) {
      const v = df[i];
      if (v < floor) continue;
      let isMax = true;
      for (let k = -guard; k <= guard; k += 1) {
        const j = i + k;
        if (j < 0 || j >= n || k === 0) continue;
        if (df[j] > v) {
          isMax = false;
          break;
        }
      }
      if (!isMax) continue;
      let sum = 0;
      let cnt = 0;
      for (let k = -win; k <= win; k += 1) {
        const j = i + k;
        if (j < 0 || j >= n) continue;
        sum += df[j];
        cnt += 1;
      }
      const mean = cnt ? sum / cnt : 0;
      if (v >= mean * factor + floor) peaks.push({ index: i, strength: v });
    }
    return peaks;
  }

  function dominantBandAt(index) {
    const { low, mid, high } = features.bandFlux;
    const l = low[index];
    const m = mid[index];
    const h = high[index];
    if (m >= l && m >= h) return "mid";
    if (h >= l && h >= m) return "high";
    return "low";
  }

  function clampAutomationTime(time) {
    const maxTime = state.duration || Number.POSITIVE_INFINITY;
    return Math.max(0, Math.min(maxTime, time));
  }

  function snapAutomationTime(time) {
    const bpm = getBpm();
    const lpb = getLPB();
    if (!bpm || !lpb) return clampAutomationTime(time);
    const step = 60 / bpm / lpb;
    const offset = getOffsetSeconds();
    return clampAutomationTime(offset + Math.round((time - offset) / step) * step);
  }

  function getMinGapSeconds(settings) {
    const bpm = getBpm();
    if (!bpm) return 0;
    return (60 / bpm) * settings.minGapBeats;
  }

  function getMinGapLabel() {
    const labels = {
      1: "1",
      0.5: "1/2",
      0.25: "1/4",
      0.125: "1/8",
      0.0625: "1/16",
    };
    return labels[elements.minGap.value] || elements.minGap.options[elements.minGap.selectedIndex]?.textContent || "1/4";
  }

  function updateTimingLabels() {
    if (!elements.minGapValue) return;
    const seconds = getMinGapSeconds(readSettings());
    elements.minGapValue.textContent = `${getMinGapLabel()} = ${seconds.toFixed(3)}s`;
  }

  // ------------------------------------------------------------ detection
  function detectOnsets(settings) {
    if (!features) return [];
    const algo = settings.algorithm;
    let onsets;
    if (algo === "band") {
      const { low, mid, high } = features.bandFlux;
      onsets = [
        ...pickPeaks(low, settings.sensitivity).map((p) => ({ ...p, band: "low" })),
        ...pickPeaks(mid, settings.sensitivity).map((p) => ({ ...p, band: "mid" })),
        ...pickPeaks(high, settings.sensitivity).map((p) => ({ ...p, band: "high" })),
      ].map((p) => ({
        time: features.frameTimes[p.index],
        index: p.index,
        strength: p.strength,
        band: p.band,
      }));
    } else {
      let df = features.flux;
      if (algo === "energy") {
        df = new Float32Array(features.rms.length);
        for (let i = 1; i < features.rms.length; i += 1) {
          const diff = features.rms[i] - features.rms[i - 1];
          df[i] = diff > 0 ? diff : 0;
        }
      }
      const peaks = pickPeaks(df, settings.sensitivity);
      onsets = peaks.map((p) => ({
        time: features.frameTimes[p.index],
        index: p.index,
        strength: p.strength,
        band: settings.laneStrategy === "band" ? dominantBandAt(p.index) : null,
      }));
    }
    return onsets;
  }

  // -------------------------------------------------------- note generation
  function measureSustainSeconds(frameIndex) {
    // How long RMS stays above half its onset value -> hold candidate.
    if (!features) return 0;
    const rms = features.rms;
    const start = rms[frameIndex];
    if (start <= 0) return 0;
    const threshold = start * 0.5;
    let i = frameIndex + 1;
    while (i < rms.length && rms[i] >= threshold) i += 1;
    return features.frameTimes[Math.min(i, rms.length - 1)] - features.frameTimes[frameIndex];
  }

  function laneForOnset(onset, settings, counter) {
    const lanes = state.laneCount;
    if (settings.laneStrategy === "random") {
      return Math.floor(Math.random() * lanes);
    }
    if (settings.laneStrategy === "alternate") {
      const half = Math.floor(lanes / 2);
      return counter % 2 === 0
        ? Math.floor(Math.random() * Math.max(1, half))
        : half + Math.floor(Math.random() * Math.max(1, lanes - half));
    }
    if (settings.laneStrategy === "band" && onset.band) {
      const map = settings.bandLanes;
      const lane = map[onset.band];
      if (Number.isInteger(lane) && lane >= 0 && lane < lanes) return lane;
    }
    // round-robin (default)
    return counter % lanes;
  }

  function generateNotes(settings) {
    let onsets = detectOnsets(settings);
    const firstBeatTime = getOffsetSeconds();
    onsets = onsets.filter((o) => o.time >= firstBeatTime);
    if (settings.timeRange === "view") {
      onsets = onsets.filter((o) => o.time >= Math.max(state.viewStart, firstBeatTime) && o.time <= state.viewEnd);
    }
    onsets.sort((a, b) => a.time - b.time);

    const minGap = Math.max(getMinGapSeconds(settings), settings.npsCap > 0 ? 1 / settings.npsCap : 0);
    const result = [];
    let lastTime = -Infinity;
    let counter = 0;
    onsets.forEach((onset) => {
      let time = settings.snap ? snapAutomationTime(onset.time) : clampAutomationTime(onset.time);
      time = Number(time.toFixed(3));
      if (time < firstBeatTime) return;
      if (time - lastTime < minGap) return;
      const lane = laneForOnset(onset, settings, counter);
      let type = "tap";
      let duration;
      if (settings.noteType === "tapHold") {
        const sustain = measureSustainSeconds(onset.index);
        if (sustain >= 0.18) {
          type = "hold";
          duration = Number(Math.max(0.05, sustain).toFixed(3));
        }
      }
      const note = { time, lane, type, band: onset.band };
      if (duration) note.duration = duration;
      result.push(note);
      lastTime = time;
      counter += 1;
    });
    return result;
  }

  // ----------------------------------------------------------------- UI glue
  function readSettings() {
    const bandLanes = {
      low: Number(elements.bandLow?.value ?? 0),
      mid: Number(elements.bandMid?.value ?? 0),
      high: Number(elements.bandHigh?.value ?? 0),
    };
    return {
      algorithm: elements.algorithm.value,
      sensitivity: Number(elements.sensitivity.value),
      minGapBeats: Number(elements.minGap.value) || 0.25,
      snap: elements.snapToggle.checked,
      laneStrategy: elements.laneStrategy.value,
      noteType: elements.noteType.value,
      npsCap: Number(elements.npsCap.value) || 0,
      timeRange: elements.timeRange.value,
      bandLanes,
    };
  }

  function populateLaneSelect(select, selected) {
    if (!select) return;
    const prev = select.value;
    select.innerHTML = "";
    for (let i = 0; i < state.laneCount; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Lane ${i + 1}`;
      select.appendChild(opt);
    }
    const want = prev !== "" ? prev : String(selected);
    select.value = Number(want) < state.laneCount ? want : "0";
  }

  function syncBandVisibility() {
    const show = elements.algorithm.value === "band" || elements.laneStrategy.value === "band";
    if (elements.bandMapRow) elements.bandMapRow.hidden = !show;
  }

  function updateStatus() {
    const hasAudio = !!state.audioBuffer;
    const analyzed = !!features && analyzedBufferRef === state.audioBuffer;
    if (elements.audioStatus) {
      if (!hasAudio) elements.audioStatus.textContent = "No audio loaded — import an MP3 first.";
      else if (!analyzed) elements.audioStatus.textContent = `Audio ready (${formatDur(state.duration)}). Click Analyze.`;
      else elements.audioStatus.textContent = `Analyzed ✓ (${features.frameTimes.length} frames).`;
    }
    elements.analyzeButton.disabled = !hasAudio;
    const canGen = analyzed;
    elements.generateButton.disabled = !canGen;
    elements.applyButton.disabled = !previewing || previewNotes.length === 0;
    elements.clearButton.disabled = !previewing;
  }

  function formatDur(sec) {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function updateStats() {
    if (!elements.stats) return;
    if (!previewing || previewNotes.length === 0) {
      elements.stats.textContent = "No preview yet.";
      return;
    }
    const count = previewNotes.length;
    const span =
      readSettings().timeRange === "view" ? Math.max(0.001, state.viewEnd - state.viewStart) : Math.max(0.001, state.duration);
    const nps = count / span;
    const holds = previewNotes.filter((n) => n.type === "hold").length;
    elements.stats.textContent = `${count} notes · ${nps.toFixed(1)} NPS · ${holds} holds`;
  }

  // ------------------------------------------------------------- public ops
  function analyze() {
    if (!state.audioBuffer) return;
    if (elements.audioStatus) elements.audioStatus.textContent = "Analyzing…";
    elements.analyzeButton.disabled = true;
    // Defer so the "Analyzing…" label paints before the heavy sync work.
    setTimeout(() => {
      try {
        features = computeFeatures(state.audioBuffer);
        analyzedBufferRef = state.audioBuffer;
        regenerate();
      } catch (err) {
        if (elements.audioStatus) elements.audioStatus.textContent = "Analysis failed.";
        console.error(err);
      } finally {
        updateStatus();
      }
    }, 30);
  }

  function regenerate() {
    if (!features) return;
    previewNotes = generateNotes(readSettings());
    previewing = true;
    updateStats();
    updateStatus();
    draw();
  }

  function clearPreview() {
    previewNotes = [];
    previewing = false;
    updateStats();
    updateStatus();
    draw();
  }

  function reset() {
    features = null;
    analyzedBufferRef = null;
    clearPreview();
    updateStatus();
  }

  function apply() {
    if (!previewing || previewNotes.length === 0) return;
    const mode = elements.applyMode.value; // "replace" | "merge"
    pushHistory();
    if (mode === "replace") {
      state.notes = [];
    }
    previewNotes.forEach((p) => {
      const note = {
        id: createNoteId(),
        time: p.time,
        lane: p.lane,
        type: p.type,
        meta: [],
      };
      if (p.type === "hold") note.duration = p.duration;
      if (mode === "merge" && hasOverlappingNote(note)) return;
      state.notes.push(note);
    });
    previewNotes = [];
    previewing = false;
    sortNotes();
    updateStats();
    updateStatus();
    refreshUi();
  }

  // ------------------------------------------------------------ preview draw
  function renderPreview(metrics) {
    if (!previewing || previewNotes.length === 0) return;
    const m = metrics || getCanvasMetrics();
    const noteSize = getNoteSize();
    const ctx = canvasCtx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.padding.left, m.padding.top, m.plotWidth, m.lanePlotHeight);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5, 4]);
    previewNotes.forEach((note) => {
      if (note.lane >= state.laneCount) return;
      const end = note.type === "hold" ? note.time + (note.duration || 0) : note.time;
      if (end < state.viewStart || note.time > state.viewEnd) return;
      const x = xFromTime(note.time, m);
      const y = m.padding.top + note.lane * m.laneHeight + m.laneHeight / 2;
      ctx.strokeStyle = "#ffffff";
      ctx.fillStyle = PREVIEW_COLOR;
      if (note.type === "hold") {
        const endX = xFromTime(end, m);
        ctx.lineWidth = Math.max(3, noteSize * 0.45);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, y);
        ctx.strokeStyle = PREVIEW_COLOR;
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        [x, endX].forEach((cx) => {
          ctx.beginPath();
          ctx.arc(cx, y, noteSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, noteSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ events
  function bind() {
    elements.analyzeButton.addEventListener("click", analyze);
    elements.generateButton.addEventListener("click", regenerate);
    elements.applyButton.addEventListener("click", apply);
    elements.clearButton.addEventListener("click", clearPreview);

    const liveInputs = [
      elements.algorithm,
      elements.sensitivity,
      elements.minGap,
      elements.snapToggle,
      elements.laneStrategy,
      elements.noteType,
      elements.npsCap,
      elements.timeRange,
      elements.bandLow,
      elements.bandMid,
      elements.bandHigh,
    ];
    let timer = null;
    liveInputs.forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        if (el === elements.sensitivity && elements.sensitivityValue) {
          elements.sensitivityValue.textContent = elements.sensitivity.value;
        }
        if (el === elements.minGap) updateTimingLabels();
        if (el === elements.algorithm || el === elements.laneStrategy) syncBandVisibility();
        if (!features) return;
        clearTimeout(timer);
        timer = setTimeout(regenerate, 140);
      });
    });
  }

  function open() {
    // Re-populate lane selects (laneCount may have changed) and refresh status.
    populateLaneSelect(elements.bandLow, 0);
    populateLaneSelect(elements.bandMid, Math.floor(state.laneCount / 2));
    populateLaneSelect(elements.bandHigh, state.laneCount - 1);
    if (elements.sensitivityValue) elements.sensitivityValue.textContent = elements.sensitivity.value;
    updateTimingLabels();
    // Invalidate stale analysis if the audio changed.
    if (analyzedBufferRef !== state.audioBuffer) {
      features = null;
      clearPreview();
    }
    syncBandVisibility();
    updateStatus();
    updateStats();
  }

  bind();

  return {
    open,
    analyze,
    regenerate,
    apply,
    clearPreview,
    reset,
    updateTimingLabels,
    renderPreview,
    isPreviewing: () => previewing,
    getPreviewNotes: () => (previewing ? previewNotes : []),
  };
}

if (typeof window !== "undefined") window.createNoteAutomation = createNoteAutomation;
