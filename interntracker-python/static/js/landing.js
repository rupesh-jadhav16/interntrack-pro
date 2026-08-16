/* InternTracker landing page + auth */
let authRole = "student";

const ROLE_HOME = { student: "/student", faculty: "/faculty", admin: "/admin", company: "/company" };

const DEMO_ACCOUNTS = [
  { role: "student", label: "Student (full activity)", email: "student@college.edu", pass: "student123" },
  { role: "admin", label: "T&P Cell admin", email: "admin@college.edu", pass: "admin123" },
  { role: "faculty", label: "Faculty mentor", email: "faculty@college.edu", pass: "faculty123" },
  { role: "company", label: "Verified company", email: "techflowsystems@demo.com", pass: "company123" },
  { role: "company", label: "Company (pending verify)", email: "nextgenrobotics@demo.com", pass: "company123" },
];

/* ---------------- auth modal ---------------- */
function openAuth(tab, role) {
  if (role) pickRole(role);
  switchAuthTab(tab || "login");
  document.getElementById("authModal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeAuth() {
  document.getElementById("authModal").classList.remove("open");
  document.body.style.overflow = "";
}

function pickRole(role) {
  authRole = role;
  document.querySelectorAll("#roleGrid .role-opt").forEach((o) =>
    o.classList.toggle("active", o.dataset.role === role)
  );
  document.getElementById("studentExtras").classList.toggle("hide", role !== "student");
  document.getElementById("companyExtras").classList.toggle("hide", role !== "company");
  document.getElementById("authTitle").textContent =
    (document.querySelector(".tab.active").dataset.tab === "register" ? "Register as " : "Sign in as ") +
    role.replace("_", " ");
}

function switchAuthTab(tab) {
  document.querySelectorAll("#authModal .tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );
  document.getElementById("loginForm").classList.toggle("hide", tab !== "login");
  document.getElementById("registerForm").classList.toggle("hide", tab !== "register");
  document.getElementById("forgotForm").classList.toggle("hide", tab !== "forgot");
  const labels = { login: "Sign in to InternTracker", register: "Register as " + authRole.replace("_", " "), forgot: "Reset your password" };
  document.getElementById("authTitle").textContent = labels[tab];
}

async function doLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Signing in…';
  try {
    const form = new FormData(e.target);
    const data = await API.post("/api/auth/login", {
      email: form.get("email"), password: form.get("password"),
    });
    finishAuth(data);
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Sign in";
  }
}

async function doRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Creating account…';
  try {
    const form = new FormData(e.target);
    const payload = {
      role: authRole,
      name: form.get("name"), email: form.get("email"), password: form.get("password"),
      department: form.get("department") || "", branch: form.get("branch") || "",
      year: form.get("year") || "", cgpa: form.get("cgpa") ? parseFloat(form.get("cgpa")) : null,
      phone: form.get("phone") || "", location: form.get("location") || "",
      company_name: form.get("company_name") || "", company_website: form.get("company_website") || "",
      company_industry: form.get("company_industry") || "", company_description: form.get("company_description") || "",
    };
    const data = await API.post("/api/auth/register", payload);
    UI.toast("🎉 Account created! Welcome to InternTracker.", "success");
    finishAuth(data);
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Create account";
  }
}

async function doForgot(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Resetting…';
  try {
    const form = new FormData(e.target);
    await API.post("/api/auth/forgot", { email: form.get("email"), new_password: form.get("new_password") });
    UI.toast("✅ Password reset. You can now sign in.", "success");
    switchAuthTab("login");
    e.target.reset();
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Reset password";
  }
}

function finishAuth(data) {
  API.setToken(data.token);
  UI.toast(`Welcome, ${data.user.name}!`, "success");
  closeAuth();
  location.href = ROLE_HOME[data.user.role] || "/";
}

/* demo login buttons */
function renderDemoAccounts() {
  const list = document.getElementById("demoList");
  list.innerHTML = DEMO_ACCOUNTS.map(
    (d, i) => `
    <div class="demo-row">
      <div class="d"><b>${UI.esc(d.label)}</b><span>${UI.esc(d.email)} · ${UI.esc(d.pass)}</span></div>
      <button class="btn btn-sm btn-primary" onclick="demoLogin(${i})">Login</button>
    </div>`
  ).join("");
}
async function demoLogin(i) {
  const d = DEMO_ACCOUNTS[i];
  try {
    const data = await API.post("/api/auth/login", { email: d.email, password: d.pass });
    finishAuth(data);
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
  }
}

/* footer icons */
document.addEventListener("DOMContentLoaded", () => {
  renderDemoAccounts();
  const mail = document.getElementById("mailIcon");
  const phone = document.getElementById("phoneIcon");
  if (mail) mail.innerHTML = UI.icons.mail;
  if (phone) phone.innerHTML = UI.icons.phone;

  /* close modal on Esc */
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAuth(); });

  /* scroll reveal */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("fade-in"); }),
    { threshold: 0.08 }
  );
  document.querySelectorAll(".step, .benefit, .testi, .sb, .hero-card").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    el.style.transition = "opacity .5s ease, transform .5s ease";
    io.observe(el);
  });
});
