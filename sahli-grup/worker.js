// =====================================================================
// ŞAHLI GRUP PANEL — Worker "sahli-grup-panel" (14.11.2026)
// Serdar: "Luxury ve Büyükdünya Güven'in projeleri, bir de sahliotomotiv.com var; Güven bizimki gibi
// bir merkez panelden panellerine ve sitelerine ulaşsın. Güven ikisinin de sahibi, Developer hariç her yetki
// onun; ben Developer olarak üstündeyim."
// - Kişiye özel giriş (PBKDF2 özeti, Luxury/Büyükdünya ile aynı biçim), oturum çerezi, yanlış deneme kilidi.
// - Kartlar: Luxury Beauty Center (özet: bugün randevu / tahsilat, ay tahsilatı, açık bakiye, web talepleri),
//   Büyükdünya (kısrak talepleri, WhatsApp tıklamaları), Şahlı Otomotiv (site hazırlanıyor).
//   Özetler doğrudan o sitelerin veritabanlarından SADECE OKUNUR (bağlantılar LUX_DB, BD_DB).
// - "Panele gir": o sitenin SAHLI anahtarıyla imzalı, 2 dk'lık tek kullanımlık bilet → kişinin O SİTEDEKİ
//   kendi hesabıyla şifresiz giriş (Developer hesabıyla ASLA; siteler bunu kendisi de denetler).
// - Developer (Serdar): Canlı İzle (kim panelde, ne yaptı); Merkez'den /merkez-giris ile şifresiz girer.
//   Developer'ın girişleri ve hareketleri Güven Bey'e görünmez.
// Secret'lar: MERKEZ_ANAHTAR (Merkez → bu panel), LUX_SAHLI_ANAHTAR, BD_SAHLI_ANAHTAR (bu panel → siteler).
// =====================================================================
import { PANEL_HTML } from "./panel.js";
import { IKON } from "./ikonlar.js";
import { SW_JS, vapidAcik, pushGonder } from "./push.js";

const SURUM = "v1.2";
const MERKEZ_KOD = "sahli";
const OTURUM_GUN = 30, BOSTA_GUN = 14;
const ISLETMELER = {
  luxury: { ad: "Luxury Beauty Center", site: "https://luxurybeauty-js.serdarcirak.workers.dev", giris: "https://luxurybeauty-js.serdarcirak.workers.dev/merkez-giris?b=", anahtar: "LUX_SAHLI_ANAHTAR", kolon: "lux_kadi" },
  buyukdunya: { ad: "Şahlı Harası – BÜYÜKDÜNYA", site: "https://buyukdunya.com", giris: "https://buyukdunya.com/merkez-giris?b=", anahtar: "BD_SAHLI_ANAHTAR", kolon: "bd_kadi" },
};

