const bootstrap = window.__BOOTSTRAP__ || {};
const MIN_BOOKING_MINUTES = Number(bootstrap.minBookingMinutes || 30);
const BOOKING_TIME_STEP_MINUTES = 30;
const DEFAULT_BOOKING_MINUTES = Math.max(
  MIN_BOOKING_MINUTES,
  BOOKING_TIME_STEP_MINUTES,
);

let bookingDurationMinutes = DEFAULT_BOOKING_MINUTES;

const state = {
  user: bootstrap.user || null,
  studentIdHint: bootstrap.studentIdHint || "0БИН00000",
  spots: [],
  bookings: [],
  rules: [],
  selectedSpotId: null,
  activeLofiTrackId: null,
  library: {
    folder: "all",
    query: "",
  },
  pomodoro: {
    mode: "focus",
    secondsLeft: 25 * 60,
    timerId: null,
  },
};

const AUTH_REDIRECT_KEY = "coworking_auth_redirect_at";
const THEME_OPTIONS = ["light", "gray", "black", "blue", "green", "purple"];
const DEFAULT_THEME = "gray";

const dom = {
  toast: document.getElementById("toast"),
  logoutBtn: document.getElementById("logout-btn"),
  themeSelect: document.getElementById("theme-select"),
  avatarPicker: document.getElementById("avatar-picker"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileName: document.getElementById("profile-name"),
  profileNickname: document.getElementById("profile-nickname"),
  profileStudent: document.getElementById("profile-student"),
  avatarFile: document.getElementById("avatar-file"),
  totalBookings: document.getElementById("total-bookings"),
  totalHours: document.getElementById("total-hours"),
  spotsGrid: document.getElementById("spots-grid"),
  bookingSpot: document.getElementById("booking-spot"),
  bookingStart: document.getElementById("booking-start"),
  bookingEnd: document.getElementById("booking-end"),
  bookingForm: document.getElementById("booking-form"),
  snacksList: document.getElementById("snacks-list"),
  rulesList: document.getElementById("rules-list"),
  bookingsBody: document.getElementById("bookings-body"),
  pomodoroTime: document.getElementById("pomodoro-time"),
  pomodoroState: document.getElementById("pomodoro-state"),
  pomodoroIndicator: document.getElementById("pomodoro-indicator"),
  pomodoroStart: document.getElementById("pomodoro-start"),
  pomodoroPause: document.getElementById("pomodoro-pause"),
  pomodoroReset: document.getElementById("pomodoro-reset"),
  lofiFrame: document.getElementById("lofi-frame"),
  lofiList: document.getElementById("lofi-list"),
  lofiNowPlaying: document.getElementById("lofi-now-playing"),
  rulesModal: document.getElementById("rules-modal"),
  rulesModalList: document.getElementById("rules-modal-list"),
  rulesAcceptBtn: document.getElementById("rules-accept-btn"),
  contentTabs: Array.from(document.querySelectorAll(".content-tab")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  librarySearch: document.getElementById("library-search"),
  libraryCount: document.getElementById("library-count"),
  libraryGrid: document.getElementById("library-grid"),
  libraryFolders: Array.from(document.querySelectorAll(".library-folder")),
  libraryFolderCounts: Array.from(document.querySelectorAll(".folder-count")),
};

const LOFI_TRACKS = [
  {
    id: "lofi-girl",
    title: "Lofi Girl - Study Beats",
    subtitle: "Классический live-поток",
    src: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk",
  },
  {
    id: "chillhop",
    title: "Chillhop Essentials",
    subtitle: "Мягкий бит для концентрации",
    src: "https://www.youtube-nocookie.com/embed/HuFYqnbVbzY",
  },
  {
    id: "jazzhop",
    title: "Jazzhop Focus Mix",
    subtitle: "Спокойный джаз + lofi",
    src: "https://www.youtube-nocookie.com/embed/Na0w3Mz46GA",
  },
  {
    id: "night-study",
    title: "Night Study Lofi",
    subtitle: "Поздние сессии без отвлечений",
    src: "https://www.youtube-nocookie.com/embed/DWcJFNfaw9c",
  },
  {
    id: "ambient-focus",
    title: "Ambient Focus Radio",
    subtitle: "Атмосферный поток для чтения",
    src: "https://www.youtube-nocookie.com/embed/7NOSDKb0HlU",
  },
];

const LIBRARY_ITEMS = [
  {
    id: "math-1",
    folder: "math",
    title: "Линейная алгебра: краткий курс",
    type: "Учебник PDF",
    level: "1 курс",
    updated: "12.02.2026",
    cover: "cover-1",
  },
  {
    id: "math-2",
    folder: "math",
    title: "Теория вероятностей",
    type: "Сборник задач",
    level: "2 курс",
    updated: "03.02.2026",
    cover: "cover-3",
  },
  {
    id: "math-3",
    folder: "math",
    title: "Дифференциальные уравнения",
    type: "Практикум",
    level: "2 курс",
    updated: "25.01.2026",
    cover: "cover-4",
  },
  {
    id: "cs-1",
    folder: "cs",
    title: "Python Core",
    type: "Конспект",
    level: "1 курс",
    updated: "11.02.2026",
    cover: "cover-2",
  },
  {
    id: "cs-2",
    folder: "cs",
    title: "Алгоритмы и структуры данных",
    type: "Лекции",
    level: "2 курс",
    updated: "05.02.2026",
    cover: "cover-6",
  },
  {
    id: "cs-3",
    folder: "cs",
    title: "Базы данных SQL",
    type: "Лабораторные",
    level: "2 курс",
    updated: "31.01.2026",
    cover: "cover-2",
  },
  {
    id: "cs-4",
    folder: "cs",
    title: "Компьютерные сети",
    type: "Шпаргалка",
    level: "3 курс",
    updated: "19.01.2026",
    cover: "cover-5",
  },
  {
    id: "eng-1",
    folder: "eng",
    title: "Материаловедение",
    type: "Учебное пособие",
    level: "2 курс",
    updated: "08.02.2026",
    cover: "cover-4",
  },
  {
    id: "eng-2",
    folder: "eng",
    title: "САПР: быстрый старт",
    type: "Методичка",
    level: "3 курс",
    updated: "30.01.2026",
    cover: "cover-6",
  },
  {
    id: "eng-3",
    folder: "eng",
    title: "Электротехника",
    type: "Сборник практик",
    level: "1 курс",
    updated: "14.01.2026",
    cover: "cover-1",
  },
  {
    id: "eco-1",
    folder: "eco",
    title: "Микроэкономика",
    type: "Учебник",
    level: "1 курс",
    updated: "09.02.2026",
    cover: "cover-4",
  },
  {
    id: "eco-2",
    folder: "eco",
    title: "Финансовый анализ",
    type: "Практика",
    level: "3 курс",
    updated: "02.02.2026",
    cover: "cover-3",
  },
  {
    id: "lang-1",
    folder: "lang",
    title: "Academic English",
    type: "Сборник",
    level: "1 курс",
    updated: "10.02.2026",
    cover: "cover-5",
  },
  {
    id: "lang-2",
    folder: "lang",
    title: "Технический английский",
    type: "Словарь терминов",
    level: "2 курс",
    updated: "01.02.2026",
    cover: "cover-1",
  },
  {
    id: "lang-3",
    folder: "lang",
    title: "Подготовка презентаций",
    type: "Гайд",
    level: "Любой курс",
    updated: "15.01.2026",
    cover: "cover-5",
  },
];

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUserInitial(user) {
  const safeUser = user || {};
  const source = (safeUser.first_name || safeUser.nickname || "?").trim();
  return source ? source[0].toUpperCase() : "?";
}

function buildInitialAvatar(letter) {
  const safeLetter = String(letter || "?")
    .slice(0, 1)
    .toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#232323"/>
          <stop offset="100%" stop-color="#0f0f0f"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill="url(#g)"/>
      <text x="50%" y="54%" text-anchor="middle" fill="#f4f4f4"
        font-family="Space Grotesk, Arial, sans-serif" font-size="58"
        font-weight="700">${safeLetter}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function setButtonLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
}

function safeGetSessionItem(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (_err) {
    return null;
  }
}

function safeSetSessionItem(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (_err) {
    // Ignore storage limitations/privacy mode.
  }
}

function safeRemoveSessionItem(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch (_err) {
    // Ignore storage limitations/privacy mode.
  }
}

function redirectToAuthOnce() {
  const now = Date.now();
  const lastRedirect = Number(safeGetSessionItem(AUTH_REDIRECT_KEY) || 0);
  if (now - lastRedirect < 1500) return;
  safeSetSessionItem(AUTH_REDIRECT_KEY, String(now));
  window.location.replace("/auth");
}

async function api(path, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
  };
  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, config);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    redirectToAuthOnce();
    throw new Error("Требуется авторизация.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Произошла ошибка.");
  }

  return data;
}

