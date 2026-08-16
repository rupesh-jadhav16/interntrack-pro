/* InternTracker — Student workspace */

/* ============================== DASHBOARD ============================== */
App.pages.dashboard = async function (content) {
  const d = await API.get("/api/student/dashboard");
  const u = d.user;
  const tracker = d.tracker;
  const appStatus = d.internship_status ? `<div style="margin-top:6px">${UI.statusBadge(d.internship_status)}</div>` : "";
  const bannerIcon = UI.icons.flame;

  const deadlineChips = (d.upcoming_deadlines || []).length
    ? d.upcoming_deadlines.map((x) => `
      <div class="flex items-center justify-between gap-8" style="padding:9px 0;border-bottom:1px dashed var(--line)">
        <div style="min-width:0"><div class="bold small">${UI.esc(x.title)}</div><div class="muted" style="font-size:11.5px">${UI.esc(x.company)}</div></div>
        <span class="badge ${new Date(x.deadline) - new Date() < 86400000 * 2 ? "badge-red" : "badge-amber"}">${UI.daysLeft(x.deadline)}</span>
      </div>`).join("")
    : `<div class="empty" style="padding:16px">No upcoming deadlines 🎉</div>`;

  content.innerHTML = `
    <div class="role-banner student fade-in">
      <div class="rb-icon">${UI.icons.flame}</div>
      <div>
        <h2>Welcome back, ${UI.esc(u.name)} 👋</h2>
        <p>${d.streak > 0 ? `You're on a <b>${d.streak}-day streak</b> — keep the flame alive!` : "Start today's check-in to light your streak 🔥"} ${tracker ? `· Interning at <b>${UI.esc(tracker.company)}</b>` : ""}</p>
      </div>
      <div style="margin-left:auto;text-align:right" class="hide-sm">
        <div class="flex items-center gap-8" style="justify-content:flex-end">
          <span class="flame">🔥</span><span style="font-family:var(--display);font-size:26px;font-weight:800">${d.streak}</span>
        </div>
        <div style="font-size:11.5px;opacity:.8">day streak</div>
      </div>
    </div>

    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon teal">${UI.icons.flame}</div><div><div class="stat-value">${d.streak} <span style="font-size:14px;color:var(--ink-3)">🔥</span></div><div class="stat-label">Current streak</div></div></div>
      <div class="stat"><div class="stat-icon amber">★</div><div><div class="stat-value">${d.points}</div><div class="stat-label">Reward points · rank #${d.rank}</div></div></div>
      <div class="stat"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg></div><div><div class="stat-value">${d.attendance_pct}%</div><div class="stat-label">Attendance this month</div></div></div>
      <div class="stat"><div class="stat-icon violet">${UI.icons.applications}</div><div><div class="stat-value">${d.applications_count}</div><div class="stat-label">Applications · ${d.saved_count} saved</div></div></div>
    </div>

    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-head">
          <div><div class="card-title">Current internship</div><div class="card-sub">Your active tracker</div></div>
          ${tracker ? `<a href="#tracker" class="btn btn-sm" onclick="switchPage('tracker')">Manage</a>` : ""}
        </div>
        ${tracker ? `
          <div class="flex items-center gap-12 mb-12">
            <div class="avatar lg" style="background:${UI.avatarColor(tracker.company)}">${UI.esc(tracker.company[0])}</div>
            <div>
              <div class="bold" style="font-size:16px">${UI.esc(tracker.company)}</div>
              <div class="muted">${UI.esc(tracker.role)} · ${UI.modeIcon(tracker.mode)}</div>
              <div class="muted small">${tracker.start_date ? UI.fmtDate(tracker.start_date) : ""} → ${tracker.end_date ? UI.fmtDate(tracker.end_date) : "ongoing"}</div>
            </div>
          </div>
          ${appStatus}
          <div class="mt-12">
            <div class="flex justify-between mb-8 small"><span class="muted">Weekly report</span>${d.weekly_done ? '<span class="badge badge-green">Submitted ✓</span>' : '<span class="badge badge-amber">Pending</span>'}</div>
            <div class="flex justify-between small"><span class="muted">Today's daily report</span>${d.daily_done ? '<span class="badge badge-green">Submitted ✓</span>' : '<span class="badge badge-red">Not yet</span>'}</div>
          </div>
        ` : `
          <div class="empty">
            <p style="margin-bottom:14px">No active internship tracker. Activate one when you start your internship.</p>
            <button class="btn btn-primary" onclick="switchPage('tracker')">Activate tracker →</button>
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-head">
          <div><div class="card-title">Upcoming deadlines</div><div class="card-sub">Applied &amp; saved internships</div></div>
          <a href="#deadlines" onclick="switchPage('deadlines')" class="small">View all →</a>
        </div>
        ${deadlineChips}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Profile completion</div><div class="card-sub">Higher completion = better shortlists</div></div><span class="bold" style="font-size:18px;color:var(--brand)">${d.profile_completion}%</span></div>
        ${UI.progress(d.profile_completion)}
        ${d.profile_completion < 100 ? `<button class="btn btn-sm btn-primary mt-12" onclick="switchPage('profile')">Complete profile</button>` : '<div class="small muted mt-12">Perfect profile! Companies can see everything.</div>'}
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Recent notifications</div><div class="card-sub">${d.unread_notifications ? d.unread_notifications + " unread" : "All caught up"}</div></div></div>
        <div id="dashNotifs"></div>
      </div>
    </div>`;

  // notifications list
  const notifBox = content.querySelector("#dashNotifs");
  try {
    const n = await API.get("/api/notifications");
    notifBox.innerHTML = n.slice(0, 5).length
      ? n.slice(0, 5).map((x) => `
        <div class="flex gap-8 ${x.read ? "" : "bold"}" style="padding:8px 0;border-bottom:1px dashed var(--line)">
          <span>${x.type === "success" ? "✅" : x.type === "warning" ? "⚠️" : "🔔"}</span>
          <div><div class="small">${UI.esc(x.title)}</div><div class="muted" style="font-size:11.5px">${UI.esc(x.message)} · ${UI.timeAgo(x.created_at)}</div></div>
        </div>`).join("")
      : '<div class="empty" style="padding:12px">No notifications</div>';
  } catch (e) { notifBox.innerHTML = ""; }
};

/* ============================== EXPLORER ============================== */
App.pages.explorer = async function (content) {
  let geo = { lat: null, lng: null, maxDistance: null, usingGeo: false };
  let filters = { q: "", location: "", mode: "", paid: "", minStipend: 0, duration: 0, domain: "", skill: "", company: "", sort: "recent" };

  content.innerHTML = `
    <div class="card mb-16">
      <div class="grid grid-2" style="grid-template-columns:1.4fr 1fr">
        <div class="field" style="margin:0">
          <label>Search internships</label>
          <div class="input-icon"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--ink-3)">${UI.icons.explorer}</span><input class="input input-search" id="expQ" placeholder="Title, skills, company…" /></div>
        </div>
        <div class="field" style="margin:0">
          <label>Location</label>
          <div style="display:flex;gap:8px">
            <input class="input" id="expLoc" placeholder="City (e.g. Bangalore)" />
            <button class="btn" id="expGeo" title="Use my location" style="flex-shrink:0">📍</button>
          </div>
        </div>
      </div>
      <div class="flex wrap gap-8 mt-12">
        <button class="chip active" data-mode="">All modes</button>
        <button class="chip" data-mode="remote">🌐 Remote</button>
        <button class="chip" data-mode="onsite">🏢 On-site</button>
        <button class="chip" data-mode="hybrid">🔀 Hybrid</button>
        <button class="chip" data-mode="wfh">🏠 WFH</button>
        <span style="width:1px;height:26px;background:var(--line)"></span>
        <button class="chip" data-paid="">Paid + Unpaid</button>
        <button class="chip" data-paid="paid">💰 Paid only</button>
        <button class="chip" data-paid="unpaid">🆓 Unpaid</button>
      </div>
      <div class="flex wrap gap-8 mt-8">
        <select class="input" id="expDomain" style="width:auto;min-width:170px">
          <option value="">All domains</option>
        </select>
        <select class="input" id="expDuration" style="width:auto">
          <option value="0">Any duration</option><option value="2">≤ 2 months</option><option value="3">≤ 3 months</option>
          <option value="4">≤ 4 months</option><option value="6">≤ 6 months</option>
        </select>
        <select class="input" id="expSort" style="width:auto">
          <option value="recent">Sort: Newest</option><option value="deadline">Sort: Deadline</option><option value="stipend">Sort: Stipend</option>
        </select>
        ${geo.usingGeo ? "" : `<button class="btn btn-sm" id="expNearMe" style="border-color:var(--amber);color:#b45309">📍 Internships near me</button>`}
        <span class="small muted" id="expCount" style="margin-left:auto;align-self:center"></span>
      </div>
    </div>
    <div id="expResults">${UI.skeleton(4)}</div>`;

  const load = async () => {
    const qs = new URLSearchParams();
    if (filters.q) qs.set("q", filters.q);
    if (filters.location) qs.set("location", filters.location);
    if (filters.mode) qs.set("mode", filters.mode);
    if (filters.paid) qs.set("paid", filters.paid);
    if (filters.minStipend) qs.set("min_stipend", filters.minStipend);
    if (filters.duration) qs.set("duration", filters.duration);
    if (filters.domain) qs.set("domain", filters.domain);
    if (filters.sort) qs.set("sort", filters.sort);
    if (geo.lat != null) { qs.set("lat", geo.lat); qs.set("lng", geo.lng); }
    if (geo.maxDistance) qs.set("max_distance", geo.maxDistance);
    const data = await API.get("/api/internships?" + qs.toString());
    // populate domains once
    const sel = content.querySelector("#expDomain");
    if (sel && sel.options.length <= 1) {
      data.domains.forEach((dm) => sel.insertAdjacentHTML("beforeend", `<option value="${UI.esc(dm)}">${UI.esc(dm)}</option>`));
    }
    content.querySelector("#expCount").textContent = `${data.count} internship${data.count === 1 ? "" : "s"} found`;
    renderResults(content.querySelector("#expResults"), data.items);
  };

  content.querySelector("#expQ").addEventListener("input", debounce((e) => { filters.q = e.target.value.trim(); load(); }, 350));
  content.querySelector("#expLoc").addEventListener("input", debounce((e) => { filters.location = e.target.value.trim(); load(); }, 350));
  content.querySelectorAll("#expDomain,#expDuration,#expSort").forEach((s) => s.addEventListener("change", (e) => {
    if (e.target.id === "expDomain") filters.domain = e.target.value;
    if (e.target.id === "expDuration") filters.duration = Number(e.target.value);
    if (e.target.id === "expSort") filters.sort = e.target.value;
    load();
  }));
  content.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    c.classList.toggle("active");
    const group = c.dataset.mode !== undefined ? "mode" : "paid";
    if (group === "mode") {
      filters.mode = c.classList.contains("active") && c.dataset.mode ? c.dataset.mode : "";
      content.querySelectorAll(".chip[data-mode]").forEach((o) => { if (o !== c) o.classList.remove("active"); });
    } else {
      filters.paid = c.classList.contains("active") && c.dataset.paid ? c.dataset.paid : "";
      content.querySelectorAll(".chip[data-paid]").forEach((o) => { if (o !== c) o.classList.remove("active"); });
    }
    load();
  }));
  const geoBtn = content.querySelector("#expGeo");
  if (geoBtn) geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return UI.toast("Geolocation not supported", "warning");
    navigator.geolocation.getCurrentPosition((pos) => {
      geo.lat = pos.coords.latitude; geo.lng = pos.coords.longitude;
      geo.usingGeo = true;
      geoBtn.textContent = "📍 Located";
      geoBtn.style.borderColor = "var(--brand)";
      UI.toast("Location captured — showing internships by distance", "success");
      load();
    }, () => UI.toast("Location permission denied", "error"));
  });
  const nearMe = content.querySelector("#expNearMe");
  if (nearMe) nearMe.addEventListener("click", () => {
    if (!navigator.geolocation) return UI.toast("Geolocation not supported", "warning");
    navigator.geolocation.getCurrentPosition((pos) => {
      geo.lat = pos.coords.latitude; geo.lng = pos.coords.longitude;
      geo.maxDistance = 100; geo.usingGeo = true;
      nearMe.remove();
      UI.toast("Showing internships within 100 km 📍", "success");
      load();
    }, () => UI.toast("Location permission denied", "error"));
  });

  load();
};

