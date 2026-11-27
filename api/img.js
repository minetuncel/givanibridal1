// Yönetim panelinden yüklenen görselleri sunar: /api/img?id=...
const db = require("./_lib/redis");
const U = require("./_lib/util");

module.exports = async (req, res) => {
  const { id } = U.query(req);
  if (!id || !/^[\w-]{6,40}$/.test(id)) { res.statusCode = 404; return res.end(); }
  try {
    const v = await db.getJSON("gv:img:" + id, null);
    if (!v || !v.d) { res.statusCode = 404; return res.end(); }
    const buf = Buffer.from(v.d, "base64");
    res.statusCode = 200;
    res.setHeader("Content-Type", /^image\/(jpeg|png|webp)$/.test(v.m) ? v.m : "image/jpeg");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.end(buf);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end();
  }
};
