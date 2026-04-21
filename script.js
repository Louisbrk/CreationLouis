// SkinTrack – komplette App
// Loader + 7-Schritt-Onboarding + Empfehlung + Baseline + Dashboard + Check-ins + Ergebnis

const STORAGE_KEY = "skintrack_app_v3";

/* =========================
   STATE
========================= */
function getDefaultState() {
  return {
    onboarding: {
      acneLevel: null,
      acneHistory: null,
      mainConcern: null,
      skinType: null,
      sensitive: null,
      effort: null,
      budget: null
    },
    routineMode: null,
    customRoutine: [],
    recommendation: null,
    baseline: null,
    startDate: null,
    checkins: [],
    activeRoutine: null
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      ...getDefaultState(),
      ...parsed,
      onboarding: {
        ...getDefaultState().onboarding,
        ...(parsed.onboarding || {})
      }
    };
  } catch (error) {
    console.error("Fehler beim Laden des Status:", error);
    return getDefaultState();
  }
}

let state = loadState();

let selectedCalendarDayKey = null;

let currentCheckinPhoto = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  state = getDefaultState();
  saveState();
}

/* =========================
   SCREEN MANAGEMENT
========================= */
const allScreens = [
  "welcome-screen",
  "skin-sketch-screen",
  "acne-history-screen",
  "main-concern-screen",
  "skin-type-screen",
  "sensitive-screen",
  "effort-screen",
  "budget-screen",
  "routine-mode-screen",
  "recommendation-screen",
  "custom-routine-screen",
  "baseline-screen",
  "dashboard-screen",
  "calendar-screen",
  "daily-checkin-screen",
  "results-screen"
];

const onboardingFlow = [
  { screen: "skin-sketch-screen", field: "acneLevel" },
  { screen: "acne-history-screen", field: "acneHistory" },
  { screen: "main-concern-screen", field: "mainConcern" },
  { screen: "skin-type-screen", field: "skinType" },
  { screen: "sensitive-screen", field: "sensitive" },
  { screen: "effort-screen", field: "effort" },
  { screen: "budget-screen", field: "budget" }
];

function showScreen(screenId) {
  allScreens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
    }
  });

  const active = document.getElementById(screenId);
  if (active) {
    active.classList.remove("hidden");
  }

  updateProgressBar(screenId);
  updateBottomNav(screenId);
}
function updateBottomNav(screenId) {
  const bottomNav = document.querySelector(".bottom-nav");
  if (!bottomNav) return;

  const appScreens = [
    "dashboard-screen",
    "calendar-screen",
    "daily-checkin-screen",
    "results-screen"
  ];

  if (appScreens.includes(screenId)) {
    bottomNav.classList.remove("hidden");
  } else {
    bottomNav.classList.add("hidden");
  }

  const buttons = bottomNav.querySelectorAll(".bottom-nav-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  const activeMap = {
    "dashboard-screen": "nav-home-btn",
    "calendar-screen": "nav-calendar-btn",
    "daily-checkin-screen": "nav-checkin-btn",
    "results-screen": "nav-results-btn"
  };

  const activeBtn = document.getElementById(activeMap[screenId]);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

function updateProgressBar(screenId) {
  const progressShell = document.getElementById("onboarding-progress-shell");
  const labelEl = document.getElementById("onboarding-progress-label");
  const percentEl = document.getElementById("onboarding-progress-percent");
  const barEl = document.getElementById("onboarding-progress-bar");

  const idx = onboardingFlow.findIndex((item) => item.screen === screenId);

  if (idx >= 0) {
    const percent = Math.round(((idx + 1) / onboardingFlow.length) * 100);

    progressShell.classList.remove("hidden");
    labelEl.textContent = `Schritt ${idx + 1} von ${onboardingFlow.length}`;
    percentEl.textContent = `${percent}%`;
    barEl.style.width = `${percent}%`;
  } else {
    progressShell.classList.add("hidden");
    barEl.style.width = "0%";
  }
}

function getNextOnboardingScreen(currentScreen) {
  const idx = onboardingFlow.findIndex((item) => item.screen === currentScreen);
  if (idx === -1 || idx === onboardingFlow.length - 1) return null;
  return onboardingFlow[idx + 1].screen;
}

function getPreviousOnboardingScreen(currentScreen) {
  const idx = onboardingFlow.findIndex((item) => item.screen === currentScreen);
  if (idx <= 0) return "welcome-screen";
  return onboardingFlow[idx - 1].screen;
}
function bindBottomNav() {
  const navButtons = document.querySelectorAll(".bottom-nav-btn");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      if (!target) return;

      if (target === "dashboard-screen") {
        renderDashboard();
      }

      if (target === "calendar-screen") {
        renderCalendar();
      }

      if (target === "daily-checkin-screen") {
        prefillTodayCheckin();
      }

      if (target === "results-screen") {
        renderResults();
      }

      showScreen(target);
    });
  });
}

