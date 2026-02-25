const $ = (s) => document.querySelector(s);

let markets = [];
let lastMarketId = null;
let lastData = null;      // tanda: sudah pernah load prediction
let started = false;      // tanda: user sudah klik LIHAT / Search pilih market

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

  // tambah placeholder biar jelas belum pilih
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

  // default: jangan auto pilih market pertama
  lastMarketId = null;
  sel.value = "";
}

function joinList(arr) {
  if (!Array.isArray(arr)) return "-";
  return arr.join(" / ");
}

/* ============================= */
/* Load Site (background 1 saja) */
/* ============================= */
async function loadSite() {
  const r = await fetch("/api/site");
  const s = await r.json();

  document.title = s.site_title || "Dashboard";

  if ($("#siteTitle")) $("#siteTitle").textContent = s.site_title || "WDBOS";
  if ($("#siteLogo")) $("#siteLogo").src = s.site_logo_url || $("#siteLogo").src;

  // Background 1 saja (pakai bg_left_url)
  if (s.bg_left_url) {
    document.documentElement.style.setProperty("--bg-url", `url("${s.bg_left_url}")`);
  }

  if ($("#linkLogin")) $("#linkLogin").href = s.link_login || "#";
  if ($("#linkDaftar")) $("#linkDaftar").href = s.link_daftar || "#";

  // kalau kamu sudah pasang running text (marquee)
  if ($("#marqueeText") && typeof s.marquee_text === "string") $("#marqueeText").textContent = s.marquee_text;
  if ($("#marqueeText2") && typeof s.marquee_text === "string") $("#marqueeText2").textContent = s.marquee_text;
}

/* ============================= */
/* Load Markets */
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

  // yang ini tetap isi kalau elemen ada
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

  // optional: kalau kamu mau running text ikut update otomatis (kalau elemen marquee ada)
  if ($("#marqueeText")) $("#marqueeText").textContent = `Update: ${data.market} • ${data.wib.prettyDate} WIB`;
  if ($("#marqueeText2")) $("#marqueeText2").textContent = `Update: ${data.market} • ${data.wib.prettyDate} WIB`;
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
/* Init */
/* ============================= */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSite();
  await loadMarkets();

  hidePanel(); // <- penting: awal halaman panel disembunyikan

  if ($("#btnMenu")) $("#btnMenu").addEventListener("click", () => setDrawer(true));
  if ($("#btnClose")) $("#btnClose").addEventListener("click", () => setDrawer(false));
  if ($("#mask")) $("#mask").addEventListener("click", () => setDrawer(false));

  // klik search: kalau ketemu, pilih market tapi jangan auto load (user tetap klik LIHAT)
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

  // kalau user ganti dropdown, update logo + banner (tanpa load)
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

  // tombol LIHAT = baru load prediction dan tampilkan panel
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

  if ($("#btnRefresh")) {
    $("#btnRefresh").addEventListener("click", () => {
      if (!started || !lastMarketId) return;
      loadPrediction(lastMarketId);
    });
  }

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

  // auto refresh: hanya jalan setelah user klik LIHAT (started) & data sudah ada
  setInterval(() => {
    if (started && lastMarketId && lastData) loadPrediction(lastMarketId, true);
  }, 15000);
});
