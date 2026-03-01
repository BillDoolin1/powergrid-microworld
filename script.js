// ============================================================
//  Power Grid Microworld — script.js
// ============================================================

const ENERGY_SOURCES = [
  { type: "oil",      label: "Oil",           baseCap: 5.75,  baseGge: 9.50,  unitCap: 0.35, unitGge: 0.10, construct: 1.0, operating: 110, leadTime: 3 },
  { type: "gas",      label: "Gas",           baseCap: 13.16, baseGge: 17.50, unitCap: 0.35, unitGge: 0.10, construct: 1.2, operating:  70, leadTime: 2 },
  { type: "wind",     label: "Wind",          baseCap: 10.46, baseGge:  0.20, unitCap: 0.25, unitGge: 0.00, construct: 1.4, operating: 100, leadTime: 4 },
  { type: "solar",    label: "Solar",         baseCap:  1.05, baseGge:  0.08, unitCap: 0.45, unitGge: 0.00, construct: 1.8, operating: 150, leadTime: 1 },
  { type: "offshore", label: "Offshore Wind", baseCap:  0.90, baseGge:  0.05, unitCap: 0.45, unitGge: 0.00, construct: 2.5, operating: 200, leadTime: 5 },
  { type: "nuclear",  label: "Nuclear",       baseCap:  0.0,  baseGge:  0.00, unitCap: 3.25, unitGge: 0.00, construct: 3.0, operating: 250, leadTime: 3 },
  { type: "hydro",    label: "Hydro",         baseCap:  0.36, baseGge:  0.02, unitCap: 0.25, unitGge: 0.00, construct: 2.2, operating: 180, leadTime: 2 },
];

const DIVESTMENT_REFUND_RATE = 0.25;

const LEVELS = {
  1: {
    name: "Tutorial",
    budgetM: 5000,
    capacityTarget: 50,
    ggeTarget: 24,
    years: [2026],
    chartYears: ["", "", 2026, "", ""],
    startingMix: {},
    demandByYear: {"":50, 2026: 50, "":50 },
    useTimeLag: false,
    investments: [
      { id: "solar-grant",  label: "Home Solar Panel Grant", costM:  75, ggeReduction: 2.0 },
      { id: "heat-pump",    label: "Heat Pump Grant",         costM: 100, ggeReduction: 3.5 },
      { id: "retrofitting", label: "Retrofitting Allowance", costM: 200, ggeReduction: 5.0 },
    ],
  },
  2: {
    name: "Short-Term Planning",
    budgetByYear: { 2027: 700, 2028: 650, 2029: 400, 2030: 900 },
    years: [2027, 2028, 2029, 2030],
    startingMix: {},
    ggeTargetByYear: { 2027: 25, 2028: 23, 2029: 22, 2030: 20 },
    demandByYear:    { 2027: 34, 2028: 37, 2029: 39, 2030: 41 },
    useTimeLag: true,
    lockForward: false,
    investments: [
      { id: "heat-pump",    label: "Heat Pump Grant",         costM: 100, ggeReduction: 3.5 },
      { id: "retrofitting", label: "Retrofitting Allowance", costM: 200, ggeReduction: 5.0 },
      { id: "ev-subsidy",   label: "EV Subsidy Scheme",       costM: 150, ggeReduction: 4.0 },
    ],
  },
  3: {
    name: "2045 Long-Term Challenge",
    budgetByYear: { 2030: 800, 2035: 900, 2040: 1000, 2045: 1200 },
    years: [2030, 2035, 2040, 2045],
    startingMix: {},
    goalYears: [2035, 2040, 2045],
    // Which planning years count toward each goal year's budget check
    goalBudgetYears: {
      2035: [2030, 2035],
      2040: [2040],
      2045: [2045],
    },
    ggeTargetByYear: { 2030: 27, 2035: 18, 2040: 14, 2045: 9 },
    demandByYear:    { 2030: 41, 2035: 44, 2040: 47, 2045: 51 },
    useTimeLag: true,
    lockForward: true,
    investments: [
      { id: "retrofitting", label: "Retrofitting Allowance", costM: 200, ggeReduction: 5.0 },
      { id: "carbon-tax",   label: "Carbon Tax",              costM:  50, ggeReduction: 6.0 },
      { id: "ev-subsidy",   label: "EV Subsidy Scheme",       costM: 150, ggeReduction: 4.0 },
      { id: "smart-grid",   label: "Smart Grid Investment",   costM: 300, ggeReduction: 2.0 },
    ],
  },
};

const levelEverCompleted = { 1: false, 2: false, 3: false };

