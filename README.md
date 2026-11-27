# Givani Bridal

Tasarım gelinlik sitesi ve yönetim paneli. Vercel üzerinde çalışır.

## Yapı

```
index.html            Site
css/style.css         Site stilleri
js/i18n.js            Tüm metinler ve diller (TR, EN, AR, FR, DE, RU)
js/main.js            Site etkileşimleri, ziyaret takibi
js/products.js        Yedek ürün listesi (veritabanı yokken kullanılır)
js/defile.js          Yedek defile listesi (veritabanı yokken kullanılır)
admin/                Yönetim paneli  →  https://givanibridal.com/admin
api/public.js         İçerik, ziyaret takibi, randevu ve iletişim formu
api/admin.js          Yönetim paneli işlemleri (oturum gerektirir)
api/img.js            Panelden yüklenen görseller
api/_lib/             Veritabanı istemcisi ve ortak araçlar
```

## Veritabanı kurulumu (bir kez)

Yönetim paneli, randevular, mesajlar ve istatistikler için ücretsiz **Upstash Redis** gerekir:

1. Vercel → **givanibridal1** projesi → **Storage** sekmesi
2. **Create Database** → **Upstash for Redis** → ücretsiz plan → bölge **Frankfurt**
3. **Connect Project** ile givanibridal1'e bağlayın
4. **Deployments** → son yayın → **Redeploy**

Ortam değişkenleri (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) otomatik eklenir.

## Yönetim paneli

- Adres: `/admin`
- İlk girişte geçici şifrenin değiştirilmesi zorunludur.
- Şifre ve kullanıcı adı daha sonra **Hesap** sayfasından değiştirilebilir.

## Yayına alma

GitHub'daki `main` dalına gönderilen her değişiklik Vercel tarafından otomatik yayınlanır.
Panelden yapılan içerik değişiklikleri (modeller, galeri, yorumlar, ayarlar) yeniden yayın gerektirmez.
