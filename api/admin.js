// Yönetim paneli uç noktaları (oturum gerektirir)
const db = require("./_lib/redis");
const U = require("./_lib/util");

const CATS = ["prenses", "balik", "akesim", "sade"];
const GOWNS = ["g-ball", "g-mermaid", "g-aline", "g-sheath", "g-sleeve", "g-off"];
const imgUrl = (v) => (typeof v === "string" && (/^\/api\/img\?id=[\w-]{6,40}$/.test(v) || /^\/assets\/[\w\/-]{1,80}\.(jpe?g|png|webp)$/.test(v)) ? v : null);
const time = (v, d) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);

function cleanSettings(s = {}) {
  const D = U.DEFAULT_SETTINGS;
  const h = s.hours || {};
  return {
    whatsapp: U.str(s.whatsapp, 20).replace(/\D/g, "") || D.whatsapp,
    phone: U.str(s.phone, 30),
    email: U.str(s.email, 120),
    address: U.text(s.address, 300),
    instagram: U.str(s.instagram, 60).replace(/^@/, ""),
    pinterest: U.str(s.pinterest, 60).replace(/^@/, "").replace(/[^\w.-]/g, ""),
    mapsQuery: U.str(s.mapsQuery, 200) || D.mapsQuery,
    googleReviewsUrl: /^https:\/\//.test(s.googleReviewsUrl || "") ? U.str(s.googleReviewsUrl, 300) : "",
    hours: {
      weekdayOpen: time(h.weekdayOpen, D.hours.weekdayOpen),
      weekdayClose: time(h.weekdayClose, D.hours.weekdayClose),
      sundayOpen: time(h.sundayOpen, D.hours.sundayOpen),
      sundayClose: time(h.sundayClose, D.hours.sundayClose),
      sundayClosed: Boolean(h.sundayClosed),
      step: [15, 30, 45, 60, 90, 120].includes(Number(h.step)) ? Number(h.step) : 30
    }
  };
}

function cleanProducts(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 300).map((p, i) => ({
    id: U.str(p.id, 30) || "p" + Date.now().toString(36) + i,
    name: U.str(p.name, 80),
    cat: CATS.includes(p.cat) ? p.cat : "sade",
    price: p.price === "" || p.price == null || isNaN(Number(p.price)) ? null : Math.max(0, Math.round(Number(p.price))),
    gown: GOWNS.includes(p.gown) ? p.gown : "g-aline",
    image: imgUrl(p.image),
    visible: p.visible !== false
  }));
}

function cleanShow(s = {}) {
  const y = Number(s.year);
  return {
    year: y >= 2000 && y <= 2100 ? y : new Date().getFullYear(),
    video: typeof s.video === "string" && /^\/assets\/[\w\/-]{1,80}\.(mp4|webm)$/.test(s.video) ? s.video : null,
    poster: imgUrl(s.poster),
    images: (Array.isArray(s.images) ? s.images : []).slice(0, 200)
      .map((im) => ({ src: imgUrl(im.src), alt: U.str(im.alt, 120) }))
      .filter((im) => im.src)
  };
}

function cleanReviews(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 100).map((r, i) => ({
    id: U.str(r.id, 30) || "r" + Date.now().toString(36) + i,
    name: U.str(r.name, 80),
    rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
    date: U.str(r.date, 40),
    text: U.text(r.text, 1500)
  })).filter((r) => r.name && r.text);
}

const dates = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(U.day(new Date(Date.now() - i * 86400000)));
  return out;
};