function renderResults(el, items) {
  if (!items.length) {
    el.innerHTML = UI.empty("No internships match your filters", "Try removing a filter or searching a different city.");
    return;
  }
  el.innerHTML = `<div class="grid grid-2" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">` + items.map((i) => {
    const comp = i.company || {};
    const deadlineBadge = i.deadline && new Date(i.deadline) < new Date() ? '<span class="badge badge-red">Closed soon</span>' : "";
    return `
    <div class="intern-card fade-in">
      <div class="intern-head">
        <div class="comp-logo" style="background:${UI.avatarColor(comp.name)}">${UI.esc((comp.name || "?")[0])}</div>
        <div style="min-width:0">
          <div class="t">${UI.esc(i.title)}</div>
          <div class="c">${UI.esc(comp.name)} ${comp.verified ? UI.verifiedBadge() : ""}</div>
        </div>
        <button class="btn btn-ghost btn-sm save-btn" data-id="${i.id}" data-saved="${i.saved}" title="Save" style="margin-left:auto;flex-shrink:0;padding:6px 8px">${i.saved ? "🔖" : "🔖"}</button>
      </div>
      <div class="intern-meta">
        <span class="meta-chip">${UI.icons.pin} ${UI.esc(i.location || "Remote")}</span>
        <span class="meta-chip">${UI.modeIcon(i.mode)}</span>
        <span class="meta-chip">${UI.icons.clock} ${i.duration_months} mo</span>
        <span class="meta-chip">${UI.icons.rupee} ${UI.esc(i.stipend)}</span>
        ${i.distance != null ? `<span class="meta-chip" style="background:var(--amber-soft);color:#b45309">📍 ${i.distance.toFixed(0)} km</span>` : ""}
      </div>
      ${i.skills.length ? `<div class="skill-pills">${i.skills.map((s) => `<span class="skill-pill">${UI.esc(s)}</span>`).join("")}</div>` : ""}
      <div class="intern-foot">
        <span class="posted">Posted ${UI.timeAgo(i.posted_at)} · ${i.deadline ? "Deadline " + UI.fmtDate(i.deadline) : ""}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-sm btn-outline" onclick='openInternshipDetail(${i.id})'>Details</button>
          ${i.applied
            ? '<span class="badge badge-green">✓ Applied</span>'
            : `<button class="btn btn-sm btn-primary" onclick="applyToInternship(${i.id})">Apply</button>`}
        </div>
      </div>
    </div>`;
  }).join("") + `</div>`;

  el.querySelectorAll(".save-btn").forEach((b) => {
    b.addEventListener("click", async () => {
      const saved = b.dataset.saved === "true";
      try {
        if (saved) { await API.del(`/api/internships/${b.dataset.id}/save`); b.dataset.saved = "false"; b.textContent = "🔖"; UI.toast("Removed from saved", "info"); }
        else { await API.post(`/api/internships/${b.dataset.id}/save`); b.dataset.saved = "true"; b.textContent = "🔖"; UI.toast("Saved 🔖", "success"); }
      } catch (e) { UI.toast(e.message, "error"); }
    });
  });
}

