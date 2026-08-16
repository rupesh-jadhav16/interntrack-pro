/* InternTracker — T&P Cell (admin) workspace */

/* ============================== DASHBOARD ============================== */
App.pages.dashboard = async function (content) {
  const d = await API.get("/api/admin/dashboard");
  const s = d.stats;
  content.innerHTML = `
    <div class="role-banner admin fade-in">
      <div class="rb-icon">${UI.icons.shield}</div>
      <div>
        <h2>T&amp;P Cell Dashboard</h2>
        <p>College-wide internship operations · ${s.attendance_today} students checked in today</p>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-family:var(--display);font-size:26px;font-weight:800">${s.pending_companies + s.pending_certificates}</div>
        <div style="font-size:11.5px;opacity:.85">items awaiting review</div>
      </div>
    </div>

    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon blue">${UI.icons.students}</div><div><div class="stat-value">${s.students}</div><div class="stat-label">Students</div></div></div>
      <div class="stat"><div class="stat-icon violet">${UI.icons.students}</div><div><div class="stat-value">${s.faculty}</div><div class="stat-label">Faculty</div></div></div>
      <div class="stat"><div class="stat-icon amber">${UI.icons.companies}</div><div><div class="stat-value">${s.companies}</div><div class="stat-label">Companies · ${s.verified_companies} verified</div></div></div>
      <div class="stat"><div class="stat-icon green">${UI.icons.explorer}</div><div><div class="stat-value">${s.internships}</div><div class="stat-label">Open internships</div></div></div>
    </div>
    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon teal">${UI.icons.applications}</div><div><div class="stat-value">${s.applications}</div><div class="stat-label">Applications</div></div></div>
      <div class="stat"><div class="stat-icon blue">${UI.icons.tracker}</div><div><div class="stat-value">${s.active_trackers}</div><div class="stat-label">Active trackers</div></div></div>
      <div class="stat"><div class="stat-icon rose">${UI.icons.shield}</div><div><div class="stat-value">${s.pending_companies}</div><div class="stat-label">Companies to verify</div></div></div>
      <div class="stat"><div class="stat-icon amber">${UI.icons.certificates}</div><div><div class="stat-value">${s.pending_certificates}</div><div class="stat-label">Certificates to review</div></div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Review queues</div><div class="card-sub">Keep the ecosystem trustworthy</div></div></div>
        <div class="flex justify-between items-center" style="padding:11px 0;border-bottom:1px dashed var(--line)">
          <span class="small">Company verification</span>
          <button class="btn btn-sm btn-primary" onclick="switchPage('verification')">${s.pending_companies} pending →</button>
        </div>
        <div class="flex justify-between items-center" style="padding:11px 0;border-bottom:1px dashed var(--line)">
          <span class="small">Certificate review</span>
          <button class="btn btn-sm btn-primary" onclick="switchPage('certificates')">${s.pending_certificates} pending →</button>
        </div>
        <div class="flex justify-between items-center" style="padding:11px 0">
          <span class="small">Report review (faculty)</span>
          <button class="btn btn-sm btn-outline" onclick="switchPage('analytics')">${s.pending_reports} pending</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">This month</div>
        <div class="card-sub">Application pipeline health</div>
        <div class="flex justify-between items-center" style="padding:11px 0;border-bottom:1px dashed var(--line)">
          <span class="small">Students joined internships</span><b>${s.joined_this_month}</b></div>
        <div class="flex justify-between items-center" style="padding:11px 0;border-bottom:1px dashed var(--line)">
          <span class="small">Check-ins today</span><b>${s.attendance_today}</b></div>
        <div class="flex justify-between items-center" style="padding:11px 0">
          <span class="small">Pending reports</span><b>${s.pending_reports}</b></div>
      </div>
    </div>`;
};

