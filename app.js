const audioInput = document.querySelector("#audioInput");
const levelInput = document.querySelector("#levelInput");
const exportButton = document.querySelector("#exportButton");
const playButton = document.querySelector("#playButton");
const stopButton = document.querySelector("#stopButton");
const undoButton = document.querySelector("#undoButton");
const clearButton = document.querySelector("#clearButton");
const scrub = document.querySelector("#scrub");
const bpmInput = document.querySelector("#bpmInput");
const snapInput = document.querySelector("#snapInput");
const autoFollowInput = document.querySelector("#autoFollowInput");
const noteType = document.querySelector("#noteType");
const holdLength = document.querySelector("#holdLength");
const songMeta = document.querySelector("#songMeta");
const currentTimeLabel = document.querySelector("#currentTime");
const durationTimeLabel = document.querySelector("#durationTime");
const noteCount = document.querySelector("#noteCount");
const notesBody = document.querySelector("#notesBody");
const laneCountInput = document.querySelector("#laneCount");
const lpbInput = document.querySelector("#lpbInput");
const canvas = document.querySelector("#timeline");
const ctx = canvas.getContext("2d");
const minimap = document.querySelector("#minimap");
const miniCtx = minimap.getContext("2d");
const audio = document.querySelector("#audio");

const lanePalette = [
  "#45d39a",
  "#62a8ff",
  "#ffcc66",
  "#ff7ba7",
  "#b98cff",
  "#4dd5ff",
  "#f28c5b",
  "#a7e05f",
  "#f071d5",
  "#78d8b0",
  "#d6ba5f",
  "#8aa4ff",
];

const tapMinGap = 0.08;

const state = {
  songName: "",
  duration: 0,
  viewStart: 0,
  viewEnd: 0,
  waveform: null,
  selectedLane: 0,
  laneCount: 4,
  notes: [],
  history: [],
  isDraggingMinimap: false,
  autoFollow: true,
};

function getLanes() {
  return Array.from({ length: state.laneCount }, (_, id) => ({
    id,
    label: `Lane ${id + 1}`,
    color: lanePalette[id % lanePalette.length],
  }));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00.000";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapTime(time) {
  const bpm = Number(bpmInput.value);
  const lpb = getLPB();
  if (!snapInput.checked || !lpb || !bpm) return time;
  const step = 60 / bpm / lpb;
  return Math.round(time / step) * step;
}

function getLPB() {
  return clamp(Math.round(Number(lpbInput.value) || 4), Number(lpbInput.min), Number(lpbInput.max));
}

function getViewSpan() {
  if (!state.duration) return 0;
  return Math.max(0.001, state.viewEnd - state.viewStart);
}

function setView(start, span) {
  if (!state.duration) {
    state.viewStart = 0;
    state.viewEnd = 0;
    return;
  }
  const nextSpan = clamp(span, Math.min(2, state.duration), state.duration);
  const nextStart = clamp(start, 0, Math.max(0, state.duration - nextSpan));
  state.viewStart = nextStart;
  state.viewEnd = nextStart + nextSpan;
}

function resetView() {
  setView(0, state.duration || 0);
}

function followPlayhead() {
  if (!state.autoFollow || audio.paused || state.isDraggingMinimap || !state.duration) return;
  const span = getViewSpan();
  if (span >= state.duration) return;
  const current = audio.currentTime || 0;
  const followPosition = 0.32;
  const minVisible = state.viewStart + span * 0.28;
  const maxVisible = state.viewStart + span * 0.72;
  if (current < minVisible || current > maxVisible) {
    setView(current - span * followPosition, span);
  }
}

function pushHistory() {
  state.history.push(
    JSON.stringify({
      laneCount: state.laneCount,
      selectedLane: state.selectedLane,
      notes: state.notes,
    }),
  );
  if (state.history.length > 80) state.history.shift();
  undoButton.disabled = state.history.length === 0;
}

