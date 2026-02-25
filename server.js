import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// ===== Admin login via Railway Variables =====
const ADMIN_ID = (process.env.ADMIN_ID || "").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "").trim();
const SESSION_SECRET = (process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex")).trim();

// ===== WIB =====
const TZ = "Asia/Jakarta";

// ===== DB =====
const DB_DIR = process.env.DB_DIR || "./data";
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, "app.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`);

function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM site_settings WHERE key=?").get(key);
  return row?.value ?? fallback;
}
function setSetting(key, value) {
  db.prepare("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(key, String(value ?? ""));
}

function seedDefaults() {
  // site defaults
  if (!getSetting("site_title")) setSetting("site_title", "WDBOS Dashboard");
  if (!getSetting("site_logo_url")) setSetting("site_logo_url", "https://via.placeholder.com/44x44.png?text=W");
  if (!getSetting("bg_left_url")) setSetting("bg_left_url", "https://images.unsplash.com/photo-1520975958225-b561dc06f3f5?q=80&w=1100&auto=format&fit=crop");
  if (!getSetting("bg_right_url")) setSetting("bg_right_url", "https://images.unsplash.com/photo-1614851099511-773084e7c7b0?q=80&w=1100&auto=format&fit=crop");
  if (!getSetting("link_login")) setSetting("link_login", "#");
  if (!getSetting("link_daftar")) setSetting("link_daftar", "#");

  // markets defaults
  const count = db.prepare("SELECT COUNT(*) c FROM markets").get().c;
  if (count === 0) {
    const ins = db.prepare("INSERT INTO markets(id,name,logo_url,sort_order) VALUES(?,?,?,?)");
    ins.run("hongkong", "HONGKONG", "https://via.placeholder.com/44x44.png?text=HK", 1);
    ins.run("singapore", "SINGAPORE", "https://via.placeholder.com/44x44.png?text=SG", 2);
    ins.run("sydney", "SYDNEY", "https://via.placeholder.com/44x44.png?text=SYD", 3);
  }
}
seedDefaults();

// ===== Helpers WIB =====
function wibParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value || "";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const weekday = get("weekday");
  const HH = get("hour");
  const MM = get("minute");
  const SS = get("second");
  return {
    yyyy, mm, dd, weekday, HH, MM, SS,
    dateKey: `${yyyy}-${mm}-${dd}`,
    time: `${HH}:${MM}:${SS}`,
    prettyDate: `${weekday}, ${dd}-${mm}-${yyyy}`
  };
}

// ===== Deterministic generator (hiburan) =====
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickUnique(rand, count, max) {
  const set = new Set();
  while (set.size < count) set.add(Math.floor(rand() * max));
  return [...set];
}
const SHIO = ["TIKUS","KERBAU","HARIMAU","KELINCI","NAGA","ULAR","KUDA","KAMBING","MONYET","AYAM","ANJING","BABI"];
function shioFromNumber(n) {
  const idx = ((n % 12) + 12) % 12;
  return SHIO[idx];
}

function buildPrediction(marketName = "HONGKONG") {
  const { dateKey, prettyDate, time } = wibParts(new Date());
  const name = String(marketName || "HONGKONG").toUpperCase().trim();
  const seed = `${dateKey}|${name}|WIB`;
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());

  const bbfs = pickUnique(rand, 7, 10).join("");
  const angkaIkut = String(Math.floor(rand() * 100000)).padStart(5, "0");
  const main2d = Math.floor(rand() * 100);
  const shio = shioFromNumber(main2d);

  const makeList = (len, mod, pad) =>
    Array.from({ length: len }, () => String(Math.floor(rand() * mod)).padStart(pad, "0"));

  return {
    market: name,
    wib: { dateKey, prettyDate, time, tz: TZ },
    cards: {
      tanggal: prettyDate,
      bbfs_kuat: bbfs,
      angka_ikut: angkaIkut,
      shio,
      d4: makeList(5, 10000, 4),
      d3: makeList(6, 1000, 3),
      d2: makeList(12, 100, 2),
      colok_bebas: pickUnique(rand, 2, 10).join(" / "),
      colok_macau: makeList(3, 100, 2).join(" / "),
      twin: `${String(Math.floor(rand() * 100)).padStart(2, "0")} / ${String(Math.floor(rand() * 100)).padStart(2, "0")}`,
      syair: [
        "Kisah angka tak pernah berakhir, setiap detik, harapan menyala.",
        "Langkah kecil hari ini, jadi cerita besar esok hari.",
        "Tenang, fokus, dan konsisten—hasil mengikuti arah."
      ][Math.floor(rand() * 3)]
    },
    disclaimer: "Konten hiburan/demonstrasi UI. Bukan ajakan berjudi."
  };
}

