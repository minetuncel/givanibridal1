const crypto = require("crypto");
const db = require("./redis");

// ---------- İstek / yanıt yardımcıları ----------
function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!headers["Cache-Control"]) res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

function query(req) {
  const u = new URL(req.url, "http://x");
  return Object.fromEntries(u.searchParams.entries());
}

async function body(req) {
  let b = req.body;
  if (b === undefined) {
    b = await new Promise((resolve) => {
      let s = "";
      req.on("data", (c) => (s += c));
      req.on("end", () => resolve(s));
      req.on("error", () => resolve(""));
    });
  }
  if (Buffer.isBuffer(b)) b = b.toString("utf8");
  if (typeof b === "string") {
    try { return b ? JSON.parse(b) : {}; } catch { return {}; }
  }
  return b || {};
}

function ip(req) {
  const xf = req.headers["x-forwarded-for"] || "";
  return (xf.split(",")[0] || req.socket?.remoteAddress || "0").trim();
}

function cookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

const uid = (n = 10) => crypto.randomBytes(n).toString("base64url");
const day = (d = new Date()) => {
  // Türkiye saatine göre gün (UTC+3)
  const t = new Date(d.getTime() + 3 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
};

// Metin temizleme ve sınırlama
const str = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const text = (v, max = 2000) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);

// Basit hız sınırı: anahtar başına pencere içinde en fazla N istek
async function rateLimit(key, max, windowSec) {
  const [, n] = await db.pipe([["SET", key, 0, "EX", windowSec, "NX"], ["INCR", key]]);
  return Number(n) <= max;
}

// ---------- Varsayılan içerik ----------
const DEFAULT_SETTINGS = {
  whatsapp: "905309518934",
  phone: "0530 951 89 34",
  email: "info@givanibridal.com",
  address: "Atikali Mah. Fevzipaşa Cad.\nEski Altay Sk. No:3 D:A\n34087 Fatih / İstanbul",
  instagram: "givanibridal",
  pinterest: "givanibridal",
  mapsQuery: "Givani Bridal, Eski Altay Sk. No:3, Fatih, İstanbul",
  googleReviewsUrl: "https://share.google/dOHkbhQ2nWm1ZBZy6",
  hours: { weekdayOpen: "10:00", weekdayClose: "19:00", sundayOpen: "12:00", sundayClose: "17:00", sundayClosed: false, step: 30 }
};

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "", cat: "prenses", price: null, gown: "g-ball", image: null, visible: true },
  { id: "p2", name: "", cat: "balik", price: null, gown: "g-mermaid", image: null, visible: true },
  { id: "p3", name: "", cat: "akesim", price: null, gown: "g-sleeve", image: null, visible: true },
  { id: "p4", name: "", cat: "sade", price: null, gown: "g-sheath", image: null, visible: true },
  { id: "p5", name: "", cat: "akesim", price: null, gown: "g-off", image: null, visible: true },
  { id: "p6", name: "", cat: "akesim", price: null, gown: "g-aline", image: null, visible: true },
  { id: "p7", name: "", cat: "balik", price: null, gown: "g-mermaid", image: null, visible: true },
  { id: "p8", name: "", cat: "prenses", price: null, gown: "g-ball", image: null, visible: true }
];

const DEFAULT_SHOW = {
  year: 2026,
  video: "/assets/defile/video.mp4",
  poster: "/assets/defile/video-poster.jpg",
  images: Array.from({ length: 13 }, (_, i) => ({ src: `/assets/defile/${String(i + 1).padStart(2, "0")}.jpg`, alt: "" }))
};
const DEFAULT_REVIEWS = [];

async function loadContent() {
  const [s, p, sh, r] = await db.pipe([
    ["GET", "gv:settings"], ["GET", "gv:products"], ["GET", "gv:show"], ["GET", "gv:reviews"]
  ]);
  const parse = (v, d) => { try { return v == null ? d : JSON.parse(v); } catch { return d; } };
  const settings = { ...DEFAULT_SETTINGS, ...parse(s, {}) };
  settings.hours = { ...DEFAULT_SETTINGS.hours, ...(settings.hours || {}) };
  return {
    settings,
    products: parse(p, DEFAULT_PRODUCTS),
    show: { ...DEFAULT_SHOW, ...parse(sh, {}) },
    reviews: parse(r, DEFAULT_REVIEWS)
  };
}

// ---------- Yönetici kimliği ----------
// İlk kurulum bilgileri: ilk girişten sonra şifre değiştirilmesi zorunludur.
const INITIAL_ADMIN = {
  user: "admin",
  salt: "c77ae4b54e3f5bbdb5a8299a93f89c88",
  hash: "343e354aed7588e4c757043f644e96d7dcf80fc1e5b3b8e7dc451c8994f1537064315a878d914f3f997acf8e8df87e596078074af673568f1a816fcf83b32b24",
  mustChange: true
};

const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString("hex");
const safeEq = (a, b) => {
  const A = Buffer.from(a, "hex"), B = Buffer.from(b, "hex");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

async function getAdmin() {
  return (await db.getJSON("gv:admin", null)) || INITIAL_ADMIN;
}

async function checkPassword(user, pw) {
  const a = await getAdmin();
  if (String(user).trim().toLowerCase() !== a.user.toLowerCase()) {
    hashPw(pw, a.salt); // zamanlama farkını gizle
    return null;
  }
  return safeEq(hashPw(pw, a.salt), a.hash) ? a : null;
}

async function setPassword(user, pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const rec = { user: String(user).trim(), salt, hash: hashPw(pw, salt), mustChange: false };
  await db.setJSON("gv:admin", rec);
  return rec;
}

const SESSION_DAYS = 7;
async function createSession(res, user) {
  const token = uid(32);
  await db.cmd("SET", "gv:sess:" + token, user, "EX", SESSION_DAYS * 86400);
  res.setHeader("Set-Cookie", `gv_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`);
}

async function destroySession(req, res) {
  const t = cookies(req).gv_admin;
  if (t) await db.cmd("DEL", "gv:sess:" + t);
  res.setHeader("Set-Cookie", "gv_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
}

async function requireAdmin(req) {
  const t = cookies(req).gv_admin;
  if (!t || !/^[\w-]{20,}$/.test(t)) return null;
  return db.cmd("GET", "gv:sess:" + t);
}

module.exports = {
  send, query, body, ip, cookies, uid, day, str, text, rateLimit,
  DEFAULT_SETTINGS, DEFAULT_PRODUCTS, DEFAULT_SHOW, DEFAULT_REVIEWS, loadContent,
  getAdmin, checkPassword, setPassword, createSession, destroySession, requireAdmin
};