async function openInternshipDetail(id) {
  try {
    const i = await API.get(`/api/internships/${id}`);
    const comp = i.company || {};
    UI.openModal(`
      <div class="modal modal-lg">
        <div class="modal-head"><h3>${UI.esc(i.title)}</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
        <div class="modal-body">
          <div class="flex items-center gap-12 mb-16">
            <div class="avatar lg" style="background:${UI.avatarColor(comp.name)}">${UI.esc((comp.name || "?")[0])}</div>
            <div>
              <div class="bold" style="font-size:16px">${UI.esc(comp.name)} ${comp.verified ? UI.verifiedBadge() : ""}</div>
              <div class="muted small">${UI.esc(i.domain || "General")} · Posted ${UI.timeAgo(i.posted_at)}</div>
            </div>
            ${i.applied ? `<span class="badge badge-green" style="margin-left:auto">✓ Applied</span>` : ""}
          </div>
          <div class="intern-meta mb-16">
            <span class="meta-chip">${UI.icons.pin} ${UI.esc(i.location || "Remote")}</span>
            <span class="meta-chip">${UI.modeIcon(i.mode)}</span>
            <span class="meta-chip">${UI.icons.clock} ${i.duration_months} months</span>
            <span class="meta-chip">${UI.icons.rupee} ${UI.esc(i.stipend)}</span>
            ${i.deadline ? `<span class="meta-chip">⏰ ${UI.fmtDate(i.deadline)}</span>` : ""}
          </div>
          ${i.skills.length ? `<div class="skill-pills mb-16">${i.skills.map((s) => `<span class="skill-pill">${UI.esc(s)}</span>`).join("")}</div>` : ""}
          <div class="card-sub">About the role</div>
          <p class="small" style="color:var(--ink-2);white-space:pre-wrap">${UI.esc(i.description || "No description provided.")}</p>
          <div class="mt-16" style="display:flex;gap:10px;justify-content:flex-end">
            <button class="btn" onclick="UI.closeModal()">Close</button>
            ${i.applied ? "" : `<button class="btn btn-primary" onclick="UI.closeModal();applyToInternship(${i.id})">Apply now →</button>`}
          </div>
        </div>
      </div>`);
  } catch (e) { UI.toast(e.message, "error"); }
}

