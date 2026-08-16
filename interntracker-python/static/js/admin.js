/* ================= T&P Cell / Admin workspace ================= */
async function aview(c, fn) {
  c.innerHTML = "";
  c.append(spinner());
  try { c.replaceChildren(await fn()); }
  catch (e) { c.replaceChildren(emptyState(e.message, "⚠️")); }
}

function acard(title, body, headRight) {
  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h3", title), headRight || null), body);
}

/* ---------------- dashboard ---------------- */
function adminDashboard(d) {
  const s = d.stats;
  const stats = h("div", { class: "grid grid-4" },
    stat("Students", s.students, s.students_at_risk + " at risk", "accent", "users"),
    stat("Companies", s.companies, s.verified_companies + " verified", "emerald", "building"),
    stat("Pending verification", s.pending_verification, "Queue to review", "amber", "shield"),
    stat("Applications", s.applications, s.open_internships + " open internships", "sky", "briefcase"),
    stat("Active internships", s.active_internships, s.completed_internships + " completed", "emerald", "flame"),
    stat("Certificates to review", s.certificates_pending, null, "rose", "qr"),
    stat("Reports today", s.reports_today, null, "violet", "file"),
    stat("Attendance", s.attendance_pct + "%", "College-wide", "sky", "calendar"));

  const bars = h("div", { class: "flex-col" },
    (d.applications_by_status || []).map((x) =>
      h("div", { class: "flex", style: "gap:10px" },
        h("span", { style: "width:110px;font-size:12.5px;color:var(--ink-2)" }, x.status.replace(/_/g, " ")),
        h("div", { class: "grow" }, progressBar(Math.min(100, (x.count / Math.max(1, Math.max(...d.applications_by_status.map((y) => y.count)))) * 100))),
        h("b", { style: "width:28px;text-align:right" }, x.count))));

  const actItems = (d.recent_activity || []).map((l) => {
    const body = h("div", { class: "grow" },
      h("b", l.action.replace(/\./g, " ")),
      h("div", { class: "muted" }, l.detail),
      h("time", { class: "muted", style: "font-size:11px" }, fmtDateTime(l.created_at)));
    return h("div", { class: "list-item" }, h("div", { class: "avatar" }, "•"), body);
  });
  const activity = h("div", { class: "flex-col" }, actItems);

  return h("div", { class: "stack" },
    h("div", { class: "alert sky" }, icon("megaphone"),
      h("div", { class: "grow" }, h("b", "Welcome back, T&P Cell"), "Here's what's happening with internships across the college today."),
      h("a", { class: "btn btn-sm btn-soft", href: "#/announcements" }, "Announce")),
    stats,
    h("div", { class: "grid grid-2-1" },
      acard("Applications by stage", bars),
      acard("Recent activity", activity.length ? activity : emptyState("No activity yet", "🕒"))));
}

/* ---------------- students ---------------- */
function adminStudents(d, c) {
  const q = h("input", { class: "input", placeholder: "Search students…" });
  const refresh = () => aview(c, async () => adminStudents(await API.get("/admin/students?q=" + encodeURIComponent(q.value)), c));
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); });
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("div", { class: "grow" }, q), h("span", { class: "muted" }, d.items.length + " students")),
    acard("All students", h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Student", "Dept / Year", "CGPA", "Streak", "Points", "Internship", "Mentor", ""].map((x) => h("th", x)))),
        h("tbody", d.items.map((st) => h("tr",
          h("td", h("div", { class: "flex", style: "gap:10px" }, h("div", { class: "avatar" }, initials(st.name)), h("div", {}, h("div", { class: "cell-main" }, st.name), h("div", { class: "cell-sub" }, st.email)))),
          h("td", (st.branch || st.department) + " · Y" + st.year),
          h("td", st.cgpa || "—"),
          h("td", "🔥 " + st.streak),
          h("td", st.points),
          h("td", st.active_internship || h("span", { class: "muted" }, "—")),
          h("td", st.mentor || h("span", { class: "muted" }, "None")),
          h("td", h("button", { class: "btn btn-sm btn-ghost", onclick: () => mentorModal(st, refresh) }, "Assign mentor")))))))));
}

