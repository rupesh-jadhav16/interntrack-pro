/* ================= Faculty workspace ================= */
async function fview(c, fn) {
  c.innerHTML = "";
  c.append(spinner());
  try { c.replaceChildren(await fn()); }
  catch (e) { c.replaceChildren(emptyState(e.message, "⚠️")); }
}

function fcard(title, body, headRight) {
  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h3", title), headRight || null), body);
}

function studentRow(s, onclick) {
  return h("div", { class: "list-item", style: "cursor:pointer", onclick },
    h("div", { class: "avatar" }, initials(s.name)),
    h("div", { class: "grow" },
      h("b", s.name), h("div", { class: "muted" }, s.department + (s.branch ? " · " + s.branch : "") + " · Year " + s.year +
        (s.enrollment ? " · " + s.enrollment.role + " @ " + s.enrollment.company : "")),
      h("div", { class: "flex", style: "gap:6px;margin-top:6px" },
        h("span", { class: "badge b-amber", style: "background:var(--amber-soft);color:var(--amber)" }, "🔥 " + s.streak),
        h("span", { class: "badge b-sky", style: "background:var(--sky-soft);color:var(--sky)" }, "Attendance " + s.attendance_pct + "%"),
        h("span", { class: "badge b-pending" }, s.pending_reports + " pending reports"))),
    s.at_risk ? h("span", { class: "badge b-rejected" }, "⚠ At risk") : h("span", { class: "badge b-verified" }, "On track"));
}

