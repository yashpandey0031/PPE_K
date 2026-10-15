const api = {
  async getDashboard() {
    try {
      const response = await fetch("data/mock-api.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Mock API unavailable");
      return response.json();
    } catch {
      return fallbackData;
    }
  },
};

const fallbackData = {
  summary: {
    activeViolations: 18,
    resolvedToday: 42,
    monitoredWorkers: 126,
    modelConfidence: "92%",
  },
  zones: ["Entry gate", "Scaffold A", "Loading bay", "North trench"],
  violationMix: [
    { label: "No helmet", count: 8 },
    { label: "No vest", count: 13 },
    { label: "No goggles", count: 4 },
    { label: "No gloves", count: 6 },
    { label: "No mask", count: 3 },
  ],
  violations: [
    { time: "11:48 PM", worker: "W-104", item: "No vest", zone: "Entry gate", severity: "High", status: "Open", confidence: 0.94, camera: "CAM-02" },
    { time: "11:41 PM", worker: "W-087", item: "No helmet", zone: "Scaffold A", severity: "High", status: "Open", confidence: 0.91, camera: "CAM-04" },
    { time: "11:30 PM", worker: "W-211", item: "No goggles", zone: "Loading bay", severity: "Medium", status: "Review", confidence: 0.87, camera: "CAM-01" },
    { time: "11:12 PM", worker: "W-044", item: "No gloves", zone: "North trench", severity: "Medium", status: "Resolved", confidence: 0.89, camera: "CAM-07" },
    { time: "10:58 PM", worker: "W-119", item: "No mask", zone: "Scaffold A", severity: "Low", status: "Resolved", confidence: 0.83, camera: "CAM-04" },
  ],
};

const state = {
  data: fallbackData,
  activeView: "overview",
  zone: "all",
  query: "",
};

const metricsEl = document.querySelector("#metrics");
const chartEl = document.querySelector("#violationChart");
const rowsEl = document.querySelector("#violationRows");
const zoneFilter = document.querySelector("#zoneFilter");
const searchInput = document.querySelector("#searchInput");
const tableTitle = document.querySelector("#tableTitle");
const tableKicker = document.querySelector("#tableKicker");
const viewKicker = document.querySelector("#viewKicker");
const viewTitle = document.querySelector("#viewTitle");
const viewSummary = document.querySelector("#viewSummary");
const overviewPanels = document.querySelector("#overviewPanels");
const workerPanels = document.querySelector("#workerPanels");
const cameraTitle = document.querySelector("#cameraTitle");
const cameraStatus = document.querySelector("#cameraStatus");
const detectionLabel = document.querySelector("#detectionLabel");
const mostFlaggedId = document.querySelector("#mostFlaggedId");
const mostFlaggedCopy = document.querySelector("#mostFlaggedCopy");
const repeatRiskCount = document.querySelector("#repeatRiskCount");
const repeatRiskCopy = document.querySelector("#repeatRiskCopy");
const loginDialog = document.querySelector("#loginDialog");

document.querySelectorAll("[data-open-login]").forEach((button) => {
  button.addEventListener("click", () => loginDialog?.showModal());
});

document.querySelector("#quickLogin")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.querySelector("[data-refresh]")?.addEventListener("click", async () => {
  state.data = await api.getDashboard();
  render();
});

zoneFilter?.addEventListener("change", (event) => {
  state.zone = event.target.value;
  renderMetrics();
  renderChart();
  renderLivePanel();
  renderWorkerPanels();
  renderRows();
});

searchInput?.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  renderRows();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeView = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderViewHeader();
    renderWorkerPanels();
    renderRows();
  });
});

function render() {
  if (!metricsEl) return;
  renderZoneFilter();
  renderMetrics();
  renderChart();
  renderLivePanel();
  renderWorkerPanels();
  renderViewHeader();
  renderRows();
}

function renderZoneFilter() {
  if (!zoneFilter) return;
  const options = ["all", ...state.data.zones];
  zoneFilter.innerHTML = options
    .map((zone) => `<option value="${zone}">${zone === "all" ? "All zones" : zone}</option>`)
    .join("");
  zoneFilter.value = state.zone;
}

