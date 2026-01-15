document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const welcomeFlash = document.getElementById("welcome-flash");
  const levelSelectContainer = document.getElementById("level-select-container");
  const level1Screen = document.getElementById("level-1-screen");
  const nameForm = document.getElementById("name-form");
  const nameInput = document.getElementById("player-name");
  const levelButtons = document.querySelectorAll(".level-btn");

  // Game state
  const levelCompleted = { 1: false, 2: false, 3: false };
  let currentLevel = null;
  let gameTimer = 0;
  let timerInterval = null;
  let gamePaused = false;

  // Budget: €2B stored as €M
  const STATE = {
    budgetTotalM: 2000,
    unitDiscount: 0.10 // 90% cheaper => pay 10%
  };

  function num(val, fallback = 0) {
    const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function setFixed(id, value, digits = 2) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value).toFixed(digits);
  }

  function clampInt(n) {
    n = parseInt(n, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  // ---- Investments: 10% more expensive, REDUCE GGE directly ----
  function investmentSpendM() {
    const cbs = [...document.querySelectorAll('#investment-panel input[type="checkbox"]')];
    let sum = 0;
    cbs.forEach((cb) => {
      if (!cb.checked) return;
      const base = num(cb.dataset.cost, 0);
      sum += base * 1.10; // 10% more expensive
    });
    return sum;
  }

  // Get total GGE reduction from checked investments
  function investmentGgeReduction() {
    const cbs = [...document.querySelectorAll('#investment-panel input[type="checkbox"]')];
    let reduction = 0;
    cbs.forEach((cb) => {
      if (!cb.checked) return;
      const ggeRedux = num(cb.dataset.ggeReduction, 0);
      reduction += ggeRedux;
    });
    return reduction;
  }

  // ---- Rows: additional units add on top of base cap/gge ----
  function getUnits(type) {
    const el = document.getElementById(`units-${type}`);
    return clampInt(el?.textContent || "0");
  }

  function setUnits(type, units) {
    const el = document.getElementById(`units-${type}`);
    if (el) el.textContent = String(Math.max(0, units));
  }

  function setCap(type, value) {
    const el = document.getElementById(`cap-${type}`);
    if (el) el.textContent = Number(value).toFixed(2);
  }

  function setGge(type, value) {
    const el = document.getElementById(`gge-${type}`);
    if (el) el.textContent = Number(value).toFixed(2);
  }

  function recomputeRowsFromUnits() {
    const rows = [...document.querySelectorAll("#energy-table tbody tr.energy-row")];

    rows.forEach((row) => {
      const type = row.dataset.type;

      const baseCap = num(row.dataset.baseCap, 0);
      const baseGge = num(row.dataset.baseGge, 0);

      const unitCap = num(row.dataset.unitCap, 0);
      const unitGge = num(row.dataset.unitGge, 0);

      const units = getUnits(type);

      setCap(type, baseCap + units * unitCap);
      setGge(type, baseGge + units * unitGge);
    });
  }

  // Unit cost rule: (construction + operating*4) then 90% cheaper
  function unitCostM(row) {
    const construct = num(row.dataset.construct, 0);
    const operating = num(row.dataset.operating, 0);
    const raw = construct + operating * 4;
    return raw * STATE.unitDiscount;
  }

  function unitSpendM() {
    const rows = [...document.querySelectorAll("#energy-table tbody tr.energy-row")];
    return rows.reduce((sum, row) => {
      const type = row.dataset.type;
      const units = getUnits(type);
      return sum + units * unitCostM(row);
    }, 0);
  }

  function recomputeTotalsGoalsBudget() {
    const rows = [...document.querySelectorAll("#energy-table tbody tr.energy-row")];

    const totals = rows.reduce((acc, row) => {
      const type = row.dataset.type;
      acc.capacity += num(document.getElementById(`cap-${type}`)?.textContent, 0);
      acc.gge += num(document.getElementById(`gge-${type}`)?.textContent, 0);
      return acc;
    }, { capacity: 0, gge: 0 });

    // Totals row in table (pure table sum)
    setFixed("cap-total", totals.capacity, 2);
    setFixed("gge-total", totals.gge, 2);

    // GGE: base GGE MINUS investment reduction (investments directly reduce GGE)
    const ggeReduction = investmentGgeReduction();
    const ggeAfterReduction = Math.max(0, totals.gge - ggeReduction);

    setFixed("goal-capacity-current", totals.capacity, 2);
    setFixed("goal-gge-current", ggeAfterReduction, 2);

    // Budget from units + investments
    const spent = unitSpendM() + investmentSpendM();
    const remaining = STATE.budgetTotalM - spent;

    setText("budget-spent", spent.toFixed(0));
    setText("budget-remaining", remaining.toFixed(0));

    // ========== UPDATE GOAL STATUSES ==========
    const capacityTarget = num(document.getElementById("goal-capacity-target")?.textContent, 50);
    const ggeTarget = num(document.getElementById("goal-gge-target")?.textContent, 24);
    const budgetTotal = STATE.budgetTotalM;

    // Goal 1: Capacity ≥ demand
    const capacityMet = totals.capacity >= capacityTarget;
    updateGoalStatus("goal-capacity-status", capacityMet);

    // Goal 2: GGE ≤ target (after reduction)
    const ggeMet = ggeAfterReduction <= ggeTarget;
    updateGoalStatus("goal-gge-status", ggeMet);

    // Goal 3: Spent ≤ budget
    const budgetMet = spent <= budgetTotal;
    updateGoalStatus("goal-budget-status", budgetMet);
  }

  // Update goal status icon
  function updateGoalStatus(elementId, isMet) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (isMet) {
      el.textContent = "✓";
      el.className = "goal-status complete";
    } else {
      el.textContent = "✗";
      el.className = "goal-status incomplete";
    }
  }

  function recomputeAll() {
    recomputeRowsFromUnits();
    recomputeTotalsGoalsBudget();
    updateCharts();
  }

  // ---- Initialize starting units ----
  function getRow(type) {
    return document.querySelector(`#energy-table tbody tr.energy-row[data-type="${type}"]`);
  }

  function initStartingUnitsIfEmpty() {
    const rows = [...document.querySelectorAll("#energy-table tbody tr.energy-row")];

    // If any units already set, don't overwrite
    const alreadySet = rows.some(r => getUnits(r.dataset.type) > 0);
    if (alreadySet) return;

    // Priority 1: use data-start-units if present
    const hasDataStart = rows.some(r => r.dataset.startUnits != null);
    if (hasDataStart) {
      rows.forEach(r => {
        const type = r.dataset.type;
        const u = clampInt(r.dataset.startUnits || "0");
        setUnits(type, u);
      });
      return;
    }

    // Priority 2: approximate Ireland-like electricity mix
    const mix = {
      gas: 0.39,
      wind: 0.32,
      solar: 0.04,
      offshore: 0.02,
      oil: 0.01
    };

    const TOTAL_UNITS = 120;

    Object.entries(mix).forEach(([type, share]) => {
      const u = Math.round(TOTAL_UNITS * share);
      if (getRow(type)) setUnits(type, u);
    });

    // ensure any remaining rows have 0
    rows.forEach(r => {
      const type = r.dataset.type;
      if (!document.getElementById(`units-${type}`)?.textContent) setUnits(type, 0);
    });
  }

  // ---- Name form ----
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    startScreen.style.display = "none";
    gameScreen.style.display = "flex";
    welcomeFlash.style.display = "flex";

    setTimeout(() => {
      welcomeFlash.style.display = "none";
      levelSelectContainer.style.display = "flex";
    }, 2000);
  });

  // ---- Level selection ----
  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.level);
      if (btn.disabled) return;

      currentLevel = level;
      levelSelectContainer.style.display = "none";

      if (level === 1) {
        level1Screen.style.display = "flex";
        startTimer();
        setupPauseListeners();

        initStartingUnitsIfEmpty();
        setTimeout(() => {
          if (!demandChart) initCharts();
          recomputeAll();
        }, 100);
      } else if (level === 2) {
        document.getElementById("level-2-screen").style.display = "flex";
        startTimer();
      } else if (level === 3) {
        document.getElementById("level-3-screen").style.display = "flex";
        startTimer();
      }
    });
  });

  // ---- Stepper: changes additional units ----
  document.addEventListener("click", (e) => {
    const stepBtn = e.target.closest(".step");
    if (!stepBtn) return;

    const row = stepBtn.closest(".energy-row");
    if (!row) return;

    const type = row.dataset.type;
    let units = getUnits(type);

    if (stepBtn.classList.contains("up")) units += 1;
    if (stepBtn.classList.contains("down")) units = Math.max(0, units - 1);

    setUnits(type, units);
    recomputeAll();
  });

  // ---- Investment checkbox changes ----
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.type !== "checkbox") return;
    if (!t.closest("#investment-panel")) return;

    recomputeAll();
  });

  // ---- Pause setup ----
  function setupPauseListeners() {
    const pauseBtn = document.getElementById("pause-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const resetBtn = document.getElementById("reset-btn");
    const exitBtn = document.getElementById("exit-btn");

    if (pauseBtn) {
      pauseBtn.onclick = () => {
        gamePaused = true;
        document.getElementById("pause-overlay").style.display = "flex";
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      };
    }

    if (resumeBtn) {
      resumeBtn.onclick = () => {
        gamePaused = false;
        document.getElementById("pause-overlay").style.display = "none";
        startTimer();
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        gameTimer = 0;
        updateTimerDisplay();
        document.getElementById("pause-overlay").style.display = "none";
        startTimer();
      };
    }

    if (exitBtn) {
      exitBtn.onclick = () => {
        gameTimer = 0;
        updateTimerDisplay();
        if (timerInterval) clearInterval(timerInterval);
        document.getElementById("pause-overlay").style.display = "none";
        level1Screen.style.display = "none";
        levelSelectContainer.style.display = "flex";
      };
    }
  }

  // ---- Timer ----
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!gamePaused) {
        gameTimer++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      const minutes = Math.floor(gameTimer / 60);
      const seconds = gameTimer % 60;
      timerEl.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  // ========== CHART INITIALIZATION & UPDATES ==========
  let demandChart = null;
  let fuelChart = null;
  let ggeChart = null;

  function initCharts() {
    // Demand vs Supply chart
    const demandCtx = document.getElementById("demandChart")?.getContext("2d");
    if (demandCtx && !demandChart) {
      demandChart = new Chart(demandCtx, {
        type: "line",
        data: {
          labels: ["2025", "2026", "2027", "2028", "2029", "2030"],
          datasets: [
            {
              label: "Demand",
              data: [32, 34, 36, 38, 39, 40],
              borderColor: "#ff6b6b",
              backgroundColor: "rgba(255, 107, 107, 0.1)",
              borderWidth: 2.5,
              tension: 0.4,
              fill: true
            },
            {
              label: "Supply",
              data: [33, 35, 37, 39, 41, 43],
              borderColor: "#4ecdc4",
              backgroundColor: "rgba(78, 205, 196, 0.1)",
              borderWidth: 2.5,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: { color: "#fff", font: { size: 12 } }
            }
          },
          scales: {
            y: {
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            },
            x: {
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          }
        }
      });
    }

    // Fuel Mix Pie chart
    const fuelCtx = document.getElementById("fuelChart")?.getContext("2d");
    if (fuelCtx && !fuelChart) {
      fuelChart = new Chart(fuelCtx, {
        type: "doughnut",
        data: {
          labels: ["Gas", "Wind", "Oil", "Nuclear", "Offshore", "Solar", "Hydro"],
          datasets: [
            {
              data: [40, 32, 18, 5, 3, 1, 1],
              backgroundColor: [
                "#7c5ac2",
                "#4ecdc4",
                "#ff6b6b",
                "#95e1d3",
                "#5a92a1",
                "#f9c74f",
                "#90be6d"
              ],
              borderColor: "rgba(0,0,0,0.2)",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: { color: "#fff", font: { size: 11 } }
            }
          }
        }
      });
    }

    // GGE Bar chart
    const ggeCtx = document.getElementById("ggeChart")?.getContext("2d");
    if (ggeCtx && !ggeChart) {
      ggeChart = new Chart(ggeCtx, {
        type: "bar",
        data: {
          labels: ["2025", "2026", "2027", "2028", "2029", "2030"],
          datasets: [
            {
              label: "GGE Emissions (MtCO2eq)",
              data: [29, 28, 27.5, 27, 26.5, 26],
              backgroundColor: "#4ecdc4",
              borderColor: "#2a9d8f",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: "x",
          plugins: {
            legend: {
              labels: { color: "#fff", font: { size: 12 } }
            }
          },
          scales: {
            y: {
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            },
            x: {
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          }
        }
      });
    }
  }

  function updateCharts() {
    // Get current data
    const rows = [...document.querySelectorAll("#energy-table tbody tr.energy-row")];
    const totalCap = rows.reduce((sum, row) => {
      const type = row.dataset.type;
      return sum + num(document.getElementById(`cap-${type}`)?.textContent, 0);
    }, 0);

    // Update Demand chart "Supply" line
    if (demandChart) {
      demandChart.data.datasets[1].data = [totalCap, totalCap, totalCap, totalCap, totalCap, totalCap];
      demandChart.update();
    }

    // Update Fuel Mix pie
    if (fuelChart) {
      const capacities = ["gas", "wind", "oil", "nuclear", "offshore", "solar", "hydro"].map(
        type => num(document.getElementById(`cap-${type}`)?.textContent, 0)
      );
      fuelChart.data.datasets[0].data = capacities;
      fuelChart.update();
    }

    // Update GGE bar
    const currentGGE = num(document.getElementById("goal-gge-current")?.textContent, 0);
    if (ggeChart) {
      ggeChart.data.datasets[0].data = [currentGGE + 5, currentGGE + 4, currentGGE + 3.5, currentGGE + 3, currentGGE + 2.5, currentGGE + 2];
      ggeChart.update();
    }
  }
});
