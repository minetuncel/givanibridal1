// Givani Bridal — Yönetim paneli
{
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");
  const CATS = { prenses: "Prenses", balik: "Balık", akesim: "A Kesim", sade: "Sade" };
  const GOWNS = ["g-ball", "g-mermaid", "g-aline", "g-sheath", "g-sleeve", "g-off"];
  const TYPES = { deneme: "Gelinlik Deneme", prova: "Özel Dikim Prova" };
  const STATUS = { new: "Yeni", confirmed: "Onaylandı", done: "Tamamlandı", cancelled: "İptal" };

  // ---------- API ----------
  async function api(action, data, opts = {}) {
    const url = "/api/admin?a=" + action + (opts.qs || "");
    const res = await fetch(url, {
      method: data ? "POST" : "GET",
      credentials: "same-origin",
      headers: { "X-GV": "1", ...(data ? { "Content-Type": "application/json" } : {}) },
      body: data ? JSON.stringify(data) : undefined
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (res.status === 503 && json.reason === "db") { show("scrDb"); throw new Error("db"); }
    if (res.status === 401 && action !== "login") { show("scrLogin"); throw new Error("auth"); }
    return { status: res.status, ...json };
  }

  // ---------- Ekranlar ----------
  const show = (id) => {
    ["scrDb", "scrLogin", "scrChange", "app"].forEach((s) => ($("#" + s).hidden = s !== id));
  };

  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("on"), 2200);
  };

  // ---------- Giriş ----------
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, err = $("#loginErr");
    err.hidden = true;
    const btn = f.querySelector("button");
    btn.disabled = true;
    try {
      const r = await api("login", { user: f.user.value, pw: f.pw.value });
      if (r.ok) { f.reset(); afterLogin(r); }
      else {
        err.textContent = r.reason === "rate" ? "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin." : "Kullanıcı adı veya şifre hatalı.";
        err.hidden = false;
      }
    } catch {} finally { btn.disabled = false; }
  });

  let me = null;
  function afterLogin(r) {
    me = r;
    if (r.mustChange) {
      show("scrChange");
      $("#scrChange [name=user]").value = r.user;
      return;
    }
    show("app");
    go(location.hash.slice(1) || "dash");
  }

  // Şifre değiştirme formları (ilk giriş + Hesap sayfası)
  $$(".pwForm").forEach((f) => {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = f.querySelector(".err");
      err.hidden = true;
      const say = (m) => { err.textContent = m; err.hidden = false; };
      if (f.pw.value !== f.pw2.value) return say("Yeni şifreler birbiriyle aynı değil.");
      if (f.pw.value.length < 8) return say("Yeni şifre en az 8 karakter olmalı.");
      const r = await api("password", { current: f.current.value, user: f.user.value, pw: f.pw.value });
      if (!r.ok) return say({ current: "Mevcut şifre hatalı.", user: "Kullanıcı adı 3–40 karakter olmalı; harf, rakam, nokta, tire içerebilir.", short: "Yeni şifre en az 8 karakter olmalı." }[r.reason] || "Kaydedilemedi.");
      f.reset();
      f.user.value = r.user;
      toast("Şifre değiştirildi");
      if (!$("#scrChange").hidden) afterLogin({ ok: true, user: r.user, mustChange: false });
    });
  });

  $("#logout").addEventListener("click", logout);
  async function logout() { await api("logout", {}).catch(() => {}); show("scrLogin"); }

  // ---------- Sayfa geçişi ----------
  const loaders = {};
  function go(page) {
    if (!$(`.page[data-page="${page}"]`)) page = "dash";
    $$(".page").forEach((p) => (p.hidden = p.dataset.page !== page));
    $$("#nav button").forEach((b) => b.classList.toggle("is-active", b.dataset.page === page));
    history.replaceState(null, "", "#" + page);
    loaders[page]?.();
    window.scrollTo(0, 0);
  }
  $$("#nav button").forEach((b) => b.addEventListener("click", () => go(b.dataset.page)));

  const setBadges = (book, msg) => {
    const b = $("#bBook"), m = $("#bMsg");
    b.textContent = book; b.hidden = !book;
    m.textContent = msg; m.hidden = !msg;
  };

  // ================= GENEL BAKIŞ =================
  let days = 7, content = null;
  $$("#period button").forEach((b) => b.addEventListener("click", () => {
    days = Number(b.dataset.days);
    $$("#period button").forEach((x) => x.classList.toggle("is-active", x === b));
    loaders.dash();
  }));
  $("#refresh").addEventListener("click", () => loaders.dash());

  const LABELS = {
    whatsapp_click: "WhatsApp", phone_click: "Telefon", instagram_click: "Instagram", pinterest_click: "Pinterest", email_click: "E-posta",
    map_click: "Harita", directions_click: "Yol tarifi",
    fav_add: "Favoriye ekleme", cart_add: "Sepete ekleme", product_click: "Model tıklama", search: "Arama",
    gallery_open: "Defile galerisi açılışı", gallery_photo: "Defile fotoğraf görüntüleme", size_guide_open: "Beden rehberi",
    shipping_open: "Kargo adresi penceresi", lang_change: "Dil değiştirme", intro_enter: "Giriş ekranından siteye giriş",
    booking_submit: "Randevu talebi", contact_submit: "İletişim mesajı", reviews_more: "Google yorumlarına gitme",
    view_collection: "Koleksiyon", view_new_season: "Yeni Sezon", view_atelier: "Kişiye özel dikim", view_show: "Defile",
    view_reviews: "Yorumlar", view_booking: "Randevu", view_contact: "Bize Ulaşın"
  };
  const CLICK = ["whatsapp_click", "phone_click", "instagram_click", "pinterest_click", "email_click", "map_click", "directions_click"];
  const INTER = ["product_click", "fav_add", "cart_add", "search", "gallery_open", "gallery_photo", "size_guide_open", "shipping_open", "booking_submit", "contact_submit", "reviews_more", "lang_change", "intro_enter"];
  const SECT = ["view_collection", "view_new_season", "view_atelier", "view_show", "view_reviews", "view_booking", "view_contact"];
  const DEV = { mobile: "Telefon", tablet: "Tablet", desktop: "Bilgisayar" };
  const LANG = { tr: "Türkçe", en: "English", ar: "العربية", fr: "Français", de: "Deutsch", ru: "Русский" };

  const bars = (pairs) => {
    const list = pairs.filter(([, v]) => v > 0);
    if (!list.length) return `<p class="empty">Bu dönemde veri yok.</p>`;
    const max = Math.max(...list.map(([, v]) => v));
    return `<div class="bars">${list.map(([k, v]) => `
      <div class="bar"><span>${esc(k)}</span><b>${fmt(v)}</b><div class="bar__track"><div class="bar__fill" style="width:${(v / max) * 100}%"></div></div></div>`).join("")}</div>`;
  };

  function drawChart(series) {
    const box = $("#chart");
    const W = box.clientWidth || 600, H = box.clientHeight || 260;
    const pad = { l: 36, r: 10, t: 14, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const max = Math.max(4, ...series.map((s) => Math.max(s.pv, s.uv)));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step;
    const n = series.length;
    const bw = iw / n;
    const y = (v) => pad.t + ih - (v / top) * ih;
    const ticks = [0, top / 2, top];
    const fmtDate = (d) => { const [, m, dd] = d.split("-"); return `${Number(dd)}.${m}`; };
    const every = Math.ceil(n / Math.max(2, Math.floor(iw / 52)));
    let svg = `<svg viewBox="0 0 ${W} ${H}">`;
    ticks.forEach((t) => { svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#ececec"/><text x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(Math.round(t))}</text>`; });
    series.forEach((s, i) => {
      const x = pad.l + i * bw;
      const w = Math.max(2, bw * 0.62);
      svg += `<rect x="${x + (bw - w) / 2}" y="${y(s.uv)}" width="${w}" height="${pad.t + ih - y(s.uv)}" rx="2" fill="#2d2f31"/>`;
      if (i % every === 0 || i === n - 1) svg += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${fmtDate(s.date)}</text>`;
      svg += `<rect class="hit" data-i="${i}" x="${x}" y="${pad.t}" width="${bw}" height="${ih}" fill="transparent"/>`;
    });
    const pts = series.map((s, i) => `${pad.l + i * bw + bw / 2},${y(s.pv)}`).join(" ");
    svg += `<polyline points="${pts}" fill="none" stroke="#bdbdbd" stroke-width="2.5" stroke-linejoin="round"/>`;
    series.forEach((s, i) => { svg += `<circle cx="${pad.l + i * bw + bw / 2}" cy="${y(s.pv)}" r="${n > 40 ? 0 : 3}" fill="#fff" stroke="#9e9e9e" stroke-width="2"/>`; });
    svg += `</svg><div class="tip" hidden></div>`;
    box.innerHTML = svg;
    const tip = box.querySelector(".tip");
    box.querySelectorAll(".hit").forEach((r) => {
      r.addEventListener("mouseenter", () => {
        const s = series[r.dataset.i];
        tip.innerHTML = `${esc(new Date(s.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" }))}<br>${fmt(s.uv)} ziyaretçi · ${fmt(s.pv)} görüntüleme`;
        tip.style.left = ((+r.getAttribute("x") + bw / 2) / W) * 100 + "%";
        tip.style.top = (y(Math.max(s.pv, s.uv)) / H) * 100 + "%";
        tip.hidden = false;
      });
      r.addEventListener("mouseleave", () => (tip.hidden = true));
    });
  }

  let lastStats = null;
  loaders.dash = async () => {
    const [r, c] = await Promise.all([api("stats", null, { qs: "&days=" + days }), content ? Promise.resolve(null) : api("content")]);
    if (c && c.ok) content = c;
    if (!r.ok) return;
    lastStats = r;
    setBadges(r.newBookings, r.unread);
    const label = days === 1 ? "bugün" : `son ${days} gün`;
    $("#kpis").innerHTML = `
      <div class="kpi kpi--dark"><span><i class="live-dot"></i>Şu an sitede</span><strong>${fmt(r.live)}</strong><em>son 5 dakika</em></div>
      <div class="kpi"><span>Bugün ziyaretçi</span><strong>${fmt(r.today.uv)}</strong><em>${fmt(r.today.pv)} görüntüleme</em></div>
      <div class="kpi"><span>Ziyaretçi</span><strong>${fmt(r.totals.uv)}</strong><em>${label}</em></div>
      <div class="kpi"><span>Sayfa görüntüleme</span><strong>${fmt(r.totals.pv)}</strong><em>${label}</em></div>
      <div class="kpi"><span>WhatsApp tıklaması</span><strong>${fmt(r.events.whatsapp_click)}</strong><em>${label}</em></div>
      <div class="kpi"><span>Yeni randevu</span><strong>${fmt(r.newBookings)}</strong><em>yanıt bekliyor</em></div>
      <div class="kpi"><span>Okunmamış mesaj</span><strong>${fmt(r.unread)}</strong><em>toplam ${fmt(r.totals.uvAll)} tekil ziyaretçi</em></div>`;
    drawChart(r.series);
    $("#clicks").innerHTML = bars(CLICK.map((k) => [LABELS[k], r.events[k] || 0]));
    $("#interactions").innerHTML = bars(INTER.map((k) => [LABELS[k], r.events[k] || 0]));
    $("#sections").innerHTML = bars(SECT.map((k) => [LABELS[k], r.events[k] || 0]));
    $("#refs").innerHTML = bars(Object.entries(r.refs).sort((a, b) => b[1] - a[1]).slice(0, 10));
    $("#devices").innerHTML = bars(Object.entries(r.devices).map(([k, v]) => [DEV[k] || k, v]).sort((a, b) => b[1] - a[1]));
    $("#langs").innerHTML = bars(Object.entries(r.langs).map(([k, v]) => [LANG[k] || k, v]).sort((a, b) => b[1] - a[1]));
    // Popüler modeller
    const prods = (content?.products || []);
    const rows = Object.entries(r.products).map(([id, ev]) => {
      const p = prods.find((x) => x.id === id);
      return { id, p, click: ev.product_click || 0, fav: ev.fav_add || 0, cart: ev.cart_add || 0 };
    }).map((x) => ({ ...x, total: x.click + x.fav + x.cart })).sort((a, b) => b.total - a.total).slice(0, 10);
    $("#topProducts").innerHTML = rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Model</th><th>Kategori</th><th class="num">Tıklama</th><th class="num">Favori</th><th class="num">Sepet</th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td>${esc(x.p ? (x.p.name || "İsimsiz model") : "Silinmiş model")}</td><td>${esc(x.p ? CATS[x.p.cat] : "")}</td><td class="num">${fmt(x.click)}</td><td class="num">${fmt(x.fav)}</td><td class="num">${fmt(x.cart)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">Bu dönemde veri yok.</p>`;
    $("#searches").innerHTML = bars(r.searches);
  };
  window.addEventListener("resize", () => { if (lastStats && !$('.page[data-page="dash"]').hidden) drawChart(lastStats.series); });
  setInterval(() => { if (!$("#app").hidden && !$('.page[data-page="dash"]').hidden && !document.hidden) loaders.dash().catch(() => {}); }, 60000);

  // ================= RANDEVULAR =================
  let bookings = [], bFilter = "all", bSort = "created";
  const waNum = (p) => {
    let d = String(p || "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0")) d = "90" + d.slice(1);
    else if (d.length === 10 && d.startsWith("5")) d = "90" + d;
    return d;
  };
  const dLong = (iso, t) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }) + (t ? " · " + t : "");
  };
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " dk önce";
    if (s < 86400) return Math.round(s / 3600) + " saat önce";
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  $$("#bFilter button").forEach((b) => b.addEventListener("click", () => { bFilter = b.dataset.f; $$("#bFilter button").forEach((x) => x.classList.toggle("is-active", x === b)); renderBookings(); }));
  $$("#bSort button").forEach((b) => b.addEventListener("click", () => { bSort = b.dataset.s; $$("#bSort button").forEach((x) => x.classList.toggle("is-active", x === b)); renderBookings(); }));

  function renderBookings() {
    let list = bookings.filter((b) => bFilter === "all" || b.status === bFilter);
    if (bSort === "date") list = [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const today = new Date().toISOString().slice(0, 10);
    $("#bookingList").innerHTML = list.length ? list.map((b) => {
      const msg = encodeURIComponent(`Merhaba ${b.name}, ${dLong(b.date, b.time)} tarihli ${TYPES[b.type]} randevunuz onaylanmıştır. Givani Bridal`);
      return `<div class="item${b.status === "new" ? " is-new" : ""}">
        <div class="item__main">
          <div class="item__title">${esc(b.name)} <span class="tag${b.type === "prova" ? " tag--dark" : ""}">${TYPES[b.type]}</span>${b.date === today ? '<span class="tag">Bugün</span>' : ""}</div>
          <div class="when">${esc(dLong(b.date, b.time))}</div>
          <div class="item__meta"><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a><span>Talep: ${esc(ago(b.createdAt))}</span>${b.lang && b.lang !== "tr" ? `<span>Dil: ${esc(LANG[b.lang] || b.lang)}</span>` : ""}</div>
        </div>
        <div class="item__actions">
          <select data-status="${esc(b.id)}" aria-label="Durum">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === b.status ? " selected" : ""}>${v}</option>`).join("")}</select>
          <a class="icon-btn wa" href="https://wa.me/${waNum(b.phone)}?text=${msg}" target="_blank" rel="noopener" title="WhatsApp ile yaz" aria-label="WhatsApp ile yaz"><svg><use href="#i-whatsapp"/></svg></a>
          <a class="icon-btn" href="tel:${esc(b.phone)}" title="Ara" aria-label="Ara"><svg><use href="#a-phone"/></svg></a>
          <button class="icon-btn" data-del-booking="${esc(b.id)}" title="Sil" aria-label="Sil"><svg><use href="#a-trash"/></svg></button>
        </div>
      </div>`;
    }).join("") : `<p class="empty">Bu filtrede randevu yok.</p>`;
  }
  loaders.bookings = async () => {
    const r = await api("bookings");
    if (!r.ok) return;
    bookings = r.items;
    renderBookings();
    setBadges(bookings.filter((b) => b.status === "new").length, Number($("#bMsg").textContent) || 0);
  };
  $("#bookingList").addEventListener("change", async (e) => {
    const id = e.target.dataset.status;
    if (!id) return;
    const r = await api("booking", { id, status: e.target.value });
    if (r.ok) { Object.assign(bookings.find((b) => b.id === id), r.item); renderBookings(); toast("Durum güncellendi"); setBadges(bookings.filter((b) => b.status === "new").length, Number($("#bMsg").textContent) || 0); }
  });
  $("#bookingList").addEventListener("click", async (e) => {
    const id = e.target.closest("[data-del-booking]")?.dataset.delBooking;
    if (!id || !confirm("Bu randevu silinsin mi?")) return;
    const r = await api("booking", { id, delete: true });
    if (r.ok) { bookings = bookings.filter((b) => b.id !== id); renderBookings(); toast("Randevu silindi"); }
  });

  // ================= MESAJLAR =================
  let messages = [];
  function renderMessages() {
    $("#messageList").innerHTML = messages.length ? messages.map((m) => `
      <div class="item${m.read ? "" : " is-new"}">
        <div class="item__main">
          <div class="item__title">${esc(m.name)} ${m.read ? "" : '<span class="tag tag--dark">Yeni</span>'}</div>
          <div class="item__meta">${m.phone ? `<a href="tel:${esc(m.phone)}">${esc(m.phone)}</a>` : ""}${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}<span>${esc(ago(m.createdAt))}</span>${m.lang && m.lang !== "tr" ? `<span>Dil: ${esc(LANG[m.lang] || m.lang)}</span>` : ""}</div>
          <div class="item__text">${esc(m.message)}</div>
        </div>
        <div class="item__actions">
          ${m.phone ? `<a class="icon-btn" href="https://wa.me/${waNum(m.phone)}?text=${encodeURIComponent("Merhaba " + m.name + ", Givani Bridal'a ulaştığınız için teşekkür ederiz.")}" target="_blank" rel="noopener" title="WhatsApp ile yanıtla" aria-label="WhatsApp ile yanıtla"><svg><use href="#i-whatsapp"/></svg></a>` : ""}
          ${m.email ? `<a class="icon-btn" href="mailto:${esc(m.email)}" title="E-posta ile yanıtla" aria-label="E-posta ile yanıtla"><svg><use href="#a-mail"/></svg></a>` : ""}
          <button class="icon-btn" data-read="${esc(m.id)}" title="${m.read ? "Okunmadı yap" : "Okundu yap"}" aria-label="${m.read ? "Okunmadı yap" : "Okundu yap"}"><svg><use href="#${m.read ? "a-eyeoff" : "a-eye"}"/></svg></button>
          <button class="icon-btn" data-del-msg="${esc(m.id)}" title="Sil" aria-label="Sil"><svg><use href="#a-trash"/></svg></button>
        </div>
      </div>`).join("") : `<p class="empty">Henüz mesaj yok.</p>`;
    setBadges(Number($("#bBook").textContent) || 0, messages.filter((m) => !m.read).length);
  }
  loaders.messages = async () => { const r = await api("messages"); if (r.ok) { messages = r.items; renderMessages(); } };
  $("#messageList").addEventListener("click", async (e) => {
    const rd = e.target.closest("[data-read]")?.dataset.read;
    const del = e.target.closest("[data-del-msg]")?.dataset.delMsg;
    if (rd) {
      const m = messages.find((x) => x.id === rd);
      const r = await api("message", { id: rd, read: !m.read });
      if (r.ok) { m.read = r.item.read; renderMessages(); }
    } else if (del && confirm("Bu mesaj silinsin mi?")) {
      const r = await api("message", { id: del, delete: true });
      if (r.ok) { messages = messages.filter((x) => x.id !== del); renderMessages(); toast("Mesaj silindi"); }
    }
  });

  // ================= İÇERİK KAYDETME =================
  async function loadContent() {
    const r = await api("content");
    if (r.ok) content = r;
    return content;
  }
  async function save(part) {
    const r = await api("save", part);
    if (r.ok) { content = r; toast("Kaydedildi"); }
    else toast("Kaydedilemedi");
    return r.ok;
  }

  // Görsel küçültüp yükleme
  function resize(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", 0.84));
      };
      img.onerror = () => reject(new Error("img"));
      img.src = URL.createObjectURL(file);
    });
  }
  async function upload(file, max) {
    const data = await resize(file, max);
    const r = await api("upload", { data });
    if (!r.ok) throw new Error(r.reason || "upload");
    return r.url;
  }
  const delImg = (url) => url && api("img_delete", { url }).catch(() => {});

  // ================= MODELLER =================
  const gownSvg = (g) => `<svg preserveAspectRatio="xMidYMax meet"><use href="#${esc(g)}"/></svg>`;
  function renderProducts() {
    const list = content.products;
    $("#productList").innerHTML = list.length ? list.map((p, i) => `
      <div class="pcard${p.visible === false ? " is-hidden" : ""}">
        <div class="pcard__img">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : gownSvg(p.gown)}</div>
        <div class="pcard__body"><strong>${esc(p.name || "İsimsiz model")}</strong><span>${CATS[p.cat]} · ${p.price != null ? "₺ " + fmt(p.price) : "Fiyat yok"}${p.visible === false ? " · Gizli" : ""}</span></div>
        <div class="pcard__actions">
          <button class="icon-btn" data-p-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Öne al" title="Öne al"><svg><use href="#a-left"/></svg></button>
          <button class="icon-btn" data-p-down="${i}" ${i === list.length - 1 ? "disabled" : ""} aria-label="Geri al" title="Geri al"><svg><use href="#a-right"/></svg></button>
          <button class="icon-btn" data-p-vis="${i}" aria-label="${p.visible === false ? "Göster" : "Gizle"}" title="${p.visible === false ? "Sitede göster" : "Sitede gizle"}"><svg><use href="#${p.visible === false ? "a-eyeoff" : "a-eye"}"/></svg></button>
          <button class="icon-btn" data-p-edit="${i}" aria-label="Düzenle" title="Düzenle"><svg><use href="#a-edit"/></svg></button>
          <button class="icon-btn" data-p-del="${i}" aria-label="Sil" title="Sil"><svg><use href="#a-trash"/></svg></button>
        </div>
      </div>`).join("") : `<p class="empty">Henüz model yok. "Yeni Model" ile ekleyin.</p>`;
  }
  loaders.products = async () => { await loadContent(); renderProducts(); };

  const pDlg = $("#productDlg"), pForm = $("#productForm");
  let pEdit = null, pIndex = -1, pOldImage = null;
  const pPreview = () => { $("#pimgBox").innerHTML = pEdit.image ? `<img src="${esc(pEdit.image)}" alt="">` : gownSvg(pEdit.gown); $("#pimgRemove").hidden = !pEdit.image; };
  const pGowns = () => { $("#gownPick").innerHTML = GOWNS.map((g) => `<button type="button" data-g="${g}" class="${g === pEdit.gown ? "on" : ""}" aria-label="${g}">${gownSvg(g)}</button>`).join(""); };
  function openProduct(i) {
    pIndex = i;
    pEdit = i >= 0 ? { ...content.products[i] } : { id: "p" + Date.now().toString(36), name: "", cat: "prenses", price: null, gown: "g-ball", image: null, visible: true };
    pOldImage = pEdit.image;
    $("#productDlgTitle").textContent = i >= 0 ? "Modeli düzenle" : "Yeni model";
    pForm.name.value = pEdit.name || "";
    pForm.cat.value = pEdit.cat;
    pForm.price.value = pEdit.price ?? "";
    pForm.visible.checked = pEdit.visible !== false;
    pPreview(); pGowns();
    pDlg.showModal();
  }
  $("#gownPick").addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) { pEdit.gown = b.dataset.g; pGowns(); pPreview(); } });
  $("#pimgInput").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const save = $("#productSave"); save.disabled = true; $("#pimgBox").style.opacity = .5;
    try { pEdit.image = await upload(f, 1400); pPreview(); }
    catch { toast("Fotoğraf yüklenemedi"); }
    finally { save.disabled = false; $("#pimgBox").style.opacity = 1; }
  });
  $("#pimgRemove").addEventListener("click", () => { pEdit.image = null; pPreview(); });
  $("#addProduct").addEventListener("click", () => openProduct(-1));
  pDlg.addEventListener("close", async () => {
    if (pDlg.returnValue !== "save") { if (pEdit && pEdit.image && pEdit.image !== pOldImage) delImg(pEdit.image); return; }
    Object.assign(pEdit, { name: pForm.name.value.trim(), cat: pForm.cat.value, price: pForm.price.value === "" ? null : Number(pForm.price.value), visible: pForm.visible.checked });
    const list = [...content.products];
    if (pIndex >= 0) list[pIndex] = pEdit; else list.unshift(pEdit);
    if (await save({ products: list })) { if (pOldImage && pOldImage !== pEdit.image) delImg(pOldImage); renderProducts(); }
  });
  $("#productList").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const list = [...content.products];
    const d = b.dataset;
    if (d.pEdit) return openProduct(+d.pEdit);
    if (d.pUp) { const i = +d.pUp; [list[i - 1], list[i]] = [list[i], list[i - 1]]; }
    else if (d.pDown) { const i = +d.pDown; [list[i + 1], list[i]] = [list[i], list[i + 1]]; }
    else if (d.pVis) { const i = +d.pVis; list[i] = { ...list[i], visible: list[i].visible === false }; }
    else if (d.pDel) { const i = +d.pDel; if (!confirm("Bu model silinsin mi?")) return; const [rm] = list.splice(i, 1); if (await save({ products: list })) { delImg(rm.image); renderProducts(); } return; }
    else return;
    if (await save({ products: list })) renderProducts();
  });

  // ================= DEFİLE =================
  function renderShow() {
    const imgs = content.show.images;
    $("#showYear").value = content.show.year;
    $("#showList").innerHTML = imgs.length ? imgs.map((im, i) => `
      <div class="thumb">
        <img src="${esc(im.src)}" alt="" loading="lazy">
        <div class="thumb__bar">
          <span>${i === 0 ? "Kapak" : i + 1}</span>
          <div>
            <button class="icon-btn" data-s-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Öne al"><svg><use href="#a-left"/></svg></button>
            <button class="icon-btn" data-s-down="${i}" ${i === imgs.length - 1 ? "disabled" : ""} aria-label="Geri al"><svg><use href="#a-right"/></svg></button>
            <button class="icon-btn" data-s-del="${i}" aria-label="Sil"><svg><use href="#a-trash"/></svg></button>
          </div>
        </div>
      </div>`).join("") : `<p class="empty">Henüz fotoğraf yok. "Fotoğraf Yükle" ile ekleyin; birden fazla fotoğrafı aynı anda seçebilirsiniz.</p>`;
  }
  loaders.show = async () => { await loadContent(); renderShow(); };
  $("#showYear").addEventListener("change", async (e) => { await save({ show: { ...content.show, year: Number(e.target.value) } }); renderShow(); });
  $("#showUpload").addEventListener("change", async (e) => {
    const files = [...e.target.files]; e.target.value = "";
    if (!files.length) return;
    const bar = $("#showProgress"), fill = bar.querySelector("span"), label = bar.querySelector("em");
    bar.hidden = false;
    const added = [];
    for (let i = 0; i < files.length; i++) {
      label.textContent = `Yükleniyor ${i + 1} / ${files.length}`;
      fill.style.width = (i / files.length) * 100 + "%";
      try { added.push({ src: await upload(files[i], 1800), alt: "" }); } catch { toast(files[i].name + " yüklenemedi"); }
    }
    fill.style.width = "100%";
    await save({ show: { ...content.show, images: [...content.show.images, ...added] } });
    bar.hidden = true;
    renderShow();
  });
  $("#showList").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const imgs = [...content.show.images], d = b.dataset;
    if (d.sUp) { const i = +d.sUp; [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]]; }
    else if (d.sDown) { const i = +d.sDown; [imgs[i + 1], imgs[i]] = [imgs[i], imgs[i + 1]]; }
    else if (d.sDel) { if (!confirm("Bu fotoğraf silinsin mi?")) return; const [rm] = imgs.splice(+d.sDel, 1); if (await save({ show: { ...content.show, images: imgs } })) { delImg(rm.src); renderShow(); } return; }
    else return;
    if (await save({ show: { ...content.show, images: imgs } })) renderShow();
  });

  // ================= YORUMLAR =================
  const starStr = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  function renderReviews() {
    const list = content.reviews;
    $("#reviewList").innerHTML = list.length ? list.map((r, i) => `
      <div class="item">
        <div class="item__main">
          <div class="item__title">${esc(r.name)} <span class="stars" aria-label="${r.rating} yıldız">${starStr(r.rating)}</span></div>
          ${r.date ? `<div class="item__meta"><span>${esc(r.date)}</span></div>` : ""}
          <div class="item__text">${esc(r.text)}</div>
        </div>
        <div class="item__actions">
          <button class="icon-btn" data-r-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Yukarı"><svg><use href="#a-up"/></svg></button>
          <button class="icon-btn" data-r-down="${i}" ${i === list.length - 1 ? "disabled" : ""} aria-label="Aşağı"><svg><use href="#a-down"/></svg></button>
          <button class="icon-btn" data-r-edit="${i}" aria-label="Düzenle"><svg><use href="#a-edit"/></svg></button>
          <button class="icon-btn" data-r-del="${i}" aria-label="Sil"><svg><use href="#a-trash"/></svg></button>
        </div>
      </div>`).join("") : `<p class="empty">Henüz yorum eklenmedi.</p>`;
  }
  loaders.reviews = async () => { await loadContent(); renderReviews(); };
  const rDlg = $("#reviewDlg"), rForm = $("#reviewForm");
  let rIndex = -1, rRating = 5;
  const stars = () => { $("#starPick").innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= rRating ? "on" : ""}" aria-label="${n} yıldız"><svg><use href="#a-star"/></svg></button>`).join(""); };
  $("#starPick").addEventListener("click", (e) => { const b = e.target.closest("[data-star]"); if (b) { rRating = +b.dataset.star; stars(); } });
  function openReview(i) {
    rIndex = i;
    const r = i >= 0 ? content.reviews[i] : { name: "", date: "", text: "", rating: 5 };
    rForm.name.value = r.name; rForm.date.value = r.date; rForm.text.value = r.text; rRating = r.rating; stars();
    rDlg.showModal();
  }
  $("#addReview").addEventListener("click", () => openReview(-1));
  rDlg.addEventListener("close", async () => {
    if (rDlg.returnValue !== "save") return;
    const list = [...content.reviews];
    const item = { id: rIndex >= 0 ? list[rIndex].id : "r" + Date.now().toString(36), name: rForm.name.value.trim(), date: rForm.date.value.trim(), text: rForm.text.value.trim(), rating: rRating };
    if (!item.name || !item.text) return toast("Ad ve yorum gerekli");
    if (rIndex >= 0) list[rIndex] = item; else list.unshift(item);
    if (await save({ reviews: list })) renderReviews();
  });
  $("#reviewList").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const list = [...content.reviews], d = b.dataset;
    if (d.rEdit) return openReview(+d.rEdit);
    if (d.rUp) { const i = +d.rUp; [list[i - 1], list[i]] = [list[i], list[i - 1]]; }
    else if (d.rDown) { const i = +d.rDown; [list[i + 1], list[i]] = [list[i], list[i + 1]]; }
    else if (d.rDel) { if (!confirm("Bu yorum silinsin mi?")) return; list.splice(+d.rDel, 1); }
    else return;
    if (await save({ reviews: list })) renderReviews();
  });

  // ================= AYARLAR =================
  const sForm = $("#settingsForm");
  loaders.settings = async () => {
    await loadContent();
    const s = content.settings;
    ["whatsapp", "phone", "email", "instagram", "pinterest", "address", "mapsQuery", "googleReviewsUrl"].forEach((k) => (sForm[k].value = s[k] || ""));
    ["weekdayOpen", "weekdayClose", "sundayOpen", "sundayClose"].forEach((k) => (sForm[k].value = s.hours[k]));
    sForm.sundayClosed.checked = s.hours.sundayClosed;
    sForm.step.value = String(s.hours.step);
  };
  sForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (k) => sForm[k].value.trim();
    const wa = v("whatsapp").replace(/\D/g, "");
    if (wa.length < 10) return toast("WhatsApp numarasını ülke koduyla yazın (ör. 905309518934)");
    if (v("weekdayOpen") >= v("weekdayClose") || v("sundayOpen") >= v("sundayClose")) return toast("Kapanış saati açılıştan sonra olmalı");
    await save({ settings: {
      whatsapp: wa, phone: v("phone"), email: v("email"), instagram: v("instagram"), pinterest: v("pinterest"), address: sForm.address.value,
      mapsQuery: v("mapsQuery"), googleReviewsUrl: v("googleReviewsUrl"),
      hours: { weekdayOpen: v("weekdayOpen"), weekdayClose: v("weekdayClose"), sundayOpen: v("sundayOpen"), sundayClose: v("sundayClose"), sundayClosed: sForm.sundayClosed.checked, step: Number(sForm.step.value) }
    } });
    loaders.settings();
  });

  loaders.account = () => { $(".page[data-page=account] [name=user]").value = me?.user || ""; };
  $("#logout2")?.addEventListener("click", logout);

  // ---------- Başlangıç ----------
  (async () => {
    try {
      const r = await api("me");
      if (r.ok) afterLogin(r);
      else show("scrLogin");
    } catch (e) { if (e.message !== "db" && e.message !== "auth") show("scrLogin"); }
  })();
}
