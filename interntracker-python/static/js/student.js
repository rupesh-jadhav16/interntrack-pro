/* ================= Student workspace ================= */
async function view(c, fn) {
  c.innerHTML = "";
  c.append(spinner());
  try { c.replaceChildren(await fn()); }
  catch (e) { c.replaceChildren(emptyState(e.message, "⚠️")); }
}

function card(title, body, headRight) {
  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h3", title), headRight || null),
    body);
}

function kvGrid(pairs) {
  return h("div", { class: "kv" }, pairs.flatMap(([k, v]) =>
    h("div", {}, h("div", { class: "k" }, k), h("div", { class: "v" }, v))));
}

function chips(list) {
  return h("div", { class: "flex", style: "gap:6px" },
    (list || []).map((s) => h("span", { class: "chip" }, s)));
}

function fillSelect(sel, items, selected) {
  sel.innerHTML = "";
  items.forEach(([v, label]) => sel.append(h("option", { value: v }, label)));
  sel.value = selected;
}

function load(c, path, params) {
  return view(c, async () => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const d = await API.get(path + qs);
    return render(d);
  });
}

/* ---------------- dashboard ---------------- */
function renderDashboard(d) {
  const s = d.stats;
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const enr = d.current_enrollment;

  const todayBody = h("div", { class: "flex-col" },
    h("div", { class: "alert " + (d.today_report_submitted ? "emerald" : "amber") },
      icon(d.today_report_submitted ? "check" : "file"),
      h("div", {}, h("b", d.today_report_submitted ? "Today's report submitted ✓" : "Today's daily report is pending"),
        h("span", { class: "muted" }, d.today_report_submitted ? "Streak continues. See you tomorrow!" : "It takes 2 minutes — don't break your streak.")),
      h("button", { class: "btn btn-sm " + (d.today_report_submitted ? "btn-ghost" : "btn-primary"), style: "margin-left:auto",
        onclick: () => { location.hash = "#/reports"; } }, d.today_report_submitted ? "View" : "Write report")),
    h("div", { class: "flex", style: "justify-content:space-between;gap:8px;flex-wrap:wrap" },
      h("div", { class: "flex", style: "gap:14px" },
        h("span", { class: "badge b-open" }, icon("flame"), "🔥 " + s.streak + " day streak"),
        h("span", { class: "badge b-verified" }, icon("check"), s.attendance_pct + "% attendance this week"),
        h("span", { class: "badge b-shortlisted" }, icon("trophy"), "Rank #" + s.college_rank + " of " + s.total_students)),
      h("a", { class: "btn btn-sm btn-soft", href: "#/leaderboard" }, "Leaderboard")));

  const enrCard = !enr
    ? card("Current internship", h("div", { class: "flex-col" },
        h("p", { class: "muted" }, "You're not tracking an internship yet. Activate your tracker to log attendance, reports and certificates."),
        h("button", { class: "btn btn-primary", onclick: () => { location.hash = "#/tracker"; } }, icon("flame"), "Activate tracker")))
    : card("Current internship", h("div", { class: "flex-col" },
        h("div", { class: "flex" }, h("div", { class: "avatar" }, initials(enr.company)), h("div", { class: "grow" },
          h("b", enr.role), h("div", { class: "muted" }, enr.company + " · " + enr.mode + (enr.location ? " · " + enr.location : "")))),
        h("div", { class: "kv" },
          ["Start", fmtDate(enr.start_date)], ["Ends", enr.end_date ? fmtDate(enr.end_date) + " (" + daysLeft(enr.end_date) + ")" : "—"],
          ["Mentor", enr.mentor || "—"], ["Type", enr.intern_type.replace(/_/g, " ")]),
        h("a", { class: "btn btn-soft btn-sm", style: "align-self:flex-start", href: "#/tracker" }, "Open tracker")));

  const stats = h("div", { class: "grid grid-4" },
    stat("Day streak", s.streak + " 🔥", "Longest " + s.longest_streak, "amber", "flame"),
    stat("Points", s.points, "College rank #" + s.college_rank + " · Dept #" + s.department_rank, "accent", "star"),
    stat("Attendance", s.attendance_pct + "%", "This week", "emerald", "calendar"),
    stat("Reports this week", s.reports_this_week + "/5", s.applications + " applications · " + s.saved + " saved", "sky", "file"));

  const deadlineList = (d.deadlines || []).slice(0, 4);
  const deadlinesCard = card("Deadlines",
    deadlineList.length ? h("div", { class: "flex-col" }, deadlineList.map((dd) => {
      const day = new Date(dd.date + "T00:00:00");
      return h("div", { class: "deadline-item " + dd.state },
        h("div", { class: "when" }, h("b", day.getDate()), h("span", day.toLocaleString(undefined, { month: "short" }))),
        h("div", { class: "grow" }, h("b", dd.title), h("div", { class: "muted" }, dd.kind.replace(/_/g, " ") + " · " + daysLeft(dd.date))),
        statusBadge(dd.state, dd.state.replace(/_/g, " ")));
    })) : emptyState("No deadlines right now", "🎉"),
    h("a", { class: "link", href: "#/deadlines", style: "font-size:12.5px;font-weight:600" }, "View all →"));

  const appsCard = card("Application pipeline",
    d.applications.length ? h("div", { class: "flex-col" },
      d.applications.map((a) => h("div", { class: "list-item", style: "flex-direction:column;align-items:stretch;gap:8px" },
        h("div", { class: "flex" }, h("div", { class: "grow" }, h("b", a.title), h("div", { class: "muted" }, a.company)),
          statusBadge(a.status)),
        stepper(a.status) || null)))
      : emptyState("No applications yet — explore internships to get started.", "🚀"),
    h("a", { class: "link", href: "#/applications", style: "font-size:12.5px;font-weight:600" }, "All applications →"));

  const heatCard = card("Consistency — last 12 weeks", heatmap(d.heatmap));

  return h("div", { class: "stack" },
    h("div", { class: "grid grid-2-1" },
      card(greet + ", " + d.profile.name.split(" ")[0] + " 👋", todayBody),
      enrCard),
    stats,
    h("div", { class: "grid grid-2-1" }, deadlinesCard, appsCard),
    heatCard);
}

