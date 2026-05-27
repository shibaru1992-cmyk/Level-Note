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
const noteSizeInput = document.querySelector("#noteSizeInput");
const songMeta = document.querySelector("#songMeta");
const currentTimeLabel = document.querySelector("#currentTime");
const durationTimeLabel = document.querySelector("#durationTime");
const noteCount = document.querySelector("#noteCount");
const selectionCount = document.querySelector("#selectionCount");
const selectionInfo = document.querySelector("#selectionInfo");
const selectedNotesBody = document.querySelector("#selectedNotesBody");
const noteInspectorTab = document.querySelector("#noteInspectorTab");
const noteSettingTab = document.querySelector("#noteSettingTab");
const noteAnalysisTab = document.querySelector("#noteAnalysisTab");
const noteInspectorPanel = document.querySelector("#noteInspectorPanel");
const noteSettingPanel = document.querySelector("#noteSettingPanel");
const noteAnalysisPanel = document.querySelector("#noteAnalysisPanel");
const analysisElements = {
  kpiScore: document.querySelector("#kpiScore"),
  kpiDifficultyLabel: document.querySelector("#kpiDifficultyLabel"),
  kpiPeakNps: document.querySelector("#kpiPeakNps"),
  kpiAvgNps: document.querySelector("#kpiAvgNps"),
  kpiBpm: document.querySelector("#kpiBpm"),
  kpiTotalNotes: document.querySelector("#kpiTotalNotes"),
  kpiDuration: document.querySelector("#kpiDuration"),
  kpiMaxChord: document.querySelector("#kpiMaxChord"),
  npsChart: document.querySelector("#npsChart"),
  chordChart: document.querySelector("#chordChart"),
  radarChart: document.querySelector("#radarChart"),
  columnChart: document.querySelector("#columnChart"),
  patternTableBody: document.querySelector("#patternTableBody"),
  laneHeatmap: document.querySelector("#laneHeatmap"),
};
analysisElements.npsCtx = analysisElements.npsChart.getContext("2d");
analysisElements.chordCtx = analysisElements.chordChart.getContext("2d");
analysisElements.radarCtx = analysisElements.radarChart.getContext("2d");
analysisElements.columnCtx = analysisElements.columnChart.getContext("2d");
const metaKeyInput = document.querySelector("#metaKeyInput");
const metaValueInput = document.querySelector("#metaValueInput");
const addMetaButton = document.querySelector("#addMetaButton");
const removeMetaButton = document.querySelector("#removeMetaButton");
const laneCountInput = document.querySelector("#laneCount");
const lpbInput = document.querySelector("#lpbInput");
const contextMenu = document.querySelector("#contextMenu");
const copyMenuItem = document.querySelector("#copyMenuItem");
const pasteMenuItem = document.querySelector("#pasteMenuItem");
const deleteMenuItem = document.querySelector("#deleteMenuItem");
const inspectorResizeHandle = document.querySelector("#inspectorResizeHandle");
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
  selectedNoteIds: new Set(),
  selectionDrag: null,
  suppressNextPointerUp: false,
  copiedNotes: [],
  contextTarget: null,
  isResizingInspector: false,
  activeCurveId: null,
  curvePreviewPoint: null,
  activeHoldStart: null,
  holdPreviewPoint: null,
  editingPoint: null,
  nextNoteId: 1,
  autoFollow: true,
  activeInspectorTab: "inspector",
};

const renderAnalysis = createAnalysisRenderer({
  state,
  getBpm: () => Number(bpmInput.value) || 0,
  elements: analysisElements,
});

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

function getNoteSize() {
  return clamp(Number(noteSizeInput.value) || 9, Number(noteSizeInput.min), Number(noteSizeInput.max));
}

function playErrorSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + 0.12);
  gain.gain.setValueAtTime(0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.14);
  oscillator.addEventListener("ended", () => audioContext.close());
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

function createNoteId() {
  const id = `note_${state.nextNoteId}`;
  state.nextNoteId += 1;
  return id;
}

function normalizeNote(note) {
  if (!note.id) note.id = createNoteId();
  if (note.type === "curve") {
    if (!Array.isArray(note.points) || !note.points.length) {
      note.points = [
        { time: note.time || 0, lane: note.lane || 0 },
        { time: (note.time || 0) + (note.duration || 0), lane: note.lane || 0 },
      ];
    }
    note.points = note.points
      .filter((point) => point && Number.isFinite(Number(point.time)) && Number.isFinite(Number(point.lane)))
      .map((point) => ({
        time: Number(point.time),
        lane: clamp(Math.round(Number(point.lane)), 0, state.laneCount - 1),
      }));
    note.time = note.points[0]?.time || 0;
    note.lane = note.points[0]?.lane || 0;
    delete note.duration;
  }
  if (!Array.isArray(note.meta)) note.meta = [];
  note.meta = note.meta
    .filter((item) => item && typeof item.key === "string")
    .map((item) => ({ key: item.key, value: item.value ?? "" }));
  return note;
}