async function mentorModal(st, onDone) {
  let faculty = { items: [] };
  try { faculty = await API.get("/admin/faculty"); } catch (e) { /* ignore */ }
  const sel = h("select", { class: "select" });
  sel.append(h("option", { value: "" }, "— No mentor —"));
  faculty.items.forEach((f) => sel.append(h("option", { value: f.id, selected: st.mentor_id === f.id }, f.name + " (" + f.students + " students)")));
  const m = modal("Assign mentor — " + st.name, h("div", { class: "flex-col" },
    h("div", { class: "field" }, h("label", "Faculty mentor"), sel),
    h("div", { class: "actions" },
      h("button", { class: "btn btn-ghost", onclick: () => m.close() }, "Cancel"),
      h("button", { class: "btn btn-primary", onclick: async () => {
        try { await API.patch("/admin/students/" + st.id + "/mentor", { mentor_id: sel.value ? parseInt(sel.value, 10) : null }); toast("Mentor updated", "success"); m.close(); onDone(); }
        catch (e) { toast(e.message, "error"); }
      } }, "Save"))));
}

/* ---------------- faculty ---------------- */
function adminFaculty(d) {
  return acard("Faculty & mentors", h("div", { class: "table-wrap" },
    h("table", { class: "table" },
      h("thead", h("tr", ["Name", "Email", "Assigned students"].map((x) => h("th", x)))),
      h("tbody", d.items.map((f) => h("tr",
        h("td", h("div", { class: "flex", style: "gap:10px" }, h("div", { class: "avatar" }, initials(f.name)), h("div", { class: "cell-main" }, f.name))),
        h("td", { class: "cell-sub" }, f.email),
        h("td", h("span", { class: "badge b-accent", style: "background:var(--accent-soft);color:var(--accent-strong)" }, f.students + " students"))))))));
}

/* ---------------- companies ---------------- */
function adminCompanies(d, c, opts) {
  opts = opts || {};
  const status = h("select", { class: "select" });
  [["", "All statuses"], ["pending", "Pending"], ["verified", "Verified"], ["rejected", "Rejected"], ["suspended", "Suspended"]].forEach(([v, l]) => status.append(h("option", { value: v }, l)));
  status.value = opts.status || "";
  const refresh = () => aview(c, async () => adminCompanies(await API.get("/admin/companies" + (status.value ? "?status=" + status.value : "")), c, { status: status.value }));
  status.addEventListener("change", refresh);
  const coRows = (d.items || []).map((co) => {
    const btn = (label, cls, action) => h("button", { class: "btn btn-sm " + cls, onclick: () => verify(co.id, action, refresh) }, label);
    const actions = h("div", { class: "flex", style: "gap:6px" },
      co.verification_status !== "verified" ? btn("Verify", "btn-success", "verify") : null,
      co.verification_status !== "rejected" ? btn("Reject", "btn-danger", "reject") : null,
      co.verification_status !== "suspended" ? btn("Suspend", "btn-ghost", "suspend") : null);
    const info = h("div", { class: "grow" },
      h("b", co.name),
      h("div", { class: "muted" }, co.industry + " · " + (co.location || "—") + " · " + co.internships + " internships"),
      h("div", { class: "muted", style: "font-size:11.5px" }, co.official_email + (co.website ? " · " + co.website : "")));
    return h("div", { class: "list-item" },
      h("div", { class: "avatar" }, initials(co.name)),
      info,
      statusBadge(co.verification_status),
      actions);
  });
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "Company registry"), status),
    h("div", { class: "flex-col" }, coRows));
  async function verify(cid, action, onDone) {
    if (action !== "verify" && !confirm("Set this company to '" + action + "'?")) return;
    try { await API.post("/admin/companies/" + cid + "/verify", { action }); toast("Company " + action + "d", "success"); onDone(); }
    catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- verification queue ---------------- */
function adminVerification(d, c) {
  const pending = (d.items || []).filter((x) => x.verification_status === "pending");
  const refresh = () => aview(c, async () => adminVerification(await API.get("/admin/companies?status=pending"), c));
  return h("div", { class: "stack" },
    h("div", { class: "alert amber" }, icon("shield"),
      h("div", { class: "grow" }, h("b", pending.length + " companies waiting for verification"),
        "Check registration info and docs, then verify or reject. Verified companies get a badge students trust.")),
    pending.length ? h("div", { class: "grid grid-2" }, pending.map((co) =>
      h("div", { class: "card" },
        h("div", { class: "flex" }, h("div", { class: "avatar lg" }, initials(co.name)), h("div", { class: "grow" },
          h("b", { style: "font-size:15px" }, co.name), h("div", { class: "muted" }, co.industry + " · " + co.location))),
        h("div", { class: "divider" }),
        kv([["Official email", co.official_email], ["Website", co.website ? h("a", { href: co.website, target: "_blank" }, co.website) : "—"],
          ["Registration", co.registration_info || "—"], ["Description", (co.description || "").slice(0, 120)]]),
        h("div", { class: "actions", style: "margin-top:14px" },
          h("button", { class: "btn btn-success", onclick: async () => { await verify(co.id, "verify"); refresh(); } }, icon("check"), "Verify"),
          h("button", { class: "btn btn-danger", onclick: async () => { await verify(co.id, "reject"); refresh(); } }, icon("x"), "Reject")))))
      : emptyState("Verification queue is clear 🎉", "✅"));
  function kv(pairs) { return h("div", { class: "kv" }, pairs.map(([k, v]) => h("div", {}, h("div", { class: "k" }, k), h("div", { class: "v" }, v)))); }
  async function verify(cid, action) {
    try { await API.post("/admin/companies/" + cid + "/verify", { action }); toast("Company " + (action === "verify" ? "verified ✓" : "rejected"), "success"); refresh(); }
    catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- internships ---------------- */
function adminInternships(d, c) {
  const status = h("select", { class: "select" });
  [["", "All"], ["open", "Open"], ["closed", "Closed"]].forEach(([v, l]) => status.append(h("option", { value: v }, l)));
  const refresh = () => aview(c, async () => adminInternships(await API.get("/admin/internships" + (status.value ? "?status=" + status.value : "")), c));
  status.addEventListener("change", refresh);
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "All internships"), status),
    h("div", { class: "card pad-0" }, h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Internship", "Company", "Mode", "Stipend", "Deadline", "Applications", "Status", ""].map((x) => h("th", x)))),
        h("tbody", d.items.map((i) => h("tr",
          h("td", { class: "cell-main" }, i.title),
          h("td", h("div", { class: "flex", style: "gap:6px" }, i.company, i.verified ? h("span", { class: "badge b-verified" }, icon("verified", 11), "Verified") : null)),
          h("td", i.mode),
          h("td", i.stipend || "—"),
          h("td", fmtDate(i.deadline)),
          h("td", i.applications),
          h("td", statusBadge(i.status)),
          h("td", h("button", { class: "btn btn-sm btn-ghost", onclick: async () => {
            try { await API.post("/admin/internships/" + i.id + "/status", { action: i.status === "open" ? "closed" : "open" }); toast("Updated", "success"); refresh(); }
            catch (e) { toast(e.message, "error"); }
          } }, i.status === "open" ? "Close" : "Reopen")))))))));
}

