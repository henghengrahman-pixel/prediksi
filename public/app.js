// public/app.js (UPDATED FIX LENGKAP)
// - btnRefresh diganti jadi "PASANG ANGKA SEKARANG" => buka link_login (sama kayak menu LOGIN)
// - refresh data pindah ke tombol baru (opsional) via double click pada banner (biar tetap ada refresh tanpa nambah UI)
// - running text dari admin tetap jalan, tapi TIDAK ditimpa update market (biar konsisten)
// - simpan login url global dari /api/site

const $ = (s) => document.querySelector(s);

let markets = [];
let lastMarketId = null;
let lastData = null;      // tanda: sudah pernah load prediction
let started = false;      // tanda: user sudah klik LIHAT / Search pilih market

let SITE_LOGIN_URL = "#";     // dari admin
let SITE_MARQUEE_TEXT = "";   // dari admin

/* ============================= */
/* Drawer */
/* ============================= */
function setDrawer(open) {
  const drawer = $("#drawer");
  const mask = $("#mask");
  if (!drawer || !mask) return;

  if (open) {
    drawer.setAttribute("data-open", "1");
    drawer.setAttribute("aria-hidden", "false");
    mask.hidden = false;
  } else {
    drawer.removeAttribute("data-open");
    drawer.setAttribute("aria-hidden", "true");
    mask.hidden = true;
  }
}

/* ============================= */
/* Markets */
/* ============================= */
function fillMarkets(list) {
  const sel = $("#market");
  if (!sel) return;

  sel.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— Pilih pasaran dulu —";
  sel.appendChild(ph);

  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  }

  lastMarketId = null;
  sel.value = "";
}

function joinList(arr) {
  if (!Array.isArray(arr)) return "-";
  return arr.join(" / ");
}

/* ============================= */
/* Site (logo/bg/links/marquee)  */
/* ============================= */
async function loadSite() {
  const r = await fetch("/api/site");
  const s = await r.json();

  document.title = s.site_title || "Dashboard";

  // logo only
  if ($("#siteLogo")) $("#siteLogo").src = s.site_logo_url || $("#siteLogo").src;

  // Background 1 saja (pakai bg_left_url)
  if (s.bg_left_url) {
    document.documentElement.style.setProperty("--bg-url", `url("${s.bg_left_url}")`);
  }

  // links
  SITE_LOGIN_URL = s.link_login || "#";
  if ($("#linkLogin")) $("#linkLogin").href = SITE_LOGIN_URL;
  if ($("#linkDaftar")) $("#linkDaftar").href = s.link_daftar || "#";

  // marquee dari admin
  SITE_MARQUEE_TEXT = (s.marquee_text ?? s.marqueeText ?? "Update otomatis mengikuti WIB.").toString().trim();

  if ($("#marqueeText")) $("#marqueeText").textContent = SITE_MARQUEE_TEXT;
  if ($("#marqueeText2")) $("#marqueeText2").textContent = SITE_MARQUEE_TEXT;

  // tombol refresh diganti jadi CTA login
  if ($("#btnRefresh")) $("#btnRefresh").textContent = "PASANG ANGKA SEKARANG";
}

/* ============================= */
/* Markets */
/* ============================= */
async function loadMarkets() {
  const r = await fetch("/api/markets");
  markets = await r.json();
  fillMarkets(markets);
}

function setMarketLogoById(id) {
  const m = markets.find(x => x.id === id);
  if ($("#marketLogo")) {
    $("#marketLogo").src = m?.logo_url || "https://via.placeholder.com/44x44.png?text=M";
  }
}

/* ============================= */
/* UI helper: hide panel */
/* ============================= */
function hidePanel() {
  if ($("#panel")) $("#panel").hidden = true;
  if ($("#bannerText")) $("#bannerText").textContent = "Pilih pasaran, lalu klik LIHAT.";
  if ($("#panelName")) $("#panelName").textContent = "-";
  if ($("#panelDate")) $("#panelDate").textContent = "-";
  if ($("#panelShio")) $("#panelShio").textContent = "-";
}

/* ============================= */
/* Load Prediction */
/* ============================= */
async function loadPrediction(marketId, silent = false) {
  if (!marketId) return;

  const r = await fetch(`/api/prediction?market=${encodeURIComponent(marketId)}`);
  const data = await r.json();
  lastData = data;

  // tampilkan panel setelah user memilih & load berhasil
  if ($("#panel")) $("#panel").hidden = false;

  if ($("#panelName")) $("#panelName").textContent = data.market;

  // TANPA JAM (hanya tanggal)
  if ($("#panelDate")) $("#panelDate").textContent = `${data.wib.prettyDate} WIB`;
  if ($("#wibClock")) $("#wibClock").textContent = data.wib.prettyDate;

  if ($("#panelShio")) $("#panelShio").textContent = data.cards?.shio ?? "-";

  if ($("#tTanggal")) $("#tTanggal").textContent = data.cards?.tanggal ?? "-";
  if ($("#tBbfs")) $("#tBbfs").textContent = data.cards?.bbfs_kuat ?? "-";
  if ($("#tIkut")) $("#tIkut").textContent = data.cards?.angka_ikut ?? "-";
  if ($("#t4d")) $("#t4d").textContent = joinList(data.cards?.d4);
  if ($("#t3d")) $("#t3d").textContent = joinList(data.cards?.d3);
  if ($("#t2d")) $("#t2d").textContent = joinList(data.cards?.d2);
  if ($("#tColokBebas")) $("#tColokBebas").textContent = data.cards?.colok_bebas ?? "-";
  if ($("#tColokMacau")) $("#tColokMacau").textContent = data.cards?.colok_macau ?? "-";
  if ($("#tTwin")) $("#tTwin").textContent = data.cards?.twin ?? "-";
  if ($("#tSyair")) $("#tSyair").textContent = data.cards?.syair ?? "-";

  if (!silent && $("#bannerText")) {
    $("#bannerText").textContent = `Update: ${data.market} • ${data.wib.prettyDate} WIB`;
  }

  // ✅ jangan overwrite marquee (tetap pakai setting admin)
  if ($("#marqueeText")) $("#marqueeText").textContent = SITE_MARQUEE_TEXT || $("#marqueeText").textContent;
  if ($("#marqueeText2")) $("#marqueeText2").textContent = SITE_MARQUEE_TEXT || $("#marqueeText2").textContent;
}

