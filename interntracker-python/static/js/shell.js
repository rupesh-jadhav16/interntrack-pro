/* Role workspace shell: sidebar + topbar + hash router + notifications */
const NAV = {
  student: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "internships", label: "Explorer", icon: "compass" },
    { key: "applications", label: "Applications", icon: "briefcase" },
    { key: "tracker", label: "Tracker", icon: "flame" },
    { key: "attendance", label: "Attendance", icon: "calendar" },
    { key: "reports", label: "Daily Reports", icon: "file" },
    { key: "deadlines", label: "Deadlines", icon: "clock" },
    { key: "leaderboard", label: "Leaderboard", icon: "trophy" },
    { key: "rewards", label: "Rewards", icon: "award" },
    { key: "certificates", label: "Certificates", icon: "shield" },
    { key: "profile", label: "Profile", icon: "user" },
  ],
  faculty: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "students", label: "My Students", icon: "users" },
    { key: "reports", label: "Reports Review", icon: "file" },
    { key: "performance", label: "Performance", icon: "chart" },
  ],
  admin: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "students", label: "Students", icon: "users" },
    { key: "faculty", label: "Faculty", icon: "user" },
    { key: "companies", label: "Companies", icon: "building" },
    { key: "verification", label: "Verification Queue", icon: "shield" },
    { key: "internships", label: "Internships", icon: "briefcase" },
    { key: "applications", label: "Applications", icon: "doc" },
    { key: "certificates", label: "Certificates", icon: "qr" },
    { key: "rankings", label: "Rankings", icon: "trophy" },
    { key: "rewards", label: "Rewards Config", icon: "award" },
    { key: "analytics", label: "Analytics", icon: "chart" },
    { key: "announcements", label: "Announce", icon: "megaphone" },
  ],
  company: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "profile", label: "Company Profile", icon: "building" },
    { key: "internships", label: "Internships", icon: "briefcase" },
    { key: "applications", label: "Applications", icon: "inbox" },
    { key: "interns", label: "Current Interns", icon: "users" },
  ],
};

const VIEW_TITLES = {
  student: { dashboard: "Dashboard Overview", internships: "Internship Explorer", applications: "My Applications",
             tracker: "Internship Tracker", attendance: "Attendance", reports: "Daily & Weekly Reports",
             deadlines: "Deadlines", leaderboard: "College Leaderboard", rewards: "Rewards & Badges",
             certificates: "Certificate Verification", profile: "My Profile" },
  faculty: { dashboard: "Faculty Dashboard", students: "My Students", reports: "Reports Review", performance: "Performance" },
  admin: { dashboard: "T&P Cell Dashboard", students: "All Students", faculty: "Faculty", companies: "Companies",
           verification: "Company Verification Queue", internships: "Internships", applications: "Applications",
           certificates: "Certificate Review", rankings: "College Rankings", rewards: "Rewards Configuration",
           analytics: "Analytics", announcements: "Announcements" },
  company: { dashboard: "Company Dashboard", profile: "Company Profile", internships: "Internships",
             applications: "Applications", interns: "Current Interns" },
};

