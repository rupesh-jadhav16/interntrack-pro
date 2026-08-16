/* InternTracker — Company workspace */

/* ============================== DASHBOARD ============================== */
App.pages.dashboard = async function (content) {
  const d = await API.get("/api/company/dashboard");
  content.innerHTML = `
    <div class="role-banner company fade-in">
      <div class="rb-icon">${UI.icons.companies}</div>
      <div>
        <h2>${UI.esc(d.company.name)}</h2>
        <p>${d.verified ? "✓ Verified company — students trust your listings" : d.verification_status === "pending" ? "⏳ Awaiting T&amp;P verification — internships are visible after approval" : "Your verification was rejected — update your profile to re-submit"}</p>
      </div>
      ${d.verified ? `<span style="margin-left:auto;background:rgba(255,255,255,.18);padding:6px 14px;border-radius:99px;font-weight:700;font-size:12.5px">${UI.verifiedBadge()}</span>` : ""}
    </div>

    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon blue">${UI.icons.explorer}</div><div><div class="stat-value">${d.internship_count}</div><div class="stat-label">Internships · ${d.open_internships} open</div></div></div>
      <div class="stat"><div class="stat-icon amber">${UI.icons.applications}</div><div><div class="stat-value">${d.application_count}</div><div class="stat-label">Applications received</div></div></div>
      <div class="stat"><div class="stat-icon green">${UI.icons.students}</div><div><div class="stat-value">${d.intern_count}</div><div class="stat-label">Current interns</div></div></div>
      <div class="stat"><div class="stat-icon violet">★</div><div><div class="stat-value">${d.verified ? "Verified" : "Pending"}</div><div class="stat-label">Company status</div></div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Applications by stage</div><div class="card-sub">Your hiring pipeline</div></div>
          <a href="#applications" class="small" onclick="switchPage('applications')">Manage →</a></div>
        <div class="mt-8">${UI.donut(d.status_counts)}</div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Current interns</div><div class="card-sub">Monitor progress in real time</div></div>
          <a href="#interns" class="small" onclick="switchPage('interns')">Monitor →</a></div>
        ${d.interns.length ? d.interns.map((i) => `
          <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px dashed var(--line)">
            ${UI.avatar(i.student.name)}
            <div style="flex:1;min-width:0"><div class="bold small">${UI.esc(i.student.name)}</div><div class="muted" style="font-size:12px">${UI.esc(i.internship)} · joined ${UI.fmtDate(i.joined_at)}</div></div>
            <span class="badge badge-teal">● Active</span>
          </div>`).join("") : '<div class="empty" style="padding:16px">No interns yet — select applicants to bring them onboard.</div>'}
      </div>
    </div>`;
};

/* ============================== INTERNSHIPS ============================== */
App.pages.internships = async function (content) {
  const data = await API.get("/api/company/internships");
  const comp = (await API.get("/api/company/profile")).company;
  content.innerHTML = `
    <div class="mb-16" style="display:flex;justify-content:flex-end">
      <button class="btn btn-primary" onclick="openInternshipModal()">+ Post new internship</button>
    </div>
    <div class="grid grid-2">
      ${data.items.map((i) => `
        <div class="intern-card fade-in">
          <div class="intern-head">
            <div class="comp-logo" style="background:${UI.avatarColor(comp.name)}">${UI.esc(comp.name[0])}</div>
            <div style="min-width:0"><div class="t">${UI.esc(i.title)}</div><div class="c">${UI.esc(i.domain || "General")} · ${i.applicant_count} applicant${i.applicant_count === 1 ? "" : "s"}</div></div>
            ${UI.statusBadge(i.status)}
          </div>
          <div class="intern-meta">
            <span class="meta-chip">${UI.icons.pin} ${UI.esc(i.location || "Remote")}</span>
            <span class="meta-chip">${UI.modeIcon(i.mode)}</span>
            <span class="meta-chip">${UI.icons.clock} ${i.duration_months} mo</span>
            <span class="meta-chip">${UI.icons.rupee} ${UI.esc(i.stipend)}</span>
          </div>
          <div class="intern-foot">
            <span class="posted">Deadline ${i.deadline ? UI.fmtDate(i.deadline) : "—"}</span>
            <div style="margin-left:auto;display:flex;gap:8px">
              <button class="btn btn-sm btn-outline" onclick='openInternshipModal(${JSON.stringify(i)})'>Edit</button>
              ${i.status === "open" ? `<button class="btn btn-sm btn-danger" onclick="closeInternship(${i.id})">Close</button>` : ""}
            </div>
          </div>
        </div>`).join("")}
    </div>`;
};

