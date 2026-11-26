// Givani Bridal — etkileşimler
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Mobil menü
  const drawer = $("#drawer");
  const setDrawer = (open) => {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  $("#menuOpen").addEventListener("click", () => setDrawer(true));
  $("#menuClose").addEventListener("click", () => setDrawer(false));
  $$(".drawer__nav a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));

  // Favoriler
  $$(".fav").forEach((btn) =>
    btn.addEventListener("click", () => btn.classList.toggle("is-active"))
  );

  // Sepet
  let count = 0;
  const cartCount = $("#cartCount");
  $$(".card__add").forEach((btn) =>
    btn.addEventListener("click", () => {
      count++;
      cartCount.textContent = count;
      cartCount.classList.add("is-visible");
      btn.textContent = "Eklendi";
      setTimeout(() => (btn.textContent = "Sepete Ekle"), 1500);
    })
  );

  // Filtre
  const applyFilter = (f) => {
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.filter === f));
    $$("#productGrid .card").forEach((card) =>
      card.classList.toggle("is-hidden", f !== "all" && card.dataset.cat !== f)
    );
  };
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => applyFilter(tab.dataset.filter)));
  $$(".cat").forEach((cat) => cat.addEventListener("click", () => applyFilter(cat.dataset.go)));

  // Randevu formu (şimdilik ön yüz)
  const form = $("#bookingForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.hidden = true;
    $("#bookingOk").hidden = false;
  });

  $("#year").textContent = new Date().getFullYear();
})();