async function bootShell(role, views, opts = {}) {
  const user = await loadMe();
  if (user.role !== role) { location.href = roleHome(user.role); return; }

  const app = document.getElementById("app");
  app.innerHTML = "";

  const nav = NAV[role];
  const titles = VIEW_TITLES[role];

  // ---- sidebar ----
  const navEl = h("nav", { class: "nav" },
    nav.map(item => h("a", { href: "#/" + item.key, "data-view": item.key },
      icon(item.icon), item.label)),
  );
  const sidebar = h("aside", { class: "sidebar", id: "sidebar" },
    h("div", { class: "brand" },
      h("div", { class: "logo" }, "IT"),
      h("div", {}, h("b", "InternTracker"), h("small", "T&P Cell Portal")),
    ),
    navEl,
    h("div", { class: "me" },
      h("div", { class: "avatar" }, initials(user.name)),
      h("div", { class: "who" }, h("b", user.name), h("span", roleLabel(role))),
      h("button", { class: "icon-btn", title: "Logout", onclick: logout, style: "background:none;border:none;color:#94a3b8" }, icon("logout")),
    ),
  );

  // ---- topbar ----
  const titleEl = h("div", {},
    h("h1", { id: "page-title" }, ""),
    h("div", { class: "sub", id: "page-sub" }, ""),
  );
  const bellWrap = h("div", { style: "position:relative" },
    h("button", { class: "icon-btn", id: "bell", onclick: toggleNotifs }, icon("bell"), h("span", { class: "dot", id: "bell-dot", style: "display:none" })),
    h("div", { class: "dropdown", id: "notif-drop", style: "display:none" }),
  );
  const topbar = h("header", { class: "topbar" }, titleEl, h("div", { class: "actions" }, bellWrap));

  const mobileTop = h("div", { class: "mobile-top" },
    h("button", { class: "burger", onclick: () => sidebar.classList.toggle("open") }, icon("chevron")),
    h("b", "InternTracker"),
  );

  const content = h("main", { class: "content", id: "content" });
  const main = h("div", { class: "main" }, mobileTop, topbar, content);
  app.append(sidebar, main);

  // close sidebar on nav (mobile)
  navEl.addEventListener("click", (e) => { if (e.target.closest("a")) sidebar.classList.remove("open"); });

  // ---- routing ----
  function currentView() {
    const v = (location.hash || "#/dashboard").replace(/^#\/?/, "").split("?")[0];
    return views[v] ? v : Object.keys(views)[0];
  }
  function render() {
    const v = currentView();
    navEl.querySelectorAll("a").forEach(a => a.classList.toggle("active", a.dataset.view === v));
    titleEl.querySelector("h1").textContent = titles[v] || "Dashboard";
    content.innerHTML = "";
    content.append(spinner());
    try {
      views[v](content);
    } catch (err) {
      content.innerHTML = "";
      content.append(emptyState("Something went wrong: " + err.message, "⚠️"));
    }
  }
  window.addEventListener("hashchange", render);
  render();
  refreshNotifBadge();
  setInterval(refreshNotifBadge, 45000);

  // ---- notifications ----
  async function refreshNotifBadge() {
    try {
      const d = await API.get("/notifications");
      const dot = document.getElementById("bell-dot");
      dot.style.display = d.unread > 0 ? "" : "none";
    } catch (e) { /* ignore */ }
  }
  async function toggleNotifs() {
    const drop = document.getElementById("notif-drop");
    const show = drop.style.display === "none";
    drop.style.display = show ? "" : "none";
    if (!show) return;
    try {
      const d = await API.get("/notifications");
      drop.innerHTML = "";
      drop.append(h("div", { class: "head" }, "Notifications",
        h("button", { class: "btn btn-sm btn-ghost", onclick: async () => {
          await API.post("/notifications/read-all"); toggleNotifs(); refreshNotifBadge();
        } }, "Mark all read")));
      if (!d.items.length) drop.append(emptyState("No notifications yet", "🔔"));
      d.items.forEach(n => drop.append(h("div", { class: "n" + (n.read ? "" : " unread"), onclick: async () => {
        if (!n.read) await API.post("/notifications/" + n.id + "/read");
        drop.innerHTML = ""; toggleNotifs(); refreshNotifBadge();
      } },
        h("div", {}, h("b", n.title), h("p", n.body), h("time", fmtDateTime(n.created_at))),
      )));
    } catch (e) { /* ignore */ }
  }

  async function logout() {
    API.clear();
    location.href = "/";
  }
}

function roleLabel(role) {
  return { student: "Student", faculty: "Faculty", admin: "T&P Cell / Admin", company: "Company" }[role] || role;
}