/* ============================= */
/* Copy Text */
/* ============================= */
function buildCopyText(d) {
  const c = d.cards || {};
  return [
    `${d.market} (${d.wib.prettyDate} WIB)`,
    `BBFS: ${c.bbfs_kuat ?? "-"}`,
    `Angka Ikut: ${c.angka_ikut ?? "-"}`,
    `Shio: ${c.shio ?? "-"}`,
    `4D: ${joinList(c.d4)}`,
    `3D: ${joinList(c.d3)}`,
    `2D: ${joinList(c.d2)}`,
    `Colok Bebas: ${c.colok_bebas ?? "-"}`,
    `Colok Macau: ${c.colok_macau ?? "-"}`,
    `Twin: ${c.twin ?? "-"}`,
    `Syair: ${c.syair ?? "-"}`
  ].join("\n");
}

/* ============================= */
/* Open Login URL */
/* ============================= */
function openLogin() {
  const url = SITE_LOGIN_URL || $("#linkLogin")?.href || "#";
  if (!url || url === "#") {
    if ($("#bannerText")) $("#bannerText").textContent = "Link LOGIN belum di-set di Admin.";
    return;
  }
  window.open(url, "_blank", "noopener");
}

/* ============================= */
/* Init */
/* ============================= */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSite();
  await loadMarkets();

  hidePanel();

  // drawer
  if ($("#btnMenu")) $("#btnMenu").addEventListener("click", () => setDrawer(true));
  if ($("#btnClose")) $("#btnClose").addEventListener("click", () => setDrawer(false));
  if ($("#mask")) $("#mask").addEventListener("click", () => setDrawer(false));

  // search: pilih market saja
  if ($("#btnSearch")) {
    $("#btnSearch").addEventListener("click", () => {
      const q = ($("#search")?.value || "").trim().toLowerCase();
      if (!q) return;

      const found = markets.find(m => m.name.toLowerCase().includes(q));
      if (found) {
        $("#market").value = found.id;
        lastMarketId = found.id;
        setMarketLogoById(found.id);
        if ($("#bannerText")) $("#bannerText").textContent = `Dipilih: ${found.name}. Klik LIHAT.`;
      } else {
        if ($("#bannerText")) $("#bannerText").textContent = `Tidak ditemukan: ${q}`;
      }
    });
  }

  // dropdown change
  if ($("#market")) {
    $("#market").addEventListener("change", () => {
      const id = $("#market").value;
      lastMarketId = id || null;

      if (lastMarketId) {
        setMarketLogoById(lastMarketId);
        if ($("#bannerText")) $("#bannerText").textContent = "Klik LIHAT untuk menampilkan data.";
      } else {
        hidePanel();
      }
    });
  }

  // LIHAT
  if ($("#btnLoad")) {
    $("#btnLoad").addEventListener("click", () => {
      const id = $("#market").value;
      if (!id) {
        hidePanel();
        return;
      }
      lastMarketId = id;
      started = true;
      setMarketLogoById(id);
      loadPrediction(id);
    });
  }

  // ✅ Tombol bawah kiri: PASANG ANGKA SEKARANG (arah ke login)
  if ($("#btnRefresh")) {
    $("#btnRefresh").addEventListener("click", () => {
      openLogin();
    });
  }

  // Copy
  if ($("#btnCopy")) {
    $("#btnCopy").addEventListener("click", async () => {
      if (!lastData) return;
      try {
        await navigator.clipboard.writeText(buildCopyText(lastData));
        if ($("#bannerText")) $("#bannerText").textContent = "Tercopy ✅";
      } catch {
        if ($("#bannerText")) $("#bannerText").textContent = "Gagal copy ❗";
      }
    });
  }

  // OPTIONAL refresh data tanpa nambah tombol:
  // double click banner untuk refresh prediction
  if ($("#bannerText")) {
    $("#bannerText").addEventListener("dblclick", () => {
      if (!started || !lastMarketId) return;
      loadPrediction(lastMarketId);
    });
  }

  // auto refresh: hanya jalan setelah user klik LIHAT
  setInterval(() => {
    if (started && lastMarketId && lastData) loadPrediction(lastMarketId, true);
  }, 15000);
});