async function applyToInternship(id) {
  UI.openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Apply to internship</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
      <div class="modal-body">
        <form onsubmit="return submitApplication(event, ${id})">
          <div class="field"><label>Cover letter <span class="hint">(optional but recommended)</span></label>
            <textarea class="input" name="cover_letter" placeholder="Why are you a great fit for this role?"></textarea></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">Submit application</button>
        </form>
      </div>
    </div>`);
}

async function submitApplication(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Applying…';
  try {
    const fd = new FormData(e.target);
    await API.post(`/api/internships/${id}/apply`, { cover_letter: fd.get("cover_letter") || "" });
    UI.toast("🎉 Application submitted!", "success");
    UI.closeModal();
    if (App.pages.explorer) switchPage("explorer");
    switchPage("applications");
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
    btn.disabled = false; btn.textContent = "Submit application";
  }
}

/* ============================== APPLICATIONS ============================== */
App.pages.applications = async function (content) {
  const data = await API.get("/api/student/applications");
  if (!data.items.length) {
    content.innerHTML = `<div class="card">${UI.empty("No applications yet", "Explore internships and apply to get started.")}<div style="text-align:center"><button class="btn btn-primary" onclick="switchPage('explorer')">Explore internships →</button></div></div>`;
    return;
  }
  content.innerHTML = `
    <div class="grid grid-2 mb-16">
      ${stageStats(data.items)}
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Internship</th><th>Company</th><th>Location</th><th>Mode</th><th>Applied</th><th>Status</th><th>Progress</th><th></th></tr></thead>
        <tbody>
          ${data.items.map((a) => `
            <tr>
              <td><b>${UI.esc(a.internship.title)}</b><div class="muted">Deadline ${a.internship.deadline ? UI.fmtDate(a.internship.deadline) : "—"}</div></td>
              <td>${UI.esc(a.internship.company?.name || "—")}</td>
              <td>${UI.esc(a.internship.location || "—")}</td>
              <td>${UI.modeIcon(a.internship.mode)}</td>
              <td class="muted">${UI.fmtDate(a.applied_at)}</td>
              <td>${UI.statusBadge(a.status)}</td>
              <td>${UI.pipeline([], a.status)}</td>
              <td><button class="btn btn-sm btn-outline" onclick='openApplicationDetail(${JSON.stringify(a)})'>View</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
};

function stageStats(apps) {
  const count = (s) => apps.filter((a) => a.status === s).length;
  return `
    <div class="stat"><div class="stat-icon blue">${UI.icons.applications}</div><div><div class="stat-value">${apps.length}</div><div class="stat-label">Total applications</div></div></div>
    <div class="stat"><div class="stat-icon green">${count("selected") + count("joined") + count("completed")}</div><div><div class="stat-value">${count("selected") + count("joined") + count("completed")}</div><div class="stat-label">Selected / joined / completed</div></div></div>`;
}

function openApplicationDetail(a) {
  const hist = (() => { try { return JSON.parse(a.stage_history || "[]"); } catch (e) { return []; } })();
  UI.openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${UI.esc(a.internship.title)}</h3><button class="x-btn" onclick="UI.closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="mb-12">${UI.statusBadge(a.status)}</div>
        ${a.cover_letter ? `<div class="card-sub">Cover letter</div><div class="review-card rc-body" style="margin-bottom:16px">${UI.esc(a.cover_letter)}</div>` : ""}
        <div class="card-sub">Timeline</div>
        <div class="timeline">
          ${hist.map((h) => `<div class="tl-item"><div class="tl-date">${new Date(h.at).toLocaleString("en-IN")}</div><div class="tl-title">${UI.esc(h.stage.replace("_", " "))}</div></div>`).join("")}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn" onclick="UI.closeModal()">Close</button></div>
      </div>
    </div>`);
}

/* ============================== TRACKER ============================== */
App.pages.tracker = async function (content) {
  const dash = await API.get("/api/student/dashboard");
  const t = dash.tracker;
  if (!t) {
    content.innerHTML = `
      <div class="grid-side">
        <div class="card card-pad-lg">
          <div class="card-title">Activate your internship tracker</div>
          <div class="card-sub">Once you've been selected, activate the tracker to start logging daily reports and earning points.</div>
          <form onsubmit="return activateTracker(event)">
            <div class="field"><label>Internship type</label>
              <select class="input" name="type" required>
                <option value="on-campus">On-campus internship</option>
                <option value="off-campus">Off-campus internship</option>
                <option value="college-provided">College-provided internship</option>
                <option value="self-found">Self-found internship</option>
              </select></div>
            <div class="grid grid-2">
              <div class="field"><label>Company name</label><input class="input" name="company" required placeholder="TechFlow Systems" /></div>
              <div class="field"><label>Role</label><input class="input" name="role" required placeholder="Backend Intern" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Start date</label><input class="input" type="date" name="start_date" required /></div>
              <div class="field"><label>End date (optional)</label><input class="input" type="date" name="end_date" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Mentor name</label><input class="input" name="mentor_name" placeholder="Anita Krishnan" /></div>
              <div class="field"><label>Mentor email</label><input class="input" type="email" name="mentor_email" placeholder="mentor@company.com" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Mode</label><select class="input" name="mode"><option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="wfh">Work From Home</option></select></div>
              <div class="field"><label>Location</label><input class="input" name="location" placeholder="Bangalore" /></div>
            </div>
            <div class="field"><label>Offer letter <span class="hint">(PDF, optional)</span></label><input class="input" type="file" name="offer" accept=".pdf,.png,.jpg" /></div>
            <button class="btn btn-primary btn-lg btn-block" type="submit">Activate tracker 🚀</button>
          </form>
        </div>
        <div>
          <div class="card mb-16">
            <div class="card-title">Why activate?</div>
            <div class="card-sub">Your tracker is your internship's single source of truth</div>
            <ul class="check-list">
              <li><span style="color:#0d9488">${UI.icons.check}</span><span>Earn <b>+10 pts</b> per approved daily report</span></li>
              <li><span style="color:#0d9488">${UI.icons.check}</span><span><b>+50 pts</b> for weekly summaries</span></li>
              <li><span style="color:#0d9488">${UI.icons.check}</span><span>Faculty &amp; company can see your progress</span></li>
              <li><span style="color:#0d9488">${UI.icons.check}</span><span>Unlocks certificate verification (+100 pts)</span></li>
            </ul>
          </div>
          <div class="card">
            <div class="card-title">Demo tip</div>
            <div class="card-sub">Already have an active tracker? Complete it once your internship ends to earn 200 pts.</div>
          </div>
        </div>
      </div>`;
  } else {
    const dash2 = await API.get("/api/student/dashboard");
    content.innerHTML = `
      <div class="role-banner student mb-16">
        <div class="rb-icon">${UI.icons.tracker}</div>
        <div><h2>${UI.esc(t.company)} — ${UI.esc(t.role)}</h2><p>${t.type.replace("-", " ")} · Started ${t.start_date ? UI.fmtDate(t.start_date) : "—"} · ${UI.modeIcon(t.mode)}</p></div>
        <span class="badge" style="margin-left:auto;background:rgba(255,255,255,.18);color:#fff">● Active</span>
      </div>
      <div class="grid grid-3 mb-16">
        <div class="card"><div class="card-title">Streak</div><div class="stat-value mt-8" style="font-size:28px">🔥 ${dash2.streak} days</div></div>
        <div class="card"><div class="card-title">Points earned</div><div class="stat-value mt-8" style="font-size:28px">${dash2.points} pts</div></div>
        <div class="card"><div class="card-title">College rank</div><div class="stat-value mt-8" style="font-size:28px">#${dash2.rank}</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Internship details</div>
          <div class="mt-12 kv">
            <span class="k">Company</span><span>${UI.esc(t.company)}</span>
            <span class="k">Role</span><span>${UI.esc(t.role)}</span>
            <span class="k">Type</span><span>${UI.esc(t.type.replace("-", " "))}</span>
            <span class="k">Start</span><span>${UI.fmtDate(t.start_date)}</span>
            <span class="k">End</span><span>${t.end_date ? UI.fmtDate(t.end_date) : "Ongoing"}</span>
            <span class="k">Mentor</span><span>${UI.esc(t.mentor_name || "—")}</span>
            <span class="k">Mode</span><span>${UI.modeIcon(t.mode)}</span>
            <span class="k">Location</span><span>${UI.esc(t.location || "—")}</span>
            <span class="k">Offer letter</span><span>${t.offer_letter ? `<a href="${UI.esc(t.offer_letter)}" target="_blank">View document →</a>` : "—"}</span>
          </div>
          <div class="mt-24">
            <button class="btn btn-success" onclick="completeTracker()">✓ Mark as completed (+200 pts)</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Next steps</div>
          <div class="card-sub">Keep your streak alive</div>
          <div class="timeline mt-12">
            <div class="tl-item"><div class="tl-date">Daily</div><div class="tl-title">Submit today's daily report</div><div class="tl-body">Head to Reports to log what you did today (+10 pts).</div></div>
            <div class="tl-item amber"><div class="tl-date">Weekly</div><div class="tl-title">Submit weekly summary</div><div class="tl-body">+50 pts for each approved weekly summary.</div></div>
            <div class="tl-item amber"><div class="tl-date">Daily</div><div class="tl-title">Check in for attendance</div><div class="tl-body">Attendance % is visible to your company &amp; faculty.</div></div>
            <div class="tl-item amber"><div class="tl-date">On completion</div><div class="tl-title">Submit your certificate</div><div class="tl-body">Get it verified by the T&amp;P cell for +100 pts.</div></div>
          </div>
        </div>
      </div>`;
  }
};

async function activateTracker(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Activating…';
  try {
    const fd = new FormData(e.target);
    let offer = "";
    const file = fd.get("offer");
    if (file && file.size) offer = await API.upload(file);
    const payload = {
      type: fd.get("type"), company: fd.get("company"), role: fd.get("role"),
      start_date: fd.get("start_date"), end_date: fd.get("end_date") || null,
      mentor_name: fd.get("mentor_name") || "", mentor_email: fd.get("mentor_email") || "",
      mode: fd.get("mode"), location: fd.get("location") || "", offer_letter_path: offer,
    };
    await API.post("/api/student/tracker/activate", payload);
    UI.toast("🚀 Tracker activated! Start logging your daily reports.", "success");
    switchPage("tracker");
  } catch (err) {
    UI.toast("⚠️ " + err.message, "error");
    btn.disabled = false; btn.textContent = "Activate tracker 🚀";
  }
}

async function completeTracker() {
  if (!UI.promptDelete()) return;
  try {
    await API.post("/api/student/tracker/complete");
    UI.toast("🎉 Internship completed! +200 points.", "success");
    switchPage("tracker");
  } catch (e) { UI.toast(e.message, "error"); }
}

/* ============================== REPORTS ============================== */
App.pages.reports = async function (content) {
  const [daily, weekly, dash] = await Promise.all([
    API.get("/api/student/reports/daily"),
    API.get("/api/student/reports/weekly"),
    API.get("/api/student/dashboard"),
  ]);
  content.innerHTML = `
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Today's daily report</div>
        <div class="card-sub">+10 points when approved · keeps your streak alive</div>
        ${dash.daily_done
          ? `<div class="empty" style="padding:18px">✅ Daily report already submitted today. Come back tomorrow!</div>`
          : `<form onsubmit="return submitDailyReport(event)">
              <div class="field"><label>What did you work on today?</label><textarea class="input" name="content" required minlength="10" placeholder="Built the auth middleware, wrote tests…"></textarea></div>
              <div class="field"><label>Hours worked</label><input class="input" type="number" name="hours" step="0.5" min="0" max="24" value="7" /></div>
              <button class="btn btn-primary" type="submit">Submit daily report</button>
            </form>`}
      </div>
      <div class="card">
        <div class="card-title">Weekly summary</div>
        <div class="card-sub">+50 points when approved · due once a week</div>
        ${dash.weekly_done
          ? `<div class="empty" style="padding:18px">✅ Weekly summary already submitted for this week.</div>`
          : `<form onsubmit="return submitWeeklyReport(event)">
              <div class="field"><label>Weekly summary</label><textarea class="input" name="content" required minlength="10" placeholder="Summarise your week: what shipped, what you learned…"></textarea></div>
              <div class="field"><label>Highlights</label><input class="input" name="highlights" placeholder="e.g. 2 PRs merged, demo delivered" /></div>
              <button class="btn btn-primary" type="submit">Submit weekly summary</button>
            </form>`}
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Daily report history</div>
        ${daily.items.length ? daily.items.map((r) => `
          <div class="flex gap-12" style="padding:11px 0;border-bottom:1px dashed var(--line)">
            <div style="text-align:center;flex-shrink:0"><div class="bold">${new Date(r.report_date).getDate()}</div><div class="muted" style="font-size:10px">${new Date(r.report_date).toLocaleString("en", { month: "short" })}</div></div>
            <div style="min-width:0;flex:1"><div class="small">${UI.esc(r.content)}</div><div class="muted" style="font-size:11.5px">${r.hours} hrs · ${UI.statusBadge(r.status)}${r.points ? " · +" + r.points + " pts" : ""}${r.feedback ? ` · 💬 ${UI.esc(r.feedback)}` : ""}</div></div>
          </div>`).join("") : `<div class="empty" style="padding:16px">No daily reports yet</div>`}
      </div>
      <div class="card">
        <div class="card-title">Weekly history</div>
        ${weekly.items.length ? weekly.items.map((r) => `
          <div class="flex gap-12" style="padding:11px 0;border-bottom:1px dashed var(--line)">
            <span class="badge badge-blue" style="flex-shrink:0">${UI.esc(r.week_label)}</span>
            <div style="min-width:0;flex:1"><div class="small">${UI.esc(r.content)}</div><div class="muted" style="font-size:11.5px">${UI.statusBadge(r.status)}${r.points ? " · +" + r.points + " pts" : ""}${r.feedback ? ` · 💬 ${UI.esc(r.feedback)}` : ""}</div></div>
          </div>`).join("") : `<div class="empty" style="padding:16px">No weekly summaries yet</div>`}
      </div>
    </div>`;
};

async function submitDailyReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Submitting…';
  try {
    const fd = new FormData(e.target);
    await API.post("/api/student/reports/daily", { content: fd.get("content"), hours: Number(fd.get("hours")) || 0 });
    UI.toast("📝 Daily report submitted! +10 pts on approval.", "success");
    switchPage("reports");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = "Submit daily report"; }
}
async function submitWeeklyReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Submitting…';
  try {
    const fd = new FormData(e.target);
    await API.post("/api/student/reports/weekly", { content: fd.get("content"), highlights: fd.get("highlights") || "" });
    UI.toast("📊 Weekly summary submitted! +50 pts on approval.", "success");
    switchPage("reports");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = "Submit weekly summary"; }
}

