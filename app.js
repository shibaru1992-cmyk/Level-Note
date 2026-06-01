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
const noteInspectorTab = document.querySelector("#noteInspectorTab");
const noteSettingTab = document.querySelector("#noteSettingTab");
const noteAnalysisTab = document.querySelector("#noteAnalysisTab");
const noteAutomationTab = document.querySelector("#noteAutomationTab");
const noteInspectorPanel = document.querySelector("#noteInspectorPanel");
const noteSettingPanel = document.querySelector("#noteSettingPanel");
const noteAnalysisPanel = document.querySelector("#noteAnalysisPanel");
const noteAutomationPanel = document.querySelector("#noteAutomationPanel");
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
const inspectorContent = document.querySelector("#inspectorContent");
const metaEditorSection = document.querySelector("#metaEditorSection");
const metaChipsEl = document.querySelector("#metaChips");
const laneCountInput = document.querySelector("#laneCount");
const lpbInput = document.querySelector("#lpbInput");
const offsetInput = document.querySelector("#offsetInput");
const contextMenu = document.querySelector("#contextMenu");
const copyMenuItem = document.querySelector("#copyMenuItem");
const pasteWithLaneMenuItem = document.querySelector("#pasteWithLaneMenuItem");
const pasteTimeOnlyMenuItem = document.querySelector("#pasteTimeOnlyMenuItem");
const mirrorSelectedMenuItem = document.querySelector("#mirrorSelectedMenuItem");
const deleteMenuItem = document.querySelector("#deleteMenuItem");
const pasteConflictModal = document.querySelector("#pasteConflictModal");
const pasteConflictMessage = document.querySelector("#pasteConflictMessage");
const replacePasteButton = document.querySelector("#replacePasteButton");
const appendPasteButton = document.querySelector("#appendPasteButton");
const cancelPasteButton = document.querySelector("#cancelPasteButton");
const inspectorResizeHandle = document.querySelector("#inspectorResizeHandle");
const metaKeysList = document.querySelector("#metaKeysList");
const metaKeyAddKey = document.querySelector("#metaKeyAddKey");
const metaKeyAddSubmit = document.querySelector("#metaKeyAddSubmit");
const colorModeInput = document.querySelector("#colorModeInput");
const colorByKeyWrap = document.querySelector("#colorByKeyWrap");
const colorByKeyInput = document.querySelector("#colorByKeyInput");
const typeColorRow = document.querySelector("#typeColorRow");
const typeColorTap = document.querySelector("#typeColorTap");
const typeColorHold = document.querySelector("#typeColorHold");
const typeColorCurve = document.querySelector("#typeColorCurve");
const metaKeyDefModal = document.querySelector("#metaKeyDefModal");
const metaKeyDefModalTitle = document.querySelector("#metaKeyDefModalTitle");
const metaKeyDefModalUsage = document.querySelector("#metaKeyDefModalUsage");
const metaKeyDefFields = document.querySelector("#metaKeyDefFields");
const metaKeyDefModalLabel = document.querySelector("#metaKeyDefModalLabel");
const metaKeyDefModalKey = document.querySelector("#metaKeyDefModalKey");
const metaKeyDefModalOverride = document.querySelector("#metaKeyDefModalOverride");
const metaKeyDefModalDefOnly = document.querySelector("#metaKeyDefModalDefOnly");
const metaKeyDefModalCancel = document.querySelector("#metaKeyDefModalCancel");
const editMetaModal = document.querySelector("#editMetaModal");
const editMetaModalNote = document.querySelector("#editMetaModalNote");
const editMetaRows = document.querySelector("#editMetaRows");
const editMetaAddKey = document.querySelector("#editMetaAddKey");
const editMetaAddValue = document.querySelector("#editMetaAddValue");
const editMetaAddRowBtn = document.querySelector("#editMetaAddRowBtn");
const editMetaApply = document.querySelector("#editMetaApply");
const editMetaCancel = document.querySelector("#editMetaCancel");
const hitSoundInput = document.querySelector("#hitSoundInput");
const createNoteSoundInput = document.querySelector("#createNoteSoundInput");
const hitSoundVol = document.querySelector("#hitSoundVol");
const createNoteSoundVol = document.querySelector("#createNoteSoundVol");
const metronomeInput = document.querySelector("#metronomeInput");
const metronomeVol = document.querySelector("#metronomeVol");
const rateGroup = document.querySelector(".rate-group");
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

const DEFAULT_TYPE_COLORS = { tap: "#62a8ff", hold: "#45d39a", curve: "#b98cff" };

const state = {
  songName: "",
  duration: 0,
  viewStart: 0,
  viewEnd: 0,
  waveform: null,
  audioBuffer: null,
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
  pendingPaste: null,
  isResizingInspector: false,
  activeCurveId: null,
  curvePreviewPoint: null,
  activeHoldStart: null,
  holdPreviewPoint: null,
  editingPoint: null,
  nextNoteId: 1,
  autoFollow: true,
  activeInspectorTab: "inspector",
  metaKeyDefs: [],
  metaKeyModalMode: null,
  metaKeyModalOriginalKey: null,
  metaKeyModalOriginalValue: null,
  editMetaNoteId: null,
  colorMode: "lane",
  colorByKey: null,
  typeColors: { ...DEFAULT_TYPE_COLORS },
};

const renderAnalysis = createAnalysisRenderer({
  state,
  getBpm: () => Number(bpmInput.value) || 0,
  elements: analysisElements,
});

const automationElements = {
  audioStatus: document.querySelector("#automationAudioStatus"),
  analyzeButton: document.querySelector("#automationAnalyzeButton"),
  algorithm: document.querySelector("#automationAlgorithm"),
  sensitivity: document.querySelector("#automationSensitivity"),
  sensitivityValue: document.querySelector("#automationSensitivityValue"),
  minGap: document.querySelector("#automationMinGap"),
  minGapValue: document.querySelector("#automationMinGapValue"),
  snapToggle: document.querySelector("#automationSnap"),
  laneStrategy: document.querySelector("#automationLaneStrategy"),
  noteType: document.querySelector("#automationNoteType"),
  npsCap: document.querySelector("#automationNpsCap"),
  timeRange: document.querySelector("#automationTimeRange"),
  bandMapRow: document.querySelector("#automationBandMapRow"),
  bandLow: document.querySelector("#automationBandLow"),
  bandMid: document.querySelector("#automationBandMid"),
  bandHigh: document.querySelector("#automationBandHigh"),
  stats: document.querySelector("#automationStats"),
  generateButton: document.querySelector("#automationGenerateButton"),
  applyMode: document.querySelector("#automationApplyMode"),
  applyButton: document.querySelector("#automationApplyButton"),
  clearButton: document.querySelector("#automationClearButton"),
};