/* =========================
   ROUTINES / RECOMMENDATION
========================= */
const routines = {
  clear: {
    id: "clear",
    name: "Clear Start Routine",
    badge: "Für Unreinheiten & öligere Haut",
    description:
      "Eine einfache Routine für Haut mit aktuellen Unreinheiten oder Fokus auf weniger neue Pickel.",
    steps: [
      "Sanfter Cleanser",
      "Leichtes Serum gegen Unreinheiten",
      "Leichte Feuchtigkeitspflege + SPF am Morgen"
    ]
  },
  barrier: {
    id: "barrier",
    name: "Barrier Reset Routine",
    badge: "Für empfindliche / trockene Haut",
    description:
      "Eine beruhigende Routine für empfindliche, trockene oder gereizte Haut.",
    steps: [
      "Milder Cleanser oder nur Wasser am Morgen",
      "Beruhigendes Barriereserum",
      "Reichhaltige Feuchtigkeitscreme + SPF am Morgen"
    ]
  },
  glow: {
    id: "glow",
    name: "Balanced Glow Routine",
    badge: "Für ebenmäßige & stabile Haut",
    description:
      "Eine ausgewogene Routine für Glow, Hautbalance und unkomplizierte Pflege.",
    steps: [
      "Sanfter Cleanser",
      "Hydratisierendes Serum",
      "Leichte Feuchtigkeitspflege + SPF am Morgen"
    ]
  }
};

function scoreRoutine(profile) {
  const scores = {
    clear: 0,
    barrier: 0,
    glow: 0
  };

  // Aktueller Hautzustand
  if (profile.acneLevel === "mild") {
    scores.clear += 2;
    scores.glow += 1;
  }

  if (profile.acneLevel === "moderate") {
    scores.clear += 4;
  }

  if (profile.acneLevel === "severe") {
    scores.clear += 5;
  }

  if (profile.acneLevel === "none") {
    scores.glow += 3;
  }

  // Akne-Historie
  if (profile.acneHistory === "current") {
    scores.clear += 3;
  }

  if (profile.acneHistory === "past") {
    scores.barrier += 2;
    scores.glow += 1;
  }

  if (profile.acneHistory === "never") {
    scores.glow += 2;
  }

  // Hauptproblem
  if (profile.mainConcern === "blemishes") {
    scores.clear += 4;
  }

  if (profile.mainConcern === "dryness") {
    scores.barrier += 4;
  }

  if (profile.mainConcern === "redness") {
    scores.barrier += 3;
  }

  if (profile.mainConcern === "texture") {
    scores.glow += 3;
  }

  if (profile.mainConcern === "evenness") {
    scores.glow += 4;
  }

  // Hauttyp
  if (profile.skinType === "oily") {
    scores.clear += 3;
  }

  if (profile.skinType === "dry") {
    scores.barrier += 4;
  }

  if (profile.skinType === "combination") {
    scores.glow += 2;
    scores.clear += 1;
  }

  if (profile.skinType === "normal") {
    scores.glow += 3;
  }

  // Sensitivität
  if (profile.sensitive === "yes") {
    scores.barrier += 4;
    scores.clear -= 1;
  }

  if (profile.sensitive === "no") {
    scores.clear += 1;
    scores.glow += 1;
  }

  // Aufwand
  if (profile.effort === "minimal") {
    scores.clear += 1;
    scores.barrier += 1;
  }

  if (profile.effort === "medium") {
    scores.clear += 1;
    scores.barrier += 1;
    scores.glow += 1;
  }

  if (profile.effort === "full") {
    scores.glow += 2;
  }

  // Budget
  if (profile.budget === "low") {
    scores.clear += 1;
    scores.barrier += 1;
  }

  if (profile.budget === "high") {
    scores.glow += 1;
  }

  return scores;
}

function recommendRoutine(profile) {
  const scores = scoreRoutine(profile);

  let bestRoutine = "glow";
  let highestScore = scores.glow;

  Object.entries(scores).forEach(([routineId, score]) => {
    if (score > highestScore) {
      highestScore = score;
      bestRoutine = routineId;
    }
  });

  return {
    routineId: bestRoutine,
    routine: routines[bestRoutine],
    scores
  };
}

function joinReasons(reasons) {
  const cleaned = reasons.filter(Boolean);

  if (!cleaned.length) {
    return "deine Angaben insgesamt am besten zu dieser Routine passen";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length === 2) {
    return `${cleaned[0]} und ${cleaned[1]}`;
  }

  return `${cleaned.slice(0, -1).join(", ")} und ${cleaned[cleaned.length - 1]}`;
}

