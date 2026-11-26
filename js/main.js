// Givani Bridal — etkileşimler
{
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const PRODUCTS = window.GIVANI_PRODUCTS || [];
  const CATS = window.GIVANI_CATEGORIES || [];
  const I18N = window.GIVANI_I18N;
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

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

  let favs = store.get("gv_fav", []).filter(byId);
  let cart = store.get("gv_cart", []).filter((i) => byId(i.id));

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
    <article class="card" data-id="${p.id}">
      ${media(p, "", `
        <button class="fav${favs.includes(p.id) ? " is-active" : ""}" data-fav="${p.id}" aria-label="${esc(t("action.addFav"))}" aria-pressed="${favs.includes(p.id)}"><svg><use href="#i-heart"/></svg></button>
        <button class="card__add" data-add="${p.id}">${esc(t("action.addToCart"))}</button>`)}
      <div class="card__info">
        <h3>${esc(prodName(p))}</h3><span class="price">${money(p.price)}</span>
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

  // ================= FAVORİ & SEPET =================
  const toggleFav = (id) => {
    const on = !favs.includes(id);
    favs = on ? [...favs, id] : favs.filter((f) => f !== id);
    store.set("gv_fav", favs);
    say(t(on ? "toast.favAdded" : "toast.favRemoved"));
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
            <button class="link" data-add="${id}">${esc(t("action.addToCart"))}</button>
            <button class="link link--muted" data-fav="${id}">${esc(t("action.remove"))}</button></div>`)).join("")
      : `<li class="empty">${esc(t("fav.empty"))}</li>`;
  };

  const renderCart = () => {
    $("#cartList").innerHTML = cart.length
      ? cart.map(({ id, qty }) => rowHTML(byId(id), `<div class="row__actions">
            <div class="qty">
              <button data-dec="${id}" aria-label="${esc(t("action.dec"))}">−</button><span>${qty}</span><button data-inc="${id}" aria-label="${esc(t("action.inc"))}">+</button>
            </div>
            <button class="link link--muted" data-remove="${id}">${esc(t("action.remove"))}</button></div>`)).join("")
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
    const el = e.target.closest("button, a");
    if (!el) return;
    const d = el.dataset;
    if (d.fav) toggleFav(+d.fav);
    else if (d.add) { addCart(+d.add); say(t("toast.cartAdded")); }
    else if (d.inc) addCart(+d.inc, 1);
    else if (d.dec) addCart(+d.dec, -1);
    else if (d.remove) removeCart(+d.remove);
    else if (d.open) openLayer(d.open);
    else if ("close" in d) closeAll();
    else if (d.setlang) setLang(d.setlang);
    else if (d.result) {
      closeAll();
      filter = "all";
      renderGrid();
      const card = $(`.card[data-id="${d.result}"]`);
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
  $$(".drawer__nav a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));

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
  const runSearch = () => {
    const q = norm(input.value.trim());
    const res = q
      ? PRODUCTS.filter((p) => norm(`${prodName(p)} ${p.cat} ${allCatNames(p.cat)}`).includes(q))
      : PRODUCTS;
    $("#searchMeta").textContent = q ? (res.length ? t("search.results", { n: res.length }) : t("search.none")) : t("search.all");
    $("#searchResults").innerHTML = res.map((p) => `
      <button class="result" data-result="${p.id}">
        ${media(p)}
        <span class="result__name">${esc(prodName(p))}</span>
        <span class="result__meta">${esc(catName(p.cat))} · ${money(p.price)}</span>
      </button>`).join("");
  };
  input.addEventListener("input", runSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#searchResults .result")?.click(); });

  // ================= HESAP =================
  let mode = "login";
  const syncAuth = () => {
    $$(".seg__btn").forEach((x) => x.classList.toggle("is-active", x.dataset.auth === mode));
    $$('[data-only="register"]').forEach((el) => { el.hidden = mode !== "register"; el.required = mode === "register"; });
    $("#authSubmit").textContent = t(mode === "login" ? "auth.login" : "auth.register");
  };
  $$(".seg__btn").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.auth; $("#authMsg").hidden = true; syncAuth(); }));
  $("#authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const m = $("#authMsg");
    m.textContent = t("auth.soon");
    m.hidden = false;
  });

  $("#checkout").addEventListener("click", () => { $("#checkoutMsg").hidden = false; });

  // ================= RANDEVU =================
  // Pazar: 12:00–17:00, diğer günler: 10:00–19:00 (dakika cinsinden). Aralık: 30 dk.
  const HOURS = { default: [10 * 60, 19 * 60], sunday: [12 * 60, 17 * 60] };
  const STEP = 30;
  const dateIn = $("#bookDate"), timeIn = $("#bookTime");
  const pad = (n) => String(n).padStart(2, "0");
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  dateIn.min = todayISO();

  const fillTimes = () => {
    const keep = timeIn.value;
    const now = new Date();
    const nowMin = dateIn.value === todayISO() ? now.getHours() * 60 + now.getMinutes() : -1;
    const [y, mo, d] = (dateIn.value || "").split("-").map(Number);
    const isSunday = dateIn.value && new Date(y, mo - 1, d).getDay() === 0;
    const [OPEN, CLOSE] = isSunday ? HOURS.sunday : HOURS.default;
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
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    booked = { type: $('input[name="bookType"]:checked').value, date: dateIn.value, time: timeIn.value };
    renderBooked();
    form.hidden = true;
    $(".types").hidden = true;
    $("#bookingOk").hidden = false;
  });

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
    // Sepetteki satır
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
  const SHOW = window.GIVANI_SHOW || { year: new Date().getFullYear(), images: [] };
  const IMGS = (SHOW.images || []).filter((im) => im && im.src);
  const viewer = $("#viewer"), vImg = $("#viewerImg");
  let vIndex = 0;

  const showTitle = () => t("show.title", { year: SHOW.year });

  const renderShowSection = () => {
    $("#showTitle").textContent = showTitle();
    $("#galleryTitle").textContent = showTitle();
    $("#galleryCount").textContent = IMGS.length ? t("show.photos", { n: IMGS.length }) : "";
    const cover = $("#showCover");
    if (IMGS.length && !cover.querySelector("img")) {
      cover.innerHTML = `<img src="${esc(IMGS[0].src)}" alt="" loading="lazy">`;
      cover.classList.add("has-img");
    }
  };

  const renderGallery = () => {
    const grid = $("#galleryGrid");
    $("#galleryEmpty").hidden = IMGS.length > 0;
    if (!IMGS.length) {
      const g = ["g-ball", "g-mermaid", "g-aline", "g-sheath", "g-off", "g-sleeve"];
      grid.innerHTML = g.map((id) => `<div class="gallery__item is-placeholder"><div class="shot"><svg preserveAspectRatio="xMidYMax meet" class="gown"><use href="#${id}"/></svg></div></div>`).join("");
      return;
    }
    grid.innerHTML = IMGS.map((im, i) => `
      <button class="gallery__item" data-view="${i}">
        <img src="${esc(im.src)}" alt="${esc(im.alt || t("show.alt", { year: SHOW.year, i: i + 1 }))}" loading="lazy">
      </button>`).join("");
  };

  const showImage = () => {
    const im = IMGS[vIndex];
    vImg.src = im.src;
    vImg.alt = im.alt || t("show.alt", { year: SHOW.year, i: vIndex + 1 });
    $("#viewerCount").textContent = `${vIndex + 1} / ${IMGS.length}`;
    // Sonraki görseli önceden yükle
    const next = IMGS[(vIndex + 1) % IMGS.length];
    if (next) { const pre = new Image(); pre.src = next.src; }
  };
  function step(d) { if (IMGS.length) { vIndex = (vIndex + d + IMGS.length) % IMGS.length; showImage(); } }
  const openViewer = (i) => { vIndex = i; viewer.hidden = false; showImage(); $("#viewerClose").focus(); };
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
  viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.id === "viewerStage") closeViewer(); });

  // Telefonda kaydırma ile geçiş
  let sx = null;
  viewer.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  viewer.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) step((dx < 0 ? 1 : -1) * (document.dir === "rtl" ? -1 : 1));
  });
  if (location.hash === "#defile-galeri") setTimeout(() => openLayer("show"), 0);

  // ================= GİRİŞ EKRANI =================
  // Her ziyarette (oturum başına bir kez) gösterilir. Doğrudan bir bölüm bağlantısıyla gelinirse atlanır.
  const intro = $("#intro");
  if (document.documentElement.classList.contains("has-intro")) {
    intro.hidden = false;
  }
  const enterSite = () => {
    try { sessionStorage.setItem("gv_intro", "1"); } catch {}
    intro.classList.add("is-leaving");
    document.documentElement.classList.remove("has-intro");
    setTimeout(() => { intro.hidden = true; }, 900);
  };
  $("#introEnter").addEventListener("click", enterSite);
  intro.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === intro) enterSite(); });

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
    syncAuth();
    fillTimes();
    renderBooked();
    renderSizes();
    renderAddr();
    renderShowSection();
    if (!$("#panel-show").hidden) renderGallery();
    refresh();
  };

  function setLang(code) {
    if (!langOf(code)) return;
    lang = code;
    store.set("gv_lang", code);
    closeLangMenu();
    applyLang();
  }

  $("#year").textContent = new Date().getFullYear();
  applyLang();
}
