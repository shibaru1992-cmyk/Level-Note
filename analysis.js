function createAnalysisRenderer({ state, getBpm, elements }) {
  const chartColors = {
    bg: "#181c20",
    grid: "rgba(255,255,255,0.08)",
    text: "#9aa6b2",
    accent: "#45d39a",
    accentFill: "rgba(69, 211, 154, 0.13)",
    purple: "#b98cff",
    purpleFill: "rgba(185, 140, 255, 0.13)",
    blue: "#62a8ff",
    teal: "#4dd5ff",
    yellow: "#ffcc66",
    red: "#ff6b6b",
    green: "#45d39a",
  };

  function resizeCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(360, Math.floor(rect.width * scale));
    canvas.height = Math.max(160, Math.floor(rect.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function getAnalysisEvents() {
    return state.notes
      .flatMap((note) => {
        if (note.type === "curve") {
          return note.points.map((point) => ({ time: point.time, lane: point.lane, type: "curve" }));
        }
        if (note.type === "hold") {
          return [{ time: note.time, lane: note.lane, type: "hold" }];
        }
        return [{ time: note.time, lane: note.lane, type: "tap" }];
      })
      .sort((a, b) => a.time - b.time);
  }

  function groupChordEvents(events) {
    const chordThreshold = 0.05;
    const groups = [];
    events.forEach((event) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && event.time - lastGroup.time <= chordThreshold) {
        lastGroup.events.push(event);
        lastGroup.time = Math.min(lastGroup.time, event.time);
      } else {
        groups.push({ time: event.time, events: [event] });
      }
    });
    return groups;
  }

  function getChordSide(group) {
    const averageLane = group.events.reduce((sum, event) => sum + event.lane, 0) / group.events.length;
    return averageLane < (state.laneCount - 1) / 2 ? "left" : "right";
  }

  function getCurveDifficultyContribution(note, startTime, endTime, duration) {
    if (note.type !== "curve" || note.points.length < 2 || duration <= 0) return 0;
    const segments = [];
    for (let i = 1; i < note.points.length; i += 1) {
      const from = note.points[i - 1];
      const to = note.points[i];
      const segmentStart = Math.min(from.time, to.time);
      const segmentEnd = Math.max(from.time, to.time);
      if (segmentEnd < startTime || segmentStart >= endTime) continue;
      segments.push({ from, to });
    }
    if (!segments.length) return 0;

    const laneTravel = segments.reduce((sum, segment) => sum + Math.abs(segment.to.lane - segment.from.lane), 0);
    let directionChanges = 0;
    for (let i = 1; i < segments.length; i += 1) {
      const previousDirection = Math.sign(segments[i - 1].to.lane - segments[i - 1].from.lane);
      const currentDirection = Math.sign(segments[i].to.lane - segments[i].from.lane);
      if (previousDirection && currentDirection && previousDirection !== currentDirection) directionChanges += 1;
    }
    return (segments.length * 0.22 + laneTravel * 0.32 + directionChanges * 0.45) / duration;
  }

  function getCurveDifficultyTotal(startTime, endTime) {
    const duration = Math.max(0.001, endTime - startTime);
    return state.notes.reduce((sum, note) => sum + getCurveDifficultyContribution(note, startTime, endTime, duration), 0);
  }

  function calculateMetrics(events, duration) {
    if (!events.length || duration <= 0) {
      return { score: 0, nps: 0, avgChordSize: 0, handAlternationRate: 0, burstDensity: 0, maxChord: 0 };
    }
    const groups = groupChordEvents(events);
    const nps = events.length / duration;
    const avgChordSize = groups.reduce((sum, group) => sum + group.events.length, 0) / groups.length;
    const maxChord = Math.max(...groups.map((group) => group.events.length));
    let handSwitches = 0;
    for (let i = 1; i < groups.length; i += 1) {
      if (getChordSide(groups[i]) !== getChordSide(groups[i - 1])) handSwitches += 1;
    }
    let burstCount = 0;
    for (let i = 1; i < events.length; i += 1) {
      if (events[i].time - events[i - 1].time <= 0.15) burstCount += 1;
    }
    const handAlternationRate = handSwitches / duration;
    const burstDensity = burstCount / duration;
    const score = nps * 0.5 + avgChordSize * 1.5 + handAlternationRate + burstDensity * 2;
    return { score, nps, avgChordSize, handAlternationRate, burstDensity, maxChord };
  }

  function analyze() {
    const events = getAnalysisEvents();
    if (!state.duration || !events.length) {
      return {
        score: 0,
        label: "No data",
        events,
        windows: [],
        chordDistribution: [0, 0, 0, 0, 0],
        laneDistribution: Array.from({ length: state.laneCount }, () => 0),
        patternBreakdown: getPatternBreakdown([], []),
        heatmap: getLaneHeatmap([]),
        metrics: { nps: 0, avgChordSize: 0, handAlternationRate: 0, burstDensity: 0, curveDifficulty: 0, maxChord: 0 },
      };
    }

    const windowSize = 2;
    const windowCount = Math.max(1, Math.ceil(state.duration / windowSize));
    const windows = Array.from({ length: windowCount }, (_, index) => {
      const start = index * windowSize;
      const end = Math.min(state.duration, start + windowSize);
      const windowEvents = events.filter((event) => event.time >= start && event.time < end);
      const metrics = calculateMetrics(windowEvents, Math.max(0.001, end - start));
      metrics.curveDifficulty = getCurveDifficultyTotal(start, end);
      metrics.score += metrics.curveDifficulty;
      return { start, end, nps: metrics.nps, score: metrics.score, metrics };
    });

    const metrics = calculateMetrics(events, state.duration);
    metrics.curveDifficulty = getCurveDifficultyTotal(0, state.duration);
    metrics.score += metrics.curveDifficulty;

    const chordDistribution = [0, 0, 0, 0, 0];
    const groups = groupChordEvents(events);
    groups.forEach((group) => {
      const index = Math.min(4, group.events.length - 1);
      chordDistribution[index] += 1;
    });
    const laneDistribution = Array.from({ length: state.laneCount }, () => 0);
    events.forEach((event) => {
      if (event.lane >= 0 && event.lane < laneDistribution.length) laneDistribution[event.lane] += 1;
    });
    const patternBreakdown = getPatternBreakdown(events, groups);
    const heatmap = getLaneHeatmap(events);

    const score = Math.round(metrics.score * 10) / 10;
    const label = score < 4 ? "Easy" : score < 7 ? "Normal" : score < 11 ? "Hard" : score < 16 ? "Expert" : "Master";
    return { score, label, events, windows, chordDistribution, laneDistribution, patternBreakdown, heatmap, metrics };
  }

  function getPatternBreakdown(events, groups) {
    const total = Math.max(1, events.length);
    const singleTap = events.filter((event) => event.type === "tap").length;
    const burst = events.filter((event, index) => index > 0 && event.time - events[index - 1].time <= 0.15).length;
    const twoChord = groups.filter((group) => group.events.length === 2).length;
    const threePlusChord = groups.filter((group) => group.events.length >= 3).length;
    const curve = events.filter((event) => event.type === "curve").length;
    return [
      { label: "Single tap", count: singleTap, color: chartColors.blue },
      { label: "Burst", count: burst, color: chartColors.purple },
      { label: "2-note chord", count: twoChord, color: chartColors.yellow },
      { label: "3+ note chord", count: threePlusChord, color: chartColors.red },
      { label: "Curve point", count: curve, color: chartColors.teal },
    ].map((item) => ({
      ...item,
      percent: Math.round((item.count / total) * 100),
    }));
  }

  function getLaneHeatmap(events) {
    const segmentCount = Math.min(20, Math.max(8, Math.ceil((state.duration || 1) / 7)));
    const segmentDuration = Math.max(0.001, (state.duration || 1) / segmentCount);
    const cells = Array.from({ length: state.laneCount }, () => Array.from({ length: segmentCount }, () => 0));
    events.forEach((event) => {
      const segment = Math.min(segmentCount - 1, Math.floor(event.time / segmentDuration));
      if (event.lane >= 0 && event.lane < state.laneCount) cells[event.lane][segment] += 1;
    });
    const max = Math.max(1, ...cells.flat());
    return { segmentCount, segmentDuration, cells, max };
  }

  function clear(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = chartColors.bg;
    ctx.fillRect(0, 0, width, height);
  }

  function drawNpsChart(analysis) {
    const { width, height } = resizeCanvas(elements.npsChart, elements.npsCtx);
    const ctx = elements.npsCtx;
    clear(ctx, width, height);
    const padding = { left: 38, right: 18, top: 16, bottom: 28 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxNps = Math.max(3, ...analysis.windows.map((window) => window.nps));

    ctx.strokeStyle = chartColors.grid;
    ctx.fillStyle = chartColors.text;
    ctx.font = "11px Inter, system-ui, sans-serif";
    for (let i = 0; i <= 5; i += 1) {
      const y = padding.top + plotHeight * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(((maxNps * (5 - i)) / 5).toFixed(1), 8, y + 4);
    }

    if (!analysis.windows.length) return;
    ctx.beginPath();
    analysis.windows.forEach((window, index) => {
      const x = padding.left + (index / Math.max(1, analysis.windows.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - (window.nps / maxNps) * plotHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineWidth = 2;
    ctx.strokeStyle = chartColors.accent;
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, chartColors.accentFill);
    gradient.addColorStop(1, "rgba(69, 211, 154, 0)");
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    const ticks = 6;
    ctx.fillStyle = chartColors.text;
    for (let i = 0; i <= ticks; i += 1) {
      const x = padding.left + (i / ticks) * plotWidth;
      const time = Math.round((state.duration * i) / ticks);
      ctx.fillText(`${time}s`, x - 8, height - 8);
    }
  }

  function drawChordChart(analysis) {
    const { width, height } = resizeCanvas(elements.chordChart, elements.chordCtx);
    const ctx = elements.chordCtx;
    clear(ctx, width, height);
    const padding = { left: 38, right: 14, top: 14, bottom: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(1, ...analysis.chordDistribution);
    const colors = ["#45d39a", "#62a8ff", "#ffcc66", "#ff7ba7", "#b98cff"];

    ctx.strokeStyle = chartColors.grid;
    ctx.fillStyle = chartColors.text;
    ctx.font = "11px Inter, system-ui, sans-serif";
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + plotHeight * (i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const gap = 18;
    const barWidth = (plotWidth - gap * 4) / 5;
    analysis.chordDistribution.forEach((value, index) => {
      const x = padding.left + index * (barWidth + gap);
      const barHeight = (value / maxValue) * plotHeight;
      ctx.fillStyle = colors[index];
      ctx.beginPath();
      ctx.roundRect(x, padding.top + plotHeight - barHeight, barWidth, barHeight, 6);
      ctx.fill();
      ctx.fillStyle = chartColors.text;
      ctx.fillText(`${index + 1} finger${index ? "s" : ""}`, x - 2, height - 10);
    });
  }

  function drawRadarChart(analysis) {
    const { width, height } = resizeCanvas(elements.radarChart, elements.radarCtx);
    const ctx = elements.radarCtx;
    clear(ctx, width, height);
    const centerX = width / 2;
    const centerY = height / 2 + 8;
    const radius = Math.min(width, height) * 0.34;
    const labels = ["Speed", "Density", "Chord", "Burst", "Curve", "Switch"];
    const values = [
      Math.min(1, analysis.metrics.nps / 12),
      Math.min(1, analysis.metrics.nps / 8),
      Math.min(1, analysis.metrics.avgChordSize / 4),
      Math.min(1, analysis.metrics.burstDensity / 8),
      Math.min(1, analysis.metrics.curveDifficulty / 3),
      Math.min(1, analysis.metrics.handAlternationRate / 4),
    ];

    ctx.strokeStyle = chartColors.grid;
    ctx.fillStyle = chartColors.text;
    ctx.font = "11px Inter, system-ui, sans-serif";
    for (let ring = 1; ring <= 5; ring += 1) {
      ctx.beginPath();
      labels.forEach((_, index) => {
        const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius * (ring / 5);
        const y = centerY + Math.sin(angle) * radius * (ring / 5);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * (radius + 24);
      const y = centerY + Math.sin(angle) * (radius + 24);
      ctx.fillText(label, x - label.length * 3, y + 4);
    });

    ctx.beginPath();
    values.forEach((value, index) => {
      const angle = -Math.PI / 2 + (index / values.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(69, 211, 154, 0.18)";
    ctx.strokeStyle = chartColors.accent;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  function drawLaneChart(analysis) {
    const { width, height } = resizeCanvas(elements.columnChart, elements.columnCtx);
    const ctx = elements.columnCtx;
    clear(ctx, width, height);
    const padding = { left: 38, right: 14, top: 14, bottom: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(1, ...analysis.laneDistribution);
    const palette = ["#45d39a", "#62a8ff", "#ffcc66", "#ff7ba7", "#b98cff", "#4dd5ff", "#f28c5b", "#a7e05f", "#f071d5", "#78d8b0", "#d6ba5f", "#8aa4ff"];

    ctx.strokeStyle = chartColors.grid;
    ctx.fillStyle = chartColors.text;
    ctx.font = "11px Inter, system-ui, sans-serif";
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + plotHeight * (i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const laneCount = Math.max(1, analysis.laneDistribution.length);
    const gap = laneCount > 8 ? 6 : 14;
    const barWidth = Math.max(8, (plotWidth - gap * (laneCount - 1)) / laneCount);
    analysis.laneDistribution.forEach((value, index) => {
      const x = padding.left + index * (barWidth + gap);
      const barHeight = (value / maxValue) * plotHeight;
      ctx.fillStyle = palette[index % palette.length];
      ctx.beginPath();
      ctx.roundRect(x, padding.top + plotHeight - barHeight, barWidth, barHeight, 6);
      ctx.fill();
      ctx.fillStyle = chartColors.text;
      ctx.fillText(`Lane ${index + 1}`, x - 1, height - 10);
    });
  }

  function renderPatternTable(analysis) {
    const maxCount = Math.max(1, ...analysis.patternBreakdown.map((item) => item.count));
    elements.patternTableBody.innerHTML = analysis.patternBreakdown
      .map(
        (item) => `<tr>
          <td>${item.label}</td>
          <td>${item.count}</td>
          <td>${item.percent}%</td>
          <td class="frequency-cell">
            <div class="frequency-track">
              <div class="frequency-fill" style="width:${(item.count / maxCount) * 100}%;background:${item.color}"></div>
            </div>
          </td>
        </tr>`,
      )
      .join("");
  }

  function renderLaneHeatmap(analysis) {
    const { segmentCount, segmentDuration, cells, max } = analysis.heatmap;
    elements.laneHeatmap.style.setProperty("--heatmap-columns", segmentCount);
    const header = `<div class="heatmap-row">
      <span></span>
      ${Array.from({ length: segmentCount }, (_, index) => `<span class="heatmap-label">${Math.round(index * segmentDuration)}s</span>`).join("")}
    </div>`;
    const rows = cells
      .map(
        (row, laneIndex) => `<div class="heatmap-row">
          <span class="heatmap-label">Lane ${laneIndex + 1}</span>
          ${row
            .map((value) => {
              const t = value / max;
              const hue = t > 0.65 ? "#dc2760" : t > 0.32 ? "#8b3fa4" : "#4b3b85";
              return `<span class="heatmap-cell" style="background:${hue};opacity:${0.35 + t * 0.65}"></span>`;
            })
            .join("")}
        </div>`,
      )
      .join("");
    elements.laneHeatmap.innerHTML = header + rows;
  }

  return function renderAnalysis() {
    const analysis = analyze();
    elements.kpiScore.textContent = String(analysis.score);
    elements.kpiDifficultyLabel.textContent = analysis.label;
    elements.kpiPeakNps.textContent = analysis.windows.length ? Math.max(...analysis.windows.map((window) => window.nps)).toFixed(1) : "0";
    elements.kpiAvgNps.textContent = analysis.metrics.nps.toFixed(1);
    elements.kpiBpm.textContent = String(getBpm());
    elements.kpiTotalNotes.textContent = String(state.notes.length);
    elements.kpiDuration.textContent = `${Math.round(state.duration || 0)}s duration`;
    elements.kpiMaxChord.textContent = String(analysis.metrics.maxChord || 0);
    drawNpsChart(analysis);
    drawChordChart(analysis);
    drawRadarChart(analysis);
    drawLaneChart(analysis);
    renderPatternTable(analysis);
    renderLaneHeatmap(analysis);
  };
}
