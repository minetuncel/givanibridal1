# Givani Bridal

Tasarım gelinlik e-ticaret sitesi — statik ön yüz (HTML / CSS / JS).

```
index.html
css/style.css
js/main.js
assets/favicon.svg
vercel.json
```

## Yayına alma

**Vercel (önerilen):** GitHub deposunu Vercel'e bağlayın → Framework: *Other* → Deploy.
Ardından *Settings → Domains* bölümüne `givanibridal.com` ve `givanibridal.com.tr` ekleyin.

**GitHub Pages:** *Settings → Pages → Branch: main / root*. Özel alan adı için kök dizine
içinde `givanibridal.com` yazan bir `CNAME` dosyası ekleyin.

## Dosyalar

- `js/products.js` — ürün listesi (ad, kategori, fiyat, görsel)
- `js/i18n.js` — tüm site metinleri ve diller. Yeni dil eklemek için dosyanın başındaki açıklamaya bakın.
- `js/main.js` — arama, sepet, favoriler, randevu, dil seçimi
