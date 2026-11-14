# Şahlı Grup Panel (15.11.2026, v1.0)

Güven Şahlı'nın bütün işletmeleri tek panelde: Luxury Beauty Center, Şahlı Harası – BÜYÜKDÜNYA, Şahlı Otomotiv (şimdilik sadece ad, "Yakında").

- **Adres:** https://grup.buyukdunya.com (15.11.2026, Serdar seçti; yedek: sahli-grup-panel.serdarcirak.workers.dev). sahliotomotiv.com Cloudflare'e geçince ayrıca `merkez.sahliotomotiv.com` eklenebilir (Merkez `firma.alan_adi` da güncellenir).
- **Worker:** `sahli-grup-panel` (elle yayın; Workers Builds YOK). Dosyalar: `worker.js` (sunucu), `panel.js` (arayüz), `ikonlar.js` (ana ekran simgeleri). Yayın için üçü tek dosyada birleştirilir (importlar silinir, `export const` → `const`), buyukdunya R2 aktarımıyla Cloudflare'e PUT edilir.
- **Bağlantılar:** `DB` = D1 `sahli-grup-db` (a5815cc6-fab2-4a29-bc23-55a8e8be4de4), `LUX_DB` = Luxury D1 (SADECE OKUNUR sorgular), `BD_DB` = Büyükdünya D1 (SADECE OKUNUR).
- **Secret'lar:** `MERKEZ_ANAHTAR` (Merkez → bu panel; değeri Merkez D1 `firma` kod `sahli`), `LUX_SAHLI_ANAHTAR` (= luxurybeauty-js `SAHLI_ANAHTAR`), `BD_SAHLI_ANAHTAR` (= buyukdunya-com `SAHLI_ANAHTAR`). Değerler koda/notlara YAZILMAZ.
- **Kullanıcılar** (tablo `kullanici`): `serdar` (gelistirici) ve `guven` (yonetici). Şifre özetleri Luxury'deki hesaplarından kopyalandı (aynı şifre). `lux_kadi` / `bd_kadi` = kişinin o sitedeki kullanıcı adı.
- **Panele gir:** `/api/gir` → o sitenin anahtarıyla imzalı 2 dk'lık tek kullanımlık bilet `{t:"giris", f:"luxury"|"buyukdunya", k:"sahli", u:<kullanıcı adı>}` → sitenin `/merkez-giris?b=`. Site, kişinin KENDİ hesabını açar; Developer hesabına bu yoldan ASLA girilmez (siteler de denetler). Serdar sitelere Merkez'den girer.
- **Özetler:** Luxury: bugünkü randevu (iptal hariç), bugün tahsilat/satış, bu ay tahsilat, açık bakiye (aktif satışlar − bunlara ait aktif tahsilatlar), görülmemiş web talebi. Büyükdünya: kısrak talepleri (7 gün / toplam), WhatsApp tıklamaları (bugün / toplam), son 3 talep. Sitelerde tablo/sütun değişirse `ozetler()` güncellenir.
- **Developer:** 👀 Canlı İzle (kim panelde, ekran, dokunuş, işlem); Merkez'den `/merkez-giris` ile şifresiz giriş (sarı 🛟 şerit). Güven Bey Developer'ın izini görmez.
- Geri tuşu panelden çıkarmaz; iPhone'da ilk açılışta "Ana ekrana ekle" tarifi.