/* ---------------- explorer ---------------- */
function renderExplorer(container, opts) {
  opts = opts || {};
  const search = h("input", { class: "input", placeholder: "Search internships…", value: opts.q || "" });
  const mode = h("select", { class: "select" });
  fillSelect(mode, [["", "Any mode"], ["remote", "Remote"], ["onsite", "On-site"], ["hybrid", "Hybrid"]], opts.mode || "");
  const paid = h("select", { class: "select" });
  fillSelect(paid, [["", "Any pay"], ["paid", "Paid"], ["unpaid", "Unpaid"]], opts.paid || "");
  const type = h("select", { class: "select" });
  fillSelect(type, [["", "Any type"], ["fulltime", "Full-time"], ["parttime", "Part-time"], ["summer", "Summer"], ["wfh", "Work-from-home"]], opts.intern_type || "");
  const verified = h("input", { type: "checkbox", id: "only-verified" });
  const sort = h("select", { class: "select" });
  fillSelect(sort, [["recent", "Most recent"], ["stipend", "Highest stipend"], ["deadline", "Closest deadline"]], opts.sort || "recent");

  const grid = h("div", { class: "grid grid-2" });
  async function run() {
    grid.replaceChildren(spinner());
    try {
      const params = { q: search.value, mode: mode.value, paid: paid.value, intern_type: type.value, sort: sort.value };
      if (verified.checked) params.verified_only = "true";
      const d = await API.get("/internships?" + new URLSearchParams(params));
      grid.replaceChildren(d.items.length
        ? d.items.map((i) => internshipCard(i))
        : emptyState("No internships match those filters.", "🔍"));
    } catch (e) { grid.replaceChildren(emptyState(e.message, "⚠️")); }
  }
  [search, mode, paid, type, sort].forEach((el) => el.addEventListener("change", run));
  search.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  verified.addEventListener("change", run);

  container.replaceChildren(
    h("div", { class: "toolbar" },
      h("div", { class: "grow" }, search), mode, paid, type, sort,
      h("label", { class: "flex", style: "gap:6px;font-size:12.5px;color:var(--ink-2);cursor:pointer" }, verified, "Verified companies only")),
    grid);
  run();
}

function internshipCard(i) {
  const saveBtn = h("button", { class: "btn btn-sm " + (i.saved ? "btn-soft" : "btn-ghost"),
    onclick: async (e) => { e.stopPropagation(); await toggleSave(i); } }, i.saved ? "Saved" : "Save");
  const applyBtn = i.applied
    ? statusBadge(i.applied_status)
    : h("button", { class: "btn btn-sm btn-primary", onclick: async (e) => {
        e.stopPropagation();
        try { await API.post("/internships/" + i.id + "/apply"); toast("Applied! 🎉", "success"); loadExplorerCard(applyBtn, i); }
        catch (err) { toast(err.message, "error"); }
      } }, "Apply");
  async function toggleSave(intern) {
    try {
      if (intern.saved) { await API.del("/internships/" + intern.id + "/save"); intern.saved = false; saveBtn.textContent = "Save"; saveBtn.className = "btn btn-sm btn-ghost"; }
      else { await API.post("/internships/" + intern.id + "/save"); intern.saved = true; saveBtn.textContent = "Saved"; saveBtn.className = "btn btn-sm btn-soft"; }
      toast(intern.saved ? "Saved to your list" : "Removed from saved", "success");
    } catch (e) { toast(e.message, "error"); }
  }
  function loadExplorerCard(btn, intern) { intern.applied = true; intern.applied_status = "applied"; btn.replaceWith(statusBadge("applied")); }

  return h("div", { class: "intern-card", onclick: () => openInternshipModal(i) },
    h("div", { class: "top" },
      h("div", { class: "co" }, h("div", { class: "co-logo" }, initials(i.company.name)),
        h("div", {}, h("h4", i.title),
          h("div", { class: "co-name" }, i.company.name, i.company.verified ? h("span", { class: "badge b-verified" }, icon("verified", 11), "Verified") : null))),
      h("div", { class: "flex", style: "gap:6px" }, saveBtn, applyBtn)),
    h("p", { class: "muted", style: "font-size:12.5px" }, (i.description || "").slice(0, 150) + (i.description && i.description.length > 150 ? "…" : "")),
    h("div", { class: "meta" },
      h("span", { class: "chip" }, i.mode), h("span", { class: "chip" }, icon("location", 12), i.location || "Remote"),
      h("span", { class: "chip" }, i.paid ? icon("money", 12) : "", i.stipend || (i.paid ? "Paid" : "Unpaid")),
      h("span", { class: "chip" }, i.duration)),
    h("div", { class: "foot" },
      h("span", { class: "muted", style: "font-size:12px" }, "Deadline " + fmtDate(i.deadline) + " · " + (i.skills || []).slice(0, 3).join(", ")),
      i.applied ? statusBadge(i.applied_status) : h("button", { class: "btn btn-sm btn-primary", onclick: async (e) => {
        e.stopPropagation();
        try { await API.post("/internships/" + i.id + "/apply"); toast("Applied! 🎉", "success"); }
        catch (err) { toast(err.message, "error"); }
      } }, "Apply now")));
}

