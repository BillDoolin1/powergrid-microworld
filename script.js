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
    chartYears: ["","" , 2026,"" ,"" ],
    startingMix: {},
    demandByYear: { "":50,"":50,2026:50,"":50,"":50 }, // expand
    investments: [
      { id: "solar-grant",  label: "Home Solar Panel Grant",  costM:  75, ggeReduction: 2.0 },
      { id: "heat-pump",    label: "Heat Pump Grant",          costM: 100, ggeReduction: 3.5 },
      { id: "retrofitting", label: "Retrofitting Allowance",  costM: 200, ggeReduction: 5.0 },
    ],
  },
  2: {
    name: "Near-Term Planning",
    budgetM: 2000,
    years: [2027, 2028, 2029, 2030],
    startingMix: { },
    // targets tighten each year
    capacityTargetByYear: {  2027: 34, 2028: 37, 2029: 39, 2030: 41 },
    ggeTargetByYear:      {  2027: 25, 2028: 23.5, 2029: 22, 2030: 20 },
    demandByYear:         {  2027: 36, 2028: 38, 2029: 40, 2030: 42 },
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
    startingMix: { },
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
  const closeLevelCompleteBtn= document.getElementById("close-level-complete-btn");
  const redoBtn              = document.getElementById("redo-btn");
  const viewLevelBtn         = document.getElementById("view-level-btn");

  // ---- Best times (seconds) per level ----
  const bestTimes = { 1: null, 2: null, 3: null };


  // ---- Game state ----
  const levelCompleted = { 1: false, 2: false, 3: false };
  let startingGgeNet = null;
  let startingSupply = null;
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

  function computeTotalsOnly() {
    let totalGge = 0;

    ENERGY_SOURCES.forEach(s => {
      const units = unitState[s.type] || 0;
      totalGge += s.baseGge + units * s.unitGge;
    });

    // investment reductions
    const invCheckboxes = [...document.querySelectorAll("#investment-list input[type='checkbox']")];
    let ggeReduction = 0;
    invCheckboxes.forEach(cb => {
      if (!cb.checked) return;
      ggeReduction += num(cb.dataset.ggeReduction, 0);
    });

    const ggeNet = Math.max(0, totalGge - ggeReduction);
    return { ggeNet };
  } 


  // ============================================================
  //  Level loading
  // ============================================================
  function loadLevel(levelNum) {
    startingGgeNet = null;
    gamePaused = false
    startingSupply = null;
    currentLevel     = levelNum;
    currentConfig    = LEVELS[levelNum];
    currentYearIndex = 0;
    unitState        = {};

    // Initialise units from startingMix
    ENERGY_SOURCES.forEach(s => {
      unitState[s.type] = currentConfig.startingMix[s.type] || 0;
    });

    let initialGge = 0;
    let initialGgeReduction = 0; // investments are all unchecked at level start

    ENERGY_SOURCES.forEach(s => {
      const units = unitState[s.type] || 0;
      initialGge += s.baseGge + units * s.unitGge;
    });

    startingGgeNet = parseFloat(
      Math.max(0, initialGge - initialGgeReduction).toFixed(2)
    );

    let initialCap = 0;
    ENERGY_SOURCES.forEach(s => {
      const units = unitState[s.type] || 0;
      initialCap += s.baseCap + units * s.unitCap;
    });
    startingSupply = parseFloat(initialCap.toFixed(2));

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

    startFreshTimer();
    
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
      <tr class="energy-row" style="text-align:left;" data-type="${s.type}">
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
    if (!isLastYear) return;
    if (levelCompleted[currentLevel]) return;
    levelCompleted[currentLevel] = true;
    

    // Save best time
    const finishTime = gameTimer;
    if (bestTimes[currentLevel] === null || finishTime < bestTimes[currentLevel]) {
      bestTimes[currentLevel] = finishTime;
    }

    const nextLevel = currentLevel + 1;
    const hasNext   = nextLevel <= 3;

    levelCompleteTitle.textContent = `Level ${currentLevel} Complete!`;
    levelCompleteBody.innerHTML =
      `Your time: <strong>${formatTime(finishTime)}</strong><br>
      Best time: <strong>${formatTime(bestTimes[currentLevel])}</strong><br><br>
      ${hasNext
         ? `Level ${nextLevel} has been unlocked. Head back to the menu to try it!`
         : "Amazing! You have completed all levels!"}`;                                 // a bit compliocated for no reason 

    if (hasNext) unlockLevel(nextLevel);
    // Freeze timer on completion
    gamePaused = true;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
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
      }
      const timeEl = btn.querySelector(".btn-best-time");
      if (timeEl && bestTimes[level] !== null) {
        timeEl.textContent = `Best: ${formatTime(bestTimes[level])}`;
      }
    });

    // Show redo buttons for completed levels
    document.querySelectorAll(".redo-level-btn").forEach(btn => {
      const level = Number(btn.dataset.level);
      btn.style.display = levelCompleted[level] ? "inline-block" : "none";
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
    oil:      "#b7e4c7",
    gas:      "#95d5b2",
    wind:     "#52b788",
    solar:    "#40916c",
    offshore: "#2d6a4f",
    nuclear:  "#1b4332",
    hydro:    "#081c15"
  };

  function initCharts() {
    // Destroy existing charts if re-entering a level
    Object.keys(charts).forEach(k => {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });

    const yearsForCharts = currentConfig.chartYears || currentConfig.years;
    const demandData = yearsForCharts.map(y => currentConfig.demandByYear[y]);
    const labels     = yearsForCharts.map(String);

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
            borderColor: "#204a35",
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderWidth: 2.5, tension: 0.4, fill: true,
          },
          {
            label: "Supply (TWh)",
            data: Array(yearsForCharts.length).fill(startingSupply),
            borderColor: "#8acb84",
            backgroundColor: "rgba(78, 205, 196, 0.1)",
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
    const ggeTargets = yearsForCharts.map(y =>
      currentConfig.ggeTargetByYear ? currentConfig.ggeTargetByYear[y] : currentConfig.ggeTarget
    );
    charts.gge = new Chart(ggeCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Your GGE (MtCO\u2082eq)",
            data: Array(yearsForCharts.length).fill(startingGgeNet),
            borderColor: "#ff4000",
            backgroundColor: "rgba(0, 255, 17, 0)",
            borderWidth: 2.5, tension: 0.35, fill: true, pointRadius: 3,
          },
          {
            label: "Target",
            data: ggeTargets,
            borderColor: "#00ff2a",
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
        y: {
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" },
          title: { display: true, text: yLabel, color: "#ccc" },
          grace: "10%",      
        },
        x: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } },
      },
    };
  }


  function updateCharts(totals) {
    if (!charts.demand || !charts.fuel || !charts.gge) return;

    const years = currentConfig.chartYears || currentConfig.years;

    // Supply line: flat at current total capacity across all years
    const supplyNow = parseFloat(totals.totalCap.toFixed(2));
    const supplyStart = startingSupply ?? supplyNow;
    numLabels = (currentConfig.chartYears || currentConfig.years).length;

    charts.demand.data.datasets[1].data = Array.from({ length: numLabels }, (_, i) =>
      parseFloat((supplyStart + (supplyNow - supplyStart) * (i / (numLabels - 1))).toFixed(2))
    );
    charts.demand.update("none");

    // Fuel mix: actual capacities
    charts.fuel.data.datasets[0].data = ENERGY_SOURCES.map(s =>
      parseFloat((s.baseCap + (unitState[s.type] || 0) * s.unitCap).toFixed(2))
    );
    charts.fuel.update("none");

    // GGE chart: line from starting GGE to current GGE (no fake decline)
    const ggeNow   = parseFloat(totals.ggeNet.toFixed(2));
    const ggeStart = startingGgeNet ?? ggeNow;
      
    // Interpolate a straight line from start → current across all chart labels
    const ggeLineData = Array.from({ length: numLabels }, (_, i) => {
      return parseFloat(
        (ggeStart + (ggeNow - ggeStart) * (i / (numLabels - 1))).toFixed(2)
      );
    });
    
    charts.gge.data.datasets[0].data = ggeLineData;
    charts.gge.update("none");


  }

  // ============================================================
  //  Timer
  // ============================================================
  function startFreshTimer() {
    gameTimer = 0;
    updateTimerDisplay();
    startTimerInterval();
  }

  function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!gamePaused) {
        gameTimer++;
        updateTimerDisplay();
      }
    }, 1000);
  }


  function updateTimerDisplay() {
    const m = Math.floor(gameTimer / 60).toString().padStart(2, "0");
    const s = (gameTimer % 60).toString().padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }

  function formatTime(seconds) {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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
    startTimerInterval(); // resumes from current gameTimer
  });


  resetBtn.addEventListener("click", () => {
    pauseOverlay.style.display = "none";
    gamePaused = false;
    loadLevel(currentLevel);
  });

    redoBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
    levelCompleted[currentLevel] = false; // allow re-completion
    gamePaused = false;
    loadLevel(currentLevel);
  });

  viewLevelBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
  });

  exitBtn.addEventListener("click", () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    pauseOverlay.style.display = "none";
    levelScreen.style.display  = "none";
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
    refreshLevelButtons(); 
    gamePaused = false;
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
    refreshLevelButtons();
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
  document.querySelectorAll(".redo-level-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const level = Number(btn.dataset.level);
    levelCompleted[level] = false;
    gamePaused = false;
    loadLevel(level);
  });
});


}); // end DOMContentLoaded
