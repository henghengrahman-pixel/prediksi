const $ = (s) => document.querySelector(s);

async function api(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) throw body;
  return body;
}

function show(el, yes) { el.hidden = !yes; }

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

async function loadMarketsTable() {
  const rows = await api("/api/markets");
  const tb = $("#marketRows");
  tb.innerHTML = "";
  for (const m of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="logo" src="${m.logo_url}" alt=""></td>
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
        $("#marketMsg").textContent = "Terhapus ✅";
        await loadMarketsTable();
      } catch (e) {
        $("#marketMsg").textContent = `Gagal: ${e?.error || e}`;
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
        $("#marketMsg").textContent = "Tersimpan ✅";
        await loadMarketsTable();
      } catch (e) {
        $("#marketMsg").textContent = `Gagal: ${e?.error || e}`;
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

  $("#btnLogin").addEventListener("click", async () => {
    $("#loginMsg").textContent = "";
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ id: $("#aid").value, password: $("#apw").value })
      });
      $("#loginMsg").textContent = "Login sukses ✅";
      await enterPanel();
    } catch (e) {
      $("#loginMsg").textContent = `Login gagal: ${e?.error || e}`;
    }
  });

  $("#btnLogout").addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST", body: "{}" });
    location.reload();
  });

  $("#btnSaveSite").addEventListener("click", async () => {
    $("#siteMsg").textContent = "";
    try {
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
      $("#siteMsg").textContent = "Tersimpan ✅ (cek halaman utama)";
    } catch (e) {
      $("#siteMsg").textContent = `Gagal: ${e?.error || e}`;
    }
  });

  $("#btnAddMarket").addEventListener("click", async () => {
    $("#marketMsg").textContent = "";
    const name = $("#m_name").value.trim();
    const logo_url = $("#m_logo").value.trim();
    const sort_order = Number($("#m_sort").value || 0);
    if (!name || !logo_url) {
      $("#marketMsg").textContent = "Nama & Logo URL wajib diisi";
      return;
    }
    try {
      await api("/api/admin/markets", {
        method: "POST",
        body: JSON.stringify({ name, logo_url, sort_order })
      });
      $("#marketMsg").textContent = "Berhasil tambah ✅";
      $("#m_name").value = "";
      $("#m_logo").value = "";
      $("#m_sort").value = "";
      await loadMarketsTable();
    } catch (e) {
      $("#marketMsg").textContent = `Gagal: ${e?.error || e}`;
    }
  });
});
