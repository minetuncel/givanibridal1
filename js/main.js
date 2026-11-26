// Givani Bridal — etkileşimler
{
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const PRODUCTS = window.GIVANI_PRODUCTS || [];
  const CATS = window.GIVANI_CATEGORIES || {};
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  // ---------- Yardımcılar ----------
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) =>
    typeof n === "number" ? "₺ " + n.toLocaleString("tr-TR") : "₺ —";
  const norm = (t) =>
    String(t).toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  let favs = store.get("gv_fav", []).filter(byId);
  let cart = store.get("gv_cart", []).filter((i) => byId(i.id));

  const media = (p, cls = "") =>
    p.image
      ? `<div class="shot ${cls}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`
      : `<div class="shot ${cls}"><svg preserveAspectRatio="xMidYMax meet" class="gown"><use href="#${esc(p.gown)}"/></svg></div>`;

  // ---------- Toast ----------
  const toast = $("#toast");
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("is-on"), 1800);
  };

  // ---------- Ürün listesi ----------
  const grid = $("#productGrid");
  let filter = "all";

  const cardHTML = (p) => `
    <article class="card" data-id="${p.id}">
      ${media(p).replace("</div>", `
        <button class="fav${favs.includes(p.id) ? " is-active" : ""}" data-fav="${p.id}" aria-label="Favorilere ekle" aria-pressed="${favs.includes(p.id)}"><svg><use href="#i-heart"/></svg></button>
        <button class="card__add" data-add="${p.id}">Sepete Ekle</button></div>`)}
      <div class="card__info">
        <h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span>
      </div>
      <span class="card__cat">${esc(CATS[p.cat] || "")}</span>
    </article>`;

  const renderGrid = () => {
    const list = PRODUCTS.filter((p) => filter === "all" || p.cat === filter);
    grid.innerHTML = list.map(cardHTML).join("");
    $("#gridEmpty").hidden = list.length > 0;
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.filter === filter));
  };

  $$(".tab").forEach((t) => t.addEventListener("click", () => { filter = t.dataset.filter; renderGrid(); }));
  $$(".cat").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.go; renderGrid(); }));

  // ---------- Favoriler & Sepet ----------
  const toggleFav = (id) => {
    const on = !favs.includes(id);
    favs = on ? [...favs, id] : favs.filter((f) => f !== id);
    store.set("gv_fav", favs);
    say(on ? "Favorilere eklendi" : "Favorilerden çıkarıldı");
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
        <strong>${esc(p.name)}</strong>
        <span>${esc(CATS[p.cat] || "")}</span>
        <span>${money(p.price)}</span>
        ${extra}
      </div>
    </li>`;

  const renderFav = () => {
    $("#favList").innerHTML = favs.length
      ? favs.map((id) => {
          const p = byId(id);
          return rowHTML(p, `<div class="row__actions">
            <button class="link" data-add="${id}">Sepete Ekle</button>
            <button class="link link--muted" data-fav="${id}">Kaldır</button></div>`);
        }).join("")
      : `<li class="empty">Favori listeniz boş.</li>`;
  };

  const renderCart = () => {
    $("#cartList").innerHTML = cart.length
      ? cart.map(({ id, qty }) => {
          const p = byId(id);
          return rowHTML(p, `<div class="row__actions">
            <div class="qty">
              <button data-dec="${id}" aria-label="Azalt">−</button><span>${qty}</span><button data-inc="${id}" aria-label="Artır">+</button>
            </div>
            <button class="link link--muted" data-remove="${id}">Kaldır</button></div>`);
        }).join("")
      : `<li class="empty">Sepetiniz boş.</li>`;

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

  // Tüm tıklamalar tek yerden
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    const d = t.dataset;
    if (d.fav) toggleFav(+d.fav);
    else if (d.add) { addCart(+d.add); say("Sepete eklendi"); }
    else if (d.inc) addCart(+d.inc, 1);
    else if (d.dec) addCart(+d.dec, -1);
    else if (d.remove) removeCart(+d.remove);
    else if (d.open) open(d.open);
    else if ("close" in d) closeAll();
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

  // ---------- Panel / arama açma-kapama ----------
  const backdrop = $("#backdrop");
  const drawer = $("#drawer");
  let lastFocus = null;

  const closeAll = () => {
    $$(".panel").forEach((p) => { p.classList.remove("is-open"); setTimeout(() => (p.hidden = !p.classList.contains("is-open") ? true : p.hidden), 300); });
    $("#search").hidden = true;
    backdrop.hidden = true;
    setDrawer(false);
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  };

  const open = (name) => {
    lastFocus = document.activeElement;
    closeAll();
    document.body.style.overflow = "hidden";
    if (name === "search") {
      const s = $("#search");
      s.hidden = false;
      $("#searchInput").focus();
      runSearch();
      return;
    }
    const panel = $("#panel-" + name);
    if (!panel) return;
    backdrop.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-open"));
    setTimeout(() => panel.querySelector("input, button:not([data-close])")?.focus(), 50);
  };

  backdrop.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
    if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open("search"); }
  });

  // Mobil menü
  const setDrawer = (on) => {
    drawer.classList.toggle("is-open", on);
    drawer.setAttribute("aria-hidden", String(!on));
    if (on) document.body.style.overflow = "hidden";
  };
  $("#menuOpen").addEventListener("click", () => setDrawer(true));
  $("#menuClose").addEventListener("click", () => { setDrawer(false); document.body.style.overflow = ""; });
  $$(".drawer__nav a").forEach((a) => a.addEventListener("click", () => { setDrawer(false); document.body.style.overflow = ""; }));

  // ---------- Arama ----------
  const input = $("#searchInput");
  $("#searchQuick").innerHTML = Object.entries(CATS)
    .map(([k, v]) => `<button class="chip" data-q="${esc(v)}">${esc(v)}</button>`).join("");
  $("#searchQuick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (b) { input.value = b.dataset.q; runSearch(); input.focus(); }
  });

  const runSearch = () => {
    const q = norm(input.value.trim());
    const res = q
      ? PRODUCTS.filter((p) => norm(`${p.name} ${CATS[p.cat] || ""} ${p.cat}`).includes(q))
      : PRODUCTS;
    $("#searchMeta").textContent = q ? (res.length ? `${res.length} sonuç` : "Sonuç bulunamadı") : "Tüm ürünler";
    $("#searchResults").innerHTML = res.map((p) => `
      <button class="result" data-result="${p.id}">
        ${media(p)}
        <span class="result__name">${esc(p.name)}</span>
        <span class="result__meta">${esc(CATS[p.cat] || "")} · ${money(p.price)}</span>
      </button>`).join("");
  };
  input.addEventListener("input", runSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#searchResults .result")?.click();
  });

  // ---------- Hesap ----------
  let mode = "login";
  $$(".seg__btn").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.auth;
    $$(".seg__btn").forEach((x) => x.classList.toggle("is-active", x === b));
    $$('[data-only="register"]').forEach((el) => { el.hidden = mode !== "register"; el.required = mode === "register"; });
    $("#authSubmit").textContent = mode === "login" ? "Giriş Yap" : "Üye Ol";
    $("#authMsg").hidden = true;
  }));
  $("#authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const m = $("#authMsg");
    m.textContent = "Üyelik sistemi yakında aktif olacak.";
    m.hidden = false;
  });

  // ---------- Sipariş ----------
  $("#checkout").addEventListener("click", () => { $("#checkoutMsg").hidden = false; });

  // ---------- Randevu ----------
  const form = $("#bookingForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.hidden = true;
    $("#bookingOk").hidden = false;
  });

  $("#year").textContent = new Date().getFullYear();
  refresh();
}
