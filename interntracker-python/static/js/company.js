/* ================= Company workspace ================= */
async function cview(c, fn) {
  c.innerHTML = "";
  c.append(spinner());
  try { c.replaceChildren(await fn()); }
  catch (e) { c.replaceChildren(emptyState(e.message, "⚠️")); }
}

function ccard(title, body, headRight) {
  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h3", title), headRight || null), body);
}

function verifyBanner(status) {
  if (status === "verified") {
    return h("div", { class: "alert emerald" }, icon("shield"),
      h("div", { class: "grow" }, h("b", "Your company is verified ✓"), "Applications from students carry your verified badge — they trust you."));
  }
  if (status === "rejected" || status === "suspended") {
    return h("div", { class: "alert rose" }, icon("shield"),
      h("div", { class: "grow" }, h("b", "Verification " + status), "Your profile is not visible as verified. Contact the T&P cell or re-submit for verification."),
      h("button", { class: "btn btn-sm btn-primary", onclick: () => requestVerify() }, "Request verification"));
  }
  return h("div", { class: "alert amber" }, icon("shield"),
    h("div", { class: "grow" }, h("b", "Verification pending"), "The T&P cell is reviewing your documents. While pending, students can still apply to your internships."),
    h("button", { class: "btn btn-sm btn-primary", onclick: () => requestVerify() }, "Re-submit"));
  async function requestVerify() {
    try { await API.post("/company/verify-request"); toast("Verification requested — the T&P cell has been notified", "success"); location.reload(); }
    catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- dashboard ---------------- */
function companyDashboard(d) {
  const s = d.stats;
  const recentList = (d.recent_applications || []).map((a) =>
    h("div", { class: "list-item" },
      h("div", { class: "avatar" }, initials(a.student)),
      h("div", { class: "grow" }, h("b", a.student), h("div", { class: "muted" }, a.title + " · " + fmtDate(a.applied_at))),
      statusBadge(a.status),
      h("a", { class: "btn btn-sm btn-ghost", href: "#/applications" }, "Manage")));
  const recentCard = ccard("Recent applications",
    (d.recent_applications || []).length ? h("div", { class: "flex-col" }, recentList) : emptyState("No applications yet", "📭"));
  return h("div", { class: "stack" },
    verifyBanner(d.verification_status),
    h("div", { class: "grid grid-4" },
      stat("Open internships", s.open, "of " + s.internships + " total", "accent", "briefcase"),
      stat("Applications", s.applications, "across all roles", "sky", "inbox"),
      stat("Shortlisted", s.shortlisted, s.interviews + " in interview", "amber", "star"),
      stat("Current interns", s.interns, null, "emerald", "users")),
    h("div", { class: "grid grid-2" },
      recentCard,
      ccard("Quick actions", h("div", { class: "flex-col" },
        h("a", { class: "btn btn-soft", href: "#/internships" }, icon("plus"), "Post a new internship"),
        h("a", { class: "btn btn-ghost", href: "#/profile" }, icon("building"), "Update company profile"),
        h("a", { class: "btn btn-ghost", href: "#/interns" }, icon("users"), "Monitor current interns")))));
}

/* ---------------- profile ---------------- */
function companyProfile(d, c) {
  const refresh = () => cview(c, async () => companyProfile(await API.get("/company/profile"), c));
  const form = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); save(); return false; } },
    h("div", { class: "card-head" }, h("h3", "Company details")),
    h("div", { class: "field" }, h("label", "Company name"), h("input", { class: "input", id: "cp-name", value: d.name })),
    h("div", { class: "row-3" },
      h("div", { class: "field" }, h("label", "Industry"), h("input", { class: "input", id: "cp-ind", value: d.industry || "" })),
      h("div", { class: "field" }, h("label", "Location"), h("input", { class: "input", id: "cp-loc", value: d.location || "" })),
      h("div", { class: "field" }, h("label", "Website"), h("input", { class: "input", id: "cp-web", value: d.website || "" }))),
    h("div", { class: "field" }, h("label", "Description"), h("textarea", { class: "textarea", id: "cp-desc" }, d.description || "")),
    h("div", { class: "actions" }, h("button", { class: "btn btn-primary", type: "submit" }, "Save changes")));
  async function save() {
    try {
      await API.patch("/company/profile", {
        name: document.getElementById("cp-name").value,
        industry: document.getElementById("cp-ind").value,
        location: document.getElementById("cp-loc").value,
        website: document.getElementById("cp-web").value,
        description: document.getElementById("cp-desc").value,
      });
      toast("Profile updated", "success");
    } catch (e) { toast(e.message, "error"); }
  }
  return h("div", { class: "grid grid-2-1" },
    h("div", { class: "stack" }, verifyBanner(d.verification_status), form),
    ccard("Verification", h("div", { class: "flex-col" },
      h("div", { class: "kv" },
        ["Status", statusBadge(d.verification_status)], ["Official email", d.official_email || "—"],
        ["Registered", d.registration_info || "—"], ["Verified on", fmtDateTime(d.verified_at)]),
      d.verified_at ? null : h("button", { class: "btn btn-soft", onclick: async () => {
        try { await API.post("/company/verify-request"); toast("Verification requested", "success"); refresh(); }
        catch (e) { toast(e.message, "error"); }
      } }, "Submit for verification"))));
}