async function openInternshipModal(i) {
  let detail = i;
  try { detail = await API.get("/internships/" + i.id); } catch (e) { /* use list data */ }
  const body = h("div", { class: "flex-col" },
    h("div", { class: "flex" }, h("div", { class: "co-logo" }, initials(detail.company.name)),
      h("div", {}, h("b", detail.company.name),
        h("div", { class: "muted" }, detail.company.verified ? "Verified company" : "Not yet verified"))),
    h("p", { class: "muted" }, detail.description),
    kvGrid([
      ["Mode", detail.mode], ["Location", detail.location || "Remote"],
      ["Stipend", detail.stipend || (detail.paid ? "Paid" : "Unpaid")], ["Duration", detail.duration],
      ["Type", detail.intern_type], ["Deadline", fmtDate(detail.deadline)],
      ["Domain", detail.domain || "—"], ["Posted", fmtDate(detail.posted_at)],
    ]),
    h("div", {}, h("div", { class: "k", style: "font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);font-weight:700;margin-bottom:6px" }, "Skills"),
      chips(detail.skills)),
    h("div", { class: "actions" },
      detail.applied ? statusBadge(detail.applied_status)
        : h("button", { class: "btn btn-primary", onclick: async () => {
            try { await API.post("/internships/" + detail.id + "/apply"); toast("Applied! 🎉", "success"); modal.close(); }
            catch (e) { toast(e.message, "error"); }
          } }, "Apply now")));
  const modal = modalBox("Internship details", body);
}

/* ---------------- applications ---------------- */
function renderApplications(d) {
  const rows = d.items.map((a) =>
    h("div", { class: "list-item", style: "flex-direction:column;align-items:stretch;gap:10px" },
      h("div", { class: "flex" },
        h("div", { class: "grow" }, h("b", a.title),
          h("div", { class: "muted" }, a.company + (a.verified ? " ✓ verified" : "") + " · " + a.mode + (a.location ? " · " + a.location : "")),
          h("div", { class: "muted", style: "font-size:11.5px" }, "Applied " + fmtDateTime(a.applied_at))),
        statusBadge(a.status)),
      stepper(a.status) || null,
      a.status === "interview" && a.interview_date
        ? h("div", { class: "alert sky" }, icon("calendar"), h("div", {}, h("b", "Interview scheduled"), "On " + fmtDate(a.interview_date)))
        : null,
      a.notes ? h("div", { class: "muted", style: "font-size:12.5px" }, a.notes) : null));
  return h("div", { class: "stack" }, rows.length ? rows : emptyState("You haven't applied to any internships yet.", "🚀"));
}

/* ---------------- tracker ---------------- */
function renderTracker(d) {
  const enr = d.enrollment;
  if (!enr) {
    return h("div", { class: "grid grid-2-1" },
      h("div", { class: "card" },
        h("h3", { style: "margin-bottom:6px" }, "Activate your internship tracker"),
        h("p", { class: "muted mb" }, "Track attendance, daily reports, streaks and certificates for your current internship. You can pick one of your applications or add an internship you found yourself."),
        h("div", { class: "flex" },
          h("button", { class: "btn btn-primary", onclick: openActivateModal }, icon("plus"), "Activate tracker"),
          h("a", { class: "btn btn-ghost", href: "#/internships" }, "Browse internships"))),
      card("How it works", h("div", { class: "flex-col" },
        h("div", { class: "flex" }, h("div", { class: "avatar" }, "1"), h("div", {}, h("b", "Activate"), h("div", { class: "muted" }, "Choose an internship or add your own"))),
        h("div", { class: "flex" }, h("div", { class: "avatar" }, "2"), h("div", {}, h("b", "Log daily"), h("div", { class: "muted" }, "Attendance + daily reports build your streak"))),
        h("div", { class: "flex" }, h("div", { class: "avatar" }, "3"), h("div", {}, h("b", "Complete & earn"), h("div", { class: "muted" }, "+500 points when you finish"))))));
  }
  return h("div", { class: "stack" },
    h("div", { class: "grid grid-2-1" },
      card("Active internship", h("div", { class: "flex-col" },
        h("div", { class: "flex" }, h("div", { class: "avatar lg" }, initials(enr.company)),
          h("div", { class: "grow" }, h("b", { style: "font-size:16px" }, enr.role),
            h("div", { class: "muted" }, enr.company + " · " + enr.intern_type.replace(/_/g, " ")))),
        kvGrid([
          ["Start date", fmtDate(enr.start_date)], ["End date", enr.end_date ? fmtDate(enr.end_date) + " · " + daysLeft(enr.end_date) : "—"],
          ["Mentor", enr.mentor || "—"], ["Mode", enr.mode + (enr.location ? " · " + enr.location : "")],
        ]),
        enr.offer_letter_url ? h("a", { class: "doc-pill", style: "align-self:flex-start", href: enr.offer_letter_url, target: "_blank" }, icon("link", 12), "Offer letter") : null)),
      h("div", { class: "card" },
        h("div", { class: "card-head" }, h("h3", "Progress")),
        h("div", { class: "flex-col" },
          h("div", { class: "kv" }, ["Days logged", enr.days_logged], ["Reports submitted", enr.reports]),
          h("div", { class: "divider" }),
          h("button", { class: "btn btn-success", onclick: () => completeEnrollment(enr.id) }, icon("check"), "Mark internship complete"),
          h("div", { class: "muted", style: "font-size:11.5px" }, "Completing earns +500 points and unlocks your certificate flow.")))),
    card("This week", h("div", { class: "flex" },
      h("a", { class: "btn btn-soft", href: "#/attendance" }, "Log attendance"),
      h("a", { class: "btn btn-soft", href: "#/reports" }, "Daily report"),
      h("a", { class: "btn btn-soft", href: "#/rewards" }, "Points & badges"))));

  function completeEnrollment(eid) {
    confirmModal("Complete internship?", "Mark your internship as completed? You'll earn +500 points.", async () => {
      try { await API.post("/student/enrollment/" + eid + "/complete"); toast("Internship completed 🎉 +500 pts", "success"); renderTrackerScreen(); }
      catch (e) { toast(e.message, "error"); }
    }, "Complete it");
  }
  function renderTrackerScreen() {
    view(container, async () => renderTracker(await API.get("/student/enrollment")));
  }
}

