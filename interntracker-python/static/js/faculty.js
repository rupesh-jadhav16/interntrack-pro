/* InternTracker — Faculty workspace */

/* ============================== DASHBOARD ============================== */
App.pages.dashboard = async function (content) {
  const d = await API.get("/api/faculty/dashboard");
  content.innerHTML = `
    <div class="role-banner faculty fade-in">
      <div class="rb-icon">${UI.icons.students}</div>
      <div>
        <h2>Faculty Dashboard</h2>
        <p>${d.student_count} assigned students · ${d.active_trackers} active internship trackers</p>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-family:var(--display);font-size:26px;font-weight:800">${d.at_risk.length}</div>
        <div style="font-size:11.5px;opacity:.85">students need attention</div>
      </div>
    </div>

    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon blue">${UI.icons.students}</div><div><div class="stat-value">${d.student_count}</div><div class="stat-label">Assigned students</div></div></div>
      <div class="stat"><div class="stat-icon teal">${UI.icons.tracker}</div><div><div class="stat-value">${d.active_trackers}</div><div class="stat-label">Active trackers</div></div></div>
      <div class="stat"><div class="stat-icon amber">${UI.icons.review}</div><div><div class="stat-value">${d.pending_daily + d.pending_weekly}</div><div class="stat-label">Reports to review</div></div></div>
      <div class="stat"><div class="stat-icon rose">⚠️</div><div><div class="stat-value">${d.at_risk.length}</div><div class="stat-label">At-risk students</div></div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Students needing attention</div><div class="card-sub">No streak, low attendance, or report gaps</div></div>
          <a href="#students" class="small" onclick="switchPage('students')">All students →</a></div>
        ${d.at_risk.length
          ? d.at_risk.map((r) => `
            <div class="flex gap-12" style="padding:12px 0;border-bottom:1px dashed var(--line)">
              ${UI.avatar(r.student.name)}
              <div style="flex:1;min-width:0">
                <div class="bold small">${UI.esc(r.student.name)}</div>
                ${r.flags.map((f) => `<div class="muted" style="font-size:12px">⚠️ ${UI.esc(f)}</div>`).join("")}
              </div>
              <button class="btn btn-sm btn-outline" onclick="viewStudent(${r.student.id})">View</button>
            </div>`).join("")
          : '<div class="empty" style="padding:20px">All students are on track 🎉</div>'}
      </div>
      <div class="card">
        <div class="card-title">Approved reports — last 8 weeks</div>
        <div class="mt-16">${UI.barChart(d.weekly_chart.map((w) => ({ label: w.label.slice(-3), value: w.reports })))}</div>
      </div>
    </div>`;
};

/* ============================== STUDENTS ============================== */
App.pages.students = async function (content) {
  const data = await API.get("/api/faculty/students");
  content.innerHTML = `
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Student</th><th>Branch</th><th>Year</th><th>Current internship</th><th>Applications</th><th>Flags</th><th></th></tr></thead>
        <tbody>
          ${data.items.map((s) => `
            <tr>
              <td><div class="flex items-center gap-8">${UI.avatar(s.student.name)}<div><b>${UI.esc(s.student.name)}</b><div class="muted">${s.student.points} pts · 🔥 ${s.student.streak}</div></div></div></td>
              <td>${UI.esc(s.branch || "—")}</td>
              <td>${UI.esc(s.year || "—")}</td>
              <td>${s.current_internship ? `<span class="badge badge-teal">${UI.esc(s.current_internship)}</span>` : '<span class="muted">—</span>'}</td>
              <td>${s.applications}</td>
              <td>${s.flags.length ? `<span class="badge badge-red">${s.flags.length} flag${s.flags.length > 1 ? "s" : ""}</span>` : '<span class="badge badge-green">OK</span>'}</td>
              <td><button class="btn btn-sm btn-outline" onclick="viewStudent(${s.student.id})">Details</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
};