const enc = (s) => new TextEncoder().encode(String(s));
function b64u(bayt) { let s = ""; const a = new Uint8Array(bayt); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64uBayt(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const h = atob(s), a = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) a[i] = h.charCodeAt(i); return a; }
function esit(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let f = 0; for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i); return f === 0; }
async function sha256Hex(s) { const h = await crypto.subtle.digest("SHA-256", enc(s)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
async function hmac(anahtar, metin) { const k = await crypto.subtle.importKey("raw", enc(anahtar), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return b64u(await crypto.subtle.sign("HMAC", k, enc(metin))); }
const json = (v, d = 200) => new Response(JSON.stringify(v), { status: d, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
function cerez(req, ad) { const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|; )" + ad + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; }

async function sifreOzetle(sifre) {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey("raw", enc(sifre), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: tuz, iterations: 100000 }, k, 256);
  return "pbkdf2$100000$" + b64u(tuz) + "$" + b64u(b);
}
async function sifreDogrula(sifre, kayitli) {
  const p = String(kayitli || "").split("$");
  if (p.length !== 4 || p[0] !== "pbkdf2" || !sifre) return false;
  const k = await crypto.subtle.importKey("raw", enc(sifre), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64uBayt(p[2]), iterations: parseInt(p[1], 10) || 100000 }, k, 256);
  return esit(b64u(b), p[3]);
}

let SEMA = false;
async function semaHazirla(env) {
  if (SEMA) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS kullanici (id INTEGER PRIMARY KEY AUTOINCREMENT, kadi TEXT NOT NULL UNIQUE COLLATE NOCASE, ad TEXT, rol TEXT NOT NULL DEFAULT 'yonetici', sifre TEXT NOT NULL, aktif INTEGER DEFAULT 1, lux_kadi TEXT, bd_kadi TEXT, son_giris INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS oturum (ozet TEXT PRIMARY KEY, kullanici_id INTEGER NOT NULL, olusturma INTEGER, son_gorulme INTEGER, bitis INTEGER, cihaz TEXT, yol TEXT, sekme TEXT, kapandi INTEGER DEFAULT 0)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS hareket (id INTEGER PRIMARY KEY AUTOINCREMENT, zaman INTEGER NOT NULL, kullanici_id INTEGER, tur TEXT, sekme TEXT, detay TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS giris_kilidi (anahtar TEXT PRIMARY KEY, sayi INTEGER, bitis INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS merkez_bilet (n TEXT PRIMARY KEY, zaman INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS abone (id INTEGER PRIMARY KEY AUTOINCREMENT, kullanici_id INTEGER NOT NULL, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, cihaz TEXT, olusturma INTEGER, son_gonderim INTEGER, son_durum INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS kanca (anahtar TEXT PRIMARY KEY, zaman INTEGER)"),
  ]);
  SEMA = true;
}
const cihazAdi = (ua, cf) => (/iPhone|Android.*Mobile|Mobile/i.test(ua || "") ? "📱 Telefon" : /iPad|Tablet|Android/i.test(ua || "") ? "📱 Tablet" : "💻 Bilgisayar") + (cf && cf.city ? " · " + cf.city : "");

async function oturumAc(env, req, kid, yol) {
  await semaHazirla(env);
  const a = b64u(crypto.getRandomValues(new Uint8Array(32))), simdi = Date.now();
  await env.DB.prepare("INSERT INTO oturum (ozet, kullanici_id, olusturma, son_gorulme, bitis, cihaz, yol) VALUES (?,?,?,?,?,?,?)")
    .bind(await sha256Hex(a), kid, simdi, simdi, simdi + OTURUM_GUN * 86400000, cihazAdi(req.headers.get("user-agent"), req.cf), yol).run();
  await env.DB.prepare("UPDATE kullanici SET son_giris=? WHERE id=?").bind(simdi, kid).run();
  await env.DB.prepare("DELETE FROM hareket WHERE zaman < ?").bind(simdi - 180 * 86400000).run();
  return { cerez: `oturum=${a}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OTURUM_GUN * 86400}`, ozet: await sha256Hex(a) };
}
async function kimlik(req, env) {
  const a = cerez(req, "oturum");
  if (!a) return null;
  await semaHazirla(env);
  const ozet = await sha256Hex(a), simdi = Date.now();
  const o = await env.DB.prepare("SELECT * FROM oturum WHERE ozet=? AND kapandi=0").bind(ozet).first();
  if (!o || o.bitis < simdi || simdi - o.son_gorulme > BOSTA_GUN * 86400000) return null;
  const u = await env.DB.prepare("SELECT id, kadi, ad, rol, lux_kadi, bd_kadi FROM kullanici WHERE id=? AND aktif=1").bind(o.kullanici_id).first();
  if (!u) return null;
  if (simdi - o.son_gorulme > 30000) await env.DB.prepare("UPDATE oturum SET son_gorulme=? WHERE ozet=?").bind(simdi, ozet).run();
  return { ...u, dev: u.rol === "gelistirici", oturum: ozet, yol: o.yol, sekme: o.sekme || "" };
}
async function hareketYaz(env, k, tur, sekme, detay) {
  try { await env.DB.prepare("INSERT INTO hareket (zaman, kullanici_id, tur, sekme, detay) VALUES (?,?,?,?,?)").bind(Date.now(), k.id, tur, String(sekme || "").slice(0, 30), String(detay || "").slice(0, 200)).run(); } catch (e) {}
}

// Türkiye günü 'YYYY-MM-DD'
const trGun = (ms = Date.now()) => new Date(ms + 3 * 3600000).toISOString().slice(0, 10);

// İşletme özetleri (salt okunur)
async function ozetler(env) {
  const gun = trGun(), ay = gun.slice(0, 7);
  const lux = {}, bd = {};
  try {
    const L = env.LUX_DB;
    const [r, tb, ta, sat, tah, tk] = await Promise.all([
      L.prepare("SELECT COUNT(*) n, SUM(durum='tamamlandi') t FROM randevular WHERE substr(tarih_saat,1,10)=? AND durum<>'iptal'").bind(gun).first(),
      L.prepare("SELECT COALESCE(SUM(tutar),0) s, COUNT(*) n FROM tahsilatlar WHERE durum='aktif' AND date(tarih,'+3 hours')=?").bind(gun).first(),
      L.prepare("SELECT COALESCE(SUM(tutar),0) s FROM tahsilatlar WHERE durum='aktif' AND substr(datetime(tarih,'+3 hours'),1,7)=?").bind(ay).first(),
      L.prepare("SELECT COALESCE(SUM(toplam),0) s FROM satislar WHERE durum='aktif'").first(),
      L.prepare("SELECT COALESCE(SUM(t.tutar),0) s FROM tahsilatlar t JOIN satislar s ON s.id=t.satis_id WHERE t.durum='aktif' AND s.durum='aktif'").first(),
      L.prepare("SELECT COUNT(*) n FROM teklif_talepleri WHERE gorundu=0").first().catch(() => ({ n: 0 })),
    ]);
    const bs = await L.prepare("SELECT COALESCE(SUM(toplam),0) s, COUNT(*) n FROM satislar WHERE durum='aktif' AND date(tarih,'+3 hours')=?").bind(gun).first();
    Object.assign(lux, { randevu: r.n || 0, randevu_tamam: r.t || 0, tahsilat_bugun: tb.s, tahsilat_bugun_adet: tb.n, tahsilat_ay: ta.s, satis_bugun: bs.s, satis_bugun_adet: bs.n, acik_bakiye: Math.max(0, (sat.s || 0) - (tah.s || 0)), yeni_talep: tk.n || 0 });
  } catch (e) { lux.hata = "Bilgi okunamadı"; }
  try {
    const B = env.BD_DB;
    const [t, t7, w, wb] = await Promise.all([
      B.prepare("SELECT COUNT(*) n FROM talepler").first(),
      B.prepare("SELECT COUNT(*) n FROM talepler WHERE created_at >= datetime('now','-7 days')").first(),
      B.prepare("SELECT COUNT(*) n FROM wa_tiklama").first(),
      B.prepare("SELECT COUNT(*) n FROM wa_tiklama WHERE date(created_at,'+3 hours')=?").bind(gun).first(),
    ]);
    const son = await B.prepare("SELECT ad_soyad, kisrak_bilgisi, created_at FROM talepler ORDER BY id DESC LIMIT 3").all();
    Object.assign(bd, { talep: t.n, talep_7: t7.n, wa: w.n, wa_bugun: wb.n, son_talepler: son.results || [] });
  } catch (e) { bd.hata = "Bilgi okunamadı"; }
  return { gun, luxury: lux, buyukdunya: bd };
}

// Siteye imzalı tek kullanımlık bilet (o sitedeki KENDİ hesabıyla giriş)
async function biletUret(anahtar, yuk) { const g = b64u(enc(JSON.stringify(yuk))); return g + "." + (await hmac(anahtar, g)); }

async function merkezBiletDogrula(env, bilet) {
  if (!env.MERKEZ_ANAHTAR || String(env.MERKEZ_ANAHTAR).length < 32) return { hata: "Merkez bağlantısı kurulmamış" };
  const [g, im] = String(bilet || "").split(".");
  if (!g || !im || g.length > 4000 || !esit(im, await hmac(env.MERKEZ_ANAHTAR, g))) return { hata: "Bilet geçersiz" };
  let y; try { y = JSON.parse(new TextDecoder().decode(b64uBayt(g))); } catch (e) { return { hata: "Bilet geçersiz" }; }
  const sn = Math.floor(Date.now() / 1000);
  if (y.t !== "giris" || y.f !== MERKEZ_KOD) return { hata: "Bilet bu panel için değil" };
  if (!(Number(y.z) > sn) || Number(y.z) - sn > 300) return { hata: "Biletin süresi dolmuş" };
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(y.n || ""))) return { hata: "Bilet geçersiz" };
  await semaHazirla(env);
  await env.DB.prepare("DELETE FROM merkez_bilet WHERE zaman < ?").bind(sn - 86400).run();
  try { await env.DB.prepare("INSERT INTO merkez_bilet (n, zaman) VALUES (?,?)").bind(y.n, sn).run(); } catch (e) { return { hata: "Bu bilet daha önce kullanıldı" }; }
  return y;
}

// Kişinin bütün telefonlarına bildirim (ölmüş abonelik silinir)
async function kisiyeBildir(env, kid, veri) {
  if (!env.VAPID_OZEL) return { gonderilen: 0, hata: "VAPID yok" };
  const { results } = await env.DB.prepare("SELECT * FROM abone WHERE kullanici_id=?").bind(kid).all();
  let n = 0;
  for (const a of results || []) {
    try {
      const r = await pushGonder(env, a, veri);
      if (r.sil) await env.DB.prepare("DELETE FROM abone WHERE id=?").bind(a.id).run();
      else { await env.DB.prepare("UPDATE abone SET son_gonderim=?, son_durum=? WHERE id=?").bind(Date.now(), r.durum, a.id).run(); if (r.durum < 300) n++; }
    } catch (e) { await env.DB.prepare("UPDATE abone SET son_durum=0 WHERE id=?").bind(a.id).run(); }
  }
  return { gonderilen: n, abone: (results || []).length };
}

// Luxury'de kişiye gelen okunmamış dahili mesajlar (salt okunur)
async function luxMesajlar(env, luxKadi) {
  if (!luxKadi) return { var: false, liste: [] };
  try {
    const u = await env.LUX_DB.prepare("SELECT id FROM kullanicilar WHERE kullanici_adi=? COLLATE NOCASE").bind(luxKadi).first();
    if (!u) return { var: false, liste: [] };
    const { results } = await env.LUX_DB.prepare("SELECT m.id, m.mesaj, m.tarih, k.ad AS kimden FROM panel_mesajlari m LEFT JOIN kullanicilar k ON k.id=m.gonderen_id WHERE m.alici_id=? AND m.okundu=0 ORDER BY m.id DESC LIMIT 20").bind(u.id).all();
    return { var: true, liste: results || [] };
  } catch (e) { return { var: true, liste: [], hata: "Mesajlar okunamadı" }; }
}

async function siteyeBilet(env, k, hedef) {
  const is = ISLETMELER[hedef]; if (!is) return { hata: "Bilinmeyen işletme" };
  // Developer (Serdar): sitede Developer hesabıyla girer (k:"sahli-dev"); diğerleri kendi hesabıyla
  const hesap = k[is.kolon];
  if (!hesap && !k.dev) return { hata: "Bu panelde hesabınız tanımlı değil." };
  if (!env[is.anahtar]) return { hata: "Bağlantı anahtarı kurulmamış" };
  const yuk = k.dev ? { t: "giris", f: hedef, k: "sahli-dev" } : { t: "giris", f: hedef, k: "sahli", u: hesap };
  const b = await biletUret(env[is.anahtar], { ...yuk, z: Math.floor(Date.now() / 1000) + 120, n: b64u(crypto.getRandomValues(new Uint8Array(18))) });
  return { adres: is.giris + encodeURIComponent(b), ad: is.ad };
}

function ikonCevap(ad) {
  const b = IKON[ad]; if (!b) return new Response("yok", { status: 404 });
  const s = atob(b), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return new Response(a, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), yol = url.pathname;
    const ip = req.headers.get("cf-connecting-ip") || "-";

    if (yol === "/" || yol === "/panel") return new Response(PANEL_HTML.replace("{{SURUM}}", SURUM), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
    if (yol === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n");
    if (yol === "/manifest.json") return new Response(JSON.stringify({
      name: "Şahlı Grup Panel", short_name: "Şahlı Grup", start_url: "/", scope: "/", display: "standalone", lang: "tr",
      background_color: "#13221a", theme_color: "#13221a",
      icons: [{ src: "/ikon-192.png", sizes: "192x192", type: "image/png" }, { src: "/ikon-512.png", sizes: "512x512", type: "image/png" }, { src: "/ikon-m512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
    }), { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } });
    const ik = yol.match(/^\/ikon-(180|192|512|m512)\.png$/); if (ik) return ikonCevap(ik[1]);
    if (yol === "/sw.js") return new Response(SW_JS, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" } });

    // Sitelerden gelen imzalı haber (Luxury: Güven'e dahili mesaj) → telefon bildirimi
    if (yol === "/kanca/mesaj" && req.method === "POST") {
      const govde = await req.text();
      let y; try { y = JSON.parse(govde); } catch (e) { return json({ hata: "geçersiz" }, 400); }
      const is = ISLETMELER[y.f];
      if (!is || !env[is.anahtar] || !esit(req.headers.get("x-imza") || "", await hmac(env[is.anahtar], govde))) return json({ hata: "imza" }, 403);
      const sn = Math.floor(Date.now() / 1000);
      if (!(Math.abs(sn - Number(y.z)) < 300)) return json({ hata: "süre" }, 403);
      await semaHazirla(env);
      const ka = y.f + ":" + (y.id || "") + ":" + y.z;
      await env.DB.prepare("DELETE FROM kanca WHERE zaman < ?").bind(sn - 86400).run();
      try { await env.DB.prepare("INSERT INTO kanca (anahtar, zaman) VALUES (?,?)").bind(ka, sn).run(); } catch (e) { return json({ ok: true, tekrar: true }); }
      const u = await env.DB.prepare("SELECT id FROM kullanici WHERE " + is.kolon + "=? COLLATE NOCASE AND aktif=1").bind(String(y.u || "")).first();
      if (!u) return json({ ok: true, kisi: false });
      const kim = String(y.kimden || "").slice(0, 60), metin = String(y.mesaj || "").slice(0, 300);
      const sorun = y.tur === "sorun";
      const r = await kisiyeBildir(env, u.id, { baslik: (sorun ? "⚠️ Hara · seyis bildirdi" : "💬 " + (y.f === "luxury" ? "Luxury" : is.ad)) + (kim ? " · " + kim : ""), metin, url: "/git/" + y.f, etiket: y.f + (sorun ? "-sorun-" : "-mesaj-") + (y.id || sn) });
      await hareketYaz(env, { id: u.id }, "islem", "", is.ad + (sorun ? " sorun bildirimi geldi" : " mesajı geldi") + (kim ? " (" + kim + ")" : "") + " · bildirim " + r.gonderilen);
      return json({ ok: true, ...r });
    }
    // Bildirime / mesaja dokununca: o paneli kişinin kendi hesabıyla aç
    const git = yol.match(/^\/git\/(luxury|buyukdunya)$/);
    if (git) {
      const k = await kimlik(req, env);
      if (!k) return new Response(null, { status: 302, headers: { Location: "/" } });
      const b = await siteyeBilet(env, k, git[1]);
      if (b.hata) return new Response(null, { status: 302, headers: { Location: "/" } });
      await hareketYaz(env, k, "islem", "", b.ad + " paneline girdi");
      return new Response(null, { status: 302, headers: { Location: b.adres, "Cache-Control": "no-store" } });
    }

    // Giriş
    if (yol === "/giris" && req.method === "POST") {
      await semaHazirla(env);
      let g = {}; try { g = await req.json(); } catch (e) {}
      const kadi = String(g.kadi || "").trim().toLocaleLowerCase("tr").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ç/g, "c"), simdi = Date.now();   // "Güven" yazılsa da "guven" bulunur
      const kil = ["ip:" + ip, "k:" + kadi];
      for (const a of kil) { const r = await env.DB.prepare("SELECT sayi, bitis FROM giris_kilidi WHERE anahtar=?").bind(a).first(); if (r && r.bitis > simdi && r.sayi >= (a.startsWith("ip:") ? 5 : 10)) return json({ hata: "Çok fazla yanlış deneme. 15 dakika sonra yeniden deneyin." }, 429); }
      const u = kadi ? await env.DB.prepare("SELECT id, sifre FROM kullanici WHERE kadi=? COLLATE NOCASE AND aktif=1").bind(kadi).first() : null;
      if (!u || !(await sifreDogrula(String(g.sifre || ""), u.sifre))) {
        for (const a of kil) await env.DB.prepare("INSERT INTO giris_kilidi (anahtar, sayi, bitis) VALUES (?,1,?) ON CONFLICT(anahtar) DO UPDATE SET sayi = CASE WHEN bitis < ? THEN 1 ELSE sayi+1 END, bitis = ?").bind(a, simdi + 900000, simdi, simdi + 900000).run();
        return json({ hata: "Kullanıcı adı veya şifre hatalı" }, 401);
      }
      for (const a of kil) await env.DB.prepare("DELETE FROM giris_kilidi WHERE anahtar=?").bind(a).run();
      const o = await oturumAc(env, req, u.id, "sifre");
      await hareketYaz(env, { id: u.id }, "giris", "", "Giriş yaptı");
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": o.cerez } });
    }
    if (yol === "/merkez-giris") {
      const y = await merkezBiletDogrula(env, url.searchParams.get("b"));
      if (y.hata) return new Response("<meta charset=utf-8><p style='font-family:Arial;margin:40px'>Merkez girişi olmadı: " + y.hata + "</p>", { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } });
      const u = await env.DB.prepare("SELECT id FROM kullanici WHERE rol='gelistirici' AND aktif=1 ORDER BY (kadi='serdar') DESC, id LIMIT 1").first();
      if (!u) return new Response("Developer hesabı yok", { status: 403 });
      const o = await oturumAc(env, req, u.id, "merkez");
      await hareketYaz(env, { id: u.id }, "giris", "", "Merkez'den giriş");
      return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": o.cerez, "Cache-Control": "no-store" } });
    }
    if (yol === "/cikis") {
      const k = await kimlik(req, env);
      if (k) { await hareketYaz(env, k, "cikis", "", "Çıkış yaptı"); await env.DB.prepare("UPDATE oturum SET kapandi=1 WHERE ozet=?").bind(k.oturum).run(); }
      return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": "oturum=; Path=/; Max-Age=0" } });
    }

    if (yol.startsWith("/api/")) {
      const k = await kimlik(req, env);
      if (!k) return json({ hata: "Oturum yok" }, 401);
      const sekmeBas = (req.headers.get("x-panel-sekme") || "").slice(0, 30);
      if (yol === "/api/ben") {
        const ab = await env.DB.prepare("SELECT COUNT(*) n FROM abone WHERE kullanici_id=?").bind(k.id).first();
        return json({ id: k.id, ad: k.ad, kadi: k.kadi, dev: k.dev, yol: k.yol, surum: SURUM, lux: !!k.lux_kadi, bd: !!k.bd_kadi, abone: ab ? ab.n : 0 });
      }
      if (yol === "/api/ozet") return json(await ozetler(env));
      if (yol === "/api/gir" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        const b = await siteyeBilet(env, k, g.hedef);
        if (b.hata) return json({ hata: b.hata }, 400);
        await hareketYaz(env, k, "islem", sekmeBas, b.ad + " paneline girdi");
        return json({ ok: true, adres: b.adres });
      }
      if (yol === "/api/mesajlar") return json(await luxMesajlar(env, k.lux_kadi));
      if (yol === "/api/push-anahtar") return json({ anahtar: env.VAPID_OZEL ? vapidAcik(env) : null });
      if (yol === "/api/push-abone" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        const ep = String(g.endpoint || ""), p = g.keys || {};
        if (!/^https:\/\/[^\s]{10,900}$/.test(ep) || !p.p256dh || !p.auth) return json({ hata: "Abonelik bilgisi eksik" }, 400);
        await env.DB.prepare("INSERT INTO abone (kullanici_id, endpoint, p256dh, auth, cihaz, olusturma) VALUES (?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET kullanici_id=excluded.kullanici_id, p256dh=excluded.p256dh, auth=excluded.auth, cihaz=excluded.cihaz")
          .bind(k.id, ep, String(p.p256dh).slice(0, 200), String(p.auth).slice(0, 100), cihazAdi(req.headers.get("user-agent"), req.cf), Date.now()).run();
        await hareketYaz(env, k, "islem", "hesap", "Telefon bildirimlerini açtı");
        return json({ ok: true });
      }
      if (yol === "/api/push-sil" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        await env.DB.prepare("DELETE FROM abone WHERE kullanici_id=? AND endpoint=?").bind(k.id, String(g.endpoint || "")).run();
        return json({ ok: true });
      }
      if (yol === "/api/push-dene" && req.method === "POST") {
        const r = await kisiyeBildir(env, k.id, { baslik: "🔔 Şahlı Grup Panel", metin: "Deneme bildirimi — bildirimler çalışıyor.", url: "/", etiket: "deneme" });
        return json({ ok: r.gonderilen > 0, ...r });
      }
      if (yol === "/api/nabiz" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        const s = String(g.sekme || "").slice(0, 30);
        await env.DB.prepare("UPDATE oturum SET son_gorulme=?, sekme=? WHERE ozet=?").bind(Date.now(), s, k.oturum).run();
        if (s && s !== k.sekme) await hareketYaz(env, k, "ekran", s, "");
        return json({ ok: true });
      }
      if (yol === "/api/tik" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        const l = Array.isArray(g.liste) ? g.liste.slice(0, 30) : [];
        if (l.length) await env.DB.batch(l.map((t) => env.DB.prepare("INSERT INTO hareket (zaman, kullanici_id, tur, sekme, detay) VALUES (?,?,?,?,?)").bind(Math.min(Date.now(), Number(t.z) || Date.now()), k.id, "tik", String(t.s || "").slice(0, 30), String(t.t || "").slice(0, 80))));
        return json({ ok: true });
      }
      if (yol === "/api/sifre" && req.method === "POST") {
        let g = {}; try { g = await req.json(); } catch (e) {}
        const yeni = String(g.yeni || "");
        if (yeni.length < 6) return json({ hata: "Yeni şifre en az 6 karakter olmalı" }, 400);
        const u = await env.DB.prepare("SELECT sifre FROM kullanici WHERE id=?").bind(k.id).first();
        if (!u || !(await sifreDogrula(String(g.eski || ""), u.sifre))) return json({ hata: "Eski şifre hatalı" }, 400);
        await env.DB.prepare("UPDATE kullanici SET sifre=? WHERE id=?").bind(await sifreOzetle(yeni), k.id).run();
        await env.DB.prepare("UPDATE oturum SET kapandi=1 WHERE kullanici_id=? AND ozet<>?").bind(k.id, k.oturum).run();
        await hareketYaz(env, k, "islem", "hesap", "Kendi şifresini değiştirdi");
        return json({ ok: true });
      }
      // --- Sadece Developer ---
      if (yol === "/api/canli") {
        if (!k.dev) return json({ hata: "Yetkiniz yok" }, 403);
        const kid = url.searchParams.get("kid"), son = Number(url.searchParams.get("son")) || 0, gun = url.searchParams.get("gun") || "";
        let w = " WHERE h.id > ?", b = [son];
        if (kid !== null && kid !== "") { w += " AND h.kullanici_id=?"; b.push(Number(kid)); }
        if (/^\d{4}-\d{2}-\d{2}$/.test(gun)) { const bas = Date.parse(gun + "T00:00:00+03:00"); w += " AND h.zaman>=? AND h.zaman<?"; b.push(bas, bas + 86400000); }
        const { results } = await env.DB.prepare("SELECT h.*, u.ad FROM hareket h LEFT JOIN kullanici u ON u.id=h.kullanici_id" + w + " ORDER BY h.id DESC LIMIT 300").bind(...b).all();
        const simdi = Date.now();
        const { results: ku } = await env.DB.prepare("SELECT id, ad, kadi, rol FROM kullanici WHERE aktif=1 ORDER BY id").all();
        const { results: ot } = await env.DB.prepare("SELECT kullanici_id, son_gorulme, cihaz, sekme, yol FROM oturum WHERE kapandi=0 AND bitis>? ORDER BY son_gorulme DESC").bind(simdi).all();
        const kisiler = (ku || []).map((u) => { const o = (ot || []).find((x) => x.kullanici_id === u.id); const dk = o ? (simdi - o.son_gorulme) / 60000 : 1e9; return { id: u.id, ad: u.ad, kadi: u.kadi, son: o ? o.son_gorulme : 0, durum: dk < 2 ? "yesil" : dk < 10 ? "sari" : "kirmizi", sekme: o ? o.sekme : "", cihaz: o ? o.cihaz : "", merkez: o ? o.yol === "merkez" : false }; });
        return json({ kisiler, akis: results || [], simdi });
      }
      return json({ hata: "Bulunamadı" }, 404);
    }
    return new Response("Bulunamadı", { status: 404 });
  },
};
