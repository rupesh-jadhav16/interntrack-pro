/* InternTracker API client — JWT stored in localStorage */
const API = {
  token: () => localStorage.getItem("it_token"),
  setToken: (t) => localStorage.setItem("it_token", t),
  clear: () => localStorage.removeItem("it_token"),

  async req(method, path, body) {
    const headers = {};
    const t = this.token();
    if (t) headers["Authorization"] = "Bearer " + t;
    let payload;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, { method, headers, body: payload });
    } catch (e) {
      throw new Error("Cannot reach the server. Is uvicorn running?");
    }
    if (res.status === 401 && !path.startsWith("/api/auth/login")) {
      API.clear();
      location.href = "/";
      throw new Error("Session expired — please sign in again");
    }
    let data = {};
    try {
      data = await res.json();
    } catch (e) { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.detail || data.message || "Request failed (" + res.status + ")");
    return data;
  },

  get: (p) => API.req("GET", p),
  post: (p, b) => API.req("POST", p, b),
  put: (p, b) => API.req("PUT", p, b),
  del: (p) => API.req("DELETE", p),

  async upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await this.req("POST", "/api/upload", fd);
    return res.path;
  },
};
