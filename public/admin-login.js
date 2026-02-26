const $ = (s) => document.querySelector(s);

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const hasBody = opts.body !== undefined && opts.body !== null;
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const r = await fetch(url, { credentials: "include", ...opts, headers });
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await r.json() : await r.text();

  if (!r.ok) {
    const msg = (typeof body === "object" && body && (body.error || body.message))
      ? (body.error || body.message)
      : (typeof body === "string" && body.trim() ? body.trim() : `HTTP ${r.status}`);
    throw { status: r.status, error: msg, raw: body };
  }
  return body;
}

async function hydrateLogo() {
  try {
    const s = await api("/api/site");
    if (s.site_logo_url && $("#adminLogo")) $("#adminLogo").src = s.site_logo_url;
    if (s.site_title) document.title = `${s.site_title} • Admin Login`;
  } catch {}
}

async function checkLogin() {
  try { await api("/api/admin/me"); return true; } catch { return false; }
}

document.addEventListener("DOMContentLoaded", async () => {
  await hydrateLogo();

  // kalau sudah login, langsung ke panel
  if (await checkLogin()) location.href = "/admin-panel";

  $("#btnLogin")?.addEventListener("click", async () => {
    $("#loginMsg").textContent = "";
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          id: ($("#aid")?.value || "").trim(),
          password: ($("#apw")?.value || "")
        })
      });
      $("#loginMsg").textContent = "Login sukses ✅";
      location.href = "/admin-panel";
    } catch (e) {
      $("#loginMsg").textContent = `Login gagal: ${e?.error || e}`;
    }
  });
});
