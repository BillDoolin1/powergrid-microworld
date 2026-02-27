// ============================================================
//  Power Grid Microworld — script.js
// ============================================================

// ---- Energy source definitions (shared across all levels) ----
const ENERGY_SOURCES = [
  { type: "oil",      label: "Oil",           baseCap: 5.75,  baseGge: 9.50,  unitCap: 0.35, unitGge: 0.10, construct: 1.0, operating: 110, leadTime: 2 },
  { type: "gas",      label: "Gas",           baseCap: 13.16, baseGge: 17.50, unitCap: 0.35, unitGge: 0.10, construct: 1.2, operating:  70, leadTime: 4 },
  { type: "wind",     label: "Wind",          baseCap: 10.46, baseGge:  0.20, unitCap: 0.25, unitGge: 0.00, construct: 1.4, operating: 100, leadTime: 5 },
  { type: "solar",    label: "Solar",         baseCap:  1.05, baseGge:  0.08, unitCap: 0.45, unitGge: 0.00, construct: 1.8, operating: 150, leadTime: 3 },
  { type: "offshore", label: "Offshore Wind", baseCap:  0.90, baseGge:  0.05, unitCap: 0.45, unitGge: 0.00, construct: 2.5, operating: 200, leadTime: 6 },
  { type: "nuclear",  label: "Nuclear",       baseCap:  3.20, baseGge:  0.10, unitCap: 3.25, unitGge: 0.00, construct: 3.0, operating: 250, leadTime: 7 },
  { type: "hydro",    label: "Hydro",         baseCap:  0.36, baseGge:  0.02, unitCap: 0.25, unitGge: 0.00, construct: 2.2, operating: 180, leadTime: 4 },
];

// ---- Level configurations ----
const LEVELS = {
  1: {
    name: "Tutorial",
    budgetM: 5000,
    capacityTarget: 50,
    ggeTarget: 24,
    years: [2026],
    startingMix: {},
    demandByYear: { 2026: 34 },
    investments: [
      { id: "solar-grant",  label: "Home Solar Panel Grant",  costM:  75, ggeReduction: 2.0 },
      { id: "heat-pump",    label: "Heat Pump Grant",          costM: 100, ggeReduction: 3.5 },
      { id: "retrofitting", label: "Retrofitting Allowance",  costM: 200, ggeReduction: 5.0 },
    ],
  },
  2: {
    name: "Near-Term Planning",
    budgetM: 2000,
    years: [2026, 2027, 2028],
    startingMix: { gas: 3, oil: 2, wind: 1 },
    // targets tighten each year
    capacityTargetByYear: { 2026: 34, 2027: 37, 2028: 40 },
    ggeTargetByYear:      { 2026: 22, 2027: 20, 2028: 18 },
    demandByYear:         { 2026: 34, 2027: 36, 2028: 38 },
    investments: [
      { id: "heat-pump",    label: "Heat Pump Grant",          costM: 100, ggeReduction: 3.5 },
      { id: "retrofitting", label: "Retrofitting Allowance",  costM: 200, ggeReduction: 5.0 },
      { id: "ev-subsidy",   label: "EV Subsidy Scheme",        costM: 150, ggeReduction: 4.0 },
    ],
  },
  3: {
    name: "2030 Net Zero Challenge",
    budgetM: 1000,
    years: [2026, 2027, 2028, 2029, 2030],
    startingMix: { gas: 5, oil: 3, wind: 2, nuclear: 1 },
    capacityTargetByYear: { 2026: 34, 2027: 38, 2028: 44, 2029: 52, 2030: 60 },
    ggeTargetByYear:      { 2026: 20, 2027: 17, 2028: 14, 2029: 12, 2030: 10 },
    demandByYear:         { 2026: 34, 2027: 36, 2028: 38, 2029: 39, 2030: 40 },
    investments: [
      { id: "retrofitting", label: "Retrofitting Allowance",  costM: 200, ggeReduction: 5.0 },
      { id: "carbon-tax",   label: "Carbon Tax",               costM:  50, ggeReduction: 6.0 },
      { id: "ev-subsidy",   label: "EV Subsidy Scheme",        costM: 150, ggeReduction: 4.0 },
      { id: "smart-grid",   label: "Smart Grid Investment",    costM: 300, ggeReduction: 2.0 },
    ],
  },
};

