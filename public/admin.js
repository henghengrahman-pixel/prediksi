// public/admin.js (panel only)
// - kalau belum login -> redirect ke /admin-login
// - load site + markets
// - save site includes marquee_text & bg_right_url reset

const $ = (s) => document.querySelector(s);

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const hasBody = opts.body !== undefined && opts.body !== null;
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const r = await fetch(url, { credentials: "include", ...opts, headers });
  const ct = r.headers.get("content-type") || "";

  let body;
  try { body = ct.includes("application/json") ? await r.json() : await r.text(); }
  catch { body = await r.text().catch(() => ""); }

  if (!r.ok) {
    const msg =
      (typeof body === "object" && body && (body.error || body.message)) ? (body.error || body.message)
      : (typeof body === "string" && body.trim() ? body.trim() : `HTTP ${r.status}`);
    throw { status: r.status, error: msg, raw: body };
  }
  return body;
}

function setMsg(sel, text) { const el = $(sel); if (el) el.textContent = text || ""; }

async function ensureLoginOrRedirect() {
  try { await api("/api/admin/me"); return true; }
  catch { location.href = "/admin-login"; return false; }
}

async function loadSiteIntoForm() {
  const s = await api("/api/site");
  $("#site_title").value = s.site_title || "";
  $("#site_logo_url").value = s.site_logo_url || "";
  $("#bg_left_url").value = s.bg_left_url || "";
  $("#marquee_text").value = (s.marquee_text ?? s.marqueeText ?? "") || "";
  $("#link_login").value = s.link_login || "";
  $("#link_daftar").value = s.link_daftar || "";
}

async function loadMarketsTable() {
  const rows = await api("/api/markets");
  const tb = $("#marketRows");
  tb.innerHTML = "";
  for (const m of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="logo" src="${m.logo_url}" alt="" onerror="this.style.opacity=.2"></td>
      <td>${m.id}</td>
      <td>${m.name}</td>
      <td>${m.sort_order}</td>
      <td>
        <button class="ghost" data-edit="${m.id}">Edit</button>
        <button class="ghost" data-del="${m.id}">Hapus</button>
      </td>
    `;
    tb.appendChild(tr);
  }

  tb.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm(`Hapus market ${id}?`)) return;
      try {
        await api(`/api/admin/markets/${id}`, { method: "DELETE" });
        setMsg("#marketMsg", "Terhapus ✅");
        await loadMarketsTable();
      } catch (e) {
        setMsg("#marketMsg", `Gagal: ${e?.error || e}`);
      }
    });
  });

  tb.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const name = prompt("Nama baru (CAPS)?");
      if (name === null) return;
      const logo_url = prompt("Logo URL baru?");
      if (logo_url === null) return;
      const sort_order = prompt("Sort order (angka)?", "0");
      if (sort_order === null) return;

      try {
        await api(`/api/admin/markets/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name, logo_url, sort_order: Number(sort_order) })
        });
        setMsg("#marketMsg", "Tersimpan ✅");
        await loadMarketsTable();
      } catch (e) {
        setMsg("#marketMsg", `Gagal: ${e?.error || e}`);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ensureLoginOrRedirect())) return;

  await loadSiteIntoForm();
  await loadMarketsTable();

  $("#btnLogout")?.addEventListener("click", async () => {
    try { await api("/api/admin/logout", { method: "POST", body: "{}" }); }
    finally { location.href = "/admin-login"; }
  });

  $("#btnSaveSite")?.addEventListener("click", async () => {
    setMsg("#siteMsg", "");
    try {
      await api("/api/admin/site", {
        method: "POST",
        body: JSON.stringify({
          site_title: $("#site_title").value,
          site_logo_url: $("#site_logo_url").value,
          bg_left_url: $("#bg_left_url").value,
          bg_right_url: "",
          marquee_text: $("#marquee_text").value,
          link_login: $("#link_login").value,
          link_daftar: $("#link_daftar").value
        })
      });
      setMsg("#siteMsg", "Tersimpan ✅");
    } catch (e) {
      setMsg("#siteMsg", `Gagal: ${e?.error || e}`);
    }
  });

  $("#btnAddMarket")?.addEventListener("click", async () => {
    setMsg("#marketMsg", "");
    const name = ($("#m_name")?.value || "").trim();
    const logo_url = ($("#m_logo")?.value || "").trim();
    const sort_order = Number($("#m_sort")?.value || 0);

    if (!name || !logo_url) {
      setMsg("#marketMsg", "Nama & Logo URL wajib diisi");
      return;
    }

    try {
      await api("/api/admin/markets", {
        method: "POST",
        body: JSON.stringify({ name, logo_url, sort_order })
      });
      setMsg("#marketMsg", "Berhasil tambah ✅");
      $("#m_name").value = "";
      $("#m_logo").value = "";
      $("#m_sort").value = "";
      await loadMarketsTable();
    } catch (e) {
      setMsg("#marketMsg", `Gagal: ${e?.error || e}`);
    }
  });
});
