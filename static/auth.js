const dom = {
  tabs: Array.from(document.querySelectorAll(".tab-btn")),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  toast: document.getElementById("toast"),
};

const STUDENT_ID_HINT = document.body.dataset.studentIdHint || "0БИН00000";
const STUDENT_ID_RE = /^\d[А-ЯЁ]{3}\d{5}$/;
try {
  window.sessionStorage.removeItem("coworking_auth_redirect_at");
} catch (_err) {
  // Ignore storage limitations/privacy mode.
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
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Произошла ошибка.");
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
  }, 3000);
}

function normalizeStudentId(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

function setSubmitDisabled(form, disabled) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;
  submitButton.disabled = disabled;
}

function switchForm(targetId) {
  const forms = [dom.loginForm, dom.registerForm];
  forms.forEach((form) => {
    if (!form) return;
    form.classList.toggle("active", form.id === targetId);
  });

  dom.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.target === targetId);
  });
}

async function onLoginSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.loginForm);

  try {
    setSubmitDisabled(dom.loginForm, true);
    await api("/api/login", {
      method: "POST",
      body: {
        email: formData.get("email"),
        password: formData.get("password"),
      },
    });
    window.location.href = "/";
  } catch (err) {
    showToast(err.message, true);
  } finally {
    setSubmitDisabled(dom.loginForm, false);
  }
}

async function onRegisterSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.registerForm);
  const normalizedStudentId = normalizeStudentId(formData.get("student_id"));

  if (!STUDENT_ID_RE.test(normalizedStudentId)) {
    showToast(`Формат студбилета: ${STUDENT_ID_HINT}`, true);
    return;
  }

  try {
    setSubmitDisabled(dom.registerForm, true);
    await api("/api/register", {
      method: "POST",
      body: {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        email: formData.get("email"),
        nickname: formData.get("nickname"),
        student_id: normalizedStudentId,
        password: formData.get("password"),
      },
    });
    window.location.href = "/";
  } catch (err) {
    showToast(err.message, true);
  } finally {
    setSubmitDisabled(dom.registerForm, false);
  }
}

function bindEvents() {
  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchForm(tab.dataset.target));
  });

  dom.loginForm.addEventListener("submit", onLoginSubmit);
  dom.registerForm.addEventListener("submit", onRegisterSubmit);

  const studentIdInput = dom.registerForm.querySelector(
    'input[name="student_id"]',
  );
  if (studentIdInput) {
    studentIdInput.addEventListener("input", () => {
      studentIdInput.value = normalizeStudentId(studentIdInput.value);
    });
  }
}

bindEvents();