/* ---------------- internships ---------------- */
function companyInternships(d, c) {
  const refresh = () => cview(c, async () => companyInternships(await API.get("/company/internships"), c));
  return h("div", { class: "stack" },
    h("div", { class: "flex", style: "justify-content:flex-end" },
      h("button", { class: "btn btn-primary", onclick: () => internshipModal(null, refresh) }, icon("plus"), "Post internship")),
    (d.items || []).length ? h("div", { class: "flex-col" }, d.items.map((i) =>
      h("div", { class: "list-item", style: "align-items:stretch" },
        h("div", { class: "grow" },
          h("div", { class: "flex" }, h("b", { style: "font-size:14.5px" }, i.title), statusBadge(i.status)),
          h("div", { class: "muted mt" }, (i.mode + (i.location ? " · " + i.location : "")) + " · " + (i.stipend || (i.paid ? "Paid" : "Unpaid")) + " · " + i.duration + " · deadline " + fmtDate(i.deadline)),
          h("div", { class: "muted mt" }, (i.skills || []).join(", ")),
          h("div", { class: "muted mt", style: "font-size:11.5px" }, i.applications + " applications")),
        h("div", { class: "flex-col", style: "justify-content:center" },
          h("button", { class: "btn btn-sm btn-ghost", onclick: () => internshipModal(i, refresh) }, "Edit"),
          h("button", { class: "btn btn-sm " + (i.status === "open" ? "btn-danger" : "btn-success"), onclick: async () => {
            try { await API.post("/company/internships/" + i.id + "/close"); toast(i.status === "open" ? "Internship closed" : "Internship reopened", "success"); refresh(); }
            catch (e) { toast(e.message, "error"); }
          } }, i.status === "open" ? "Close" : "Reopen")))))
      : emptyState("No internships posted yet — post your first one!", "🚀"));
}