function openInternshipModal(i) {
  const isEdit = !!i;
  i = i || {};
  UI.openModal(`
    <div class="modal modal-lg">
      <div class="modal-head"><h3>${isEdit ? "Edit internship" : "Post new internship"}</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
      <div class="modal-body">
        <form onsubmit="return saveInternship(event, ${isEdit ? i.id : "null"})">
          <div class="grid grid-2">
            <div class="field"><label>Title</label><input class="input" name="title" required value="${UI.esc(i.title || "")}" placeholder="Backend Engineering Intern" /></div>
            <div class="field"><label>Domain</label><input class="input" name="domain" value="${UI.esc(i.domain || "")}" placeholder="Software Development" /></div>
          </div>
          <div class="field"><label>Description</label><textarea class="input" name="description" placeholder="What will the intern do?">${UI.esc(i.description || "")}</textarea></div>
          <div class="grid grid-3">
            <div class="field"><label>Location</label><input class="input" name="location" value="${UI.esc(i.location || "")}" placeholder="Bangalore" /></div>
            <div class="field"><label>Mode</label>
              <select class="input" name="mode">
                ${["remote", "onsite", "hybrid", "wfh"].map((m) => `<option value="${m}" ${i.mode === m ? "selected" : ""}>${m}</option>`).join("")}
              </select></div>
            <div class="field"><label>Duration (months)</label><input class="input" type="number" name="duration_months" min="1" max="12" value="${i.duration_months || 3}" /></div>
          </div>
          <div class="grid grid-3">
            <div class="field"><label>Stipend</label><input class="input" name="stipend" value="${UI.esc(i.stipend || "")}" placeholder="₹20,000/month or Unpaid" /></div>
            <div class="field"><label>Paid</label><select class="input" name="paid"><option value="true" ${i.paid ? "selected" : ""}>Paid</option><option value="false" ${!i.paid ? "selected" : ""}>Unpaid</option></select></div>
            <div class="field"><label>Deadline</label><input class="input" type="date" name="deadline" value="${i.deadline || ""}" /></div>
          </div>
          <div class="field"><label>Skills <span class="hint">(comma separated)</span></label><input class="input" name="skills" value="${UI.esc((i.skills || []).join(", "))}" placeholder="Python, FastAPI, SQL" /></div>
          <div class="field"><label>Seats</label><input class="input" type="number" name="seats" min="1" value="${i.seats || 1}" /></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${isEdit ? "Save changes" : "Post internship"}</button>
        </form>
      </div>
    </div>`);
}

async function saveInternship(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Saving…';
  try {
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get("title"), description: fd.get("description") || "", domain: fd.get("domain") || "",
      location: fd.get("location") || "", mode: fd.get("mode"), duration_months: Number(fd.get("duration_months")) || 3,
      stipend: fd.get("stipend") || "Unpaid", paid: fd.get("paid") === "true",
      skills: (fd.get("skills") || "").split(",").map((s) => s.trim()).filter(Boolean),
      seats: Number(fd.get("seats")) || 1, deadline: fd.get("deadline") || null,
    };
    if (id) await API.put(`/api/company/internships/${id}`, payload);
    else await API.post("/api/company/internships", payload);
    UI.toast(id ? "✅ Internship updated." : "🚀 Internship posted!", "success");
    UI.closeModal();
    switchPage("internships");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = id ? "Save changes" : "Post internship"; }
}

