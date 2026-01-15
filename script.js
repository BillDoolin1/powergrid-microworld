document.addEventListener("DOMContentLoaded", () => {
  // Get all elements
  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const welcomeFlash = document.getElementById("welcome-flash");
  const levelSelectContainer = document.getElementById("level-select-container");
  const level1Screen = document.getElementById("level-1-screen");
  const nameForm = document.getElementById("name-form");
  const nameInput = document.getElementById("player-name");

  const levelButtons = document.querySelectorAll(".level-btn");
  const levelMessage = document.getElementById("level-message");
  const completeLevelBtn = document.getElementById("complete-level");

  // Pause controls
  const pauseBtn = document.getElementById("pause-btn");
  const pauseOverlay = document.getElementById("pause-overlay");
  const resumeBtn = document.getElementById("resume-btn");
  const resetBtn = document.getElementById("reset-btn");
  const exitBtn = document.getElementById("exit-btn");
  const timer = document.getElementById("timer");

  // Game state
  const levelCompleted = { 1: false, 2: false, 3: false };
  let currentLevel = null;
  let gameTimer = 0;
  let timerInterval = null;
  let gamePaused = false;

  // Name form submission
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    startScreen.style.display = "none";
    gameScreen.style.display = "block";
    welcomeFlash.style.display = "flex";

    setTimeout(() => {
      welcomeFlash.style.display = "none";
      levelSelectContainer.style.display = "block";
    }, 2000);
  });

  // Level selection
  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.level);
      if (btn.disabled) return;

      currentLevel = level;
      // Show correct level screen
if (level === 1) {
  level1Screen.style.display = "flex";
  startTimer(); // Use shared timer
} else if (level === 2) {
  document.getElementById("level-2-screen").style.display = "flex";
  startTimer();
} else if (level === 3) {
  document.getElementById("level-3-screen").style.display = "flex";
  startTimer();
}

      levelSelectContainer.style.display = "none";

      if (level === 1) {
        level1Screen.style.display = "flex";
        startTimer();
      }
      levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
    const level = Number(btn.dataset.level);
    if (btn.disabled) return;

    currentLevel = level;
    
    levelSelectContainer.style.display = "none";

    if (level === 1) {
      level1Screen.style.display = "flex";
      startTimer();
      
      const pauseBtn = document.getElementById("pause-btn");
      if (pauseBtn) {
        pauseBtn.onclick = () => {  // Simple onclick
          gamePaused = true;
          pauseOverlay.style.display = "flex";
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        };
      }
      
      const resumeBtn = document.getElementById("resume-btn");
      if (resumeBtn) {
        resumeBtn.onclick = () => {
          gamePaused = false;
          pauseOverlay.style.display = "none";
          startTimer();
        };
            }
   
            }
        });
    });

      levelMessage.textContent = `Level ${level} active.`;
      completeLevelBtn.style.display = "inline-block";
      completeLevelBtn.dataset.level = level;
    });
  });

// v lowk these are here twice but if not broke dont fix it



  pauseBtn.addEventListener("click", () => {
    gamePaused = true;
    pauseOverlay.style.display = "flex";
    clearInterval(timerInterval);
  });

  resumeBtn.addEventListener("click", () => {
    gamePaused = false;
    pauseOverlay.style.display = "none";
    startTimer();
  });

  resetBtn.addEventListener("click", () => {
    gameTimer = 0;
    updateTimerDisplay();
    pauseOverlay.style.display = "none";
    gamePaused = false; 
    startTimer();       
  });


  exitBtn.addEventListener("click", () => {
    gameTimer = 0;
    updateTimerDisplay();
    clearInterval(timerInterval);
    pauseOverlay.style.display = "none";
    level1Screen.style.display = "none";
    levelSelectContainer.style.display = "block";
  });

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
    const minutes = Math.floor(gameTimer / 60);
    const seconds = gameTimer % 60;
    timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
});