async function viewStudent(id) {
  try {
    const d = await API.get("/api/faculty/students/" + id);
    const s = d.student;
    UI.openModal(`
      <div class="modal modal-lg">
        <div class="modal-head"><h3>${UI.esc(s.name)}</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
        <div class="modal-body">
          <div class="flex items-center gap-12 mb-16">
            ${UI.avatar(s.name, "lg")}
            <div><div class="bold" style="font-size:16px">${UI.esc(s.name)}</div>
              <div class="muted small">${UI.esc(d.profile.branch || "—")} · ${UI.esc(d.profile.year || "—")} · CGPA ${d.profile.cgpa ?? "—"}</div>
              <div class="muted small">${s.points} pts · 🔥 ${s.streak} day streak</div></div>
            ${d.tracker.company ? `<span class="badge badge-teal" style="margin-left:auto">● ${UI.esc(d.tracker.company)}</span>` : ""}
          </div>
          <div class="grid grid-2">
            <div>
              <div class="card-sub">Daily reports (latest)</div>
              ${d.daily_reports.slice(0, 5).map((r) => `
                <div style="padding:9px 0;border-bottom:1px dashed var(--line)">
                  <div class="flex justify-between"><b class="small">${UI.fmtDate(r.report_date)}</b>${UI.statusBadge(r.status)}</div>
                  <div class="muted small">${UI.esc(r.content)}</div>
                  ${r.feedback ? `<div class="small" style="color:var(--brand)">💬 ${UI.esc(r.feedback)}</div>` : ""}
                </div>`).join("") || '<div class="muted small">No reports</div>'}
            </div>
            <div>
              <div class="card-sub">Attendance (latest)</div>
              ${d.attendance.slice(0, 8).map((a) => `
                <div class="flex justify-between" style="padding:6px 0;border-bottom:1px dashed var(--line)">
                  <span class="small">${UI.fmtDate(a.day)}</span>
                  <span class="small muted">${a.check_in ? new Date(a.check_in).toLocaleTimeString("en-IN") : "—"} ${a.hours ? "· " + a.hours + "h" : ""}</span>
                </div>`).join("") || '<div class="muted small">No attendance</div>'}
              <div class="card-sub mt-16">Weekly reports</div>
              ${d.weekly_reports.slice(0, 3).map((r) => `
                <div style="padding:7px 0;border-bottom:1px dashed var(--line)"><span class="badge badge-blue">${UI.esc(r.week_label)}</span> ${UI.statusBadge(r.status)}</div>`).join("") || '<div class="muted small">None</div>'}
            </div>
          </div>
        </div>
      </div>`);
  } catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== REVIEW QUEUE ============================== */
App.pages.review = async function (content) {
  const data = await API.get("/api/faculty/reports/pending");
  content.innerHTML = `
    <div class="tabs">
      <button class="tab active" id="tabDaily">Daily reports (${data.daily.length})</button>
      <button class="tab" id="tabWeekly">Weekly summaries (${data.weekly.length})</button>
    </div>
    <div id="reviewBody"></div>`;
  const body = content.querySelector("#reviewBody");
  const render = (kind) => {
    const items = kind === "daily" ? data.daily : data.weekly;
    if (!items.length) { body.innerHTML = `<div class="card">${UI.empty("Queue is empty 🎉", "New reports appear here as students submit them.")}</div>`; return; }
    body.innerHTML = items.map((r) => `
      <div class="review-card fade-in">
        <div class="rc-head">
          <div class="flex items-center gap-8">${UI.avatar(r.student.name)}<div><div class="bold small">${UI.esc(r.student.name)}</div>
            <div class="muted" style="font-size:12px">${kind === "daily" ? UI.fmtDate(r.report_date) + " · " + r.hours + " hrs" : r.week_label}</div></div></div>
          <span class="badge badge-amber">Pending</span>
        </div>
        <div class="rc-body">${UI.esc(r.content)}</div>
        ${r.highlights ? `<div class="small mb-12"><b>Highlights:</b> ${UI.esc(r.highlights)}</div>` : ""}
        <div class="field"><input class="input" placeholder="Feedback (optional)" id="fb-${r.id}" /></div>
        <div class="rc-actions">
          <button class="btn btn-success btn-sm" onclick="reviewReport('${kind}', ${r.id}, true)">${UI.icons.check} Approve (+${kind === "daily" ? 10 : 50} pts)</button>
          <button class="btn btn-danger btn-sm" onclick="reviewReport('${kind}', ${r.id}, false)">${UI.icons.x} Reject</button>
        </div>
      </div>`).join("");
  };
  content.querySelector("#tabDaily").addEventListener("click", () => {
    content.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    content.querySelector("#tabDaily").classList.add("active");
    render("daily");
  });
  content.querySelector("#tabWeekly").addEventListener("click", () => {
    content.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    content.querySelector("#tabWeekly").classList.add("active");
    render("weekly");
  });
  render("daily");
};

async function reviewReport(kind, id, approve) {
  const fb = document.getElementById("fb-" + id)?.value || "";
  try {
    await API.post(`/api/faculty/reports/${kind}/${id}/review`, { approve, feedback: fb });
    UI.toast(approve ? "✅ Report approved — points awarded." : "Report rejected with feedback.", approve ? "success" : "info");
    switchPage("review");
  } catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== PERFORMANCE ============================== */
App.pages.performance = async function (content) {
  const d = await API.get("/api/faculty/performance");
  content.innerHTML = `
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Approved daily reports — last 8 weeks</div>
        <div class="mt-16">${UI.barChart(d.weekly_chart.map((w) => ({ label: w.label.slice(-3), value: w.reports })))}</div>
      </div>
      <div class="card">
        <div class="card-title">Students present — last 14 days</div>
        <div class="mt-16">${UI.lineChart(d.attendance_chart.map((a) => ({ label: a.label, value: a.present })))}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">How to read this</div>
      <div class="card-sub">A healthy batch shows consistent weekly report volume and stable attendance</div>
      <div class="grid grid-3 mt-12">
        <div class="stat"><div class="stat-icon green">📈</div><div><div class="stat-value">↑ Reports</div><div class="stat-label">Approved report volume</div></div></div>
        <div class="stat"><div class="stat-icon blue">📅</div><div><div class="stat-value">Present</div><div class="stat-label">Daily attendance count</div></div></div>
        <div class="stat"><div class="stat-icon amber">⚠️</div><div><div class="stat-label" style="margin-top:6px">Dips = at-risk students. Review them under Students → Details.</div></div></div>
      </div>
    </div>`;
};
