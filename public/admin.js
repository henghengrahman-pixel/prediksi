// public/admin.js (UPDATED)
// - token/cookie safe
// - handle JSON/text error nicely
// - no prompt-edit (pakai inline edit row biar enak & rapi)
// - sort table by sort_order asc then name
// - basic loading state

const $ = (s) => document.querySelector(s);

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };

  // Only set JSON content-type when we actually send a body
  const hasBody = opts.body !== undefined && opts.body !== null;
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const r = await fetch(url, {
    credentials: "include",
    ...opts,
    headers
  });

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
function setText(sel, txt) { const el = $(sel); if (el) el.textContent = txt || ""; }
function setLoading(btn, yes, label = "Loading...") {
  if (!btn) return;
  btn.disabled = !!yes;
  btn.dataset._old = btn.dataset._old || btn.textContent;
  btn.textContent = yes ? label : btn.dataset._old;
  if (!yes) delete btn.dataset._old;
}

async function checkLogin() {
  try {
    await api("/api/admin/me");
    return true;
  } catch {
    return false;
  }
}

async function loadSiteIntoForm() {
  const s = await api("/api/site");
  $("#site_title").value = s.site_title || "";
  $("#site_logo_url").value = s.site_logo_url || "";
  $("#bg_left_url").value = s.bg_left_url || "";
  $("#bg_right_url").value = s.bg_right_url || "";
  $("#link_login").value = s.link_login || "";
  $("#link_daftar").value = s.link_daftar || "";
}

