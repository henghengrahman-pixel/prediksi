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
    const msg =
      (typeof body === "object" && body && (body.error || body.message)) ? (body.error || body.message)
      : (typeof body === "string" && body.trim() ? body.trim()
      : `HTTP ${r.status}`);
    throw { status: r.status, error: msg, raw: body };
  }

  return body;
}

function show(el, yes) { if (el) el.hidden = !yes; }
function setMsg(sel, text) { const el = $(sel); if (el) el.textContent = text || ""; }

/* =======================================
   Support login UI baru (PINK TIGER)
   - set logo dari /api/site ke <img class="logo-img">
   - set judul di <title> juga optional
======================================= */
async function hydrateLoginBrand() {
  try {
    const s = await api("/api/site");
    // kalau admin.html punya logo image
    const img = document.querySelector(".logo-img");
    if (img && s.site_logo_url) img.src = s.site_logo_url;

    // optional: ganti title admin
    if (s.site_title) document.title = `${s.site_title} • Admin`;
  } catch {
    // ignore (admin page masih bisa dipakai tanpa ini)
  }
}

async function checkLogin() {
  try { await api("/api/admin/me"); return true; } catch { return false; }
}

async function loadSiteIntoForm() {
  const s = await api("/api/site");

  $("#site_title").value = s.site_title || "";
  $("#site_logo_url").value = s.site_logo_url || "";

  // ✅ 1 background: pakai bg_left_url
  $("#bg_left_url").value = s.bg_left_url || "";

  // ✅ running text (compat: marquee_text / marqueeText)
  const mt = s.marquee_text ?? s.marqueeText ?? "";
  const el = $("#marquee_text");
  if (el) el.value = mt || "";

  $("#link_login").value = s.link_login || "";
  $("#link_daftar").value = s.link_daftar || "";

  // sync logo login juga (biar kalau baru disave, login screen ikut berubah)
  const img = document.querySelector(".logo-img");
  if (img && s.site_logo_url) img.src = s.site_logo_url;
}

async function loadMarketsTable() {
  const rows = await api("/api/markets");
  const tb = $("#marketRows");
  if (!tb) return;

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

function showPanelWrapIfAny() {
  const wrap = $("#panelWrap");
  if (wrap) wrap.hidden = false;
}

async function enterPanel() {
  // login screen (section) pakai id loginCard
  show($("#loginCard"), false);

  // panel wrapper (kalau ada di admin.html baru)
  showPanelWrapIfAny();

  // panel lama
  show($("#panelCard"), true);
  show($("#marketsCard"), true);

  await loadSiteIntoForm();
  await loadMarketsTable();
}

document.addEventListener("DOMContentLoaded", async () => {
  // set logo login dari /api/site (kalau ada)
  await hydrateLoginBrand();

  // auto enter kalau sudah login
  if (await checkLogin()) await enterPanel();

  $("#btnLogin")?.addEventListener("click", async () => {
    setMsg("#loginMsg", "");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          id: ($("#aid")?.value || "").trim(),
          password: ($("#apw")?.value || "")
        })
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

      // refresh form supaya sinkron + logo login ikut update
      await loadSiteIntoForm();
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