function getRecommendationReason(profile, routineId) {
  if (routineId === "clear") {
    return joinReasons([
      ["mild", "moderate", "severe"].includes(profile.acneLevel)
        ? "deine Haut aktuell sichtbare Unreinheiten zeigt"
        : "",
      profile.acneHistory === "current"
        ? "deine Haut aktuell häufiger zu Unreinheiten neigt"
        : "",
      profile.mainConcern === "blemishes"
        ? "dein Hauptziel weniger neue Pickel sind"
        : "",
      profile.skinType === "oily"
        ? "deine Haut eher ölig ist"
        : ""
    ]);
  }

  if (routineId === "barrier") {
    return joinReasons([
      profile.sensitive === "yes"
        ? "deine Haut schnell gereizt reagiert"
        : "",
      profile.skinType === "dry"
        ? "deine Haut eher trocken ist"
        : "",
      profile.mainConcern === "dryness"
        ? "du vor allem mehr Feuchtigkeit möchtest"
        : "",
      profile.mainConcern === "redness"
        ? "du deine Haut vor allem beruhigen möchtest"
        : "",
      profile.acneHistory === "past"
        ? "deine Haut in der Vergangenheit bereits belastet war"
        : ""
    ]);
  }

  return joinReasons([
    profile.acneLevel === "none"
      ? "deine Haut aktuell kaum Unreinheiten zeigt"
      : "",
    profile.mainConcern === "evenness"
      ? "du vor allem ein ebenmäßigeres Hautbild möchtest"
      : "",
    profile.mainConcern === "texture"
      ? "du eine ruhigere Hautstruktur möchtest"
      : "",
    ["normal", "combination"].includes(profile.skinType)
      ? "deine Haut eher ausgeglichen oder gemischt ist"
      : ""
  ]);
}

function formatProfileSummary(profile) {
  const acneLevelLabels = {
    none: "Kaum Unreinheiten",
    mild: "Leicht betroffen",
    moderate: "Mittel betroffen",
    severe: "Stärker betroffen"
  };

  const acneHistoryLabels = {
    never: "Nein",
    past: "Früher ja",
    current: "Ja, aktuell"
  };

  const mainConcernLabels = {
    blemishes: "Weniger neue Pickel",
    redness: "Weniger Rötungen",
    dryness: "Mehr Feuchtigkeit",
    texture: "Ruhigere Hautstruktur",
    evenness: "Ebenmäßigeres Hautbild"
  };

  const skinTypeLabels = {
    oily: "Eher ölig",
    dry: "Eher trocken",
    combination: "Mischhaut",
    normal: "Normal"
  };

  const sensitiveLabels = {
    yes: "Ja",
    no: "Nein"
  };

  const effortLabels = {
    minimal: "Minimal",
    medium: "Mittel",
    full: "Etwas ausführlicher"
  };

  const budgetLabels = {
    low: "Niedrig",
    mid: "Mittel",
    high: "Hoch"
  };

  return `
    <p><strong>Aktueller Hautzustand:</strong> ${acneLevelLabels[profile.acneLevel] || "-"}</p>
    <p><strong>Akne-Historie:</strong> ${acneHistoryLabels[profile.acneHistory] || "-"}</p>
    <p><strong>Hauptproblem:</strong> ${mainConcernLabels[profile.mainConcern] || "-"}</p>
    <p><strong>Hauttyp:</strong> ${skinTypeLabels[profile.skinType] || "-"}</p>
    <p><strong>Empfindlich:</strong> ${sensitiveLabels[profile.sensitive] || "-"}</p>
    <p><strong>Aufwand:</strong> ${effortLabels[profile.effort] || "-"}</p>
    <p><strong>Budget:</strong> ${budgetLabels[profile.budget] || "-"}</p>
  `;
}

function renderRecommendation() {
  const recommendation = recommendRoutine(state.onboarding);

  state.recommendation = recommendation;
  saveState();

  const reason = getRecommendationReason(state.onboarding, recommendation.routineId);

  document.getElementById("recommended-routine-name").textContent =
    recommendation.routine.name;
  document.getElementById("recommended-routine-badge").textContent =
    recommendation.routine.badge;
  document.getElementById("recommended-routine-description").textContent =
    recommendation.routine.description;
  document.getElementById("recommended-routine-reason").textContent =
    `Wir empfehlen dir diese Routine, weil ${reason}.`;
  document.getElementById("recommended-routine-steps").innerHTML =
    recommendation.routine.steps.map((step) => `<li>${step}</li>`).join("");
  document.getElementById("recommended-summary").innerHTML =
    formatProfileSummary(state.onboarding);
}

/* =========================
   UI HELPERS
========================= */
function updateSkinSketchSelection() {
  document.querySelectorAll(".skin-sketch-card").forEach((card) => {
    const input = card.querySelector('input[type="radio"]');
    if (!input) return;

    if (input.checked) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

function resetAllForms() {
  document.querySelectorAll("form").forEach((form) => form.reset());

  [
    "baseline-blemishes",
    "baseline-redness",
    "baseline-dryness",
    "checkin-blemishes",
    "checkin-redness",
    "checkin-dryness"
  ].forEach((id) => {
    const input = document.getElementById(id);
    const label = document.getElementById(`${id}-value`);
    if (input) input.value = 3;
    if (label) label.textContent = "3";
  });

  const noteEl = document.getElementById("checkin-note");
  const consistencyEl = document.getElementById("checkin-consistency");

  if (noteEl) noteEl.value = "";
  if (consistencyEl) consistencyEl.checked = true;

  updateSkinSketchSelection();
}

function resetEntireApp() {
  resetState();
  resetAllForms();
  selectedCalendarDayKey = null;
  showScreen("welcome-screen");
}

/* =========================
   ONBOARDING BINDINGS
========================= */
function bindOnboardingBackButtons() {
  const backButtons = [
    { id: "back-to-welcome-btn", target: "welcome-screen" },
    { id: "back-to-skin-sketch-btn", target: "skin-sketch-screen" },
    { id: "back-to-acne-history-btn", target: "acne-history-screen" },
    { id: "back-to-main-concern-btn", target: "main-concern-screen" },
    { id: "back-to-skin-type-btn", target: "skin-type-screen" },
    { id: "back-to-sensitive-btn", target: "sensitive-screen" },
    { id: "back-to-effort-btn", target: "effort-screen" }
  ];

  backButtons.forEach(({ id, target }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        showScreen(target);
      });
    }
  });
}