function reviewModal(kind, r, onDone) {
  const fb = h("textarea", { class: "textarea", id: "fb-text", placeholder: "Optional feedback for the student…" });
  const m = modal(title, h("div", { class: "flex-col" },
    h("div", { class: "flex" }, h("div", { class: "avatar" }, initials(r.student)), h("div", { class: "grow" },
      h("b", r.student), h("div", { class: "muted" }, kind + " · " + (kind === "Daily" ? fmtDate(r.date) : "Week of " + fmtDate(r.week_start))))),
    kind === "Daily"
      ? h("div", { class: "alert sky" }, h("div", {}, h("b", "Tasks"), (r.tasks || "").slice(0, 300), h("div", { class: "mt" }, h("b", "Hours: "), r.hours + "h")))
      : h("div", { class: "alert sky" }, h("div", {}, h("b", "Progress " + (r.progress || 0) + "%"), " · Attendance " + (r.attendance_pct || 0) + "% · " + (r.total_hours || 0) + " hours")),
    h("div", { class: "field" }, h("label", "Feedback"), fb),
    h("div", { class: "actions" },
      h("button", { class: "btn btn-danger", onclick: async () => { await act(false, fb.value); } }, icon("x"), "Reject"),
      h("button", { class: "btn btn-success", onclick: async () => { await act(true, fb.value); } }, icon("check"), "Approve"))));
  async function act(approve, feedback) {
    try {
      await API.post(kind === "Daily" ? "/faculty/reports/daily/" + r.id + "/review" : "/faculty/reports/weekly/" + r.id + "/review",
        { approve, feedback });
      toast("Report " + (approve ? "approved ✓" : "rejected"), "success");
      m.close(); onDone();
    } catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- dashboard ---------------- */
function facultyDashboard(d) {
  const stats = h("div", { class: "grid grid-4" },
    stat("My students", d.total_students, null, "accent", "users"),
    stat("Active internships", d.active_internships, null, "emerald", "briefcase"),
    stat("At-risk flags", d.at_risk, "Need attention", d.at_risk ? "rose" : "emerald", "flame"),
    stat("Pending reports", d.pending_reports, d.weekly_pending + " weekly missing", "amber", "file"));

  const atRiskItems = (d.students || []).filter((s) => s.at_risk);
  const atRisk = h("div", { class: "flex-col" }, atRiskItems.map((s) => {
    const why = [];
    if (s.streak === 0) why.push("No streak");
    if (s.attendance_pct < 60 && s.days_missed >= 0) why.push("Attendance " + s.attendance_pct + "%");
    if (s.days_missed) why.push(s.days_missed + " days since last report");
    if (!why.length) why.push("Needs attention");
    return h("div", { class: "alert rose" }, icon("flame"),
      h("div", { class: "grow" },
        h("b", s.name),
        h("span", { class: "muted" }, why.join(" · "))));
  }));

  const top = (d.students || []).slice(0, 6);
  const list = h("div", { class: "flex-col" }, top.map((s) => studentRow(s, () => openStudentDetail(s.id))));

  return h("div", { class: "stack" },
    stats,
    h("div", { class: "grid grid-2-1" },
      fcard("Students needing attention", d.at_risk ? atRisk : h("div", { class: "alert emerald" }, icon("check"), h("div", {}, h("b", "All clear"), "Every assigned student is on track.")), h("span", { class: "badge b-rejected" }, d.at_risk + " at risk")),
      fcard("Weekly reports pending", h("div", { class: "flex-col" },
        h("div", { style: "font-size:38px;font-weight:800" }, d.weekly_pending),
        h("div", { class: "muted" }, "students haven't submitted this week's summary"),
        h("a", { class: "btn btn-soft btn-sm", style: "align-self:flex-start;margin-top:10px", href: "#/reports" }, "Review reports"))),      fcard("Your students", list.length ? list : emptyState("No students assigned yet. The T&P cell assigns students to mentors.", "👥"))));
}

/* ---------------- students ---------------- */
async function openStudentDetail(sid) {
  try {
    const d = await API.get("/faculty/students/" + sid);
    const s = d.student;
    const tabs = h("div", { class: "tab-bar" },
      h("button", { class: "active", onclick: () => show("daily") }, "Daily reports"),
      h("button", { onclick: () => show("weekly") }, "Weekly"),
      h("button", { onclick: () => show("att") }, "Attendance"));
    const daily = h("div", { class: "flex-col" }, (d.daily || []).map((r) =>
      h("div", { class: "list-item" },
        h("div", { class: "grow" }, h("b", fmtDate(r.date)), h("div", { class: "muted" }, (r.tasks || "").slice(0, 90)), r.feedback ? h("div", { class: "muted", style: "font-size:11.5px" }, "Feedback: " + r.feedback) : null),
        statusBadge(r.status),
        r.status === "pending" ? h("button", { class: "btn btn-sm btn-primary", onclick: () => reviewModal("Daily", { ...r, student: s.name }, () => m.close()) }, "Review") : null)));
    const weekly = h("div", { class: "flex-col" }, (d.weekly || []).map((r) =>
      h("div", { class: "list-item" }, h("div", { class: "grow" }, h("b", "Week of " + fmtDate(r.week_start)), h("div", { class: "muted" }, "Attendance " + r.attendance_pct + "% · " + r.total_hours + "h · progress " + r.progress + "%")), statusBadge(r.status))));
    const att = h("div", { class: "flex-col" }, (d.attendance || []).slice(0, 30).map((a) =>
      h("div", { class: "list-item" }, h("div", { class: "grow" }, h("b", fmtDate(a.date)), h("div", { class: "muted" }, a.summary || "")), statusBadge(a.status), h("span", { class: "muted" }, (a.hours || 0) + "h"))));
    function show(which) {
      tabs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (which === "daily" && i === 0) || (which === "weekly" && i === 1) || (which === "att" && i === 2)));
      daily.style.display = which === "daily" ? "" : "none";
      weekly.style.display = which === "weekly" ? "" : "none";
      att.style.display = which === "att" ? "" : "none";
    }
    const m = modal(s.name + " — " + (s.enrollment ? s.enrollment.role + " @ " + s.enrollment.company : "no active internship"), h("div", { class: "flex-col" },
      h("div", { class: "flex" },
        h("span", { class: "badge b-amber", style: "background:var(--amber-soft);color:var(--amber)" }, "🔥 " + s.streak),
        h("span", { class: "badge b-sky", style: "background:var(--sky-soft);color:var(--sky)" }, "Attendance " + s.attendance_pct + "%"),
        h("span", { class: "badge b-accent", style: "background:var(--accent-soft);color:var(--accent-strong)" }, s.points + " pts"),
        h("span", { class: "badge " + (s.at_risk ? "b-rejected" : "b-verified") }, s.at_risk ? "At risk" : "On track")),
      tabs, daily, weekly, att));
  } catch (e) { toast(e.message, "error"); }
}