async function closeInternship(id) {
  if (!UI.promptDelete()) return;
  try { await API.post(`/api/company/internships/${id}/close`); UI.toast("Internship closed.", "info"); switchPage("internships"); }
  catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== APPLICANTS ============================== */
App.pages.applications = async function (content) {
  const data = await API.get("/api/company/applications");
  const stages = ["under_review", "shortlisted", "interview", "selected", "joined", "rejected"];
  content.innerHTML = `
    <div class="grid grid-3 mb-16">
      <div class="stat"><div class="stat-icon blue">${UI.icons.applications}</div><div><div class="stat-value">${data.items.length}</div><div class="stat-label">Total applicants</div></div></div>
      <div class="stat"><div class="stat-icon amber">${UI.icons.clock}</div><div><div class="stat-value">${data.items.filter((a) => a.status === "under_review" || a.status === "shortlisted" || a.status === "interview").length}</div><div class="stat-label">In pipeline</div></div></div>
      <div class="stat"><div class="stat-icon green">${UI.icons.students}</div><div><div class="stat-value">${data.items.filter((a) => a.status === "joined").length}</div><div class="stat-label">Joined</div></div></div>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Candidate</th><th>Internship</th><th>Applied</th><th>Status</th><th>Move to</th></tr></thead>
        <tbody>
          ${data.items.map((a) => `
            <tr>
              <td><div class="flex items-center gap-8">${UI.avatar(a.student.name)}<div><b>${UI.esc(a.student.name)}</b><div class="muted" style="font-size:11.5px">${a.student.cgpa ? "CGPA " + a.student.cgpa : ""} ${a.student.location ? "· " + UI.esc(a.student.location) : ""}</div></div></div></td>
              <td>${UI.esc(a.internship.title)}</td>
              <td class="muted">${UI.fmtDate(a.applied_at)}</td>
              <td>${UI.statusBadge(a.status)}</td>
              <td><select class="input" style="padding:6px 9px;font-size:12.5px" onchange="moveApplicant(${a.id}, this.value)">
                <option value="">—</option>
                ${stages.map((s) => `<option value="${s}">${s.replace("_", " ")}</option>`).join("")}
              </select></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
};
async function moveApplicant(id, stage) {
  if (!stage) return;
  try { await API.post(`/api/company/applications/${id}/stage`, { stage }); UI.toast("Moved to " + stage.replace("_", " ") + " — student notified.", "success"); switchPage("applications"); }
  catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== INTERN MONITOR ============================== */
App.pages.interns = async function (content) {
  const data = await API.get("/api/company/interns");
  content.innerHTML = `
    <div class="grid grid-2">
      ${data.items.length ? data.items.map((i) => `
        <div class="card fade-in">
          <div class="card-head">
            <div class="flex items-center gap-12">
              ${UI.avatar(i.student.name, "lg")}
              <div><div class="bold" style="font-size:15px">${UI.esc(i.student.name)}</div>
                <div class="muted small">${UI.esc(i.tracker_company)} · ${UI.esc(i.internship)}</div></div>
            </div>
            <span class="badge badge-teal">● Interning</span>
          </div>
          <div class="grid grid-3 mb-12">
            <div style="text-align:center"><div class="bold" style="font-size:20px;color:var(--brand)">${i.attendance_pct}%</div><div class="muted" style="font-size:11.5px">Attendance (30d)</div></div>
            <div style="text-align:center"><div class="bold" style="font-size:20px;color:var(--brand)">${i.approved_reports}</div><div class="muted" style="font-size:11.5px">Approved reports</div></div>
            <div style="text-align:center"><div class="bold" style="font-size:20px;color:var(--brand)">🔥 ${i.streak}</div><div class="muted" style="font-size:11.5px">Day streak</div></div>
          </div>
          <div class="mb-8"><div class="muted small mb-8">Attendance rate</div>${UI.progress(i.attendance_pct, i.attendance_pct < 60 ? "rose" : "")}</div>
          ${i.feedback ? `<div class="small mt-12" style="background:var(--surface-2);border-radius:9px;padding:10px 12px">💬 <b>Your last feedback:</b> ${"★".repeat(i.feedback.rating)}${"☆".repeat(5 - i.feedback.rating)} ${UI.esc(i.feedback.comment || "")}</div>` : ""}
          <div class="mt-12" style="display:flex;gap:8px">
            <button class="btn btn-sm btn-outline" onclick='feedbackModal(${i.student.id}, ${JSON.stringify(i.student.name)})'>💬 Give feedback</button>
            <button class="btn btn-sm btn-ghost" onclick="viewInternStudent(${i.student.id})">Full profile</button>
          </div>
        </div>`).join("") : `<div class="card">${UI.empty("No interns yet", "When you move an applicant to 'joined', they appear here with live progress.")}</div>`}
    </div>`;
};

function feedbackModal(id, name) {
  UI.openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Feedback for ${UI.esc(name)}</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
      <div class="modal-body">
        <form onsubmit="return submitFeedback(event, ${id})">
          <div class="field"><label>Rating</label>
            <select class="input" name="rating">${[5, 4, 3, 2, 1].map((r) => `<option value="${r}">${"★".repeat(r)}${"☆".repeat(5 - r)}</option>`).join("")}</select></div>
          <div class="field"><label>Comment</label><textarea class="input" name="comment" placeholder="How is the intern performing?"></textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Send feedback</button>
        </form>
      </div>
    </div>`);
}
async function submitFeedback(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    await API.post(`/api/company/interns/${id}/feedback`, { rating: Number(fd.get("rating")), comment: fd.get("comment") || "" });
    UI.toast("💬 Feedback sent to the intern.", "success");
    UI.closeModal();
    switchPage("interns");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; }
}

async function viewInternStudent(id) {
  try {
    const d = await API.get("/api/faculty/students/" + id);
    const s = d.student;
    UI.openModal(`
      <div class="modal modal-lg">
        <div class="modal-head"><h3>${UI.esc(s.name)} — internship progress</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
        <div class="modal-body">
          <div class="flex items-center gap-12 mb-16">
            ${UI.avatar(s.name, "lg")}
            <div><div class="bold" style="font-size:16px">${UI.esc(s.name)}</div>
              <div class="muted small">${s.points} pts · 🔥 ${s.streak} day streak · ${d.tracker.company ? "At " + UI.esc(d.tracker.company) : ""}</div></div>
          </div>
          <div class="grid grid-2">
            <div>
              <div class="card-sub">Recent daily reports</div>
              ${d.daily_reports.slice(0, 4).map((r) => `
                <div style="padding:8px 0;border-bottom:1px dashed var(--line)">
                  <div class="flex justify-between"><b class="small">${UI.fmtDate(r.report_date)}</b>${UI.statusBadge(r.status)}</div>
                  <div class="muted small">${UI.esc(r.content)}</div></div>`).join("") || '<div class="muted small">None yet</div>'}
            </div>
            <div>
              <div class="card-sub">Attendance</div>
              ${d.attendance.slice(0, 6).map((a) => `
                <div class="flex justify-between" style="padding:5px 0;border-bottom:1px dashed var(--line)">
                  <span class="small">${UI.fmtDate(a.day)}</span>
                  <span class="small muted">${a.check_in ? new Date(a.check_in).toLocaleTimeString("en-IN") : "—"} · ${a.hours ? a.hours + "h" : "—"}</span></div>`).join("") || '<div class="muted small">None yet</div>'}
            </div>
          </div>
        </div>
      </div>`);
  } catch (e) {
    // faculty-only endpoint: fall back to intern card data
    UI.toast("Profile details are only visible to assigned faculty.", "warning");
  }
}

/* ============================== PROFILE ============================== */
App.pages.profile = async function (content) {
  const data = await API.get("/api/company/profile");
  const c = data.company;
  content.innerHTML = `
    <div class="grid-side">
      <div class="card card-pad-lg">
        <div class="card-title">Company profile</div>
        <div class="card-sub">Verified companies get the trusted badge on every internship</div>
        <form onsubmit="return saveCompanyProfile(event)">
          <div class="grid grid-2">
            <div class="field"><label>Company name</label><input class="input" name="name" required value="${UI.esc(c.name)}" /></div>
            <div class="field"><label>Website</label><input class="input" name="website" value="${UI.esc(c.website || "")}" placeholder="https://…" /></div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Industry</label><input class="input" name="industry" value="${UI.esc(c.industry || "")}" placeholder="Software" /></div>
            <div class="field"><label>HQ location</label><input class="input" name="location" value="${UI.esc(c.location || "")}" placeholder="Bangalore" /></div>
          </div>
          <div class="field"><label>About the company</label><textarea class="input" name="description" placeholder="What does your company do?">${UI.esc(c.description || "")}</textarea></div>
          <div class="field"><label>Verification documents <span class="hint">(GST / incorporation / any proof — PDF)</span></label>
            <input class="input" type="file" name="docs" accept=".pdf,.png,.jpg" />
            ${c.docs ? `<span class="hint">Current doc: <a href="${UI.esc(c.docs)}" target="_blank">view</a></span>` : ""}</div>
          <button class="btn btn-primary btn-lg" type="submit">Save &amp; ${data.verified ? "update" : "re-submit for verification"}</button>
        </form>
      </div>
      <div>
        <div class="card mb-16">
          <div class="card-title">Verification status</div>
          <div class="mt-12 text-center">
            <div style="font-size:40px">${data.verified ? "🛡️" : data.verification_status === "pending" ? "⏳" : "⚠️"}</div>
            <div class="bold mt-8">${data.verified ? "Verified company" : data.verification_status === "pending" ? "Awaiting T&amp;P review" : "Verification rejected"}</div>
            <div class="muted small mt-8">${data.verification_note ? "Reason: " + UI.esc(data.verification_note) : data.verified ? "Your badge is live on all internships." : "The T&P cell reviews new submissions within 1–2 days."}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Account</div>
          <div class="kv mt-12">
            <span class="k">Email</span><span>${UI.esc(data.user.email)}</span>
            <span class="k">Role</span><span>Company</span>
            <span class="k">Member since</span><span>${UI.fmtDate(data.user.created_at)}</span>
          </div>
        </div>
      </div>
    </div>`;
};

async function saveCompanyProfile(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Saving…';
  try {
    const fd = new FormData(e.target);
    let docs = "";
    const file = fd.get("docs");
    if (file && file.size) docs = await API.upload(file);
    const existing = await API.get("/api/company/profile");
    await API.put("/api/company/profile", {
      name: fd.get("name"), website: fd.get("website") || "", industry: fd.get("industry") || "",
      description: fd.get("description") || "", location: fd.get("location") || "",
      docs: docs || existing.company.docs || "",
    });
    UI.toast("✅ Company profile saved" + (existing.verified ? "" : " — submitted for verification."), "success");
    switchPage("profile");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = "Save"; }
}