async function stats(n) {
  const ds = dates(n);
  const cmds = [];
  ds.forEach((d) => {
    cmds.push(["GET", "gv:pv:" + d], ["PFCOUNT", "gv:uv:" + d], ["HGETALL", "gv:ev:" + d], ["HGETALL", "gv:dev:" + d],
      ["HGETALL", "gv:lang:" + d], ["HGETALL", "gv:ref:" + d], ["HGETALL", "gv:pe:" + d], ["HGETALL", "gv:sq:" + d]);
  });
  const now = Date.now();
  cmds.push(["PFCOUNT", ...ds.map((d) => "gv:uv:" + d)], ["PFCOUNT", "gv:uv:all"],
    ["ZREMRANGEBYSCORE", "gv:live", 0, now - 5 * 60 * 1000], ["ZCARD", "gv:live"],
    ["HVALS", "gv:bookings"], ["HVALS", "gv:messages"]);
  const r = await db.pipe(cmds);

  const add = (acc, obj) => { for (const [k, v] of Object.entries(obj)) acc[k] = (acc[k] || 0) + Number(v); };
  const series = [], events = {}, devices = {}, langs = {}, refs = {}, prod = {}, searches = {};
  ds.forEach((d, i) => {
    const o = i * 8;
    series.push({ date: d, pv: Number(r[o]) || 0, uv: Number(r[o + 1]) || 0 });
    add(events, db.hashToObj(r[o + 2]));
    add(devices, db.hashToObj(r[o + 3]));
    add(langs, db.hashToObj(r[o + 4]));
    add(refs, db.hashToObj(r[o + 5]));
    add(prod, db.hashToObj(r[o + 6]));
    add(searches, db.hashToObj(r[o + 7]));
  });
  const base = ds.length * 8;
  const parseAll = (arr) => (arr || []).map((v) => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
  const bookings = parseAll(r[base + 4]);
  const messages = parseAll(r[base + 5]);

  const products = {};
  for (const [k, v] of Object.entries(prod)) {
    const [ev, id] = k.split("|");
    (products[id] = products[id] || {})[ev] = v;
  }
  const today = series[series.length - 1];
  return {
    days: n,
    series,
    totals: { pv: series.reduce((s, x) => s + x.pv, 0), uv: Number(r[base]) || 0, uvAll: Number(r[base + 1]) || 0 },
    today,
    live: Number(r[base + 3]) || 0,
    events, devices, langs, refs, products,
    searches: Object.entries(searches).sort((a, b) => b[1] - a[1]).slice(0, 15),
    newBookings: bookings.filter((b) => b.status === "new").length,
    unread: messages.filter((m) => !m.read).length
  };
}

module.exports = async (req, res) => {
  const q = U.query(req);
  const a = q.a;
  try {
    if (!db.configured()) return U.send(res, 503, { ok: false, reason: "db" });
    // Basit CSRF koruması: panel her isteğe bu başlığı ekler
    if (req.headers["x-gv"] !== "1") return U.send(res, 403, { ok: false });

    // ---------- Giriş ----------
    if (a === "login" && req.method === "POST") {
      const ipKey = "gv:rl:login:" + U.ip(req);
      if (!(await U.rateLimit(ipKey, 10, 900))) return U.send(res, 429, { ok: false, reason: "rate" });
      const b = await U.body(req);
      const admin = await U.checkPassword(b.user || "", b.pw || "");
      if (!admin) return U.send(res, 401, { ok: false, reason: "invalid" });
      await U.createSession(res, admin.user);
      return U.send(res, 200, { ok: true, user: admin.user, mustChange: Boolean(admin.mustChange) });
    }

    const user = await U.requireAdmin(req);
    if (!user) return U.send(res, 401, { ok: false, reason: "auth" });

    if (a === "me") {
      const ad = await U.getAdmin();
      return U.send(res, 200, { ok: true, user: ad.user, mustChange: Boolean(ad.mustChange) });
    }
    if (a === "logout") { await U.destroySession(req, res); return U.send(res, 200, { ok: true }); }

    if (a === "password" && req.method === "POST") {
      const b = await U.body(req);
      const ad = await U.getAdmin();
      if (!(await U.checkPassword(ad.user, b.current || ""))) return U.send(res, 400, { ok: false, reason: "current" });
      const newUser = U.str(b.user || ad.user, 40);
      if (!/^[\w.@-]{3,40}$/.test(newUser)) return U.send(res, 400, { ok: false, reason: "user" });
      if (String(b.pw || "").length < 8) return U.send(res, 400, { ok: false, reason: "short" });
      await U.setPassword(newUser, b.pw);
      return U.send(res, 200, { ok: true, user: newUser });
    }

    // ---------- İstatistik ----------
    if (a === "stats") {
      const n = [1, 7, 30, 90].includes(Number(q.days)) ? Number(q.days) : 7;
      return U.send(res, 200, { ok: true, ...(await stats(n)) });
    }

    // ---------- Randevular & mesajlar ----------
    const listHash = async (key) => {
      const vals = (await db.cmd("HVALS", key)) || [];
      return vals.map((v) => { try { return JSON.parse(v); } catch { return null; } })
        .filter(Boolean).sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""));
    };
    if (a === "bookings") return U.send(res, 200, { ok: true, items: await listHash("gv:bookings") });
    if (a === "messages") return U.send(res, 200, { ok: true, items: await listHash("gv:messages") });

    if ((a === "booking" || a === "message") && req.method === "POST") {
      const b = await U.body(req);
      const key = a === "booking" ? "gv:bookings" : "gv:messages";
      const id = U.str(b.id, 40);
      const cur = await db.cmd("HGET", key, id);
      if (!cur) return U.send(res, 404, { ok: false });
      if (b.delete) { await db.cmd("HDEL", key, id); return U.send(res, 200, { ok: true }); }
      const item = JSON.parse(cur);
      if (a === "booking" && ["new", "confirmed", "done", "cancelled"].includes(b.status)) item.status = b.status;
      if (a === "booking" && typeof b.note === "string") item.note = U.text(b.note, 500);
      if (a === "message" && typeof b.read === "boolean") item.read = b.read;
      await db.cmd("HSET", key, id, JSON.stringify(item));
      return U.send(res, 200, { ok: true, item });
    }

    // ---------- İçerik ----------
    if (a === "content") return U.send(res, 200, { ok: true, ...(await U.loadContent()) });

    if (a === "save" && req.method === "POST") {
      const b = await U.body(req);
      if (b.settings) await db.setJSON("gv:settings", cleanSettings(b.settings));
      if (b.products) { const p = cleanProducts(b.products); if (p) await db.setJSON("gv:products", p); }
      if (b.show) await db.setJSON("gv:show", cleanShow(b.show));
      if (b.reviews) { const r = cleanReviews(b.reviews); if (r) await db.setJSON("gv:reviews", r); }
      return U.send(res, 200, { ok: true, ...(await U.loadContent()) });
    }

    // ---------- Görseller ----------
    if (a === "upload" && req.method === "POST") {
      const b = await U.body(req);
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.data || "");
      if (!m) return U.send(res, 400, { ok: false, reason: "format" });
      if (m[2].length > 4.2 * 1024 * 1024) return U.send(res, 413, { ok: false, reason: "size" });
      const id = U.uid(12);
      await db.setJSON("gv:img:" + id, { m: m[1], d: m[2] });
      return U.send(res, 200, { ok: true, id, url: "/api/img?id=" + id });
    }
    if (a === "img_delete" && req.method === "POST") {
      const b = await U.body(req);
      const id = (/id=([\w-]{6,40})/.exec(b.url || "") || [])[1];
      if (id) await db.cmd("DEL", "gv:img:" + id);
      return U.send(res, 200, { ok: true });
    }

    return U.send(res, 404, { ok: false });
  } catch (e) {
    console.error(e);
    return U.send(res, 500, { ok: false, reason: "error" });
  }
};
