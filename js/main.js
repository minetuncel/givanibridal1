// Givani Bridal — etkileşimler
{
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // İçerik: önce dosyadaki yedek veriler, sonra yönetim panelinden gelen güncel veriler
  let PRODUCTS = (window.GIVANI_PRODUCTS || []).map((p) => ({ ...p, id: String(p.id) }));
  let SHOW = window.GIVANI_SHOW || { year: new Date().getFullYear(), images: [] };
  let IMGS = (SHOW.images || []).filter((im) => im && im.src);
  let REVIEWS = [];
  let SETTINGS = {
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
  const CATS = window.GIVANI_CATEGORIES || [];
  const I18N = window.GIVANI_I18N;
  const byId = (id) => PRODUCTS.find((p) => p.id === String(id));

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  // ================= ZİYARET TAKİBİ =================
  // Kişisel veri tutulmaz: tarayıcıya rastgele, anonim bir kimlik yazılır.
  let vid = store.get("gv_vid", null);
  if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set("gv_vid", vid); }
  const device = () => (/iPad|Tablet/i.test(navigator.userAgent) || (matchMedia("(pointer:coarse)").matches && innerWidth >= 768) ? "tablet" : matchMedia("(pointer:coarse)").matches ? "mobile" : "desktop");
  const track = (t, extra = {}) => {
    try {
      const data = JSON.stringify({ t, v: vid, ...extra });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/public?a=track", data))) {
        fetch("/api/public?a=track", { method: "POST", body: data, keepalive: true }).catch(() => {});
      }
    } catch {}
  };
  const ev = (e, extra = {}) => track("ev", { e, ...extra });

  // ================= DİL =================
  const LANGS = I18N.languages;
  const langOf = (code) => LANGS.find((l) => l.code === code);
  const detect = () => {
    const saved = store.get("gv_lang", null);
    if (langOf(saved)) return saved;
    const nav = (navigator.languages || [navigator.language || ""]).map((l) => l.slice(0, 2).toLowerCase());
    return nav.find(langOf) || I18N.defaultLang;
  };
  let lang = detect();

  const t = (key, vars = {}) => {
    const str = I18N.strings[lang]?.[key] ?? I18N.strings[I18N.defaultLang][key] ?? key;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  };
  const locale = () => langOf(lang).locale;
  const catName = (k) => t("cat." + k);
  const prodName = (p) => p.name || t("product.unnamed");

  // ---------- Yardımcılar ----------
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (typeof n === "number" ? "₺ " + n.toLocaleString("tr-TR") : "₺ —");
  const norm = (s) =>
    String(s).toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

  let favs = store.get("gv_fav", []).map(String);
  let cart = store.get("gv_cart", []).map((i) => ({ id: String(i.id), qty: i.qty }));
  const cleanSaved = () => { favs = favs.filter(byId); cart = cart.filter((i) => byId(i.id)); };
  cleanSaved();

  const media = (p, cls = "", inner = "") =>
    `<div class="shot ${cls}">${
      p.image
        ? `<img src="${esc(p.image)}" alt="${esc(prodName(p))}" loading="lazy">`
        : `<svg preserveAspectRatio="xMidYMax meet" class="gown"><use href="#${esc(p.gown)}"/></svg>`
    }${inner}</div>`;

  // ---------- Bildirim ----------
  const toast = $("#toast");
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("is-on"), 1800);
  };

  // ================= ÜRÜNLER =================
  const grid = $("#productGrid");
  let filter = "all";

  const cardHTML = (p) => `
    <article class="card" data-id="${esc(p.id)}">
      ${media(p, "", `
        <button class="fav${favs.includes(p.id) ? " is-active" : ""}" data-fav="${esc(p.id)}" aria-label="${esc(t("action.addFav"))}" aria-pressed="${favs.includes(p.id)}"><svg><use href="#i-heart"/></svg></button>
        <button class="card__add" data-add="${esc(p.id)}">${esc(t("action.addToCart"))}</button>`)}
      <div class="card__info">
        <h3>${esc(prodName(p))}</h3>
      </div>
      <span class="card__cat">${esc(catName(p.cat))}</span>
    </article>`;

  const renderGrid = () => {
    const list = PRODUCTS.filter((p) => filter === "all" || p.cat === filter);
    grid.innerHTML = list.map(cardHTML).join("");
    $("#gridEmpty").hidden = list.length > 0;
    $$(".tab").forEach((tb) => tb.classList.toggle("is-active", tb.dataset.filter === filter));
  };
  $$(".tab").forEach((tb) => tb.addEventListener("click", () => { filter = tb.dataset.filter; renderGrid(); }));
  $$(".cat").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.go; renderGrid(); }));
  grid.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    const card = e.target.closest(".card");
    if (card) ev("product_click", { p: card.dataset.id });
  });

  // ================= FAVORİ & SEPET =================
  const toggleFav = (id) => {
    const on = !favs.includes(id);
    favs = on ? [...favs, id] : favs.filter((f) => f !== id);
    store.set("gv_fav", favs);
    say(t(on ? "toast.favAdded" : "toast.favRemoved"));
    if (on) ev("fav_add", { p: id });
    refresh();
  };
  const addCart = (id, n = 1) => {
    const item = cart.find((i) => i.id === id);
    if (item) item.qty += n; else cart.push({ id, qty: n });
    cart = cart.filter((i) => i.qty > 0);
    store.set("gv_cart", cart);
    refresh();
  };
  const removeCart = (id) => {
    cart = cart.filter((i) => i.id !== id);
    store.set("gv_cart", cart);
    refresh();
  };

  const rowHTML = (p, extra) => `
    <li class="row">
      ${media(p, "row__img")}
      <div class="row__info">
        <strong>${esc(prodName(p))}</strong>
        <span>${esc(catName(p.cat))}</span>
        <span>${money(p.price)}</span>
        ${extra}
      </div>
    </li>`;

  const renderFav = () => {
    $("#favList").innerHTML = favs.length
      ? favs.map((id) => rowHTML(byId(id), `<div class="row__actions">
            <button class="link" data-add="${esc(id)}">${esc(t("action.addToCart"))}</button>
            <button class="link link--muted" data-fav="${esc(id)}">${esc(t("action.remove"))}</button></div>`)).join("")
      : `<li class="empty">${esc(t("fav.empty"))}</li>`;
  };

  const renderCart = () => {
    $("#cartList").innerHTML = cart.length
      ? cart.map(({ id, qty }) => rowHTML(byId(id), `<div class="row__actions">
            <div class="qty">
              <button data-dec="${esc(id)}" aria-label="${esc(t("action.dec"))}">−</button><span>${qty}</span><button data-inc="${esc(id)}" aria-label="${esc(t("action.inc"))}">+</button>
            </div>
            <button class="link link--muted" data-remove="${esc(id)}">${esc(t("action.remove"))}</button></div>`)).join("")
      : `<li class="empty">${esc(t("cart.empty"))}</li>`;
    const priced = cart.every(({ id }) => typeof byId(id).price === "number");
    const total = cart.reduce((s, { id, qty }) => s + (byId(id).price || 0) * qty, 0);
    $("#cartTotal").textContent = cart.length && priced ? money(total) : "₺ —";
    $("#cartFoot").hidden = cart.length === 0;
  };

  const refresh = () => {
    const cartN = cart.reduce((s, i) => s + i.qty, 0);
    $$('[data-count="fav"]').forEach((b) => { b.textContent = favs.length; b.classList.toggle("is-visible", favs.length > 0); });
    $$('[data-count="cart"]').forEach((b) => { b.textContent = cartN; b.classList.toggle("is-visible", cartN > 0); });
    renderGrid();
    renderFav();
    renderCart();
    if (!$("#search").hidden) runSearch();
  };

  // ================= TIKLAMALAR =================
  document.addEventListener("click", (e) => {
    const tr = e.target.closest("[data-track]");
    if (tr) ev(tr.dataset.track);
    const el = e.target.closest("button, a");
    if (!el) return;
    const d = el.dataset;
    if (d.fav) toggleFav(d.fav);
    else if (d.add) { addCart(d.add); say(t("toast.cartAdded")); ev("cart_add", { p: d.add }); }
    else if (d.inc) addCart(d.inc, 1);
    else if (d.dec) addCart(d.dec, -1);
    else if (d.remove) removeCart(d.remove);
    else if (d.open) { if (el.tagName === "A") e.preventDefault(); openLayer(d.open); }
    else if ("close" in d) closeAll();
    else if (d.setlang) setLang(d.setlang);
    else if (d.result) {
      closeAll();
      filter = "all";
      renderGrid();
      ev("product_click", { p: d.result });
      const card = $(`.card[data-id="${CSS.escape(d.result)}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.classList.add("is-flash");
      setTimeout(() => card?.classList.remove("is-flash"), 1600);
    }
  });

  // ================= PANELLER & ARAMA =================
  const backdrop = $("#backdrop");
  const drawer = $("#drawer");
  let lastFocus = null;

  const setDrawer = (on) => {
    drawer.classList.toggle("is-open", on);
    drawer.setAttribute("aria-hidden", String(!on));
    document.body.style.overflow = on ? "hidden" : "";
  };

  const closeAll = () => {
    $$(".panel, .modal, .gallery").forEach((p) => {
      p.classList.remove("is-open");
      setTimeout(() => { if (!p.classList.contains("is-open")) p.hidden = true; }, 350);
    });
    $("#search").hidden = true;
    backdrop.hidden = true;
    setDrawer(false);
    closeLangMenu();
    lastFocus?.focus?.({ preventScroll: true });
  };

  const LAYER_EVENTS = { show: "gallery_open", size: "size_guide_open", ship: "shipping_open" };
  const openLayer = (name) => {
    const prev = document.activeElement;
    closeAll();
    lastFocus = prev;
    document.body.style.overflow = "hidden";
    if (name === "search") {
      $("#search").hidden = false;
      $("#searchInput").focus();
      runSearch();
      return;
    }
    const panel = $("#panel-" + name);
    if (!panel) return;
    if (LAYER_EVENTS[name]) ev(LAYER_EVENTS[name]);
    if (name === "show") renderGallery();
    if (!panel.classList.contains("gallery")) backdrop.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-open")));
    setTimeout(() => panel.querySelector("input:not([hidden]), button:not([data-close])")?.focus(), 60);
  };

  backdrop.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
    if (!$("#viewer").hidden) {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") step(document.dir === "rtl" ? 1 : -1);
      else if (e.key === "ArrowRight") step(document.dir === "rtl" ? -1 : 1);
      return;
    }
    if (e.key === "Escape") closeAll();
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openLayer("search"); }
  });

  $("#menuOpen").addEventListener("click", () => setDrawer(true));
  $("#menuClose").addEventListener("click", () => setDrawer(false));
  $$(".drawer__nav a, .drawer__tools a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));

  // ---------- Arama ----------
  const input = $("#searchInput");
  const renderQuick = () => {
    $("#searchQuick").innerHTML = CATS.map((k) => `<button class="chip" data-q="${esc(catName(k))}">${esc(catName(k))}</button>`).join("");
  };
  $("#searchQuick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (b) { input.value = b.dataset.q; runSearch(); input.focus(); }
  });

  // Arama tüm dillerdeki kategori adlarında yapılır (ör. "mermaid" veya "balık")
  const allCatNames = (k) => Object.values(I18N.strings).map((s) => s["cat." + k] || "").join(" ");
  let searchT, lastQ = "";
  const runSearch = () => {
    const raw = input.value.trim();
    const q = norm(raw);
    const res = q
      ? PRODUCTS.filter((p) => norm(`${prodName(p)} ${p.cat} ${allCatNames(p.cat)}`).includes(q))
      : PRODUCTS;
    $("#searchMeta").textContent = q ? (res.length ? t("search.results", { n: res.length }) : t("search.none")) : t("search.all");
    $("#searchResults").innerHTML = res.map((p) => `
      <button class="result" data-result="${esc(p.id)}">
        ${media(p)}
        <span class="result__name">${esc(prodName(p))}</span>
        <span class="result__meta">${esc(catName(p.cat))}</span>
      </button>`).join("");
    clearTimeout(searchT);
    if (raw.length >= 2) searchT = setTimeout(() => { if (raw !== lastQ) { lastQ = raw; ev("search", { q: raw }); } }, 1500);
  };
  input.addEventListener("input", runSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#searchResults .result")?.click(); });

  $("#checkout").addEventListener("click", () => { $("#checkoutMsg").hidden = false; });

  // ================= SUNUCUYA GÖNDERME =================
  const post = async (action, data) => {
    const r = await fetch("/api/public?a=" + action, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.ok;
  };

  // ================= RANDEVU =================
  const dateIn = $("#bookDate"), timeIn = $("#bookTime");
  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  dateIn.min = todayISO();

  const fillTimes = () => {
    const H = SETTINGS.hours;
    const keep = timeIn.value;
    const now = new Date();
    const nowMin = dateIn.value === todayISO() ? now.getHours() * 60 + now.getMinutes() : -1;
    const [y, mo, d] = (dateIn.value || "").split("-").map(Number);
    const isSunday = Boolean(dateIn.value) && new Date(y, mo - 1, d).getDay() === 0;
    if (isSunday && H.sundayClosed) {
      timeIn.innerHTML = `<option value="" disabled selected>${esc(t("book.closedDay"))}</option>`;
      dateIn.setCustomValidity(t("book.closedDay"));
      return;
    }
    dateIn.setCustomValidity("");
    const OPEN = toMin(isSunday ? H.sundayOpen : H.weekdayOpen);
    const CLOSE = toMin(isSunday ? H.sundayClose : H.weekdayClose);
    const STEP = Number(H.step) || 30;
    let html = `<option value="" disabled>${esc(t("form.time"))}</option>`;
    for (let m = OPEN; m <= CLOSE; m += STEP) {
      const tm = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      html += `<option value="${tm}"${m <= nowMin ? " disabled" : ""}>${tm}</option>`;
    }
    timeIn.innerHTML = html;
    const ok = [...timeIn.options].some((o) => o.value === keep && !o.disabled);
    timeIn.value = ok ? keep : "";
  };
  dateIn.addEventListener("change", fillTimes);

  const setType = (v) => { const r = $(`input[name="bookType"][value="${v}"]`); if (r) r.checked = true; };
  $$("[data-book]").forEach((a) => a.addEventListener("click", () => setType(a.dataset.book)));

  const form = $("#bookingForm");
  let booked = null;
  const renderBooked = () => {
    if (!booked) return;
    const [y, mo, d] = booked.date.split("-").map(Number);
    const date = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, mo - 1, d));
    $("#bookingOk").textContent = t("book.ok", { type: t("type." + booked.type), date, time: booked.time });
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const [nameIn, phoneIn] = form.querySelectorAll("input[type=text]:not(.hp), input[type=tel]");
    const data = {
      type: $('input[name="bookType"]:checked').value,
      name: nameIn.value.trim(), phone: phoneIn.value.trim(),
      date: dateIn.value, time: timeIn.value, lang, hp: form.hp.value
    };
    btn.disabled = true; btn.textContent = t("form.sending");
    const ok = await post("booking", data).catch(() => false);
    btn.disabled = false; btn.textContent = t("form.send");
    const msg = $("#bookingOk");
    if (ok) {
      booked = data;
      renderBooked();
      form.hidden = true;
      $(".types").hidden = true;
    } else {
      msg.innerHTML = `${esc(t("form.error"))} <a data-wa data-track="whatsapp_click" href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a>`;
    }
    msg.hidden = false;
  });

  // ================= BİZE ULAŞIN =================
  const cForm = $("#contactForm");
  cForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = cForm.elements, msg = $("#contactMsg");
    const data = { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), lang, hp: f.hp.value };
    if (!data.name || !data.message || (!data.phone && !data.email)) { msg.textContent = t("form.required"); msg.hidden = false; return; }
    const btn = cForm.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = t("form.sending");
    const ok = await post("contact", data).catch(() => false);
    btn.disabled = false; btn.textContent = t("form.send");
    if (ok) { cForm.reset(); msg.textContent = t("contact.ok"); }
    else msg.innerHTML = `${esc(t("form.error"))} <a data-wa data-track="whatsapp_click" href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a>`;
    msg.hidden = false;
  });

  // ================= İLETİŞİM BİLGİLERİ / HARİTA =================
  const waLink = () => "https://wa.me/" + String(SETTINGS.whatsapp || "").replace(/\D/g, "");
  const telLink = (p) => {
    let d = String(p || "").replace(/\D/g, "");
    if (d.startsWith("0")) d = "90" + d.slice(1);
    return "tel:+" + d;
  };
  const mapsUrl = () => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(SETTINGS.mapsQuery);
  const applySettings = () => {
    const S = SETTINGS;
    $$("[data-wa]").forEach((a) => (a.href = waLink()));
    $$('[data-set="phone"]').forEach((a) => { a.href = telLink(S.phone); a.textContent = S.phone; a.hidden = !S.phone; });
    $$('[data-set="email"]').forEach((a) => { a.href = "mailto:" + S.email; a.textContent = S.email; a.hidden = !S.email; });
    $$('[data-set="address"]').forEach((a) => { a.href = mapsUrl(); a.innerHTML = "<span>" + String(S.address || "").split("\n").map(esc).join("<br>") + "</span>"; });
    const ig = "https://www.instagram.com/" + encodeURIComponent(S.instagram || "") + "/";
    $$('[data-set="instagram"]').forEach((a) => { a.href = ig; a.hidden = !S.instagram; });
    const pin = "https://www.pinterest.com/" + encodeURIComponent(S.pinterest || "") + "/";
    $$('[data-set="pinterest"]').forEach((a) => { a.href = pin; a.hidden = !S.pinterest; });
    $$('[data-set="instagramText"]').forEach((a) => { a.href = ig; a.textContent = "@" + S.instagram; a.hidden = !S.instagram; });
    const frame = $("#mapFrame");
    const src = "https://maps.google.com/maps?q=" + encodeURIComponent(S.mapsQuery) + "&z=16&output=embed";
    if (frame.getAttribute("src") !== src) frame.setAttribute("src", src);
    $("#mapDirections").href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(S.mapsQuery);
    const more = $("#reviewsMore");
    more.href = S.googleReviewsUrl || mapsUrl();
  };
  const renderHours = () => {
    const H = SETTINGS.hours;
    $("#hoursView").innerHTML = `
      <span><b>${esc(t("contact.weekdays"))}</b> <span dir="ltr">${esc(H.weekdayOpen)} – ${esc(H.weekdayClose)}</span></span>
      <span><b>${esc(t("contact.sunday"))}</b> ${H.sundayClosed ? esc(t("contact.closed")) : `<span dir="ltr">${esc(H.sundayOpen)} – ${esc(H.sundayClose)}</span>`}</span>`;
  };

  // ================= YORUMLAR =================
  const starSvg = (on) => `<svg viewBox="0 0 24 24" class="${on ? "on" : ""}"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>`;
  const stars = (n) => `<span class="stars" role="img" aria-label="${n}/5">${[1, 2, 3, 4, 5].map((i) => starSvg(i <= Math.round(n))).join("")}</span>`;
  const renderReviews = () => {
    const sec = $("#yorumlar");
    sec.hidden = REVIEWS.length === 0;
    if (!REVIEWS.length) return;
    const avg = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;
    $("#reviewsScore").innerHTML = `<strong dir="ltr">${avg.toLocaleString(locale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong>${stars(avg)}<span>${esc(t("reviews.count", { n: REVIEWS.length }))}</span>`;
    $("#reviewsList").innerHTML = REVIEWS.map((r) => `
      <figure class="review">
        <div class="review__top">
          <span class="review__avatar" aria-hidden="true">${esc((r.name || "?").trim().charAt(0).toLocaleUpperCase("tr"))}</span>
          <figcaption><strong>${esc(r.name)}</strong>${r.date ? `<span>${esc(r.date)}</span>` : ""}</figcaption>
        </div>
        ${stars(r.rating)}
        <blockquote>${esc(r.text)}</blockquote>
      </figure>`).join("");
  };

  // ================= BEDEN REHBERİ =================
  // Kadın beden tablosu (cm). Değerleri değiştirmek için bu listeyi düzenleyin.
  const SIZES = [
    { eu: 34, intl: "XS",  uk: 6,  us: 2,  bust: 80,  waist: 62, hip: 88 },
    { eu: 36, intl: "S",   uk: 8,  us: 4,  bust: 84,  waist: 66, hip: 92 },
    { eu: 38, intl: "M",   uk: 10, us: 6,  bust: 88,  waist: 70, hip: 96 },
    { eu: 40, intl: "L",   uk: 12, us: 8,  bust: 92,  waist: 74, hip: 100 },
    { eu: 42, intl: "XL",  uk: 14, us: 10, bust: 96,  waist: 78, hip: 104 },
    { eu: 44, intl: "XXL", uk: 16, us: 12, bust: 100, waist: 82, hip: 108 },
    { eu: 46, intl: "3XL", uk: 18, us: 14, bust: 106, waist: 88, hip: 114 },
    { eu: 48, intl: "4XL", uk: 20, us: 16, bust: 112, waist: 94, hip: 120 }
  ];
  let unit = "cm";
  const measure = (cm) => unit === "cm" ? cm : (Math.round((cm / 2.54) * 2) / 2).toLocaleString(locale());
  const renderSizes = () => {
    $("#sizeRows").innerHTML = SIZES.map((r) => `<tr>
      <th scope="row">${r.eu}</th><td>${r.intl}</td><td>${r.uk}</td><td>${r.us}</td>
      <td class="num">${measure(r.bust)}</td><td class="num">${measure(r.waist)}</td><td class="num">${measure(r.hip)}</td></tr>`).join("");
    $$(".unit__btn").forEach((b) => { b.classList.toggle("is-active", b.dataset.unit === unit); b.setAttribute("aria-pressed", String(b.dataset.unit === unit)); });
  };
  $$(".unit__btn").forEach((b) => b.addEventListener("click", () => { unit = b.dataset.unit; renderSizes(); }));
  if (location.hash === "#beden-rehberi") setTimeout(() => openLayer("size"), 0);

  // ================= KARGO / TESLİMAT ADRESİ =================
  const shipForm = $("#shipForm");
  const FIELDS = ["name", "phone", "email", "country", "city", "district", "zip", "address"];
  let addr = store.get("gv_addr", null);
  let editingAddr = false;

  const addrLines = (a) => [
    a.name,
    a.address,
    [a.district, a.city, a.zip].filter(Boolean).join(" / "),
    a.country,
    [a.phone, a.email].filter(Boolean).join(" · ")
  ].filter(Boolean);

  const renderAddr = () => {
    const show = addr && !editingAddr;
    $("#addrCard").hidden = !show;
    shipForm.hidden = show;
    if (show) $("#addrView").innerHTML = addrLines(addr).map(esc).join("<br>");
    $("#shipLine").innerHTML = addr
      ? `<span class="ship-line__label">${esc(t("ship.to"))}</span>
         <span class="ship-line__text">${esc(addr.name)} — ${esc([addr.district, addr.city].filter(Boolean).join(", "))}</span>
         <button class="link" data-open="ship">${esc(t("ship.edit"))}</button>`
      : `<button class="link" data-open="ship">+ ${esc(t("ship.add"))}</button>`;
  };

  const fillForm = () => {
    FIELDS.forEach((f) => { if (addr && addr[f] != null) shipForm.elements[f].value = addr[f]; });
  };

  shipForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#shipMsg");
    const bad = [...shipForm.elements].filter((el) => el.required && !el.value.trim());
    shipForm.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    if (bad.length) {
      bad.forEach((el) => el.classList.add("is-invalid"));
      bad[0].focus();
      msg.textContent = t("ship.required");
      msg.hidden = false;
      return;
    }
    addr = Object.fromEntries(FIELDS.map((f) => [f, shipForm.elements[f].value.trim()]));
    store.set("gv_addr", addr);
    editingAddr = false;
    msg.hidden = true;
    renderAddr();
    say(t("ship.saved"));
  });
  shipForm.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));
  $("#addrEdit").addEventListener("click", () => { editingAddr = true; fillForm(); renderAddr(); shipForm.elements.name.focus(); });
  $("#addrDelete").addEventListener("click", () => {
    addr = null; editingAddr = false;
    try { localStorage.removeItem("gv_addr"); } catch {}
    shipForm.reset();
    renderAddr();
  });
  if (location.hash === "#kargo") setTimeout(() => openLayer("ship"), 0);

  // ================= DEFİLE =================
  const viewer = $("#viewer"), vTrack = $("#viewerTrack"), vDots = $("#viewerDots");
  let vIndex = 0;
  const cover = $("#showCover");
  const coverDefault = cover.innerHTML;

  const showTitle = () => t("show.title", { year: SHOW.year });

  const renderShowSection = () => {
    $("#showTitle").textContent = showTitle();
    $("#galleryTitle").textContent = showTitle();
    // Kapakta seçilen defile fotoğrafı silik ve arka plana karışmış şekilde gösterilir
    const cv = SHOW.cover;
    if (cv) {
      const img = cover.querySelector("img");
      if (!img || img.getAttribute("src") !== cv) {
        cover.innerHTML = `<img class="show__bgimg" src="${esc(cv)}" alt="" loading="lazy" decoding="async">`;
      }
      cover.classList.add("has-media");
    } else if (cover.classList.contains("has-media")) {
      cover.innerHTML = coverDefault;
      cover.classList.remove("has-media");
    }
  };

  // Galeri açıldığında arka planda silik defile videosu oynar, kapanınca durur
  const galPanel = $("#panel-show"), galVid = galPanel.querySelector(".gallery__bg video");
  const syncGalleryVideo = () => {
    if (!galVid) return;
    const src = SHOW.video;
    if (!src) { galVid.parentElement.hidden = true; galVid.pause(); return; }
    galVid.parentElement.hidden = false;
    if (galVid.getAttribute("src") !== src) { galVid.src = src; if (SHOW.poster) galVid.poster = SHOW.poster; }
    if (galPanel.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) galVid.pause();
    else galVid.play().catch(() => {});
  };
  new MutationObserver(syncGalleryVideo).observe(galPanel, { attributes: true, attributeFilter: ["hidden"] });

  const renderGallery = () => {
    const g = $("#galleryGrid");
    $("#galleryEmpty").hidden = IMGS.length > 0;
    if (!IMGS.length) {
      const gs = ["g-ball", "g-mermaid", "g-aline", "g-sheath", "g-off", "g-sleeve"];
      g.innerHTML = gs.map((id) => `<div class="gallery__item is-placeholder"><div class="shot"><svg preserveAspectRatio="xMidYMax meet" class="gown"><use href="#${id}"/></svg></div></div>`).join("");
      return;
    }
    g.innerHTML = IMGS.map((im, i) => `
      <button class="gallery__item" data-view="${i}">
        <img src="${esc(im.src)}" alt="${esc(im.alt || t("show.alt", { year: SHOW.year, i: i + 1 }))}" loading="lazy">
      </button>`).join("");
  };

  // Instagram gibi: fotoğraflar parmakla/trackpad ile yana kayar, yerine oturur
  let vKey = "", vObs = null;
  const buildViewer = () => {
    const key = IMGS.map((im) => im.src).join("|");
    if (key === vKey) return;
    vKey = key;
    vTrack.innerHTML = IMGS.map((im, i) => `
      <figure class="viewer__slide" data-i="${i}"><img src="${esc(im.src)}" alt="${esc(im.alt || t("show.alt", { year: SHOW.year, i: i + 1 }))}" loading="lazy" draggable="false"></figure>`).join("");
    vDots.innerHTML = IMGS.map(() => "<span></span>").join("");
    vObs?.disconnect();
    vObs = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { vIndex = +en.target.dataset.i; updateViewerUi(); }
    }), { root: vTrack, threshold: 0.6 });
    vTrack.querySelectorAll(".viewer__slide").forEach((s) => vObs.observe(s));
  };
  const updateViewerUi = () => {
    $("#viewerCount").textContent = `${vIndex + 1} / ${IMGS.length}`;
    vDots.querySelectorAll("span").forEach((d, i) => d.classList.toggle("on", i === vIndex));
    $("#viewerPrev").disabled = vIndex === 0;
    $("#viewerNext").disabled = vIndex === IMGS.length - 1;
  };
  const goTo = (i, smooth = true) => {
    i = Math.max(0, Math.min(IMGS.length - 1, i));
    const s = vTrack.children[i];
    if (s) s.scrollIntoView({ inline: "center", block: "nearest", behavior: smooth ? "smooth" : "instant" });
  };
  function step(d) { if (IMGS.length) goTo(vIndex + d); }
  const openViewer = (i) => {
    buildViewer(); viewer.hidden = false; vIndex = i; updateViewerUi();
    requestAnimationFrame(() => goTo(i, false));
    ev("gallery_photo"); $("#viewerClose").focus();
  };
  function closeViewer() {
    viewer.hidden = true;
    $(`.gallery__item[data-view="${vIndex}"]`)?.focus({ preventScroll: false });
  }

  $("#galleryGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) openViewer(+b.dataset.view);
  });
  $("#viewerPrev").addEventListener("click", () => step(document.dir === "rtl" ? 1 : -1));
  $("#viewerNext").addEventListener("click", () => step(document.dir === "rtl" ? -1 : 1));
  $("#viewerClose").addEventListener("click", closeViewer);
  let dragged = false;
  viewer.addEventListener("click", (e) => { if (!dragged && (e.target === viewer || e.target.classList.contains("viewer__slide"))) closeViewer(); });

  // Sürükleme: yatayda fotoğraflar arasında geçiş (fare), aşağı çekince görünüm kapanır (fare ve dokunmatik)
  let g = null;
  const curImg = () => vTrack.children[vIndex]?.querySelector("img");
  const setPull = (dy, anim) => {
    const im = curImg(); if (!im) return;
    const k = Math.min(Math.max(dy, 0) / 400, 1);
    im.style.transition = anim ? "transform .35s var(--ease)" : "none";
    viewer.style.transition = anim ? "background-color .35s var(--ease)" : "none";
    im.style.transform = dy ? `translateY(${dy}px) scale(${1 - k * 0.15})` : "";
    viewer.style.backgroundColor = dy ? `rgba(14,14,15,${0.9 * (1 - k * 0.85)})` : "";
    $$(".viewer__top, .viewer__nav, .viewer__dots").forEach((el) => { el.style.opacity = dy ? String(1 - k * 1.6) : ""; });
  };
  const resetPull = () => { setPull(0, false); const im = curImg(); if (im) im.style.transition = ""; viewer.style.transition = ""; };
  vTrack.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    g = { x: e.clientX, y: e.clientY, sl: vTrack.scrollLeft, axis: null, id: e.pointerId, mouse: e.pointerType === "mouse" };
    dragged = false;
  });
  vTrack.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      g.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      if (g.axis === "x" && !g.mouse) { g = null; return; } // dokunmatikte yatay kaydırmayı tarayıcı yapar
      dragged = true;
      vTrack.setPointerCapture(e.pointerId);
      if (g.axis === "x") vTrack.classList.add("is-drag");
    }
    if (g.axis === "x") vTrack.scrollLeft = g.sl - dx;
    else setPull(Math.max(0, dy), false);
  });
  const endDrag = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y, axis = g.axis; g = null;
    if (axis === "x") {
      vTrack.classList.remove("is-drag");
      const dir = document.dir === "rtl" ? -1 : 1;
      goTo(Math.abs(dx) > 60 ? vIndex + (dx < 0 ? 1 : -1) * dir : vIndex);
    } else if (axis === "y") {
      if (dy > 110 && e.type !== "pointercancel") {
        setPull(Math.max(dy, 260) + 300, true);
        setTimeout(() => { closeViewer(); resetPull(); }, 260);
      } else {
        setPull(0, true);
        setTimeout(resetPull, 360);
      }
    }
    setTimeout(() => { dragged = false; }, 0);
  };
  vTrack.addEventListener("pointerup", endDrag);
  vTrack.addEventListener("pointercancel", endDrag);
  if (location.hash === "#defile-galeri") setTimeout(() => openLayer("show"), 0);

  // Ana sayfa üst alanındaki arka plan videosu: görünmüyorsa durur, hareket azaltma tercihinde oynamaz
  const heroVid = $(".hero__video");
  if (heroVid) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { heroVid.removeAttribute("autoplay"); heroVid.pause(); }
    else if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { if (en.isIntersecting) heroVid.play().catch(() => {}); else heroVid.pause(); }).observe(heroVid.parentElement);
    }
  }

  // Kaydırırken bölümlerin yumuşakça belirmesi (bilgisayar ve telefon)
  const revealSel = [
    ".section .wrap > *", ".cats > *", "#productGrid > *", ".services > *", ".split", ".show", ".map",
    ".footer__cols > *", ".reviews__list > *"
  ].join(",");
  const revObs = "IntersectionObserver" in window ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  const applyReveal = () => {
    if (!revObs) return;
    $$(revealSel).forEach((el) => {
      if (el.classList.contains("rv") || el.closest(".panel, .modal, .gallery, .viewer, .intro")) return;
      const sibs = el.parentElement ? [...el.parentElement.children] : [];
      const i = Math.max(0, sibs.indexOf(el));
      const grid = el.parentElement && el.parentElement.matches(".cats, #productGrid, .services, .footer__cols, .reviews__list");
      el.style.setProperty("--d", grid ? Math.min(i % 4, 3) * 0.08 + "s" : "0s");
      el.classList.add("rv");
      if (el.matches(".split, .show, .map")) el.classList.add("rv--scale");
      revObs.observe(el);
    });
  };
  applyReveal();
  new MutationObserver(applyReveal).observe($("main") || document.body, { childList: true, subtree: true });

  // Üst menüde, ekranda olan bölümün kutusu koyu görünür
  const navLinks = $$(".nav a[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    const secs = navLinks.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    const navObs = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => navObs.observe(s));
    addEventListener("scroll", () => { if (scrollY < 200) navLinks.forEach((a) => a.classList.remove("is-active")); }, { passive: true });
  }

  // ================= GİRİŞ EKRANI =================
  const intro = $("#intro");
  if (document.documentElement.classList.contains("has-intro")) intro.hidden = false;
  let introTimer;
  const enterSite = () => {
    try { sessionStorage.setItem("gv_intro", "1"); } catch {}
    intro.classList.add("is-leaving");
    document.documentElement.classList.remove("has-intro");
    clearTimeout(introTimer); introTimer = setTimeout(() => { intro.hidden = true; }, 900);
    ev("intro_enter");
  };
  // Giriş ekranında dil seçimi dışında herhangi bir yere tıklamak siteye girer
  intro.addEventListener("click", (e) => { if (!e.target.closest("[data-setlang]") && !intro.classList.contains("is-leaving")) enterSite(); });
  intro.addEventListener("keydown", (e) => { if (e.key === "Escape") enterSite(); });

  // Üstteki Givani Bridal logosu giriş ekranını tekrar açar
  const showIntro = () => {
    closeAll(); clearTimeout(introTimer);
    intro.hidden = false;
    intro.classList.add("is-leaving");
    document.documentElement.classList.add("has-intro");
    void intro.offsetWidth;
    intro.classList.remove("is-leaving");
    window.scrollTo({ top: 0, behavior: "instant" });
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => $("#introEnter").focus({ preventScroll: true }), 50);
    ev("logo_intro");
  };
  $$(".header .logo").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); showIntro(); }));

  // ================= DİL SEÇİCİ =================
  const langBtn = $("#langBtn"), langMenu = $("#langMenu");
  function closeLangMenu() { langMenu.hidden = true; langBtn.setAttribute("aria-expanded", "false"); }
  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = langMenu.hidden;
    langMenu.hidden = !open;
    langBtn.setAttribute("aria-expanded", String(open));
    if (open) langMenu.querySelector('[aria-selected="true"]')?.focus();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#lang")) closeLangMenu(); });

  const renderLangLists = () => {
    langMenu.innerHTML = LANGS.map((l) => `<li><button role="option" data-setlang="${l.code}" lang="${l.code}" aria-selected="${l.code === lang}">
        <span>${esc(l.name)}</span><span class="lang__tag">${l.code.toUpperCase()}</span></button></li>`).join("");
    $("#drawerLangs").innerHTML = LANGS.map((l) =>
      `<button class="chip${l.code === lang ? " is-active" : ""}" data-setlang="${l.code}" lang="${l.code}" aria-pressed="${l.code === lang}">${esc(l.name)}</button>`).join("");
    $("#langCode").textContent = lang.toUpperCase();
    $("#introLangs").innerHTML = LANGS.map((l) =>
      `<button data-setlang="${l.code}" lang="${l.code}" aria-pressed="${l.code === lang}">${esc(l.name)}</button>`).join("");
  };

  const applyLang = () => {
    const L = langOf(lang);
    document.documentElement.lang = L.code;
    document.documentElement.dir = L.dir;
    document.title = t("meta.title");
    $('meta[name="description"]')?.setAttribute("content", t("meta.description"));
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    renderLangLists();
    renderQuick();
    fillTimes();
    renderBooked();
    renderSizes();
    renderAddr();
    renderShowSection();
    renderHours();
    renderReviews();
    applySettings();
    if (!$("#panel-show").hidden) renderGallery();
    refresh();
  };

  function setLang(code) {
    if (!langOf(code)) return;
    const changed = code !== lang;
    lang = code;
    store.set("gv_lang", code);
    closeLangMenu();
    applyLang();
    if (changed) ev("lang_change");
  }

  // Video görünür değilken durdurulur (pil ve veri tasarrufu)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => entries.forEach((en) => {
      const v = en.target.querySelector("video");
      if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
    }), { threshold: 0.15 }).observe(cover);
  }

  // ================= BÖLÜM GÖRÜNTÜLEME =================
  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const k = en.target.dataset.sec;
      if (en.isIntersecting && !seen.has(k)) { seen.add(k); ev(k); io.unobserve(en.target); }
    }), { threshold: 0.35 });
    $$("[data-sec]").forEach((s) => io.observe(s));
  }

  $("#year").textContent = new Date().getFullYear();
  applyLang();

  // ================= GÜNCEL İÇERİK (yönetim panelinden) =================
  fetch("/api/public?a=content")
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => {
      if (!c || !c.ok) return;
      if (c.settings) SETTINGS = { ...SETTINGS, ...c.settings, hours: { ...SETTINGS.hours, ...(c.settings.hours || {}) } };
      if (Array.isArray(c.products)) PRODUCTS = c.products.map((p) => ({ ...p, id: String(p.id) }));
      if (c.show) { SHOW = c.show; IMGS = (SHOW.images || []).filter((im) => im && im.src); }
      if (Array.isArray(c.reviews)) REVIEWS = c.reviews;
      cleanSaved();
      applyLang();
    })
    .catch(() => {});

  // Ziyaret kaydı ve "şu an sitede" sayacı
  track("pv", { d: device(), l: lang, r: document.referrer, p: location.pathname });
  setInterval(() => { if (!document.hidden) track("ping"); }, 120000);
}