async function openActivateModal() {
  let apps = { items: [] };
  try { apps = await API.get("/student/applications"); } catch (e) { /* ignore */ }
  const pick = h("select", { class: "select" });
  fillSelect(pick, [["", "None — I found this internship myself"]].concat(
    apps.items.map((a) => [String(a.internship_id), a.title + " @ " + a.company])), "");

  const form = h("form", { onsubmit: (e) => e.preventDefault() },
    h("div", { class: "field" }, h("label", "Linked application (optional)"), pick),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Company name *"), h("input", { class: "input", id: "act-co", placeholder: "e.g. TechFlow Systems", required: true })),
      h("div", { class: "field" }, h("label", "Role"), h("input", { class: "input", id: "act-role", placeholder: "e.g. SDE Intern" }))),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Start date"), h("input", { class: "input", id: "act-start", type: "date" })),
      h("div", { class: "field" }, h("label", "End date"), h("input", { class: "input", id: "act-end", type: "date" }))),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Mode"),
        h("select", { class: "select", id: "act-mode" }, h("option", { value: "remote" }, "Remote"), h("option", { value: "onsite" }, "On-site"), h("option", { value: "hybrid" }, "Hybrid"))),
      h("div", { class: "field" }, h("label", "Type"),
        h("select", { class: "select", id: "act-type" }, h("option", { value: "off_campus" }, "Off-campus"), h("option", { value: "on_campus" }, "On-campus"), h("option", { value: "college_provided" }, "College provided"), h("option", { value: "self_found" }, "Self-found")))),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Location"), h("input", { class: "input", id: "act-loc", placeholder: "Bengaluru (Remote)" })),
      h("div", { class: "field" }, h("label", "Mentor / supervisor"), h("input", { class: "input", id: "act-mentor", placeholder: "Ms. Ananya Gupta" }))),
    h("div", { class: "field" }, h("label", "Offer letter (optional)"),
      h("div", { class: "flex" }, h("input", { class: "input grow", id: "act-letter", placeholder: "Paste a URL or upload below" }),
        h("button", { type: "button", class: "btn btn-ghost", onclick: async (ev) => {
          const f = h("input", { type: "file" });
          f.onchange = async () => {
            try { const u = await API.upload(f.files[0]); document.getElementById("act-letter").value = u; toast("Uploaded", "success"); }
            catch (e) { toast(e.message, "error"); }
          };
          f.click();
        } }, "Upload"))),
    h("div", { class: "actions" },
      h("button", { class: "btn btn-ghost", onclick: () => m.close() }, "Cancel"),
      h("button", { class: "btn btn-primary", type: "submit", onclick: activate }, "Activate tracker")));

  const m = modalBox("Activate internship tracker", form);

  pick.addEventListener("change", () => {
    if (pick.value) {
      const app = apps.items.find((a) => String(a.internship_id) === pick.value);
      if (app) { document.getElementById("act-co").value = app.company; document.getElementById("act-role").value = app.title; }
    }
  });

  async function activate() {
    const body = {
      internship_id: pick.value ? parseInt(pick.value, 10) : null,
      company_name: document.getElementById("act-co").value,
      role: document.getElementById("act-role").value,
      start_date: document.getElementById("act-start").value || null,
      end_date: document.getElementById("act-end").value || null,
      mentor: document.getElementById("act-mentor").value,
      mode: document.getElementById("act-mode").value,
      location: document.getElementById("act-loc").value,
      intern_type: document.getElementById("act-type").value,
      offer_letter_url: document.getElementById("act-letter").value,
    };
    try {
      await API.post("/student/tracker/activate", body);
      toast("Tracker activated! 🔥", "success");
      m.close();
      location.hash = "#/tracker";
    } catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- attendance ---------------- */
function renderAttendance(d, opts) {
  opts = opts || {};
  const year = opts.year || new Date().getFullYear();
  const month = opts.month || new Date().getMonth() + 1;
  const byDate = {};
  (d.items || []).forEach((a) => { byDate[a.date] = a; });

  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const dim = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= dim; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);

  const body = h("div", { class: "flex-col" },
    h("div", { class: "flex", style: "justify-content:space-between" },
      h("button", { class: "btn btn-ghost btn-sm", onclick: () => { renderAttendance(container, { year: month === 1 ? year - 1 : year, month: month === 1 ? 12 : month - 1 }); } }, "← " + new Date(year, month - 2, 1).toLocaleString(undefined, { month: "long" })),
      h("b", new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })),
      h("button", { class: "btn btn-ghost btn-sm", onclick: () => { renderAttendance(container, { year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1 }); } }, new Date(year, month, 1).toLocaleString(undefined, { month: "long" }) + " →")),
    h("div", { class: "cal" },
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => h("div", { class: "dow" }, x)),
      cells.map((day) => {
        if (!day) return h("div", { class: "day out" });
        const ds = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        const rec = byDate[ds];
        const cls = rec ? (rec.status === "present" ? "present" : rec.status) : "";
        return h("div", { class: "day " + cls + (ds === todayStr ? " today" : "") },
          h("div", { class: "num" }, day),
          rec ? h("div", { class: "tag" }, rec.status === "present" ? "✓ " + (rec.hours || 0) + "h" : rec.status) : null);
      })));

  const today = byDate[todayStr] || { status: "present" };
  const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); submitAtt(); return false; } },
    h("div", { class: "card-head" }, h("h3", "Log today"), h("span", { class: "badge b-" + (today.status === "present" ? "present" : today.status === "absent" ? "absent" : "open") }, (today.status || "not logged").replace(/_/g, " "))),
    h("div", { class: "row-3" },
      h("div", { class: "field" }, h("label", "Status"),
        h("select", { class: "select", id: "att-status" }, h("option", { value: "present" }, "Present"), h("option", { value: "absent" }, "Absent"), h("option", { value: "leave" }, "Leave"), h("option", { value: "holiday" }, "Holiday"))),
      h("div", { class: "field" }, h("label", "Check in"), h("input", { class: "input", id: "att-in", type: "time", value: today.check_in || "09:30" })),
      h("div", { class: "field" }, h("label", "Check out"), h("input", { class: "input", id: "att-out", type: "time", value: today.check_out || "18:00" }))),
    h("div", { class: "field" }, h("label", "What did you work on today?"), h("textarea", { class: "textarea", id: "att-sum", placeholder: "Built the reporting module, wrote tests…" }, today.summary || "")),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, icon("check"), "Save attendance")));

  async function submitAtt() {
    const status = document.getElementById("att-status").value;
    const body = {
      date: todayStr, status,
      check_in: document.getElementById("att-in").value, check_out: document.getElementById("att-out").value,
      hours: status === "present" ? 8 : 0,
      summary: document.getElementById("att-sum").value,
      tasks: document.getElementById("att-sum").value.split(/[.,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5),
    };
    try { await API.post("/student/attendance", body); toast("Attendance saved", "success"); refresh(); }
    catch (e) { toast(e.message, "error"); }
  }
  function refresh() {
    view(container, async () => renderAttendance(await API.get("/student/attendance?year=" + year + "&month=" + month), { year, month }));
  }
  container.replaceChildren(
    h("div", { class: "grid grid-1-2" }, form, card("Monthly calendar", body)));
}

