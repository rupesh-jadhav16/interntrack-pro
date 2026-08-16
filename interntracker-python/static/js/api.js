/* API client with JWT auth */
const API = (() => {
  const TOKEN_KEY = "it_token";
  let token = localStorage.getItem(TOKEN_KEY) || "";

  async function req(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    let res;
    try {
      res = await fetch("/api" + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw { status: 0, message: "Cannot reach server. Is uvicorn running?" };
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      token = "";
      if (!location.pathname.includes("index")) location.href = "/";
      throw { status: 401, message: "Session expired. Please sign in again." };
    }
    if (!res.ok) {
      throw { status: res.status, message: (data && data.detail) || "Request failed (" + res.status + ")" };
    }
    return data;
  }

  async function upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch("/api/upload", { method: "POST", headers, body: fd });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.detail || "Upload failed" };
    return data.url;
  }

  return {
    get: (p) => req("GET", p),
    post: (p, b) => req("POST", p, b),
    patch: (p, b) => req("PATCH", p, b),
    del: (p) => req("DELETE", p),
    upload,
    setToken: (t) => { token = t; localStorage.setItem(TOKEN_KEY, t); },
    getToken: () => token,
    clear: () => { token = ""; localStorage.removeItem(TOKEN_KEY); },
    isAuthed: () => !!token,
  };
})();