/* ============================== COMPANY VERIFICATION ============================== */
App.pages.verification = async function (content) {
  const data = await API.get("/api/admin/companies");
  const pending = data.items.filter((c) => c.status === "pending");
  const done = data.items.filter((c) => c.status !== "pending");
  content.innerHTML = `
    <div class="grid grid-3 mb-16">
      <div class="stat"><div class="stat-icon amber">${UI.icons.shield}</div><div><div class="stat-value">${pending.length}</div><div class="stat-label">Awaiting review</div></div></div>
      <div class="stat"><div class="stat-icon green">✓</div><div><div class="stat-value">${done.filter((c) => c.status === "verified").length}</div><div class="stat-label">Verified</div></div></div>
      <div class="stat"><div class="stat-icon rose">✗</div><div><div class="stat-value">${done.filter((c) => c.status === "rejected").length}</div><div class="stat-label">Rejected</div></div></div>
    </div>
    <div class="card mb-16">
      <div class="card-title">Pending verification</div>
      <div class="card-sub">Approve companies so students can trust their internships</div>
      ${pending.length ? pending.map((c) => `
        <div class="review-card">
          <div class="rc-head">
            <div class="flex items-center gap-12">
              <div class="avatar" style="background:${UI.avatarColor(c.name)}">${UI.esc(c.name[0])}</div>
              <div><div class="bold">${UI.esc(c.name)}</div>
                <div class="muted small">${UI.esc(c.industry || "—")} · ${UI.esc(c.location || "—")} · ${UI.esc(c.owner_email)}</div></div>
            </div>
            <span class="badge badge-amber">Pending</span>
          </div>
          ${c.description ? `<div class="rc-body">${UI.esc(c.description)}</div>` : ""}
          ${c.website ? `<div class="small mb-8">🌐 <a href="${UI.esc(c.website)}" target="_blank">${UI.esc(c.website)}</a></div>` : ""}
          <div class="field"><input class="input" placeholder="Note (optional)" id="cnote-${c.id}" /></div>
          <div class="rc-actions">
            <button class="btn btn-success btn-sm" onclick="verifyCompany(${c.id}, true)">${UI.icons.check} Approve &amp; verify</button>
            <button class="btn btn-danger btn-sm" onclick="verifyCompany(${c.id}, false)">${UI.icons.x} Reject</button>
          </div>
        </div>`).join("") : '<div class="empty" style="padding:24px">No companies awaiting verification 🎉</div>'}
    </div>
    <div class="card">
      <div class="card-title">All companies</div>
      <div class="table-wrap mt-12" style="border:none">
        <table class="tbl">
          <thead><tr><th>Company</th><th>Industry</th><th>Location</th><th>Internships</th><th>Status</th></tr></thead>
          <tbody>${done.map((c) => `
            <tr><td><b>${UI.esc(c.name)}</b>${c.status === "verified" ? " " + UI.verifiedBadge() : ""}</td>
              <td>${UI.esc(c.industry || "—")}</td><td>${UI.esc(c.location || "—")}</td>
              <td>${c.internship_count}</td><td>${c.status === "verified" ? '<span class="badge badge-green">Verified</span>' : '<span class="badge badge-red">Rejected</span>'}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};

