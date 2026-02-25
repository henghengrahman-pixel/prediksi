const $ = (s) => document.querySelector(s);

let markets = [];
let lastMarketId = null;
let lastData = null;

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

  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  }

  if (!lastMarketId && list[0]) lastMarketId = list[0].id;
  if (lastMarketId) sel.value = lastMarketId;
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
    $("#marketLogo").src =
      m?.logo_url || "https://via.placeholder.com/44x44.png?text=M";
  }
}

/* ============================= */
/* Load Prediction */
/* ============================= */
async function loadPrediction(marketId, silent = false) {
  if (!marketId) return;

  const r = await fetch(`/api/prediction?market=${encodeURIComponent(marketId)}`);
  const data = await r.json();
  lastData = data;

  if ($("#panel")) $("#panel").hidden = false;

  if ($("#panelName")) $("#panelName").textContent = data.market;

  // TANPA JAM (hanya tanggal)
  if ($("#panelDate"))
    $("#panelDate").textContent = `${data.wib.prettyDate} WIB`;

  if ($("#wibClock"))
    $("#wibClock").textContent = data.wib.prettyDate;

  if ($("#panelShio"))
    $("#panelShio").textContent = data.cards.shio;

  if ($("#tTanggal")) $("#tTanggal").textContent = data.cards.tanggal;
  if ($("#tBbfs")) $("#tBbfs").textContent = data.cards.bbfs_kuat;
  if ($("#tIkut")) $("#tIkut").textContent = data.cards.angka_ikut;
  if ($("#t4d")) $("#t4d").textContent = joinList(data.cards.d4);
  if ($("#t3d")) $("#t3d").textContent = joinList(data.cards.d3);
  if ($("#t2d")) $("#t2d").textContent = joinList(data.cards.d2);
  if ($("#tColokBebas")) $("#tColokBebas").textContent = data.cards.colok_bebas;
  if ($("#tColokMacau")) $("#tColokMacau").textContent = data.cards.colok_macau;
  if ($("#tTwin")) $("#tTwin").textContent = data.cards.twin;
  if ($("#tSyair")) $("#tSyair").textContent = data.cards.syair;

  if (!silent && $("#bannerText")) {
    $("#bannerText").textContent =
      `Update: ${data.market} • ${data.wib.prettyDate} WIB`;
  }
}

/* ============================= */
/* Copy Text */
/* ============================= */
function buildCopyText(d) {
  const c = d.cards;

  return [
    `${d.market} (${d.wib.prettyDate} WIB)`,
    `BBFS: ${c.bbfs_kuat}`,
    `Angka Ikut: ${c.angka_ikut}`,
    `Shio: ${c.shio}`,
    `4D: ${joinList(c.d4)}`,
    `3D: ${joinList(c.d3)}`,
    `2D: ${joinList(c.d2)}`,
    `Colok Bebas: ${c.colok_bebas}`,
    `Colok Macau: ${c.colok_macau}`,
    `Twin: ${c.twin}`,
    `Syair: ${c.syair}`
  ].join("\n");
}

/* ============================= */
/* Init */
/* ============================= */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSite();
  await loadMarkets();

  if ($("#btnMenu")) $("#btnMenu").addEventListener("click", () => setDrawer(true));
  if ($("#btnClose")) $("#btnClose").addEventListener("click", () => setDrawer(false));
  if ($("#mask")) $("#mask").addEventListener("click", () => setDrawer(false));

  if ($("#btnSearch")) {
    $("#btnSearch").addEventListener("click", () => {
      const q = ($("#search")?.value || "").trim().toLowerCase();
      if (!q) return;

      const found = markets.find(m =>
        m.name.toLowerCase().includes(q)
      );

      if (found) {
        $("#market").value = found.id;
        lastMarketId = found.id;
        setMarketLogoById(found.id);
        loadPrediction(found.id);
      } else {
        if ($("#bannerText"))
          $("#bannerText").textContent = `Tidak ditemukan: ${q}`;
      }
    });
  }

  if ($("#btnLoad")) {
    $("#btnLoad").addEventListener("click", () => {
      const id = $("#market").value;
      lastMarketId = id;
      setMarketLogoById(id);
      loadPrediction(id);
    });
  }

  if ($("#btnRefresh")) {
    $("#btnRefresh").addEventListener("click", () =>
      loadPrediction(lastMarketId)
    );
  }

  if ($("#btnCopy")) {
    $("#btnCopy").addEventListener("click", async () => {
      if (!lastData) return;
      try {
        await navigator.clipboard.writeText(buildCopyText(lastData));
        if ($("#bannerText"))
          $("#bannerText").textContent = "Tercopy ✅";
      } catch {
        if ($("#bannerText"))
          $("#bannerText").textContent = "Gagal copy ❗";
      }
    });
  }

  // initial load
  if (lastMarketId) {
    setMarketLogoById(lastMarketId);
    await loadPrediction(lastMarketId);
  }

  // auto refresh (15 detik)
  setInterval(() => {
    if (lastMarketId) loadPrediction(lastMarketId, true);
  }, 15000);
});
