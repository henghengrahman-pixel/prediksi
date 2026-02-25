const $ = (s) => document.querySelector(s);

let markets = [];
let lastMarketId = null;
let lastData = null;

function setDrawer(open) {
  const drawer = $("#drawer");
  const mask = $("#mask");
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

function fillMarkets(list) {
  const sel = $("#market");
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

async function loadSite() {
  const r = await fetch("/api/site");
  const s = await r.json();

  document.title = s.site_title || "Dashboard";
  $("#siteTitle").textContent = s.site_title || "WDBOS";
  $("#siteLogo").src = s.site_logo_url || $("#siteLogo").src;

  $("#bgLeft").src = s.bg_left_url || "";
  $("#bgRight").src = s.bg_right_url || "";

  $("#linkLogin").href = s.link_login || "#";
  $("#linkDaftar").href = s.link_daftar || "#";
}

async function loadMarkets() {
  const r = await fetch("/api/markets");
  markets = await r.json();
  fillMarkets(markets);
}

function setMarketLogoById(id) {
  const m = markets.find(x => x.id === id);
  $("#marketLogo").src = m?.logo_url || "https://via.placeholder.com/44x44.png?text=M";
}

async function loadPrediction(marketId, silent = false) {
  const r = await fetch(`/api/prediction?market=${encodeURIComponent(marketId)}`);
  const data = await r.json();
  lastData = data;

  $("#panel").hidden = false;
  $("#panelName").textContent = data.market;
  $("#panelDate").textContent = `${data.wib.prettyDate} • ${data.wib.time} WIB`;
  $("#wibClock").textContent = data.wib.time;
  $("#panelShio").textContent = data.cards.shio;

  $("#tTanggal").textContent = data.cards.tanggal;
  $("#tBbfs").textContent = data.cards.bbfs_kuat;
  $("#tIkut").textContent = data.cards.angka_ikut;
  $("#t4d").textContent = joinList(data.cards.d4);
  $("#t3d").textContent = joinList(data.cards.d3);
  $("#t2d").textContent = joinList(data.cards.d2);
  $("#tColokBebas").textContent = data.cards.colok_bebas;
  $("#tColokMacau").textContent = data.cards.colok_macau;
  $("#tTwin").textContent = data.cards.twin;
  $("#tSyair").textContent = data.cards.syair;

  if (!silent) $("#bannerText").textContent = `Update: ${data.market} • ${data.wib.prettyDate} WIB`;
}

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

document.addEventListener("DOMContentLoaded", async () => {
  await loadSite();
  await loadMarkets();

  $("#btnMenu").addEventListener("click", () => setDrawer(true));
  $("#btnClose").addEventListener("click", () => setDrawer(false));
  $("#mask").addEventListener("click", () => setDrawer(false));

  $("#btnSearch").addEventListener("click", () => {
    const q = ($("#search").value || "").trim().toLowerCase();
    if (!q) return;
    const found = markets.find(m => m.name.toLowerCase().includes(q));
    if (found) {
      $("#market").value = found.id;
      lastMarketId = found.id;
      setMarketLogoById(found.id);
      loadPrediction(found.id);
    } else {
      $("#bannerText").textContent = `Tidak ditemukan: ${q}`;
    }
  });

  $("#btnLoad").addEventListener("click", () => {
    const id = $("#market").value;
    lastMarketId = id;
    setMarketLogoById(id);
    loadPrediction(id);
  });

  $("#btnRefresh").addEventListener("click", () => loadPrediction(lastMarketId));

  $("#btnCopy").addEventListener("click", async () => {
    if (!lastData) return;
    try {
      await navigator.clipboard.writeText(buildCopyText(lastData));
      $("#bannerText").textContent = "Tercopy ✅";
    } catch {
      $("#bannerText").textContent = "Gagal copy ❗";
    }
  });

  // initial
  if (lastMarketId) {
    setMarketLogoById(lastMarketId);
    await loadPrediction(lastMarketId);
  }

  // auto refresh
  setInterval(() => {
    if (lastMarketId) loadPrediction(lastMarketId, true);
  }, 15000);
});
