// Herkese açık uç noktalar: site içeriği, ziyaret takibi, randevu ve iletişim formu
const db = require("./_lib/redis");
const U = require("./_lib/util");

const TTL = 400 * 86400; // istatistikler ~13 ay saklanır
const EVENTS = new Set([
  "whatsapp_click", "phone_click", "instagram_click", "pinterest_click", "email_click", "map_click", "directions_click",
  "fav_add", "cart_add", "product_click", "search", "gallery_open", "gallery_photo", "size_guide_open",
  "shipping_open", "lang_change", "intro_enter", "booking_submit", "contact_submit", "reviews_more",
  "brides_photo", "brides_more",
  "view_collection", "view_new_season", "view_atelier", "view_brides", "view_show", "view_booking", "view_reviews", "view_contact"
]);

module.exports = async (req, res) => {
  const q = U.query(req);
  const a = q.a;
  try {
    // ---------- İçerik ----------
    if (a === "content" && req.method === "GET") {
      if (!db.configured()) return U.send(res, 200, { ok: false, reason: "db" });
      const c = await U.loadContent();
      c.products = (c.products || []).filter((p) => p.visible !== false);
      return U.send(res, 200, { ok: true, ...c }, { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" });
    }

    if (req.method !== "POST") return U.send(res, 405, { ok: false });
    if (!db.configured()) return U.send(res, 503, { ok: false, reason: "db" });
    const b = await U.body(req);
    const d = U.day();

    // ---------- Ziyaret / etkileşim takibi ----------
    if (a === "track") {
      const vid = U.str(b.v, 40) || "anon";
      const cmds = [];
      const hinc = (key, field) => { cmds.push(["HINCRBY", key, field, 1], ["EXPIRE", key, TTL]); };
      if (b.t === "pv") {
        const dev = ["mobile", "tablet", "desktop"].includes(b.d) ? b.d : "desktop";
        const lang = U.str(b.l, 5).toLowerCase() || "tr";
        let ref = "doğrudan";
        try { if (b.r) ref = new URL(b.r).hostname.replace(/^www\./, "") || ref; } catch {}
        if (/givanibridal/.test(ref)) ref = "doğrudan";
        cmds.push(["INCR", "gv:pv:" + d], ["EXPIRE", "gv:pv:" + d, TTL]);
        cmds.push(["PFADD", "gv:uv:" + d, vid], ["EXPIRE", "gv:uv:" + d, TTL]);
        cmds.push(["PFADD", "gv:uv:all", vid]);
        hinc("gv:dev:" + d, dev);
        hinc("gv:lang:" + d, lang);
        hinc("gv:ref:" + d, U.str(ref, 60));
        const now = Date.now();
        cmds.push(["ZADD", "gv:live", now, vid], ["ZREMRANGEBYSCORE", "gv:live", 0, now - 5 * 60 * 1000]);
      } else if (b.t === "ev" && EVENTS.has(b.e)) {
        hinc("gv:ev:" + d, b.e);
        if (b.p) hinc("gv:pe:" + d, U.str(b.e, 30) + "|" + U.str(b.p, 40));
        if (b.e === "search" && b.q) hinc("gv:sq:" + d, U.str(b.q, 40).toLocaleLowerCase("tr"));
        const now = Date.now();
        cmds.push(["ZADD", "gv:live", now, vid]);
      } else if (b.t === "ping") {
        cmds.push(["ZADD", "gv:live", Date.now(), vid]);
      }
      if (cmds.length) await db.pipe(cmds);
      return U.send(res, 200, { ok: true });
    }

    // ---------- Randevu ----------
    if (a === "booking") {
      if (b.hp) return U.send(res, 200, { ok: true }); // bot tuzağı
      if (!(await U.rateLimit("gv:rl:b:" + U.ip(req), 8, 3600))) return U.send(res, 429, { ok: false, reason: "rate" });
      const item = {
        id: Date.now().toString(36) + U.uid(3),
        type: b.type === "prova" ? "prova" : "deneme",
        name: U.str(b.name, 80),
        phone: U.str(b.phone, 30),
        date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : "",
        time: /^\d{2}:\d{2}$/.test(b.time) ? b.time : "",
        lang: U.str(b.lang, 5),
        status: "new",
        createdAt: new Date().toISOString()
      };
      if (!item.name || !item.phone || !item.date || !item.time) return U.send(res, 400, { ok: false, reason: "fields" });
      await db.pipe([
        ["HSET", "gv:bookings", item.id, JSON.stringify(item)],
        ["HINCRBY", "gv:ev:" + d, "booking_submit", 1], ["EXPIRE", "gv:ev:" + d, TTL]
      ]);
      return U.send(res, 200, { ok: true });
    }

    // ---------- Bize Ulaşın ----------
    if (a === "contact") {
      if (b.hp) return U.send(res, 200, { ok: true });
      if (!(await U.rateLimit("gv:rl:c:" + U.ip(req), 6, 3600))) return U.send(res, 429, { ok: false, reason: "rate" });
      const item = {
        id: Date.now().toString(36) + U.uid(3),
        name: U.str(b.name, 80),
        phone: U.str(b.phone, 30),
        email: U.str(b.email, 120),
        message: U.text(b.message, 2000),
        lang: U.str(b.lang, 5),
        read: false,
        createdAt: new Date().toISOString()
      };
      if (!item.name || !item.message || (!item.phone && !item.email)) return U.send(res, 400, { ok: false, reason: "fields" });
      await db.pipe([
        ["HSET", "gv:messages", item.id, JSON.stringify(item)],
        ["HINCRBY", "gv:ev:" + d, "contact_submit", 1], ["EXPIRE", "gv:ev:" + d, TTL]
      ]);
      return U.send(res, 200, { ok: true });
    }

    return U.send(res, 404, { ok: false });
  } catch (e) {
    console.error(e);
    return U.send(res, e.code === "DB_NOT_CONFIGURED" ? 503 : 500, { ok: false, reason: e.code === "DB_NOT_CONFIGURED" ? "db" : "error" });
  }
};