document.addEventListener("DOMContentLoaded", () => {

  const startScreen          = document.getElementById("start-screen");
  const gameScreen           = document.getElementById("game-screen");
  const welcomeFlash         = document.getElementById("welcome-flash");
  const levelSelectContainer = document.getElementById("level-select-container");
  const levelScreen          = document.getElementById("level-screen");
  const levelButtons         = document.querySelectorAll(".level-btn");
  const nameForm             = document.getElementById("name-form");
  const nameInput            = document.getElementById("player-name");

  const headerBudgetSpent     = document.getElementById("header-budget-spent");
  const headerBudgetRemaining = document.getElementById("header-budget-remaining");
  const yearControls          = document.getElementById("year-controls");
  const currentYearLabel      = document.getElementById("current-year-label");
  const prevYearBtn           = document.getElementById("prev-year-btn");
  const nextYearBtn           = document.getElementById("next-year-btn");
  const timerEl               = document.getElementById("timer");
  const pauseBtn              = document.getElementById("pause-btn");

  const goalsTitle       = document.getElementById("goals-title");
  const goalsList        = document.getElementById("goals-list");
  const energyTableBody  = document.getElementById("energy-table-body");
  const investmentList   = document.getElementById("investment-list");
  const capTotalEl       = document.getElementById("cap-total");
  const ggeTotalEl       = document.getElementById("gge-total");

  const pauseOverlay          = document.getElementById("pause-overlay");
  const resumeBtn             = document.getElementById("resume-btn");
  const resetBtn              = document.getElementById("reset-btn");
  const exitBtn               = document.getElementById("exit-btn");
  const levelCompleteOverlay  = document.getElementById("level-complete-overlay");
  const levelCompleteTitle    = document.getElementById("level-complete-title");
  const levelCompleteBody     = document.getElementById("level-complete-body");
  const closeLevelCompleteBtn = document.getElementById("close-level-complete-btn");
  const redoBtn               = document.getElementById("redo-btn");
  const viewLevelBtn          = document.getElementById("view-level-btn");

  const bestTimes = { 1: null, 2: null, 3: null };

  const levelCompleted = { 1: false, 2: false, 3: false };
  let startingGgeNet   = null;
  let startingSupply   = null;
  let currentLevel     = null;
  let currentConfig    = null;
  let currentYearIndex = 0;
  let gameTimer        = 0;
  let timerInterval    = null;
  let gamePaused       = false;
  let yearSpend        = {};
  let lockedUpToIndex  = -1;
  let activeGoalTab    = 0;

  // Live baseCap/baseGge per source — updated on each commit merge
  // Keyed by source type: { oil: { baseCap: X, baseGge: Y }, ... }
  let mergedBase = {};

  let unitState      = {};
  let investmentYear = {};

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

  // Live base values — use mergedBase if present, else ENERGY_SOURCES defaults
  function getBaseCap(type) {
    return mergedBase[type] ? mergedBase[type].baseCap : getSource(type).baseCap;
  }

  function getBaseGge(type) {
    return mergedBase[type] ? mergedBase[type].baseGge : getSource(type).baseGge;
  }

  function currentYear() {
    return currentConfig.years[currentYearIndex];
  }

  function finalYear() {
    return currentConfig.years[currentConfig.years.length - 1];
  }

  function capacityTarget() {
    return currentConfig.demandByYear
      ? currentConfig.demandByYear[finalYear()]
      : currentConfig.capacityTarget;
  }

  function ggeTarget() {
    return currentConfig.ggeTargetByYear
      ? currentConfig.ggeTargetByYear[finalYear()]
      : currentConfig.ggeTarget;
  }

  function getYearSpend(yr) {
    if (!yearSpend[yr]) return 0;
    return (yearSpend[yr].units || 0) + (yearSpend[yr].investments || 0);
  }

  function isYearLocked(yearIndex) {
    return currentConfig.lockForward && yearIndex <= lockedUpToIndex;
  }

  function getTotalGgeReduction() {
    return [...document.querySelectorAll("#investment-list input[type='checkbox']")]
      .filter(cb => cb.checked)
      .reduce((sum, cb) => sum + num(cb.dataset.ggeReduction, 0), 0);
  }

  function getGoalYearStatus(gy) {
    const ggeReduction = getTotalGgeReduction();
    let cap = 0, gge = 0;
    ENERGY_SOURCES.forEach(s => {
      const online = getOnlineUnits(s.type, gy);
      cap += getBaseCap(s.type) + online * s.unitCap;
      gge += getBaseGge(s.type) + online * s.unitGge;
    });
    const ggeNet    = Math.max(0, gge - ggeReduction);
    const capTarget = currentConfig.demandByYear[gy];
    const ggeT      = currentConfig.ggeTargetByYear[gy];
    const budgetYrs = currentConfig.goalBudgetYears
      ? currentConfig.goalBudgetYears[gy]
      : currentConfig.years.filter(y => y <= gy);
    const budgetOk  = budgetYrs.every(y => getYearSpend(y) <= currentConfig.budgetByYear[y]);
    const capOk     = cap >= capTarget;
    const ggeOk     = ggeNet <= ggeT;
    return { cap, ggeNet, capTarget, ggeT, capOk, ggeOk, budgetOk, budgetYrs, allOk: capOk && ggeOk && budgetOk };
  }

  // ---- Time lag helpers ----
  function getTotalUnits(type) {
    if (!currentConfig.useTimeLag) return unitState[type] || 0;
    const byYear = unitState[type];
    if (!byYear || typeof byYear !== "object") return 0;
    return Object.values(byYear).reduce((s, v) => s + v, 0);
  }

  function getOnlineUnits(type, asOfYear) {
    if (!currentConfig.useTimeLag) return unitState[type] || 0;
    const source = getSource(type);
    const byYear = unitState[type];
    if (!byYear || typeof byYear !== "object") return 0;
    let online = 0;
    for (const [yr, count] of Object.entries(byYear)) {
      if (count > 0) {
        if (Number(yr) + source.leadTime <= asOfYear) online += count;
      } else {
        online += count;
      }
    }
    return online;
  }

  function getPendingUnits(type) {
    if (!currentConfig.useTimeLag) return 0;
    const source = getSource(type);
    const byYear = unitState[type];
    if (!byYear || typeof byYear !== "object") return 0;
    const yr = currentYear();
    let pending = 0;
    for (const [commitYr, count] of Object.entries(byYear)) {
      if (count > 0 && Number(commitYr) + source.leadTime > yr) pending += count;
    }
    return pending;
  }

  function getMostRecentInvestedYear(type) {
    const byYear = unitState[type];
    if (!byYear || typeof byYear !== "object") return null;
    let latestYr = null;
    for (const [yr, count] of Object.entries(byYear)) {
      if (count > 0 && (latestYr === null || Number(yr) > latestYr)) latestYr = Number(yr);
    }
    return latestYr;
  }

  // ============================================================
  //  Data merge on commit
  //  Called when advancing from yearIndex → yearIndex+1 (Level 3)
  //  Folds all units that are online by the NEXT year into baseCap/baseGge
  // ============================================================
  function mergeOnlineUnitsIntoBase(nextYear) {
    ENERGY_SOURCES.forEach(s => {
      const source = getSource(s.type);
      const byYear = unitState[s.type];
      if (!byYear || typeof byYear !== "object") return;

      let mergedCount = 0;
      const toDelete  = [];

      for (const [yr, count] of Object.entries(byYear)) {
        // Only merge positive (invested) units that are fully online by nextYear
        if (count > 0 && Number(yr) + source.leadTime <= nextYear) {
          mergedCount += count;
          toDelete.push(yr);
        }
      }

      if (mergedCount === 0) return;

      // Fold into live base values
      mergedBase[s.type].baseCap = parseFloat(
        (mergedBase[s.type].baseCap + mergedCount * source.unitCap).toFixed(4)
      );
      mergedBase[s.type].baseGge = parseFloat(
        (mergedBase[s.type].baseGge + mergedCount * source.unitGge).toFixed(4)
      );

      // Remove merged entries from byYear
      toDelete.forEach(yr => delete byYear[yr]);
    });
  }

  // ============================================================
  //  Summary overlay
  // ============================================================
  function buildSummaryOverlay() {
    if (document.getElementById("summary-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "summary-overlay";
    overlay.style.cssText = `
      display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
      z-index:200; align-items:center; justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:#1b4332; border-radius:12px; padding:32px;
                  min-width:340px; max-width:580px; width:90%; color:#fff;">
        <h2 id="summary-title" style="margin:0 0 6px; font-size:1.3rem; text-align:center;"></h2>
        <p  id="summary-subtitle" style="margin:0 0 20px; text-align:center; font-size:0.9rem; opacity:0.8;"></p>
        <div id="summary-body"></div>
        <div id="summary-actions" style="margin-top:20px; display:none; gap:10px;">
          <button id="summary-reset-btn"
            style="flex:1; padding:10px; background:#e63946; border:none; border-radius:8px;
                   color:#fff; font-size:1rem; cursor:pointer;">&#8635; Reset Level</button>
          <button id="summary-exit-btn"
            style="flex:1; padding:10px; background:#2d6a4f; border:none; border-radius:8px;
                   color:#fff; font-size:1rem; cursor:pointer;">&#8592; Exit Menu</button>
        </div>
        <button id="summary-close-btn"
          style="margin-top:12px; width:100%; padding:10px; background:#52b788; border:none;
                 border-radius:8px; color:#fff; font-size:1rem; cursor:pointer;">Close</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById("summary-close-btn").addEventListener("click", () => {
      overlay.style.display = "none";
    });
    document.getElementById("summary-reset-btn").addEventListener("click", () => {
      overlay.style.display        = "none";
      levelCompleted[currentLevel] = false;
      gamePaused                   = false;
      loadLevel(currentLevel);
    });
    document.getElementById("summary-exit-btn").addEventListener("click", () => {
      overlay.style.display = "none";
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      levelScreen.style.display          = "none";
      levelSelectContainer.style.display = "flex";
      currentLevel = null;
      refreshLevelButtons();
      gamePaused = false;
    });
  }

  function openSummary(isFinalCommit = false) {
    const overlay = document.getElementById("summary-overlay");
    if (!overlay) return;

    const goalYears   = currentConfig.goalYears || [finalYear()];
    const allGoalsMet = goalYears.every(gy => getGoalYearStatus(gy).allOk);

    const titleEl    = document.getElementById("summary-title");
    const subtitleEl = document.getElementById("summary-subtitle");
    const actionsEl  = document.getElementById("summary-actions");

    if (isFinalCommit) {
      if (allGoalsMet) {
        titleEl.textContent    = "🎉 Congratulations!";
        subtitleEl.textContent = "You have successfully completed Level 3!";
      } else {
        titleEl.textContent    = "Hard Luck — Not Quite There";
        subtitleEl.textContent = "Some goals were not met. Review below and try again.";
      }
      actionsEl.style.display = "flex";
    } else {
      titleEl.textContent     = "📊 Progress Summary";
      subtitleEl.textContent  = "";
      actionsEl.style.display = "none";
    }

    const rows = goalYears.map(gy => {
      const { cap, ggeNet, capTarget, ggeT, capOk, ggeOk, budgetOk, budgetYrs } = getGoalYearStatus(gy);
      const tick = v => v
        ? `<span style="color:#52b788; font-weight:bold;">✓</span>`
        : `<span style="color:#e63946; font-weight:bold;">✗</span>`;

      const budgetSubRows = budgetYrs.map(y => {
        const bCap  = currentConfig.budgetByYear[y];
        const spent = getYearSpend(y);
        const ok    = spent <= bCap;
        return `
          <div style="display:flex; justify-content:space-between; padding-left:14px;
                      font-size:0.8rem; opacity:0.85; margin-bottom:3px;">
            <span>${y} — &euro;${spent.toFixed(0)}M / &euro;${bCap}M</span>${tick(ok)}
          </div>`;
      }).join("");

      return `
        <div style="margin-bottom:14px; padding:12px; background:rgba(255,255,255,0.07); border-radius:8px;">
          <div style="font-weight:bold; margin-bottom:8px; font-size:1rem;">${gy} Goals</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Capacity (${cap.toFixed(1)} / ${capTarget} TWh)</span>${tick(capOk)}
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>GGE (${ggeNet.toFixed(1)} / ${ggeT} MtCO₂eq)</span>${tick(ggeOk)}
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="font-weight:600;">Under Budget</span>${tick(budgetOk)}
          </div>
          ${budgetSubRows}
        </div>`;
    }).join("");

    document.getElementById("summary-body").innerHTML = rows;
    overlay.style.display = "flex";
  }

  // ============================================================
  //  Level loading
  // ============================================================
  function loadLevel(levelNum) {
    startingGgeNet   = null;
    gamePaused       = false;
    startingSupply   = null;
    currentLevel     = levelNum;
    currentConfig    = LEVELS[levelNum];
    currentYearIndex = 0;
    unitState        = {};
    investmentYear   = {};
    lockedUpToIndex  = -1;
    activeGoalTab    = 0;

    // Initialise mergedBase from ENERGY_SOURCES defaults
    mergedBase = {};
    ENERGY_SOURCES.forEach(s => {
      mergedBase[s.type] = { baseCap: s.baseCap, baseGge: s.baseGge };
    });

    if (currentConfig.useTimeLag) {
      ENERGY_SOURCES.forEach(s => { unitState[s.type] = {}; });
    } else {
      ENERGY_SOURCES.forEach(s => {
        unitState[s.type] = currentConfig.startingMix[s.type] || 0;
      });
    }

    let initialGge = 0, initialCap = 0;
    ENERGY_SOURCES.forEach(s => { initialGge += s.baseGge; initialCap += s.baseCap; });
    startingGgeNet = parseFloat(Math.max(0, initialGge).toFixed(2));
    startingSupply = parseFloat(initialCap.toFixed(2));

    yearSpend = {};
    if (currentConfig.budgetByYear) {
      Object.keys(currentConfig.budgetByYear).forEach(yr => {
        yearSpend[Number(yr)] = { units: 0, investments: 0 };
      });
    }

    if (currentConfig.budgetByYear) {
      headerBudgetSpent.textContent     = "0";
      headerBudgetRemaining.textContent = currentConfig.budgetByYear[currentConfig.years[0]];
    } else {
      headerBudgetSpent.textContent     = "0";
      headerBudgetRemaining.textContent = currentConfig.budgetM;
    }

    if (currentConfig.years.length > 1) {
      yearControls.style.display   = "flex";
      currentYearLabel.textContent = currentYear();
      prevYearBtn.disabled         = true;
      nextYearBtn.textContent      = currentConfig.lockForward
        ? "Commit & Advance \u25B6"
        : "Next Year \u25B6";
      nextYearBtn.disabled = false;
    } else {
      yearControls.style.display = "none";
    }

    if (currentConfig.goalYears) {
      buildSummaryOverlay();
      let sumBtn = document.getElementById("summary-btn");
      if (!sumBtn) {
        sumBtn             = document.createElement("button");
        sumBtn.id          = "summary-btn";
        sumBtn.textContent = "📊 Summary";
        sumBtn.style.cssText = "margin-left:12px; padding:6px 14px; background:#2d6a4f; border:none; border-radius:6px; color:#fff; cursor:pointer; font-size:0.9rem;";
        sumBtn.addEventListener("click", () => openSummary(false));
        timerEl.parentElement.appendChild(sumBtn);
      }
      sumBtn.style.display = "inline-block";
    } else {
      const sumBtn = document.getElementById("summary-btn");
      if (sumBtn) sumBtn.style.display = "none";
    }

    renderGoals();
    renderEnergyTable();
    renderInvestments();

    levelSelectContainer.style.display = "none";
    levelScreen.style.display          = "flex";

    startFreshTimer();
    setTimeout(() => { initCharts(); recomputeAll(); }, 120);
  }

  // ============================================================
  //  Render: Goals
  // ============================================================
  function renderGoals(capMet = false, ggeMet = false, budgetMet = false) {
    if (currentConfig.goalYears) { renderGoalsTabs(); return; }

    goalsTitle.textContent = `Level ${currentLevel} Goals (by ${finalYear()})`;

    let budgetGoalHtml;
    if (currentConfig.budgetByYear) {
      const years    = currentConfig.years;
      const allUnder = years.every(yr => getYearSpend(yr) <= currentConfig.budgetByYear[yr]);
      const subRows  = years.map(yr => {
        const cap   = currentConfig.budgetByYear[yr];
        const spent = getYearSpend(yr);
        const ok    = spent <= cap;
        return `
          <div class="goal" style="padding-left:16px; font-size:0.82rem; opacity:0.9;">
            <span>${yr}</span>
            <span class="goal-progress">&euro;${spent.toFixed(0)}M / &euro;${cap}M</span>
            <span class="goal-status ${ok ? 'complete' : 'incomplete'}">${ok ? '&#10003;' : '&#10007;'}</span>
          </div>`;
      }).join("");
      budgetGoalHtml = `
        <div class="goal" id="goal-budget">
          <span>Under Budget Every Year</span>
          <span class="goal-progress"></span>
          <span class="goal-status ${allUnder ? 'complete' : 'incomplete'}" id="goal-budget-status">${allUnder ? '&#10003;' : '&#10007;'}</span>
        </div>${subRows}`;
    } else {
      budgetGoalHtml = `
        <div class="goal" id="goal-budget">
          <span>Stay Within Budget</span>
          <span class="goal-progress">
            &euro;<span id="goal-budget-spent">0</span>M spent
            (&euro;<span id="goal-budget-remaining">${currentConfig.budgetM}</span>M left)
          </span>
          <span class="goal-status ${budgetMet ? 'complete' : 'incomplete'}" id="goal-budget-status">${budgetMet ? '&#10003;' : '&#10007;'}</span>
        </div>`;
    }

    goalsList.innerHTML = `
      <div class="goal" id="goal-capacity">
        <span>Match Projected Demand</span>
        <span class="goal-progress">
          <span id="goal-cap-current">0.00</span> /
          <span id="goal-cap-target">${capacityTarget()}</span> TWh
        </span>
        <span class="goal-status ${capMet ? 'complete' : 'incomplete'}" id="goal-cap-status">${capMet ? '&#10003;' : '&#10007;'}</span>
      </div>
      <div class="goal" id="goal-gge">
        <span>Reduce Greenhouse Gas Emissions</span>
        <span class="goal-progress">
          <span id="goal-gge-current">0.00</span> /
          <span id="goal-gge-target">${ggeTarget()}</span> MtCO&#8322;eq
        </span>
        <span class="goal-status ${ggeMet ? 'complete' : 'incomplete'}" id="goal-gge-status">${ggeMet ? '&#10003;' : '&#10007;'}</span>
      </div>
      ${budgetGoalHtml}`;
  }

  function renderGoalsTabs() {
    const goalYears = currentConfig.goalYears;
    goalsTitle.textContent = `Level ${currentLevel} Goals`;

    const tabButtons = goalYears.map((gy, i) => {
      const { allOk } = getGoalYearStatus(gy);
      const isActive  = i === activeGoalTab;
      return `
        <button class="goal-tab-btn" data-tab="${i}"
          style="flex:1; padding:6px 4px; border:none; border-radius:6px 6px 0 0; cursor:pointer;
                 background:${isActive ? '#2d6a4f' : '#1b4332'}; color:#fff; font-size:0.85rem;
                 border-bottom:${isActive ? '2px solid #52b788' : '2px solid transparent'};">
          ${gy} ${allOk ? '✓' : ''}
        </button>`;
    }).join("");

    const gy = goalYears[activeGoalTab];
    const { cap, ggeNet, capTarget, ggeT, capOk, ggeOk, budgetOk, budgetYrs } = getGoalYearStatus(gy);

    const budgetSubRows = budgetYrs.map(yr => {
      const bCap  = currentConfig.budgetByYear[yr];
      const spent = getYearSpend(yr);
      const ok    = spent <= bCap;
      return `
        <div class="goal" style="padding-left:16px; font-size:0.82rem; opacity:0.9;">
          <span>${yr}</span>
          <span class="goal-progress">&euro;${spent.toFixed(0)}M / &euro;${bCap}M</span>
          <span class="goal-status ${ok ? 'complete' : 'incomplete'}">${ok ? '&#10003;' : '&#10007;'}</span>
        </div>`;
    }).join("");

    goalsList.innerHTML = `
      <div style="display:flex; gap:4px; margin-bottom:8px;">${tabButtons}</div>
      <div class="goal" id="goal-capacity">
        <span>Match Demand by ${gy}</span>
        <span class="goal-progress">
          <span id="goal-cap-current">${cap.toFixed(2)}</span> /
          <span id="goal-cap-target">${capTarget}</span> TWh
        </span>
        <span class="goal-status ${capOk ? 'complete' : 'incomplete'}" id="goal-cap-status">${capOk ? '&#10003;' : '&#10007;'}</span>
      </div>
      <div class="goal" id="goal-gge">
        <span>Reduce GGE by ${gy}</span>
        <span class="goal-progress">
          <span id="goal-gge-current">${ggeNet.toFixed(2)}</span> /
          <span id="goal-gge-target">${ggeT}</span> MtCO&#8322;eq
        </span>
        <span class="goal-status ${ggeOk ? 'complete' : 'incomplete'}" id="goal-gge-status">${ggeOk ? '&#10003;' : '&#10007;'}</span>
      </div>
      <div class="goal" id="goal-budget">
        <span>Under Budget</span>
        <span class="goal-progress"></span>
        <span class="goal-status ${budgetOk ? 'complete' : 'incomplete'}" id="goal-budget-status">${budgetOk ? '&#10003;' : '&#10007;'}</span>
      </div>
      ${budgetSubRows}`;

    goalsList.querySelectorAll(".goal-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeGoalTab = Number(btn.dataset.tab);
        renderGoalsTabs();
      });
    });
  }

  // ============================================================
  //  Render: Energy Table
  // ============================================================
  function renderEnergyTable() {
    energyTableBody.innerHTML = ENERGY_SOURCES.map(s => {
      const pendingUnits = getPendingUnits(s.type);
      const pendingHtml  = pendingUnits > 0
        ? ` <span class="pending-label" style="color:#ffd166; font-size:0.8rem;" title="Units under construction">(${pendingUnits} being built)</span>`
        : "";
      // Display merged base values
      const dispCap = getBaseCap(s.type);
      const dispGge = getBaseGge(s.type);
      return `
        <tr class="energy-row" style="text-align:left;" data-type="${s.type}">
          <th scope="row">${s.label}</th>
          <td>${s.construct}M</td>
          <td>${s.leadTime}</td>
          <td>${s.operating}</td>
          <td><span id="pct-${s.type}">0</span>%</td>
          <td><span id="gge-${s.type}">${dispGge.toFixed(2)}</span></td>
          <td><span id="cap-${s.type}">${dispCap.toFixed(2)}</span></td>
          <td><span id="units-${s.type}">0</span>${pendingHtml}</td>
          <td class="adjust">
            <button class="step up"   aria-label="Add ${s.label} unit">&#9650;</button>
            <button class="step down" aria-label="Remove ${s.label} unit">&#9660;</button>
          </td>
        </tr>`;
    }).join("");
    recomputeRows();
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
                 data-gge-reduction="${inv.ggeReduction}"
                 data-inv-id="${inv.id}">
          <span>${inv.label} (Cost &euro;${inv.costM}M)</span>
        </label>
      </div>`).join("");
  }

  // ============================================================
  //  Recompute: rows
  // ============================================================
  function recomputeRows() {
    const yr     = currentYear();
    const locked = isYearLocked(currentYearIndex);

    ENERGY_SOURCES.forEach(s => {
      const onlineUnits  = getOnlineUnits(s.type, yr);
      const totalUnits   = getTotalUnits(s.type);
      const pendingUnits = getPendingUnits(s.type);

      // Display: mergedBase + online future units
      const cap = getBaseCap(s.type) + onlineUnits * s.unitCap;
      const gge = getBaseGge(s.type) + onlineUnits * s.unitGge;

      const capEl   = document.getElementById(`cap-${s.type}`);
      const ggeEl   = document.getElementById(`gge-${s.type}`);
      const unitsEl = document.getElementById(`units-${s.type}`);

      if (capEl) capEl.textContent = cap.toFixed(2);
      if (ggeEl) ggeEl.textContent = gge.toFixed(2);

      if (unitsEl) {
        // Show only pending (not yet merged) units in the units column
        unitsEl.textContent = String(totalUnits);
        unitsEl.classList.toggle("units-divested", totalUnits < 0);

        const existingLabel = unitsEl.parentElement.querySelector(".pending-label");
        if (existingLabel) existingLabel.remove();
        if (pendingUnits > 0) {
          const span         = document.createElement("span");
          span.className     = "pending-label";
          span.style.cssText = "color:#ffd166; font-size:0.8rem; margin-left:4px;";
          span.title         = "Units under construction";
          span.textContent   = `(${pendingUnits} being built)`;
          unitsEl.insertAdjacentElement("afterend", span);
        }
      }

      const upBtn   = document.querySelector(`.energy-row[data-type="${s.type}"] .step.up`);
      const downBtn = document.querySelector(`.energy-row[data-type="${s.type}"] .step.down`);

      if (upBtn) {
        upBtn.disabled      = locked;
        upBtn.style.opacity = locked ? "0.35" : "";
        upBtn.style.cursor  = locked ? "not-allowed" : "";
      }

      if (downBtn) {
        // Floor uses mergedBase cap
        const capAtNext = getBaseCap(s.type) + (totalUnits - 1) * s.unitCap;
        const atFloor   = capAtNext < 0;
        downBtn.disabled      = atFloor;
        downBtn.title         = atFloor ? "Cannot divest further – capacity at zero" : "";
        downBtn.style.opacity = atFloor ? "0.35" : "";
        downBtn.style.cursor  = atFloor ? "not-allowed" : "";
      }
    });

    document.querySelectorAll("#investment-list input[type='checkbox']").forEach(cb => {
      const invId        = cb.dataset.invId;
      const committedYr  = investmentYear[invId];
      const committedIdx = committedYr ? currentConfig.years.indexOf(Number(committedYr)) : -1;
      if (locked && !cb.checked) cb.disabled = true;
      else if (committedIdx >= 0 && isYearLocked(committedIdx)) cb.disabled = true;
      else cb.disabled = false;
    });
  }

  // ============================================================
  //  Recompute: totals
  // ============================================================
  function recomputeTotals() {
    const yr = currentYear();

    let totalCap = 0, totalGge = 0;
    ENERGY_SOURCES.forEach(s => {
      const online = getOnlineUnits(s.type, yr);
      totalCap += getBaseCap(s.type) + online * s.unitCap;
      totalGge += getBaseGge(s.type) + online * s.unitGge;
    });

    const finalYr = finalYear();
    let finalCap = 0, finalGge = 0;
    ENERGY_SOURCES.forEach(s => {
      const online = getOnlineUnits(s.type, finalYr);
      finalCap += getBaseCap(s.type) + online * s.unitCap;
      finalGge += getBaseGge(s.type) + online * s.unitGge;
    });

    const ggeReduction = getTotalGgeReduction();
    const invSpendM    = [...document.querySelectorAll("#investment-list input[type='checkbox']")]
      .filter(cb => cb.checked)
      .reduce((sum, cb) => sum + num(cb.dataset.cost, 0), 0);

    const ggeNet      = Math.max(0, totalGge - ggeReduction);
    const finalGgeNet = Math.max(0, finalGge - ggeReduction);

    const unitSpend = !currentConfig.useTimeLag ? ENERGY_SOURCES.reduce((sum, s) => {
      const units       = unitState[s.type] || 0;
      const costPerUnit = s.construct + s.operating * 4 * 0.10;
      return units >= 0
        ? sum + units * costPerUnit
        : sum + units * costPerUnit * DIVESTMENT_REFUND_RATE;
    }, 0) : 0;

    const totalSpent     = unitSpend + invSpendM;
    const totalRemaining = (currentConfig.budgetM || 0) - totalSpent;

    capTotalEl.textContent = totalCap.toFixed(2);
    ggeTotalEl.textContent = totalGge.toFixed(2);

    if (currentConfig.budgetByYear) {
      const cap       = currentConfig.budgetByYear[yr];
      const spent     = getYearSpend(yr);
      const remaining = cap - spent;
      headerBudgetSpent.textContent     = spent.toFixed(2);
      headerBudgetRemaining.textContent = remaining.toFixed(2);
      const budgetEl = document.querySelector(".level-header-budget");
      if (budgetEl) budgetEl.classList.toggle("over-budget", remaining < 0);
    } else {
      headerBudgetSpent.textContent     = totalSpent.toFixed(0);
      headerBudgetRemaining.textContent = totalRemaining.toFixed(0);
    }

    ENERGY_SOURCES.forEach(s => {
      const online = getOnlineUnits(s.type, yr);
      const cap    = getBaseCap(s.type) + online * s.unitCap;
      const pct    = totalCap > 0 ? ((cap / totalCap) * 100).toFixed(1) : "0.0";
      const el     = document.getElementById(`pct-${s.type}`);
      if (el) el.textContent = pct;
    });

    let capMet, ggeMet, budgetMet;
    if (currentConfig.goalYears) {
      capMet    = currentConfig.goalYears.every(gy => getGoalYearStatus(gy).capOk);
      ggeMet    = currentConfig.goalYears.every(gy => getGoalYearStatus(gy).ggeOk);
      budgetMet = currentConfig.goalYears.every(gy => getGoalYearStatus(gy).budgetOk);
    } else if (currentConfig.budgetByYear) {
      capMet    = finalCap >= capacityTarget();
      ggeMet    = finalGgeNet <= ggeTarget();
      budgetMet = currentConfig.years.every(y => getYearSpend(y) <= currentConfig.budgetByYear[y]);
    } else {
      capMet    = finalCap >= capacityTarget();
      ggeMet    = finalGgeNet <= ggeTarget();
      budgetMet = totalSpent <= currentConfig.budgetM;
    }

    if (!currentConfig.budgetByYear) {
      headerBudgetRemaining.parentElement.classList.toggle("over-budget", !budgetMet);
    }

    if (!currentConfig.goalYears) {
      checkLevelCompletion(capMet, ggeMet, budgetMet);
    }

    return { totalCap, totalGge, ggeNet, finalCap, finalGgeNet, capMet, ggeMet, budgetMet, totalSpent, totalRemaining };
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
    if (levelCompleted[currentLevel]) return;
    levelCompleted[currentLevel]     = true;
    levelEverCompleted[currentLevel] = true;

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
         : "Amazing! You have completed all levels!"}`;

    if (hasNext) unlockLevel(nextLevel);
    gamePaused = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    levelCompleteOverlay.style.display = "flex";
    refreshLevelButtons();
  }

  function triggerFinalCommit() {
    gamePaused = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const goalYears   = currentConfig.goalYears;
    const allGoalsMet = goalYears.every(gy => getGoalYearStatus(gy).allOk);

    if (allGoalsMet && !levelCompleted[currentLevel]) {
      levelCompleted[currentLevel]     = true;
      levelEverCompleted[currentLevel] = true;
      const finishTime = gameTimer;
      if (bestTimes[currentLevel] === null || finishTime < bestTimes[currentLevel]) {
        bestTimes[currentLevel] = finishTime;
      }
      if (currentLevel < 3) unlockLevel(currentLevel + 1);
      refreshLevelButtons();
    }

    openSummary(true);
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
      if (levelCompleted[level]) btn.classList.add("completed");
      const timeEl = btn.querySelector(".btn-best-time");
      if (timeEl && bestTimes[level] !== null) {
        timeEl.textContent = `Best: ${formatTime(bestTimes[level])}`;
      }
    });
    document.querySelectorAll(".redo-level-btn").forEach(btn => {
      const level = Number(btn.dataset.level);
      btn.style.display = levelEverCompleted[level] ? "inline-block" : "none";
    });
  }

  // ============================================================
  //  Year navigation
  // ============================================================
  function advanceYear(direction) {
    if (currentConfig.lockForward && direction < 0) return;

    if (currentConfig.lockForward && direction > 0) {
      const isLastYear = currentYearIndex === currentConfig.years.length - 1;
      if (isLastYear) { triggerFinalCommit(); return; }

      // Lock current year, merge online units into base for the next year
      lockedUpToIndex  = currentYearIndex;
      const nextYear   = currentConfig.years[currentYearIndex + 1];
      mergeOnlineUnitsIntoBase(nextYear);
    }

    const newIndex = currentYearIndex + direction;
    if (newIndex < 0 || newIndex >= currentConfig.years.length) return;
    currentYearIndex             = newIndex;
    currentYearLabel.textContent = currentYear();
    prevYearBtn.disabled         = currentConfig.lockForward || currentYearIndex === 0;

    if (currentConfig.lockForward && currentYearIndex === currentConfig.years.length - 1) {
      nextYearBtn.textContent = "Final Commit \u2713";
    } else {
      nextYearBtn.textContent = currentConfig.lockForward
        ? "Commit & Advance \u25B6"
        : "Next Year \u25B6";
    }
    nextYearBtn.disabled = !currentConfig.lockForward && currentYearIndex === currentConfig.years.length - 1;

    renderEnergyTable();
    recomputeAll();
  }

  prevYearBtn.addEventListener("click", () => advanceYear(-1));
  nextYearBtn.addEventListener("click", () => advanceYear(1));

  // ============================================================
  //  Stepper buttons
  // ============================================================
  document.addEventListener("click", e => {
    const stepBtn = e.target.closest(".step");
    if (!stepBtn) return;
    const row = stepBtn.closest(".energy-row");
    if (!row) return;
    const type   = row.dataset.type;
    const source = getSource(type);

    if (!currentConfig.useTimeLag) {
      if (stepBtn.classList.contains("up")) {
        unitState[type] = (unitState[type] || 0) + 1;
      }
      if (stepBtn.classList.contains("down")) {
        const current    = unitState[type] || 0;
        const currentCap = source.baseCap + current * source.unitCap;
        if (currentCap <= 0) return;
        const nextCap   = source.baseCap + (current - 1) * source.unitCap;
        unitState[type] = nextCap < 0
          ? Math.ceil(-source.baseCap / source.unitCap)
          : current - 1;
      }
    } else {
      const yr     = currentYear();
      const byYear = unitState[type];
      const thisYr = byYear[yr] || 0;
      const total  = getTotalUnits(type);

      if (stepBtn.classList.contains("up")) {
        if (isYearLocked(currentYearIndex)) return;
        byYear[yr] = thisYr + 1;
        if (currentConfig.budgetByYear) {
          if (total < 0) {
            yearSpend[yr].units = (yearSpend[yr].units || 0) + (source.construct * 100 * DIVESTMENT_REFUND_RATE);
          } else {
            yearSpend[yr].units = (yearSpend[yr].units || 0) + (source.construct * 100);
          }
        }
        if (byYear[yr] === 0) delete byYear[yr];
      }

      if (stepBtn.classList.contains("down")) {
        // Floor uses mergedBase
        const capAtNext = getBaseCap(type) + (total - 1) * source.unitCap;
        if (capAtNext < 0) return;

        if (currentConfig.budgetByYear) {
          if (total > 0) {
            const refundYr = getMostRecentInvestedYear(type);
            if (refundYr !== null) {
              if (!yearSpend[refundYr]) yearSpend[refundYr] = { units: 0, investments: 0 };
              yearSpend[refundYr].units = (yearSpend[refundYr].units || 0) - (source.construct * 100);
              byYear[refundYr] = (byYear[refundYr] || 0) - 1;
              if (byYear[refundYr] === 0) delete byYear[refundYr];
            }
          } else {
            // total === 0: divesting merged/base capacity at 0.25 rate
            yearSpend[yr].units = (yearSpend[yr].units || 0) - (source.construct * 100 * DIVESTMENT_REFUND_RATE);
            byYear[yr] = thisYr - 1;
            if (byYear[yr] === 0) delete byYear[yr];
          }
        } else {
          const refundYr = getMostRecentInvestedYear(type);
          if (refundYr !== null) {
            byYear[refundYr] = (byYear[refundYr] || 0) - 1;
            if (byYear[refundYr] === 0) delete byYear[refundYr];
          } else {
            byYear[yr] = thisYr - 1;
            if (byYear[yr] === 0) delete byYear[yr];
          }
        }
      }
    }

    recomputeAll();
  });

  // ============================================================
  //  Investment checkbox changes
  // ============================================================
  document.addEventListener("change", e => {
    if (e.target.type === "checkbox" && e.target.closest("#investment-list")) {
      const invId = e.target.dataset.invId;
      const cost  = num(e.target.dataset.cost, 0);

      if (currentConfig.budgetByYear) {
        const yr = currentYear();
        if (e.target.checked) {
          investmentYear[invId] = yr;
          if (!yearSpend[yr]) yearSpend[yr] = { units: 0, investments: 0 };
          yearSpend[yr].investments = (yearSpend[yr].investments || 0) + cost;
        } else {
          const originalYr = investmentYear[invId] ?? yr;
          if (!yearSpend[originalYr]) yearSpend[originalYr] = { units: 0, investments: 0 };
          yearSpend[originalYr].investments = (yearSpend[originalYr].investments || 0) - cost;
          if (yearSpend[originalYr].investments < 0) yearSpend[originalYr].investments = 0;
          delete investmentYear[invId];
        }
      }

      recomputeAll();
    }
  });

  // ============================================================
  //  Recompute everything
  // ============================================================
  function recomputeAll() {
    recomputeRows();
    const totals = recomputeTotals();
    renderGoals(totals.capMet, totals.ggeMet, totals.budgetMet);
    if (!currentConfig.goalYears) {
      setText("goal-cap-current",      totals.finalCap.toFixed(2));
      setText("goal-gge-current",      totals.finalGgeNet.toFixed(2));
      setText("goal-budget-spent",     (totals.totalSpent     ?? 0).toFixed(0));
      setText("goal-budget-remaining", (totals.totalRemaining ?? 0).toFixed(0));
    }
    updateCharts(totals);
  }

  // ============================================================
  //  Charts
  // ============================================================
  const CHART_COLORS = {
    oil: "#b7e4c7", gas: "#95d5b2", wind: "#52b788",
    solar: "#40916c", offshore: "#2d6a4f", nuclear: "#1b4332", hydro: "#081c15"
  };

  function initCharts() {
    Object.keys(charts).forEach(k => {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });

    const yearsForCharts = currentConfig.chartYears || currentConfig.years;
    const demandData     = yearsForCharts.map(y => currentConfig.demandByYear[y]);
    const labels         = yearsForCharts.map(String);

    const demandCtx = document.getElementById("demandChart").getContext("2d");
    charts.demand = new Chart(demandCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Demand (TWh)",  data: demandData, borderColor: "#204a35", backgroundColor: "rgba(255,107,107,0.1)", borderWidth: 2.5, tension: 0.4, fill: true },
          { label: "Supply (TWh)", data: Array(yearsForCharts.length).fill(startingSupply), borderColor: "#8acb84", backgroundColor: "rgba(78,205,196,0.1)", borderWidth: 2.5, tension: 0.4, fill: true },
        ],
      },
      options: chartOptions("TWh"),
    });

    const fuelCtx = document.getElementById("fuelChart").getContext("2d");
    charts.fuel = new Chart(fuelCtx, {
      type: "doughnut",
      data: {
        labels: ENERGY_SOURCES.map(s => s.label),
        datasets: [{ data: ENERGY_SOURCES.map(s => s.baseCap), backgroundColor: ENERGY_SOURCES.map(s => CHART_COLORS[s.type]), borderColor: "rgba(0,0,0,0.2)", borderWidth: 2 }],
      },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: "#fff", font: { size: 11 } } } } },
    });

    const ggeCtx     = document.getElementById("ggeChart").getContext("2d");
    const ggeTargets = yearsForCharts.map(y =>
      currentConfig.ggeTargetByYear ? currentConfig.ggeTargetByYear[y] : currentConfig.ggeTarget
    );
    charts.gge = new Chart(ggeCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Your GGE (MtCO\u2082eq)", data: Array(yearsForCharts.length).fill(startingGgeNet), borderColor: "#ff4000", backgroundColor: "rgba(0,255,17,0)", borderWidth: 2.5, tension: 0.35, fill: true, pointRadius: 3 },
          { label: "Target", data: ggeTargets, borderColor: "#00ff2a", borderDash: [6, 4], backgroundColor: "transparent", borderWidth: 2, tension: 0.3, pointRadius: 2 },
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
        y: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" }, title: { display: true, text: yLabel, color: "#ccc" }, grace: "10%" },
        x: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } },
      },
    };
  }

  function updateCharts(totals) {
    if (!charts.demand || !charts.fuel || !charts.gge) return;
    const numLabels   = (currentConfig.chartYears || currentConfig.years).length;
    const supplyNow   = parseFloat(totals.finalCap.toFixed(2));
    const supplyStart = startingSupply ?? supplyNow;

    charts.demand.data.datasets[1].data = Array.from({ length: numLabels }, (_, i) =>
      parseFloat((supplyStart + (supplyNow - supplyStart) * (i / (numLabels - 1))).toFixed(2))
    );
    charts.demand.update("none");

    const yr = currentYear();
    charts.fuel.data.datasets[0].data = ENERGY_SOURCES.map(s =>
      parseFloat((getBaseCap(s.type) + getOnlineUnits(s.type, yr) * s.unitCap).toFixed(2))
    );
    charts.fuel.update("none");

    const ggeNow   = parseFloat(totals.finalGgeNet.toFixed(2));
    const ggeStart = startingGgeNet ?? ggeNow;
    charts.gge.data.datasets[0].data = Array.from({ length: numLabels }, (_, i) =>
      parseFloat((ggeStart + (ggeNow - ggeStart) * (i / (numLabels - 1))).toFixed(2))
    );
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
      if (!gamePaused) { gameTimer++; updateTimerDisplay(); }
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
    startTimerInterval();
  });

  resetBtn.addEventListener("click", () => {
    pauseOverlay.style.display = "none";
    gamePaused = false;
    loadLevel(currentLevel);
  });

  redoBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
    levelCompleted[currentLevel]       = false;
    gamePaused                         = false;
    loadLevel(currentLevel);
  });

  viewLevelBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
  });

  exitBtn.addEventListener("click", () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    pauseOverlay.style.display         = "none";
    levelScreen.style.display          = "none";
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
    refreshLevelButtons();
    gamePaused = false;
  });

  closeLevelCompleteBtn.addEventListener("click", () => {
    levelCompleteOverlay.style.display = "none";
    levelScreen.style.display          = "none";
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    levelSelectContainer.style.display = "flex";
    currentLevel = null;
    refreshLevelButtons();
  });

  nameForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    startScreen.style.display  = "none";
    gameScreen.style.display   = "flex";
    welcomeFlash.style.display = "flex";
    setTimeout(() => {
      welcomeFlash.style.display         = "none";
      levelSelectContainer.style.display = "flex";
    }, 2000);
  });

  levelButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.level);
      if (levelEverCompleted[level]) return;
      loadLevel(level);
    });
  });

  document.querySelectorAll(".redo-level-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      loadLevel(Number(btn.dataset.level));
    });
  });

}); // end DOMContentLoaded
