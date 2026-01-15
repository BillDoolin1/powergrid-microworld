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

  // Name form
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

  // FIXED Level selection (no nesting/duplicates)
  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.level);
      if (btn.disabled) return;

      currentLevel = level;
      levelSelectContainer.style.display = "none";

      // Show level + setup pause
      if (level === 1) {
        level1Screen.style.display = "flex";
        startTimer();
        setupPauseListeners();  // Single setup function
      } else if (level === 2) {
        document.getElementById("level-2-screen").style.display = "flex";
        startTimer();
      } else if (level === 3) {
        document.getElementById("level-3-screen").style.display = "flex";
        startTimer();
      }
    });
  });

  // SINGLE Pause setup function
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

  // Timer functions
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
      timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
});