// ============================================================
//  Bootstrap on DOM ready
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

  // ---- DOM refs (stable, single-instance elements) ----
  const startScreen          = document.getElementById("start-screen");
  const gameScreen           = document.getElementById("game-screen");
  const welcomeFlash         = document.getElementById("welcome-flash");
  const levelSelectContainer = document.getElementById("level-select-container");
  const levelScreen          = document.getElementById("level-screen");
  const levelButtons         = document.querySelectorAll(".level-btn");

  const nameForm  = document.getElementById("name-form");
  const nameInput = document.getElementById("player-name");

  // Header
  const levelTitle           = document.getElementById("level-title");
  const headerBudgetSpent    = document.getElementById("header-budget-spent");
  const headerBudgetRemaining= document.getElementById("header-budget-remaining");
  const yearControls         = document.getElementById("year-controls");
  const currentYearLabel     = document.getElementById("current-year-label");
  const prevYearBtn          = document.getElementById("prev-year-btn");
  const nextYearBtn          = document.getElementById("next-year-btn");
  const timerEl              = document.getElementById("timer");
  const pauseBtn             = document.getElementById("pause-btn");

  // Game area
  const goalsTitle           = document.getElementById("goals-title");
  const goalsList            = document.getElementById("goals-list");
  const energyTableBody      = document.getElementById("energy-table-body");
  const investmentList       = document.getElementById("investment-list");
  const capTotalEl           = document.getElementById("cap-total");
  const ggeTotalEl           = document.getElementById("gge-total");

  // Overlays
  const pauseOverlay         = document.getElementById("pause-overlay");
  const resumeBtn            = document.getElementById("resume-btn");
  const resetBtn             = document.getElementById("reset-btn");
  const exitBtn              = document.getElementById("exit-btn");
  const levelCompleteOverlay = document.getElementById("level-complete-overlay");
  const levelCompleteTitle   = document.getElementById("level-complete-title");
  const levelCompleteBody    = document.getElementById("level-complete-body");
  const nextLevelBtn         = document.getElementById("next-level-btn");
  const closeLevelCompleteBtn= document.getElementById("close-level-complete-btn");

  // ---- Game state ----
  const levelCompleted = { 1: false, 2: false, 3: false };
  let currentLevel     = null;
  let currentConfig    = null;
  let currentYearIndex = 0;
  let gameTimer        = 0;
  let timerInterval    = null;
  let gamePaused       = false;

  // Unit counts stored in JS state (not in the DOM)
  // unitState[type] = number of additional units
  let unitState = {};

  // Chart instances
  let charts = { demand: null, fuel: null, gge: null };

  // ============================================================
  //  Utility helpers
  // ============================================================
  function num(val, fallback = 0) {
    const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  function getSource(type) {
    return ENERGY_SOURCES.find(s => s.type === type);
  }

  function currentYear() {
    return currentConfig.years[currentYearIndex];
  }

  function capacityTarget() {
    const cfg = currentConfig;
    return cfg.capacityTargetByYear
      ? cfg.capacityTargetByYear[currentYear()]
      : cfg.capacityTarget;
  }

  function ggeTarget() {
    const cfg = currentConfig;
    return cfg.ggeTargetByYear
      ? cfg.ggeTargetByYear[currentYear()]
      : cfg.ggeTarget;
  }

  // ============================================================
  //  Level loading
  // ============================================================
  function loadLevel(levelNum) {
    currentLevel     = levelNum;
    currentConfig    = LEVELS[levelNum];
    currentYearIndex = 0;
    unitState        = {};

    // Initialise units from startingMix
    ENERGY_SOURCES.forEach(s => {
      unitState[s.type] = currentConfig.startingMix[s.type] || 0;
    });

    // Header
    levelTitle.textContent = `Level ${levelNum}: ${currentConfig.name}`;
    headerBudgetSpent.textContent    = "0";
    headerBudgetRemaining.textContent = currentConfig.budgetM;

    // Year controls
    if (currentConfig.years.length > 1) {
      yearControls.style.display = "flex";
      currentYearLabel.textContent = currentYear();
      prevYearBtn.disabled = true;
      nextYearBtn.disabled = false;
      nextYearBtn.textContent = "Next Year \u25B6";
    } else {
      yearControls.style.display = "none";
    }

    // Render dynamic sections
    renderGoals();
    renderEnergyTable();
    renderInvestments();

    // Show level screen
    levelSelectContainer.style.display = "none";
    levelScreen.style.display          = "flex";

    startTimer();

    // Init charts after a short delay to ensure canvas is rendered
    setTimeout(() => {
      initCharts();
      recomputeAll();
    }, 120);
  }

  // ============================================================
  //  Render: Goals
  // ============================================================
  function renderGoals() {
    goalsTitle.textContent = `Level ${currentLevel} Goals`;
    goalsList.innerHTML = `
      <div class="goal" id="goal-capacity">
        <span>Match Projected Demand</span>
        <span class="goal-progress">
          <span id="goal-cap-current">0.00</span> /
          <span id="goal-cap-target">${capacityTarget()}</span> TWh
        </span>
        <span class="goal-status incomplete" id="goal-cap-status">&#10007;</span>
      </div>
      <div class="goal" id="goal-gge">
        <span>Reduce Greenhouse Gas Emissions</span>
        <span class="goal-progress">
          <span id="goal-gge-current">0.00</span> /
          <span id="goal-gge-target">${ggeTarget()}</span> MtCO&#8322;eq
        </span>
        <span class="goal-status incomplete" id="goal-gge-status">&#10007;</span>
      </div>
      <div class="goal" id="goal-budget">
        <span>Stay Within Budget</span>
        <span class="goal-progress">
          &euro;<span id="goal-budget-spent">0</span>M spent
          (&euro;<span id="goal-budget-remaining">${currentConfig.budgetM}</span>M left)
        </span>
        <span class="goal-status incomplete" id="goal-budget-status">&#10007;</span>
      </div>
    `;
  }

  // ============================================================
  //  Render: Energy Table rows
  // ============================================================
  function renderEnergyTable() {
    energyTableBody.innerHTML = ENERGY_SOURCES.map(s => `
      <tr class="energy-row" data-type="${s.type}">
        <th scope="row">${s.label}</th>
        <td>${s.construct}M</td>
        <td>${s.leadTime}</td>
        <td>${s.operating}</td>
        <td><span id="pct-${s.type}">0</span>%</td>
        <td><span id="gge-${s.type}">${s.baseGge.toFixed(2)}</span></td>
        <td><span id="cap-${s.type}">${s.baseCap.toFixed(2)}</span></td>
        <td><span id="units-${s.type}">${unitState[s.type]}</span></td>
        <td class="adjust">
          <button class="step up"   aria-label="Add ${s.label} unit">&#9650;</button>
          <button class="step down" aria-label="Remove ${s.label} unit">&#9660;</button>
        </td>
      </tr>
    `).join("");
  }

  // ============================================================
  //  Render: Investments
  // ============================================================
  function renderInvestments() {
    investmentList.innerHTML = currentConfig.investments.map(inv => `
      <div class="invest-item">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
          <input type="checkbox"
                 id="inv-${inv.id}"
                 data-cost="${inv.costM}"
                 data-gge-reduction="${inv.ggeReduction}">
          <span>${inv.label} (Cost &euro;${inv.costM}M)</span>
        </label>
      </div>
    `).join("");
  }

  // ============================================================
  //  Recompute: units → cap/gge per row
  // ============================================================
  function recomputeRows() {
    ENERGY_SOURCES.forEach(s => {
      const units = unitState[s.type] || 0;
      const cap   = s.baseCap + units * s.unitCap;
      const gge   = s.baseGge + units * s.unitGge;
      const capEl   = document.getElementById(`cap-${s.type}`);
      const ggeEl   = document.getElementById(`gge-${s.type}`);
      const unitsEl = document.getElementById(`units-${s.type}`);
      if (capEl)   capEl.textContent   = cap.toFixed(2);
      if (ggeEl)   ggeEl.textContent   = gge.toFixed(2);
      if (unitsEl) unitsEl.textContent = String(units);
    });
  }

  // ============================================================
  //  Recompute: totals, goals, budget
  // ============================================================
  function recomputeTotals() {
    let totalCap = 0;
    let totalGge = 0;

    ENERGY_SOURCES.forEach(s => {
      const units = unitState[s.type] || 0;
      totalCap += s.baseCap + units * s.unitCap;
      totalGge += s.baseGge + units * s.unitGge;
    });

    // Investment reductions
    const invCheckboxes = [...document.querySelectorAll("#investment-list input[type='checkbox']")];
    let invSpendM     = 0;
    let ggeReduction  = 0;
    invCheckboxes.forEach(cb => {
      if (!cb.checked) return;
      invSpendM    += num(cb.dataset.cost, 0);
      ggeReduction += num(cb.dataset.ggeReduction, 0);
    });

    const ggeNet = Math.max(0, totalGge - ggeReduction);

    // Unit spend
    const unitSpend = ENERGY_SOURCES.reduce((sum, s) => {
      const units = unitState[s.type] || 0;
      const costPerUnit = (s.construct + s.operating * 4) * 0.10;
      return sum + units * costPerUnit;
    }, 0);

    const totalSpent     = unitSpend + invSpendM;
    const totalRemaining = currentConfig.budgetM - totalSpent;

    // Update totals row
    capTotalEl.textContent = totalCap.toFixed(2);
    ggeTotalEl.textContent = totalGge.toFixed(2);

    // Update header budget
    headerBudgetSpent.textContent     = totalSpent.toFixed(0);
    headerBudgetRemaining.textContent = totalRemaining.toFixed(0);

    // Update goal displays
    setText("goal-cap-current",      totalCap.toFixed(2));
    setText("goal-gge-current",      ggeNet.toFixed(2));
    setText("goal-budget-spent",     totalSpent.toFixed(0));
    setText("goal-budget-remaining", totalRemaining.toFixed(0));

    // Percentage of grid per source
    ENERGY_SOURCES.forEach(s => {
      const cap = s.baseCap + (unitState[s.type] || 0) * s.unitCap;
      const pct = totalCap > 0 ? ((cap / totalCap) * 100).toFixed(1) : "0.0";
      const el = document.getElementById(`pct-${s.type}`);
      if (el) el.textContent = pct;
    });

    // Goal statuses
    const capMet    = totalCap  >= capacityTarget();
    const ggeMet    = ggeNet    <= ggeTarget();
    const budgetMet = totalSpent <= currentConfig.budgetM;

    updateGoalStatus("goal-cap-status",    capMet);
    updateGoalStatus("goal-gge-status",    ggeMet);
    updateGoalStatus("goal-budget-status", budgetMet);

    // Budget warning
    headerBudgetRemaining.parentElement.classList.toggle("over-budget", totalSpent > currentConfig.budgetM);

    // Check level completion
    checkLevelCompletion(capMet, ggeMet, budgetMet);

    return { totalCap, totalGge, ggeNet };
  }

  function updateGoalStatus(id, isMet) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = isMet ? "\u2713" : "\u2717";
    el.className   = isMet ? "goal-status complete" : "goal-status incomplete";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  // ============================================================
  //  Level completion
  // ============================================================
  function checkLevelCompletion(capMet, ggeMet, budgetMet) {
    if (!capMet || !ggeMet || !budgetMet) return;

    const isLastYear = currentYearIndex === currentConfig.years.length - 1;
    if (!isLastYear) return; // multi-year levels: must complete final year

    if (levelCompleted[currentLevel]) return;
    levelCompleted[currentLevel] = true;

    const nextLevel = currentLevel + 1;
    const hasNext   = nextLevel <= 3;

    levelCompleteTitle.textContent = `Level ${currentLevel} Complete!`;

    if (hasNext) {
      levelCompleteBody.innerHTML =
        `Great work! Level ${nextLevel} has been unlocked.<br>Head back to the menu to try it!`;
      nextLevelBtn.style.display = "inline-block";
      unlockLevel(nextLevel);
    } else {
      levelCompleteBody.textContent = "Amazing! You have completed all levels!";
      nextLevelBtn.style.display = "none";
    }

    levelCompleteOverlay.style.display = "flex";
    refreshLevelButtons();
  }

  function unlockLevel(levelNum) {
    const btn = document.querySelector(`.level-btn[data-level="${levelNum}"]`);
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove("locked");
  }

  function refreshLevelButtons() {
    levelButtons.forEach(btn => {
      const level = Number(btn.dataset.level);
      if (levelCompleted[level]) {
        btn.classList.add("completed");
        btn.disabled = true;
      }
    });
  }

  // ============================================================
  //  Year navigation (Levels 2 & 3)
  // ============================================================
  function advanceYear(direction) {
    const newIndex = currentYearIndex + direction;
    if (newIndex < 0 || newIndex >= currentConfig.years.length) return;

    currentYearIndex = newIndex;
    currentYearLabel.textContent = currentYear();

    prevYearBtn.disabled = currentYearIndex === 0;
    nextYearBtn.disabled = currentYearIndex === currentConfig.years.length - 1;

    // Update goal targets for new year
    setText("goal-cap-target", capacityTarget());
    setText("goal-gge-target",  ggeTarget());

    recomputeAll();
  }

  prevYearBtn.addEventListener("click", () => advanceYear(-1));
  nextYearBtn.addEventListener("click", () => advanceYear(1));

  // ============================================================
  //  Stepper buttons (event delegation)
  // ============================================================
  document.addEventListener("click", e => {
    const stepBtn = e.target.closest(".step");
    if (!stepBtn) return;
    const row = stepBtn.closest(".energy-row");
    if (!row) return;
    const type = row.dataset.type;
    if (stepBtn.classList.contains("up"))   unitState[type] = (unitState[type] || 0) + 1;
    if (stepBtn.classList.contains("down")) unitState[type] = Math.max(0, (unitState[type] || 0) - 1);
    recomputeAll();
  });

  // ============================================================
  //  Investment checkbox changes
  // ============================================================
  document.addEventListener("change", e => {
    if (e.target.type === "checkbox" && e.target.closest("#investment-list")) {
      recomputeAll();
    }
  });

  // ============================================================
  //  Recompute everything
  // ============================================================
  function recomputeAll() {
    recomputeRows();
    const totals = recomputeTotals();
    updateCharts(totals);
  }

  // ============================================================
  //  Charts
  // ============================================================
  const CHART_COLORS = {
    oil:      "#f4845f",
    gas:      "#f7c948",
    wind:     "#95d5b2",
    solar:    "#ffe066",
    offshore: "#52b788",
    nuclear:  "#a8dadc",
    hydro:    "#457b9d",
  };

  function initCharts() {
    // Destroy existing charts if re-entering a level
    Object.keys(charts).forEach(k => {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });

    const years      = currentConfig.years;
    const demandData = years.map(y => currentConfig.demandByYear[y]);
    const labels     = years.map(String);

    // --- Demand vs Supply ---
    const demandCtx = document.getElementById("demandChart").getContext("2d");
    charts.demand = new Chart(demandCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Demand (TWh)",
            data: demandData,
            borderColor: "#ff6b6b",
            backgroundColor: "rgba(255,107,107,0.15)",
            borderWidth: 2.5, tension: 0.4, fill: true,
          },
          {
            label: "Supply (TWh)",
            data: Array(years.length).fill(0),
            borderColor: "#52b788",
            backgroundColor: "rgba(82,183,136,0.15)",
            borderWidth: 2.5, tension: 0.4, fill: true,
          },
        ],
      },
      options: chartOptions("TWh"),
    });

    // --- Fuel Mix Doughnut ---
    const fuelCtx = document.getElementById("fuelChart").getContext("2d");
    charts.fuel = new Chart(fuelCtx, {
      type: "doughnut",
      data: {
        labels: ENERGY_SOURCES.map(s => s.label),
        datasets: [{
          data: ENERGY_SOURCES.map(s => s.baseCap),
          backgroundColor: ENERGY_SOURCES.map(s => CHART_COLORS[s.type]),
          borderColor: "rgba(0,0,0,0.2)",
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { color: "#fff", font: { size: 11 } } } },
      },
    });

    // --- GGE Line ---
    const ggeCtx = document.getElementById("ggeChart").getContext("2d");
    const ggeTargets = years.map(y =>
      currentConfig.ggeTargetByYear ? currentConfig.ggeTargetByYear[y] : currentConfig.ggeTarget
    );
    charts.gge = new Chart(ggeCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Your GGE (MtCO\u2082eq)",
            data: Array(years.length).fill(0),
            borderColor: "#f4845f",
            backgroundColor: "rgba(244,132,95,0.15)",
            borderWidth: 2.5, tension: 0.35, fill: true, pointRadius: 3,
          },
          {
            label: "Target",
            data: ggeTargets,
            borderColor: "#52b788",
            borderDash: [6, 4],
            backgroundColor: "transparent",
            borderWidth: 2, tension: 0.3, pointRadius: 2,
          },
        ],
      },
      options: chartOptions("MtCO\u2082eq"),
    });
  }

  function chartOptions(yLabel) {
    return {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: "#fff", font: { size: 12 } } } },
      scales: {
        y: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" },
             title: { display: true, text: yLabel, color: "#ccc" } },
        x: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } },
      },
    };
  }

  function updateCharts(totals) {
    if (!charts.demand || !charts.fuel || !charts.gge) return;

    const years = currentConfig.years;

    // Supply line: flat at current total capacity across all years
    charts.demand.data.datasets[1].data = Array(years.length).fill(
      parseFloat(totals.totalCap.toFixed(2))
    );
    charts.demand.update("none");

    // Fuel mix: actual capacities
    charts.fuel.data.datasets[0].data = ENERGY_SOURCES.map(s =>
      parseFloat((s.baseCap + (unitState[s.type] || 0) * s.unitCap).toFixed(2))
    );
    charts.fuel.update("none");

    // GGE: current value shown at current year index, projected linear decline to final year
    const ggeNow = parseFloat(totals.ggeNet.toFixed(2));
    const ggeData = years.map((_, i) => {
      if (i < currentYearIndex) return null;
      if (i === currentYearIndex) return ggeNow;
      // simple linear projection
      const stepsLeft = years.length - 1 - currentYearIndex;
      const finalTarget = currentConfig.ggeTargetByYear
        ? currentConfig.ggeTargetByYear[years[years.length - 1]]
        : currentConfig.ggeTarget;
      const step = stepsLeft > 0 ? (ggeNow - finalTarget) / stepsLeft : 0;
      return parseFloat((ggeNow - step * (i - currentYearIndex)).toFixed(2));
    });
    charts.gge.data.datasets[0].data = ggeData;
    charts.gge.update("none");
  }

  // ============================================================
  //  Timer
  // ============================================================
  function startTimer() {
    gameTimer = 0;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!gamePaused) { gameTimer++; updateTimerDisplay(); }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(gameTimer / 60).toString().padStart(2, "0");
    const s = (gameTimer % 60).toString().padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }

  // ============================================================
  //  Pause / Resume
  // ============================================================
  pauseBtn.addEventListener("click", () => {
    gamePaused = true;
    pauseOverlay.style.display = "flex";
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  });

  resumeBtn.addEventListener("click", () => {
    gamePaused = false;
    pauseOverlay.style.display = "none";
    startTimer();
  });

resetBtn.addEventListener("click", () => {
  pauseOverlay.style.display = "none";
  gamePaused = false;
  loadLevel(currentLevel);
});


  exitBtn.addEventListener("click", () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    pauseOverlay.style.display = "none";
    levelScreen.style.display  = "none";
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
  });

  // ============================================================
  //  Level complete overlay buttons
  // ============================================================
  closeLevelCompleteBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
    levelScreen.style.display  = "none";
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
  });

  nextLevelBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
    levelScreen.style.display = "none";
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
  });

  // ============================================================
  //  Name form → start game
  // ============================================================
  nameForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    startScreen.style.display   = "none";
    gameScreen.style.display    = "flex";
    welcomeFlash.style.display  = "flex";
    setTimeout(() => {
      welcomeFlash.style.display         = "none";
      levelSelectContainer.style.display = "flex";
    }, 2000);
  });

  // ============================================================
  //  Level select buttons
  // ============================================================
  levelButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.level);
      if (btn.disabled || levelCompleted[level]) return;
      loadLevel(level);
    });
  });

}); // end DOMContentLoaded