async function apiUpload(path, formData) {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    redirectToAuthOnce();
    throw new Error("Требуется авторизация.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Ошибка загрузки.");
  }

  return data;
}

function showToast(message, isError = false) {
  if (!dom.toast) return;
  dom.toast.hidden = false;
  dom.toast.textContent = message;
  dom.toast.style.borderColor = isError ? "#c44" : "";
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    dom.toast.hidden = true;
    dom.toast.style.borderColor = "";
  }, 2800);
}

function formatDateTime(raw) {
  const date = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setDefaultBookingWindow() {
  const now = new Date();
  const roundedStart =
    snapDateToStep(now, BOOKING_TIME_STEP_MINUTES, "ceil") || now;
  bookingDurationMinutes = DEFAULT_BOOKING_MINUTES;
  const end = new Date(
    roundedStart.getTime() + bookingDurationMinutes * 60 * 1000,
  );
  dom.bookingStart.value = toLocalDateTimeInput(roundedStart);
  dom.bookingEnd.value = toLocalDateTimeInput(end);
  updateBookingEndMin(true);
}

function toLocalDateTimeInput(date) {
  const pad = (v) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function snapDateToStep(date, stepMinutes, mode = "ceil") {
  const time = date.getTime();
  if (Number.isNaN(time) || stepMinutes <= 0) return null;
  const stepMs = stepMinutes * 60 * 1000;
  let snapped;
  if (mode === "floor") {
    snapped = Math.floor(time / stepMs) * stepMs;
  } else if (mode === "round") {
    snapped = Math.round(time / stepMs) * stepMs;
  } else {
    snapped = Math.ceil(time / stepMs) * stepMs;
  }
  return new Date(snapped);
}

function normalizeDurationMinutes(minutes) {
  const safe = Number.isFinite(minutes) ? minutes : DEFAULT_BOOKING_MINUTES;
  const snapped =
    Math.ceil(safe / BOOKING_TIME_STEP_MINUTES) * BOOKING_TIME_STEP_MINUTES;
  return Math.max(MIN_BOOKING_MINUTES, snapped || DEFAULT_BOOKING_MINUTES);
}

function updateBookingDurationFromInputs() {
  if (!dom.bookingStart || !dom.bookingEnd) return;
  const start = new Date(dom.bookingStart.value);
  const end = new Date(dom.bookingEnd.value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  bookingDurationMinutes = normalizeDurationMinutes(diffMinutes);
}

function getMinBookingEndDate() {
  if (!dom.bookingStart) return null;
  const start = new Date(dom.bookingStart.value);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + MIN_BOOKING_MINUTES * 60 * 1000);
}

function updateBookingEndMin(adjustValue) {
  if (!dom.bookingEnd) return;
  const minEnd = getMinBookingEndDate();
  if (!minEnd) return;
  dom.bookingEnd.min = toLocalDateTimeInput(minEnd);
  if (!adjustValue) return;
  const end = new Date(dom.bookingEnd.value);
  if (Number.isNaN(end.getTime()) || end < minEnd) {
    dom.bookingEnd.value = toLocalDateTimeInput(minEnd);
  }
}

function applyTheme(theme) {
  const safeTheme = THEME_OPTIONS.includes(theme) ? theme : DEFAULT_THEME;
  document.body.dataset.theme = safeTheme;
  if (dom.themeSelect) {
    dom.themeSelect.value = safeTheme;
  }
  return safeTheme;
}

function renderUser() {
  if (!state.user) return;

  const fallbackAvatar = buildInitialAvatar(getUserInitial(state.user));
  dom.profileAvatar.onerror = () => {
    dom.profileAvatar.src = fallbackAvatar;
  };
  dom.profileAvatar.src = state.user.avatar_url || fallbackAvatar;
  dom.profileName.textContent = `${state.user.first_name} ${state.user.last_name}`;
  dom.profileNickname.textContent = `Ник: @${state.user.nickname}`;
  dom.profileStudent.textContent = `Студбилет: ${state.user.student_id}`;
  state.user.theme = applyTheme(state.user.theme || DEFAULT_THEME);
}

function renderSpots() {
  const selectedId = Number(state.selectedSpotId || dom.bookingSpot.value || 0);
  const favoriteId = Number((state.user && state.user.favorite_spot_id) || 0);

  if (!state.spots.length) {
    dom.spotsGrid.innerHTML = '<p class="subtle">Споты пока не загружены.</p>';
    dom.bookingSpot.innerHTML =
      '<option value="">Нет доступных спотов</option>';
    state.selectedSpotId = null;
    return;
  }

  const hasSelected = state.spots.some((spot) => spot.id === selectedId);
  const activeSelectedId = hasSelected ? selectedId : state.spots[0].id;
  state.selectedSpotId = activeSelectedId;

  dom.spotsGrid.innerHTML = state.spots
    .map((spot) => {
      const isFavorite = spot.id === favoriteId;
      const selected = spot.id === activeSelectedId;
      return `
        <article class="spot-card ${isFavorite ? "favorite" : ""} ${selected ? "selected" : ""}" data-spot-id="${spot.id}">
          <button
            type="button"
            class="favorite-star ${isFavorite ? "active" : ""}"
            data-favorite-id="${spot.id}"
            aria-label="Избранный спот"
          >${isFavorite ? "★" : "☆"}</button>
          <h4><span class="spot-dot" aria-hidden="true"></span>${esc(spot.name)}</h4>
          <p>${esc(spot.building)} · ${esc(spot.zone)}</p>
          <p>Вместимость: ${spot.capacity}</p>
          <p>Сейчас занято: ${spot.active_count}</p>
        </article>
      `;
    })
    .join("");

  const options = state.spots
    .map(
      (spot) =>
        `<option value="${spot.id}">● ${esc(spot.name)} · ${esc(spot.building)}</option>`,
    )
    .join("");

  dom.bookingSpot.innerHTML = options;
  dom.bookingSpot.value = String(activeSelectedId);
}

function stateLabel(booking) {
  if (booking.state === "active") return "Активно";
  if (booking.state === "upcoming") return "Скоро";
  return "Завершено";
}

function renderBookings() {
  dom.totalBookings.textContent = String(state.bookings.length);

  const totalMinutes = state.bookings.reduce((acc, booking) => {
    const start = new Date(booking.start_at.replace(" ", "T"));
    const end = new Date(booking.end_at.replace(" ", "T"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return acc;
    return acc + Math.max(0, (end - start) / 60000);
  }, 0);

  dom.totalHours.textContent = (totalMinutes / 60).toFixed(1);

  if (!state.bookings.length) {
    dom.bookingsBody.innerHTML =
      '<tr><td colspan="4" class="subtle">У вас пока нет бронирований.</td></tr>';
    return;
  }

  dom.bookingsBody.innerHTML = state.bookings
    .map(
      (booking) => `
        <tr>
          <td>${esc(booking.spot_name)} · ${esc(booking.building)}</td>
          <td>${formatDateTime(booking.start_at)}</td>
          <td>${formatDateTime(booking.end_at)}</td>
          <td>${stateLabel(booking)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderRules() {
  const rulesHtml = state.rules.map((rule) => `<li>${esc(rule)}</li>`).join("");
  dom.rulesList.innerHTML = rulesHtml;
  dom.rulesModalList.innerHTML = rulesHtml;
}

function renderSnacks(snacks) {
  if (!snacks.length) {
    dom.snacksList.innerHTML =
      '<p class="subtle">Рядом со спотом нет отмеченных мест для перекуса.</p>';
    return;
  }

  dom.snacksList.innerHTML = snacks
    .map(
      (item) => `
        <article class="snack-item">
          <strong>${esc(item.name)}</strong>
          <p class="subtle">${esc(item.building)} · этаж ${esc(item.floor)} · ${esc(item.zone)}</p>
          <p>${esc(item.description)}</p>
        </article>
      `,
    )
    .join("");
}

function lofiEmbedSrc(baseSrc, autoplay = false) {
  const separator = baseSrc.includes("?") ? "&" : "?";
  const autoplayFlag = autoplay ? "1" : "0";
  return `${baseSrc}${separator}rel=0&autoplay=${autoplayFlag}`;
}

function renderLofiTracks() {
  if (!dom.lofiList || !dom.lofiFrame || !dom.lofiNowPlaying) return;
  if (!LOFI_TRACKS.length) return;

  if (
    !state.activeLofiTrackId ||
    !LOFI_TRACKS.some((track) => track.id === state.activeLofiTrackId)
  ) {
    state.activeLofiTrackId = LOFI_TRACKS[0].id;
  }

  dom.lofiList.innerHTML = LOFI_TRACKS.map((track) => {
    const isActive = track.id === state.activeLofiTrackId;
    return `
      <button
        type="button"
        class="lofi-track ${isActive ? "active" : ""}"
        data-track-id="${track.id}"
      >
        <strong>${esc(track.title)}</strong>
        <span>${esc(track.subtitle)}</span>
      </button>
    `;
  }).join("");

  const activeTrack = LOFI_TRACKS.find(
    (track) => track.id === state.activeLofiTrackId,
  );
  if (!activeTrack) return;
  dom.lofiNowPlaying.textContent = `Сейчас: ${activeTrack.title}`;
}

function selectLofiTrack(trackId, autoplay = false) {
  const track = LOFI_TRACKS.find((item) => item.id === trackId);
  if (!track || !dom.lofiFrame) return;

  state.activeLofiTrackId = track.id;
  dom.lofiFrame.src = lofiEmbedSrc(track.src, autoplay);
  renderLofiTracks();
}

function matchesLibraryItem(item) {
  const isByFolder =
    state.library.folder === "all" || item.folder === state.library.folder;
  if (!isByFolder) return false;

  const query = state.library.query.trim().toLowerCase();
  if (!query) return true;

  const haystack = `${item.title} ${item.type} ${item.level}`.toLowerCase();
  return haystack.includes(query);
}

function renderLibrary() {
  if (!dom.libraryGrid) return;

  const filtered = LIBRARY_ITEMS.filter(matchesLibraryItem);

  dom.libraryFolders.forEach((button) => {
    const isActive = button.dataset.folder === state.library.folder;
    button.classList.toggle("active", isActive);
  });

  if (dom.libraryCount) {
    dom.libraryCount.textContent = `${filtered.length} материалов`;
  }

  if (!filtered.length) {
    dom.libraryGrid.innerHTML = `
      <article class="library-empty">
        <p>По вашему запросу ничего не найдено.</p>
        <p class="subtle">Попробуйте другой раздел или измените поиск.</p>
      </article>
    `;
    return;
  }

  dom.libraryGrid.innerHTML = filtered
    .map(
      (item) => `
        <article class="library-item">
          <span class="book-cover ${esc(item.cover)}"></span>
          <strong>${esc(item.title)}</strong>
          <p class="subtle">${esc(item.type)}</p>
          <p class="subtle">${esc(item.level)} · обновлено ${esc(item.updated)}</p>
          <button
            type="button"
            class="btn ghost library-open-btn"
            data-library-id="${esc(item.id)}"
          >
            Открыть карточку
          </button>
        </article>
      `,
    )
    .join("");
}

function renderLibraryFolderCounts() {
  const totals = LIBRARY_ITEMS.reduce(
    (acc, item) => {
      acc.all += 1;
      if (Object.prototype.hasOwnProperty.call(acc, item.folder)) {
        acc[item.folder] += 1;
      }
      return acc;
    },
    {
      all: 0,
      math: 0,
      cs: 0,
      eng: 0,
      eco: 0,
      lang: 0,
    },
  );

  dom.libraryFolderCounts.forEach((node) => {
    const key = node.dataset.countFor;
    if (!key || !Object.prototype.hasOwnProperty.call(totals, key)) return;
    node.textContent = String(totals[key]);
  });
}

function maybeShowRulesModal() {
  if (!state.user || state.user.rules_acknowledged || !state.rules.length)
    return;
  dom.rulesModal.hidden = false;
}

async function acceptRules() {
  try {
    setButtonLoading(dom.rulesAcceptBtn, true);
    await api("/api/rules/ack", { method: "POST" });
    state.user.rules_acknowledged = true;
    dom.rulesModal.hidden = true;
    showToast("Правила подтверждены.");
  } catch (err) {
    showToast(err.message, true);
  } finally {
    setButtonLoading(dom.rulesAcceptBtn, false);
  }
}

async function refreshMe() {
  const data = await api("/api/me");
  state.user = data.user;
  renderUser();
}

async function refreshSpots() {
  const data = await api("/api/spots");
  state.spots = data.spots;
  if (!state.selectedSpotId && state.spots.length) {
    state.selectedSpotId = state.spots[0].id;
  }
  renderSpots();
  if (state.selectedSpotId) {
    await refreshSnacks(state.selectedSpotId);
  }
}

async function refreshSnacks(spotId) {
  const data = await api(`/api/snacks/${spotId}`);
  renderSnacks(data.snacks);
}

async function refreshBookings() {
  const data = await api("/api/bookings?mine=1");
  state.bookings = data.bookings;
  renderBookings();
}

async function refreshRules() {
  const data = await api("/api/rules");
  state.rules = data.rules || [];
  renderRules();
}

async function fullRefresh() {
  await Promise.all([
    refreshMe(),
    refreshSpots(),
    refreshRules(),
    refreshBookings(),
  ]);

  maybeShowRulesModal();
}

async function updateProfile(payload, successMessage = "Профиль обновлен.") {
  await api("/api/profile", { method: "POST", body: payload });

  if (Object.prototype.hasOwnProperty.call(payload, "theme")) {
    state.user.theme = payload.theme;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "favorite_spot_id")) {
    state.user.favorite_spot_id = payload.favorite_spot_id;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "avatar_url")) {
    state.user.avatar_url = payload.avatar_url;
  }

  renderUser();
  renderSpots();
  showToast(successMessage);
}

async function onThemeChange() {
  try {
    await updateProfile({ theme: dom.themeSelect.value }, "Тема обновлена.");
  } catch (err) {
    showToast(err.message, true);
  }
}

async function toggleFavoriteSpot(spotId) {
  const currentFavorite = Number(
    (state.user && state.user.favorite_spot_id) || 0,
  );
  const nextFavorite = currentFavorite === spotId ? null : spotId;

  try {
    await updateProfile(
      { favorite_spot_id: nextFavorite },
      nextFavorite ? "Спот добавлен в избранное." : "Избранный спот снят.",
    );
  } catch (err) {
    showToast(err.message, true);
  }
}

async function onAvatarUpload() {
  const file =
    dom.avatarFile && dom.avatarFile.files ? dom.avatarFile.files[0] : null;
  if (!file) {
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast("Максимальный размер аватара: 2 МБ.", true);
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    if (dom.avatarPicker) dom.avatarPicker.classList.add("loading");
    const data = await apiUpload("/api/avatar", formData);
    state.user.avatar_url = data.avatar_url;
    renderUser();
    dom.avatarFile.value = "";
    showToast("Аватар обновлен.");
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (dom.avatarPicker) dom.avatarPicker.classList.remove("loading");
  }
}

async function onBookingSubmit(event) {
  event.preventDefault();

  try {
    setButtonLoading(
      dom.bookingForm.querySelector('button[type="submit"]'),
      true,
    );
    await api("/api/bookings", {
      method: "POST",
      body: {
        spot_id: Number(dom.bookingSpot.value),
        start_at: dom.bookingStart.value,
        end_at: dom.bookingEnd.value,
      },
    });

    showToast("Бронирование создано.");
    await Promise.all([refreshBookings(), refreshSpots()]);
  } catch (err) {
    showToast(err.message, true);
  } finally {
    setButtonLoading(
      dom.bookingForm.querySelector('button[type="submit"]'),
      false,
    );
  }
}

async function onLogout() {
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    window.location.replace("/auth");
  }
}

function activateTab(tabId) {
  dom.tabPanels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
  dom.contentTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tabTarget === tabId);
  });
}

function bindPomodoro() {
  const updatePomodoroUI = () => {
    const isRunning = Boolean(state.pomodoro.timerId);
    const minutes = String(
      Math.floor(state.pomodoro.secondsLeft / 60),
    ).padStart(2, "0");
    const seconds = String(state.pomodoro.secondsLeft % 60).padStart(2, "0");
    dom.pomodoroTime.textContent = `${minutes}:${seconds}`;
    if (dom.pomodoroState) {
      if (state.pomodoro.mode === "focus") {
        dom.pomodoroState.textContent = isRunning
          ? "Фокус-сессия идет."
          : "Фокус-сессия на паузе.";
      } else {
        dom.pomodoroState.textContent = isRunning
          ? "Перерыв идет."
          : "Перерыв на паузе.";
      }
    }
    if (dom.pomodoroIndicator) {
      dom.pomodoroIndicator.textContent = isRunning ? "Идет" : "Пауза";
      dom.pomodoroIndicator.classList.toggle("running", isRunning);
      dom.pomodoroIndicator.classList.toggle("idle", !isRunning);
    }
    dom.pomodoroStart.disabled = isRunning;
    dom.pomodoroPause.disabled = !isRunning;
  };

  const stopTimer = (shouldUpdateUI = true) => {
    if (state.pomodoro.timerId) {
      window.clearInterval(state.pomodoro.timerId);
      state.pomodoro.timerId = null;
    }
    if (shouldUpdateUI) {
      updatePomodoroUI();
    }
  };

  const toggleMode = () => {
    if (state.pomodoro.mode === "focus") {
      state.pomodoro.mode = "break";
      state.pomodoro.secondsLeft = 5 * 60;
      showToast("Фокус завершен. Перерыв 5 минут.");
    } else {
      state.pomodoro.mode = "focus";
      state.pomodoro.secondsLeft = 25 * 60;
      showToast("Перерыв завершен. Возвращаемся к фокусу.");
    }
  };

  dom.pomodoroStart.addEventListener("click", () => {
    if (state.pomodoro.timerId) return;
    state.pomodoro.timerId = window.setInterval(() => {
      state.pomodoro.secondsLeft -= 1;
      if (state.pomodoro.secondsLeft <= 0) {
        stopTimer();
        toggleMode();
      }
      updatePomodoroUI();
    }, 1000);
    updatePomodoroUI();
  });

  dom.pomodoroPause.addEventListener("click", () => {
    stopTimer(true);
  });

  dom.pomodoroReset.addEventListener("click", () => {
    stopTimer(false);
    state.pomodoro.mode = "focus";
    state.pomodoro.secondsLeft = 25 * 60;
    updatePomodoroUI();
  });

  updatePomodoroUI();
}

function bindEvents() {
  if (dom.logoutBtn) dom.logoutBtn.addEventListener("click", onLogout);
  if (dom.bookingForm)
    dom.bookingForm.addEventListener("submit", onBookingSubmit);
  if (dom.bookingStart && dom.bookingEnd) {
    dom.bookingStart.addEventListener("change", () => {
      const start = new Date(dom.bookingStart.value);
      if (!Number.isNaN(start.getTime())) {
        const snapped = snapDateToStep(
          start,
          BOOKING_TIME_STEP_MINUTES,
          "ceil",
        );
        if (snapped) {
          const duration = normalizeDurationMinutes(bookingDurationMinutes);
          dom.bookingStart.value = toLocalDateTimeInput(snapped);
          const end = new Date(snapped.getTime() + duration * 60 * 1000);
          dom.bookingEnd.value = toLocalDateTimeInput(end);
        }
      }
      updateBookingEndMin(true);
    });
    dom.bookingEnd.addEventListener("change", () => {
      const minEnd = getMinBookingEndDate();
      if (!minEnd) return;
      let end = new Date(dom.bookingEnd.value);
      if (!Number.isNaN(end.getTime())) {
        const snapped = snapDateToStep(end, BOOKING_TIME_STEP_MINUTES, "ceil");
        if (snapped) end = snapped;
      }
      if (Number.isNaN(end.getTime()) || end < minEnd) {
        showToast(
          `Минимальное время бронирования — ${MIN_BOOKING_MINUTES} минут.`,
          true,
        );
        end = minEnd;
      }
      dom.bookingEnd.value = toLocalDateTimeInput(end);
      updateBookingDurationFromInputs();
    });
  }
  if (dom.themeSelect)
    dom.themeSelect.addEventListener("change", onThemeChange);
  if (dom.rulesAcceptBtn)
    dom.rulesAcceptBtn.addEventListener("click", acceptRules);

  if (dom.avatarPicker && dom.avatarFile) {
    dom.avatarPicker.addEventListener("click", () => dom.avatarFile.click());
    dom.avatarPicker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dom.avatarFile.click();
      }
    });
  }
  if (dom.avatarFile) {
    dom.avatarFile.addEventListener("change", onAvatarUpload);
  }

  if (dom.contentTabs.length) {
    dom.contentTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activateTab(tab.dataset.tabTarget);
      });
    });
  }

  if (dom.lofiList) {
    dom.lofiList.addEventListener("click", (event) => {
      const button = event.target.closest(".lofi-track");
      if (!button) return;
      selectLofiTrack(button.dataset.trackId, true);
    });
  }

  if (dom.libraryFolders.length) {
    dom.libraryFolders.forEach((button) => {
      button.addEventListener("click", () => {
        state.library.folder = button.dataset.folder || "all";
        renderLibrary();
      });
    });
  }

  if (dom.librarySearch) {
    dom.librarySearch.addEventListener("input", () => {
      state.library.query = dom.librarySearch.value || "";
      renderLibrary();
    });
  }

  if (dom.libraryGrid) {
    dom.libraryGrid.addEventListener("click", (event) => {
      const openButton = event.target.closest(".library-open-btn");
      if (!openButton) return;
      const item = LIBRARY_ITEMS.find(
        (entry) => entry.id === openButton.dataset.libraryId,
      );
      if (!item) return;
      showToast(`Открыта карточка: ${item.title}`);
    });
  }

  if (dom.spotsGrid && dom.bookingSpot) {
    dom.spotsGrid.addEventListener("click", async (event) => {
      const favoriteBtn = event.target.closest(".favorite-star");
      if (favoriteBtn) {
        await toggleFavoriteSpot(Number(favoriteBtn.dataset.favoriteId));
        return;
      }

      const card = event.target.closest(".spot-card");
      if (!card) return;

      state.selectedSpotId = Number(card.dataset.spotId);
      dom.bookingSpot.value = String(state.selectedSpotId);
      renderSpots();
      try {
        await refreshSnacks(state.selectedSpotId);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    dom.bookingSpot.addEventListener("change", async () => {
      state.selectedSpotId = Number(dom.bookingSpot.value);
      renderSpots();
      try {
        await refreshSnacks(state.selectedSpotId);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  if (dom.pomodoroStart && dom.pomodoroPause && dom.pomodoroReset) {
    bindPomodoro();
  }
}

async function initApp() {
  if (state.user) {
    renderUser();
  }

  safeRemoveSessionItem(AUTH_REDIRECT_KEY);
  bindEvents();
  if (dom.tabPanels.length) {
    activateTab("main-tab");
  }
  if (dom.bookingStart && dom.bookingEnd) {
    setDefaultBookingWindow();
  }
  renderLibraryFolderCounts();
  renderLibrary();
  if (LOFI_TRACKS.length) {
    selectLofiTrack(LOFI_TRACKS[0].id, false);
  }

  try {
    await fullRefresh();
  } catch (err) {
    showToast(err.message, true);
  }
}

initApp();