const noteAutomation = createNoteAutomation({
  state,
  elements: automationElements,
  getBpm: () => Number(bpmInput.value) || 0,
  getLPB,
  getOffsetSeconds,
  createNoteId,
  hasOverlappingNote,
  pushHistory,
  sortNotes,
  refreshUi,
  draw,
  canvasCtx: ctx,
  getCanvasMetrics,
  xFromTime,
  getLanes,
  getNoteSize,
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
  const maxTime = state.duration || Number.POSITIVE_INFINITY;
  if (!snapInput.checked || !lpb || !bpm) return clamp(time, 0, maxTime);
  const step = 60 / bpm / lpb;
  const offset = getOffsetSeconds();
  return clamp(offset + Math.round((time - offset) / step) * step, 0, maxTime);
}

function getLPB() {
  return clamp(Math.round(Number(lpbInput.value) || 4), Number(lpbInput.min), Number(lpbInput.max));
}

function getOffsetMs() {
  return Math.max(0, Math.round(Number(offsetInput.value) || 0));
}

function getOffsetSeconds() {
  return getOffsetMs() / 1000;
}

function getNoteSize() {
  return clamp(Number(noteSizeInput.value) || 9, Number(noteSizeInput.min), Number(noteSizeInput.max));
}

let sharedAc = null;
function getSharedAc() {
  const Cls = window.AudioContext || window.webkitAudioContext;
  if (!Cls) return null;
  if (!sharedAc || sharedAc.state === "closed") sharedAc = new Cls();
  if (sharedAc.state === "suspended") sharedAc.resume();
  return sharedAc;
}

let noiseBuffer = null;
let noiseBufferAc = null;
function getNoiseBuffer(ac) {
  if (noiseBuffer && noiseBufferAc === ac) return noiseBuffer;
  const size = Math.floor(ac.sampleRate * 0.05);
  noiseBuffer = ac.createBuffer(1, size, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  noiseBufferAc = ac;
  return noiseBuffer;
}

function playHitSound(volume) {
  const ac = getSharedAc();
  if (!ac) return;
  const now = ac.currentTime;

  // Noise transient — "snap" click, 15ms
  const noise = ac.createBufferSource();
  noise.buffer = getNoiseBuffer(ac);
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2000;
  filter.Q.value = 0.8;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.02);

  // Sine body — ấm, 35ms
  const osc = ac.createOscillator();
  const oscGain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);
  oscGain.gain.setValueAtTime(volume * 0.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(oscGain);
  oscGain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function playCreateNoteSound() {
  if (!createNoteSoundInput.checked) return;
  const ac = getSharedAc();
  if (!ac) return;
  const now = ac.currentTime;
  const volume = Number(createNoteSoundVol.value);

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
  osc.frequency.exponentialRampToValueAtTime(480, now + 0.06);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume * 0.14, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.075);

  const click = ac.createOscillator();
  const clickGain = ac.createGain();
  click.type = "sine";
  click.frequency.setValueAtTime(700, now);
  clickGain.gain.setValueAtTime(volume * 0.04, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
  click.connect(clickGain);
  clickGain.connect(ac.destination);
  click.start(now);
  click.stop(now + 0.018);
}

function playMetronomeSound(isDownbeat, volume) {
  const ac = getSharedAc();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(isDownbeat ? 1000 : 660, ac.currentTime);
  gain.gain.setValueAtTime(volume * 0.1, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.035);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.035);
}

function tickHitSounds(from, to) {
  if (!hitSoundInput.checked) return;
  const vol = Number(hitSoundVol.value);
  const tickNotes = (notes) => notes.forEach((note) => {
    if (note.type === "curve") {
      note.points.forEach((pt) => {
        if (pt.time > from && pt.time <= to) playHitSound(vol);
      });
    } else {
      if (note.time > from && note.time <= to) playHitSound(vol);
    }
  });
  tickNotes(state.notes);
  tickNotes(noteAutomation.getPreviewNotes());
}

function tickMetronome(from, to) {
  if (!metronomeInput.checked) return;
  const bpm = Number(bpmInput.value);
  if (!bpm) return;
  const offset = getOffsetSeconds();
  const beat = 60 / bpm;
  const vol = Number(metronomeVol.value);
  const prevBeat = Math.floor((from - offset) / beat);
  const currBeat = Math.floor((to - offset) / beat);
  for (let i = prevBeat + 1; i <= currBeat; i += 1) {
    if (i >= 0) playMetronomeSound(i % 4 === 0, vol);
  }
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
      metaKeyDefs: state.metaKeyDefs,
      colorMode: state.colorMode,
      colorByKey: state.colorByKey,
      typeColors: state.typeColors,
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

function getNoteIdNumber(id) {
  const match = typeof id === "string" ? id.match(/^note_(\d+)$/) : null;
  return match ? Number(match[1]) : 0;
}

function syncNextNoteIdFromNotes(notes) {
  const maxId = notes.reduce((max, note) => Math.max(max, getNoteIdNumber(note.id)), 0);
  state.nextNoteId = Math.max(state.nextNoteId, maxId + 1, 1);
}

function ensureUniqueNoteIds(notes) {
  syncNextNoteIdFromNotes(notes);
  const used = new Set();
  notes.forEach((note) => {
    if (!note.id || used.has(note.id)) {
      do {
        note.id = createNoteId();
      } while (used.has(note.id));
    }
    used.add(note.id);
  });
  syncNextNoteIdFromNotes(notes);
  return notes;
}

function normalizeNoteMeta(meta) {
  if (Array.isArray(meta)) {
    return meta
      .filter((item) => item && typeof item.key === "string")
      .map((item) => ({ key: item.key, value: item.value ?? "" }));
  }
  if (meta && typeof meta === "object") {
    return Object.entries(meta).map(([key, value]) => ({ key, value: value ?? "" }));
  }
  return [];
}

function noteMetaToDictionary(meta) {
  return normalizeNoteMeta(meta).reduce((dict, item) => {
    dict[item.key] = item.value;
    return dict;
  }, {});
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
  note.meta = normalizeNoteMeta(note.meta);
  return note;
}

function getSelectedNotes() {
  return state.notes.filter((note) => state.selectedNoteIds.has(note.id));
}

function getNoteLaneDisplay(note) {
  if (note.type !== "curve") return String(note.lane + 1);
  return note.points.map((point) => point.lane + 1).join(" -> ");
}

function selectNotes(ids, append = false) {
  state.selectedNoteIds = append ? new Set([...state.selectedNoteIds, ...ids]) : new Set(ids);
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

function mirrorLane(lane) {
  return state.laneCount - 1 - lane;
}

function mirrorNote(note) {
  const mirrored = structuredClone(note);
  if (mirrored.type === "curve") {
    mirrored.points = mirrored.points.map((point) => ({ ...point, lane: mirrorLane(point.lane) }));
    mirrored.lane = mirrored.points[0]?.lane ?? mirrorLane(mirrored.lane);
  } else {
    mirrored.lane = mirrorLane(mirrored.lane);
  }
  return mirrored;
}

function getMirrorConflictPoints(note) {
  if (note.type === "curve") return note.points.map((point) => ({ time: point.time, lane: point.lane }));
  return getNoteHitPoints(note);
}

function mirrorNotesConflict(a, b) {
  return getMirrorConflictPoints(a).some((pointA) =>
    getMirrorConflictPoints(b).some((pointB) => pointA.lane === pointB.lane && Math.abs(pointA.time - pointB.time) < tapMinGap)
  );
}

function mirrorSelectedNotes() {
  const selected = getSelectedNotes();
  if (!selected.length) return;
  const selectedIds = new Set(selected.map((note) => note.id));
  const mirroredById = new Map(selected.map((note) => [note.id, mirrorNote(note)]));
  const nonSelected = state.notes.filter((note) => !selectedIds.has(note.id));
  const conflictCount = [...mirroredById.values()].filter((mirrored) =>
    nonSelected.some((existing) => mirrorNotesConflict(existing, mirrored))
  ).length;

  if (conflictCount) {
    window.ModalDialog?.alert({
      title: "Mirror blocked",
      message: `${conflictCount} mirrored note${conflictCount !== 1 ? "s" : ""} would overlap unselected notes.`,
      okText: "OK",
    });
    return;
  }

  pushHistory();
  state.notes.forEach((note) => {
    const mirrored = mirroredById.get(note.id);
    if (mirrored) Object.assign(note, mirrored);
  });
  sortNotes();
  refreshUi();
}

function getClipboardBaseLane(notes) {
  const lanes = notes.flatMap((note) => (note.type === "curve" ? note.points.map((point) => point.lane) : [note.lane]));
  return Math.min(...lanes);
}

function isNoteInLaneRange(note) {
  if (note.type === "curve") {
    return note.points.every((point) => point.lane >= 0 && point.lane < state.laneCount);
  }
  return note.lane >= 0 && note.lane < state.laneCount;
}

function preparePastedNotes(targetTime, targetLane, mode) {
  const baseTime = Math.min(...state.copiedNotes.map((note) => note.time));
  const laneOffset = mode === "withLane" ? targetLane - getClipboardBaseLane(state.copiedNotes) : 0;
  const candidates = [];

  state.copiedNotes.forEach((source) => {
    const note = normalizeNote({
      ...cloneNoteForClipboard(source),
      id: createNoteId(),
      time: Number(clamp(snapTime(targetTime + source.time - baseTime), 0, state.duration).toFixed(3)),
      lane: source.lane + laneOffset,
    });
    if (note.type === "curve") {
      note.points = source.points.map((point) => ({
        time: Number(clamp(snapTime(targetTime + point.time - baseTime), 0, state.duration).toFixed(3)),
        lane: point.lane + laneOffset,
      }));
      note.time = note.points[0].time;
      note.lane = note.points[0].lane;
    }
    if (isNoteInLaneRange(note) && !candidates.some((existing) => notesOverlap(existing, note))) candidates.push(note);
  });

  return candidates;
}

function getPasteConflicts(notes) {
  return state.notes.filter((existing) => notes.some((note) => notesOverlap(existing, note)));
}

function getPasteConflictCount(notes) {
  return notes.filter((note) => state.notes.some((existing) => notesOverlap(existing, note))).length;
}

function commitPaste(notes, conflicts, mode) {
  const pasted = mode === "append" ? notes.filter((note) => !conflicts.some((existing) => notesOverlap(existing, note))) : notes;
  if (!pasted.length) return;
  pushHistory();
  if (mode === "replace") {
    const conflictIds = new Set(conflicts.map((note) => note.id));
    state.notes = state.notes.filter((note) => !conflictIds.has(note.id));
    if (conflictIds.has(state.activeCurveId)) state.activeCurveId = null;
  }
  state.notes.push(...pasted);
  state.selectedNoteIds = new Set(pasted.map((note) => note.id));
  sortNotes();
  refreshUi();
}

function showPasteConflictModal(notes, conflicts) {
  state.pendingPaste = { notes, conflicts };
  pasteConflictMessage.textContent = `${getPasteConflictCount(notes)} conflicting notes.`;
  pasteConflictModal.hidden = false;
}

function hidePasteConflictModal() {
  pasteConflictModal.hidden = true;
  state.pendingPaste = null;
}

function pasteCopiedNotes(targetTime, targetLane, mode) {
  if (!state.copiedNotes.length || !state.duration) return;
  const candidates = preparePastedNotes(targetTime, targetLane, mode);
  if (!candidates.length) return;
  const conflicts = getPasteConflicts(candidates);
  if (conflicts.length) {
    showPasteConflictModal(candidates, conflicts);
    return;
  }
  commitPaste(candidates, [], "append");
}

function hideContextMenu() {
  contextMenu.hidden = true;
}

function showContextMenu(clientX, clientY, targetTime, targetLane) {
  state.contextTarget = { time: targetTime, lane: targetLane };
  copyMenuItem.disabled = state.selectedNoteIds.size === 0;
  mirrorSelectedMenuItem.disabled = state.selectedNoteIds.size === 0;
  deleteMenuItem.disabled = state.selectedNoteIds.size === 0;
  pasteWithLaneMenuItem.disabled = state.copiedNotes.length === 0;
  pasteTimeOnlyMenuItem.disabled = state.copiedNotes.length === 0;
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

function getNoteHitPoints(note) {
  if (note.type === "curve") return [];
  if (note.type === "hold") {
    return [
      { time: note.time, lane: note.lane },
      { time: note.time + (note.duration || 0), lane: note.lane },
    ];
  }
  return [{ time: note.time, lane: note.lane }];
}

function notesOverlap(a, b) {
  if (a.type === "curve" || b.type === "curve") return false;
  return getNoteHitPoints(a).some((pointA) =>
    getNoteHitPoints(b).some((pointB) => pointA.lane === pointB.lane && Math.abs(pointA.time - pointB.time) < tapMinGap)
  );
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
  if (typeof noteAutomation !== "undefined" && noteAutomation.isPreviewing()) {
    noteAutomation.renderPreview(metrics);
  }
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
    const samples = state.waveform.body || state.waveform.peaks || state.waveform;
    miniCtx.strokeStyle = "rgba(69, 211, 154, 0.55)";
    miniCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 1) {
      const sampleIndex = Math.floor((x / width) * samples.length);
      const peak = samples[sampleIndex] || 0;
      const barHeight = Math.max(1, peak * waveHeight);
      miniCtx.beginPath();
      miniCtx.moveTo(x, center - barHeight / 2);
      miniCtx.lineTo(x, center + barHeight / 2);
      miniCtx.stroke();
    }
  }

  state.notes.forEach((note) => {
    const x = (note.time / state.duration) * width;
    miniCtx.fillStyle = getNoteColor(note);
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
  const peakSamples = state.waveform.peaks || state.waveform;
  const bodySamples = state.waveform.body || peakSamples;
  const startIndex = Math.floor((state.viewStart / state.duration) * peakSamples.length);
  const endIndex = Math.ceil((state.viewEnd / state.duration) * peakSamples.length);
  const visibleSamples = Math.max(1, endIndex - startIndex);

  ctx.save();
  ctx.beginPath();
  ctx.rect(metrics.padding.left, top, metrics.plotWidth, waveHeight);
  ctx.clip();
  ctx.fillStyle = "rgba(69, 211, 154, 0.07)";
  ctx.fillRect(metrics.padding.left, top, metrics.plotWidth, waveHeight);
  ctx.lineWidth = 1;

  for (let x = 0; x < metrics.plotWidth; x += 1) {
    const sampleStart = startIndex + Math.floor((x / metrics.plotWidth) * visibleSamples);
    const sampleEnd = startIndex + Math.ceil(((x + 1) / metrics.plotWidth) * visibleSamples);
    let peak = 0;
    let bodySum = 0;
    let bodyCount = 0;
    for (let i = sampleStart; i <= sampleEnd && i < peakSamples.length; i += 1) {
      peak = Math.max(peak, peakSamples[i] || 0);
      bodySum += bodySamples[i] || 0;
      bodyCount += 1;
    }
    const peakHeight = Math.max(1, peak * waveHeight);
    const bodyHeight = Math.max(1, (bodyCount ? bodySum / bodyCount : 0) * waveHeight * 0.86);
    const drawX = metrics.padding.left + x;
    ctx.strokeStyle = "rgba(69, 211, 154, 0.18)";
    ctx.beginPath();
    ctx.moveTo(drawX, center - peakHeight / 2);
    ctx.lineTo(drawX, center + peakHeight / 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(69, 211, 154, 0.72)";
    ctx.beginPath();
    ctx.moveTo(drawX, center - bodyHeight / 2);
    ctx.lineTo(drawX, center + bodyHeight / 2);
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
  const offset = getOffsetSeconds();
  ctx.textAlign = "center";
  const firstLine = Math.max(0, Math.floor((state.viewStart - offset) / lineStep));
  const lastLine = Math.ceil((state.viewEnd - offset) / lineStep);
  for (let line = firstLine; line <= lastLine; line += 1) {
    const time = offset + line * lineStep;
    if (time > state.duration) continue;
    const x = xFromTime(time, metrics);
    const isFirstBeat = line === 0;
    const isBeat = line % lpb === 0;
    const isBar = isBeat && Math.round(line / lpb) % 4 === 0;
    ctx.strokeStyle = isFirstBeat ? "#45d39a" : "#2d343c";
    ctx.fillStyle = isFirstBeat ? "#45d39a" : "#7d8995";
    ctx.globalAlpha = isFirstBeat ? 1 : isBar ? 0.9 : isBeat ? 0.55 : 0.22;
    ctx.beginPath();
    ctx.moveTo(x, metrics.padding.top);
    ctx.lineTo(x, metrics.height - metrics.padding.bottom);
    ctx.stroke();
    if (isFirstBeat) ctx.fillText("1:1", x, 14);
    else if (isBar) ctx.fillText(String(Math.round(line / (lpb * 4)) + 1), x, 14);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#2d343c";
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
    const noteColor = getNoteColor(note);
    ctx.fillStyle = noteColor;
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
        ctx.strokeStyle = getPointColor(note, from.lane);
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
        ctx.fillStyle = getPointColor(note, renderedPoint.lane);
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
          ctx.fillStyle = getPointColor(note, state.curvePreviewPoint.lane);
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
      ctx.strokeStyle = isEditingHold && !isValidEdit ? "rgba(255, 107, 107, 0.95)" : noteColor;
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0b0d0f";
      ctx.fillStyle = holdEnd.lane === note.lane ? noteColor : "rgba(255, 107, 107, 0.95)";
      ctx.beginPath();
      ctx.arc(endX, endY, isSelected || (isEditingHold && editing.pointIndex === "end") ? noteSize + 2 : noteSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = isSelected || (isEditingHold && editing.pointIndex === "end") ? 3 : 1;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = holdStart.lane === note.lane ? noteColor : "rgba(255, 107, 107, 0.95)";
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
      const previewColor = state.colorMode === "meta" ? state.typeColors.hold : lane.color;
      ctx.save();
      ctx.setLineDash(isValid ? [8, 6] : [3, 5]);
      ctx.lineWidth = Math.max(2, noteSize * 0.36);
      ctx.strokeStyle = isValid ? previewColor : "rgba(255, 107, 107, 0.95)";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(previewX, previewY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = previewColor;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(startX, startY, noteSize + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (preview !== start) {
        ctx.fillStyle = isValid ? previewColor : "rgba(255, 107, 107, 0.95)";
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
  renderMetaKeysList();
  renderMetaKeySelect();
  renderColorControls();
  renderInspector();
  renderAnalysis();
  draw();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function renderNotesTable(notes) {
  const rows = notes
    .map((note) => {
      const color = escapeHtml(getNoteColor(note));
      let laneDetail;
      if (note.type === "hold") {
        laneDetail = `Lane ${note.lane + 1} · ${Math.round(note.duration * 1000)}ms`;
      } else if (note.type === "curve") {
        laneDetail = note.points.map((p) => `L${p.lane + 1}`).join(" → ");
      } else {
        laneDetail = `Lane ${note.lane + 1}`;
      }
      const metaHtml = note.meta.length
        ? note.meta
            .map(
              (m) =>
                `<span class="meta-chip-small">${escapeHtml(m.key)}${m.value !== "" ? `:${escapeHtml(m.value)}` : ""}</span>`,
            )
            .join("")
        : `<span class="note-list-no-meta">—</span>`;
      return `<div class="note-list-row">
        <span class="note-list-id">
          <span class="note-lane-dot" style="background:${color}"></span>
          <span class="note-time">${formatTime(note.time)}</span>
        </span>
        <span class="note-type-badge note-type-${escapeHtml(note.type)}">${escapeHtml(note.type)}</span>
        <span class="note-list-lane">${escapeHtml(laneDetail)}</span>
        <span class="note-list-meta">${metaHtml}</span>
        <span class="note-list-actions">
          <button class="note-list-edit-meta" data-id="${escapeHtml(note.id)}" type="button" title="Edit meta">Edit</button>
          <button class="note-list-deselect" data-id="${escapeHtml(note.id)}" type="button" title="Bỏ chọn">×</button>
        </span>
      </div>`;
    })
    .join("");
  const header =
    notes.length > 1 ? `<div class="bulk-indicator">${notes.length} notes · click × to deselect</div>` : "";
  return `${header}<div class="note-list">${rows}</div>`;
}

function renderMetaChips(selectedNotes) {
  if (selectedNotes.length > 1) {
    const metaCounts = new Map();
    selectedNotes.forEach((note) => {
      note.meta.forEach((item) => {
        metaCounts.set(item.key, (metaCounts.get(item.key) || 0) + 1);
      });
    });

    if (!metaCounts.size) {
      metaChipsEl.innerHTML = `<span class="meta-chips-empty">Chỉnh meta cho tất cả ${selectedNotes.length} notes</span>`;
      return;
    }

    metaChipsEl.innerHTML = [...metaCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, count]) => `<span class="meta-chip">
          <span class="meta-chip-key">${escapeHtml(key)}</span>
          <span class="meta-chip-sep">·</span>
          <span class="meta-chip-val">${count}/${selectedNotes.length}</span>
          <button class="meta-chip-remove" data-key="${escapeHtml(key)}" type="button" title="Xóa key khỏi selection">×</button>
        </span>`,
      )
      .join("");
    return;
  }

  const { meta } = selectedNotes[0];
  metaChipsEl.innerHTML = meta.length
    ? meta
        .map(
          (item) => `<span class="meta-chip">
            <span class="meta-chip-key">${escapeHtml(item.key)}</span>
            ${item.value !== "" ? `<span class="meta-chip-sep">:</span><span class="meta-chip-val">${escapeHtml(item.value)}</span>` : ""}
            <button class="meta-chip-remove" data-key="${escapeHtml(item.key)}" type="button" title="Xóa">×</button>
          </span>`,
        )
        .join("")
    : `<span class="meta-chips-empty">Chưa có meta</span>`;
}

function updateMetaButtons() {
  const hasSelection = state.selectedNoteIds.size > 0;
  const hasKey = metaKeyInput.value !== "";
  addMetaButton.disabled = !hasSelection || !hasKey;
  removeMetaButton.disabled = !hasSelection || !hasKey;
}

function removeMetaKeyFromSelection(key) {
  if (!key || !state.selectedNoteIds.size) return;
  pushHistory();
  getSelectedNotes().forEach((note) => {
    note.meta = note.meta.filter((item) => item.key !== key);
  });
  refreshUi();
}

// ── Meta Key Definitions ─────────────────────────────────────────────────

function getMetaKeyDef(key) {
  return state.metaKeyDefs.find((d) => d.key === key) || null;
}

function getMetaKeyUsageCount(key) {
  return state.notes.filter((note) => note.meta.some((m) => m.key === key)).length;
}

function getMetaValueUsageCount(key, value) {
  return state.notes.filter((note) => note.meta.some((m) => m.key === key && m.value === value)).length;
}

function getMetaValueDef(key, value) {
  const def = getMetaKeyDef(key);
  return def ? def.values.find((v) => v.value === value) || null : null;
}

// ── Color generation & resolution ────────────────────────────────────────

const colorGenPalette = [
  ...lanePalette,
  "#ff5d5d",
  "#5dffa0",
  "#ffd35d",
  "#5db4ff",
  "#c95dff",
  "#5dffe0",
  "#ff9d5d",
  "#9dff5d",
  "#ff5dc9",
  "#5d7dff",
];

function normalizeHex(value) {
  return String(value || "").trim().toLowerCase();
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function getUsedValueColors() {
  const used = new Set();
  state.metaKeyDefs.forEach((def) => def.values.forEach((v) => v.color && used.add(normalizeHex(v.color))));
  return used;
}

function generateUniqueColor() {
  const used = getUsedValueColors();
  for (const c of colorGenPalette) {
    if (!used.has(normalizeHex(c))) return c;
  }
  let count = 0;
  state.metaKeyDefs.forEach((def) => (count += def.values.length));
  for (let i = 0; i < 720; i += 1) {
    const hue = ((count + i) * 137.508) % 360;
    const c = hslToHex(hue, 68, 62);
    if (!used.has(normalizeHex(c))) return c;
  }
  return "#888888";
}

function assignMissingColors() {
  state.metaKeyDefs.forEach((def) => {
    def.values.forEach((v) => {
      if (!v.color) v.color = generateUniqueColor();
    });
  });
}

// Convert raw/legacy defs into the new {key, defaultValue, values:[{value,color}]} shape,
// gather distinct values already used by notes, then fill in any missing colors.
function normalizeMetaKeyDefs(rawDefs, notes) {
  const defs = (Array.isArray(rawDefs) ? rawDefs : [])
    .filter((d) => d && typeof d.key === "string" && d.key.trim())
    .map((d) => {
      const key = d.key.trim();
      const values = Array.isArray(d.values)
        ? d.values
            .filter((v) => v && v.value !== undefined && v.value !== null)
            .map((v) => ({ value: String(v.value), color: typeof v.color === "string" && v.color ? v.color : null }))
        : [];
      const defaultValue = typeof d.defaultValue === "string" ? d.defaultValue : "";
      // Legacy: defaultValue was free text -> seed it as a value
      if (typeof d.defaultValue === "string" && d.defaultValue !== "" && !values.some((v) => v.value === d.defaultValue)) {
        values.push({ value: d.defaultValue, color: null });
      }
      return { key, defaultValue, values };
    });
  (Array.isArray(notes) ? notes : []).forEach((note) => {
    (note.meta || []).forEach((m) => {
      const def = defs.find((d) => d.key === m.key);
      if (def && !def.values.some((v) => v.value === String(m.value))) {
        def.values.push({ value: String(m.value), color: null });
      }
    });
  });
  state.metaKeyDefs = defs;
  assignMissingColors();
  defs.forEach((def) => {
    if (def.values.length && !def.values.some((v) => v.value === def.defaultValue)) {
      def.defaultValue = def.values[0].value;
    }
  });
  return defs;
}

function getNoteColor(note) {
  if (state.colorMode === "meta") {
    const key = state.colorByKey;
    if (key) {
      const entry = note.meta.find((m) => m.key === key);
      if (entry) {
        const vd = getMetaValueDef(key, entry.value);
        if (vd && vd.color) return vd.color;
      }
    }
    return state.typeColors[note.type] || "#9aa6b2";
  }
  return lanePalette[note.lane % lanePalette.length];
}

function getPointColor(note, laneIndex) {
  if (state.colorMode === "meta") return getNoteColor(note);
  return lanePalette[laneIndex % lanePalette.length];
}

function renderMetaKeysList() {
  if (!state.metaKeyDefs.length) {
    metaKeysList.innerHTML = `<span class="meta-keys-empty">No meta keys defined</span>`;
    return;
  }
  metaKeysList.innerHTML = state.metaKeyDefs
    .map((def, index) => {
      const valuesHtml = def.values.length
        ? def.values
            .map(
              (v) => `<div class="meta-value-row" data-key="${escapeHtml(def.key)}" data-value="${escapeHtml(v.value)}">
                <input class="meta-value-default" type="radio" name="mkdefault_${index}" title="Set default"${
                  v.value === def.defaultValue ? " checked" : ""
                } />
                <input class="meta-value-color" type="color" value="${escapeHtml(v.color || "#888888")}" title="Color" />
                <span class="meta-value-text">${escapeHtml(v.value)}</span>
                <button class="meta-value-edit" type="button" title="Rename value">Rename</button>
                <button class="meta-value-del" type="button" title="Delete value">✕</button>
              </div>`,
            )
            .join("")
        : `<span class="meta-value-empty">No values — add one below</span>`;
      return `<div class="meta-key-block" data-key="${escapeHtml(def.key)}">
        <div class="meta-key-head">
          <span class="meta-key-name">${escapeHtml(def.key)}</span>
          <span class="meta-key-head-actions">
            <button class="meta-key-action-btn meta-key-edit-btn" data-key="${escapeHtml(def.key)}" type="button" title="Rename">Rename</button>
            <button class="meta-key-action-btn meta-key-delete-btn" data-key="${escapeHtml(def.key)}" type="button" title="Delete key">✕</button>
          </span>
        </div>
        <div class="meta-key-values">${valuesHtml}</div>
        <div class="meta-value-add">
          <input class="meta-value-add-input" type="text" data-key="${escapeHtml(def.key)}" placeholder="new value" />
          <button class="meta-value-add-btn" data-key="${escapeHtml(def.key)}" type="button">+ value</button>
        </div>
      </div>`;
    })
    .join("");
}

function renderMetaKeySelect() {
  const currentVal = metaKeyInput.value;
  if (!state.metaKeyDefs.length) {
    metaKeyInput.innerHTML = `<option value="">— no keys defined —</option>`;
  } else {
    metaKeyInput.innerHTML = state.metaKeyDefs
      .map((d) => `<option value="${escapeHtml(d.key)}">${escapeHtml(d.key)}</option>`)
      .join("");
    if (currentVal && state.metaKeyDefs.some((d) => d.key === currentVal)) {
      metaKeyInput.value = currentVal;
    }
  }
  renderMetaValueSelect();
  updateMetaButtons();
}

function renderMetaValueSelect() {
  const def = getMetaKeyDef(metaKeyInput.value);
  if (!def || !def.values.length) {
    metaValueInput.innerHTML = `<option value="">— no values —</option>`;
    return;
  }
  metaValueInput.innerHTML = def.values
    .map((v) => `<option value="${escapeHtml(v.value)}"${v.value === def.defaultValue ? " selected" : ""}>${escapeHtml(v.value)}</option>`)
    .join("");
}

function renderColorControls() {
  colorModeInput.value = state.colorMode;
  const isMeta = state.colorMode === "meta";
  colorByKeyWrap.hidden = !isMeta;
  typeColorRow.hidden = !isMeta;
  if (state.metaKeyDefs.length) {
    colorByKeyInput.innerHTML = state.metaKeyDefs
      .map((d) => `<option value="${escapeHtml(d.key)}">${escapeHtml(d.key)}</option>`)
      .join("");
    if (!state.colorByKey || !state.metaKeyDefs.some((d) => d.key === state.colorByKey)) {
      state.colorByKey = state.metaKeyDefs[0].key;
    }
    colorByKeyInput.value = state.colorByKey;
  } else {
    colorByKeyInput.innerHTML = `<option value="">— no keys —</option>`;
    state.colorByKey = null;
  }
  typeColorTap.value = state.typeColors.tap;
  typeColorHold.value = state.typeColors.hold;
  typeColorCurve.value = state.typeColors.curve;
}

function openMetaKeyDefModal(mode, key) {
  const def = getMetaKeyDef(key);
  const count = getMetaKeyUsageCount(key);
  state.metaKeyModalMode = mode;
  state.metaKeyModalOriginalKey = key;
  state.metaKeyModalOriginalValue = null;

  metaKeyDefModalLabel.textContent = "Key name";
  metaKeyDefModalTitle.textContent = mode === "edit" ? "Edit Meta Key" : "Delete Meta Key";
  metaKeyDefModalUsage.textContent = `${count} note${count !== 1 ? "s" : ""} currently use this key`;
  metaKeyDefModalOverride.disabled = false;
  metaKeyDefModalDefOnly.disabled = false;
  metaKeyDefModalDefOnly.title = "";

  if (mode === "edit") {
    metaKeyDefModalTitle.textContent = "Rename Meta Key";
    metaKeyDefFields.hidden = false;
    metaKeyDefModalKey.value = def ? def.key : key;
    metaKeyDefModalOverride.textContent = "Rename in All Notes";
    metaKeyDefModalOverride.className = "btn-warning";
    metaKeyDefModalDefOnly.textContent = "Rename Definition Only";
    metaKeyDefModalDefOnly.className = "";
    syncRenameModalButtons();
  } else {
    metaKeyDefFields.hidden = true;
    metaKeyDefModalOverride.textContent = "Remove from All Notes";
    metaKeyDefModalOverride.className = "btn-danger";
    metaKeyDefModalDefOnly.textContent = "Remove Definition Only";
    metaKeyDefModalDefOnly.className = "btn-warning";
  }

  metaKeyDefModal.hidden = false;
}

function openMetaValueEditModal(key, value) {
  const count = getMetaValueUsageCount(key, value);
  state.metaKeyModalMode = "valueEdit";
  state.metaKeyModalOriginalKey = key;
  state.metaKeyModalOriginalValue = value;

  metaKeyDefModalLabel.textContent = "Value";
  metaKeyDefModalTitle.textContent = "Rename Value";
  metaKeyDefModalUsage.textContent = `${count} note${count !== 1 ? "s" : ""} currently use "${key}: ${value}"`;
  metaKeyDefModalOverride.disabled = false;
  metaKeyDefModalDefOnly.disabled = false;
  metaKeyDefModalDefOnly.title = "";
  metaKeyDefFields.hidden = false;
  metaKeyDefModalKey.value = value;
  metaKeyDefModalOverride.textContent = "Rename in All Notes";
  metaKeyDefModalOverride.className = "btn-warning";
  metaKeyDefModalDefOnly.textContent = "Rename Definition Only";
  metaKeyDefModalDefOnly.className = "";
  syncRenameModalButtons();

  metaKeyDefModal.hidden = false;
}

function openMetaValueDeleteModal(key, value) {
  const count = getMetaValueUsageCount(key, value);
  state.metaKeyModalMode = "valueDelete";
  state.metaKeyModalOriginalKey = key;
  state.metaKeyModalOriginalValue = value;

  const inUse = count > 0;
  metaKeyDefModalOverride.disabled = false;
  metaKeyDefModalLabel.textContent = "Value";
  metaKeyDefModalTitle.textContent = "Delete Value";
  metaKeyDefModalUsage.textContent = inUse
    ? `${count} note${count !== 1 ? "s" : ""} currently use "${key}: ${value}" — must delete from all notes`
    : `No notes use "${key}: ${value}"`;
  metaKeyDefFields.hidden = true;
  metaKeyDefModalOverride.textContent = "Delete from All Notes";
  metaKeyDefModalOverride.className = "btn-danger";
  metaKeyDefModalDefOnly.textContent = "Delete Definition Only";
  metaKeyDefModalDefOnly.className = "btn-warning";
  // Def-only delete would be resurrected by normalizeMetaKeyDefs while notes still use it,
  // so only allow it when the value is unused.
  metaKeyDefModalDefOnly.disabled = inUse;
  metaKeyDefModalDefOnly.title = inUse ? "Còn note đang dùng value này — chỉ có thể xóa khỏi tất cả notes" : "";

  metaKeyDefModal.hidden = false;
}

// Enable/disable action buttons based on whether the rename input is non-empty.
// Only applies in edit/valueEdit modes; other modes manage button state themselves.
function syncRenameModalButtons() {
  if (state.metaKeyModalMode !== "edit" && state.metaKeyModalMode !== "valueEdit") return;
  const empty = !metaKeyDefModalKey.value.trim();
  metaKeyDefModalOverride.disabled = empty;
  metaKeyDefModalDefOnly.disabled = empty;
}

function closeMetaKeyDefModal() {
  metaKeyDefModal.hidden = true;
  state.metaKeyModalMode = null;
  state.metaKeyModalOriginalKey = null;
  state.metaKeyModalOriginalValue = null;
}

// ── Edit Note Meta modal ──────────────────────────────────────────────────

function buildEditMetaKeySelectHtml(selectedKey) {
  const defs = state.metaKeyDefs;
  const inDefs = defs.some((d) => d.key === selectedKey);
  let options = defs
    .map(
      (d) =>
        `<option value="${escapeHtml(d.key)}"${d.key === selectedKey ? " selected" : ""}>${escapeHtml(d.key)}</option>`,
    )
    .join("");
  if (!inDefs && selectedKey) {
    options = `<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedKey)}</option>` + options;
  }
  return `<select class="edit-meta-key-select">${options}</select>`;
}

function buildEditMetaValueSelectHtml(key, selectedValue) {
  const def = getMetaKeyDef(key);
  const vals = def ? def.values : [];
  let options = vals
    .map(
      (v) =>
        `<option value="${escapeHtml(v.value)}"${v.value === selectedValue ? " selected" : ""}>${escapeHtml(v.value)}</option>`,
    )
    .join("");
  if (selectedValue && !vals.some((v) => v.value === selectedValue)) {
    options = `<option value="${escapeHtml(selectedValue)}" selected>${escapeHtml(selectedValue)} (?)</option>` + options;
  }
  if (!options) options = `<option value="">— no values —</option>`;
  return `<select class="edit-meta-value-select">${options}</select>`;
}

function renderEditMetaRows() {
  const note = state.notes.find((n) => n.id === state.editMetaNoteId);
  if (!note || !note.meta.length) {
    editMetaRows.innerHTML = `<span class="meta-rows-empty">No meta — use Add below</span>`;
    return;
  }
  editMetaRows.innerHTML = note.meta
    .map(
      (entry) => `<div class="edit-meta-row">
        ${buildEditMetaKeySelectHtml(entry.key)}
        ${buildEditMetaValueSelectHtml(entry.key, entry.value)}
        <button class="edit-meta-remove-row" type="button" title="Remove">×</button>
      </div>`,
    )
    .join("");
}

function openEditMetaModal(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note) return;
  state.editMetaNoteId = noteId;

  const color = getNoteColor(note);
  let laneDetail;
  if (note.type === "hold") {
    laneDetail = `Lane ${note.lane + 1} · ${Math.round(note.duration * 1000)}ms`;
  } else if (note.type === "curve") {
    laneDetail = note.points.map((p) => `L${p.lane + 1}`).join(" → ");
  } else {
    laneDetail = `Lane ${note.lane + 1}`;
  }
  editMetaModalNote.innerHTML = `
    <span class="note-lane-dot" style="background:${escapeHtml(color)}"></span>
    <span class="note-time">${formatTime(note.time)}</span>
    <span class="note-type-badge note-type-${escapeHtml(note.type)}">${escapeHtml(note.type)}</span>
    <span style="color:var(--muted);font-size:12px">${escapeHtml(laneDetail)}</span>
  `;

  editMetaAddKey.innerHTML = state.metaKeyDefs.length
    ? `<option value="">— select key —</option>` +
      state.metaKeyDefs.map((d) => `<option value="${escapeHtml(d.key)}">${escapeHtml(d.key)}</option>`).join("")
    : `<option value="">— no keys defined —</option>`;
  renderEditMetaAddValue();

  renderEditMetaRows();
  editMetaModal.hidden = false;
}

function renderEditMetaAddValue() {
  editMetaAddValue.innerHTML = buildEditMetaValueSelectHtml(editMetaAddKey.value, "")
    .replace('<select class="edit-meta-value-select">', "")
    .replace("</select>", "");
}

function closeEditMetaModal() {
  editMetaModal.hidden = true;
  state.editMetaNoteId = null;
}

function commitMetaKeyEdit(applyToNotes) {
  const originalKey = state.metaKeyModalOriginalKey;
  const newKey = metaKeyDefModalKey.value.trim();
  if (!newKey) {
    closeMetaKeyDefModal();
    return;
  }
  if (newKey !== originalKey && state.metaKeyDefs.some((d) => d.key === newKey)) {
    metaKeyDefModalKey.select();
    return;
  }
  const keyChanged = newKey !== originalKey;
  if (keyChanged) pushHistory();
  const def = getMetaKeyDef(originalKey);
  if (def) def.key = newKey;
  if (state.colorByKey === originalKey) state.colorByKey = newKey;
  if (applyToNotes && keyChanged) {
    state.notes.forEach((note) => {
      note.meta.forEach((m) => {
        if (m.key === originalKey) m.key = newKey;
      });
    });
  }
  refreshUi();
  closeMetaKeyDefModal();
}

function commitMetaValueEdit(applyToNotes) {
  const key = state.metaKeyModalOriginalKey;
  const originalValue = state.metaKeyModalOriginalValue;
  const newValue = metaKeyDefModalKey.value.trim();
  if (!newValue) {
    closeMetaKeyDefModal();
    return;
  }
  const def = getMetaKeyDef(key);
  if (!def) {
    closeMetaKeyDefModal();
    return;
  }
  if (newValue !== originalValue && def.values.some((v) => v.value === newValue)) {
    metaKeyDefModalKey.select();
    return;
  }
  const valueChanged = newValue !== originalValue;
  if (valueChanged) {
    pushHistory();
    const entry = def.values.find((v) => v.value === originalValue);
    if (entry) entry.value = newValue;
    if (def.defaultValue === originalValue) def.defaultValue = newValue;
    if (applyToNotes) {
      state.notes.forEach((note) => {
        note.meta.forEach((m) => {
          if (m.key === key && m.value === originalValue) m.value = newValue;
        });
      });
    }
  }
  refreshUi();
  closeMetaKeyDefModal();
}

function commitMetaKeyDelete(applyToNotes) {
  const key = state.metaKeyModalOriginalKey;
  pushHistory();
  state.metaKeyDefs = state.metaKeyDefs.filter((d) => d.key !== key);
  if (state.colorByKey === key) state.colorByKey = null;
  if (applyToNotes) {
    state.notes.forEach((note) => {
      note.meta = note.meta.filter((m) => m.key !== key);
    });
  }
  refreshUi();
  closeMetaKeyDefModal();
}

function commitMetaValueDelete(applyToNotes) {
  const key = state.metaKeyModalOriginalKey;
  const value = state.metaKeyModalOriginalValue;
  const def = getMetaKeyDef(key);
  if (!def) {
    closeMetaKeyDefModal();
    return;
  }
  // Def-only delete while notes still use the value would be resurrected by
  // normalizeMetaKeyDefs; force full delete in that case.
  if (!applyToNotes && getMetaValueUsageCount(key, value) > 0) return;
  pushHistory();
  def.values = def.values.filter((v) => v.value !== value);
  if (def.defaultValue === value) def.defaultValue = def.values.length ? def.values[0].value : "";
  if (applyToNotes) {
    state.notes.forEach((note) => {
      note.meta = note.meta.filter((m) => !(m.key === key && m.value === value));
    });
  }
  refreshUi();
  closeMetaKeyDefModal();
}

function renderInspector() {
  const selectedNotes = getSelectedNotes();
  const count = selectedNotes.length;

  selectionCount.textContent = `${count} selected`;
  if (!count) {
    selectionInfo.textContent = "Click note để select, kéo để select nhiều";
  } else if (count === 1) {
    selectionInfo.textContent = formatTime(selectedNotes[0].time);
  } else {
    selectionInfo.textContent = `${count} notes`;
  }

  if (!count) {
    inspectorContent.innerHTML = `<div class="inspector-empty">
      <span>Chưa có note nào được chọn</span>
      <span>Click note · Kéo để chọn nhiều</span>
    </div>`;
  } else {
    inspectorContent.innerHTML = renderNotesTable(selectedNotes);
  }

  metaEditorSection.hidden = count === 0;
  if (count > 0) {
    renderMetaChips(selectedNotes);
  }
  updateMetaButtons();
}

function setInspectorTab(tab) {
  state.activeInspectorTab = tab;
  const isInspector = tab === "inspector";
  const isSetting = tab === "setting";
  const isAnalysis = tab === "analysis";
  const isAutomation = tab === "automation";
  noteInspectorTab.classList.toggle("active", isInspector);
  noteSettingTab.classList.toggle("active", isSetting);
  noteAnalysisTab.classList.toggle("active", isAnalysis);
  noteAutomationTab.classList.toggle("active", isAutomation);
  noteInspectorTab.setAttribute("aria-selected", String(isInspector));
  noteSettingTab.setAttribute("aria-selected", String(isSetting));
  noteAnalysisTab.setAttribute("aria-selected", String(isAnalysis));
  noteAutomationTab.setAttribute("aria-selected", String(isAutomation));
  noteInspectorPanel.hidden = !isInspector;
  noteSettingPanel.hidden = !isSetting;
  noteAnalysisPanel.hidden = !isAnalysis;
  noteAutomationPanel.hidden = !isAutomation;
  if (isAnalysis) {
    resizeCanvas();
    renderAnalysis();
  }
  if (isAutomation) {
    noteAutomation.open();
  }
}

function setAudioEnabled(enabled) {
  playButton.disabled = !enabled;
  stopButton.disabled = !enabled;
  scrub.disabled = !enabled;
  exportButton.disabled = false;
}

function addNote(time, lane, appendSelection = false) {
  if (!state.duration) return;
  const type = noteType.value;
  if (type === "curve") {
    addCurvePoint(time, lane, appendSelection);
    return;
  }
  if (type === "hold") {
    addHoldPoint(time, lane, appendSelection);
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
  state.selectedNoteIds = appendSelection ? new Set([...state.selectedNoteIds, note.id]) : new Set([note.id]);
  sortNotes();
  playCreateNoteSound();
  refreshUi();
}

function addHoldPoint(time, lane, appendSelection = false) {
  const point = {
    time: Number(snapTime(time).toFixed(3)),
    lane,
  };

  if (!state.activeHoldStart) {
    state.activeHoldStart = point;
    state.holdPreviewPoint = point;
    if (!appendSelection) state.selectedNoteIds.clear();
    playCreateNoteSound();
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
  state.selectedNoteIds = appendSelection ? new Set([...state.selectedNoteIds, note.id]) : new Set([note.id]);
  state.activeHoldStart = null;
  state.holdPreviewPoint = null;
  sortNotes();
  playCreateNoteSound();
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

function addCurvePoint(time, lane, appendSelection = false) {
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
    state.selectedNoteIds = appendSelection ? new Set([...state.selectedNoteIds, curve.id]) : new Set([curve.id]);
    playCreateNoteSound();
  } else {
    pushHistory();
    curve.points.push(point);
    curve.time = curve.points[0].time;
    curve.lane = curve.points[0].lane;
    state.selectedNoteIds = appendSelection ? new Set([...state.selectedNoteIds, curve.id]) : new Set([curve.id]);
    playCreateNoteSound();
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
  ensureUniqueNoteIds(state.notes);
  const payload = {
    version: 1,
    song: state.songName || "untitled",
    bpm: Number(bpmInput.value),
    lpb: getLPB(),
    offsetMs: getOffsetMs(),
    lanes: state.laneCount,
    duration: Number((state.duration || 0).toFixed(3)),
    notes: state.notes.map((note) => ({
      id: note.id,
      time: note.time,
      lane: note.lane,
      type: note.type,
      ...(note.type === "hold" ? { duration: note.duration } : {}),
      ...(note.type === "curve" ? { points: note.points.map((point) => ({ ...point })) } : {}),
      meta: noteMetaToDictionary(note.meta),
    })),
    metaKeyDefs: state.metaKeyDefs.map((d) => ({
      key: d.key,
      defaultValue: d.defaultValue,
      values: (d.values || []).map((v) => ({ value: v.value, color: v.color })),
    })),
    colorMode: state.colorMode,
    colorByKey: state.colorByKey,
    typeColors: { ...state.typeColors },
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
    state.notes = ensureUniqueNoteIds(removeOverlappingNotes(importedNotes));
    state.selectedNoteIds.clear();
    if (data.bpm) bpmInput.value = data.bpm;
    if (data.lpb) lpbInput.value = clamp(Math.round(Number(data.lpb)), Number(lpbInput.min), Number(lpbInput.max));
    if (Number.isFinite(Number(data.offsetMs))) offsetInput.value = Math.round(Number(data.offsetMs));
    normalizeMetaKeyDefs(data.metaKeyDefs, state.notes);
    state.colorMode = data.colorMode === "meta" ? "meta" : "lane";
    if (typeof data.colorByKey === "string" && state.metaKeyDefs.some((d) => d.key === data.colorByKey)) {
      state.colorByKey = data.colorByKey;
    } else {
      state.colorByKey = state.metaKeyDefs.length ? state.metaKeyDefs[0].key : null;
    }
    state.typeColors = { ...DEFAULT_TYPE_COLORS };
    if (data.typeColors && typeof data.typeColors === "object") {
      ["tap", "hold", "curve"].forEach((t) => {
        if (typeof data.typeColors[t] === "string") state.typeColors[t] = data.typeColors[t];
      });
    }
    sortNotes();
    refreshUi();
  };
  reader.readAsText(file);
}

function estimateTimingFromAudio(audioBuffer) {
  const frameSize = 2048;
  const hopSize = 512;
  const frameCount = Math.max(0, Math.floor((audioBuffer.length - frameSize) / hopSize) + 1);
  if (frameCount < 12) return null;

  const energies = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hopSize;
    let sumSq = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = 0; i < frameSize; i += 1) {
        const sample = data[start + i];
        sumSq += sample * sample;
      }
    }
    energies[frame] = Math.sqrt(sumSq / (frameSize * audioBuffer.numberOfChannels));
  }

  const onset = new Float32Array(frameCount);
  let maxOnset = 0;
  for (let i = 1; i < frameCount; i += 1) {
    const diff = energies[i] - energies[i - 1];
    onset[i] = diff > 0 ? diff : 0;
    if (onset[i] > maxOnset) maxOnset = onset[i];
  }
  if (maxOnset <= 0) return null;

  const floor = maxOnset * 0.08;
  const peaks = [];
  for (let i = 2; i < frameCount - 2; i += 1) {
    const value = onset[i];
    if (value < floor) continue;
    if (value < onset[i - 1] || value < onset[i + 1] || value < onset[i - 2] || value < onset[i + 2]) continue;
    peaks.push({ time: (i * hopSize) / audioBuffer.sampleRate, strength: value });
  }
  if (peaks.length < 4) return null;

  const scoringPeaks = peaks.slice(0, 360);
  let best = null;
  for (let bpm = 60; bpm <= 200; bpm += 1) {
    const period = 60 / bpm;
    const tolerance = Math.min(0.07, period * 0.14);
    const phaseCandidates = scoringPeaks.slice(0, 24).map((peak) => peak.time % period);
    phaseCandidates.forEach((phase) => {
      let score = 0;
      scoringPeaks.forEach((peak) => {
        const pos = ((peak.time - phase) % period + period) % period;
        const distance = Math.min(pos, period - pos);
        if (distance <= tolerance) score += peak.strength * (1 - distance / tolerance);
      });
      if (!best || score > best.score) best = { bpm, phase, score };
    });
  }
  if (!best) return null;
  return {
    bpm: best.bpm,
    offsetMs: Math.max(0, Math.round(best.phase * 1000)),
  };
}

function autoFillTimingIfEmptyLevel(audioBuffer) {
  if (state.notes.length) return;
  const timing = estimateTimingFromAudio(audioBuffer);
  if (!timing) return;
  bpmInput.value = clamp(timing.bpm, Number(bpmInput.min), Number(bpmInput.max));
  offsetInput.value = timing.offsetMs;
  noteAutomation.updateTimingLabels();
  draw();
}

async function buildWaveform(file) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    state.audioBuffer = audioBuffer;
    noteAutomation.open();
    autoFillTimingIfEmptyLevel(audioBuffer);
    const channelCount = audioBuffer.numberOfChannels;
    const sampleCount = Math.min(6000, Math.ceil(audioBuffer.duration * 220));
    const blockSize = Math.max(1, Math.floor(audioBuffer.length / sampleCount));
    const peaks = new Float32Array(sampleCount);
    const body = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
      const blockStart = i * blockSize;
      const blockEnd = Math.min(audioBuffer.length, blockStart + blockSize);
      let peak = 0;
      let sumSq = 0;
      let count = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        for (let sample = blockStart; sample < blockEnd; sample += 1) {
          const value = data[sample];
          peak = Math.max(peak, Math.abs(value));
          sumSq += value * value;
          count += 1;
        }
      }
      peaks[i] = peak;
      body[i] = Math.sqrt(sumSq / Math.max(1, count));
    }

    const sortedBody = Array.from(body).sort((a, b) => a - b);
    const bodyScale = sortedBody[Math.floor(sortedBody.length * 0.95)] || 1;
    for (let i = 0; i < body.length; i += 1) {
      body[i] = Math.pow(clamp(body[i] / bodyScale, 0, 1), 0.72);
    }

    state.waveform = { peaks, body };
    draw();
  } finally {
    audioContext.close();
  }
}

let lastTickTime = -1;

function animationTick() {
  const current = audio.currentTime || 0;
  currentTimeLabel.textContent = formatTime(current);
  scrub.value = current;
  if (!audio.paused && lastTickTime >= 0 && current > lastTickTime) {
    tickHitSounds(lastTickTime, current);
    tickMetronome(lastTickTime, current);
  }
  lastTickTime = current;
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
  state.audioBuffer = null;
  noteAutomation.reset();
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
    appendSelection: event.ctrlKey || event.metaKey,
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
    selectNotes(findNotesInRect(drag, metrics), drag.appendSelection);
    return;
  }
  if (drag.noteId) {
    selectNotes([drag.noteId], drag.appendSelection);
    return;
  }
  state.selectedLane = drag.lane;
  addNote(timeFromX(drag.startX, metrics), drag.lane, drag.appendSelection);
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
    state.notes = ensureUniqueNoteIds(previousState.map(normalizeNote));
  } else {
    state.laneCount = previousState.laneCount || state.laneCount;
    state.selectedLane = previousState.selectedLane || 0;
    state.notes = ensureUniqueNoteIds((previousState.notes || []).map(normalizeNote));
    normalizeMetaKeyDefs(previousState.metaKeyDefs, state.notes);
    state.colorMode = previousState.colorMode === "meta" ? "meta" : "lane";
    if (typeof previousState.colorByKey === "string" && state.metaKeyDefs.some((d) => d.key === previousState.colorByKey)) {
      state.colorByKey = previousState.colorByKey;
    } else {
      state.colorByKey = state.metaKeyDefs.length ? state.metaKeyDefs[0].key : null;
    }
    state.typeColors = { ...DEFAULT_TYPE_COLORS };
    if (previousState.typeColors && typeof previousState.typeColors === "object") {
      ["tap", "hold", "curve"].forEach((t) => {
        if (typeof previousState.typeColors[t] === "string") state.typeColors[t] = previousState.typeColors[t];
      });
    }
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
noteAutomationTab.addEventListener("click", () => setInspectorTab("automation"));

addMetaButton.addEventListener("click", () => {
  const key = metaKeyInput.value;
  if (!key || !state.selectedNoteIds.size) return;
  const def = getMetaKeyDef(key);
  if (!def || !def.values.length) return;
  const value = metaValueInput.value !== "" ? metaValueInput.value : def.defaultValue || def.values[0].value;
  pushHistory();
  getSelectedNotes().forEach((note) => {
    const existing = note.meta.find((item) => item.key === key);
    if (existing) existing.value = value;
    else note.meta.push({ key, value });
  });
  refreshUi();
});

inspectorContent.addEventListener("click", (event) => {
  const deselBtn = event.target.closest(".note-list-deselect");
  if (deselBtn) {
    const id = deselBtn.dataset.id;
    if (id) { state.selectedNoteIds.delete(id); refreshUi(); }
    return;
  }
  const editBtn = event.target.closest(".note-list-edit-meta");
  if (editBtn && !editBtn.disabled) {
    const id = editBtn.dataset.id;
    if (id) openEditMetaModal(id);
  }
});

metaEditorSection.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".meta-chip-remove");
  if (!removeBtn || !state.selectedNoteIds.size) return;
  removeMetaKeyFromSelection(removeBtn.dataset.key);
});

removeMetaButton.addEventListener("click", () => {
  const key = metaKeyInput.value;
  if (!key) return;
  removeMetaKeyFromSelection(key);
  updateMetaButtons();
});

metaKeyInput.addEventListener("change", () => {
  renderMetaValueSelect();
  updateMetaButtons();
});

copyMenuItem.addEventListener("click", () => {
  if (copyMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  copySelectedNotes();
  hideContextMenu();
});

pasteWithLaneMenuItem.addEventListener("click", () => {
  if (pasteWithLaneMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  if (state.contextTarget) {
    pasteCopiedNotes(state.contextTarget.time, state.contextTarget.lane, "withLane");
  }
  hideContextMenu();
});

pasteTimeOnlyMenuItem.addEventListener("click", () => {
  if (pasteTimeOnlyMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  if (state.contextTarget) {
    pasteCopiedNotes(state.contextTarget.time, state.contextTarget.lane, "timeOnly");
  }
  hideContextMenu();
});

mirrorSelectedMenuItem.addEventListener("click", () => {
  if (mirrorSelectedMenuItem.disabled) {
    hideContextMenu();
    return;
  }
  mirrorSelectedNotes();
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

replacePasteButton.addEventListener("click", () => {
  if (state.pendingPaste) {
    commitPaste(state.pendingPaste.notes, state.pendingPaste.conflicts, "replace");
  }
  hidePasteConflictModal();
});

appendPasteButton.addEventListener("click", () => {
  if (state.pendingPaste) {
    commitPaste(state.pendingPaste.notes, state.pendingPaste.conflicts, "append");
  }
  hidePasteConflictModal();
});

cancelPasteButton.addEventListener("click", hidePasteConflictModal);

// Edit Note Meta modal
editMetaRows.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".edit-meta-remove-row");
  if (!removeBtn) return;
  const row = removeBtn.closest(".edit-meta-row");
  if (row) {
    row.remove();
    if (!editMetaRows.querySelectorAll(".edit-meta-row").length) {
      editMetaRows.innerHTML = `<span class="meta-rows-empty">No meta — use Add below</span>`;
    }
  }
});

editMetaAddRowBtn.addEventListener("click", () => {
  const key = editMetaAddKey.value;
  if (!key) return;
  const def = getMetaKeyDef(key);
  if (!def || !def.values.length) return;
  const value = editMetaAddValue.value !== "" ? editMetaAddValue.value : def.defaultValue || def.values[0].value;
  // Focus existing row if duplicate key
  for (const row of editMetaRows.querySelectorAll(".edit-meta-row")) {
    if (row.querySelector(".edit-meta-key-select")?.value === key) {
      row.querySelector(".edit-meta-value-select")?.focus();
      return;
    }
  }
  const empty = editMetaRows.querySelector(".meta-rows-empty");
  if (empty) empty.remove();
  const newRow = document.createElement("div");
  newRow.className = "edit-meta-row";
  newRow.innerHTML = `${buildEditMetaKeySelectHtml(key)}${buildEditMetaValueSelectHtml(key, value)}<button class="edit-meta-remove-row" type="button" title="Remove">×</button>`;
  editMetaRows.appendChild(newRow);
  editMetaAddKey.value = "";
  renderEditMetaAddValue();
});

editMetaAddKey.addEventListener("change", renderEditMetaAddValue);

// When a row's key select changes, rebuild that row's value dropdown
editMetaRows.addEventListener("change", (event) => {
  const keySelect = event.target.closest(".edit-meta-key-select");
  if (!keySelect) return;
  const row = keySelect.closest(".edit-meta-row");
  const oldValueSelect = row.querySelector(".edit-meta-value-select");
  const tmp = document.createElement("div");
  tmp.innerHTML = buildEditMetaValueSelectHtml(keySelect.value, "");
  if (oldValueSelect) oldValueSelect.replaceWith(tmp.firstElementChild);
});

editMetaApply.addEventListener("click", () => {
  const note = state.notes.find((n) => n.id === state.editMetaNoteId);
  if (!note) { closeEditMetaModal(); return; }
  const rows = editMetaRows.querySelectorAll(".edit-meta-row");
  const newMeta = [];
  const usedKeys = new Set();
  rows.forEach((row) => {
    const key = row.querySelector(".edit-meta-key-select")?.value;
    const value = row.querySelector(".edit-meta-value-select")?.value ?? "";
    if (!key) return;
    if (usedKeys.has(key)) {
      row.querySelector(".edit-meta-key-select")?.focus();
      return;
    }
    usedKeys.add(key);
    newMeta.push({ key, value });
  });
  if (newMeta.length !== rows.length) return;
  pushHistory();
  note.meta = newMeta;
  refreshUi();
  closeEditMetaModal();
});

editMetaCancel.addEventListener("click", closeEditMetaModal);

editMetaModal.addEventListener("pointerdown", (event) => {
  if (event.target === editMetaModal) closeEditMetaModal();
});

// Meta key definition modal
metaKeyDefModalOverride.addEventListener("click", () => {
  if (state.metaKeyModalMode === "edit") commitMetaKeyEdit(true);
  else if (state.metaKeyModalMode === "delete") commitMetaKeyDelete(true);
  else if (state.metaKeyModalMode === "valueEdit") commitMetaValueEdit(true);
  else if (state.metaKeyModalMode === "valueDelete") commitMetaValueDelete(true);
});

metaKeyDefModalDefOnly.addEventListener("click", () => {
  if (state.metaKeyModalMode === "edit") commitMetaKeyEdit(false);
  else if (state.metaKeyModalMode === "delete") commitMetaKeyDelete(false);
  else if (state.metaKeyModalMode === "valueEdit") commitMetaValueEdit(false);
  else if (state.metaKeyModalMode === "valueDelete") commitMetaValueDelete(false);
});

metaKeyDefModalKey.addEventListener("input", syncRenameModalButtons);

metaKeyDefModalCancel.addEventListener("click", closeMetaKeyDefModal);

metaKeyDefModal.addEventListener("pointerdown", (event) => {
  if (event.target === metaKeyDefModal) closeMetaKeyDefModal();
});

// Meta key list (key rename/delete + value add/delete via delegation)
metaKeysList.addEventListener("click", (event) => {
  const editBtn = event.target.closest(".meta-key-edit-btn");
  if (editBtn) {
    openMetaKeyDefModal("edit", editBtn.dataset.key);
    return;
  }
  const deleteBtn = event.target.closest(".meta-key-delete-btn");
  if (deleteBtn) {
    openMetaKeyDefModal("delete", deleteBtn.dataset.key);
    return;
  }
  const addBtn = event.target.closest(".meta-value-add-btn");
  if (addBtn) {
    addMetaValue(addBtn.dataset.key);
    return;
  }
  const editValueBtn = event.target.closest(".meta-value-edit");
  if (editValueBtn) {
    const row = editValueBtn.closest(".meta-value-row");
    openMetaValueEditModal(row.dataset.key, row.dataset.value);
    return;
  }
  const delValueBtn = event.target.closest(".meta-value-del");
  if (delValueBtn) {
    const row = delValueBtn.closest(".meta-value-row");
    openMetaValueDeleteModal(row.dataset.key, row.dataset.value);
  }
});

// Color picker (live) — update without re-rendering the list (keeps the picker open)
metaKeysList.addEventListener("input", (event) => {
  const colorInput = event.target.closest(".meta-value-color");
  if (!colorInput) return;
  const row = colorInput.closest(".meta-value-row");
  const vd = getMetaValueDef(row.dataset.key, row.dataset.value);
  if (vd) {
    vd.color = colorInput.value;
    draw();
    drawMinimap();
  }
});

// Default radio + Enter to add value
metaKeysList.addEventListener("change", (event) => {
  const radio = event.target.closest(".meta-value-default");
  if (!radio) return;
  const row = radio.closest(".meta-value-row");
  const def = getMetaKeyDef(row.dataset.key);
  if (def) def.defaultValue = row.dataset.value;
  renderMetaValueSelect();
});

metaKeysList.addEventListener("keydown", (event) => {
  const addInput = event.target.closest(".meta-value-add-input");
  if (addInput && event.key === "Enter") addMetaValue(addInput.dataset.key);
});

function addMetaValue(key) {
  const def = getMetaKeyDef(key);
  if (!def) return;
  const input = metaKeysList.querySelector(`.meta-value-add-input[data-key="${CSS.escape(key)}"]`);
  const value = input ? input.value.trim() : "";
  if (!value) return;
  if (def.values.some((v) => v.value === value)) {
    if (input) input.select();
    return;
  }
  def.values.push({ value, color: generateUniqueColor() });
  if (def.values.length === 1) def.defaultValue = value;
  refreshUi();
}

// Add key definition (inline form)
metaKeyAddSubmit.addEventListener("click", () => {
  const key = metaKeyAddKey.value.trim();
  if (!key) return;
  if (state.metaKeyDefs.some((d) => d.key === key)) {
    metaKeyAddKey.select();
    return;
  }
  state.metaKeyDefs.push({ key, defaultValue: "", values: [] });
  metaKeyAddKey.value = "";
  refreshUi();
});

metaKeyAddKey.addEventListener("keydown", (event) => {
  if (event.key === "Enter") metaKeyAddSubmit.click();
});

// Note color controls
colorModeInput.addEventListener("change", () => {
  state.colorMode = colorModeInput.value === "meta" ? "meta" : "lane";
  renderColorControls();
  draw();
  drawMinimap();
});

colorByKeyInput.addEventListener("change", () => {
  state.colorByKey = colorByKeyInput.value || null;
  draw();
  drawMinimap();
});

[
  [typeColorTap, "tap"],
  [typeColorHold, "hold"],
  [typeColorCurve, "curve"],
].forEach(([input, type]) => {
  input.addEventListener("input", () => {
    state.typeColors[type] = input.value;
    draw();
    drawMinimap();
  });
});

pasteConflictModal.addEventListener("pointerdown", (event) => {
  if (event.target === pasteConflictModal) hidePasteConflictModal();
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

rateGroup.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-rate]");
  if (!btn) return;
  audio.playbackRate = Number(btn.dataset.rate);
  rateGroup.querySelectorAll("[data-rate]").forEach((b) => b.classList.toggle("active", b === btn));
});

exportButton.addEventListener("click", exportLevel);
bpmInput.addEventListener("input", () => {
  draw();
  noteAutomation.updateTimingLabels();
});
snapInput.addEventListener("change", draw);
lpbInput.addEventListener("input", draw);
lpbInput.addEventListener("change", () => {
  lpbInput.value = getLPB();
  draw();
});
offsetInput.addEventListener("input", draw);
offsetInput.addEventListener("change", () => {
  offsetInput.value = getOffsetMs();
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
  if (event.key === "Escape") {
    event.preventDefault();
    closeEditMetaModal();
    closeMetaKeyDefModal();
    window.ModalDialog?.hideAlert();
    hidePasteConflictModal();
    hideContextMenu();
    cancelEditPoint();
    cancelActiveHold();
    finishActiveCurve();
    selectNotes([]);
    return;
  }
  if (event.target.matches("input, select")) return;
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
normalizeMetaKeyDefs(state.metaKeyDefs, state.notes);
if (state.metaKeyDefs.length && !state.colorByKey) state.colorByKey = state.metaKeyDefs[0].key;
renderMetaKeysList();
renderMetaKeySelect();
renderColorControls();
resizeCanvas();
requestAnimationFrame(animationTick);