/* ---------------- reports ---------------- */
function renderReports(container) {
  const dailyWrap = h("div", { class: "grid grid-1-2" });
  const weeklyWrap = h("div", { class: "grid grid-1-2" });
  const tabs = h("div", { class: "tab-bar" },
    h("button", { class: "active", onclick: () => { show("daily"); } }, "Daily reports"),
    h("button", { onclick: () => { show("weekly"); } }, "Weekly summary"));
  function show(which) {
    tabs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (which === "daily" && i === 0) || (which === "weekly" && i === 1)));
    dailyWrap.style.display = which === "daily" ? "" : "none";
    weeklyWrap.style.display = which === "weekly" ? "" : "none";
  }

  // daily
  API.get("/student/reports/daily").then((d) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = d.items.find((r) => r.date === todayStr);
    const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); submitDaily(); return false; } },
      h("div", { class: "card-head" }, h("h3", existing ? "Today's report" : "New daily report"),
        existing ? statusBadge(existing.status) : null),
      h("div", { class: "row-2" },
        h("div", { class: "field" }, h("label", "Date"), h("input", { class: "input", id: "dr-date", type: "date", value: todayStr })),
        h("div", { class: "field" }, h("label", "Hours worked"), h("input", { class: "input", id: "dr-hours", type: "number", step: "0.5", min: "0", value: existing ? existing.hours : "8" }))),
      h("div", { class: "field" }, h("label", "Tasks completed today"), h("textarea", { class: "textarea", id: "dr-tasks", placeholder: "• Built REST endpoints for user module\n• Wrote unit tests" }, existing ? existing.tasks : "")),
      h("div", { class: "field" }, h("label", "What did you learn?"), h("textarea", { class: "textarea", id: "dr-learned" }, existing ? existing.learned : "")),
      h("div", { class: "row-2" },
        h("div", { class: "field" }, h("label", "Problems faced"), h("textarea", { class: "textarea", id: "dr-problems" }, existing ? existing.problems : "")),
        h("div", { class: "field" }, h("label", "Plan for tomorrow"), h("textarea", { class: "textarea", id: "dr-plan" }, existing ? existing.plan : ""))),
      h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, icon("send"), "Submit report")));

    const rows = (d.items || []).map((r) => h("tr",
      h("td", { class: "cell-main" }, fmtDate(r.date)),
      h("td", { class: "cell-sub" }, (r.tasks || "").slice(0, 70)),
      h("td", r.hours + "h"),
      h("td", statusBadge(r.status))));
    const list = card("History (" + d.items.length + ")", h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Date", "Tasks", "Hours", "Status"].map((x) => h("th", x)))),
        h("tbody", rows))));

    dailyWrap.replaceChildren(form, list);

    async function submitDaily() {
      const body = {
        date: document.getElementById("dr-date").value,
        hours: parseFloat(document.getElementById("dr-hours").value) || 0,
        tasks: document.getElementById("dr-tasks").value,
        learned: document.getElementById("dr-learned").value,
        problems: document.getElementById("dr-problems").value,
        plan: document.getElementById("dr-plan").value,
      };
      if (!body.tasks.trim()) { toast("Add at least one task", "error"); return; }
      try {
        const res = await API.post("/student/reports/daily", body);
        toast(res.points_earned ? "Report submitted! +" + res.points_earned + " pts 🔥" : "Report updated", "success");
        location.reload();
      } catch (e) { toast(e.message, "error"); }
    }
  }).catch((e) => dailyWrap.replaceChildren(emptyState(e.message, "⚠️")));

  // weekly
  API.get("/student/reports/weekly").then((d) => {
    const src = d.submitted || d.draft;
    const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); submitWeekly(); return false; } },
      h("div", { class: "card-head" }, h("h3", d.submitted ? "This week's summary" : "Auto-drafted summary"),
        d.submitted ? statusBadge(d.submitted.status) : h("span", { class: "badge b-pending" }, "Not submitted")),
      d.submitted && d.submitted.feedback ? h("div", { class: "alert sky mb" }, icon("bell"), h("div", {}, h("b", "Faculty feedback"), d.submitted.feedback)) : null,
      h("input", { type: "hidden", id: "wr-week", value: src.week_start }),
      h("div", { class: "row-3" },
        h("div", { class: "field" }, h("label", "Days worked"), h("input", { class: "input", id: "wr-days", type: "number", min: "0", value: src.total_days })),
        h("div", { class: "field" }, h("label", "Attendance %"), h("input", { class: "input", id: "wr-att", type: "number", min: "0", max: "100", value: src.attendance_pct })),
        h("div", { class: "field" }, h("label", "Total hours"), h("input", { class: "input", id: "wr-hours", type: "number", step: "0.5", value: src.total_hours }))),
      h("div", { class: "field" }, h("label", "Work completed this week"), h("textarea", { class: "textarea", id: "wr-tasks" }, src.tasks || "")),
      h("div", { class: "row-2" },
        h("div", { class: "field" }, h("label", "Skills practiced"), h("input", { class: "input", id: "wr-skills", value: src.skills || "" })),
        h("div", { class: "field" }, h("label", "Problems / blockers"), h("textarea", { class: "textarea", id: "wr-problems" }, src.problems || ""))),
      h("div", { class: "field" }, h("label", "Overall progress this week (0-100)"),
        h("input", { class: "input", id: "wr-prog", type: "range", min: "0", max: "100", value: src.progress || 0 }),
        h("div", { class: "hint" }, "Project completion estimate for the week.")),
      h("div", { class: "actions" }, d.submitted ? null : h("button", { class: "btn btn-primary", type: "submit" }, icon("send"), "Submit weekly summary")));

    const wrows = (d.history || []).map((r) => h("tr",
      h("td", { class: "cell-main" }, fmtDate(r.week_start)),
      h("td", r.attendance_pct + "%"),
      h("td", r.total_hours + "h"),
      h("td", h("div", { style: "min-width:90px" }, progressBar(r.progress, r.progress > 60 ? "emerald" : r.progress > 30 ? "amber" : "rose"), h("span", { class: "muted", style: "font-size:11px" }, r.progress + "%"))),
      h("td", statusBadge(r.status))));
    const list = card("Weekly history", h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Week of", "Attendance", "Hours", "Progress", "Status"].map((x) => h("th", x)))),
        h("tbody", wrows))));

    weeklyWrap.replaceChildren(form, list);

    async function submitWeekly() {
      const body = {
        week_start: document.getElementById("wr-week").value,
        total_days: parseInt(document.getElementById("wr-days").value) || 0,
        attendance_pct: parseFloat(document.getElementById("wr-att").value) || 0,
        total_hours: parseFloat(document.getElementById("wr-hours").value) || 0,
        tasks: document.getElementById("wr-tasks").value,
        skills: document.getElementById("wr-skills").value,
        problems: document.getElementById("wr-problems").value,
        progress: parseInt(document.getElementById("wr-prog").value) || 0,
      };
      try { await API.post("/student/reports/weekly", body); toast("Weekly summary submitted! +50 pts", "success"); location.reload(); }
      catch (e) { toast(e.message, "error"); }
    }
  }).catch((e) => weeklyWrap.replaceChildren(emptyState(e.message, "⚠️")));

  container.replaceChildren(tabs, h("div", { class: "stack" }, dailyWrap, weeklyWrap));
}