function bindOnboardingStep(formId, fieldName, currentScreenId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const selected = form.querySelector(`input[name="${fieldName}"]:checked`);
    if (!selected) return;

    state.onboarding[fieldName] = selected.value;
    saveState();

    
if (currentScreenId === "budget-screen") {
  showScreen("routine-mode-screen");
  return;
}


    const next = getNextOnboardingScreen(currentScreenId);
    if (next) {
      showScreen(next);
    }
  });
}

function bindOnboarding() {
 const startBtn = document.getElementById("start-btn");
if (startBtn) {
  startBtn.addEventListener("click", () => {
    const firstIncomplete = getFirstIncompleteOnboardingScreen();

    if (firstIncomplete) {
      showScreen(firstIncomplete);
    } else {
      showScreen("skin-sketch-screen");
    }
  });
}

  bindOnboardingBackButtons();

  bindOnboardingStep("skin-sketch-form", "acneLevel", "skin-sketch-screen");
  bindOnboardingStep("acne-history-form", "acneHistory", "acne-history-screen");
  bindOnboardingStep("main-concern-form", "mainConcern", "main-concern-screen");
  bindOnboardingStep("skin-type-form", "skinType", "skin-type-screen");
  bindOnboardingStep("sensitive-form", "sensitive", "sensitive-screen");
  bindOnboardingStep("effort-form", "effort", "effort-screen");
  bindOnboardingStep("budget-form", "budget", "budget-screen");
  const backToBudgetBtn = document.getElementById("back-to-budget-btn");
if (backToBudgetBtn) {
  backToBudgetBtn.addEventListener("click", () => {
    showScreen("budget-screen");
  });
}

const backToRoutineModeFromCustomBtn = document.getElementById("back-to-routine-mode-from-custom-btn");
if (backToRoutineModeFromCustomBtn) {
  backToRoutineModeFromCustomBtn.addEventListener("click", () => {
    showScreen("routine-mode-screen");
  });
}

const backToRoutineModeBtn = document.getElementById("back-to-routine-mode-btn");
if (backToRoutineModeBtn) {
  backToRoutineModeBtn.addEventListener("click", () => {
    showScreen("routine-mode-screen");
  });
}

const routineModeForm = document.getElementById("routine-mode-form");
if (routineModeForm) {
  routineModeForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const selected = routineModeForm.querySelector('input[name="routineMode"]:checked');
    if (!selected) return;

    state.routineMode = selected.value;
    saveState();

    if (selected.value === "recommended") {
      renderRecommendation();
      showScreen("recommendation-screen");
    } else {
      showScreen("custom-routine-screen");
    }
  });
}

const customRoutineForm = document.getElementById("custom-routine-form");
if (customRoutineForm) {
  customRoutineForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const products = [
      customRoutineForm.product1.value.trim(),
      customRoutineForm.product2.value.trim(),
      customRoutineForm.product3.value.trim(),
      customRoutineForm.product4.value.trim(),
      customRoutineForm.product5.value.trim()
    ].filter(Boolean);

    if (!products.length) {
      alert("Bitte gib mindestens ein Produkt ein.");
      return;
    }

    state.routineMode = "custom";
    state.customRoutine = products;
    state.activeRoutine = null;
    saveState();

    showScreen("baseline-screen");
  });
}

  document.querySelectorAll('.skin-sketch-card input[type="radio"]').forEach((input) => {
    input.addEventListener("change", updateSkinSketchSelection);
  });

  const recommendationRestartBtn = document.getElementById("recommendation-restart-btn");
  if (recommendationRestartBtn) {
    recommendationRestartBtn.addEventListener("click", () => {
      resetEntireApp();
    });
  }

  const acceptRoutineBtn = document.getElementById("accept-routine-btn");
  if (acceptRoutineBtn) {
    acceptRoutineBtn.addEventListener("click", () => {
      if (!state.recommendation) {
        renderRecommendation();
      }

      
state.routineMode = "recommended";
state.customRoutine = [];
state.activeRoutine = state.recommendation.routineId;
saveState();
showScreen("baseline-screen");

    });
  }
}

/* =========================
   BASELINE
========================= */
function bindRangeLabel(inputId) {
  const input = document.getElementById(inputId);
  const valueEl = document.getElementById(`${inputId}-value`);

  if (!input || !valueEl) return;

  valueEl.textContent = input.value;

  input.addEventListener("input", () => {
    valueEl.textContent = input.value;
  });
}

