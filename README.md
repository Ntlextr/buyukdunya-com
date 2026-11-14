# buyukdunya.com

BÜYÜKDÜNYA (Şahlı Harası) damızlık yarış aygırı tanıtım sitesi.

- `index.html` — site sayfası (içerik panelden gelir)
- `worker.js` — Cloudflare Worker: siteyi sunar, `/panel` yönetim paneli ve API
- `aygirlar/images/`, `pedigree2.jpg` — sitede kullanılan varsayılan görseller
- Veritabanı: D1 `buyukdunya-db` · Yüklenen dosyalar ve tanıtım videosu: R2 `buyukdunya-assets`

## Kısrak analiz PDF'leri (15.11.2026)
Serdar: "Güven PDF olarak yüklesin, panel onu yüklesin; diğerlerini de gönderiyor." Panel › 🐎 Kısraklar › **📄 Analiz PDF'inden kısrak ekle** (birden çok PDF). `POST /api/kisrak-pdf` (dosya + isteğe bağlı `id`): PDF imzası (%PDF) denetlenir, en çok 20 MB; metin Workers AI `toMarkdown` ile çıkarılır; `kisrakAyikla` kısrak adını ("Büyükdünya × <ad>"; toMarkdown satırları yapıştırdığı için ad DOSYA ADIYLA — `Buyukdunya_<Ad>_Pedigri_Analizi.pdf` — harf harf eşlenerek ayrılır, Türkçe yazım metinden), baba × anne satırını (`aciklama`, boşsa) ve " · " sonrasını (`tay_bilgisi`, boşsa) bulur. Aynı adlı kısrak varsa PDF ona eklenir/değişir. Sütunlar `kisraklar.pdf_key, pdf_ad, analiz_metin (≤20000), analiz_tarih`. **PDF SADECE panelde:** R2 `ozel/kisrak/<uuid>.pdf`, `/medya/ozel/…` dışarıya 404, okuma `GET /api/kisrak-pdf/<id>` (oturum), kaldırma `DELETE /api/kisrak-pdf/<id>`; kısrak silinince PDF de silinir. Sitede kartta ad + baba × anne + tay bilgisi. Analiz metinleri Şahlı AI'nın bilgisine girer (`sahliBaglam`, kısrak başına 6000 harf). İlk yüklenenler: Mabeyn, Alya Eylül, Dılda, Sabihasultan.