/* ---------------- deadlines ---------------- */
function renderDeadlines(d) {
  const groups = {
    overdue: { label: "Overdue", items: [] },
    due_today: { label: "Due today", items: [] },
    upcoming: { label: "Upcoming", items: [] },
  };
  (d.deadlines || []).forEach((dd) => { if (groups[dd.state]) groups[dd.state].items.push(dd); });
  return h("div", { class: "stack" },
    ["overdue", "due_today", "upcoming"].map((key) => {
      const g = groups[key];
      return card(g.label + (g.items.length ? " (" + g.items.length + ")" : ""),
        g.items.length ? h("div", { class: "flex-col" }, g.items.map((dd) => {
          const day = new Date(dd.date + "T00:00:00");
          return h("div", { class: "deadline-item " + key },
            h("div", { class: "when" }, h("b", day.getDate()), h("span", day.toLocaleString(undefined, { month: "short" }))),
            h("div", { class: "grow" }, h("b", dd.title), h("div", { class: "muted" }, dd.kind.replace(/_/g, " ") + " · " + daysLeft(dd.date))));
        })) : emptyState("Nothing " + g.label.toLowerCase(), "✅"));
    }));
}

/* ---------------- leaderboard ---------------- */
function renderLeaderboard(d, opts) {
  opts = opts || {};
  const dept = h("select", { class: "select" });
  const depts = ["", "Computer Science", "Electronics", "Mechanical"].concat(
    d.items.map((i) => i.department).filter((x, idx, arr) => x && arr.indexOf(x) === idx));
  fillSelect(dept, depts.map((x) => [x, x || "All departments"]), opts.department || "");
  dept.addEventListener("change", () => {
    view(container, async () => renderLeaderboard(await API.get("/leaderboard?department=" + encodeURIComponent(dept.value)), { department: dept.value }));
  });
  const medal = (rank) => rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain";
  const rows = d.items.map((r) =>
    h("tr",
      h("td", h("span", { class: "medal " + medal(r.rank) }, r.rank)),
      h("td", { class: "flex", style: "gap:10px" }, h("div", { class: "avatar" }, initials(r.name)), h("div", {}, h("div", { class: "cell-main" }, r.name), h("div", { class: "cell-sub" }, r.department + " · " + (r.branch || "") + " · Year " + r.year))),
      h("td", r.points + " pts"),
      h("td", h("span", { class: "badge b-amber", style: "background:var(--amber-soft);color:var(--amber)" }, "🔥 " + r.streak)),
      h("td", r.cgpa || "—"),
      h("td", r.badges + " badges")));
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "College leaderboard — points from reports, streaks and completion"), dept),
    h("div", { class: "card pad-0" }, h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Rank", "Student", "Points", "Streak", "CGPA", "Badges"].map((x) => h("th", x)))),
        h("tbody", rows)))));
}

