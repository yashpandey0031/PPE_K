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
  ],
  violations: [
    { time: "11:48 PM", worker: "W-104", item: "No vest", zone: "Entry gate", severity: "High", status: "Open" },
    { time: "11:41 PM", worker: "W-087", item: "No helmet", zone: "Scaffold A", severity: "High", status: "Open" },
    { time: "11:30 PM", worker: "W-211", item: "No goggles", zone: "Loading bay", severity: "Medium", status: "Review" },
    { time: "11:12 PM", worker: "W-044", item: "No gloves", zone: "North trench", severity: "Medium", status: "Resolved" },
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
const loginDialog = document.querySelector("#loginDialog");

document.querySelectorAll("[data-open-login]").forEach((button) => {
  button.addEventListener("click", () => loginDialog.showModal());
});

document.querySelector("#quickLogin").addEventListener("click", () => {
  loginDialog.close();
  document.querySelector("#dashboard-preview").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("[data-refresh]").addEventListener("click", async () => {
  state.data = await api.getDashboard();
  render();
});

zoneFilter.addEventListener("change", (event) => {
  state.zone = event.target.value;
  renderRows();
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  renderRows();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeView = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderRows();
  });
});

function render() {
  renderZoneFilter();
  renderMetrics();
  renderChart();
  renderRows();
}

function renderZoneFilter() {
  const options = ["all", ...state.data.zones];
  zoneFilter.innerHTML = options
    .map((zone) => `<option value="${zone}">${zone === "all" ? "All zones" : zone}</option>`)
    .join("");
  zoneFilter.value = state.zone;
}

function renderMetrics() {
  const cards = [
    ["Active violations", state.data.summary.activeViolations],
    ["Resolved today", state.data.summary.resolvedToday],
    ["Temporary worker IDs", state.data.summary.monitoredWorkers],
    ["Avg. model confidence", state.data.summary.modelConfidence],
  ];

  metricsEl.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderChart() {
  const max = Math.max(...state.data.violationMix.map((item) => item.count));
  chartEl.innerHTML = state.data.violationMix
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
    .join("");
}

function renderRows() {
  const rows = getFilteredViolations();
  tableTitle.textContent = titleForView(state.activeView);
  rowsEl.innerHTML = rows.length
    ? rows.map(rowTemplate).join("")
    : `<tr><td colspan="6">No matching violations in this view.</td></tr>`;
}

function getFilteredViolations() {
  return state.data.violations.filter((violation) => {
    const zoneMatch = state.zone === "all" || violation.zone === state.zone;
    const queryMatch =
      !state.query ||
      [violation.worker, violation.item, violation.zone, violation.severity, violation.status]
        .join(" ")
        .toLowerCase()
        .includes(state.query);
    const viewMatch =
      state.activeView === "overview" ||
      state.activeView === "violations" ||
      (state.activeView === "workers" && violation.worker) ||
      (state.activeView === "history" && ["Resolved", "Review"].includes(violation.status));
    return zoneMatch && queryMatch && viewMatch;
  });
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

api.getDashboard().then((data) => {
  state.data = data;
  render();
});