function internshipModal(intern, onDone) {
  const i = intern || {};
  const form = h("form", { class: "flex-col", onsubmit: (e) => { e.preventDefault(); save(); return false; } },
    h("div", { class: "field" }, h("label", "Title *"), h("input", { class: "input", id: "in-title", required: true, value: i.title || "" })),
    h("div", { class: "field" }, h("label", "Description"), h("textarea", { class: "textarea", id: "in-desc" }, i.description || "")),
    h("div", { class: "row-3" },
      h("div", { class: "field" }, h("label", "Mode"), h("select", { class: "select", id: "in-mode" }, ["remote", "onsite", "hybrid"].map((m) => h("option", { value: m }, m)))),
      h("div", { class: "field" }, h("label", "Type"), h("select", { class: "select", id: "in-type" }, ["fulltime", "parttime", "summer", "wfh"].map((t) => h("option", { value: t }, t)))),
      h("div", { class: "field" }, h("label", "Domain"), h("input", { class: "input", id: "in-domain", value: i.domain || "" }))),
    h("div", { class: "row-2" },
      h("div", { class: "field" }, h("label", "Location"), h("input", { class: "input", id: "in-loc", value: i.location || "" })),
      h("div", { class: "field" }, h("label", "Duration"), h("input", { class: "input", id: "in-dur", value: i.duration || "3 months" }))),
    h("div", { class: "row-3" },
      h("div", { class: "field" }, h("label", "Paid"), h("select", { class: "select", id: "in-paid" }, h("option", { value: "1" }, "Paid"), h("option", { value: "0" }, "Unpaid"))),
      h("div", { class: "field" }, h("label", "Stipend"), h("input", { class: "input", id: "in-stip", value: i.stipend || "" })),
      h("div", { class: "field" }, h("label", "Application deadline"), h("input", { class: "input", id: "in-deadline", type: "date", value: i.deadline || "" }))),
    h("div", { class: "field" }, h("label", "Skills (comma separated)"), h("input", { class: "input", id: "in-skills", value: (i.skills || []).join(", ") })),
    h("div", { class: "actions" },
      h("button", { class: "btn btn-ghost", onclick: () => m.close() }, "Cancel"),
      h("button", { class: "btn btn-primary", type: "submit" }, intern ? "Save changes" : "Post internship")));
  const m = modal(intern ? "Edit internship" : "Post a new internship", form);
  const modeSel = form.querySelector("#in-mode"); if (i.mode) modeSel.value = i.mode;
  const typeSel = form.querySelector("#in-type"); if (i.intern_type) typeSel.value = i.intern_type;
  const paidSel = form.querySelector("#in-paid"); paidSel.value = i.paid === false ? "0" : "1";
  async function save() {
    const body = {
      title: document.getElementById("in-title").value,
      description: document.getElementById("in-desc").value,
      mode: document.getElementById("in-mode").value,
      intern_type: document.getElementById("in-type").value,
      domain: document.getElementById("in-domain").value,
      location: document.getElementById("in-loc").value,
      duration: document.getElementById("in-dur").value,
      paid: document.getElementById("in-paid").value === "1",
      stipend: document.getElementById("in-stip").value,
      deadline: document.getElementById("in-deadline").value || null,
      skills: document.getElementById("in-skills").value.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (intern) await API.patch("/company/internships/" + intern.id, body);
      else { await API.post("/company/internships", body); toast("Internship posted — students have been notified", "success"); }
      m.close(); onDone();
    } catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- applications ---------------- */
function companyApplications(d, c) {
  const iidSel = h("select", { class: "select" });
  iidSel.append(h("option", { value: "" }, "All internships"));
  const internships = [...new Set(d.items.map((a) => a.internship_id))];
  internships.forEach((iid) => {
    const title = d.items.find((a) => a.internship_id === iid).title;
    iidSel.append(h("option", { value: iid }, title));
  });
  const statusSel = h("select", { class: "select" });
  [["", "All statuses"], ["applied", "Applied"], ["under_review", "Under review"], ["shortlisted", "Shortlisted"],
   ["interview", "Interview"], ["selected", "Selected"], ["rejected", "Rejected"], ["joined", "Joined"]].forEach(([v, l]) => statusSel.append(h("option", { value: v }, l)));
  const refresh = () => cview(c, async () => companyApplications(await API.get("/company/applications?internship_id=" + iidSel.value + "&status=" + statusSel.value), c));
  [iidSel, statusSel].forEach((el) => el.addEventListener("change", refresh));

  const appRows = (d.items || []).map((a) => {
    const head = h("div", { class: "flex" },
      h("div", { class: "avatar" }, initials(a.student)),
      h("div", { class: "grow" }, h("b", a.student), h("div", { class: "muted" }, a.email + " · " + a.title + " · applied " + fmtDate(a.applied_at))),
      statusBadge(a.status));
    const controls = h("div", { class: "flex", style: "justify-content:space-between;gap:8px;flex-wrap:wrap" },
      h("div", { class: "flex", style: "gap:8px;flex-wrap:wrap" },
        stageSelect(a),
        h("input", { class: "input input-sm", id: "int-date-" + a.id, type: "date", value: a.interview_date || "", style: "width:150px", title: "Interview date" })),
      h("div", { class: "flex", style: "gap:6px" },
        h("input", { class: "input input-sm", id: "int-notes-" + a.id, placeholder: "Add a note…", value: a.notes || "", style: "width:200px" }),
        h("button", { class: "btn btn-sm btn-soft", onclick: () => setStage(a) }, "Update")));
    return h("div", { class: "list-item", style: "align-items:stretch;flex-direction:column;gap:10px" }, head, controls);
  });
  return h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("b", { class: "grow" }, "Applicant pipeline"), iidSel, statusSel),
    (d.items || []).length ? h("div", { class: "flex-col" }, appRows) : emptyState("No applications match those filters.", "📭"));

  function stageSelect(a) {
    const sel = h("select", { class: "select input-sm", style: "width:auto", id: "stage-" + a.id });
    ["applied", "under_review", "shortlisted", "interview", "selected", "rejected", "joined"].forEach((s) => sel.append(h("option", { value: s }, s.replace(/_/g, " "))));
    sel.value = a.status;
    sel.addEventListener("change", () => setStage(a, sel.value));
    return sel;
  }
  async function setStage(a, forced) {
    const sel = document.getElementById("stage-" + a.id);
    const body = {
      status: forced || (sel && sel.value) || a.status,
      interview_date: document.getElementById("int-date-" + a.id).value || null,
      notes: document.getElementById("int-notes-" + a.id).value,
    };
    try { await API.post("/company/applications/" + a.id + "/stage", body); toast("Application updated — student notified", "success"); refresh(); }
    catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- interns ---------------- */
function companyInterns(d, c) {
  const refresh = () => cview(c, async () => companyInterns(await API.get("/company/interns"), c));
  const internCards = (d.items || []).map((n) => {
    const feedback = (n.feedback || []).length
      ? h("div", { class: "alert sky mt" }, h("div", {}, h("b", "Your feedback"), (n.feedback || []).slice(-1)[0]))
      : null;
    const actions = h("div", { class: "actions" },
      h("button", { class: "btn btn-sm btn-ghost", onclick: () => feedbackModal(n, refresh) }, icon("send"), "Feedback"),
      n.status === "active" ? h("button", { class: "btn btn-sm btn-success", onclick: () => completeIntern(n, refresh) }, icon("check"), "Mark complete") : null);
    return h("div", { class: "card" },
      h("div", { class: "flex" },
        h("div", { class: "avatar lg" }, initials(n.name)),
        h("div", { class: "grow" },
          h("b", { style: "font-size:15px" }, n.name),
          h("div", { class: "muted" }, n.role + " · " + fmtDate(n.start_date) + " → " + fmtDate(n.end_date))),
        statusBadge(n.status)),
      h("div", { class: "divider" }),
      h("div", { class: "kv" },
        ["Email", n.email], ["Mentor", n.mentor || "—"],
        ["Attendance", n.attendance_pct + "%"], ["Reports", n.reports]),
      feedback,
      actions);
  });
  return h("div", { class: "stack" },
    (d.items || []).length ? h("div", { class: "grid grid-2" }, internCards)
      : emptyState("No interns yet — students who join your internships appear here.", "👥"));
  function feedbackModal(n, onDone) {
    const stars = h("select", { class: "select", style: "width:auto" }, [5, 4, 3, 2, 1].map((x) => h("option", { value: x }, "★".repeat(x) + " " + x + "/5")));
    const comment = h("textarea", { class: "textarea", placeholder: "How is " + n.name + " performing?" });
    const m = modal("Feedback — " + n.name, h("div", { class: "flex-col" },
      h("div", { class: "field" }, h("label", "Rating"), stars),
      h("div", { class: "field" }, h("label", "Comment"), comment),
      h("div", { class: "actions" },
        h("button", { class: "btn btn-ghost", onclick: () => m.close() }, "Cancel"),
        h("button", { class: "btn btn-primary", onclick: async () => {
          try { await API.post("/company/interns/" + n.id + "/feedback", { rating: parseInt(stars.value, 10), comment: comment.value }); toast("Feedback sent to " + n.name, "success"); m.close(); onDone(); }
          catch (e) { toast(e.message, "error"); }
        } }, "Send feedback"))));
  }
  async function completeIntern(n, onDone) {
    if (!confirm("Mark " + n.name + "'s internship as completed?")) return;
    try { await API.post("/company/interns/" + n.id + "/complete"); toast("Internship completed", "success"); onDone(); }
    catch (e) { toast(e.message, "error"); }
  }
}

/* ---------------- views ---------------- */
const companyViews = {
  dashboard: (c) => cview(c, async () => companyDashboard(await API.get("/company/dashboard"))),
  profile: (c) => cview(c, async () => companyProfile(await API.get("/company/profile"), c)),
  internships: (c) => cview(c, async () => companyInternships(await API.get("/company/internships"), c)),
  applications: (c) => cview(c, async () => companyApplications(await API.get("/company/applications"), c)),
  interns: (c) => cview(c, async () => companyInterns(await API.get("/company/interns"), c)),
};

bootShell("company", companyViews);