/* ============================== ATTENDANCE ============================== */
App.pages.attendance = async function (content) {
  const data = await API.get("/api/student/attendance");
  const items = data.items;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const byDay = Object.fromEntries(items.map((i) => [i.day, i]));
  const present = items.filter((i) => i.status === "present").length;
  const pct = items.length ? Math.round((present / items.length) * 100) : 0;
  const hoursTotal = items.reduce((a, i) => a + (i.hours || 0), 0);
  const todayRec = byDay[today.toISOString().slice(0, 10)];

  let cells = "";
  for (let i = 0; i < firstDow; i++) cells += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = byDay[iso];
    const isToday = d === today.getDate();
    const isFuture = iso > today.toISOString().slice(0, 10);
    let cls = isFuture ? "cal-day future" : "cal-day";
    if (rec) cls += rec.status === "present" ? " present" : " absent";
    if (isToday) cls += " today";
    const hrs = rec && rec.hours ? `<span class="h">${rec.hours}h</span>` : "";
    cells += `<div class="${cls}">${d}${hrs}</div>`;
  }

  content.innerHTML = `
    <div class="grid grid-4 mb-16">
      <div class="stat"><div class="stat-icon green">✓</div><div><div class="stat-value">${present}</div><div class="stat-label">Days present</div></div></div>
      <div class="stat"><div class="stat-icon blue">%</div><div><div class="stat-value">${pct}%</div><div class="stat-label">Attendance rate</div></div></div>
      <div class="stat"><div class="stat-icon amber">⏱</div><div><div class="stat-value">${hoursTotal.toFixed(1)}h</div><div class="stat-label">Total hours</div></div></div>
      <div class="stat"><div class="stat-icon violet">+${5 * present}</div><div><div class="stat-value">${5 * present}</div><div class="stat-label">Points earned</div></div></div>
    </div>
    <div class="card mb-16">
      <div class="card-head">
        <div><div class="card-title">Check in / Check out</div><div class="card-sub">+5 points per check-in day</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success" id="checkInBtn" ${todayRec && todayRec.check_in ? "disabled" : ""}>↩ Check in</button>
          <button class="btn btn-danger" id="checkOutBtn" ${!todayRec || !todayRec.check_in || todayRec.check_out ? "disabled" : ""}>↪ Check out</button>
        </div>
      </div>
      ${todayRec ? `<div class="kv"><span class="k">Check-in</span><span>${todayRec.check_in ? new Date(todayRec.check_in).toLocaleTimeString("en-IN") : "—"}</span><span class="k">Check-out</span><span>${todayRec.check_out ? new Date(todayRec.check_out).toLocaleTimeString("en-IN") : "—"}</span><span class="k">Hours today</span><span>${todayRec.hours ? todayRec.hours + "h" : "—"}</span></div>` : `<div class="muted small">No check-in yet today.</div>`}
    </div>
    <div class="card">
      <div class="card-title">${month + 1 === 1 ? "January" : ["January","February","March","April","May","June","July","August","September","October","November","December"][month]} ${year}</div>
      <div class="cal-grid mt-16">
        ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => `<div class="cal-day dow" style="aspect-ratio:auto;border:none;background:none">${d}</div>`).join("")}
        ${cells}
      </div>
    </div>`;

  content.querySelector("#checkInBtn")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try { await API.post("/api/student/attendance/checkin"); UI.toast("✅ Checked in! +5 points.", "success"); switchPage("attendance"); }
    catch (err) { UI.toast(err.message, "error"); e.target.disabled = false; }
  });
  content.querySelector("#checkOutBtn")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try { const r = await API.post("/api/student/attendance/checkout"); UI.toast(`Checked out — ${r.hours}h today.`, "success"); switchPage("attendance"); }
    catch (err) { UI.toast(err.message, "error"); e.target.disabled = false; }
  });
};