async function verifyCompany(id, approve) {
  const note = document.getElementById("cnote-" + id)?.value || "";
  if (!UI.promptDelete()) return;
  try {
    await API.post(`/api/admin/companies/${id}/verify`, { approve, note });
    UI.toast(approve ? "✅ Company verified — badge is live." : "Company rejected.", approve ? "success" : "info");
    switchPage("verification");
  } catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== CERTIFICATES ============================== */
App.pages.certificates = async function (content) {
  const data = await API.get("/api/admin/certificates");
  content.innerHTML = `
    <div class="card">
      <div class="card-title">Certificate review queue</div>
      <div class="card-sub">Authenticate student certificates before they count</div>
      ${data.items.length ? data.items.map((c) => `
        <div class="review-card">
          <div class="rc-head">
            <div class="flex items-center gap-12">
              ${UI.avatar(c.student?.name)}
              <div><div class="bold">${UI.esc(c.title)}</div>
                <div class="muted small">${UI.esc(c.student?.name || "—")} · ${UI.esc(c.company || "—")} · ${UI.esc(c.issued_by || "—")}</div>
                <div class="muted" style="font-size:11px;font-family:monospace">${UI.esc(c.code)}</div></div>
            </div>
            <span class="badge badge-amber">Pending</span>
          </div>
          ${c.doc_path ? `<div class="small mb-12">📄 <a href="${UI.esc(c.doc_path)}" target="_blank">View document</a></div>` : ""}
          <div class="field"><input class="input" placeholder="Review note (optional)" id="certnote-${c.id}" /></div>
          <div class="rc-actions">
            <button class="btn btn-success btn-sm" onclick="reviewCert(${c.id}, true)">${UI.icons.check} Approve (+100 pts)</button>
            <button class="btn btn-danger btn-sm" onclick="reviewCert(${c.id}, false)">${UI.icons.x} Reject</button>
          </div>
        </div>`).join("") : '<div class="empty" style="padding:28px">No certificates awaiting review 🎉</div>'}
    </div>`;
};

async function reviewCert(id, approve) {
  const note = document.getElementById("certnote-" + id)?.value || "";
  try {
    await API.post(`/api/admin/certificates/${id}/review`, { approve, note });
    UI.toast(approve ? "✅ Certificate approved +100 pts." : "Certificate rejected.", approve ? "success" : "info");
    switchPage("certificates");
  } catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== STUDENTS ============================== */
App.pages.students = async function (content) {
  const [data, fac] = await Promise.all([API.get("/api/admin/students"), API.get("/api/admin/faculty")]);
  content.innerHTML = `
    <div class="card">
      <div class="card-head"><div><div class="card-title">All students</div><div class="card-sub">Assign mentors and manage access</div></div></div>
      <div class="table-wrap" style="border:none">
        <table class="tbl">
          <thead><tr><th>Student</th><th>Branch</th><th>Points</th><th>Current internship</th><th>Mentor</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${data.items.map((s) => `
            <tr>
              <td><div class="flex items-center gap-8">${UI.avatar(s.student.name)}<div><b>${UI.esc(s.student.name)}</b><div class="muted">${UI.esc(s.student.email)}</div></div></div></td>
              <td>${UI.esc(s.student.branch || "—")}</td>
              <td><b>${s.student.points}</b></td>
              <td>${s.current_internship ? `<span class="badge badge-teal">${UI.esc(s.current_internship)}</span>` : "—"}</td>
              <td>
                <select class="input" style="padding:6px 9px;font-size:12.5px;min-width:150px" id="mentor-${s.student.id}">
                  <option value="">Unassigned</option>
                  ${fac.items.map((f) => `<option value="${f.id}" ${s.mentor === f.name ? "selected" : ""}>${UI.esc(f.name)}</option>`).join("")}
                </select>
              </td>
              <td>${s.student.is_active === false ? '<span class="badge badge-red">Disabled</span>' : '<span class="badge badge-green">Active</span>'}</td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="assignMentor(${s.student.id})">Set mentor</button>
                <button class="btn btn-sm ${s.student.is_active === false ? "btn-success" : "btn-danger"}" onclick="toggleStudent(${s.student.id})">${s.student.is_active === false ? "Enable" : "Disable"}</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};

async function assignMentor(id) {
  const facultyId = document.getElementById("mentor-" + id)?.value;
  try {
    await API.post(`/api/admin/students/${id}/mentor`, { faculty_id: facultyId ? Number(facultyId) : null });
    UI.toast("✅ Mentor updated.", "success");
  } catch (e) { UI.toast(e.message, "error"); }
}
async function toggleStudent(id) {
  if (!UI.promptDelete()) return;
  try { await API.post(`/api/admin/students/${id}/toggle`); UI.toast("Student status updated.", "info"); switchPage("students"); }
  catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== FACULTY ============================== */
App.pages.faculty = async function (content) {
  const data = await API.get("/api/admin/faculty");
  content.innerHTML = `
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Add faculty member</div>
        <div class="card-sub">Faculty get a mentor dashboard with report review</div>
        <form onsubmit="return addFaculty(event)">
          <div class="grid grid-2">
            <div class="field"><label>Full name</label><input class="input" name="name" required placeholder="Prof. Jane Doe" /></div>
            <div class="field"><label>Email</label><input class="input" type="email" name="email" required placeholder="jane@college.edu" /></div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Department</label><input class="input" name="department" placeholder="Computer Science" /></div>
            <div class="field"><label>Designation</label><input class="input" name="designation" placeholder="Associate Professor" /></div>
          </div>
          <div class="field"><label>Password</label><input class="input" type="text" name="password" required minlength="6" placeholder="min 6 characters" /></div>
          <button class="btn btn-primary" type="submit">Add faculty</button>
        </form>
      </div>
      <div class="card">
        <div class="card-title">Faculty (${data.items.length})</div>
        <div class="table-wrap mt-12" style="border:none">
          <table class="tbl">
            <thead><tr><th>Name</th><th>Department</th><th>Mentees</th></tr></thead>
            <tbody>${data.items.map((f) => `
              <tr><td><div class="flex items-center gap-8">${UI.avatar(f.name)}<div><b>${UI.esc(f.name)}</b><div class="muted">${UI.esc(f.email)}</div></div></div></td>
                <td>${UI.esc(f.department || "—")}</td><td><span class="badge badge-blue">${f.mentees} mentees</span></td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
};

async function addFaculty(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    await API.post("/api/admin/faculty", {
      name: fd.get("name"), email: fd.get("email"), password: fd.get("password"),
      department: fd.get("department") || "", designation: fd.get("designation") || "",
    });
    UI.toast("✅ Faculty account created.", "success");
    switchPage("faculty");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; }
}

/* ============================== INTERNSHIPS ============================== */
App.pages.internships = async function (content) {
  const data = await API.get("/api/admin/internships");
  content.innerHTML = `
    <div class="card">
      <div class="card-title">All internships</div>
      <div class="card-sub">Close internships that should no longer accept applications</div>
      <div class="table-wrap mt-12" style="border:none">
        <table class="tbl">
          <thead><tr><th>Internship</th><th>Company</th><th>Mode</th><th>Stipend</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
          <tbody>${data.items.map((i) => `
            <tr>
              <td><b>${UI.esc(i.title)}</b></td>
              <td>${UI.esc(i.company?.name || "—")} ${i.company?.verified ? UI.verifiedBadge() : ""}</td>
              <td>${UI.modeIcon(i.mode)}</td>
              <td>${UI.esc(i.stipend)}</td>
              <td class="muted">${i.deadline ? UI.fmtDate(i.deadline) : "—"}</td>
              <td>${UI.statusBadge(i.status)}</td>
              <td>${i.status === "open" ? `<button class="btn btn-sm btn-danger" onclick="adminCloseInternship(${i.id})">Close</button>` : ""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};
async function adminCloseInternship(id) {
  if (!UI.promptDelete()) return;
  try { await API.post(`/api/admin/internships/${id}/close`); UI.toast("Internship closed.", "info"); switchPage("internships"); }
  catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== APPLICATIONS ============================== */
App.pages.applications = async function (content) {
  const data = await API.get("/api/admin/applications");
  const stages = ["applied", "under_review", "shortlisted", "interview", "selected", "joined", "completed", "rejected"];
  content.innerHTML = `
    <div class="card">
      <div class="card-title">College-wide applications</div>
      <div class="card-sub">Move applications through the pipeline on behalf of companies</div>
      <div class="table-wrap mt-12" style="border:none">
        <table class="tbl">
          <thead><tr><th>Student</th><th>Internship</th><th>Company</th><th>Applied</th><th>Status</th><th>Move to</th></tr></thead>
          <tbody>${data.items.map((a) => `
            <tr>
              <td><div class="flex items-center gap-8">${UI.avatar(a.student?.name)}<b>${UI.esc(a.student?.name || "—")}</b></div></td>
              <td>${UI.esc(a.internship.title)}</td>
              <td>${UI.esc(a.internship.company?.name || "—")}</td>
              <td class="muted">${UI.fmtDate(a.applied_at)}</td>
              <td>${UI.statusBadge(a.status)}</td>
              <td><select class="input" style="padding:6px 9px;font-size:12.5px" onchange="adminMoveStage(${a.id}, this.value)">
                <option value="">—</option>
                ${stages.map((s) => `<option value="${s}">${s.replace("_", " ")}</option>`).join("")}
              </select></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};
async function adminMoveStage(id, stage) {
  if (!stage) return;
  try { await API.post(`/api/admin/applications/${id}/stage`, { stage }); UI.toast("Application moved to " + stage.replace("_", " "), "success"); switchPage("applications"); }
  catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== RANKINGS ============================== */
App.pages.rankings = async function (content) {
  const data = await API.get("/api/admin/rankings");
  const rankCls = (r) => (r === 1 ? "top" : r === 2 ? "top2" : r === 3 ? "top3" : "");
  content.innerHTML = `
    <div class="card">
      <div class="card-title">College rankings</div>
      <div class="card-sub">Students ranked by reward points</div>
      <div class="table-wrap mt-12" style="border:none">
        <table class="tbl">
          <thead><tr><th>#</th><th>Student</th><th>Department</th><th>Branch</th><th>Streak</th><th>Points</th></tr></thead>
          <tbody>${data.rows.map((r) => `
            <tr>
              <td><span class="lb-rank ${rankCls(r.rank)}" style="width:28px;height:28px">${r.rank}</span></td>
              <td><div class="flex items-center gap-8">${UI.avatar(r.name)}<b>${UI.esc(r.name)}</b></div></td>
              <td>${UI.esc(r.department || "—")}</td>
              <td>${UI.esc(r.branch || "—")}</td>
              <td>🔥 ${r.streak}</td>
              <td><b style="color:var(--brand)">${r.points}</b></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};

/* ============================== ANALYTICS ============================== */
App.pages.analytics = async function (content) {
  const d = await API.get("/api/admin/analytics");
  content.innerHTML = `
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Applications per day (14 days)</div>
        <div class="mt-16">${UI.lineChart(d.applications_series.map((a) => ({ label: a.label, value: a.applications })))}</div>
      </div>
      <div class="card">
        <div class="card-title">Attendance per day (14 days)</div>
        <div class="mt-16">${UI.barChart(d.attendance_series.map((a) => ({ label: a.label.slice(0, 6), value: a.attendance })))}</div>
      </div>
    </div>
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Application status distribution</div>
        <div class="mt-16">${UI.donut(d.status_distribution)}</div>
      </div>
      <div class="card">
        <div class="card-title">Internships by domain</div>
        <div class="mt-16">${UI.barChart(Object.entries(d.domain_distribution).map(([k, v]) => ({ label: k.length > 12 ? k.slice(0, 11) + "…" : k, value: v })))}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Internships by company</div>
      <div class="grid grid-2 mt-12">
        ${Object.entries(d.company_distribution).map(([k, v]) => `
          <div class="flex justify-between items-center" style="padding:9px 0;border-bottom:1px dashed var(--line)">
            <span class="small bold">${UI.esc(k)}</span><span class="badge badge-blue">${v} internship${v > 1 ? "s" : ""}</span></div>`).join("")}
      </div>
    </div>`;
};

/* ============================== ANNOUNCEMENTS ============================== */
App.pages.announcements = async function (content) {
  const data = await API.get("/api/announcements");
  content.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Broadcast announcement</div>
        <div class="card-sub">Notifies every user in the audience instantly</div>
        <form onsubmit="return sendAnnouncement(event)">
          <div class="field"><label>Title</label><input class="input" name="title" required placeholder="Placement drive on Friday" /></div>
          <div class="field"><label>Message</label><textarea class="input" name="message" required placeholder="Details…"></textarea></div>
          <div class="field"><label>Audience</label>
            <select class="input" name="audience">
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="faculty">Faculty only</option>
              <option value="companies">Companies only</option>
            </select></div>
          <button class="btn btn-primary" type="submit">📢 Send announcement</button>
        </form>
      </div>
      <div class="card">
        <div class="card-title">Recent announcements</div>
        ${data.items.length ? data.items.map((a) => `
          <div style="padding:12px 0;border-bottom:1px dashed var(--line)">
            <div class="flex items-center gap-8"><b class="small">${UI.esc(a.title)}</b><span class="badge badge-gray">${UI.esc(a.audience)}</span></div>
            <div class="muted small">${UI.esc(a.message)}</div>
            <div class="muted" style="font-size:11px">${UI.timeAgo(a.created_at)}</div>
          </div>`).join("") : '<div class="empty" style="padding:16px">No announcements yet</div>'}
      </div>
    </div>`;
};
async function sendAnnouncement(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    await API.post("/api/admin/announcements", {
      title: fd.get("title"), message: fd.get("message"), audience: fd.get("audience"),
    });
    UI.toast("📢 Announcement broadcast!", "success");
    switchPage("announcements");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; }
}

/* ============================== REWARD CONFIG ============================== */
App.pages.rewards = async function (content) {
  const data = await API.get("/api/admin/reward-config");
  const labels = {
    daily_report: "Daily report approved", weekly_report: "Weekly summary approved",
    attendance_day: "Daily check-in", internship_completed: "Internship completed",
    certificate_verified: "Certificate verified",
  };
  content.innerHTML = `
    <div class="card" style="max-width:560px">
      <div class="card-title">Reward point configuration</div>
      <div class="card-sub">Points are awarded instantly when these actions happen</div>
      <form onsubmit="return saveRewardConfig(event)">
        ${Object.entries(labels).map(([key, label]) => `
          <div class="flex items-center justify-between gap-12" style="padding:13px 0;border-bottom:1px dashed var(--line)">
            <label for="rc-${key}" class="small bold">${UI.esc(label)}</label>
            <input class="input" id="rc-${key}" type="number" min="0" value="${data.config[key]}" style="width:90px;text-align:center" />
          </div>`).join("")}
        <button class="btn btn-primary mt-16" type="submit">Save configuration</button>
      </form>
    </div>`;
};
async function saveRewardConfig(e) {
  e.preventDefault();
  const payload = {};
  ["daily_report", "weekly_report", "attendance_day", "internship_completed", "certificate_verified"].forEach((k) => {
    payload[k] = Number(document.getElementById("rc-" + k).value) || 0;
  });
  try { await API.put("/api/admin/reward-config", payload); UI.toast("✅ Reward config saved.", "success"); }
  catch (err) { UI.toast("⚠️ " + err.message, "error"); }
}

/* ============================== ACTIVITY LOG ============================== */
App.pages.activity = async function (content) {
  const data = await API.get("/api/activity");
  content.innerHTML = `
    <div class="card">
      <div class="card-title">Activity log</div>
      <div class="card-sub">Every important action across the platform</div>
      <div class="table-wrap mt-12" style="border:none">
        <table class="tbl">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>${data.map((a) => `
            <tr>
              <td class="muted">${UI.timeAgo(a.created_at)}</td>
              <td><b>${UI.esc(a.actor || "—")}</b></td>
              <td><span class="badge badge-blue">${UI.esc(a.action.replace("_", " "))}</span></td>
              <td class="muted">${UI.esc(a.details || "")}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};
