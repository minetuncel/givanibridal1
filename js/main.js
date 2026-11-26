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
    $$(".panel").forEach((p) => {
      p.classList.remove("is-open");
      setTimeout(() => { if (!p.classList.contains("is-open")) p.hidden = true; }, 350);
    });
    $("#search").hidden = true;
    backdrop.hidden = true;
    setDrawer(false);
    closeLangMenu();
    lastFocus?.focus?.();
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
    backdrop.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-open")));
    setTimeout(() => panel.querySelector("input:not([hidden]), button:not([data-close])")?.focus(), 60);
  };

  backdrop.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
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
