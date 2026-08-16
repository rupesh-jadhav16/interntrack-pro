/* UI helpers + small components */
const ICONS = {
  dashboard: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3.6-2.4-6.4-4.3-8.4C13 5 12 3.5 12 2c-1.8 2.6-3 5.4-3 8a7 7 0 0 0 .7 3.1A3.8 3.8 0 0 1 8 11c0-.8.2-1.5.4-2.1A8.2 8.2 0 0 0 5 15c0 4.3 3 7 7 7z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5 6.5-5s6.5 1.5 6.5 5M16 5a3.5 3.5 0 0 1 0 6.8M17.5 15.2c2.3.6 4 1.9 4 4.8"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M9 21v-4h6v4"/>',
  shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v-4M12 15V7M17 15v-6"/>',
  megaphone: '<path d="M3 11v2h2l4 4V7l-4 4H3zM9 17a3 3 0 0 0 5 2M16 12a4 4 0 0 0-1-2.7M18.5 9.5a7 7 0 0 1 0 5"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  location: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
  sparkle: '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  verified: '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m8.5 12 2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v.01M21 21h-7v-4"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 9.5V21h14V9.5"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
};

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function icon(name, size) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (size) { svg.setAttribute("width", size); svg.setAttribute("height", size); }
  svg.innerHTML = ICONS[name] || ICONS.star;
  return svg;
}

function initials(name) {
  return (name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function daysLeft(iso) {
  if (!iso) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return "Ended";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Ends tomorrow";
  if (diff < 14) return "Ends in " + diff + " days";
  const weeks = Math.floor(diff / 7);
  return "Ends in " + weeks + (weeks === 1 ? " week" : " weeks");
}

function toast(msg, type = "info") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) { wrap = h("div", { class: "toast-wrap" }); document.body.append(wrap); }
  const t = h("div", { class: "toast " + type }, icon(type === "success" ? "check" : type === "error" ? "x" : "bell"), msg);
  wrap.append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 3200);
}

function modal(title, bodyEl, { wide = false, onClose } = {}) {
  const backdrop = h("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) close(); } });
  const box = h("div", { class: "modal" + (wide ? " wide" : "") },
    h("button", { class: "close", onclick: close, html: "&times;" }),
    h("h2", title),
    bodyEl,
  );
  function close() { backdrop.remove(); if (onClose) onClose(); }
  backdrop.append(box);
  document.body.append(backdrop);
  return { close, box };
}

function confirmModal(title, body, onYes, yesLabel = "Confirm", danger = false) {
  const { close, box } = modal(title, h("div", {},
    h("p", { style: "color:var(--ink-2);margin-top:6px" }, body),
    h("div", { class: "actions" },
      h("button", { class: "btn btn-ghost", onclick: close }, "Cancel"),
      h("button", { class: "btn " + (danger ? "btn-danger" : "btn-primary"), onclick: () => { close(); onYes(); } }, yesLabel),
    ),
  ));
  return box;
}

function statusBadge(status, label) {
  const map = {
    verified: "b-verified", pending: "b-pending", review: "b-review", rejected: "b-rejected",
    suspicious: "b-suspicious", suspended: "b-suspended", open: "b-open", closed: "b-closed",
    applied: "b-applied", under_review: "b-under_review", shortlisted: "b-shortlisted",
    interview: "b-interview", selected: "b-selected", joined: "b-joined", completed: "b-completed",
    active: "b-active", approved: "b-approved", present: "b-present", absent: "b-absent",
    leave: "b-leave", holiday: "b-holiday", overdue: "b-overdue", due_today: "b-due_today",
    upcoming: "b-upcoming", success: "b-success",
  };
  const cls = map[status] || "b-open";
  const lab = label || status.replace(/_/g, " ");
  const extra = status === "verified" ? icon("verified", 12) : (status === "present" ? icon("check", 11) : "");
  return h("span", { class: "badge " + cls }, extra, lab.charAt(0).toUpperCase() + lab.slice(1));
}

function progressBar(pct, tone = "") {
  return h("div", { class: "progress " + tone },
    h("i", { style: "width:" + Math.max(0, Math.min(100, pct)) + "%" }));
}

function stat(label, value, sub, tone, icoName) {
  return h("div", { class: "stat" },
    h("div", { class: "ico tone-" + tone }, icon(icoName || "chart")),
    h("div", {},
      h("div", { class: "val" }, value),
      h("div", { class: "lbl" }, label),
      sub ? h("div", { class: "sub" }, sub) : null,
    ));
}

function emptyState(msg, big = "🗂️") {
  return h("div", { class: "empty" }, h("div", { class: "big" }, big), msg);
}

function spinner() { return h("div", { class: "spinner" }); }

function heatmap(data, { days = 84 } = {}) {
  const wrap = h("div", {},
    h("div", { class: "heatmap", style: "grid-template-columns:repeat(" + Math.ceil(days / 7) + ", auto)" },
      data.map(c => h("div", { class: "cell " + c.color, title: c.date })),
    ),
    h("div", { class: "legend" },
      "Less", h("span", { class: "cell" }), h("span", { class: "cell", style: "background:var(--accent-soft)" }),
      h("span", { class: "cell", style: "background:#fcd34d" }), h("span", { class: "cell", style: "background:#fda4af" }),
      "More", h("span", { style: "margin-left:auto" }, "Last " + days + " days"),
    ),
  );
  return wrap;
}

const STEP_LABELS = ["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Joined", "Completed"];

function stepper(currentStatus) {
  const order = ["applied", "under_review", "shortlisted", "interview", "selected", "joined", "completed"];
  const idx = order.indexOf(currentStatus);
  if (idx < 0) return null;
  const steps = STEP_LABELS.map((label, i) => {
    const cls = i < idx ? "done" : i === idx ? "current" : "";
    const node = h("div", { class: "node " + cls }, i < idx ? icon("check", 13) : String(i + 1));
    return h("div", { class: "step" }, node, h("span", label));
  });
  const row = h("div", { class: "stepper" });
  steps.forEach((s, i) => {
    if (i > 0) row.append(h("div", { class: "bar " + (i <= idx ? "done" : "") }));
    row.append(s);
  });
  return row;
}

function barsChart(labels, values, { color = "var(--accent)", suffix = "" } = {}) {
  const max = Math.max(...values, 1);
  return h("div", { class: "bars" },
    labels.map((l, i) =>
      h("div", { class: "bar-col" },
        h("div", { class: "bar", style: "height:" + Math.round((values[i] / max) * 100) + "%;background:" + color },
          h("span", values[i] + suffix)),
        h("small", l),
      )));
}

function donut(pct, label, sub) {
  return h("div", { class: "donut", style: "--pct:" + Math.round(pct) },
    h("div", { class: "mid" }, h("b", label), h("small", sub || "")));
}

function money(stipend) { return stipend || "Unpaid"; }

/* ---------- page helpers ---------- */
async function loadMe() {
  return await API.get("/auth/me");
}

function roleHome(role) {
  return { student: "/student", faculty: "/faculty", admin: "/admin", company: "/company" }[role] || "/";
}
