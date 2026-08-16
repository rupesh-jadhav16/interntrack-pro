/* Landing page + auth modal logic */
const Auth = {
  modal: null,
  formLogin: null,
  formRegister: null,

  init() {
    this.modal = document.getElementById("auth-modal");
    this.formLogin = document.getElementById("login-form");
    this.formRegister = document.getElementById("register-form");
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
  },

  open(mode) {
    this.modal.style.display = "grid";
    this.tab(mode || "login");
  },
  close() {
    this.modal.style.display = "none";
  },

  tab(mode) {
    const login = mode === "login";
    document.getElementById("tab-login").classList.toggle("active", login);
    document.getElementById("tab-register").classList.toggle("active", !login);
    this.formLogin.style.display = login ? "" : "none";
    this.formRegister.style.display = login ? "none" : "";
    document.getElementById("auth-title").textContent = login ? "Sign in to InternTracker" : "Create your account";
  },

  pickRole(role) {
    document.querySelectorAll("#role-pick .role-opt").forEach((el) => {
      el.classList.toggle("sel", el.dataset.role === role);
    });
    document.querySelectorAll("#role-fields > div").forEach((el) => { el.style.display = "none"; });
    const group = document.querySelector(".f-" + role);
    if (group) group.style.display = "";
    document.getElementById("register-btn").disabled = false;
  },

  async submit(path, body) {
    const btn = document.querySelector("#" + (path.includes("register") ? "register-form" : "login-form") + " .btn");
    if (btn) { btn.disabled = true; btn.textContent = "Please wait…"; }
    try {
      const res = await API.post(path, body);
      API.setToken(res.token);
      toast("Welcome, " + res.user.name.split(" ")[0] + "! 🎉", "success");
      setTimeout(() => { location.href = roleHome(res.user.role); }, 350);
    } catch (e) {
      toast(e.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = path.includes("register") ? "Create account" : "Sign in"; }
    }
  },

  async login(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await this.submit("/auth/login", { email: fd.get("email"), password: fd.get("password") });
    return false;
  },

  async register(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const role = document.querySelector("#role-pick .role-opt.sel");
    if (!role) { toast("Pick a role to continue", "error"); return false; }
    const r = role.dataset.role;
    const skills = String(fd.get("skills") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const body = {
      name: fd.get("name"), email: fd.get("email"), password: fd.get("password"),
      role: r,
      department: fd.get("department") || "", branch: fd.get("branch") || "",
      year: fd.get("year") || "1", semester: fd.get("semester") || "1",
      cgpa: parseFloat(fd.get("cgpa") || "0") || 0, skills,
      college: "Springfield Institute of Technology",
      designation: fd.get("designation") || "Assistant Professor",
      company_name: fd.get("company_name") || "", industry: fd.get("industry") || "",
      website: fd.get("website") || "", location: fd.get("location") || "",
      description: fd.get("description") || "",
    };
    await this.submit("/auth/register", body);
    return false;
  },

  demo(email, password) {
    document.getElementById("login-form").email.value = email;
    document.getElementById("login-form").password.value = password;
    this.tab("login");
    this.login({ preventDefault: () => {}, target: document.getElementById("login-form") });
  },
};

Auth.init();
