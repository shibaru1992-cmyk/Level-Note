function createMidiImporter(config) {
  const { elements, getEditorBpm, quantizeTime, onApply } = config;
  let midi = null;
  let selectedTrackIndex = 0;

  const DEFAULT_TEMPO = 500000; // microseconds per quarter note

  function readText(bytes) {
    try {
      return new TextDecoder("utf-8").decode(bytes).replace(/\0/g, "").trim();
    } catch (err) {
      return "";
    }
  }

  function pitchName(pitch) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00.000";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }

  function readVarLen(bytes, cursor) {
    let value = 0;
    let pos = cursor.pos;
    for (let i = 0; i < 4; i += 1) {
      const b = bytes[pos++];
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    cursor.pos = pos;
    return value;
  }

  function readChunkId(bytes, pos) {
    return String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
  }

  function readU16(bytes, pos) {
    return (bytes[pos] << 8) | bytes[pos + 1];
  }

  function readU32(bytes, pos) {
    return (((bytes[pos] << 24) >>> 0) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
  }

  function parseTrack(bytes, start, length, index) {
    const end = start + length;
    const cursor = { pos: start };
    const active = new Map();
    const notes = [];
    const tempos = [];
    let name = "";
    let tick = 0;
    let runningStatus = 0;

    function activeKey(channel, pitch) {
      return `${channel}:${pitch}`;
    }

    while (cursor.pos < end) {
      tick += readVarLen(bytes, cursor);
      let status = bytes[cursor.pos++];
      if (status < 0x80) {
        cursor.pos -= 1;
        status = runningStatus;
      } else if (status < 0xf0) {
        runningStatus = status;
      }

      if (status === 0xff) {
        const metaType = bytes[cursor.pos++];
        const len = readVarLen(bytes, cursor);
        const dataStart = cursor.pos;
        const data = bytes.slice(dataStart, dataStart + len);
        if ((metaType === 0x03 || metaType === 0x04) && !name) name = readText(data);
        if (metaType === 0x51 && len === 3) {
          tempos.push({ tick, microsecondsPerQuarter: (data[0] << 16) | (data[1] << 8) | data[2] });
        }
        cursor.pos += len;
        if (metaType === 0x2f) break;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        cursor.pos += readVarLen(bytes, cursor);
        continue;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;
      const dataLen = eventType === 0xc0 || eventType === 0xd0 ? 1 : 2;
      const a = bytes[cursor.pos++];
      const b = dataLen === 2 ? bytes[cursor.pos++] : 0;

      if (eventType === 0x90 && b > 0) {
        const key = activeKey(channel, a);
        if (!active.has(key)) active.set(key, []);
        active.get(key).push({ tick, velocity: b });
      } else if (eventType === 0x80 || (eventType === 0x90 && b === 0)) {
        const key = activeKey(channel, a);
        const starts = active.get(key);
        if (starts && starts.length) {
          const startNote = starts.shift();
          if (tick > startNote.tick) {
            notes.push({
              startTick: startNote.tick,
              endTick: tick,
              pitch: a,
              velocity: startNote.velocity,
              channel,
            });
          }
        }
      }
    }

    return { index, name: name || `Track ${index + 1}`, notes, tempos };
  }

  function buildTempoMap(tempoEvents, ticksPerQuarter) {
    const events = tempoEvents
      .filter((event) => Number.isFinite(event.tick) && Number.isFinite(event.microsecondsPerQuarter))
      .sort((a, b) => a.tick - b.tick);
    if (!events.length || events[0].tick > 0) events.unshift({ tick: 0, microsecondsPerQuarter: DEFAULT_TEMPO });

    const map = [];
    let currentTempo = DEFAULT_TEMPO;
    let currentTick = 0;
    let currentSeconds = 0;
    events.forEach((event) => {
      if (event.tick < currentTick) return;
      currentSeconds += ((event.tick - currentTick) * currentTempo) / ticksPerQuarter / 1000000;
      currentTick = event.tick;
      currentTempo = event.microsecondsPerQuarter;
      map.push({ tick: currentTick, seconds: currentSeconds, microsecondsPerQuarter: currentTempo });
    });
    return map;
  }

  function secondsAtTick(tick, tempoMap, ticksPerQuarter) {
    let lo = 0;
    let hi = tempoMap.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tempoMap[mid].tick <= tick) lo = mid + 1;
      else hi = mid - 1;
    }
    const segment = tempoMap[Math.max(0, hi)];
    return segment.seconds + ((tick - segment.tick) * segment.microsecondsPerQuarter) / ticksPerQuarter / 1000000;
  }

  function parseMidi(arrayBuffer, fileName) {
    const bytes = new Uint8Array(arrayBuffer);
    if (readChunkId(bytes, 0) !== "MThd") throw new Error("Not a Standard MIDI file.");
    const headerLength = readU32(bytes, 4);
    const format = readU16(bytes, 8);
    const trackCount = readU16(bytes, 10);
    const division = readU16(bytes, 12);
    if (division & 0x8000) throw new Error("SMPTE time division is not supported yet.");
    const ticksPerQuarter = division;
    let pos = 8 + headerLength;
    const tracks = [];
    const tempos = [];
    for (let i = 0; i < trackCount && pos + 8 <= bytes.length; i += 1) {
      const id = readChunkId(bytes, pos);
      const length = readU32(bytes, pos + 4);
      pos += 8;
      if (id === "MTrk") {
        const track = parseTrack(bytes, pos, length, tracks.length);
        tracks.push(track);
        tempos.push(...track.tempos);
      }
      pos += length;
    }
    const tempoMap = buildTempoMap(tempos, ticksPerQuarter);
    const firstTempo = tempoMap[0]?.microsecondsPerQuarter || DEFAULT_TEMPO;
    tracks.forEach((track) => {
      track.notes.forEach((note) => {
        note.startSeconds = secondsAtTick(note.startTick, tempoMap, ticksPerQuarter);
        note.endSeconds = secondsAtTick(note.endTick, tempoMap, ticksPerQuarter);
      });
    });
    return {
      fileName,
      format,
      ticksPerQuarter,
      tracks,
      tempoMap,
      primaryBpm: Math.round(60000000 / firstTempo),
    };
  }

  function getSelectedTrack() {
    return midi?.tracks[selectedTrackIndex] || null;
  }

  function getTrackPitchRange(track) {
    const pitches = track.notes.map((note) => note.pitch);
    return {
      low: pitches.length ? Math.min(...pitches) : 48,
      high: pitches.length ? Math.max(...pitches) : 84,
    };
  }

  function setTrackPitchRange(track) {
    const range = getTrackPitchRange(track);
    elements.pitchLow.value = range.low;
    elements.pitchHigh.value = range.high;
  }

  function laneForPitch(pitch, low, high, laneCount) {
    if (high <= low) return 0;
    const ratio = (pitch - low) / (high - low + 1);
    return Math.max(0, Math.min(laneCount - 1, Math.floor(ratio * laneCount)));
  }

  function secondsFromTick(note, settings) {
    if (settings.timingMode === "overrideBpm") {
      const beat = 60 / settings.overrideBpm;
      return {
        start: (note.startTick / midi.ticksPerQuarter) * beat,
        end: (note.endTick / midi.ticksPerQuarter) * beat,
      };
    }
    return { start: note.startSeconds, end: note.endSeconds };
  }

  function readSettings() {
    const track = getSelectedTrack();
    const fallbackRange = track ? getTrackPitchRange(track) : { low: 48, high: 84 };
    const low = Math.max(0, Math.min(127, Math.round(Number(elements.pitchLow.value) || fallbackRange.low)));
    const high = Math.max(0, Math.min(127, Math.round(Number(elements.pitchHigh.value) || fallbackRange.high)));
    return {
      timingMode: elements.timingMode.value,
      overrideBpm: Math.max(40, Math.min(300, Number(elements.overrideBpm.value) || midi?.primaryBpm || getEditorBpm())),
      laneCount: Math.max(1, Math.min(12, Math.round(Number(elements.laneCount.value) || 4))),
      low: Math.min(low, high),
      high: Math.max(low, high),
      holdThreshold: Math.max(0.001, (Number(elements.holdThreshold.value) || 180) / 1000),
      quantize: elements.quantize.checked,
      mode: elements.applyMode.value === "merge" ? "merge" : "replace",
    };
  }

  function buildImportedNotes() {
    const track = getSelectedTrack();
    if (!track) return [];
    const settings = readSettings();
    const notes = track.notes.map((midiNote) => {
      const times = secondsFromTick(midiNote, settings);
      let time = times.start;
      let end = times.end;
      if (settings.quantize) {
        time = quantizeTime(time);
        end = quantizeTime(end);
      }
      time = Number(time.toFixed(3));
      end = Number(Math.max(end, time).toFixed(3));
      const duration = Number((end - time).toFixed(3));
      const lane = laneForPitch(midiNote.pitch, settings.low, settings.high, settings.laneCount);
      if (duration >= settings.holdThreshold) return { time, lane, type: "hold", duration };
      return { time, lane, type: "tap" };
    });
    return notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
  }

  function renderLaneMap() {
    if (!midi) return;
    const settings = readSettings();
    const chunks = [];
    for (let lane = 0; lane < settings.laneCount; lane += 1) {
      const laneLow = Math.round(settings.low + ((settings.high - settings.low + 1) * lane) / settings.laneCount);
      const laneHigh = Math.round(settings.low + ((settings.high - settings.low + 1) * (lane + 1)) / settings.laneCount - 1);
      chunks.push(`<span>Lane ${lane + 1}: ${pitchName(laneLow)}-${pitchName(Math.max(laneLow, laneHigh))}</span>`);
    }
    elements.laneMap.innerHTML = chunks.join("");
  }

  function renderSummary() {
    if (!midi) return;
    const track = getSelectedTrack();
    const settings = readSettings();
    const imported = buildImportedNotes();
    const holds = imported.filter((note) => note.type === "hold").length;
    const tempos = midi.tempoMap.length;
    const last = imported.reduce((max, note) => Math.max(max, note.time + (note.duration || 0)), 0);
    elements.summary.textContent =
      `${midi.fileName} · ${midi.ticksPerQuarter} PPQ · ${tempos} tempo event${tempos !== 1 ? "s" : ""} · ` +
      `${track?.notes.length || 0} MIDI notes -> ${imported.length} notes (${holds} holds) · ${formatTime(last)} · ` +
      `${settings.timingMode === "overrideBpm" ? `${settings.overrideBpm} BPM override` : `${midi.primaryBpm} BPM initial tempo`}`;
    renderLaneMap();
  }

  function renderTrackOptions() {
    elements.track.innerHTML = midi.tracks
      .map((track, index) => `<option value="${index}">${track.name} (${track.notes.length} notes)</option>`)
      .join("");
    elements.track.value = String(selectedTrackIndex);
  }

  function openModal() {
    elements.modal.hidden = false;
  }

  function close() {
    elements.modal.hidden = true;
  }

  async function open(file) {
    const arrayBuffer = await file.arrayBuffer();
    midi = parseMidi(arrayBuffer, file.name);
    if (!midi.tracks.length || !midi.tracks.some((track) => track.notes.length)) {
      throw new Error("This MIDI file has no note events to import.");
    }
    selectedTrackIndex = midi.tracks.reduce((best, track, index) => (track.notes.length > midi.tracks[best].notes.length ? index : best), 0);
    renderTrackOptions();
    elements.overrideBpm.value = midi.primaryBpm;
    elements.laneCount.value = Math.max(1, Math.min(12, Number(elements.laneCount.value) || 4));
    setTrackPitchRange(getSelectedTrack());
    renderSummary();
    openModal();
  }

  function apply() {
    if (!midi) return;
    const settings = readSettings();
    const notes = buildImportedNotes();
    onApply({
      notes,
      mode: settings.mode,
      laneCount: settings.laneCount,
      bpm: settings.timingMode === "overrideBpm" ? settings.overrideBpm : midi.primaryBpm,
      sourceName: midi.fileName.replace(/\.[^.]+$/, ""),
    });
    close();
  }

  function bind() {
    elements.track.addEventListener("change", () => {
      selectedTrackIndex = Number(elements.track.value) || 0;
      setTrackPitchRange(getSelectedTrack());
      renderSummary();
    });
    [
      elements.timingMode,
      elements.overrideBpm,
      elements.laneCount,
      elements.pitchLow,
      elements.pitchHigh,
      elements.holdThreshold,
      elements.quantize,
      elements.applyMode,
    ].forEach((el) => el.addEventListener("input", renderSummary));
    elements.apply.addEventListener("click", apply);
    elements.cancel.addEventListener("click", close);
    elements.modal.addEventListener("pointerdown", (event) => {
      if (event.target === elements.modal) close();
    });
  }

  bind();

  return { open, close };
}

if (typeof window !== "undefined") window.createMidiImporter = createMidiImporter;