function getSelectedNotes() {
  return state.notes.filter((note) => state.selectedNoteIds.has(note.id));
}

function getNoteLaneDisplay(note) {
  if (note.type !== "curve") return String(note.lane + 1);
  return note.points.map((point) => point.lane + 1).join(" -> ");
}

function selectNotes(ids) {
  state.selectedNoteIds = new Set(ids);
  refreshUi();
}

function cloneNoteForClipboard(note) {
  return {
    time: note.time,
    lane: note.lane,
    type: note.type,
    ...(note.type === "hold" ? { duration: note.duration } : {}),
    ...(note.type === "curve" ? { points: note.points.map((point) => ({ ...point })) } : {}),
    meta: (note.meta || []).map((item) => ({ key: item.key, value: item.value })),
  };
}

function copySelectedNotes() {
  state.copiedNotes = getSelectedNotes().map(cloneNoteForClipboard);
}

function deleteSelectedNotes() {
  if (!state.selectedNoteIds.size) return;
  pushHistory();
  state.notes = state.notes.filter((note) => !state.selectedNoteIds.has(note.id));
  if (state.selectedNoteIds.has(state.activeCurveId)) state.activeCurveId = null;
  state.selectedNoteIds.clear();
  refreshUi();
}

function pasteCopiedNotes(targetTime, targetLane) {
  if (!state.copiedNotes.length || !state.duration) return;
  const baseTime = Math.min(...state.copiedNotes.map((note) => note.time));
  const baseLane = Math.min(...state.copiedNotes.map((note) => note.lane));
  const pasted = [];

  state.copiedNotes.forEach((source) => {
    const note = normalizeNote({
      ...cloneNoteForClipboard(source),
      id: createNoteId(),
      time: Number(clamp(snapTime(targetTime + source.time - baseTime), 0, state.duration).toFixed(3)),
      lane: clamp(targetLane + source.lane - baseLane, 0, state.laneCount - 1),
    });
    if (note.type === "curve") {
      note.points = source.points.map((point) => ({
        time: Number(clamp(snapTime(targetTime + point.time - baseTime), 0, state.duration).toFixed(3)),
        lane: clamp(targetLane + point.lane - baseLane, 0, state.laneCount - 1),
      }));
      note.time = note.points[0].time;
      note.lane = note.points[0].lane;
    }
    if (![...state.notes, ...pasted].some((existing) => notesOverlap(existing, note))) {
      pasted.push(note);
    }
  });

  if (!pasted.length) return;
  pushHistory();
  state.notes.push(...pasted);
  state.selectedNoteIds = new Set(pasted.map((note) => note.id));
  sortNotes();
  refreshUi();
}

function hideContextMenu() {
  contextMenu.hidden = true;
}

