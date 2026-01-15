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

  // Budget: €2B (store as €M)
  const STATE = {
    budgetTotalM: 2000
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

  // ---- Investments: 10% more expensive, +10% GGE per checked ----
  function investmentPanelMult() {
    const panel = document.getElementById("investment-panel");
    return num(panel?.dataset.ggeMult, 0.10) || 0.10; // dataset reading [web:128]
  }

  function investmentCheckedCount() {
    return [...document.querySelectorAll('#investment-panel input[type="checkbox"]')]
      .filter(cb => cb.checked).length;
  }

  function investmentSpendM() {
    const cbs = [...document.querySelectorAll('#investment-panel input[type="checkbox"]')];
    let sum = 0;
    cbs.forEach((cb) => {
      if (!cb.checked) return;
      const base = num(cb.dataset.cost, 0); // dataset reading [web:128]
      sum += base * 1.10; // 10% more expensive
    });
    return sum;
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

  // Cost rule for units: construction + operating*4
  function unitCostM(row) {
    const construct = num(row.dataset.construct, 0); // expects numeric part (e.g. 1.2)
    const operating = num(row.dataset.operating, 0); // numeric
    return construct + operating * 4;
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

    // Goals derived from totals (capacity) and totals adjusted by investments (GGE)
    const checked = investmentCheckedCount();
    const mult = investmentPanelMult();
    const ggeWithInvestments = totals.gge * (1 + checked * mult);

    setFixed("goal-capacity-current", totals.capacity, 2);
    setFixed("goal-gge-current", ggeWithInvestments, 2);

    // Budget from units + investments (over-budget allowed, remaining may be negative)
    const spent = unitSpendM() + investmentSpendM();
    const remaining = STATE.budgetTotalM - spent;

    setText("budget-spent", spent.toFixed(0));
    setText("budget-remaining", remaining.toFixed(0));
  }

  function recomputeAll() {
    recomputeRowsFromUnits();
    recomputeTotalsGoalsBudget();
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
        recomputeAll();
      } else if (level === 2) {
        document.getElementById("level-2-screen").style.display = "flex";
        startTimer();
      } else if (level === 3) {
        document.getElementById("level-3-screen").style.display = "flex";
        startTimer();
      }
    });
  });

  // ---- Stepper: changes additional units (capacity & gge follow) ----
  document.addEventListener("click", (e) => {
    const stepBtn = e.target.closest(".step"); // closest finds nearest matching ancestor [web:189]
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

    // only recompute if it's an investment checkbox
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
});