/* ---------------- applications ---------------- */
function adminApplications(d, c) {
  const status = h("select", { class: "select" });
  [["", "All"], ["applied", "Applied"], ["under_review", "Under review"], ["shortlisted", "Shortlisted"], ["interview", "Interview"],
   ["selected", "Selected"], ["rejected", "Rejected"], ["joined", "Joined"], ["completed", "Completed"]].forEach(([v, l]) => status.append(h("option", { value: v }, l)));
  const refresh = () => aview(c, async () => adminApplications(await API.get("/admin/applications" + (status.value ? "?status=" + status.value : "")), c));
  status.addEventListener("change", refresh);
  const stage = (a) => {
    const sel = h("select", { class: "select input-sm", style: "width:auto" });
    ["applied", "under_review", "shortlisted", "interview", "selected", "rejected", "joined", "completed"].forEach((x) => sel.append(h("option", { value: x }, x.replace(/_/g, " "))));
    sel.value = a.status;
    sel.addEventListener("change", async () => {
      try { await API.post("/admin/applications/" + a.id + "/status", { action: sel.value }); toast("Application updated", "success"); refresh(); }
      catch (e) { toast(e.message, "error"); }
    });
    return sel;
  };
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "All applications"), status),
    h("div", { class: "card pad-0" }, h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", h("tr", ["Student", "Internship", "Company", "Applied", "Status", ""].map((x) => h("th", x)))),
        h("tbody", d.items.map((a) => h("tr",
          h("td", { class: "cell-main" }, a.student),
          h("td", a.title), h("td", a.company || "—"),
          h("td", { class: "cell-sub" }, fmtDate(a.applied_at)),
          h("td", statusBadge(a.status)),
          h("td", stage(a)))))))));
}