function renderMetrics() {
  if (!metricsEl) return;
  const rows = getZoneViolations();
  const hasZoneFilter = state.zone !== "all";
  const activeCount = rows.filter((violation) => violation.status !== "Resolved").length;
  const resolvedCount = rows.filter((violation) => violation.status === "Resolved").length;
  const workerCount = new Set(rows.map((violation) => violation.worker)).size;
  const confidenceValues = rows.map((violation) => violation.confidence).filter(Boolean);
  const avgConfidence = confidenceValues.length
    ? `${Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)}%`
    : "--";
  const cards = [
    ["Active violations", hasZoneFilter ? activeCount : state.data.summary.activeViolations],
    ["Resolved today", hasZoneFilter ? resolvedCount : state.data.summary.resolvedToday],
    ["Temporary worker IDs", hasZoneFilter ? workerCount : state.data.summary.monitoredWorkers],
    ["Avg. model confidence", hasZoneFilter ? avgConfidence : state.data.summary.modelConfidence],
  ];

  metricsEl.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderChart() {
  if (!chartEl) return;
  const mix = getViolationMix();
  const max = Math.max(...mix.map((item) => item.count), 1);
  chartEl.innerHTML = mix.length
    ? mix
    .map((item) => {
      const width = Math.round((item.count / max) * 100);
      return `
        <div class="bar-row">
          <strong>${item.label}</strong>
          <span class="bar-track"><span class="bar-fill" style="width: ${width}%"></span></span>
          <span>${item.count}</span>
        </div>
      `;
    })
    .join("")
    : `<p class="empty-state">No PPE violations found for this zone.</p>`;
}

function renderLivePanel() {
  if (!cameraTitle || !cameraStatus || !detectionLabel) return;
  const row = getZoneViolations().find((violation) => violation.status !== "Resolved") || getZoneViolations()[0];

  if (!row) {
    cameraTitle.textContent = state.zone === "all" ? "All camera zones" : state.zone;
    cameraStatus.textContent = "Clear";
    cameraStatus.className = "status-pill severity-low";
    detectionLabel.textContent = "No active detection";
    return;
  }

  cameraTitle.textContent = `${row.camera || "Camera"} - ${row.zone}`;
  cameraStatus.textContent = row.status === "Resolved" ? "Resolved" : "Violation";
  cameraStatus.className = `status-pill ${severityClass(row.severity)}`;
  detectionLabel.textContent = `${row.item} - ${row.worker}`;
}

function renderWorkerPanels() {
  if (!mostFlaggedId || !mostFlaggedCopy || !repeatRiskCount || !repeatRiskCopy) return;
  const rows = getZoneViolations();
  const workerCounts = rows.reduce((counts, violation) => {
    counts[violation.worker] = (counts[violation.worker] || 0) + 1;
    return counts;
  }, {});
  const sortedWorkers = Object.entries(workerCounts).sort((a, b) => b[1] - a[1]);
  const [worker = "None", count = 0] = sortedWorkers[0] || [];
  const repeatWorkers = sortedWorkers.filter(([, total]) => total > 1).length;
  const zoneLabel = state.zone === "all" ? "all zones" : state.zone;

  mostFlaggedId.textContent = worker;
  mostFlaggedCopy.textContent = count
    ? `${count} violation${count === 1 ? "" : "s"} grouped in ${zoneLabel}.`
    : `No temporary worker IDs found in ${zoneLabel}.`;
  repeatRiskCount.textContent = `${repeatWorkers} worker${repeatWorkers === 1 ? "" : "s"}`;
  repeatRiskCopy.textContent = `Workers with two or more PPE events in ${zoneLabel}.`;
}

function renderViewHeader() {
  const copy = copyForView(state.activeView);
  if (viewKicker) viewKicker.textContent = copy.kicker;
  if (viewTitle) viewTitle.textContent = copy.title;
  if (viewSummary) viewSummary.textContent = copy.summary;
  if (tableKicker) tableKicker.textContent = copy.tableKicker;
  if (overviewPanels) overviewPanels.hidden = state.activeView === "workers" || state.activeView === "history";
  if (workerPanels) workerPanels.hidden = state.activeView !== "workers";
}

function renderRows() {
  if (!rowsEl || !tableTitle) return;
  const rows = getFilteredViolations();
  tableTitle.textContent = titleForView(state.activeView);
  rowsEl.innerHTML = rows.length
    ? rows.map(rowTemplate).join("")
    : `<tr><td colspan="6">No matching violations in this view.</td></tr>`;
}

function getFilteredViolations() {
  return getZoneViolations().filter((violation) => {
    const queryMatch =
      !state.query ||
      [violation.worker, violation.item, violation.zone, violation.severity, violation.status]
        .join(" ")
        .toLowerCase()
        .includes(state.query);
    const viewMatch =
      state.activeView === "overview" ||
      (state.activeView === "violations" && violation.status !== "Resolved") ||
      (state.activeView === "workers" && violation.worker) ||
      (state.activeView === "history" && ["Resolved", "Review"].includes(violation.status));
    return queryMatch && viewMatch;
  });
}

function getZoneViolations() {
  return state.data.violations.filter((violation) => state.zone === "all" || violation.zone === state.zone);
}

function getViolationMix() {
  if (state.zone === "all") return state.data.violationMix;

  const counts = getZoneViolations().reduce((items, violation) => {
    items[violation.item] = (items[violation.item] || 0) + 1;
    return items;
  }, {});

  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

function rowTemplate(violation) {
  return `
    <tr>
      <td>${violation.time}</td>
      <td><strong>${violation.worker}</strong></td>
      <td>${violation.item}</td>
      <td>${violation.zone}</td>
      <td><span class="${severityClass(violation.severity)} status-pill">${violation.severity}</span></td>
      <td class="${statusClass(violation.status)}">${violation.status}</td>
    </tr>
  `;
}

function severityClass(severity) {
  return `severity-${severity.toLowerCase()}`;
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function titleForView(view) {
  const titles = {
    overview: "Recent PPE violations",
    violations: "Open violation records",
    workers: "Temporary worker identification",
    history: "Review and resolved history",
  };
  return titles[view];
}

function copyForView(view) {
  const copy = {
    overview: {
      kicker: "Supervisor console",
      title: "Safety operations dashboard",
      summary: "Live PPE compliance overview for site supervisors.",
      tableKicker: "Action queue",
    },
    violations: {
      kicker: "Violation center",
      title: "Open PPE violations",
      summary: "Current unresolved safety events grouped by worker, zone, and missing equipment.",
      tableKicker: "Needs action",
    },
    workers: {
      kicker: "Identification",
      title: "Temporary worker IDs",
      summary: "Track repeated violations using temporary IDs until permanent identity integration is ready.",
      tableKicker: "Worker records",
    },
    history: {
      kicker: "Audit trail",
      title: "Violation history",
      summary: "Resolved and reviewed events for supervisor follow-up and project reporting.",
      tableKicker: "Past events",
    },
  };
  return copy[view];
}

if (metricsEl) api.getDashboard().then((data) => {
  state.data = data;
  render();
});