function sortNotes() {
  state.notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
}

function getNoteRange(note) {
  if (note.type === "hold") {
    return {
      start: note.time,
      end: note.time + Math.max(note.duration || 0, tapMinGap),
    };
  }
  return {
    start: note.time - tapMinGap / 2,
    end: note.time + tapMinGap / 2,
  };
}

function notesOverlap(a, b) {
  if (a.lane !== b.lane) return false;
  const rangeA = getNoteRange(a);
  const rangeB = getNoteRange(b);
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

function hasOverlappingNote(note) {
  return state.notes.some((existing) => notesOverlap(existing, note));
}

function removeOverlappingNotes(notes) {
  const filtered = [];
  notes
    .slice()
    .sort((a, b) => a.time - b.time || a.lane - b.lane)
    .forEach((note) => {
      if (!filtered.some((existing) => notesOverlap(existing, note))) {
        filtered.push(note);
      }
    });
  return filtered;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const minimapRect = minimap.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(600, Math.floor(rect.width * scale));
  canvas.height = Math.max(320, Math.floor(rect.height * scale));
  minimap.width = Math.max(600, Math.floor(minimapRect.width * scale));
  minimap.height = Math.max(56, Math.floor(minimapRect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  miniCtx.setTransform(scale, 0, 0, scale, 0, 0);
  draw();
  drawMinimap();
}

function getCanvasMetrics() {
  const rect = canvas.getBoundingClientRect();
  const padding = { left: 62, right: 18, top: 30, bottom: 28 };
  const waveformHeight = state.waveform ? Math.min(58, Math.max(34, rect.height * 0.12)) : 0;
  const waveformGap = state.waveform ? 10 : 0;
  const lanePlotHeight = rect.height - padding.top - padding.bottom - waveformHeight - waveformGap;
  return {
    width: rect.width,
    height: rect.height,
    plotWidth: rect.width - padding.left - padding.right,
    plotHeight: rect.height - padding.top - padding.bottom,
    lanePlotHeight,
    waveformHeight,
    waveformGap,
    waveformTop: rect.height - padding.bottom - waveformHeight,
    padding,
    laneHeight: lanePlotHeight / state.laneCount,
  };
}

function xFromTime(time, metrics) {
  if (!state.duration) return metrics.padding.left;
  return metrics.padding.left + ((time - state.viewStart) / getViewSpan()) * metrics.plotWidth;
}

function timeFromX(x, metrics) {
  const ratio = clamp((x - metrics.padding.left) / metrics.plotWidth, 0, 1);
  return state.viewStart + ratio * getViewSpan();
}

function laneFromY(y, metrics) {
  if (y < metrics.padding.top || y > metrics.padding.top + metrics.lanePlotHeight) return null;
  const raw = Math.floor((y - metrics.padding.top) / metrics.laneHeight);
  return clamp(raw, 0, state.laneCount - 1);
}

function draw() {
  const metrics = getCanvasMetrics();
  const lanes = getLanes();
  ctx.clearRect(0, 0, metrics.width, metrics.height);
  ctx.fillStyle = "#13171b";
  ctx.fillRect(0, 0, metrics.width, metrics.height);

  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  lanes.forEach((lane, index) => {
    const y = metrics.padding.top + index * metrics.laneHeight;
    ctx.fillStyle = index === state.selectedLane ? "#1b2426" : index % 2 ? "#151a1f" : "#11161a";
    ctx.fillRect(metrics.padding.left, y, metrics.plotWidth, metrics.laneHeight);
    ctx.strokeStyle = "#2d343c";
    ctx.beginPath();
    ctx.moveTo(metrics.padding.left, y);
    ctx.lineTo(metrics.width - metrics.padding.right, y);
    ctx.stroke();
    ctx.fillStyle = lane.color;
    ctx.fillText(lane.label, 10, y + metrics.laneHeight / 2);
  });

  ctx.strokeStyle = "#2d343c";
  ctx.beginPath();
  ctx.moveTo(metrics.padding.left, metrics.padding.top + metrics.lanePlotHeight);
  ctx.lineTo(metrics.width - metrics.padding.right, metrics.padding.top + metrics.lanePlotHeight);
  ctx.stroke();

  drawBeatGrid(metrics);
  drawWaveform(metrics);
  drawNotes(metrics);
  drawPlayhead(metrics);
  drawMinimap();
}

function drawMinimap() {
  const rect = minimap.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  miniCtx.clearRect(0, 0, width, height);
  miniCtx.fillStyle = "#11161a";
  miniCtx.fillRect(0, 0, width, height);

  if (!state.duration) {
    miniCtx.fillStyle = "#7d8995";
    miniCtx.font = "12px Inter, system-ui, sans-serif";
    miniCtx.fillText("Minimap", 12, height / 2 + 4);
    return;
  }

  if (state.waveform) {
    const center = height / 2;
    const waveHeight = height * 0.74;
    miniCtx.strokeStyle = "rgba(69, 211, 154, 0.55)";
    miniCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 1) {
      const sampleIndex = Math.floor((x / width) * state.waveform.length);
      const peak = state.waveform[sampleIndex] || 0;
      const barHeight = Math.max(1, peak * waveHeight);
      miniCtx.beginPath();
      miniCtx.moveTo(x, center - barHeight / 2);
      miniCtx.lineTo(x, center + barHeight / 2);
      miniCtx.stroke();
    }
  }

  state.notes.forEach((note) => {
    const x = (note.time / state.duration) * width;
    miniCtx.fillStyle = lanePalette[note.lane % lanePalette.length];
    miniCtx.fillRect(x, 8, 2, height - 16);
  });

  const startX = (state.viewStart / state.duration) * width;
  const endX = (state.viewEnd / state.duration) * width;
  miniCtx.fillStyle = "rgba(98, 168, 255, 0.18)";
  miniCtx.fillRect(startX, 0, Math.max(8, endX - startX), height);
  miniCtx.strokeStyle = "#62a8ff";
  miniCtx.lineWidth = 2;
  miniCtx.strokeRect(startX, 1, Math.max(8, endX - startX), height - 2);

  const playheadX = ((audio.currentTime || 0) / state.duration) * width;
  miniCtx.strokeStyle = "#ffffff";
  miniCtx.lineWidth = 1;
  miniCtx.beginPath();
  miniCtx.moveTo(playheadX, 0);
  miniCtx.lineTo(playheadX, height);
  miniCtx.stroke();
}

function drawWaveform(metrics) {
  if (!state.waveform || !state.duration) return;
  const waveHeight = metrics.waveformHeight;
  const top = metrics.waveformTop;
  const center = top + waveHeight / 2;
  const samples = state.waveform;
  const startIndex = Math.floor((state.viewStart / state.duration) * samples.length);
  const endIndex = Math.ceil((state.viewEnd / state.duration) * samples.length);
  const visibleSamples = Math.max(1, endIndex - startIndex);

  ctx.save();
  ctx.beginPath();
  ctx.rect(metrics.padding.left, top, metrics.plotWidth, waveHeight);
  ctx.clip();
  ctx.fillStyle = "rgba(69, 211, 154, 0.07)";
  ctx.fillRect(metrics.padding.left, top, metrics.plotWidth, waveHeight);
  ctx.strokeStyle = "rgba(69, 211, 154, 0.55)";
  ctx.lineWidth = 1;

  for (let x = 0; x < metrics.plotWidth; x += 1) {
    const sampleStart = startIndex + Math.floor((x / metrics.plotWidth) * visibleSamples);
    const sampleEnd = startIndex + Math.ceil(((x + 1) / metrics.plotWidth) * visibleSamples);
    let peak = 0;
    for (let i = sampleStart; i <= sampleEnd && i < samples.length; i += 1) {
      peak = Math.max(peak, samples[i] || 0);
    }
    const barHeight = Math.max(1, peak * waveHeight);
    const drawX = metrics.padding.left + x;
    ctx.beginPath();
    ctx.moveTo(drawX, center - barHeight / 2);
    ctx.lineTo(drawX, center + barHeight / 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(154, 166, 178, 0.25)";
  ctx.strokeRect(metrics.padding.left, top, metrics.plotWidth, waveHeight);
  ctx.restore();
}

function drawBeatGrid(metrics) {
  const bpm = Number(bpmInput.value);
  if (!state.duration || !bpm) return;
  const beat = 60 / bpm;
  const lpb = getLPB();
  const lineStep = beat / lpb;
  ctx.strokeStyle = "#2d343c";
  ctx.fillStyle = "#7d8995";
  ctx.textAlign = "center";
  const firstLine = Math.floor(state.viewStart / lineStep);
  const lastLine = Math.ceil(state.viewEnd / lineStep);
  for (let line = firstLine; line <= lastLine; line += 1) {
    const time = line * lineStep;
    const x = xFromTime(time, metrics);
    const isBeat = line % lpb === 0;
    const isBar = isBeat && Math.round(line / lpb) % 4 === 0;
    ctx.globalAlpha = isBar ? 0.9 : isBeat ? 0.55 : 0.22;
    ctx.beginPath();
    ctx.moveTo(x, metrics.padding.top);
    ctx.lineTo(x, metrics.height - metrics.padding.bottom);
    ctx.stroke();
    if (isBar) ctx.fillText(formatTime(time).slice(0, 5), x, 14);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawNotes(metrics) {
  const lanes = getLanes();
  state.notes.forEach((note) => {
    const lane = lanes[note.lane];
    if (!lane) return;
    const noteEnd = note.time + (note.duration || 0);
    if (noteEnd < state.viewStart || note.time > state.viewEnd) return;
    const x = xFromTime(note.time, metrics);
    const y = metrics.padding.top + note.lane * metrics.laneHeight + metrics.laneHeight / 2;
    ctx.fillStyle = lane.color;
    ctx.strokeStyle = "#0b0d0f";
    if (note.type === "hold") {
      const endX = xFromTime(note.time + note.duration, metrics);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, y);
      ctx.strokeStyle = lane.color;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawPlayhead(metrics) {
  if ((audio.currentTime || 0) < state.viewStart || (audio.currentTime || 0) > state.viewEnd) return;
  const x = xFromTime(audio.currentTime || 0, metrics);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, metrics.padding.top);
  ctx.lineTo(x, metrics.height - metrics.padding.bottom);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function refreshUi() {
  currentTimeLabel.textContent = formatTime(audio.currentTime || 0);
  durationTimeLabel.textContent = formatTime(state.duration);
  scrub.value = audio.currentTime || 0;
  scrub.max = state.duration || 0;
  noteCount.textContent = state.notes.length;
  clearButton.disabled = state.notes.length === 0;
  undoButton.disabled = state.history.length === 0;
  laneCountInput.value = state.laneCount;
  renderTable();
  draw();
}

function renderTable() {
  const visibleNotes = state.notes.slice(0, 400);
  notesBody.innerHTML = visibleNotes
    .map(
      (note) => `<tr>
        <td>${formatTime(note.time)}</td>
        <td>${note.lane + 1}</td>
        <td>${note.type}</td>
        <td>${note.type === "hold" ? note.duration.toFixed(3) : "-"}</td>
      </tr>`,
    )
    .join("");
}

function setAudioEnabled(enabled) {
  playButton.disabled = !enabled;
  stopButton.disabled = !enabled;
  scrub.disabled = !enabled;
  exportButton.disabled = false;
}

function addNote(time, lane) {
  if (!state.duration) return;
  const type = noteType.value;
  const note = {
    time: Number(snapTime(time).toFixed(3)),
    lane,
    type,
  };
  if (type === "hold") {
    note.duration = Number(clamp(Number(holdLength.value), 0.05, 10).toFixed(3));
  }
  if (hasOverlappingNote(note)) return;
  pushHistory();
  state.notes.push(note);
  sortNotes();
  refreshUi();
}

function removeNearestNote(time, lane) {
  const threshold = Math.max(0.08, state.duration * 0.006);
  let targetIndex = -1;
  let targetDistance = Infinity;
  state.notes.forEach((note, index) => {
    const distance = Math.abs(note.time - time);
    if (note.lane === lane && distance < threshold && distance < targetDistance) {
      targetIndex = index;
      targetDistance = distance;
    }
  });
  if (targetIndex === -1) return;
  pushHistory();
  state.notes.splice(targetIndex, 1);
  refreshUi();
}

function exportLevel() {
  const payload = {
    version: 1,
    song: state.songName || "untitled",
    bpm: Number(bpmInput.value),
    lpb: getLPB(),
    lanes: state.laneCount,
    duration: Number((state.duration || 0).toFixed(3)),
    notes: state.notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.song.replace(/\.[^.]+$/, "") || "level"}.level.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importLevel(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    pushHistory();
    const importedLaneCount = Number(data.lanes);
    if (Number.isInteger(importedLaneCount)) {
      state.laneCount = clamp(importedLaneCount, Number(laneCountInput.min), Number(laneCountInput.max));
    }
    state.selectedLane = clamp(state.selectedLane, 0, state.laneCount - 1);
    const importedNotes = Array.isArray(data.notes) ? data.notes.filter((note) => note.lane >= 0 && note.lane < state.laneCount) : [];
    state.notes = removeOverlappingNotes(importedNotes);
    if (data.bpm) bpmInput.value = data.bpm;
    if (data.lpb) lpbInput.value = clamp(Math.round(Number(data.lpb)), Number(lpbInput.min), Number(lpbInput.max));
    sortNotes();
    refreshUi();
  };
  reader.readAsText(file);
}

async function buildWaveform(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelCount = audioBuffer.numberOfChannels;
    const sampleCount = Math.min(6000, Math.ceil(audioBuffer.duration * 220));
    const blockSize = Math.max(1, Math.floor(audioBuffer.length / sampleCount));
    const peaks = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
      const blockStart = i * blockSize;
      const blockEnd = Math.min(audioBuffer.length, blockStart + blockSize);
      let peak = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        for (let sample = blockStart; sample < blockEnd; sample += 1) {
          peak = Math.max(peak, Math.abs(data[sample]));
        }
      }
      peaks[i] = peak;
    }

    state.waveform = peaks;
    draw();
  } finally {
    audioContext.close();
  }
}

function animationTick() {
  currentTimeLabel.textContent = formatTime(audio.currentTime || 0);
  scrub.value = audio.currentTime || 0;
  followPlayhead();
  draw();
  drawMinimap();
  requestAnimationFrame(animationTick);
}

function setLaneCount(count, keepHistory = true) {
  const nextCount = clamp(Math.round(Number(count) || 4), Number(laneCountInput.min), Number(laneCountInput.max));
  if (nextCount === state.laneCount) {
    laneCountInput.value = state.laneCount;
    return;
  }
  if (keepHistory) pushHistory();
  state.laneCount = nextCount;
  state.selectedLane = clamp(state.selectedLane, 0, state.laneCount - 1);
  state.notes = state.notes.filter((note) => note.lane < state.laneCount);
  refreshUi();
}

audioInput.addEventListener("change", () => {
  const file = audioInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  state.waveform = null;
  audio.src = url;
  state.songName = file.name;
  songMeta.textContent = file.name;
  buildWaveform(file).catch(() => {
    state.waveform = null;
    draw();
  });
});

audio.addEventListener("loadedmetadata", () => {
  state.duration = audio.duration || 0;
  resetView();
  setAudioEnabled(true);
  refreshUi();
});

audio.addEventListener("play", () => {
  playButton.textContent = "❚❚";
});

audio.addEventListener("pause", () => {
  playButton.textContent = "▶";
});

playButton.addEventListener("click", () => {
  if (audio.paused) audio.play();
  else audio.pause();
});

stopButton.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  refreshUi();
});

scrub.addEventListener("input", () => {
  audio.currentTime = Number(scrub.value);
  refreshUi();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const lane = laneFromY(y, metrics);
  if (lane === null) return;
  state.selectedLane = lane;
  addNote(timeFromX(x, metrics), lane);
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const lane = laneFromY(event.clientY - rect.top, metrics);
  if (lane === null) return;
  removeNearestNote(timeFromX(event.clientX - rect.left, metrics), lane);
});

canvas.addEventListener(
  "wheel",
  (event) => {
    if (!state.duration) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const metrics = getCanvasMetrics();
    const mouseX = event.clientX - rect.left;
    const anchorTime = timeFromX(mouseX, metrics);
    const oldSpan = getViewSpan();
    const zoomFactor = event.deltaY < 0 ? 0.82 : 1.22;
    const nextSpan = clamp(oldSpan * zoomFactor, Math.min(2, state.duration), state.duration);
    const anchorRatio = clamp((anchorTime - state.viewStart) / oldSpan, 0, 1);
    setView(anchorTime - nextSpan * anchorRatio, nextSpan);
    draw();
  },
  { passive: false },
);

function moveViewFromMinimap(clientX) {
  if (!state.duration) return;
  const rect = minimap.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  const span = getViewSpan();
  const center = ratio * state.duration;
  setView(center - span / 2, span);
  draw();
}

minimap.addEventListener("pointerdown", (event) => {
  state.isDraggingMinimap = true;
  minimap.setPointerCapture(event.pointerId);
  moveViewFromMinimap(event.clientX);
});

minimap.addEventListener("pointermove", (event) => {
  if (!state.isDraggingMinimap) return;
  moveViewFromMinimap(event.clientX);
});

minimap.addEventListener("pointerup", (event) => {
  state.isDraggingMinimap = false;
  minimap.releasePointerCapture(event.pointerId);
});

minimap.addEventListener("pointercancel", () => {
  state.isDraggingMinimap = false;
});

undoButton.addEventListener("click", () => {
  const previous = state.history.pop();
  if (!previous) return;
  const previousState = JSON.parse(previous);
  if (Array.isArray(previousState)) {
    state.notes = previousState;
  } else {
    state.laneCount = previousState.laneCount || state.laneCount;
    state.selectedLane = previousState.selectedLane || 0;
    state.notes = previousState.notes || [];
  }
  refreshUi();
});

clearButton.addEventListener("click", () => {
  if (!state.notes.length) return;
  pushHistory();
  state.notes = [];
  refreshUi();
});

levelInput.addEventListener("change", () => {
  const file = levelInput.files[0];
  if (file) importLevel(file);
});

exportButton.addEventListener("click", exportLevel);
bpmInput.addEventListener("input", draw);
snapInput.addEventListener("change", draw);
lpbInput.addEventListener("input", draw);
lpbInput.addEventListener("change", () => {
  lpbInput.value = getLPB();
  draw();
});
laneCountInput.addEventListener("change", () => setLaneCount(laneCountInput.value));
autoFollowInput.addEventListener("change", () => {
  state.autoFollow = autoFollowInput.checked;
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.code === "Space" && !playButton.disabled) {
    event.preventDefault();
    playButton.click();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoButton.click();
  }
  if (/^[1-9]$/.test(event.key)) {
    const laneIndex = Number(event.key) - 1;
    if (laneIndex < state.laneCount) {
      state.selectedLane = laneIndex;
      draw();
    }
  }
});

setAudioEnabled(false);
resizeCanvas();
requestAnimationFrame(animationTick);
