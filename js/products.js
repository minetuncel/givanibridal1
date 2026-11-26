/*
  Givani Bridal — ürün listesi
  Yeni ürün eklemek veya bilgileri güncellemek için yalnızca bu dosyayı düzenleyin.

  id     : benzersiz numara
  name   : model adı
  cat    : prenses | balik | akesim | sade
  price  : fiyat (sayı, ör. 45000) — boş bırakmak için null
  gown   : görsel (g-ball, g-mermaid, g-aline, g-sheath, g-sleeve, g-off)
  image  : gerçek fotoğraf yolu (ör. "assets/urunler/model-1.jpg") — yoksa null
*/
window.GIVANI_PRODUCTS = [
  { id: 1, name: "Model Adı", cat: "prenses", price: null, gown: "g-ball",    image: null },
  { id: 2, name: "Model Adı", cat: "balik",   price: null, gown: "g-mermaid", image: null },
  { id: 3, name: "Model Adı", cat: "akesim",  price: null, gown: "g-sleeve",  image: null },
  { id: 4, name: "Model Adı", cat: "sade",    price: null, gown: "g-sheath",  image: null },
  { id: 5, name: "Model Adı", cat: "akesim",  price: null, gown: "g-off",     image: null },
  { id: 6, name: "Model Adı", cat: "akesim",  price: null, gown: "g-aline",   image: null },
  { id: 7, name: "Model Adı", cat: "balik",   price: null, gown: "g-mermaid", image: null },
  { id: 8, name: "Model Adı", cat: "prenses", price: null, gown: "g-ball",    image: null }
];

window.GIVANI_CATEGORIES = {
  prenses: "Prenses",
  balik: "Balık",
  akesim: "A Kesim",
  sade: "Sade"
};
