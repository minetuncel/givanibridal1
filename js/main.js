// Givani Bridal — etkileşimler
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Header gölgesi
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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
      btn.classList.add("is-done");
      setTimeout(() => {
        btn.textContent = "Sepete Ekle";
        btn.classList.remove("is-done");
      }, 1600);
    })
  );

  // Filtre
  $$(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      $$("#productGrid .card").forEach((card) =>
        card.classList.toggle("is-hidden", f !== "all" && card.dataset.cat !== f)
      );
    })
  );

  // Randevu formu (şimdilik ön yüz)
  const form = $("#bookingForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.hidden = true;
    $("#bookingOk").hidden = false;
  });

  // Görünme animasyonu
  const items = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }

  $("#year").textContent = new Date().getFullYear();
})();