function marketRowTemplate(m) {
  const logo = (m.logo_url || "").replace(/"/g, "&quot;");
  const name = (m.name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sort = Number(m.sort_order || 0);

  return `
    <tr data-row="${m.id}">
      <td class="td-logo">
        <img class="logo" src="${logo}" alt="" onerror="this.style.opacity=.2" />
      </td>

      <td class="td-id">
        <span class="pill">${m.id}</span>
      </td>

      <td class="td-name">
        <div class="view" data-view>
          <div class="name">${name}</div>
          <div class="muted small">${logo}</div>
        </div>

        <div class="edit" data-edit-ui hidden>
          <input class="inp" data-name value="${(m.name || "").replace(/"/g, "&quot;")}" placeholder="Nama market" />
          <input class="inp" data-logo value="${(m.logo_url || "").replace(/"/g, "&quot;")}" placeholder="Logo URL" />
        </div>
      </td>

      <td class="td-sort">
        <div class="view" data-view>
          <span class="pill pill--num">${sort}</span>
        </div>

        <div class="edit" data-edit-ui hidden>
          <input class="inp inp--num" data-sort type="number" value="${sort}" min="-9999" max="9999" />
        </div>
      </td>

      <td class="td-actions">
        <div class="rowActions">
          <button class="ghost" data-act="edit">Edit</button>
          <button class="ghost" data-act="save" hidden>Simpan</button>
          <button class="ghost" data-act="cancel" hidden>Batal</button>
          <button class="ghost danger" data-act="del">Hapus</button>
        </div>
      </td>
    </tr>
  `;
}

async function loadMarketsTable() {
  const rows = await api("/api/markets");
  rows.sort((a, b) => (Number(a.sort_order || 0) - Number(b.sort_order || 0)) || String(a.name || "").localeCompare(String(b.name || "")));

  const tb = $("#marketRows");
  tb.innerHTML = rows.map(marketRowTemplate).join("");

  // Bind row actions
  tb.querySelectorAll("tr[data-row]").forEach(tr => {
    const id = tr.getAttribute("data-row");

    const btnEdit = tr.querySelector('[data-act="edit"]');
    const btnSave = tr.querySelector('[data-act="save"]');
    const btnCancel = tr.querySelector('[data-act="cancel"]');
    const btnDel = tr.querySelector('[data-act="del"]');

    const views = tr.querySelectorAll("[data-view]");
    const edits = tr.querySelectorAll("[data-edit-ui]");

    const inpName = tr.querySelector("[data-name]");
    const inpLogo = tr.querySelector("[data-logo]");
    const inpSort = tr.querySelector("[data-sort]");

    // keep original for cancel
    const original = {
      name: inpName?.value ?? "",
      logo_url: inpLogo?.value ?? "",
      sort_order: Number(inpSort?.value ?? 0)
    };

    const setMode = (editing) => {
      views.forEach(v => (v.hidden = !!editing));
      edits.forEach(e => (e.hidden = !editing));
      btnEdit.hidden = !!editing;
      btnSave.hidden = !editing;
      btnCancel.hidden = !editing;
      btnDel.disabled = !!editing; // prevent delete while editing
    };

    btnEdit?.addEventListener("click", () => setMode(true));

    btnCancel?.addEventListener("click", () => {
      if (inpName) inpName.value = original.name;
      if (inpLogo) inpLogo.value = original.logo_url;
      if (inpSort) inpSort.value = String(original.sort_order);
      setText("#marketMsg", "");
      setMode(false);
    });

    btnSave?.addEventListener("click", async () => {
      setText("#marketMsg", "");
      const name = (inpName?.value || "").trim();
      const logo_url = (inpLogo?.value || "").trim();
      const sort_order = Number(inpSort?.value || 0);

      if (!name) return setText("#marketMsg", "Nama wajib diisi");
      if (!logo_url) return setText("#marketMsg", "Logo URL wajib diisi");
      if (!Number.isFinite(sort_order)) return setText("#marketMsg", "Sort order harus angka");

      try {
        setLoading(btnSave, true, "Menyimpan...");
        await api(`/api/admin/markets/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name, logo_url, sort_order })
        });
        setText("#marketMsg", "Tersimpan ✅");
        await loadMarketsTable(); // re-render fresh
      } catch (e) {
        setText("#marketMsg", `Gagal: ${e?.error || e}`);
      } finally {
        setLoading(btnSave, false);
      }
    });

    btnDel?.addEventListener("click", async () => {
      setText("#marketMsg", "");
      if (!confirm(`Hapus market ${id}?`)) return;
      try {
        setLoading(btnDel, true, "Menghapus...");
        await api(`/api/admin/markets/${id}`, { method: "DELETE" });
        setText("#marketMsg", "Terhapus ✅");
        await loadMarketsTable();
      } catch (e) {
        setText("#marketMsg", `Gagal: ${e?.error || e}`);
      } finally {
        setLoading(btnDel, false);
      }
    });

    // enter key = save, esc = cancel
    tr.addEventListener("keydown", (ev) => {
      if (btnSave.hidden) return;
      if (ev.key === "Enter") btnSave.click();
      if (ev.key === "Escape") btnCancel.click();
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
    setText("#loginMsg", "");
    const btn = $("#btnLogin");
    try {
      setLoading(btn, true, "Login...");
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ id: $("#aid").value, password: $("#apw").value })
      });
      setText("#loginMsg", "Login sukses ✅");
      await enterPanel();
    } catch (e) {
      setText("#loginMsg", `Login gagal: ${e?.error || e}`);
    } finally {
      setLoading(btn, false);
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
    setText("#siteMsg", "");
    const btn = $("#btnSaveSite");
    try {
      setLoading(btn, true, "Menyimpan...");
      await api("/api/admin/site", {
        method: "POST",
        body: JSON.stringify({
          site_title: $("#site_title").value,
          site_logo_url: $("#site_logo_url").value,
          bg_left_url: $("#bg_left_url").value,
          bg_right_url: $("#bg_right_url").value,
          link_login: $("#link_login").value,
          link_daftar: $("#link_daftar").value
        })
      });
      setText("#siteMsg", "Tersimpan ✅ (cek halaman utama)");
    } catch (e) {
      setText("#siteMsg", `Gagal: ${e?.error || e}`);
    } finally {
      setLoading(btn, false);
    }
  });

  $("#btnAddMarket")?.addEventListener("click", async () => {
    setText("#marketMsg", "");
    const btn = $("#btnAddMarket");

    const name = $("#m_name").value.trim();
    const logo_url = $("#m_logo").value.trim();
    const sort_order = Number($("#m_sort").value || 0);

    if (!name || !logo_url) return setText("#marketMsg", "Nama & Logo URL wajib diisi");
    if (!Number.isFinite(sort_order)) return setText("#marketMsg", "Sort order harus angka");

    try {
      setLoading(btn, true, "Menambah...");
      await api("/api/admin/markets", {
        method: "POST",
        body: JSON.stringify({ name, logo_url, sort_order })
      });
      setText("#marketMsg", "Berhasil tambah ✅");
      $("#m_name").value = "";
      $("#m_logo").value = "";
      $("#m_sort").value = "";
      await loadMarketsTable();
    } catch (e) {
      setText("#marketMsg", `Gagal: ${e?.error || e}`);
    } finally {
      setLoading(btn, false);
    }
  });
});