/* ---------------- rewards ---------------- */
function renderRewards(d) {
  const ALL_BADGES = [
    ["First Report", "Submit your first report", "📝"], ["7 Day Streak", "7 days of reports", "🔥"],
    ["30 Day Streak", "A full month of consistency", "⚡"], ["60 Day Streak", "Two months strong", "💪"],
    ["100 Day Streak", "Elite consistency", "🏆"], ["Consistent Intern", "250 points earned", "📈"],
    ["Report Master", "600 points earned", "🧠"], ["Internship Champion", "1000 points earned", "🥇"],
    ["Top Performer", "1500 points earned", "👑"],
  ];
  const have = d.badges || [];
  const badges = ALL_BADGES.map(([name, desc, emoji]) =>
    h("div", { class: "badge-tile" + (have.includes(name) ? "" : " locked") },
      h("div", { class: "ico" }, emoji),
      h("div", {}, h("b", name + (have.includes(name) ? " ✓" : "")), h("small", desc))));

  const pointsCard = card("Points & milestones", h("div", { class: "flex-col" },
    h("div", { class: "flex", style: "gap:20px" },
      h("div", {}, h("div", { style: "font-size:34px;font-weight:800" }, d.points), h("div", { class: "muted" }, "Total points")),
      h("div", { class: "grow" },
        d.next_milestone
          ? h("div", {}, h("div", { class: "muted mb" }, "Next milestone: " + d.next_milestone + " pts"), progressBar(d.progress_to_next, "amber"), h("div", { class: "muted mt", style: "font-size:11.5px" }, d.points + " / " + d.next_milestone + " pts"))
          : h("div", { class: "alert emerald" }, icon("trophy"), h("div", {}, h("b", "You've hit every milestone!"), "Keep going — the leaderboard awaits.")))),
    h("div", { class: "divider" }),
    h("div", { class: "kv" },
      ["Daily report", "+10 pts"], ["Weekly summary", "+50 pts"], ["7/14/30 day streaks", "+50/100/200 pts"], ["Internship completion", "+500 pts"])));

  const logList = (d.logs || []).length
    ? h("div", { class: "timeline" }, (d.logs || []).map((l) =>
        h("div", { class: "tl-item" },
          h("b", "+" + l.points + " pts · " + l.reason),
          h("p", fmtDateTime(l.created_at)))))
    : emptyState("No points yet", "🌱");
  const logsCard = card("Recent points", logList);
  const badgesCard = card("Badges", h("div", { class: "badge-grid" }, badges));

  return h("div", { class: "stack" },
    h("div", { class: "grid grid-2-1" }, pointsCard, logsCard),
    badgesCard);
}

/* ---------------- certificates ---------------- */
function renderCertificates(d) {
  const list = card("Your certificates (" + d.items.length + ")",
    d.items.length ? h("div", { class: "flex-col" }, d.items.map((c) =>
      h("div", { class: "list-item" },
        h("div", { class: "avatar" }, icon("shield")),
        h("div", { class: "grow" },
          h("b", c.title), h("div", { class: "muted" }, c.company_name + " · " + c.cert_type + " · submitted " + fmtDate(c.created_at)),
          h("div", { class: "muted", style: "font-size:11.5px" }, "Authenticity score " + c.score + "/100" +
            (c.indicators.length ? " · " + c.indicators.slice(0, 2).join("; ") : ""))),
        statusBadge(c.status),
        c.file_url ? h("a", { class: "btn btn-sm btn-ghost", href: c.file_url, target: "_blank" }, "View") : null)))
      : emptyState("No certificates yet. Upload one to get it verified.", "📜"));

  const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); submitCert(); return false; } },
    h("div", { class: "card-head" }, h("h3", "Verify a certificate")),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Certificate title *"), h("input", { class: "input", id: "cf-title", required: true, placeholder: "Internship Completion Certificate" })),
      h("div", { class: "field" }, h("label", "Type"),
        h("select", { class: "select", id: "cf-type" }, h("option", { value: "internship" }, "Internship"), h("option", { value: "offer" }, "Offer letter"), h("option", { value: "completion" }, "Completion"), h("option", { value: "experience" }, "Experience")))),      h("div", { class: "field" }, h("label", "Company name"), h("input", { class: "input", id: "cf-co", placeholder: "TechFlow Systems" })),
    h("div", { class: "field" }, h("label", "Certificate file (PDF / image)"),
      h("div", { class: "flex" }, h("input", { class: "input grow", id: "cf-file", placeholder: "No file attached" }),
        h("button", { type: "button", class: "btn btn-ghost", onclick: (ev) => {
          const f = h("input", { type: "file" });
          f.onchange = async () => {
            try { const u = await API.upload(f.files[0]); document.getElementById("cf-file").value = u; toast("File uploaded", "success"); }
            catch (e) { toast(e.message, "error"); }
          };
          f.click();
        } }, "Upload"))),
    h("div", { class: "field" }, h("label", "Notes (duration, role, details…)"), h("textarea", { class: "textarea", id: "cf-notes", placeholder: "Completed 6 month software engineering internship…" })),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, icon("shield"), "Run verification")));

  async function submitCert() {
    const body = {
      title: document.getElementById("cf-title").value,
      cert_type: document.getElementById("cf-type").value,
      company_name: document.getElementById("cf-co").value,
      file_url: document.getElementById("cf-file").value,
      notes: document.getElementById("cf-notes").value,
    };
    try {
      const res = await API.post("/student/certificates", body);
      const emoji = res.status === "verified" ? "🟢" : res.status === "review" ? "🟡" : "🔴";
      const m = modalBox("Verification result", h("div", { class: "flex-col" },
        h("div", { class: "alert " + (res.status === "verified" ? "emerald" : res.status === "review" ? "amber" : "rose") },
          h("b", emoji + " " + res.status + " — score " + res.score + "/100"),
          res.status === "verified" ? "This certificate passed our authenticity checks." : res.status === "review" ? "Needs a quick manual review by the T&P cell." : "Flagged as suspicious — the T&P cell will review it."),
        h("div", {}, h("div", { class: "k", style: "font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);font-weight:700;margin-bottom:6px" }, "Checks performed"),
          h("div", { class: "flex-col" }, res.indicators.map((x) => h("div", { class: "flex" }, icon("check"), h("span", { class: "grow" }, x))))),
        h("div", { class: "actions" }, h("button", { class: "btn btn-primary", onclick: () => { m.close(); location.reload(); } }, "Done"))));
    } catch (e) { toast(e.message, "error"); }
  }

  return h("div", { class: "grid grid-1-2" }, form, list);
}