function bindBaseline() {
  bindRangeLabel("baseline-blemishes");
  bindRangeLabel("baseline-redness");
  bindRangeLabel("baseline-dryness");

  const backBtn = document.getElementById("back-to-recommendation-btn");
  if (backBtn) {
   
backBtn.addEventListener("click", () => {
  if (state.routineMode === "custom") {
    showScreen("custom-routine-screen");
  } else {
    renderRecommendation();
    showScreen("recommendation-screen");
  }
});

  }

  const form = document.getElementById("baseline-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    state.baseline = {
      blemishes: Number(document.getElementById("baseline-blemishes").value),
      redness: Number(document.getElementById("baseline-redness").value),
      dryness: Number(document.getElementById("baseline-dryness").value)
    };

    state.startDate = new Date().toISOString();
    state.checkins = [];
    saveState();

    renderDashboard();
    showScreen("dashboard-screen");
  });
}

/* =========================
   DASHBOARD / CHECK-IN
========================= */
function getDaysSinceStart() {
  if (!state.startDate) return 0;

  const start = new Date(state.startDate);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diff = today.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getLocalDayKey(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dateObj) {
  return dateObj.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit"
  });
}

function getCheckinByDayKey(dayKey) {
  return state.checkins.find((item) => item.dayKey === dayKey);
}

function renderCalendarDetail(dayKey) {
  const detailEl = document.getElementById("calendar-detail");
  if (!detailEl || !state.startDate) return;

  const start = new Date(state.startDate);
  start.setHours(0, 0, 0, 0);

  const date = parseDayKey(dayKey);
  date.setHours(0, 0, 0, 0);

  const dayIndex =
    Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkin = getCheckinByDayKey(dayKey);

  if (date > today) {
    detailEl.innerHTML = `
      <p><strong>${formatDate(date.toISOString())}</strong> · Tag ${dayIndex}</p>
      <p>Dieser Tag liegt noch in der Zukunft.</p>
    `;
    return;
  }

  if (!checkin) {
    detailEl.innerHTML = `
      <p><strong>${formatDate(date.toISOString())}</strong> · Tag ${dayIndex}</p>
      <p>Für diesen Tag wurde noch kein Check-in gespeichert.</p>
    `;
    return;
  }

  detailEl.innerHTML = `
    <p><strong>${formatDate(checkin.date)}</strong> · Tag ${dayIndex}</p>
    ${
      checkin.photo
        ? `
          <div class="calendar-detail-photo-wrap">
            ${checkin.photo}
          </div>
        `
        : ``
    }
    <p>Unreinheiten: ${checkin.blemishes}</p>
    <p>Rötungen: ${checkin.redness}</p>
    <p>Trockenheit: ${checkin.dryness}</p>
    <p>Routine durchgeführt: ${checkin.consistency ? "Ja" : "Nein"}</p>
    ${
      checkin.note
        ? `<p>Notiz: ${checkin.note}</p>`
        : `<p>Keine Notiz gespeichert.</p>`
    }
  `;
}