function showContextMenu(clientX, clientY, targetTime, targetLane) {
  state.contextTarget = { time: targetTime, lane: targetLane };
  copyMenuItem.disabled = state.selectedNoteIds.size === 0;
  deleteMenuItem.disabled = state.selectedNoteIds.size === 0;
  pasteMenuItem.disabled = state.copiedNotes.length === 0;
  contextMenu.hidden = false;

  const rect = contextMenu.getBoundingClientRect();
  const x = Math.min(clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(clientY, window.innerHeight - rect.height - 8);
  contextMenu.style.left = `${Math.max(8, x)}px`;
  contextMenu.style.top = `${Math.max(8, y)}px`;
}

function getNoteRange(note) {
  if (note.type === "curve") {
    const times = note.points.map((point) => point.time);
    return {
      start: Math.min(...times),
      end: Math.max(...times),
    };
  }
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
  if (a.type === "curve" || b.type === "curve") return false;
  if (a.lane !== b.lane) return false;
  const rangeA = getNoteRange(a);
  const rangeB = getNoteRange(b);
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

function isValidHoldPoints(start, end) {
  return start.lane === end.lane && end.time > start.time;
}

function getHoldEditPoints(note, edit, point) {
  return {
    start: edit.pointIndex === "start" ? point : { time: note.time, lane: note.lane },
    end: edit.pointIndex === "end" ? point : { time: note.time + note.duration, lane: note.lane },
  };
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
  renderAnalysis();
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

function isInTimePlot(x, y, metrics) {
  return (
    x >= metrics.padding.left &&
    x <= metrics.width - metrics.padding.right &&
    y >= metrics.padding.top &&
    y <= metrics.padding.top + metrics.lanePlotHeight
  );
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
  const noteSize = getNoteSize();
  const editing = state.editingPoint;
  ctx.save();
  ctx.beginPath();
  ctx.rect(metrics.padding.left, metrics.padding.top, metrics.plotWidth, metrics.lanePlotHeight);
  ctx.clip();
  state.notes.forEach((note) => {
    const lane = lanes[note.lane];
    if (!lane) return;
    const range = getNoteRange(note);
    const noteEnd = range.end;
    const noteStart = range.start;
    if (noteEnd < state.viewStart || noteStart > state.viewEnd) return;
    const x = xFromTime(note.time, metrics);
    const y = metrics.padding.top + note.lane * metrics.laneHeight + metrics.laneHeight / 2;
    const isSelected = state.selectedNoteIds.has(note.id);
    ctx.fillStyle = lane.color;
    ctx.strokeStyle = isSelected ? "#ffffff" : "#0b0d0f";
    if (note.type === "curve") {
      const renderedPoints = note.points.map((point, index) =>
        editing?.noteId === note.id && editing.kind === "curve" && editing.pointIndex === index && editing.preview
          ? editing.preview
          : point,
      );
      for (let index = 0; index < renderedPoints.length - 1; index += 1) {
        const from = renderedPoints[index];
        const to = renderedPoints[index + 1];
        const segmentIsEditing =
          editing?.noteId === note.id &&
          editing.kind === "curve" &&
          (editing.pointIndex === index || editing.pointIndex === index + 1);
        ctx.save();
        if (segmentIsEditing) ctx.setLineDash([8, 6]);
        ctx.lineWidth = Math.max(3, noteSize * 0.45);
        ctx.strokeStyle = lane.color;
        ctx.beginPath();
        ctx.moveTo(xFromTime(from.time, metrics), metrics.padding.top + from.lane * metrics.laneHeight + metrics.laneHeight / 2);
        ctx.lineTo(xFromTime(to.time, metrics), metrics.padding.top + to.lane * metrics.laneHeight + metrics.laneHeight / 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 1;
      note.points.forEach((point, index) => {
        const renderedPoint =
          editing?.noteId === note.id && editing.kind === "curve" && editing.pointIndex === index && editing.preview
            ? editing.preview
            : point;
        const isEditingPoint = editing?.noteId === note.id && editing.kind === "curve" && editing.pointIndex === index;
        const pointLane = lanes[renderedPoint.lane];
        if (!pointLane) return;
        ctx.fillStyle = pointLane.color;
        ctx.strokeStyle = isSelected || note.id === state.activeCurveId || isEditingPoint ? "#ffffff" : "#0b0d0f";
        ctx.beginPath();
        ctx.arc(
          xFromTime(renderedPoint.time, metrics),
          metrics.padding.top + renderedPoint.lane * metrics.laneHeight + metrics.laneHeight / 2,
          isSelected || note.id === state.activeCurveId || isEditingPoint ? noteSize + 2 : noteSize,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.lineWidth = isSelected || note.id === state.activeCurveId || isEditingPoint ? 3 : 1;
        ctx.stroke();
        ctx.lineWidth = 1;
      });
      if (note.id === state.activeCurveId && state.curvePreviewPoint && note.points.length) {
        const lastPoint = note.points[note.points.length - 1];
        const lastLane = lanes[lastPoint.lane];
        const previewLane = lanes[state.curvePreviewPoint.lane];
        if (lastLane && previewLane) {
          ctx.save();
          ctx.setLineDash([8, 6]);
          ctx.lineWidth = Math.max(2, noteSize * 0.32);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
          ctx.beginPath();
          ctx.moveTo(
            xFromTime(lastPoint.time, metrics),
            metrics.padding.top + lastPoint.lane * metrics.laneHeight + metrics.laneHeight / 2,
          );
          ctx.lineTo(
            xFromTime(state.curvePreviewPoint.time, metrics),
            metrics.padding.top + state.curvePreviewPoint.lane * metrics.laneHeight + metrics.laneHeight / 2,
          );
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = previewLane.color;
          ctx.strokeStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(
            xFromTime(state.curvePreviewPoint.time, metrics),
            metrics.padding.top + state.curvePreviewPoint.lane * metrics.laneHeight + metrics.laneHeight / 2,
            noteSize,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      return;
    }
    if (note.type === "hold") {
      const holdStart =
        editing?.noteId === note.id && editing.kind === "hold" && editing.pointIndex === "start" && editing.preview
          ? editing.preview
          : { time: note.time, lane: note.lane };
      const holdEnd =
        editing?.noteId === note.id && editing.kind === "hold" && editing.pointIndex === "end" && editing.preview
          ? editing.preview
          : { time: note.time + note.duration, lane: note.lane };
      const startX = xFromTime(holdStart.time, metrics);
      const startY = metrics.padding.top + holdStart.lane * metrics.laneHeight + metrics.laneHeight / 2;
      const endX = xFromTime(holdEnd.time, metrics);
      const endY = metrics.padding.top + holdEnd.lane * metrics.laneHeight + metrics.laneHeight / 2;
      const isEditingHold = editing?.noteId === note.id && editing.kind === "hold";
      const isValidEdit = !isEditingHold || !editing.preview || validateEditedPoint(note, editing, editing.preview);
      ctx.save();
      if (isEditingHold) ctx.setLineDash([8, 6]);
      ctx.lineWidth = Math.max(3, noteSize * 0.45);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = isEditingHold && !isValidEdit ? "rgba(255, 107, 107, 0.95)" : lane.color;
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0b0d0f";
      ctx.fillStyle = holdEnd.lane === note.lane ? lane.color : "rgba(255, 107, 107, 0.95)";
      ctx.beginPath();
      ctx.arc(endX, endY, isSelected || (isEditingHold && editing.pointIndex === "end") ? noteSize + 2 : noteSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = isSelected || (isEditingHold && editing.pointIndex === "end") ? 3 : 1;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = holdStart.lane === note.lane ? lane.color : "rgba(255, 107, 107, 0.95)";
      ctx.beginPath();
      ctx.arc(startX, startY, isSelected || (isEditingHold && editing.pointIndex === "start") ? noteSize + 2 : noteSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = isSelected || (isEditingHold && editing.pointIndex === "start") ? 3 : 1;
      ctx.stroke();
      ctx.lineWidth = 1;
      return;
    }
    ctx.beginPath();
    ctx.arc(x, y, isSelected ? noteSize + 2 : noteSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();
    ctx.lineWidth = 1;
  });

  if (state.selectionDrag) {
    const { startX, startY, currentX, currentY } = state.selectionDrag;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    ctx.fillStyle = "rgba(98, 168, 255, 0.16)";
    ctx.strokeStyle = "#62a8ff";
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);
  }

  if (state.activeHoldStart) {
    const start = state.activeHoldStart;
    const preview = state.holdPreviewPoint || start;
    const lane = lanes[start.lane];
    if (lane) {
      const startX = xFromTime(start.time, metrics);
      const startY = metrics.padding.top + start.lane * metrics.laneHeight + metrics.laneHeight / 2;
      const previewX = xFromTime(preview.time, metrics);
      const previewY = metrics.padding.top + preview.lane * metrics.laneHeight + metrics.laneHeight / 2;
      const isValid = isValidHoldPoints(start, preview);
      ctx.save();
      ctx.setLineDash(isValid ? [8, 6] : [3, 5]);
      ctx.lineWidth = Math.max(2, noteSize * 0.36);
      ctx.strokeStyle = isValid ? lane.color : "rgba(255, 107, 107, 0.95)";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(previewX, previewY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = lane.color;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(startX, startY, noteSize + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (preview !== start) {
        ctx.fillStyle = isValid ? lane.color : "rgba(255, 107, 107, 0.95)";
        ctx.beginPath();
        ctx.arc(previewX, previewY, noteSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.restore();
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
  renderInspector();
  renderAnalysis();
  draw();
}

function renderInspector() {
  const selectedNotes = getSelectedNotes();
  selectionCount.textContent = `${selectedNotes.length} selected`;
  if (!selectedNotes.length) {
    selectionInfo.textContent = "Click note de select, drag de select nhieu note";
  } else if (selectedNotes.length === 1) {
    const note = selectedNotes[0];
    selectionInfo.textContent = `${formatTime(note.time)} | Lane ${getNoteLaneDisplay(note)} | ${note.type}`;
  } else {
    selectionInfo.textContent = `${selectedNotes.length} notes dang duoc select`;
  }
  addMetaButton.disabled = selectedNotes.length === 0;
  removeMetaButton.disabled = selectedNotes.length === 0;
  selectedNotesBody.innerHTML = selectedNotes
    .map(
      (note) => `<tr>
        <td>${formatTime(note.time)}</td>
        <td>${getNoteLaneDisplay(note)}</td>
        <td>${note.type}</td>
        <td>${note.meta.map((item) => `${item.key}: ${item.value}`).join(", ") || "-"}</td>
      </tr>`,
    )
    .join("");
}

function setInspectorTab(tab) {
  state.activeInspectorTab = tab;
  const isInspector = tab === "inspector";
  const isSetting = tab === "setting";
  const isAnalysis = tab === "analysis";
  noteInspectorTab.classList.toggle("active", isInspector);
  noteSettingTab.classList.toggle("active", isSetting);
  noteAnalysisTab.classList.toggle("active", isAnalysis);
  noteInspectorTab.setAttribute("aria-selected", String(isInspector));
  noteSettingTab.setAttribute("aria-selected", String(isSetting));
  noteAnalysisTab.setAttribute("aria-selected", String(isAnalysis));
  noteInspectorPanel.hidden = !isInspector;
  noteSettingPanel.hidden = !isSetting;
  noteAnalysisPanel.hidden = !isAnalysis;
  if (isAnalysis) {
    resizeCanvas();
    renderAnalysis();
  }
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
  if (type === "curve") {
    addCurvePoint(time, lane);
    return;
  }
  if (type === "hold") {
    addHoldPoint(time, lane);
    return;
  }
  const note = {
    id: createNoteId(),
    time: Number(snapTime(time).toFixed(3)),
    lane,
    type,
    meta: [],
  };
  if (hasOverlappingNote(note)) return;
  pushHistory();
  state.notes.push(note);
  state.selectedNoteIds = new Set([note.id]);
  sortNotes();
  refreshUi();
}

function addHoldPoint(time, lane) {
  const point = {
    time: Number(snapTime(time).toFixed(3)),
    lane,
  };

  if (!state.activeHoldStart) {
    state.activeHoldStart = point;
    state.holdPreviewPoint = point;
    state.selectedNoteIds.clear();
    refreshUi();
    return;
  }

  if (!isValidHoldPoints(state.activeHoldStart, point)) {
    state.holdPreviewPoint = point;
    playErrorSound();
    draw();
    return;
  }

  const note = {
    id: createNoteId(),
    time: state.activeHoldStart.time,
    lane: state.activeHoldStart.lane,
    type: "hold",
    duration: Number((point.time - state.activeHoldStart.time).toFixed(3)),
    meta: [],
  };

  if (hasOverlappingNote(note)) {
    playErrorSound();
    draw();
    return;
  }

  pushHistory();
  state.notes.push(note);
  state.selectedNoteIds = new Set([note.id]);
  state.activeHoldStart = null;
  state.holdPreviewPoint = null;
  sortNotes();
  refreshUi();
}

function cancelActiveHold() {
  if (!state.activeHoldStart) return false;
  state.activeHoldStart = null;
  state.holdPreviewPoint = null;
  refreshUi();
  return true;
}

function startEditPoint(hit) {
  const isCurveTail = hit.kind === "curve" && hit.pointIndex === hit.note.points.length - 1;

  state.editingPoint = {
    noteId: hit.note.id,
    kind: hit.kind,
    pointIndex: hit.pointIndex,
    preview: null,
  };
  state.selectedNoteIds = new Set([hit.note.id]);
  hideContextMenu();
  if (isCurveTail) {
    state.activeCurveId = hit.note.id;
    state.curvePreviewPoint = null;
  } else {
    finishActiveCurve();
  }
  cancelActiveHold();
  refreshUi();
}

function cancelEditPoint() {
  if (!state.editingPoint) return false;
  state.editingPoint = null;
  refreshUi();
  return true;
}

function validateEditedPoint(note, edit, point) {
  if (edit.kind === "hold") {
    const { start, end } = getHoldEditPoints(note, edit, point);
    return isValidHoldPoints(start, end);
  }

  if (edit.kind === "curve") {
    return point.lane >= 0 && point.lane < state.laneCount;
  }

  return false;
}

function commitEditPoint(point) {
  const edit = state.editingPoint;
  if (!edit) return false;
  const note = state.notes.find((item) => item.id === edit.noteId);
  if (!note) {
    state.editingPoint = null;
    return false;
  }
  if (!validateEditedPoint(note, edit, point)) {
    state.editingPoint.preview = point;
    playErrorSound();
    draw();
    return true;
  }

  const nextNote = structuredClone(note);
  const keepCurveActive = edit.kind === "curve" && edit.pointIndex === note.points.length - 1;
  if (edit.kind === "hold") {
    const { start, end } = getHoldEditPoints(note, edit, point);
    nextNote.time = start.time;
    nextNote.lane = start.lane;
    nextNote.duration = Number((end.time - start.time).toFixed(3));
  } else {
    nextNote.points[edit.pointIndex] = point;
    nextNote.time = nextNote.points[0].time;
    nextNote.lane = nextNote.points[0].lane;
  }
  normalizeNote(nextNote);

  const otherNotes = state.notes.filter((item) => item.id !== note.id);
  if (otherNotes.some((existing) => notesOverlap(existing, nextNote))) {
    state.editingPoint.preview = point;
    playErrorSound();
    draw();
    return true;
  }

  pushHistory();
  Object.assign(note, nextNote);
  sortNotes();
  state.editingPoint = null;
  if (keepCurveActive) {
    state.activeCurveId = note.id;
    state.curvePreviewPoint = null;
  }
  refreshUi();
  return true;
}

function addCurvePoint(time, lane) {
  const point = {
    time: Number(snapTime(time).toFixed(3)),
    lane,
  };
  let curve = state.notes.find((note) => note.id === state.activeCurveId && note.type === "curve");

  if (!curve) {
    curve = normalizeNote({
      id: createNoteId(),
      time: point.time,
      lane: point.lane,
      type: "curve",
      points: [point],
      meta: [],
    });
    pushHistory();
    state.notes.push(curve);
    state.activeCurveId = curve.id;
    state.selectedNoteIds = new Set([curve.id]);
  } else {
    pushHistory();
    curve.points.push(point);
    curve.time = curve.points[0].time;
    curve.lane = curve.points[0].lane;
    state.selectedNoteIds = new Set([curve.id]);
  }

  sortNotes();
  state.curvePreviewPoint = null;
  refreshUi();
}

function finishActiveCurve() {
  if (!state.activeCurveId) return false;
  const curve = state.notes.find((note) => note.id === state.activeCurveId);
  if (curve && curve.points.length < 2) {
    pushHistory();
    state.notes = state.notes.filter((note) => note.id !== curve.id);
    state.selectedNoteIds.delete(curve.id);
  }
  state.activeCurveId = null;
  state.curvePreviewPoint = null;
  refreshUi();
  return true;
}

function exportLevel() {
  const payload = {
    version: 1,
    song: state.songName || "untitled",
    bpm: Number(bpmInput.value),
    lpb: getLPB(),
    lanes: state.laneCount,
    duration: Number((state.duration || 0).toFixed(3)),
    notes: state.notes.map((note) => ({
      id: note.id,
      time: note.time,
      lane: note.lane,
      type: note.type,
      ...(note.type === "hold" ? { duration: note.duration } : {}),
      ...(note.type === "curve" ? { points: note.points.map((point) => ({ ...point })) } : {}),
      meta: note.meta || [],
    })),
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
    const importedNotes = Array.isArray(data.notes)
      ? data.notes.map(normalizeNote).filter((note) => note.lane >= 0 && note.lane < state.laneCount)
      : [];
    state.notes = removeOverlappingNotes(importedNotes);
    state.selectedNoteIds.clear();
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
  state.notes = state.notes
    .map((note) => {
      if (note.type === "curve") {
        note.points = note.points.filter((point) => point.lane < state.laneCount);
        note.time = note.points[0]?.time || note.time;
        note.lane = note.points[0]?.lane || note.lane;
      }
      return note;
    })
    .filter((note) => (note.type === "curve" ? note.points.length >= 2 : note.lane < state.laneCount));
  if (!state.notes.some((note) => note.id === state.activeCurveId)) state.activeCurveId = null;
  state.selectedNoteIds = new Set([...state.selectedNoteIds].filter((id) => state.notes.some((note) => note.id === id)));
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

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (!contextMenu.hidden) {
    hideContextMenu();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (!isInTimePlot(x, y, metrics)) return;
  const lane = laneFromY(y, metrics);
  if (lane === null) return;

  if (event.detail >= 2) {
    const hit = findEditablePointAt(x, y, metrics);
    if (hit) {
      state.selectionDrag = null;
      state.suppressNextPointerUp = true;
      startEditPoint(hit);
      return;
    }
  }

  if (state.editingPoint) {
    commitEditPoint({
      time: Number(snapTime(timeFromX(x, metrics)).toFixed(3)),
      lane,
    });
    return;
  }

  const editableHit = findEditablePointAt(x, y, metrics);
  const note = noteType.value === "curve" && state.activeCurveId ? null : editableHit?.note || findNoteAt(x, y, metrics);
  state.selectionDrag = {
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
    lane,
    noteId: note?.id || null,
    moved: false,
  };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (state.editingPoint) {
    if (isInTimePlot(x, y, metrics)) {
      state.editingPoint.preview = {
        time: Number(snapTime(timeFromX(x, metrics)).toFixed(3)),
        lane: laneFromY(y, metrics),
      };
    } else {
      state.editingPoint.preview = null;
    }
    draw();
    return;
  }

  if (state.activeHoldStart && !state.selectionDrag) {
    if (isInTimePlot(x, y, metrics)) {
      state.holdPreviewPoint = {
        time: Number(snapTime(timeFromX(x, metrics)).toFixed(3)),
        lane: laneFromY(y, metrics),
      };
    } else {
      state.holdPreviewPoint = null;
    }
    draw();
    return;
  }

  if (state.activeCurveId && !state.selectionDrag) {
    if (isInTimePlot(x, y, metrics)) {
      state.curvePreviewPoint = {
        time: Number(snapTime(timeFromX(x, metrics)).toFixed(3)),
        lane: laneFromY(y, metrics),
      };
    } else {
      state.curvePreviewPoint = null;
    }
    draw();
    return;
  }

  if (!state.selectionDrag) return;
  state.selectionDrag.currentX = x;
  state.selectionDrag.currentY = y;
  state.selectionDrag.moved = Math.abs(x - state.selectionDrag.startX) > 4 || Math.abs(y - state.selectionDrag.startY) > 4;
  draw();
});

canvas.addEventListener("pointerup", (event) => {
  if (state.suppressNextPointerUp) {
    state.suppressNextPointerUp = false;
    return;
  }
  if (!state.selectionDrag) return;
  const metrics = getCanvasMetrics();
  const drag = state.selectionDrag;
  state.selectionDrag = null;
  canvas.releasePointerCapture(event.pointerId);
  if (drag.moved) {
    selectNotes(findNotesInRect(drag, metrics));
    return;
  }
  if (drag.noteId) {
    selectNotes([drag.noteId]);
    return;
  }
  state.selectedLane = drag.lane;
  addNote(timeFromX(drag.startX, metrics), drag.lane);
});

canvas.addEventListener("pointercancel", () => {
  state.selectionDrag = null;
  state.curvePreviewPoint = null;
  state.holdPreviewPoint = null;
  draw();
});

canvas.addEventListener("dblclick", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (!isInTimePlot(x, y, metrics)) return;
  const hit = findEditablePointAt(x, y, metrics);
  if (hit) startEditPoint(hit);
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (cancelEditPoint()) return;
  if (finishActiveCurve()) return;
  if (cancelActiveHold()) return;
  const rect = canvas.getBoundingClientRect();
  const metrics = getCanvasMetrics();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (!isInTimePlot(x, y, metrics)) {
    hideContextMenu();
    return;
  }
  const lane = laneFromY(y, metrics);
  if (lane === null) {
    hideContextMenu();
    return;
  }
  showContextMenu(event.clientX, event.clientY, timeFromX(x, metrics), lane);
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

function findNoteAt(x, y, metrics) {
  const noteSize = getNoteSize();
  const hitPadding = Math.max(6, noteSize * 0.6);
  for (let i = state.notes.length - 1; i >= 0; i -= 1) {
    const note = state.notes[i];
    if (note.lane >= state.laneCount) continue;
    if (note.type === "curve") {
      const hitCurvePoint = note.points.some((point) => {
        const pointX = xFromTime(point.time, metrics);
        const pointY = metrics.padding.top + point.lane * metrics.laneHeight + metrics.laneHeight / 2;
        return Math.abs(x - pointX) <= noteSize + hitPadding && Math.abs(y - pointY) <= noteSize + hitPadding;
      });
      if (hitCurvePoint) return note;
      continue;
    }
    const noteX = xFromTime(note.time, metrics);
    const noteY = metrics.padding.top + note.lane * metrics.laneHeight + metrics.laneHeight / 2;
    const noteEndX = note.type === "hold" ? xFromTime(note.time + note.duration, metrics) : noteX;
    const left = Math.min(noteX, noteEndX) - noteSize - hitPadding;
    const right = Math.max(noteX, noteEndX) + noteSize + hitPadding;
    if (x >= left && x <= right && Math.abs(y - noteY) <= noteSize + hitPadding) return note;
  }
  return null;
}

function findEditablePointAt(x, y, metrics) {
  const noteSize = getNoteSize();
  const hitPadding = Math.max(6, noteSize * 0.6);
  for (let i = state.notes.length - 1; i >= 0; i -= 1) {
    const note = state.notes[i];
    if (note.type === "hold") {
      const points = [
        { role: "start", time: note.time, lane: note.lane },
        { role: "end", time: note.time + note.duration, lane: note.lane },
      ];
      for (const point of points) {
        const pointX = xFromTime(point.time, metrics);
        const pointY = metrics.padding.top + point.lane * metrics.laneHeight + metrics.laneHeight / 2;
        if (Math.abs(x - pointX) <= noteSize + hitPadding && Math.abs(y - pointY) <= noteSize + hitPadding) {
          return { note, kind: "hold", pointIndex: point.role };
        }
      }
    }

    if (note.type === "curve") {
      for (let pointIndex = note.points.length - 1; pointIndex >= 0; pointIndex -= 1) {
        const point = note.points[pointIndex];
        const pointX = xFromTime(point.time, metrics);
        const pointY = metrics.padding.top + point.lane * metrics.laneHeight + metrics.laneHeight / 2;
        if (Math.abs(x - pointX) <= noteSize + hitPadding && Math.abs(y - pointY) <= noteSize + hitPadding) {
          return { note, kind: "curve", pointIndex };
        }
      }
    }
  }
  return null;
}

function findNotesInRect(rect, metrics) {
  const left = Math.min(rect.startX, rect.currentX);
  const right = Math.max(rect.startX, rect.currentX);
  const top = Math.min(rect.startY, rect.currentY);
  const bottom = Math.max(rect.startY, rect.currentY);
  return state.notes
    .filter((note) => {
      if (note.type === "curve") {
        return note.points.some((point) => {
          const x = xFromTime(point.time, metrics);
          const y = metrics.padding.top + point.lane * metrics.laneHeight + metrics.laneHeight / 2;
          return x >= left && x <= right && y >= top && y <= bottom;
        });
      }
      const x = xFromTime(note.time, metrics);
      const y = metrics.padding.top + note.lane * metrics.laneHeight + metrics.laneHeight / 2;
      return x >= left && x <= right && y >= top && y <= bottom;
    })
    .map((note) => note.id);
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
    state.notes = previousState.map(normalizeNote);
  } else {
    state.laneCount = previousState.laneCount || state.laneCount;
    state.selectedLane = previousState.selectedLane || 0;
    state.notes = (previousState.notes || []).map(normalizeNote);
  }
  state.selectedNoteIds.clear();
  refreshUi();
});

clearButton.addEventListener("click", () => {
  if (!state.notes.length) return;
  pushHistory();
  state.notes = [];
  state.selectedNoteIds.clear();
  refreshUi();
});

noteInspectorTab.addEventListener("click", () => setInspectorTab("inspector"));
noteSettingTab.addEventListener("click", () => setInspectorTab("setting"));
noteAnalysisTab.addEventListener("click", () => setInspectorTab("analysis"));

addMetaButton.addEventListener("click", () => {
  const key = metaKeyInput.value.trim();
  if (!key || !state.selectedNoteIds.size) return;
  pushHistory();
  const value = metaValueInput.value;
  getSelectedNotes().forEach((note) => {
    const existing = note.meta.find((item) => item.key === key);
    if (existing) existing.value = value;
    else note.meta.push({ key, value });
  });
  metaKeyInput.value = "";
  metaValueInput.value = "";
  refreshUi();
});

removeMetaButton.addEventListener("click", () => {
  const key = metaKeyInput.value.trim();
  if (!key || !state.selectedNoteIds.size) return;
  pushHistory();
  getSelectedNotes().forEach((note) => {
    note.meta = note.meta.filter((item) => item.key !== key);
  });
  refreshUi();
});

copyMenuItem.addEventListener("click", () => {
  if (copyMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  copySelectedNotes();
  hideContextMenu();
});

pasteMenuItem.addEventListener("click", () => {
  if (pasteMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  if (state.contextTarget) {
    pasteCopiedNotes(state.contextTarget.time, state.contextTarget.lane);
  }
  hideContextMenu();
});

deleteMenuItem.addEventListener("click", () => {
  if (deleteMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  deleteSelectedNotes();
  hideContextMenu();
});

contextMenu.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

document.addEventListener("pointerdown", (event) => {
  if (!contextMenu.hidden && !contextMenu.contains(event.target)) {
    hideContextMenu();
  }
});

inspectorResizeHandle.addEventListener("pointerdown", (event) => {
  state.isResizingInspector = true;
  inspectorResizeHandle.setPointerCapture(event.pointerId);
});

inspectorResizeHandle.addEventListener("pointermove", (event) => {
  if (!state.isResizingInspector) return;
  const shellPadding = window.innerWidth <= 820 ? 10 : 16;
  const maxHeight = Math.min(window.innerHeight * 0.55, 520);
  const height = clamp(window.innerHeight - event.clientY - shellPadding, 150, maxHeight);
  document.querySelector(".app-shell").style.setProperty("--inspector-height", `${height}px`);
  resizeCanvas();
});

inspectorResizeHandle.addEventListener("pointerup", (event) => {
  state.isResizingInspector = false;
  inspectorResizeHandle.releasePointerCapture(event.pointerId);
});

inspectorResizeHandle.addEventListener("pointercancel", () => {
  state.isResizingInspector = false;
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
noteSizeInput.addEventListener("input", draw);
noteType.addEventListener("change", () => {
  if (noteType.value !== "curve") finishActiveCurve();
  if (noteType.value !== "hold") cancelActiveHold();
});
laneCountInput.addEventListener("change", () => setLaneCount(laneCountInput.value));
autoFollowInput.addEventListener("change", () => {
  state.autoFollow = autoFollowInput.checked;
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    hideContextMenu();
    cancelEditPoint();
    cancelActiveHold();
    finishActiveCurve();
    selectNotes([]);
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.selectedNoteIds.size) {
      event.preventDefault();
      hideContextMenu();
      deleteSelectedNotes();
    }
    return;
  }
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
