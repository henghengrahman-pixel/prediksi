// public/admin.js (FIX LENGKAP)
// - Tambah setting RUNNING TEXT: marquee_text
// - Background cuma 1 (pakai bg_left_url), bg_right_url di-reset ""
// - credentials include (cookie session)
// - Error handling aman (json/text)

const $ = (s) => document.querySelector(s);

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const hasBody = opts.body !== undefined && opts.body !== null;

  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const r = await fetch(url, { credentials: "include", ...opts, headers });
  const ct = r.headers.get("content-type") || "";

  let body;
  try {
    body = ct.includes("application/json") ? await r.json() : await r.text();
  } catch {
    body = await r.text().catch(() => "");
  }

  if (!r.ok) {
    // normalisasi error supaya #msg tampil enak
    const msg =
      (typeof body === "object" && body && (body.error || body.message)) ? (body.error || body.message)
      : (typeof body === "string" && body.trim() ? body.trim()
      : `HTTP ${r.status}`);
    throw { status: r.status, error: msg, raw: body };
  }

  return body;
}

function show(el, yes) { if (el) el.hidden = !yes; }
function setMsg(id, text) { const el = $(id); if (el) el.textContent = text || ""; }

async function checkLogin() {
  try { await api("/api/admin/me"); return true; } catch { return false; }
}

async function loadSiteIntoForm() {
  const s = await api("/api/site");

  $("#site_title").value = s.site_title || "";
  $("#site_logo_url").value = s.site_logo_url || "";

  // ✅ 1 background: pakai bg_left_url
  $("#bg_left_url").value = s.bg_left_url || "";

  // ✅ running text
  // support 2 kemungkinan nama field (biar kompatibel)
  const mt = s.marquee_text ?? s.marqueeText ?? "";
  const el = $("#marquee_text");
  if (el) el.value = mt || "";

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

async function enterPanel() {
  show($("#loginCard"), false);
  show($("#panelCard"), true);
  show($("#marketsCard"), true);
  await loadSiteIntoForm();
  await loadMarketsTable();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (await checkLogin()) await enterPanel();

  $("#btnLogin")?.addEventListener("click", async () => {
    setMsg("#loginMsg", "");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ id: $("#aid").value, password: $("#apw").value })
      });
      setMsg("#loginMsg", "Login sukses ✅");
      await enterPanel();
    } catch (e) {
      setMsg("#loginMsg", `Login gagal: ${e?.error || e}`);
    }
  });

  $("#btnLogout")?.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST", body: "{}" });
    } finally {
      location.reload();
    }
  });

  $("#btnSaveSite")?.addEventListener("click", async () => {
    setMsg("#siteMsg", "");
    try {
      await api("/api/admin/site", {
        method: "POST",
        body: JSON.stringify({
          site_title: $("#site_title").value,
          site_logo_url: $("#site_logo_url").value,

          // ✅ background cuma 1
          bg_left_url: $("#bg_left_url").value,
          bg_right_url: "",

          // ✅ running text
          marquee_text: ($("#marquee_text") ? $("#marquee_text").value : ""),

          link_login: $("#link_login").value,
          link_daftar: $("#link_daftar").value
        })
      });
      setMsg("#siteMsg", "Tersimpan ✅ (cek halaman utama)");
    } catch (e) {
      setMsg("#siteMsg", `Gagal: ${e?.error || e}`);
    }
  });

  $("#btnAddMarket")?.addEventListener("click", async () => {
    setMsg("#marketMsg", "");
    const name = $("#m_name").value.trim();
    const logo_url = $("#m_logo").value.trim();
    const sort_order = Number($("#m_sort").value || 0);

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