/* ---------------- reports review ---------------- */
function facultyReports(d, c) {
  const dailyList = h("div", { class: "flex-col" });
  const weeklyList = h("div", { class: "flex-col" });
  const refresh = () => { fview(c, async () => facultyReports(await API.get("/faculty/reports/pending"), c)); };
  dailyList.replaceChildren((d.daily || []).map((r) =>
    h("div", { class: "list-item" },
      h("div", { class: "avatar" }, initials(r.student)),
      h("div", { class: "grow" }, h("b", r.student), h("div", { class: "muted" }, fmtDate(r.date) + " · " + r.hours + "h · " + (r.tasks || "").slice(0, 80)),
        h("span", { class: "badge b-pending" }, "Pending review")),
      h("button", { class: "btn btn-sm btn-primary", onclick: () => reviewModal("Daily", r, refresh) }, "Review"))));
  weeklyList.replaceChildren((d.weekly || []).map((r) =>
    h("div", { class: "list-item" },
      h("div", { class: "avatar" }, initials(r.student)),
      h("div", { class: "grow" }, h("b", r.student), h("div", { class: "muted" }, "Week of " + fmtDate(r.week_start) + " · progress " + (r.progress || 0) + "%"),
        h("span", { class: "badge b-pending" }, "Pending review")),
      h("button", { class: "btn btn-sm btn-primary", onclick: () => reviewModal("Weekly", r, refresh) }, "Review"))));

  return h("div", { class: "grid grid-2" },
    fcard("Pending daily reports (" + (d.daily || []).length + ")",
      (d.daily || []).length ? dailyList : emptyState("All daily reports reviewed 🎉", "✅")),
    fcard("Pending weekly summaries (" + (d.weekly || []).length + ")",
      (d.weekly || []).length ? weeklyList : emptyState("All weekly summaries reviewed 🎉", "✅")));
}

/* ---------------- performance ---------------- */
function facultyPerformance(d) {
  const labels = (d.weeks || []).map((w) => fmtDate(w.week).slice(0, 6));
  return h("div", { class: "stack" },
    h("div", { class: "grid grid-3" },
      stat("Reports / week", d.weeks.reduce((a, w) => a + w.reports, 0), "Last 8 weeks", "accent", "file"),
      stat("Hours logged", d.weeks.reduce((a, w) => a + w.hours, 0), "Last 8 weeks", "emerald", "clock"),
      stat("Students reporting", Math.max(...(d.weeks.map((w) => w.students_reporting).concat([0]))), "Peak in a week", "amber", "users")),
    fcard("Reports submitted per week", barsChart(labels, d.weeks.map((w) => w.reports))),
    fcard("Hours logged per week", barsChart(labels, d.weeks.map((w) => w.hours), { color: "var(--emerald)" })),
    fcard("Students reporting per week", barsChart(labels, d.weeks.map((w) => w.students_reporting), { color: "var(--amber)" })));
}

/* ---------------- views ---------------- */
const facultyViews = {
  dashboard: (c) => fview(c, async () => facultyDashboard(await API.get("/faculty/dashboard"))),
  students: (c) => fview(c, async () => {
    const d = await API.get("/faculty/students");
    return fcard("My students (" + d.items.length + ")",
      h("div", { class: "flex-col" }, (d.items || []).map((s) => studentRow(s, () => openStudentDetail(s.id)))));
  }),
  reports: (c) => fview(c, async () => facultyReports(await API.get("/faculty/reports/pending"), c)),
  performance: (c) => fview(c, async () => facultyPerformance(await API.get("/faculty/performance"))),
};

bootShell("faculty", facultyViews);
