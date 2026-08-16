/* InternTracker UI helpers */
const UI = {
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  },

  icons: {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    explorer: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    applications: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>',
    tracker: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    report: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1"/><path d="M8 9h8M8 13h5"/></svg>',
    attendance: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
    deadlines: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    leaderboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21h12M8 21V10l4-3 4 3v11"/><path d="M8 10H4l2-4 4 4M16 10h4l-2-4-4 4"/></svg>',
    rewards: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>',
    certificates: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M9 13.5 7 22l5-3 5 3-2-8.5"/></svg>',
    profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    students: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    review: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    performance: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-6"/></svg>',
    companies: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    analytics: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="12" y="6" width="3" height="12" rx="1"/><rect x="17" y="13" width="3" height="5" rx="1"/></svg>',
    megaphone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-6v12L3 11z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    log: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    rupee: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a6 6 0 0 0 6-6"/></svg>',
    clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    save: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    bookmark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    flame: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.97 0-8-3.1-8-7.3 0-3.5 2.4-6 4.4-7.9.5-.47 1.3-.1 1.3.57 0 1 .2 1.9 1.2 1.9.55 0 .8-.5.9-1.4.07-.62.4-1.2.8-1.6.6-.63 1.4-1 2.2-1.1.9-.1 1.7.2 2.3.9 1.6 1.9 2.9 4.2 2.9 6.7 0 4.2-3 7.3-8 7.3Zm-3-2.5c.5 1.4 3.1 1.6 4.2.4.7-.8.9-2 .5-2.9-.5-1.1-1.4-1.6-1.9-2.5-.3-.6-.5-1.3-.4-2 .3 1 1.1 1.9 2 2.3.5-1.6-.2-3-1.4-3.7.1 2.7-2.3 4.3-3 5.5-.4.8-.4 2.1 0 2.9Z"/></svg>',
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
    mail: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    phone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  },

  toast(msg, type = "info", ms = 3200) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.innerHTML = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, ms);
  },

  openModal(html) {
    const b = document.createElement("div");
    b.className = "modal-backdrop";
    b.innerHTML = html;
    b.addEventListener("click", (e) => { if (e.target === b) UI.closeModal(); });
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add("open"));
    return b;
  },
  closeModal() {
    const b = document.querySelector(".modal-backdrop.open");
    if (b) { b.classList.remove("open"); setTimeout(() => b.remove(), 200); }
  },

  /* ---------- status → badge ---------- */
  statusBadge(status) {
    const map = {
      applied: ["badge-blue", "Applied"], under_review: ["badge-amber", "Under Review"],
      shortlisted: ["badge-violet", "Shortlisted"], interview: ["badge-teal", "Interview"],
      selected: ["badge-green", "Selected"], joined: ["badge-teal", "Joined"],
      completed: ["badge-green", "Completed"], rejected: ["badge-red", "Rejected"],
      pending: ["badge-amber", "Pending"], approved: ["badge-green", "Approved"],
      open: ["badge-green", "Open"], closed: ["badge-gray", "Closed"],
      verified: ["badge-green", "Verified"], active: ["badge-teal", "Active"],
    };
    const [cls, label] = map[status] || ["badge-gray", status];
    return `<span class="badge ${cls} badge-dot">${label}</span>`;
  },

  verifiedBadge() {
    return `<span class="verified-badge">${UI.icons.check} Verified company</span>`;
  },

  modeIcon(mode) {
    const map = { remote: "🌐 Remote", onsite: "🏢 On-site", hybrid: "🔀 Hybrid", wfh: "🏠 Work From Home" };
    return map[mode] || mode;
  },

  fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  },
  timeAgo(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
    return UI.fmtDate(iso);
  },
  daysLeft(iso) {
    const diff = Math.ceil((new Date(iso) - new Date()) / 86400000);
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
    return diff + "d left";
  },

  avatarColor(name) {
    const colors = ["#0d9488", "#2563eb", "#7c3aed", "#b45309", "#db2777", "#059669", "#4f46e5", "#c2410c"];
    let h = 0;
    for (const c of String(name || "U")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  },

  avatar(name, size = "") {
    const letter = (name || "?").trim()[0].toUpperCase();
    return `<div class="avatar ${size}" style="background:${UI.avatarColor(name)}">${UI.esc(letter)}</div>`;
  },

  progress(pct, cls = "") {
    return `<div class="progress ${cls}"><div style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>`;
  },

  pipeline(stages, current) {
    const order = ["applied", "under_review", "shortlisted", "interview", "selected", "joined", "completed"];
    if (current === "rejected") {
      return `<div class="pipeline"><span class="pipe-step rejected">${UI.icons.x} Rejected</span></div>`;
    }
    const idx = order.indexOf(current);
    return `<div class="pipeline">` + order.map((s, i) => {
      const state = i < idx ? "done" : (i === idx ? "current" : "");
      const label = s.replace("_", " ");
      return `<span class="pipe-step ${state}"><span class="n">${i < idx ? "✓" : i + 1}</span>${label}</span>`;
    }).join("") + `</div>`;
  },

  barChart(rows, opts = {}) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    return `<div class="bar-chart">` + rows.map((r) => `
      <div class="bar-col ${opts.accent ? "amber" : ""}" title="${UI.esc(r.label)}: ${r.value}">
        <div class="bar" data-v="${r.value}" style="height:${Math.max(4, (r.value / max) * 100)}%"></div>
        <div class="bl">${UI.esc(r.label)}</div>
      </div>`).join("") + `</div>`;
  },

  lineChart(points, w = 340, h = 130) {
    const max = Math.max(...points.map((p) => p.value), 1);
    const min = Math.min(...points.map((p) => p.value), 0);
    const range = max - min || 1;
    const stepX = w / Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => [4 + i * stepX, h - 14 - ((p.value - min) / range) * (h - 30)]);
    const path = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
    const area = path + ` L${coords[coords.length - 1][0].toFixed(1)},${h - 6} L4,${h - 6} Z`;
    const dots = coords.map((c, i) => `<circle cx="${c[0]}" cy="${c[1]}" r="3" fill="#0d9488" stroke="#fff" stroke-width="1.5"><title>${UI.esc(points[i].label)}: ${points[i].value}</title></circle>`).join("");
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%">
      <defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#14b8a6" stop-opacity=".3"/><stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#lg1)"/>
      <path d="${path}" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round"/>
      ${dots}</svg>`;
  },

  donut(data) {
    const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
    const colors = { applied: "#2563eb", under_review: "#f59e0b", shortlisted: "#7c3aed", interview: "#0d9488", selected: "#16a34a", joined: "#0e7490", completed: "#16a34a", rejected: "#e11d48" };
    let acc = 0;
    const segs = Object.entries(data).map(([k, v]) => {
      const frac = v / total;
      const dash = `${frac * 100} ${100 - frac * 100}`;
      const off = -acc * 3.6;
      acc += frac * 100;
      return `<circle r="15.9" cx="20" cy="20" fill="none" stroke="${colors[k] || "#94a3b8"}" stroke-width="5" stroke-dasharray="${dash}" stroke-dashoffset="${off}"/>`;
    }).join("");
    const legend = Object.entries(data).map(([k, v]) => `
      <div class="flex items-center gap-8" style="font-size:12.5px"><span style="width:9px;height:9px;border-radius:3px;background:${colors[k] || "#94a3b8"}"></span>${k.replace("_", " ")} <b style="margin-left:auto">${v}</b></div>`).join("");
    return `<div class="flex items-center gap-16 wrap">
      <svg viewBox="0 0 40 40" style="width:120px;height:120px;transform:rotate(-90deg)">${segs}<text x="20" y="21" text-anchor="middle" transform="rotate(90 20 20)" style="font-size:11px;font-weight:800;fill:#0f1b2d">${total}</text></svg>
      <div style="flex:1;min-width:150px;display:grid;gap:6px">${legend}</div></div>`;
  },

  skeleton(n = 3) {
    return Array.from({ length: n }, () => `<div class="skeleton" style="height:86px;margin-bottom:12px"></div>`).join("");
  },

  loader() {
    return `<div class="loading-page"><div class="spinner"></div></div>`;
  },

  empty(title, sub = "") {
    return `<div class="empty">${UI.icons.explorer}<h4>${UI.esc(title)}</h4>${sub ? `<p class="muted">${UI.esc(sub)}</p>` : ""}</div>`;
  },

  promptDelete() {
    return window.confirm("Are you sure? This action cannot be undone.");
  },
};

/* small element builder */
function h(tag, attrs = {}, children = "") {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  if (typeof children === "string") el.innerHTML = children;
  else if (children) el.append(children);
  return el;
}