/* ---------------- certificates ---------------- */
function adminCertificates(d, c) {
  const status = h("select", { class: "select" });
  [["", "All"], ["review", "Needs review"], ["verified", "Verified"], ["suspicious", "Suspicious"]].forEach(([v, l]) => status.append(h("option", { value: v }, l)));
  const refresh = () => aview(c, async () => adminCertificates(await API.get("/admin/certificates" + (status.value ? "?status=" + status.value : "")), c));
  status.addEventListener("change", refresh);
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "Certificate review queue"), status),
    h("div", { class: "flex-col" }, (d.items || []).map((cert) =>
      h("div", { class: "list-item" },
        h("div", { class: "avatar" }, icon("qr")),
        h("div", { class: "grow" },
          h("b", cert.title), h("div", { class: "muted" }, cert.student + " · " + cert.company_name + " · " + fmtDate(cert.created_at)),
          h("div", { class: "flex", style: "gap:6px;margin-top:5px" },
            h("span", { class: "badge " + (cert.score >= 70 ? "b-verified" : cert.score >= 40 ? "b-pending" : "b-rejected") }, "AI score " + cert.score + "/100"),
            (cert.indicators || []).slice(0, 2).map((x) => h("span", { class: "muted", style: "font-size:11px" }, x)))),
        statusBadge(cert.status),
        cert.file_url ? h("a", { class: "btn btn-sm btn-ghost", href: cert.file_url, target: "_blank" }, "File") : null,
        h("button", { class: "btn btn-sm btn-primary", onclick: () => reviewModal(cert, refresh) }, "Review")))));
  function reviewModal(cert, onDone) {
    const note = h("input", { class: "input", placeholder: "Note to the student (optional)" });
    const m = modal("Review certificate", h("div", { class: "flex-col" },
      h("div", { class: "alert sky" }, h("div", {}, h("b", cert.title), h("span", { class: "muted" }, " by " + cert.student + " at " + cert.company_name))),
      h("div", { class: "field" }, h("label", "Note"), note),
      h("div", { class: "actions" },
        h("button", { class: "btn btn-danger", onclick: () => act("suspicious") }, "Flag suspicious"),
        h("button", { class: "btn btn-ghost", onclick: () => act("review") }, "Keep in review"),
        h("button", { class: "btn btn-success", onclick: () => act("verified") }, icon("check"), "Verify"))));
    async function act(st) {
      try { await API.post("/admin/certificates/" + cert.id + "/review", { status: st, note: note.value }); toast("Certificate marked " + st, "success"); m.close(); onDone(); }
      catch (e) { toast(e.message, "error"); }
    }
  }
}

/* ---------------- rankings ---------------- */
function adminRankings(d) {
  const medal = (rank) => rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain";
  return h("div", { class: "card pad-0" }, h("div", { class: "table-wrap" },
    h("table", { class: "table" },
      h("thead", h("tr", ["Rank", "Student", "Department", "Year", "Points", "Streak", "CGPA", "Badges"].map((x) => h("th", x)))),
      h("tbody", d.items.map((r) => h("tr",
        h("td", h("span", { class: "medal " + medal(r.rank) }, r.rank)),
        h("td", { class: "cell-main" }, r.name),
        h("td", r.department + (r.branch ? " · " + r.branch : "")),
        h("td", r.year),
        h("td", h("b", r.points)),
        h("td", "🔥 " + r.streak),
        h("td", r.cgpa || "—"),
        h("td", r.badges)))))));
}

/* ---------------- rewards ---------------- */
function adminRewards() {
  const form = h("form", { class: "card", style: "max-width:520px", onsubmit: (e) => { e.preventDefault(); save(); return false; } },
    h("div", { class: "card-head" }, h("h3", "Reward points configuration")),
    h("p", { class: "muted mb" }, "Points are awarded automatically when students complete these actions. Changes take effect immediately."),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Daily report"), h("input", { class: "input", id: "rw-daily", type: "number", value: "10" })),
      h("div", { class: "field" }, h("label", "Weekly summary"), h("input", { class: "input", id: "rw-weekly", type: "number", value: "50" }))),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Perfect week"), h("input", { class: "input", id: "rw-perfect", type: "number", value: "100" })),
      h("div", { class: "field" }, h("label", "Internship completion"), h("input", { class: "input", id: "rw-complete", type: "number", value: "500" }))),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, "Save configuration")));
  async function save() {
    try {
      const res = await API.patch("/admin/rewards", {
        daily: parseInt(document.getElementById("rw-daily").value) || 10,
        weekly: parseInt(document.getElementById("rw-weekly").value) || 50,
        perfect_week: parseInt(document.getElementById("rw-perfect").value) || 100,
        completion: parseInt(document.getElementById("rw-complete").value) || 500,
      });
      toast("Rewards configuration saved", "success");
    } catch (e) { toast(e.message, "error"); }
  }
  return form;
}