// ===== Admin session =====
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expSig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expSig))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
function requireAdmin(req, res, next) {
  const t = req.cookies?.admin_token;
  const data = verifyToken(t);
  if (!data || data.exp < Date.now()) return res.status(401).json({ error: "UNAUTHORIZED" });
  next();
}

// ===== App =====
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Public API
app.get("/api/site", (_req, res) => {
  res.json({
    site_title: getSetting("site_title", "WDBOS Dashboard"),
    site_logo_url: getSetting("site_logo_url", ""),
    bg_left_url: getSetting("bg_left_url", ""),
    bg_right_url: getSetting("bg_right_url", ""),
    link_login: getSetting("link_login", "#"),
    link_daftar: getSetting("link_daftar", "#")
  });
});

app.get("/api/markets", (_req, res) => {
  const rows = db.prepare("SELECT id,name,logo_url,sort_order FROM markets ORDER BY sort_order ASC, name ASC").all();
  res.json(rows);
});

app.get("/api/prediction", (req, res) => {
  const marketId = String(req.query.market || "").trim();
  let marketName = "HONGKONG";
  if (marketId) {
    const row = db.prepare("SELECT name FROM markets WHERE id=?").get(marketId);
    if (row?.name) marketName = row.name;
  }
  res.json(buildPrediction(marketName));
});

// Admin pages
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "public/admin.html")));

// Admin auth
app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_ID || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_CREDENTIALS_NOT_SET" });
  }
  const id = String(req.body?.id || "").trim();
  const pw = String(req.body?.password || "").trim();
  if (id !== ADMIN_ID || pw !== ADMIN_PASSWORD) return res.status(401).json({ error: "INVALID_LOGIN" });

  const token = signToken({ id, exp: Date.now() + 1000 * 60 * 60 * 6 }); // 6 jam
  res.cookie("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true, // Railway https
    maxAge: 1000 * 60 * 60 * 6
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ ok: true });
});

// Admin APIs (protected)
app.get("/api/admin/me", requireAdmin, (_req, res) => res.json({ ok: true }));

app.post("/api/admin/site", requireAdmin, (req, res) => {
  const b = req.body || {};
  const keys = ["site_title","site_logo_url","bg_left_url","bg_right_url","link_login","link_daftar"];
  for (const k of keys) {
    if (k in b) setSetting(k, b[k]);
  }
  res.json({ ok: true });
});

function slugifyId(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || crypto.randomBytes(4).toString("hex");
}

app.post("/api/admin/markets", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const logo_url = String(req.body?.logo_url || "").trim();
  const sort_order = Number(req.body?.sort_order || 0);
  if (!name || !logo_url) return res.status(400).json({ error: "NAME_AND_LOGO_REQUIRED" });

  const id = slugifyId(req.body?.id || name);
  db.prepare("INSERT INTO markets(id,name,logo_url,sort_order) VALUES(?,?,?,?)")
    .run(id, name.toUpperCase(), logo_url, sort_order);
  res.json({ ok: true, id });
});

app.put("/api/admin/markets/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const row = db.prepare("SELECT id FROM markets WHERE id=?").get(id);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });

  const name = String(req.body?.name || "").trim();
  const logo_url = String(req.body?.logo_url || "").trim();
  const sort_order = Number(req.body?.sort_order ?? 0);

  db.prepare("UPDATE markets SET name=?, logo_url=?, sort_order=? WHERE id=?")
    .run((name || "").toUpperCase(), logo_url, sort_order, id);

  res.json({ ok: true });
});

app.delete("/api/admin/markets/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id);
  db.prepare("DELETE FROM markets WHERE id=?").run(id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  const { prettyDate, time } = wibParts(new Date());
  console.log(`Server :${PORT} | WIB: ${prettyDate} ${time}`);
});