/* ---------------- profile ---------------- */
function renderProfile(d) {
  const info = card("About", h("div", { class: "flex-col" },
    h("div", { class: "flex" }, h("div", { class: "avatar lg" }, d.photo_url ? null : initials(d.name)),
      h("div", { class: "grow" }, h("b", { style: "font-size:17px" }, d.name), h("div", { class: "muted" }, d.email + " · " + (d.branch || d.department || "Student"))),
      h("div", { style: "text-align:right" }, h("div", { style: "font-size:20px;font-weight:800" }, d.points + " pts"), h("div", { class: "muted" }, "🔥 " + d.streak + " day streak"))),
    kvGrid([
      ["College", d.college], ["Department", d.department], ["Branch", d.branch], ["Year / Sem", d.year + " / " + d.semester],
      ["CGPA", d.cgpa || "—"], ["Applications", d.applications], ["Attendance", d.attendance_pct + "%"], ["Mentor", d.mentor ? d.mentor.name : "Not assigned"],
    ]),
    d.bio ? h("p", { class: "muted" }, d.bio) : null,
    chips(d.skills),
    h("div", { class: "divider" }),
    h("div", { class: "flex" },
      d.resume_url ? h("a", { class: "btn btn-ghost btn-sm", href: d.resume_url, target: "_blank" }, icon("doc"), "View resume") : null,
      h("span", { class: "badge b-verified" }, d.badges.length + " badges earned"))));

  const edit = card("Edit profile", h("form", { onsubmit: (e) => { e.preventDefault(); save(); return false; } },
    h("div", { class: "field" }, h("label", "Bio"), h("textarea", { class: "textarea", id: "pf-bio" }, d.bio || "")),
    h("div", { class: "field" }, h("label", "Skills (comma separated)"), h("input", { class: "input", id: "pf-skills", value: (d.skills || []).join(", ") })),
    h("div", { class: "row-3" },
      h("div", { class: "field" }, h("label", "Year"), h("select", { class: "select", id: "pf-year" }, ["1", "2", "3", "4"].map((y) => h("option", { value: y, selected: d.year === y }, y + (y === "1" ? "st" : y === "2" ? "nd" : y === "3" ? "rd" : "th"))))),
      h("div", { class: "field" }, h("label", "Semester"), h("select", { class: "select", id: "pf-sem" }, ["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => h("option", { value: s, selected: d.semester === s }, s)))),
      h("div", { class: "field" }, h("label", "CGPA"), h("input", { class: "input", id: "pf-cgpa", type: "number", step: "0.01", min: "0", max: "10", value: d.cgpa || "" }))),
    h("div", { class: "field" }, h("label", "Resume (upload or URL)"),
      h("div", { class: "flex" }, h("input", { class: "input grow", id: "pf-resume", value: d.resume_url || "" }),
        h("button", { type: "button", class: "btn btn-ghost", onclick: (ev) => {
          const f = h("input", { type: "file" });
          f.onchange = async () => {
            try { const u = await API.upload(f.files[0]); document.getElementById("pf-resume").value = u; toast("Uploaded", "success"); }
            catch (e) { toast(e.message, "error"); }
          };
          f.click();
        } }, "Upload"))),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, "Save changes"))));

  async function save() {
    const body = {
      bio: document.getElementById("pf-bio").value,
      skills: document.getElementById("pf-skills").value.split(",").map((s) => s.trim()).filter(Boolean),
      year: document.getElementById("pf-year").value,
      semester: document.getElementById("pf-sem").value,
      cgpa: parseFloat(document.getElementById("pf-cgpa").value) || 0,
      resume_url: document.getElementById("pf-resume").value,
    };
    try { await API.patch("/student/profile", body); toast("Profile updated", "success"); location.reload(); }
    catch (e) { toast(e.message, "error"); }
  }

  const internships = card("Internship history",
    d.internships.length ? h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Company", "Role", "Start", "End", "Status"].map((x) => h("th", x)))),
        h("tbody", d.internships.map((i) => h("tr",
          h("td", { class: "cell-main" }, i.company), h("td", i.role),
          h("td", fmtDate(i.start_date)), h("td", fmtDate(i.end_date)), h("td", statusBadge(i.status)))))))
    : emptyState("No internships yet", "🌱"));

  const certs = card("Verified certificates",
    d.certificates.length ? h("div", { class: "flex-col" }, d.certificates.map((c) =>
      h("div", { class: "list-item" }, h("div", { class: "grow" }, h("b", c.title), h("div", { class: "muted" }, c.company)), statusBadge(c.status))))
      : emptyState("Nothing yet", "📜"));

  return h("div", { class: "stack" }, h("div", { class: "grid grid-2-1" }, info, edit), h("div", { class: "grid grid-2" }, internships, certs));
}

/* ---------------- modal helper ---------------- */
function modalBox(title, bodyEl) {
  const backdrop = h("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) close(); } });
  const box = h("div", { class: "modal wide" },
    h("button", { class: "close", onclick: close, html: "&times;" }),
    h("h2", title), h("div", { class: "mt" }, bodyEl));
  function close() { backdrop.remove(); }
  backdrop.append(box);
  document.body.append(backdrop);
  return { close, box };
}

/* ---------------- views ---------------- */
let container = null;

const studentViews = {
  dashboard: (c) => view(c, async () => renderDashboard(await API.get("/student/dashboard"))),
  internships: (c) => { container = c; renderExplorer(c); },
  applications: (c) => view(c, async () => renderApplications(await API.get("/student/applications"))),
  tracker: (c) => { container = c; view(c, async () => renderTracker(await API.get("/student/enrollment"))); },
  attendance: (c) => { container = c; view(c, async () => renderAttendance(await API.get("/student/attendance?year=" + new Date().getFullYear() + "&month=" + (new Date().getMonth() + 1)), {})); },
  reports: (c) => { container = c; renderReports(c); },
  deadlines: (c) => view(c, async () => renderDeadlines(await API.get("/student/dashboard"))),
  leaderboard: (c) => { container = c; view(c, async () => renderLeaderboard(await API.get("/leaderboard"), {})); },
  rewards: (c) => view(c, async () => renderRewards(await API.get("/student/rewards"))),
  certificates: (c) => view(c, async () => renderCertificates(await API.get("/student/certificates"))),
  profile: (c) => view(c, async () => renderProfile(await API.get("/student/profile"))),
};

bootShell("student", studentViews);