/* ---------------- analytics ---------------- */
function adminAnalytics(d) {
  const deptRows = Object.entries(d.departments || {});
  const deptLabels = deptRows.map(([name]) => name);
  const studentsPerDept = deptRows.map(([, v]) => v.students);
  const internsPerDept = deptRows.map(([, v]) => v.interns);
  const weekLabels = (d.weeks || []).map((w) => fmtDate(w.week).slice(0, 6));
  const att = d.attendance || {};
  const attTotal = att.present + att.absent + att.leave + att.holiday || 1;
  const attPct = Math.round((att.present / attTotal) * 100);
  return h("div", { class: "stack" },
    h("div", { class: "grid grid-2" },
      acard("Students per department", deptRows.length ? barsChart(deptLabels, studentsPerDept) : emptyState("No data yet", "📊")),
      acard("Active interns per department", deptRows.length ? barsChart(deptLabels, internsPerDept, { color: "var(--emerald)" }) : emptyState("No data yet", "📊"))),
    h("div", { class: "grid grid-2" },
      acard("Applications per week", barsChart(weekLabels, d.weeks.map((w) => w.applications))),
      acard("Reports per week", barsChart(weekLabels, d.weeks.map((w) => w.reports), { color: "var(--violet)" }))),
    h("div", { class: "grid grid-2" },
      acard("Attendance breakdown", h("div", { class: "flex", style: "gap:24px;align-items:center" },
        donut(attPct, attPct + "%", "present"),
        h("div", { class: "flex-col" },
          (["present", "absent", "leave", "holiday"]).map((k) =>
            h("div", { class: "flex" }, statusBadge(k, k), h("span", { class: "grow" }), h("b", att[k] || 0)))))),
      acard("Company verification status", h("div", { class: "flex-col" }, (d.companies || []).map((c) =>
        h("div", { class: "flex" }, statusBadge(c.status), h("div", { class: "grow" }), h("b", c.count)))))));
}

/* ---------------- announcements ---------------- */
function adminAnnouncements(d, c) {
  const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); post(); return false; } },
    h("div", { class: "card-head" }, h("h3", "Broadcast announcement")),
    h("div", { class: "field" }, h("label", "Title *"), h("input", { class: "input", id: "an-title", required: true, placeholder: "Placement drive: TechFlow Systems" })),
    h("div", { class: "field" }, h("label", "Message"), h("textarea", { class: "textarea", id: "an-body", placeholder: "On-campus hiring for SDE roles. Register by Friday…" })),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, icon("megaphone"), "Send to everyone")));
  async function post() {
    try {
      await API.post("/admin/announcements", { title: document.getElementById("an-title").value, body: document.getElementById("an-body").value });
      toast("Announcement sent to all students, faculty and companies", "success");
      document.getElementById("an-title").value = ""; document.getElementById("an-body").value = "";
      refresh();
    } catch (e) { toast(e.message, "error"); }
  }
  function refresh() { aview(c, async () => adminAnnouncements(await API.get("/announcements"), c)); }
  const annItems = (d.items || []).map((a) => {
    const body = h("div", { class: "grow" },
      h("b", a.title),
      h("div", { class: "muted" }, a.body),
      h("time", { class: "muted", style: "font-size:11px" }, fmtDateTime(a.created_at)));
    return h("div", { class: "list-item" },
      h("div", { class: "avatar" }, icon("megaphone")),
      body);
  });
  return h("div", { class: "grid grid-1-2" },
    form,
    acard("Recent announcements", h("div", { class: "flex-col" }, annItems)));
}

/* ---------------- views ---------------- */
const adminViews = {
  dashboard: (c) => aview(c, async () => adminDashboard(await API.get("/admin/dashboard"))),
  students: (c) => aview(c, async () => adminStudents(await API.get("/admin/students"), c)),
  faculty: (c) => aview(c, async () => adminFaculty(await API.get("/admin/faculty"))),
  companies: (c) => aview(c, async () => adminCompanies(await API.get("/admin/companies"), c, {})),
  verification: (c) => aview(c, async () => adminVerification(await API.get("/admin/companies?status=pending"), c)),
  internships: (c) => aview(c, async () => adminInternships(await API.get("/admin/internships"), c)),
  applications: (c) => aview(c, async () => adminApplications(await API.get("/admin/applications"), c)),
  certificates: (c) => aview(c, async () => adminCertificates(await API.get("/admin/certificates"), c)),
  rankings: (c) => aview(c, async () => adminRankings(await API.get("/admin/rankings"))),
  rewards: (c) => aview(c, async () => adminRewards()),
  analytics: (c) => aview(c, async () => adminAnalytics(await API.get("/admin/analytics"))),
  announcements: (c) => aview(c, async () => adminAnnouncements(await API.get("/announcements"), c)),
};

bootShell("admin", adminViews);