function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const detailEl = document.getElementById("calendar-detail");
  const rangeEl = document.getElementById("calendar-range-label");

  if (!gridEl || !detailEl || !rangeEl || !state.startDate) return;

  const start = new Date(state.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 29);

  rangeEl.textContent = `${formatShortDate(start)} – ${formatShortDate(end)}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startWeekday = (start.getDay() + 6) % 7; // Mo=0, So=6
  const cells = [];

  // Leere Felder vor dem ersten Tag, damit es wie ein klassischer Kalender startet
  for (let i = 0; i < startWeekday; i++) {
    cells.push(`<div class="calendar-empty"></div>`);
  }

  for (let i = 0; i < 30; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    current.setHours(0, 0, 0, 0);

    const dayKey = getLocalDayKey(current);
    const isToday = dayKey === getLocalDayKey(today);
    const hasCheckin = !!getCheckinByDayKey(dayKey);
    const isFuture = current > today;
    const isPastWithoutCheckin = current < today && !hasCheckin;

    const classes = ["calendar-day"];
    if (hasCheckin) classes.push("done");
    if (isToday) classes.push("today");
    if (isFuture) classes.push("future");
    if (isPastWithoutCheckin) classes.push("missed");
    if (selectedCalendarDayKey === dayKey) classes.push("selected");

    cells.push(`
      <button type="button" class="${classes.join(" ")}" data-day-key="${dayKey}">
        <span class="calendar-day-number">${current.getDate()}</span>
        <span class="calendar-day-subtext">${formatShortDate(current)}</span>
        ${hasCheckin ? `<span class="calendar-dot"></span>` : ``}
      </button>
    `);
  }

  gridEl.innerHTML = cells.join("");

  if (!selectedCalendarDayKey) {
    selectedCalendarDayKey = getLocalDayKey(today);
  }

  const selectedDate = parseDayKey(selectedCalendarDayKey);
  const minDate = new Date(start);
  const maxDate = new Date(end);

  if (selectedDate < minDate || selectedDate > maxDate) {
    selectedCalendarDayKey = getLocalDayKey(today);
  }

  const dayButtons = gridEl.querySelectorAll(".calendar-day");
  dayButtons.forEach((button) => {
    const dayKey = button.dataset.dayKey;
    const dayDate = parseDayKey(dayKey);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate > today) {
      button.disabled = true;
      return;
    }

    button.addEventListener("click", () => {
      selectedCalendarDayKey = dayKey;
      renderCalendar();
      renderCalendarDetail(dayKey);
    });
  });

  renderCalendarDetail(selectedCalendarDayKey);
}


function upsertTodayCheckin(checkinData) {
  const todayKey = getLocalDayKey();

  const payload = {
    dayKey: todayKey,
    date: new Date().toISOString(),
    ...checkinData
  };

  const existingIndex = state.checkins.findIndex((item) => item.dayKey === todayKey);

  if (existingIndex >= 0) {
    state.checkins[existingIndex] = payload;
  } else {
    state.checkins.push(payload);
  }

  saveState();
}

function renderHistory() {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

  if (!state.checkins.length) {
    historyList.innerHTML = `<li class="small-note">Noch keine Check-ins gespeichert.</li>`;
    return;
  }

  const sorted = [...state.checkins].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  historyList.innerHTML = sorted
    .map((item) => {
      return `
        <li>
          <strong>${formatDate(item.date)}</strong><br>
          Unreinheiten: ${item.blemishes} • Rötungen: ${item.redness} • Trockenheit: ${item.dryness}<br>
          Routine gemacht: ${item.consistency ? "Ja" : "Nein"}
          ${item.note ? `<br><span class="small-note">${item.note}</span>` : ""}
        </li>
      `;
    })
    .join("");
}

function setCheckinInputValue(id, value) {
  const input = document.getElementById(id);
  const label = document.getElementById(`${id}-value`);

  if (input) input.value = value;
  if (label) label.textContent = value;
}
function setCheckinPhotoPreview(photoDataUrl) {
  const previewEl = document.getElementById("checkin-photo-preview");
  const placeholderEl = document.getElementById("checkin-photo-placeholder");
  const removeBtn = document.getElementById("checkin-photo-remove-btn");

  currentCheckinPhoto = photoDataUrl || null;

  if (previewEl) {
    if (photoDataUrl) {
      previewEl.src = photoDataUrl;
      previewEl.classList.remove("hidden");
    } else {
      previewEl.src = "";
      previewEl.classList.add("hidden");
    }
  }

  if (placeholderEl) {
    if (photoDataUrl) {
      placeholderEl.classList.add("hidden");
    } else {
      placeholderEl.classList.remove("hidden");
    }
  }

  if (removeBtn) {
    if (photoDataUrl) {
      removeBtn.classList.remove("hidden");
    } else {
      removeBtn.classList.add("hidden");
    }
  }
}

function clearCheckinPhotoPreview() {
  setCheckinPhotoPreview(null);
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 900;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}

function prefillTodayCheckin() {
  const todayKey = getLocalDayKey();
  const todayCheckin = state.checkins.find((item) => item.dayKey === todayKey);

  const consistencyEl = document.getElementById("checkin-consistency");
  const noteEl = document.getElementById("checkin-note");

  if (todayCheckin) {
    setCheckinInputValue("checkin-blemishes", todayCheckin.blemishes);
    setCheckinInputValue("checkin-redness", todayCheckin.redness);
    setCheckinInputValue("checkin-dryness", todayCheckin.dryness);

    if (consistencyEl) consistencyEl.checked = todayCheckin.consistency;
    if (noteEl) noteEl.value = todayCheckin.note || "";

    if (todayCheckin.photo) {
      setCheckinPhotoPreview(todayCheckin.photo);
    } else {
      clearCheckinPhotoPreview();
    }
    return;
  }

  if (state.baseline) {
    setCheckinInputValue("checkin-blemishes", state.baseline.blemishes);
    setCheckinInputValue("checkin-redness", state.baseline.redness);
    setCheckinInputValue("checkin-dryness", state.baseline.dryness);

    if (consistencyEl) consistencyEl.checked = true;
    if (noteEl) noteEl.value = "";
  }

  clearCheckinPhotoPreview();
}

function renderDashboard() {
  let routineName = "";
  let routineDescription = "";
  let steps = [];
  let tag = "Aktiv";

  if (state.routineMode === "custom") {
    routineName = "Eigene Routine";
    routineDescription = "Du trackst die Produkte, die du aktuell selbst verwendest.";
    steps = (state.customRoutine || []).filter(Boolean);
    tag = "Custom";
  } else {
    if (!state.activeRoutine) return;

    const routine = routines[state.activeRoutine];
    if (!routine) return;

    routineName = routine.name;
    routineDescription = routine.description;
    steps = routine.steps;
    tag = "Aktiv";
  }

  const days = getDaysSinceStart();
  const clampedDays = Math.max(days, 1);
  const progress = Math.min((clampedDays / 30) * 100, 100);

  
document.getElementById("dashboard-routine-name").textContent = routineName;
document.getElementById("dashboard-routine-tag").textContent = tag;
document.getElementById("dashboard-routine-description").textContent =
  routineDescription;


  document.getElementById("current-day").textContent = `Tag ${clampedDays}`;
  document.getElementById("checkin-count").textContent = state.checkins.length;
  document.getElementById("progress-bar").style.width = `${progress}%`;

  document.getElementById("progress-text").textContent =
    clampedDays >= 30
      ? "Deine 30 Tage sind abgeschlossen. Du kannst jetzt dein Ergebnis ansehen."
      : `Noch ${30 - clampedDays} Tage bis zum Ergebnis`;

 
document.getElementById("dashboard-steps").innerHTML = steps
  .map((step) => `<li>${step}</li>`)
  .join("");


  
renderHistory();
prefillTodayCheckin();
renderCalendar();

}

function bindDashboard() {
  bindRangeLabel("checkin-blemishes");
  bindRangeLabel("checkin-redness");
  bindRangeLabel("checkin-dryness");

  const photoInput = document.getElementById("checkin-photo-input");
  const photoBtn = document.getElementById("checkin-photo-btn");
  const removePhotoBtn = document.getElementById("checkin-photo-remove-btn");

  if (photoBtn && photoInput) {
    photoBtn.addEventListener("click", () => {
      photoInput.click();
    });
  }

  if (photoInput) {
    photoInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        const photoDataUrl = await compressImageFile(file);
        setCheckinPhotoPreview(photoDataUrl);
      } catch (error) {
        console.error("Photo error:", error);
        alert("Foto konnte nicht geladen werden.");
      }

      photoInput.value = "";
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", () => {
      clearCheckinPhotoPreview();
    });
  }

  const form = document.getElementById("checkin-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      upsertTodayCheckin({
        blemishes: Number(document.getElementById("checkin-blemishes").value),
        redness: Number(document.getElementById("checkin-redness").value),
        dryness: Number(document.getElementById("checkin-dryness").value),
        consistency: document.getElementById("checkin-consistency").checked,
        note: document.getElementById("checkin-note").value.trim(),
        photo: currentCheckinPhoto
      });

      renderDashboard();
      alert("Check-in gespeichert");
    });
  }

  const openResultsBtn = document.getElementById("open-results-btn");
  if (openResultsBtn) {
    openResultsBtn.addEventListener("click", () => {
      renderResults();
      showScreen("results-screen");
    });
  }
  const openCheckinBtn = document.getElementById("open-checkin-btn");
  if (openCheckinBtn) {
    openCheckinBtn.addEventListener("click", () => {
      prefillTodayCheckin();
      showScreen("daily-checkin-screen");
    });
  }

  const openCalendarBtn = document.getElementById("open-calendar-btn");
  if (openCalendarBtn) {
    openCalendarBtn.addEventListener("click", () => {
      renderCalendar();
      showScreen("calendar-screen");
    });
  }

  const demoBtn = document.getElementById("demo-btn");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      if (!state.startDate || !state.baseline) return;

      const simulatedStart = new Date();
      simulatedStart.setDate(simulatedStart.getDate() - 29);
      state.startDate = simulatedStart.toISOString();

      if (state.checkins.length === 0) {
        upsertTodayCheckin({
          blemishes: Math.max(1, state.baseline.blemishes - 1),
          redness: Math.max(1, state.baseline.redness - 1),
          dryness: Math.max(1, state.baseline.dryness - 1),
          consistency: true,
          note: "Demo-Check-in erstellt"
        });
      } else {
        saveState();
      }

      renderDashboard();
      alert("Demo aktiviert: Startdatum wurde auf 30 Tage gesetzt.");
    });
  }

  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const confirmed = confirm("Willst du wirklich alle Daten zurücksetzen?");
      if (confirmed) {
        resetEntireApp();
      }
    });
  }
}

/* =========================
   RESULTS
========================= */
function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function getConcernLabel(concern) {
  const map = {
    blemishes: "weniger neue Pickel",
    redness: "weniger Rötungen",
    dryness: "mehr Feuchtigkeit",
    texture: "ruhigere Hautstruktur",
    evenness: "ein ebenmäßigeres Hautbild"
  };

  return map[concern] || "dein Hautziel";
}


function renderResults() {
  if (!state.baseline) return;


  const baseline = state.baseline;

  const latest =
    state.checkins.length > 0
      ? [...state.checkins].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : {
          blemishes: baseline.blemishes,
          redness: baseline.redness,
          dryness: baseline.dryness,
          consistency: false
        };

  const baselineAvg = average([
    baseline.blemishes,
    baseline.redness,
    baseline.dryness
  ]);

  const currentAvg = average([
    latest.blemishes,
    latest.redness,
    latest.dryness
  ]);

  let improvementPercent = 0;
  if (baselineAvg > 0) {
    improvementPercent = Math.round(
      ((baselineAvg - currentAvg) / baselineAvg) * 100
    );
  }

  const days = getDaysSinceStart();
  const adherence = days > 0 ? Math.round((state.checkins.length / days) * 100) : 0;

  let headline = "Deine Haut entwickelt sich stabil";
  if (improvementPercent >= 20) {
    headline = "Starke Verbesserung in deiner 30-Tage-Routine";
  } else if (improvementPercent > 0) {
    headline = "Leichte Verbesserung sichtbar";
  } else if (improvementPercent < 0) {
    headline = "Noch keine klare Verbesserung sichtbar";
  }

  const unfinishedText =
    days < 30
      ? "Hinweis: Das ist aktuell nur eine Vorschau, weil die 30 Tage noch nicht vollständig vorbei sind."
      : "Deine 30 Tage sind abgeschlossen. Das ist dein aktuelles Ergebnis.";

  const focusLabel = getConcernLabel(state.onboarding.mainConcern);

  const routineLabel =
    state.routineMode === "custom"
      ? "Eigene Routine"
      : routines[state.activeRoutine].name;

  const routineDescriptionLabel =
    state.routineMode === "custom"
      ? `${(state.customRoutine || []).filter(Boolean).length} Produkte getrackt`
      : routines[state.activeRoutine].description;

  document.getElementById("result-headline").textContent = headline;
  document.getElementById("result-summary").textContent =
    `${unfinishedText} Dein Fokus war: ${focusLabel}. Gesamtveränderung: ${improvementPercent}% im Vergleich zum Startstatus.`;

 document.getElementById("result-cards").innerHTML = `
    <div class="result-card">
      <span class="small-note">Gesamtveränderung</span>
      <strong>${improvementPercent}%</strong>
      <span class="small-note">Positiver Wert = Verbesserung</span>
    </div>

    <div class="result-card">
      <span class="small-note">Check-in-Quote</span>
      <strong>${adherence}%</strong>
      <span class="small-note">${state.checkins.length} Check-ins in ${Math.max(days, 1)} Tagen</span>
    </div>

    <div class="result-card">
      <span class="small-note">Unreinheiten</span>
      <strong>${baseline.blemishes} → ${latest.blemishes}</strong>
      <span class="small-note">Start vs. aktuell</span>
    </div>

    <div class="result-card">
      <span class="small-note">Rötungen</span>
      <strong>${baseline.redness} → ${latest.redness}</strong>
      <span class="small-note">Start vs. aktuell</span>
    </div>

    <div class="result-card">
      <span class="small-note">Trockenheit</span>
      <strong>${baseline.dryness} → ${latest.dryness}</strong>
      <span class="small-note">Start vs. aktuell</span>
    </div>

    <div class="result-card">
      <span class="small-note">Aktive Routine</span>
      <strong>${routineLabel}</strong>
      <span class="small-note">${routineDescriptionLabel}</span>
    </div>
  `;
}

function bindResults() {
  const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener("click", () => {
      renderDashboard();
      showScreen("dashboard-screen");
    });
  }

  const resultsRestartBtn = document.getElementById("results-restart-btn");
  if (resultsRestartBtn) {
    resultsRestartBtn.addEventListener("click", () => {
      resetEntireApp();
    });
  }
}

/* =========================
   RESTORE / RESUME
========================= */
function restoreOnboardingSelections() {
  onboardingFlow.forEach(({ field, screen }) => {
    const form = document.querySelector(`#${screen} form`);
    if (!form || !state.onboarding[field]) return;

    const input = form.querySelector(
      `input[name="${field}"][value="${state.onboarding[field]}"]`
    );

    if (input) {
      input.checked = true;
    }
  });

  updateSkinSketchSelection();
  if (state.routineMode) {
  const modeInput = document.querySelector(
    `#routine-mode-form input[name="routineMode"][value="${state.routineMode}"]`
  );
  if (modeInput) {
    modeInput.checked = true;
  }
}

