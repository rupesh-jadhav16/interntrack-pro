/* InternTracker workspace shell — shared across all four roles */
window.App = { pages: {}, state: {} };

const ROLE_LABEL = { student: "Student", faculty: "Faculty", admin: "T&P Cell Admin", company: "Company" };
const PAGE_ICON = {
  dashboard: "dashboard", explorer: "explorer", applications: "applications", tracker: "tracker",
  report: "report", reports: "report", attendance: "attendance", deadlines: "deadlines",
  leaderboard: "leaderboard", rewards: "rewards", certificates: "certificates", profile: "profile",
  students: "students", faculty: "students", review: "review", performance: "performance",
  verification: "shield", internships: "explorer", rankings: "leaderboard", analytics: "analytics",
  announcements: "megaphone", activity: "log", interns: "students",
};

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function toggleDropdown(id) {
  document.querySelectorAll(".dropdown").forEach((d) => {
    if (d.id !== id) d.classList.remove("open");
  });
  document.getElementById(id).classList.toggle("open");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
  }
});

async function shellInit(role) {
  // fill nav icons
  document.querySelectorAll(".nav-item").forEach((b) => {
    const key = PAGE_ICON[b.dataset.page] || "dashboard";
    const span = document.getElementById("ic-" + b.dataset.page);
    if (span) span.innerHTML = UI.icons[key] || "";
  });

  let me;
  try {
    me = await API.get("/api/auth/me");
  } catch (e) {
    location.href = "/";
    return;
  }
  if (me.role !== role) {
    const map = { student: "/student", faculty: "/faculty", admin: "/admin", company: "/company" };
    location.href = map[me.role] || "/";
    return;
  }
  App.me = me;

  // sidebar user
  document.getElementById("sideUser").innerHTML = `
    ${UI.avatar(me.name)}
    <div style="min-width:0">
      <div class="u-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px">${UI.esc(me.name)}</div>
      <div class="u-role">${ROLE_LABEL[me.role]}</div>
    </div>`;

  // topbar right
  renderNotifBell();
  renderUserMenu();

  // nav wiring
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.addEventListener("click", () => switchPage(b.dataset.page));
  });

  // initial page
  const initial = location.hash.replace("#", "") || document.querySelector(".nav-item")?.dataset.page || "dashboard";
  switchPage(initial);
}

function switchPage(page) {
  if (!App.pages[page]) {
    if (App.pages.dashboard) page = "dashboard";
    else return;
  }
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) {
    document.getElementById("pageTitle").innerHTML = nav.dataset.title || page;
    document.getElementById("pageSub").textContent = nav.dataset.sub || "";
  }
  location.hash = page;
  const content = document.getElementById("content");
  content.innerHTML = '<div class="loading-page"><div class="spinner"></div></div>';
  App.pages[page](content);
  document.getElementById("sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0 });
}

/* ---------------- notifications ---------------- */
async function renderNotifBell() {
  const wrap = document.getElementById("notifWrap");
  let items = [];
  try { items = await API.get("/api/notifications"); } catch (e) { /* ignore */ }
  const unread = items.filter((n) => !n.read).length;
  wrap.innerHTML = `
    <button class="bell" onclick="toggleDropdown('notifWrap')">
      ${UI.icons.bell}
      ${unread ? `<span class="dot">${unread}</span>` : ""}
    </button>
    <div class="dropdown-menu notif-list" style="width:330px"></div>`;
  const menu = wrap.querySelector(".dropdown-menu");
  if (!items.length) {
    menu.innerHTML = `<div class="empty" style="padding:26px 14px">No notifications yet</div>`;
  } else {
    menu.innerHTML = items.map((n) => `
      <div class="notif-item ${n.read ? "" : "unread"}">
        <span>${n.type === "success" ? "✅" : n.type === "warning" ? "⚠️" : n.type === "system" ? "📢" : "🔔"}</span>
        <div style="min-width:0">
          <div class="n-title">${UI.esc(n.title)}</div>
          <div class="n-msg">${UI.esc(n.message)}</div>
          <div class="n-time">${UI.timeAgo(n.created_at)}</div>
        </div>
      </div>`).join("");
  }
  if (unread) {
    menu.addEventListener("click", () => API.post("/api/notifications/read").then(() => renderNotifBell()), { once: true });
  }
}

/* ---------------- user menu ---------------- */
function renderUserMenu() {
  const wrap = document.getElementById("userWrap");
  wrap.innerHTML = `
    <div style="cursor:pointer" onclick="toggleDropdown('userWrap')">${UI.avatar(App.me.name)}</div>
    <div class="dropdown-menu">
      <div style="padding:10px 12px;border-bottom:1px solid var(--line);margin-bottom:6px">
        <div class="bold" style="font-size:13.5px">${UI.esc(App.me.name)}</div>
        <div class="muted small">${UI.esc(App.me.email)}</div>
      </div>
      <a class="dropdown-item" href="/" style="text-decoration:none">${UI.icons.home} Back to landing</a>
      <button class="dropdown-item danger" onclick="logout()">${UI.icons.logout} Log out</button>
    </div>`;
}

function logout() {
  API.clear();
  location.href = "/";
}