/* ============================== DEADLINES ============================== */
App.pages.deadlines = async function (content) {
  const data = await API.get("/api/student/deadlines");
  const overdue = data.items.filter((i) => i.days_left < 0);
  const today = data.items.filter((i) => i.days_left === 0);
  const upcoming = data.items.filter((i) => i.days_left > 0);

  const row = (i) => `
    <div class="flex items-center gap-12" style="padding:13px 0;border-bottom:1px dashed var(--line)">
      <div class="avatar sm" style="background:${UI.avatarColor(i.company)}">${UI.esc(i.company[0])}</div>
      <div style="flex:1;min-width:0"><div class="bold small">${UI.esc(i.title)}</div><div class="muted" style="font-size:12px">${UI.esc(i.company)} · ${UI.fmtDate(i.deadline)}</div></div>
      <span class="badge ${i.kind === "applied" ? "badge-blue" : "badge-gray"}">${i.kind === "applied" ? "Applied" : "Saved"}</span>
      <span class="badge ${i.days_left < 0 ? "badge-red" : i.days_left === 0 ? "badge-amber" : "badge-green"}">${UI.daysLeft(i.deadline)}</span>
    </div>`;

  content.innerHTML = `
    <div class="grid grid-3 mb-16">
      <div class="stat"><div class="stat-icon rose">⏰</div><div><div class="stat-value">${overdue.length}</div><div class="stat-label">Overdue</div></div></div>
      <div class="stat"><div class="stat-icon amber">🔥</div><div><div class="stat-value">${today.length}</div><div class="stat-label">Due today</div></div></div>
      <div class="stat"><div class="stat-icon green">🗓</div><div><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming</div></div></div>
    </div>
    <div class="card">
      <div class="card-title">Overdue</div>
      ${overdue.length ? overdue.map(row).join("") : '<div class="muted small" style="padding:12px 0">Nothing overdue 🎉</div>'}
      <div class="card-title mt-24">Due today</div>
      ${today.length ? today.map(row).join("") : '<div class="muted small" style="padding:12px 0">Nothing due today</div>'}
      <div class="card-title mt-24">Upcoming</div>
      ${upcoming.length ? upcoming.map(row).join("") : '<div class="muted small" style="padding:12px 0">No upcoming deadlines</div>'}
    </div>`;
};

