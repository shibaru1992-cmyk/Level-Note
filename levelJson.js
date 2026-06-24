(function () {
  function normalizeMetadata(metadata) {
    if (Array.isArray(metadata)) {
      return metadata
        .filter((item) => item && typeof item.key === "string")
        .map((item) => ({ key: item.key, value: item.value ?? "" }));
    }
    if (metadata && typeof metadata === "object") {
      return Object.entries(metadata).map(([key, value]) => ({ key, value: value ?? "" }));
    }
    return [];
  }

  function fromJsonPoint(point) {
    if (!point) return null;
    return {
      time: Number(point.startTime ?? point.time),
      lane: point.lane,
    };
  }

  function fromJsonNote(rawNote) {
    const note = rawNote || {};
    return {
      ...note,
      time: note.startTime ?? note.time,
      points: note.curvePoints ?? note.points,
      meta: note.metadata ?? note.meta,
    };
  }

  function toJsonPoint(point) {
    return {
      startTime: point.time,
      lane: point.lane,
    };
  }

  function toJsonNote(note) {
    return {
      id: note.id,
      startTime: note.time,
      lane: note.lane,
      type: note.type,
      ...(note.type === "hold" ? { duration: note.duration } : {}),
      ...(note.type === "curve" ? { curvePoints: note.points.map(toJsonPoint) } : {}),
      metadata: normalizeMetadata(note.meta),
    };
  }

  function toJsonPayload(state, settings) {
    return {
      version: 1,
      song: state.songName || "untitled",
      bpm: Number(settings.bpm),
      lpb: settings.lpb,
      offsetMs: settings.offsetMs,
      declaredLaneCount: state.laneCount,
      duration: Number((state.duration || 0).toFixed(3)),
      notes: state.notes.map(toJsonNote),
      metaKeyDefs: state.metaKeyDefs.map((d) => ({
        key: d.key,
        defaultValue: d.defaultValue,
        values: (d.values || []).map((v) => ({ value: v.value, color: v.color })),
      })),
      colorMode: state.colorMode,
      colorByKey: state.colorByKey,
      typeColors: { ...state.typeColors },
    };
  }

  function getDeclaredLaneCount(payload) {
    return Number(payload.declaredLaneCount ?? payload.lanes);
  }

  window.LevelJson = {
    fromJsonNote,
    fromJsonPoint,
    getDeclaredLaneCount,
    normalizeMetadata,
    toJsonPayload,
  };
})();