const customRoutineForm = document.getElementById("custom-routine-form");
if (customRoutineForm && Array.isArray(state.customRoutine)) {
  const names = ["product1", "product2", "product3", "product4", "product5"];

  names.forEach((name, index) => {
    if (customRoutineForm[name]) {
      customRoutineForm[name].value = state.customRoutine[index] || "";
    }
  });
}
}

function getFirstIncompleteOnboardingScreen() {
  for (const step of onboardingFlow) {
    if (!state.onboarding[step.field]) {
      return step.screen;
    }
  }
  return null;
}

function restoreApp() {
  restoreOnboardingSelections();

 if (state.baseline && state.startDate && (state.routineMode === "custom" || state.activeRoutine)) {
  renderDashboard();
  showScreen("dashboard-screen");
  return;
}

const onboardingComplete = onboardingFlow.every(
  (step) => !!state.onboarding[step.field]
);

if (onboardingComplete) {
  if (state.routineMode === "custom" && (state.customRoutine || []).length) {
    showScreen("custom-routine-screen");
  } else if (state.routineMode === "recommended") {
    renderRecommendation();
    showScreen("recommendation-screen");
  } else {
    showScreen("routine-mode-screen");
  }
  return;

  }

  const firstIncomplete = getFirstIncompleteOnboardingScreen();
  if (firstIncomplete) {
    showScreen(firstIncomplete);
    return;
  }

  showScreen("welcome-screen");
}

/* =========================
   INIT
========================= */
function initApp() {
  bindOnboarding();
  bindBaseline();
  bindDashboard();
  bindResults();
  bindBottomNav();
  restoreApp();

  // Loader -> danach App anzeigen
  setTimeout(() => {
    const loader = document.getElementById("loader");
    const appShell = document.getElementById("app-shell");

    if (loader) loader.classList.add("hidden");
    if (appShell) appShell.classList.remove("hidden");
  }, 2200);
}

window.addEventListener("DOMContentLoaded", initApp);