/* ============================== LEADERBOARD ============================== */
App.pages.leaderboard = async function (content) {
  const data = await API.get("/api/leaderboard");
  const rows = data.rows;
  const rankCls = (r) => (r === 1 ? "top" : r === 2 ? "top2" : r === 3 ? "top3" : "");
  content.innerHTML = `
    <div class="grid-side">
      <div class="card">
        <div class="card-head"><div><div class="card-title">College leaderboard</div><div class="card-sub">Live rankings by reward points</div></div></div>
        ${rows.map((r) => `
          <div class="lb-row ${r.is_me ? "me" : ""}">
            <div class="lb-rank ${rankCls(r.rank)}">${r.rank}</div>
            ${UI.avatar(r.name)}
            <div style="flex:1;min-width:0"><div class="bold small">${UI.esc(r.name)} ${r.is_me ? '<span class="badge badge-teal">You</span>' : ""}</div><div class="muted" style="font-size:12px">${UI.esc(r.department || "—")}</div></div>
            <div style="text-align:right"><div class="bold" style="color:var(--brand)">${r.points} pts</div><div class="muted" style="font-size:11.5px">🔥 ${r.streak} streak</div></div>
          </div>`).join("")}
      </div>
      <div>
        <div class="card mb-16">
          <div class="card-title">Your rank</div>
          <div class="text-center mt-12"><span style="font-family:var(--display);font-size:52px;font-weight:800;color:var(--brand)">#${rows.find((r) => r.is_me)?.rank || "—"}</span><div class="muted">Keep submitting reports to climb!</div></div>
        </div>
        <div class="card">
          <div class="card-title">How points work</div>
          <div class="mt-12 kv">
            <span class="k">Daily report</span><span>+10 pts</span>
            <span class="k">Weekly summary</span><span>+50 pts</span>
            <span class="k">Check-in</span><span>+5 pts</span>
            <span class="k">Certificate</span><span>+100 pts</span>
            <span class="k">Internship done</span><span>+200 pts</span>
          </div>
        </div>
      </div>
    </div>`;
};

/* ============================== REWARDS ============================== */
App.pages.rewards = async function (content) {
  const data = await API.get("/api/student/rewards");
  const badges = data.items.filter((i) => i.badge).reduce((acc, i) => {
    acc[i.badge] = (acc[i.badge] || 0) + 1;
    return acc;
  }, {});
  const badgeMeta = {
    report: { label: "Consistent Reporter", icon: "📝" },
    attendance: { label: "Attendance Streak", icon: "📅" },
    tracker: { label: "Tracker Activated", icon: "🚀" },
    certificate: { label: "Verified Credentials", icon: "🛡️" },
    "internship-completed": { label: "Internship Complete", icon: "🎓" },
  };
  content.innerHTML = `
    <div class="grid grid-3 mb-16">
      <div class="stat"><div class="stat-icon amber">★</div><div><div class="stat-value">${data.points}</div><div class="stat-label">Total points</div></div></div>
      <div class="stat"><div class="stat-icon teal">${UI.icons.flame}</div><div><div class="stat-value">${data.streak}</div><div class="stat-label">Day streak</div></div></div>
      <div class="stat"><div class="stat-icon violet">🏅</div><div><div class="stat-value">${Object.keys(badges).length}</div><div class="stat-label">Badges earned</div></div></div>
    </div>
    <div class="grid grid-2 mb-16">
      <div class="card">
        <div class="card-title">Badges</div>
        <div class="card-sub">Earned through consistency</div>
        <div class="grid grid-2 mt-12">
          ${Object.entries(badgeMeta).map(([key, m]) => `
            <div class="card" style="text-align:center;padding:18px 12px;${badges[key] ? "border-color:rgba(245,158,11,.5)" : "opacity:.45"}">
              <div style="font-size:30px">${m.icon}</div>
              <div class="bold small mt-8">${m.label}</div>
              <div class="muted" style="font-size:11.5px">${badges[key] ? "Earned ×" + badges[key] : "Not earned yet"}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Recent activity</div>
        <div class="card-sub">Every point, logged</div>
        ${data.items.length ? data.items.map((r) => `
          <div class="flex items-center justify-between gap-8" style="padding:10px 0;border-bottom:1px dashed var(--line)">
            <div><div class="small bold">${UI.esc(r.reason)}</div><div class="muted" style="font-size:11.5px">${UI.timeAgo(r.created_at)}</div></div>
            <span class="badge badge-green">+${r.points} pts</span>
          </div>`).join("") : '<div class="empty" style="padding:16px">No activity yet — submit a report to start earning!</div>'}
      </div>
    </div>`;
};

/* ============================== CERTIFICATES ============================== */
App.pages.certificates = async function (content) {
  const data = await API.get("/api/student/certificates");
  content.innerHTML = `
    <div class="grid-side">
      <div>
        <div class="card mb-16">
          <div class="card-title">Submit certificate for verification</div>
          <div class="card-sub">T&amp;P cell reviews it and awards +100 pts on approval</div>
          <form onsubmit="return submitCertificate(event)">
            <div class="grid grid-2">
              <div class="field"><label>Certificate title</label><input class="input" name="title" required placeholder="Summer Internship Certificate" /></div>
              <div class="field"><label>Issuing company</label><input class="input" name="company" placeholder="TechFlow Systems" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Issued by</label><input class="input" name="issued_by" placeholder="TechFlow Systems HR" /></div>
              <div class="field"><label>Certificate document</label><input class="input" type="file" name="doc" accept=".pdf,.png,.jpg" /></div>
            </div>
            <button class="btn btn-primary" type="submit">Submit for verification</button>
          </form>
        </div>
        <div class="card">
          <div class="card-title">My certificates</div>
          ${data.items.length ? `<div class="table-wrap" style="border:none">
            <table class="tbl">
              <thead><tr><th>Title</th><th>Company</th><th>Status</th><th>Score</th><th>Code</th></tr></thead>
              <tbody>${data.items.map((c) => `
                <tr>
                  <td><b>${UI.esc(c.title)}</b></td>
                  <td>${UI.esc(c.company || "—")}</td>
                  <td>${UI.statusBadge(c.status)}</td>
                  <td>${c.authenticity_score ? c.authenticity_score + "%" : "—"}</td>
                  <td class="muted" style="font-family:monospace">${UI.esc(c.code)}</td>
                </tr>`).join("")}</tbody>
            </table></div>` : '<div class="empty" style="padding:20px">No certificates yet</div>'}
        </div>
      </div>
      <div class="card" style="height:fit-content">
        <div class="card-title">Verify a certificate</div>
        <div class="card-sub">Anyone can check a certificate code</div>
        <form onsubmit="return verifyCertCode(event)" style="display:flex;gap:8px">
          <input class="input" name="code" placeholder="INT-3-PENDING1" style="flex:1" required />
          <button class="btn btn-primary" type="submit">Verify</button>
        </form>
        <div id="verifyResult" class="mt-12"></div>
      </div>
    </div>`;
};

async function submitCertificate(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Submitting…';
  try {
    const fd = new FormData(e.target);
    let doc = "";
    const file = fd.get("doc");
    if (file && file.size) doc = await API.upload(file);
    await API.post("/api/student/certificates", {
      title: fd.get("title"), company: fd.get("company") || "", issued_by: fd.get("issued_by") || "", doc_path: doc,
    });
    UI.toast("🛡️ Certificate submitted for verification!", "success");
    switchPage("certificates");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = "Submit for verification"; }
}

async function verifyCertCode(e) {
  e.preventDefault();
  const box = document.getElementById("verifyResult");
  try {
    const code = e.target.code.value.trim();
    const r = await API.get("/api/certificates/verify?code=" + encodeURIComponent(code));
    if (!r.found) { box.innerHTML = `<div class="badge badge-red">✗ Not found — this code is invalid</div>`; return; }
    box.innerHTML = `
      <div class="card" style="padding:14px">
        <div class="flex items-center gap-8 mb-8"><span class="badge ${r.status === "approved" ? "badge-green" : "badge-amber"}">${r.status === "approved" ? "✓ Verified" : "Pending review"}</span><span class="muted small">${r.authenticity_score}% authentic</span></div>
        <div class="kv"><span class="k">Holder</span><span>${UI.esc(r.student || "—")}</span><span class="k">Title</span><span>${UI.esc(r.title)}</span><span class="k">Company</span><span>${UI.esc(r.company || "—")}</span><span class="k">Issued by</span><span>${UI.esc(r.issued_by || "—")}</span></div>
      </div>`;
  } catch (err) { box.innerHTML = `<span class="badge badge-red">✗ ${UI.esc(err.message)}</span>`; }
}

/* ============================== PROFILE ============================== */
App.pages.profile = async function (content) {
  const data = await API.get("/api/student/profile");
  const p = data.profile;
  content.innerHTML = `
    <div class="grid-side">
      <div class="card card-pad-lg">
        <div class="flex items-center gap-16 mb-16">
          ${UI.avatar(data.user.name, "lg")}
          <div><div class="bold" style="font-size:18px">${UI.esc(data.user.name)}</div><div class="muted">${UI.esc(data.user.email)}</div></div>
        </div>
        <div class="mb-16">
          <div class="flex justify-between mb-8"><span class="muted small">Profile completion</span><b class="small">${p.completion}%</b></div>
          ${UI.progress(p.completion)}
        </div>
        <form onsubmit="return saveProfile(event)">
          <div class="grid grid-2">
            <div class="field"><label>Department</label><input class="input" name="department" value="${UI.esc(p.department || "")}" placeholder="Computer Science" /></div>
            <div class="field"><label>Branch</label><input class="input" name="branch" value="${UI.esc(p.branch || "")}" placeholder="CSE" /></div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Year</label><select class="input" name="year"><option value="">Select</option>${["1st Year","2nd Year","3rd Year","4th Year"].map((y) => `<option ${p.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></div>
            <div class="field"><label>CGPA</label><input class="input" name="cgpa" type="number" step="0.01" min="0" max="10" value="${p.cgpa ?? ""}" placeholder="8.5" /></div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Phone</label><input class="input" name="phone" value="${UI.esc(p.phone || "")}" placeholder="+91 …" /></div>
            <div class="field"><label>City</label><input class="input" name="location" value="${UI.esc(p.location || "")}" placeholder="Bangalore" /></div>
          </div>
          <div class="field"><label>Skills <span class="hint">(comma separated)</span></label><input class="input" name="skills" value="${UI.esc((p.skills || []).join(", "))}" placeholder="Python, React, SQL" /></div>
          <div class="field"><label>Bio</label><textarea class="input" name="bio" placeholder="A short intro about yourself">${UI.esc(p.bio || "")}</textarea></div>
          <div class="grid grid-2">
            <div class="field"><label>LinkedIn</label><input class="input" name="linkedin" value="${UI.esc(p.linkedin || "")}" placeholder="https://linkedin.com/in/…" /></div>
            <div class="field"><label>GitHub</label><input class="input" name="github" value="${UI.esc(p.github || "")}" placeholder="https://github.com/…" /></div>
          </div>
          <div class="field"><label>Resume <span class="hint">(PDF)</span></label>
            <input class="input" type="file" name="resume" accept=".pdf" />
            ${p.resume_path ? `<span class="hint"><a href="${UI.esc(p.resume_path)}" target="_blank">Current resume →</a></span>` : ""}
          </div>
          <button class="btn btn-primary btn-lg" type="submit">Save profile</button>
        </form>
      </div>
      <div>
        <div class="card mb-16">
          <div class="card-title">Profile tips</div>
          <ul class="check-list mt-12">
            <li><span style="color:#0d9488">${UI.icons.check}</span><span>Companies see your <b>CGPA, skills and city</b> when reviewing applications.</span></li>
            <li><span style="color:#0d9488">${UI.icons.check}</span><span>A complete profile gets <b>3× more shortlists</b>.</span></li>
            <li><span style="color:#0d9488">${UI.icons.check}</span><span>Keep skills in sync with what you learn during your internship.</span></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Account</div>
          <div class="kv mt-12">
            <span class="k">Role</span><span>Student</span>
            <span class="k">Member since</span><span>${UI.fmtDate(data.user.created_at)}</span>
          </div>
        </div>
      </div>
    </div>`;
};

async function saveProfile(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner-sm"></span> Saving…';
  try {
    const fd = new FormData(e.target);
    let resume = "";
    const file = fd.get("resume");
    if (file && file.size) resume = await API.upload(file);
    const existing = await API.get("/api/student/profile");
    await API.put("/api/student/profile", {
      department: fd.get("department") || "", branch: fd.get("branch") || "", year: fd.get("year") || "",
      cgpa: fd.get("cgpa") ? parseFloat(fd.get("cgpa")) : null, phone: fd.get("phone") || "",
      location: fd.get("location") || "",
      skills: (fd.get("skills") || "").split(",").map((s) => s.trim()).filter(Boolean),
      bio: fd.get("bio") || "", linkedin: fd.get("linkedin") || "", github: fd.get("github") || "",
      resume_path: resume || existing.profile.resume_path || "",
    });
    UI.toast("✅ Profile saved!", "success");
    switchPage("profile");
  } catch (err) { UI.toast("⚠️ " + err.message, "error"); btn.disabled = false; btn.textContent = "Save profile"; }
}

/* ============================== helpers ============================== */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
