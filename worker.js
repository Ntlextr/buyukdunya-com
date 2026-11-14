const REPO_RAW = "https://raw.githubusercontent.com/Ntlextr/buyukdunya-com/main";
const R2_PUBLIC = "https://pub-421f02705d5c4bdb9780cbb61f25ccb1.r2.dev";
const CF_BEACON_TOKEN = "1480748608ed4e08af7b7519412db4a8";
const SITE_URL = "https://buyukdunya.com";
const SEO_DESCRIPTION = "BÜYÜKDÜNYA - Şahlı Harası. 2027 aşım sezonunda sizlerle, damızlık yarış aygırı. Yarış rekorları, pedigree, galeri ve kısrak eşleştirme talebi.";

const TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  gif: "image/gif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  eot: "application/vnd.ms-fontobject",
  ico: "image/x-icon",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
};

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// "905324082999" -> "0532 408 29 99"
function formatPhoneTR(no) {
  const digits = String(no || "").replace(/\D/g, "");
  const local = digits.startsWith("90") ? digits.slice(2) : digits;
  const withZero = "0" + local;
  const m = withZero.match(/^(\d{4})(\d{3})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : withZero;
}

async function signToken(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("buyukdunya-panel-v1"));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

// =====================================================================
// KİŞİYE ÖZEL GİRİŞ + OTURUM + CANLI TAKİP + MERKEZ GİRİŞİ (14.11.2026)
// Serdar: "Güven ayrı, ben ayrı gireyim; benimki diğer panellerle aynı olsun; Merkez'den şifresiz
// gireyim; kim online görüp canlı takip edeyim."
// - panel_kullanici: kişiler (şifre PBKDF2 özeti, Luxury/seraytekno ile AYNI biçim: pbkdf2$tur$tuz$özet).
//   rol "gelistirici" (Developer: Canlı İzleme'yi görür) | "yonetici".
// - Eski ortak şifre (PANEL_PASSWORD) SADECE acil durum girişi (kullanıcı adı boş bırakılır; kimlik id 0).
// - panel_oturum: çerez "oturum" = rastgele anahtar; veritabanında SHA-256 özeti. 30 gün, 14 gün kullanılmazsa biter.
// - panel_hareket: ekran açılışı (ekran), dokunuş (tik — sadece düğme yazısı), işlem (islem — başarılı yazma isteği).
// - Merkez girişi: GET /merkez-giris?b=<bilet> (merkez.seraytekno.com imzalı, 5 dk, tek kullanımlık) → Serdar'ın
//   Developer hesabıyla oturum. Biçim seraytekno-API/merkez_giris.js ile aynı. Secret: MERKEZ_ANAHTAR.
// =====================================================================
const MERKEZ_KOD = "buyukdunya";
const OTURUM_GUN = 30, BOSTA_GUN = 14;
const bdEnc = (s) => new TextEncoder().encode(String(s));
function bdB64u(bayt) { let s = ""; const a = new Uint8Array(bayt); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function bdB64uBayt(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const h = atob(s), a = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) a[i] = h.charCodeAt(i); return a; }
function bdEsit(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let f = 0; for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i); return f === 0; }
async function sha256Hex(s) { const h = await crypto.subtle.digest("SHA-256", bdEnc(s)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
async function hmacB64u(anahtar, metin) { const k = await crypto.subtle.importKey("raw", bdEnc(anahtar), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return bdB64u(await crypto.subtle.sign("HMAC", k, bdEnc(metin))); }

// Şifre özeti (PBKDF2-SHA256, 100.000 tur) — Luxury'deki sifreOzetle/sifreDogrula ile aynı biçim
async function sifreOzetle(sifre) {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey("raw", bdEnc(sifre), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: tuz, iterations: 100000 }, k, 256);
  return "pbkdf2$100000$" + bdB64u(tuz) + "$" + bdB64u(b);
}
async function sifreDogrula(sifre, kayitli) {
  const p = String(kayitli || "").split("$");
  if (p.length !== 4 || p[0] !== "pbkdf2" || !sifre) return false;
  const k = await crypto.subtle.importKey("raw", bdEnc(sifre), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: bdB64uBayt(p[2]), iterations: parseInt(p[1], 10) || 100000 }, k, 256);
  return bdEsit(bdB64u(b), p[3]);
}
// --- sifreOzetle / sifreDogrula sonu ---

// Tablolar (ilk istekte bir kez)
let SEMA_HAZIR = false;
async function semaHazirla(env) {
  if (SEMA_HAZIR) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS panel_kullanici (id INTEGER PRIMARY KEY AUTOINCREMENT, kadi TEXT NOT NULL UNIQUE COLLATE NOCASE, ad TEXT, rol TEXT NOT NULL DEFAULT 'yonetici', sifre TEXT NOT NULL, aktif INTEGER DEFAULT 1, olusturma TEXT DEFAULT (datetime('now')), son_giris INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS panel_oturum (ozet TEXT PRIMARY KEY, kullanici_id INTEGER NOT NULL, olusturma INTEGER, son_gorulme INTEGER, bitis INTEGER, ip TEXT, cihaz TEXT, yol TEXT, sekme TEXT, kapandi INTEGER DEFAULT 0)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS panel_hareket (id INTEGER PRIMARY KEY AUTOINCREMENT, zaman INTEGER NOT NULL, kullanici_id INTEGER, oturum TEXT, tur TEXT, sekme TEXT, detay TEXT)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS ix_panel_hareket_zaman ON panel_hareket (zaman)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS giris_kilidi (anahtar TEXT PRIMARY KEY, sayi INTEGER, bitis INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS merkez_bilet (n TEXT PRIMARY KEY, zaman INTEGER)"),
  ]);
  SEMA_HAZIR = true;
}

function cihazAdi(ua) {
  ua = String(ua || "");
  const t = /iPhone|Android.*Mobile|Mobile/i.test(ua) ? "📱 Telefon" : /iPad|Tablet|Android/i.test(ua) ? "📱 Tablet" : "💻 Bilgisayar";
  return t;
}
const ISTEK_KIMLIK = new WeakMap();

// Oturum açar → Set-Cookie değeri
async function oturumAc(env, request, kullaniciId, yol) {
  await semaHazirla(env);
  const anahtar = bdB64u(crypto.getRandomValues(new Uint8Array(32)));
  const simdi = Date.now();
  await env.DB.prepare("INSERT INTO panel_oturum (ozet, kullanici_id, olusturma, son_gorulme, bitis, ip, cihaz, yol) VALUES (?,?,?,?,?,?,?,?)")
    .bind(await sha256Hex(anahtar), kullaniciId, simdi, simdi, simdi + OTURUM_GUN * 86400000, (request.headers.get("cf-connecting-ip") || "").slice(0, 60),
      cihazAdi(request.headers.get("user-agent")) + (request.cf && request.cf.city ? " · " + request.cf.city : ""), yol).run();
  if (kullaniciId > 0) await env.DB.prepare("UPDATE panel_kullanici SET son_giris=? WHERE id=?").bind(simdi, kullaniciId).run();
  await env.DB.prepare("DELETE FROM panel_hareket WHERE zaman < ?").bind(simdi - 180 * 86400000).run().catch(() => {});
  return `oturum=${anahtar}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OTURUM_GUN * 86400}`;
}

// İsteğin kimliği: { id, ad, kadi, rol, dev, yol, oturum } ya da null
async function kimlikAl(request, env) {
  if (ISTEK_KIMLIK.has(request)) return ISTEK_KIMLIK.get(request);
  let k = null;
  const anahtar = getCookie(request, "oturum");
  if (anahtar && env.DB) {
    await semaHazirla(env);
    const ozet = await sha256Hex(anahtar);
    const o = await env.DB.prepare("SELECT * FROM panel_oturum WHERE ozet=? AND kapandi=0").bind(ozet).first();
    const simdi = Date.now();
    if (o && o.bitis > simdi && simdi - (o.son_gorulme || 0) < BOSTA_GUN * 86400000) {
      if (o.kullanici_id === 0) k = { id: 0, ad: "Acil giriş", kadi: "acil", rol: "gelistirici" };
      else {
        const u = await env.DB.prepare("SELECT id, ad, kadi, rol FROM panel_kullanici WHERE id=? AND aktif=1").bind(o.kullanici_id).first();
        if (u) k = { ...u };
      }
      if (k) {
        k.dev = k.rol === "gelistirici"; k.yol = o.yol || ""; k.oturum = ozet; k.sekme = o.sekme || "";
        if (simdi - (o.son_gorulme || 0) > 30000) await env.DB.prepare("UPDATE panel_oturum SET son_gorulme=? WHERE ozet=?").bind(simdi, ozet).run();
      }
    }
  }
  ISTEK_KIMLIK.set(request, k);
  return k;
}
async function isAuthed(request, env) { return kimlikAl(request, env); }

// Hareket kaydı (tur: ekran | tik | islem | giris | cikis)
async function hareketYaz(env, k, tur, sekme, detay) {
  if (!k) return;
  try {
    await env.DB.prepare("INSERT INTO panel_hareket (zaman, kullanici_id, oturum, tur, sekme, detay) VALUES (?,?,?,?,?,?)")
      .bind(Date.now(), k.id, (k.oturum || "").slice(0, 12), tur, String(sekme || "").slice(0, 30), String(detay || "").slice(0, 200)).run();
  } catch (e) {}
}

// Başarılı yazma isteğinin okunur adı
const ISLEM_KONU = { "profile": "Yarış sayaçları", "news": "Haber", "yaris-gecmisi": "Yarış geçmişi", "gallery": "Galeri resmi", "kisrak": "Kısrak", "site-icerik": "Site metinleri / ayarları", "upload": "Dosya yükleme", "rapor": "Rapor bölümü", "rapor-pdf": "Rapor PDF", "sahli-ai": "Şahlı AI'ya soru", "talepler": "Talep", "sifre": "Kendi şifresi" };
function islemAdi(method, path) {
  const p = path.split("/"); const konu = ISLEM_KONU[p[2]] || p[2];
  if (p[2] === "sahli-ai" || p[2] === "upload") return konu;
  if (p[2] === "sifre") return "Kendi şifresini değiştirdi";
  return konu + (method === "DELETE" ? " silindi" : method === "PUT" ? " güncellendi" : " kaydedildi") + (p[3] ? " (#" + p[3] + ")" : "");
}

// Merkez bileti doğrula (tek kullanımlık, en çok 5 dk)
async function merkezBiletDogrula(env, bilet) {
  if (!env.MERKEZ_ANAHTAR || String(env.MERKEZ_ANAHTAR).length < 32) return { hata: "Merkez bağlantısı kurulmamış" };
  const [govde, im] = String(bilet || "").split(".");
  if (!govde || !im || govde.length > 4000) return { hata: "Bilet geçersiz" };
  if (!bdEsit(im, await hmacB64u(env.MERKEZ_ANAHTAR, govde))) return { hata: "Bilet geçersiz" };
  let y; try { y = JSON.parse(new TextDecoder().decode(bdB64uBayt(govde))); } catch (e) { return { hata: "Bilet geçersiz" }; }
  const sn = Math.floor(Date.now() / 1000);
  if (y.t !== "giris") return { hata: "Bilet türü yanlış" };
  if (y.f !== MERKEZ_KOD) return { hata: "Bilet bu site için değil" };
  if (!(Number(y.z) > sn) || Number(y.z) - sn > 300) return { hata: "Biletin süresi dolmuş" };
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(y.n || ""))) return { hata: "Bilet geçersiz" };
  await semaHazirla(env);
  await env.DB.prepare("DELETE FROM merkez_bilet WHERE zaman < ?").bind(sn - 86400).run();
  try { await env.DB.prepare("INSERT INTO merkez_bilet (n, zaman) VALUES (?, ?)").bind(y.n, sn).run(); }
  catch (e) { return { hata: "Bu bilet daha önce kullanıldı" }; }
  return y;
}
// --- merkezBiletDogrula() sonu ---

function htmlCevap(baslik, metin, durum) {
  return new Response(`<!DOCTYPE html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(baslik)}</title><body style="font-family:Arial,sans-serif;max-width:420px;margin:60px auto;padding:16px"><h2>${esc(baslik)}</h2><p>${esc(metin)}</p><p><a href="/panel">Panel girişine git</a></p></body></html>`, { status: durum || 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Developer'ın Canlı İzleme ekranı için: kişiler ve durumları
async function canliKisiler(env) {
  const simdi = Date.now();
  const { results: kisiler } = await env.DB.prepare("SELECT id, ad, kadi, rol, son_giris FROM panel_kullanici WHERE aktif=1 ORDER BY id").all();
  const { results: otr } = await env.DB.prepare("SELECT kullanici_id, son_gorulme, cihaz, sekme, yol FROM panel_oturum WHERE kapandi=0 AND bitis > ? AND son_gorulme > ? ORDER BY son_gorulme DESC").bind(simdi, simdi - BOSTA_GUN * 86400000).all();
  const liste = [...(kisiler || []), { id: 0, ad: "Acil giriş (ortak şifre)", kadi: "acil", rol: "gelistirici" }];
  return liste.map((u) => {
    const o = (otr || []).filter((x) => x.kullanici_id === u.id);
    const son = o.length ? o[0].son_gorulme : 0;
    const dk = son ? (simdi - son) / 60000 : 1e9;
    return { id: u.id, ad: u.ad, kadi: u.kadi, rol: u.rol, son, durum: dk < 2 ? "yesil" : dk < 10 ? "sari" : "kirmizi", sekme: o.length ? o[0].sekme : "", cihaz: o.length ? o[0].cihaz : "", merkez: o.length ? o[0].yol === "merkez" : false, oturum_sayisi: o.length };
  }).filter((u) => u.id !== 0 || u.son);
}
// =====================================================================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function requireAuth(request, env) {
  return isAuthed(request, env);
}

// =====================================================================
// ATA ODAKLANMA (14.11.2026, Serdar: "galeri ve ön yüzdeki bütün resimlerde hedef odak at olacak")
// Workers AI nesne tanıma (@cf/facebook/detr-resnet-50) resimdeki atı bulur; resim kutuya sığdırılıp
// kırpılırken (object-fit: cover) atın ortası görünür kalsın diye "x% y%" odak noktası yazılır.
// At bulunamazsa kişi, o da yoksa orta. Panelde elle de değiştirilebilir (🎯).
// =====================================================================
let ODAK_SEMA = false;
async function odakSemaHazirla(env) {
  if (ODAK_SEMA) return;
  for (const t of ["gallery", "news", "kisraklar"]) {
    try { await env.DB.prepare("ALTER TABLE " + t + " ADD COLUMN odak TEXT").run(); } catch (e) {}
  }
  ODAK_SEMA = true;
}
async function resimBaytlari(env, adres) {
  adres = String(adres || "");
  const m = adres.match(/\/medya\/(.+)$/);
  if (m) { const o = await env.ASSETS.get(decodeURIComponent(m[1])); return o ? new Uint8Array(await o.arrayBuffer()) : null; }
  if (/^https?:\/\//.test(adres)) { const r = await fetch(adres); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; }
  if (adres) { const r = await fetch(REPO_RAW + "/" + adres.replace(/^\/+/, "")); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; }
  return null;
}
function resimBoyu(b) {
  // WebP (VP8 / VP8L / VP8X), JPEG ve PNG başlığından genişlik-yükseklik
  if (!b || b.length < 30) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], h: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23] };
  if (b[0] === 0x52 && b[8] === 0x57) {
    const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (t === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (t === "VP8 ") return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
    if (t === "VP8L") { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
  }
  return null;
}
async function atOdakBul(env, adres) {
  try {
    const b = await resimBaytlari(env, adres);
    if (!b) return null;
    const boy = resimBoyu(b);
    const r = await env.AI.run("@cf/facebook/detr-resnet-50", { image: [...b] });
    const l = (Array.isArray(r) ? r : (r && r.result) || []).filter((x) => x && x.box && x.score > 0.5);
    const alan = (x) => (x.box.xmax - x.box.xmin) * (x.box.ymax - x.box.ymin) * x.score;
    const atlar = l.filter((x) => x.label === "horse").sort((a, c) => alan(c) - alan(a));
    let sec = atlar[0] || l.filter((x) => x.label === "person").sort((a, c) => alan(c) - alan(a))[0];
    // Koşu sahnesi gibi çok atlı resimde (3+ at, en büyüğü belirgin değil) bütün atların ortası
    if (atlar.length >= 3 && alan(atlar[0]) < 2 * alan(atlar[1])) sec = { box: { xmin: Math.min(...atlar.map((x) => x.box.xmin)), xmax: Math.max(...atlar.map((x) => x.box.xmax)), ymin: Math.min(...atlar.map((x) => x.box.ymin)), ymax: Math.max(...atlar.map((x) => x.box.ymax)) } };
    if (!sec || !boy || !boy.w || !boy.h) return "50% 50%";
    const x = Math.round(((sec.box.xmin + sec.box.xmax) / 2 / boy.w) * 100);
    const y = Math.round(((sec.box.ymin + sec.box.ymax) / 2 / boy.h) * 100);
    return Math.max(0, Math.min(100, x)) + "% " + Math.max(0, Math.min(100, y)) + "%";
  } catch (e) { return null; }
}
// Bütün resimler için yeniden bul (panel: 🐎 Atı otomatik bul)
async function hepsiniOdakla(env) {
  await odakSemaHazirla(env);
  const say = { bulunan: 0, toplam: 0 };
  const yaz = async (deger, f) => { say.toplam++; if (deger) { say.bulunan++; await f(deger); } };
  const ic = await getSiteIcerik(env);
  for (let n = 1; n <= 5; n++) {
    const u = ic["hero_slide" + n] || ("aygirlar/images/slider" + (n + 1) + ".jpg");
    await yaz(await atOdakBul(env, u), (d) => env.DB.prepare("INSERT INTO site_icerik (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger=excluded.deger").bind("hero_pos" + n, d).run());
  }
  if (ic.perf_img) await yaz(await atOdakBul(env, ic.perf_img), (d) => env.DB.prepare("INSERT INTO site_icerik (anahtar, deger) VALUES ('perf_pos', ?) ON CONFLICT(anahtar) DO UPDATE SET deger=excluded.deger").bind(d).run());
  for (const [t, kol] of [["gallery", "url"], ["news", "foto_url"], ["kisraklar", "foto_url"]]) {
    const { results } = await env.DB.prepare("SELECT id, " + kol + " AS u FROM " + t + " WHERE " + kol + " IS NOT NULL AND " + kol + " <> ''" + (t === "gallery" ? " AND tip <> 'video'" : "")).all();
    for (const r of results || []) await yaz(await atOdakBul(env, r.u), (d) => env.DB.prepare("UPDATE " + t + " SET odak=? WHERE id=?").bind(d, r.id).run());
  }
  return say;
}
const odakStil = (o) => (o && /^\d{1,3}% \d{1,3}%$/.test(o) ? ` style="object-position:${o}"` : "");
// =====================================================================

async function renderNewsHtml(env) {
  const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY sira DESC, id DESC").all();
  if (!results || results.length === 0) {
    return `<div class="bos-icerik">Henüz bir haber eklenmedi.</div>`;
  }
  return results.map((n) => `
    <div class="gelisme-kart">
      ${n.foto_url ? `<img src="${esc(n.foto_url)}" alt=""${odakStil(n.odak)}>` : ""}
      <span class="gelisme-tarih">${esc(n.tarih)}</span>
      <div class="gelisme-baslik">${esc(n.baslik)}</div>
      <div class="gelisme-icerik">${esc(n.icerik).replace(/\n/g, "<br>")}</div>
    </div>`).join("\n");
}

async function renderGalleryHtml(env) {
  const { results } = await env.DB.prepare("SELECT * FROM gallery ORDER BY sira DESC, id DESC").all();
  if (!results || results.length === 0) {
    return `<div class="bos-icerik">Henüz galeriye içerik eklenmedi.</div>`;
  }
  return results.map((g) => {
    const media = g.tip === "video"
      ? `<video src="${esc(g.url)}" controls></video>`
      : `<img src="${esc(g.url)}" alt="${esc(g.baslik)}"${odakStil(g.odak)}>`;
    return `<div class="galeri-item">${media}${g.baslik ? `<span>${esc(g.baslik)}</span>` : ""}</div>`;
  }).join("\n");
}

async function renderKisrakHtml(env) {
  const { results } = await env.DB.prepare("SELECT * FROM kisraklar ORDER BY sira DESC, id DESC").all();
  if (!results || results.length === 0) {
    return `<div class="bos-icerik">Henüz kısrak eklenmedi.</div>`;
  }
  return results.map((k) => `
    <div class="kisrak-kart">
      ${k.foto_url ? `<img src="${esc(k.foto_url)}" alt=""${odakStil(k.odak)}>` : ""}
      <div class="kisrak-adi">${esc(k.kisrak_adi)}</div>
      ${k.sahip_adi ? `<span class="kisrak-sahip">${esc(k.sahip_adi)}</span>` : ""}
      <div class="kisrak-aciklama">${esc(k.aciklama).replace(/\n/g, "<br>")}</div>
      ${k.tay_bilgisi ? `<div class="kisrak-tay">${esc(k.tay_bilgisi)}</div>` : ""}
    </div>`).join("\n");
}

async function renderYarisGecmisiHtml(env) {
  const { results } = await env.DB.prepare("SELECT * FROM yaris_gecmisi ORDER BY sira DESC, id DESC").all();
  if (!results || results.length === 0) {
    return `<div class="bos-icerik">Henüz yarış geçmişi eklenmedi.</div>`;
  }
  return results.map((y) => `
    <div class="yaris-kart">
      <span class="yaris-tarih">${esc(y.tarih)}</span>
      <div class="yaris-hipodrom">${esc(y.hipodrom)}${y.mesafe ? ` &middot; ${esc(y.mesafe)}` : ""}</div>
      <div class="yaris-sonuc">${esc(y.sonuc)}</div>
      ${y.aciklama ? `<div class="yaris-aciklama">${esc(y.aciklama)}</div>` : ""}
    </div>`).join("\n");
}

async function getSiteIcerik(env) {
  const { results } = await env.DB.prepare("SELECT * FROM site_icerik").all();
  const map = {};
  for (const r of results) map[r.anahtar] = r.deger;
  return map;
}

async function renderStatsHtml(env) {
  const row = await env.DB.prepare("SELECT * FROM profile WHERE id=1").first();
  if (!row) return "";
  return `<div class="videogalerii rekorlar"> <i class="bi bi-trophy-fill"></i>
${row.toplam_yaris} Yarış ${row.birincilik} Birincilik </div>
<div class="videogalerii rekorlar"> <i class="bi bi-trophy-fill"></i>${row.grup_galibiyeti} Grup Koşu Birinciliği</div>
<div class="videogalerii rekorlar"> <i class="bi bi-trophy-fill"></i>${row.kv_galibiyeti} KV Birinciliği</div>`;
}

function seoAndAnalyticsTags(canonicalPath, heroImg) {
  const canonical = SITE_URL + (canonicalPath === "/index.html" ? "/" : canonicalPath);
  const ogImg = /^https?:\/\//.test(heroImg || "") ? heroImg : `${SITE_URL}/${heroImg || "aygirlar/images/slider2.jpg"}`;
  return `
<meta name="description" content="${esc(SEO_DESCRIPTION)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="BÜYÜKDÜNYA | Şahlı Harası - Damızlık Yarış Aygırı">
<meta property="og:description" content="${esc(SEO_DESCRIPTION)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImg}">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index, follow">
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${CF_BEACON_TOKEN}"}'></script><!-- End Cloudflare Web Analytics -->
</head>`;
}

async function servePublicPage(path, env) {
  const upstream = REPO_RAW + path;
  const resp = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (resp.status === 404) return new Response("404 Not Found", { status: 404 });
  let html = await resp.text();

  const [news, gallery, stats, kisrak, icerik, yarisGecmisi, raporB] = await Promise.all([
    renderNewsHtml(env), renderGalleryHtml(env), renderStatsHtml(env), renderKisrakHtml(env), getSiteIcerik(env), renderYarisGecmisiHtml(env), raporBolumleri(env),
  ]);

  html = html.replace(/<!--NEWS_START-->[\s\S]*?<!--NEWS_END-->/, news);
  html = html.replace(/<!--GALLERY_START-->[\s\S]*?<!--GALLERY_END-->/, gallery);
  html = html.replace(/<!--STATS_START-->[\s\S]*?<!--STATS_END-->/, stats);
  html = html.replace(/<!--KISRAK_START-->[\s\S]*?<!--KISRAK_END-->/, kisrak);
  html = html.replace(/<!--YARISGECMISI_START-->[\s\S]*?<!--YARISGECMISI_END-->/, yarisGecmisi);
  html = html.replace(/<!--HERO_EYEBROW_START-->[\s\S]*?<!--HERO_EYEBROW_END-->/, esc(icerik.hero_eyebrow || ""));
  html = html.replace(/<!--HERO_TAGLINE_START-->[\s\S]*?<!--HERO_TAGLINE_END-->/, esc(icerik.hero_tagline || ""));
  html = html.replace(/<!--HAKKINDA_BASLIK_START-->[\s\S]*?<!--HAKKINDA_BASLIK_END-->/, esc(icerik.hakkinda_baslik || ""));
  html = html.replace(/<!--HAKKINDA_KUNYE_START-->[\s\S]*?<!--HAKKINDA_KUNYE_END-->/, esc(icerik.hakkinda_kunye || "").replace(/\n/g, "<br>"));
  html = html.replace(/<!--HAKKINDA_METIN_START-->[\s\S]*?<!--HAKKINDA_METIN_END-->/, esc(icerik.hakkinda_metin || ""));
  html = html.replace(/<!--RAPOR:([a-z]+)-->/g, (m, yer) => raporYerHtml(raporB, yer, icerik.rapor_pdf || ""));
  html = html.replace("<!--HERO_VIDEO-->", icerik.hero_video
    ? `<video class="hero-video" id="heroVideo" src="${esc(icerik.hero_video)}"${icerik.hero_video_poster ? ` poster="${esc(icerik.hero_video_poster)}"` : ""} autoplay muted loop playsinline preload="auto" data-ses="${icerik.hero_video_ses === "0" ? "0" : "1"}"></video><button type="button" class="ses-dugme" id="sesDugme">🔇 Sesi aç</button>`
    : "");
  html = html.replace("<!--PEDIGREE_IMG-->", icerik.pedigree_img ? `<img src="${esc(icerik.pedigree_img)}" alt="Büyükdünya Pedigree" style="margin-bottom:28px">` : "");
  html = html.replace(/<!--LOGO_START-->[\s\S]*?<!--LOGO_END-->/, icerik.logo_img ? `<img src="${esc(icerik.logo_img)}" alt="Büyükdünya">` : "");

  // Tüm site genelinde tek noktadan yönetilen değerler (token tabanlı değişim)
  const waNo = icerik.whatsapp_no || "905324082999";
  // Footer telif yazısı içinde "Seray Tekno Yazılım" geçiyorsa otomatik olarak
  // seraytekno.com'a giden bir bağlantıya çevrilir (panelde elle HTML yazmaya gerek yok).
  const footerTelifHtml = esc(icerik.footer_telif || "").replace(
    /Seray Tekno Yaz[ıi]l[ıi]m/gi,
    (m) => `<a href="https://seraytekno.com" target="_blank" rel="noopener" style="color:inherit; text-decoration:underline;">${m}</a>`
  );
  const tokenMap = {
    "{{WA_NO}}": waNo,
    "{{WA_NO_DISPLAY}}": formatPhoneTR(waNo),
    "{{PEDIGREE_IMG}}": icerik.pedigree_img || "pedigree2.jpg",
    "{{ILETISIM_IMG}}": icerik.iletisim_img || "aygirlar/images/slider2.jpg",
    "{{HERO_SLIDE_1}}": icerik.hero_slide1 || "aygirlar/images/slider2.jpg",
    "{{HERO_SLIDE_2}}": icerik.hero_slide2 || "aygirlar/images/slider3.jpg",
    "{{HERO_SLIDE_3}}": icerik.hero_slide3 || "aygirlar/images/slider4.jpg",
    "{{HERO_SLIDE_4}}": icerik.hero_slide4 || "aygirlar/images/slider5.jpg",
    "{{HERO_SLIDE_5}}": icerik.hero_slide5 || "aygirlar/images/slider6.jpg",
    "{{TALEP_ACIKLAMA}}": esc(icerik.talep_aciklama || ""),
    "{{FOOTER_ACIKLAMA}}": esc(icerik.footer_aciklama || ""),
    "{{FOOTER_TELIF}}": footerTelifHtml,
    "{{PERF_IMG}}": esc(icerik.perf_img || "https://pub-421f02705d5c4bdb9780cbb61f25ccb1.r2.dev/panel/2026-11-14_22-38-06.webp"),
    "{{PERF_POS}}": esc(icerik.perf_pos || "center 25%"),
    "{{HERO_POS_1}}": esc(icerik.hero_pos1 || "center"),
    "{{HERO_POS_2}}": esc(icerik.hero_pos2 || "center"),
    "{{HERO_POS_3}}": esc(icerik.hero_pos3 || "center"),
    "{{HERO_POS_4}}": esc(icerik.hero_pos4 || "center"),
    "{{HERO_POS_5}}": esc(icerik.hero_pos5 || "center"),
  };
  for (const [token, val] of Object.entries(tokenMap)) {
    html = html.split(token).join(val);
  }

  html = html.split(R2_PUBLIC + "/").join("/medya/");
  html = html.replace(/<\/head>/i, seoAndAnalyticsTags(path, icerik.hero_slide1));

  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60");
  return new Response(html, { status: 200, headers });
}

async function serveStaticAsset(path) {
  const upstream = REPO_RAW + path;
  const resp = await fetch(upstream, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (resp.status === 404) return new Response("404 Not Found", { status: 404 });
  const ext = path.split(".").pop().toLowerCase();
  const headers = new Headers();
  headers.set("Content-Type", TYPES[ext] || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(resp.body, { status: resp.status, headers });
}

// ---------------- ANALİZ RAPORU ----------------
// Biçim: "## " ara başlık · "!! değer | açıklama" rakam kutusu · "a | b" satırları tablo (ilk satır başlık)
// "- " madde · "~ " kaynak notu · "**kalın**" · "[gizli] " ile başlayan satır sitede görünmez
const RAPOR_YERLER = {
  hakkinda: { ad: "Hakkında bölümü" },
  yaris: { ad: "Yarış Analizi (yeni bölüm)", sec: "yaris-analiz", baslik: "Yarış Analizi" },
  pedigree: { ad: "Pedigree bölümü" },
  eslesme: { ad: "Eşleşme Rehberi (yeni bölüm)", sec: "eslesme", baslik: "Eşleşme Rehberi" },
  damizlik: { ad: "Damızlık (yeni bölüm)", sec: "damizlik", baslik: "Damızlık" },
  gizli: { ad: "Sitede gösterme" },
};

function raporSatirIc(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function raporMetinHtml(metin, gizliGoster) {
  const satirlar = String(metin || "").replace(/\r/g, "").split("\n");
  const temiz = [];
  for (let s of satirlar) {
    if (/^\[gizli\]\s?/.test(s)) { if (!gizliGoster) continue; s = s.replace(/^\[gizli\]\s?/, ""); }
    temiz.push(s);
  }
  let out = "", i = 0;
  while (i < temiz.length) {
    const s = temiz[i].trim();
    if (!s) { i++; continue; }
    if (s.startsWith("!! ")) {
      let kutular = "";
      while (i < temiz.length && temiz[i].trim().startsWith("!! ")) {
        const [d, a] = temiz[i].trim().slice(3).split("|").map((x) => x.trim());
        kutular += `<div class="r-stat"><b>${raporSatirIc(d)}</b><span>${raporSatirIc(a || "")}</span></div>`;
        i++;
      }
      out += `<div class="r-stats">${kutular}</div>`;
      continue;
    }
    if (s.startsWith("## ")) { out += `<h4>${raporSatirIc(s.slice(3))}</h4>`; i++; continue; }
    if (s.startsWith("~ ")) { out += `<p class="r-kaynak">${raporSatirIc(s.slice(2))}</p>`; i++; continue; }
    if (s.startsWith("- ")) {
      let li = "";
      while (i < temiz.length && temiz[i].trim().startsWith("- ")) { li += `<li>${raporSatirIc(temiz[i].trim().slice(2))}</li>`; i++; }
      out += `<ul>${li}</ul>`;
      continue;
    }
    if (s.includes(" | ")) {
      const rows = [];
      while (i < temiz.length && temiz[i].trim().includes(" | ")) { rows.push(temiz[i].trim().split("|").map((x) => x.trim())); i++; }
      const th = rows[0].map((c) => `<th>${raporSatirIc(c)}</th>`).join("");
      const tb = rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${raporSatirIc(c)}</td>`).join("")}</tr>`).join("");
      out += `<div class="r-tablo${rows[0].length >= 4 ? " genis" : ""}"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
      continue;
    }
    const p = [];
    while (i < temiz.length) {
      const t = temiz[i].trim();
      if (!t || t.startsWith("## ") || t.startsWith("!! ") || t.startsWith("- ") || t.startsWith("~ ") || t.includes(" | ")) break;
      p.push(raporSatirIc(t)); i++;
    }
    out += `<p>${p.join(" ")}</p>`;
  }
  return out;
}

async function raporBolumleri(env) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM rapor_bolum ORDER BY sira ASC, id ASC").all();
    return results || [];
  } catch (e) { return []; }
}

function raporYerHtml(bolumler, yer, pdfUrl) {
  const liste = bolumler.filter((b) => b.yer === yer);
  if (!liste.length) return "";
  const kartlar = liste.map((b) => `
    <article class="r-bolum">
      ${b.no || b.etiket ? `<div class="r-etiket">${esc(b.no || "")}${b.no && b.etiket ? " / " : ""}${esc(b.etiket || "")}</div>` : ""}
      ${b.baslik ? `<h3>${esc(b.baslik)}</h3>` : ""}
      ${b.alt ? `<p class="r-alt">${esc(b.alt)}</p>` : ""}
      ${raporMetinHtml(b.metin, false)}
    </article>`).join("\n");
  const pdf = pdfUrl ? `<a class="r-pdf" href="${esc(pdfUrl)}" target="_blank" rel="noopener">📄 Aygır Analiz Raporunu İndir (PDF)</a>` : "";
  const ic = `<div class="r-kap"><div class="r-icerik">${kartlar}</div><button type="button" class="about-toggle r-toggle" onclick="raporAc(this)">Devamını Oku ⌄</button></div>`;
  const y = RAPOR_YERLER[yer] || {};
  if (y.sec) {
    return `<section id="${y.sec}" class="r-sec"><div class="sec-title">${esc(y.baslik)}</div><div class="sec-line"></div>${ic}${yer === "damizlik" ? pdf : ""}</section>`;
  }
  return ic + (yer === "pedigree" ? pdf : "");
}

// ---------------- ŞAHLI AI (sadece panel) ----------------
const SAHLI_REHBER = `Sen "Şahlı AI"sın: buyukdunya.com yönetim panelinin yardımcısısın. Şahlı Harası'nın damızlık aygırı BÜYÜKDÜNYA'nın tanıtım sitesini yöneten kişilere (sahibi Güven Şahlı ve Serdar) panelin nasıl kullanılacağını anlatır, at ve rapor hakkındaki sorularını aşağıdaki bilgilere dayanarak cevaplarsın.
KURALLAR: Her zaman Türkçe, kısa, net ve adım adım anlat ("Sol menüden X'e dokun, şunu yaz, Kaydet'e bas" gibi). Bilmediğin ya da aşağıda olmayan bilgiyi uydurma; "Bu bilgi bende yok" de. Panelde bir şeyi senin yerine değiştiremezsin, sadece nasıl yapılacağını anlatırsın. Teknik terim kullanma. Fiyat/aşım ücreti sorulursa sitede fiyat yazılmadığını, WhatsApp'tan konuşulduğunu söyle.

PANEL KULLANIMI (adres: buyukdunya.com/panel; herkes kendi kullanıcı adı + şifresiyle girer — Güven Şahlı: guven, Serdar: serdar; eski ortak şifre sadece acil durum girişidir, kullanıcı adı boş bırakılır. Şifre 👤 Hesabım'dan değiştirilir. Serdar Merkez Panel'den şifresiz de girebilir. 👀 Canlı İzle bölümünü sadece Serdar görür. Telefonun geri tuşu bir önceki bölüme döner, panelden çıkarmaz; çıkmak için üstteki Çıkış. Telefonun ana ekranına logolu uygulama gibi eklenir — iPhone: Safari'de panel açıkken alttaki Paylaş → Ana Ekrana Ekle; Android: Chrome ⋮ → Ana ekrana ekle; ilk açılışta bir kez giriş yapılır; anlatım 👤 Hesabım'da da var. Sitenin açılışında arka planda tanıtım videosu oynar: Site Ayarları › 🎬 Açılış videosu'ndan değiştirilir/kaldırılır; tarayıcılar sesli açılışa izin vermediği için ses ziyaretçinin ilk dokunuşunda açılır, sağ alttaki 🔊 düğmesiyle kapatılır. Galeride her resmin altında 🎯 Odağı ayarla var: resim sitede kırpılırken dokunulan yer ortada görünür; yeni yüklenen fotoğraflarda atın yerini yapay zekâ kendisi bulur):
Sol taraftaki menüden bölüm seçilir; seçilen bölüm sağda açılır.
1) 🏆 Yarış: "Yarış Sayaçları" (Toplam Yarış, Birincilik, Grup Koşu Birinciliği, KV Birinciliği) sitenin üstündeki koyu şeritte görünen rakamlardır; değiştirip Kaydet'e basılır. "Yarış Geçmişi Ekle": Tarih, Hipodrom, Mesafe, Sonuç, Açıklama yazılıp Ekle'ye basılır; listede her kaydın Sil düğmesi vardır. Bir kayıt düzeltilecekse silinip doğrusu eklenir.
2) 📝 Metinler: Ana sayfadaki büyük fotoğrafın üstündeki küçük üst yazı ve tanıtım cümlesi; Hakkında bölümünün kalın başlığı, künye kutusu (her satır ayrı satıra yazılır) ve uzun açıklama metni. Değiştirip Kaydet.
3) ⚙️ Site Ayarları: WhatsApp numarası (sitedeki tüm WhatsApp düğmeleri ve telefon bunu kullanır), Talep Formu açıklaması, footer açıklaması ve telif yazısı (telif yazısında "Seray Tekno Yazılım" geçerse otomatik link olur). Görseller: Logo (boş bırakılırsa sadece yazı görünür, "Logoyu Kaldır" düğmesi var, yüklenen logo otomatik küçültülür), "Pistten Kanıt" bölümü fotoğrafı, Pedigree görseli (boşsa görünmez), İletişim görseli ve ana sayfada dönen 5 slayt fotoğrafı. Slayt fotoğraflarında önizlemeye dokunarak atın durduğu nokta seçilir; telefonda o nokta ortada görünür (kırmızı nokta seçilen yeri gösterir). Dosya seçip en alttaki Kaydet'e basılır.
4) 📰 Haberler: Tarih, Başlık, İçerik ve isteğe bağlı fotoğrafla haber eklenir; listeden silinir.
5) 🖼️ Galeri: Tür (Fotoğraf/Video) seçilir, "Dosya Seç" ile aynı anda birden çok fotoğraf seçilebilir, Ekle'ye basılır. Fotoğraflar otomatik küçültülüp WebP'ye çevrilir ve dosya adı yükleme tarih-saati olur. En son eklenen galeride en başta görünür. Listeden Sil ile kaldırılır.
6) 🐎 Kısraklar: Eşleşen kısrak adı, sahibi, açıklama/pedigri, tay bilgisi ve fotoğraf eklenir.
7) 📑 Rapor: Aygır Analiz Raporu'nun bölümleri. Her bölümün Düzenle düğmesi vardır: Bölüm no, Etiket, Başlık, Alt başlık, "Sitede yeri" (Hakkında, Yarış Analizi, Pedigree, Eşleşme Rehberi, Damızlık ya da Sitede gösterme) ve Metin. Metin yazım kuralları: "## " ile başlayan satır ara başlık; "!! 16 / 32 | Yarış galibiyeti" rakam kutusu; içinde " | " olan alt alta satırlar tablo olur (ilk satır tablo başlığı); "- " madde; "~ " kaynak notu; **kelime** kalın; boş satır yeni paragraf; satırın başına "[gizli] " yazılırsa o satır sitede görünmez ama panelde durur. Yeni bölüm eklenebilir, silinebilir; Sıra numarası küçük olan önce gösterilir. Aynı sayfada rapor PDF'i yüklenir; sitede "Raporu İndir (PDF)" düğmesi çıkar.
8) 📩 Talepler: Sitedeki talep formundan gelen kısrak eşleştirme talepleri (ad, telefon, kısrak, mesaj) ve WhatsApp düğmesi tıklanma sayıları.
9) 🤖 Şahlı AI: Bu sohbet.
10) 🌐 Siteyi Aç: Siteyi yeni sekmede açar. Yapılan değişiklik sitede en geç 1 dakika içinde görünür.
Sorun olursa: Sayfayı yenilemek; görünmüyorsa 1 dakika beklemek; yine olmazsa Serdar'a (Seray Tekno Yazılım) haber vermek.

SIK SORULANLAR (bunları aynen bu adımlarla anlat):
- Rapordaki gizli bir satırı sitede göstermek: Sol menü → 📑 Rapor → ilgili bölümün "Düzenle" düğmesi → Metin kutusunda o satırın başındaki "[gizli] " yazısını sil → Kaydet. Gizlemek için de satırın başına "[gizli] " yazılır.
- Galeriye fotoğraf eklemek: 🖼️ Galeri → "Dosya Seç" ile bir ya da birden çok fotoğraf seç → Ekle.
- Ana sayfadaki dönen fotoğrafı değiştirmek: ⚙️ Site Ayarları → Hero slayt görselleri → ilgili "Dosya Seç" → en alttaki Kaydet. Atın yerini ayarlamak için önizlemede atın üstüne dokun, sonra Kaydet.
- Yarış sayısını güncellemek: 🏆 Yarış → Yarış Sayaçları → rakamları değiştir → Kaydet.
- Raporun bir bölümünü sitede başka yere taşımak ya da kaldırmak: 📑 Rapor → Düzenle → "Sitede yeri" listesinden yeni yeri ya da "Sitede gösterme"yi seç → Kaydet.
- Yeni PDF koymak: 📑 Rapor → Rapor PDF → Dosya seç → PDF Yükle.
- WhatsApp numarasını değiştirmek: ⚙️ Site Ayarları → WhatsApp numarası → Kaydet.`;

async function sahliBaglam(env) {
  const parca = [];
  try {
    const ic = await getSiteIcerik(env);
    parca.push("SİTE METİNLERİ:\nHakkında başlığı: " + (ic.hakkinda_baslik || "") + "\nKünye:\n" + (ic.hakkinda_kunye || "") + "\nHakkında metni:\n" + (ic.hakkinda_metin || "") + "\nWhatsApp: " + (ic.whatsapp_no || ""));
    const p = await env.DB.prepare("SELECT * FROM profile WHERE id=1").first();
    if (p) parca.push(`SAYAÇLAR: ${p.toplam_yaris} yarış, ${p.birincilik} birincilik, ${p.grup_galibiyeti} grup koşusu birinciliği, ${p.kv_galibiyeti} KV birinciliği.`);
    const yg = (await env.DB.prepare("SELECT * FROM yaris_gecmisi ORDER BY sira ASC, id ASC").all()).results || [];
    parca.push("YARIŞ GEÇMİŞİ:\n" + yg.map((y) => `${y.tarih} · ${y.hipodrom} · ${y.mesafe} · ${y.sonuc} · ${y.aciklama || ""}`).join("\n"));
    const say = async (t) => ((await env.DB.prepare(`SELECT COUNT(*) n FROM ${t}`).first()) || {}).n;
    parca.push(`KAYIT SAYILARI: galeri ${await say("gallery")}, haber ${await say("news")}, kısrak ${await say("kisraklar")}, talep ${await say("talepler")}.`);
    const rb = await raporBolumleri(env);
    parca.push("AYGIR ANALİZ RAPORU (\"[gizli]\" ile başlayan satırlar sitede gösterilmiyor, sadece panelde duruyor):\n" + rb.map((b) => `--- ${b.no} / ${b.etiket} · ${b.baslik} (sitede yeri: ${(RAPOR_YERLER[b.yer] || {}).ad || b.yer})\n${b.alt || ""}\n${b.metin}`).join("\n"));
  } catch (e) {}
  return parca.join("\n\n").slice(0, 30000);
}

const PANEL_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Büyükdünya - Yönetim Paneli</title>
<link rel="manifest" href="/panel/manifest.json">
<link rel="apple-touch-icon" href="/panel-ikon/ikon-180.png">
<link rel="icon" type="image/png" href="/panel-ikon/ikon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Büyükdünya">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#47952a">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background:#f2f2f2; margin:0; padding:0; color:#262626; }
  header { background:#47952a; color:#fff; padding:16px 20px; }
  header h1 { margin:0; font-size:18px; }
  .wrap { max-width:700px; margin:0 auto; padding:16px; }
  .card { background:#fff; border-radius:6px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .card h2 { font-size:16px; margin-top:0; border-bottom:2px solid #47952a; padding-bottom:8px; }
  label { display:block; font-size:13px; font-weight:bold; margin:10px 0 4px; }
  input[type=text], input[type=number], input[type=password], textarea, select {
    width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px;
  }
  textarea { min-height:80px; }
  button { background:#47952a; color:#fff; border:none; padding:10px 16px; border-radius:4px; font-size:14px; cursor:pointer; margin-top:10px; }
  button.secondary { background:#888; }
  button.danger { background:#c0392b; }
  .item { border:1px solid #eee; border-radius:4px; padding:10px; margin-bottom:10px; }
  .item img, .item video { max-width:100%; max-height:120px; display:block; margin-bottom:6px; }
  .row { display:flex; gap:8px; flex-wrap:wrap; }
  .row > * { flex:1; }
  .msg { font-size:13px; padding:8px; border-radius:4px; margin-top:8px; }
  .msg.ok { background:#e6f4ea; color:#1e7e34; }
  .msg.err { background:#fdecea; color:#c0392b; }
  #login-screen { max-width:320px; margin:60px auto; }
  .hidden { display:none; }
  .uploading { opacity:0.6; }
  header { display:flex; align-items:center; gap:10px; height:56px; padding:0 16px; }
  .layout { display:flex; align-items:stretch; height:calc(100vh - 56px); }
  @supports (height:100dvh) { .layout { height:calc(100dvh - 56px); } }
  .side { width:86px; flex-shrink:0; background:#2f6b1f; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; }
  .side a { display:block; color:#eef6e8; text-align:center; text-decoration:none; padding:14px 4px; font-size:11.5px; font-weight:600; line-height:1.25; border-left:3px solid transparent; cursor:pointer; }
  .side a .mi { display:block; font-size:26px; line-height:1; margin-bottom:5px; }
  .side a.active { background:#fff; color:#2f6b1f; border-left-color:#47952a; }
  .layout .wrap { flex:1; min-width:0; max-width:none; margin:0; height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .layout .wrap > .card { max-width:760px; }
  .card.hide { display:none; }
  .wrap img { cursor:zoom-in; }
  .wrap .odak img { cursor:crosshair; }
  .lb { position:fixed; inset:0; background:rgba(0,0,0,.92); z-index:3000; display:none; align-items:center; justify-content:center; }
  .lb.acik { display:flex; }
  .lb img { max-width:96vw; max-height:90vh; object-fit:contain; border-radius:8px; }
  .lb b { position:absolute; top:12px; right:16px; color:#fff; font-size:30px; cursor:pointer; }
  .odak { position:relative; display:inline-block; cursor:crosshair; margin-bottom:6px; }
  .odak img { display:block; max-width:100%; max-height:130px; border-radius:6px; }
  .odak i { position:absolute; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; background:#e53935; border:2px solid #fff; box-shadow:0 0 4px rgba(0,0,0,.6); pointer-events:none; }
  .ipucu { font-size:12px; color:#666; margin:2px 0 8px; }
  .kirp { width:200px; max-width:100%; aspect-ratio:4/3; overflow:hidden; border-radius:6px; margin-bottom:6px; }
  .kirp img { width:100%; height:100%; object-fit:cover; max-height:none; margin:0; }
  .item .odak img { max-height:none; max-width:100%; }
  .rb-item { display:flex; justify-content:space-between; align-items:center; gap:8px; border:1px solid #eee; border-radius:6px; padding:10px; margin-bottom:8px; }
  .rb-item small { color:#777; display:block; }
  .rb-item button { margin-top:0; padding:8px 12px; }
  .yardim { background:#f4f8f1; border:1px solid #d8e6cf; border-radius:6px; padding:10px 12px; font-size:13px; line-height:1.7; }
  .yardim code { background:#fff; border:1px solid #ddd; border-radius:4px; padding:0 4px; }
  #r-onizleme { border:1px dashed #bbb; border-radius:6px; padding:10px; margin-top:10px; font-size:14px; overflow-x:auto; }
  #r-onizleme table { border-collapse:collapse; font-size:12px; } #r-onizleme td, #r-onizleme th { border:1px solid #ddd; padding:4px 6px; }
  .ai-kutu { height:52vh; overflow-y:auto; background:#f7f7f7; border-radius:6px; padding:10px; margin-bottom:10px; }
  .ai-m { padding:9px 12px; border-radius:12px; margin:6px 0; max-width:88%; white-space:pre-wrap; line-height:1.5; font-size:14px; }
  .ai-m.sen { background:#47952a; color:#fff; margin-left:auto; }
  .ai-m.o { background:#fff; border:1px solid #e3e3e3; }
  header h1 { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ust-kim { font-size:12px; white-space:nowrap; opacity:.95; }
  .ust-cik { background:rgba(255,255,255,.18); color:#fff; border:1px solid rgba(255,255,255,.4); padding:6px 10px; border-radius:6px; font-size:12px; text-decoration:none; white-space:nowrap; }
  .destek { background:#fff3cd; color:#7a5a00; font-size:12px; padding:5px 12px; text-align:center; }
  .side a.dev-yok { display:none; }
  .kisi { display:flex; align-items:center; gap:10px; border:1px solid #eee; border-radius:8px; padding:10px; margin-bottom:8px; cursor:pointer; }
  .kisi.sec { border-color:#47952a; background:#f4f8f1; }
  .kisi .nokta { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
  .nokta.yesil { background:#2e9e44; box-shadow:0 0 0 3px #d6f0db; } .nokta.sari { background:#e0a800; } .nokta.kirmizi { background:#c9c9c9; }
  .kisi small { color:#777; display:block; font-size:12px; }
  .akis { max-height:55vh; overflow-y:auto; border:1px solid #eee; border-radius:8px; }
  .akis div { padding:7px 10px; border-bottom:1px solid #f1f1f1; font-size:13px; line-height:1.4; }
  .akis div.yeni { background:#fffbe6; }
  .akis .zm { color:#888; font-size:12px; margin-right:6px; }
  .akis .tr { display:inline-block; min-width:22px; }
  .canli-ust { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
  .canli-ust button, .canli-ust input { margin-top:0; width:auto; }
  #panel.destekli .layout { height:calc(100vh - 82px); }
  @supports (height:100dvh) { #panel.destekli .layout { height:calc(100dvh - 82px); } }
  @media (max-width:600px) { .ust-kim { display:none; } }
  @media (max-width:600px) { header h1 { font-size:16px; } .side { width:76px; } .side a { font-size:11px; padding:12px 2px; } .layout .wrap { padding:10px; } }
</style>
</head>
<body>

<div id="login-screen" class="card">
  <h2>Panel Girişi</h2>
  <label>Kullanıcı adı</label>
  <input type="text" id="login-kadi" autocomplete="username" autocapitalize="none" spellcheck="false">
  <label>Şifre</label>
  <input type="password" id="login-password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()">
  <button onclick="login()" style="width:100%">Giriş Yap</button>
  <div class="ipucu" style="margin-top:8px">Acil durumda kullanıcı adını boş bırakıp ortak şifreyle girilebilir.</div>
  <div id="login-msg"></div>
</div>

<div id="panel" class="hidden">
  <header><h1>Büyükdünya - Yönetim Paneli</h1><span class="ust-kim" id="ust-kim"></span><a class="ust-cik" href="/panel/logout">Çıkış</a></header>
  <div class="destek hidden" id="destek-serit">🛟 Seray Tekno Destek — Merkez'den girildi</div>
  <div class="layout">
  <nav class="side" id="side">
    <a data-sec="yaris" onclick="showSec('yaris')"><span class="mi">🏆</span>Yarış</a>
    <a data-sec="metin" onclick="showSec('metin')"><span class="mi">📝</span>Metinler</a>
    <a data-sec="ayar" onclick="showSec('ayar')"><span class="mi">⚙️</span>Site Ayarları</a>
    <a data-sec="haber" onclick="showSec('haber')"><span class="mi">📰</span>Haberler</a>
    <a data-sec="galeri" onclick="showSec('galeri')"><span class="mi">🖼️</span>Galeri</a>
    <a data-sec="kisrak" onclick="showSec('kisrak')"><span class="mi">🐎</span>Kısraklar</a>
    <a data-sec="rapor" onclick="showSec('rapor')"><span class="mi">📑</span>Rapor</a>
    <a data-sec="talep" onclick="showSec('talep')"><span class="mi">📩</span>Talepler</a>
    <a data-sec="ai" onclick="showSec('ai')"><span class="mi">🤖</span>Şahlı AI</a>
    <a data-sec="canli" onclick="showSec('canli')" class="dev-yok" id="nav-canli"><span class="mi">👀</span>Canlı İzle</a>
    <a data-sec="hesap" onclick="showSec('hesap')"><span class="mi">👤</span>Hesabım</a>
    <a href="/" target="_blank"><span class="mi">🌐</span>Siteyi Aç</a>
  </nav>
  <div class="wrap">

    <div class="card" data-sec="yaris">
      <h2>Yarış Sayaçları</h2>
      <div class="row">
        <div><label>Toplam Yarış</label><input type="number" id="p-toplam"></div>
        <div><label>Birincilik</label><input type="number" id="p-birincilik"></div>
      </div>
      <div class="row">
        <div><label>Grup Koşu Birinciliği</label><input type="number" id="p-grup"></div>
        <div><label>KV Birinciliği</label><input type="number" id="p-kv"></div>
      </div>
      <button onclick="saveProfile()">Kaydet</button>
      <div id="profile-msg"></div>
    </div>

    <div class="card" data-sec="yaris">
      <h2>Yarış Geçmişi Ekle</h2>
      <label>Tarih</label>
      <input type="text" id="yg-tarih" placeholder="örn. 19 Nisan 2023">
      <label>Hipodrom</label>
      <input type="text" id="yg-hipodrom" placeholder="örn. İstanbul">
      <label>Mesafe (opsiyonel)</label>
      <input type="text" id="yg-mesafe" placeholder="örn. 1900m Çim">
      <label>Sonuç / Derece</label>
      <input type="text" id="yg-sonuc" placeholder="örn. 1. Geldi">
      <label>Açıklama (opsiyonel)</label>
      <textarea id="yg-aciklama"></textarea>
      <button onclick="addYarisGecmisi()">Ekle</button>
      <div id="yaris-gecmisi-msg"></div>
    </div>

    <div class="card" data-sec="yaris">
      <h2>Yarış Geçmişi Listesi</h2>
      <div id="yaris-gecmisi-list"></div>
    </div>

    <div class="card" data-sec="metin">
      <h2>Site Metinleri</h2>
      <label>Hero üst yazı (küçük başlık)</label>
      <input type="text" id="si-eyebrow">
      <label>Hero alt yazı (tanıtım cümlesi)</label>
      <textarea id="si-tagline"></textarea>
      <label>Hakkında - kalın başlık</label>
      <input type="text" id="si-hbaslik">
      <label>Hakkında - Künye (Baba, Anne, Yarış Kariyeri özeti)</label>
      <textarea id="si-hkunye" placeholder="örn. Baba: Kaizbert (Zador) (RU), 1993&#10;Anne: Rihem, 2013&#10;Yarış Kariyeri: 32 yarış, 16 birincilik, 2 Grup Koşu birinciliği, 11 KV birinciliği"></textarea>
      <label>Hakkında - açıklama metni</label>
      <textarea id="si-hmetin"></textarea>
      <button onclick="saveSiteIcerik()">Kaydet</button>
      <div id="site-icerik-msg"></div>
    </div>

    <div class="card" data-sec="ayar">
      <h2>Site Ayarları (WhatsApp, Footer, Görseller)</h2>
      <label>WhatsApp / Telefon numarası</label>
      <input type="text" id="sa-wano" placeholder="05XX XXX XX XX">
      <label>Talep Formu üstündeki açıklama</label>
      <textarea id="sa-talep"></textarea>
      <label>Footer açıklama paragrafı</label>
      <textarea id="sa-faciklama"></textarea>
      <label>Footer telif (copyright) yazısı</label>
      <input type="text" id="sa-ftelif">

      <label>Logo (header, opsiyonel - boş bırakılırsa sadece yazı görünür)</label>
      <div id="sa-logo-prev"></div>
      <input type="file" id="sa-logo-dosya" accept="image/*">
      <button type="button" class="secondary" onclick="clearLogo()">Logoyu Kaldır</button>

      <label>🎬 Açılış videosu (sitenin en üstünde arka planda oynar)</label>
      <div id="sa-video-prev" class="ipucu"></div>
      <input type="file" id="sa-video-dosya" accept="video/mp4">
      <div class="ipucu">MP4, en çok 25 MB önerilir (büyük video telefonda geç açılır). Boş bırakırsan mevcut video kalır.</div>
      <label style="font-weight:normal"><input type="checkbox" id="sa-video-ses" style="width:auto"> Ziyaretçi sayfaya ilk dokunduğunda ses açılsın (tarayıcılar sitenin sesli açılmasına izin vermez; ziyaretçi 🔊 ile kapatabilir)</label>
      <button type="button" class="secondary" onclick="videoKaldir()">Videoyu Kaldır</button>

      <label>"Pistten Kanıt" bölümü fotoğrafı</label>
      <div id="sa-perf-prev"></div>
      <input type="file" id="sa-perf-dosya" accept="image/*">

      <label>Pedigree görseli (boşsa sitede görünmez)</label>
      <div id="sa-pedigree-prev"></div>
      <input type="file" id="sa-pedigree-dosya" accept="image/*">

      <label>İletişim görseli</label>
      <div id="sa-iletisim-prev"></div>
      <input type="file" id="sa-iletisim-dosya" accept="image/*">

      <label>Hero kayan slayt görselleri (5 adet)</label>
      <div class="ipucu">Her fotoğrafta atın durduğu yere dokun: kırmızı nokta telefonda ekranın ortasında görünür. Sonra en alttaki Kaydet'e bas.</div>
      <div class="row">
        <div><div id="sa-slide1-prev"></div><input type="file" id="sa-slide1-dosya" accept="image/*"></div>
        <div><div id="sa-slide2-prev"></div><input type="file" id="sa-slide2-dosya" accept="image/*"></div>
      </div>
      <div class="row">
        <div><div id="sa-slide3-prev"></div><input type="file" id="sa-slide3-dosya" accept="image/*"></div>
        <div><div id="sa-slide4-prev"></div><input type="file" id="sa-slide4-dosya" accept="image/*"></div>
      </div>
      <div class="row">
        <div><div id="sa-slide5-prev"></div><input type="file" id="sa-slide5-dosya" accept="image/*"></div>
      </div>

      <button onclick="saveSiteAyarlar()">Kaydet</button>
      <div id="site-ayarlar-msg"></div>
    </div>

    <div class="card" data-sec="haber">
      <h2>Yeni Haber Ekle</h2>
      <label>Tarih</label>
      <input type="text" id="n-tarih" placeholder="örn. 14 Kasım 2026">
      <label>Başlık</label>
      <input type="text" id="n-baslik">
      <label>İçerik</label>
      <textarea id="n-icerik"></textarea>
      <label>Fotoğraf (opsiyonel)</label>
      <input type="file" id="n-foto" accept="image/*">
      <button onclick="addNews()">Ekle</button>
      <div id="news-msg"></div>
    </div>

    <div class="card" data-sec="haber">
      <h2>Haberler Listesi</h2>
      <div id="news-list"></div>
    </div>

    <div class="card" data-sec="galeri">
      <h2>Galeriye Ekle</h2>
      <label>Tür</label>
      <select id="g-tip"><option value="foto">Fotoğraf</option><option value="video">Video</option></select>
      <label>Dosya</label>
      <input type="file" id="g-dosya" accept="image/*,video/*" multiple>
      <label>Başlık (opsiyonel)</label>
      <input type="text" id="g-baslik">
      <button onclick="addGallery()">Ekle</button>
      <div id="gallery-msg"></div>
    </div>

    <div class="card" data-sec="galeri">
      <h2>Galeri Listesi</h2>
      <div id="gallery-list"></div>
    </div>

    <div class="card" data-sec="kisrak">
      <h2>Kısrak Ekle</h2>
      <label>Kısrak Adı</label>
      <input type="text" id="k-adi">
      <label>Sahibi (opsiyonel)</label>
      <input type="text" id="k-sahip">
      <label>Açıklama / Pedigri bağlantısı</label>
      <textarea id="k-aciklama"></textarea>
      <label>Tay bilgisi (opsiyonel)</label>
      <input type="text" id="k-tay" placeholder="örn. 2026 doğumlu erkek tay">
      <label>Fotoğraf (opsiyonel)</label>
      <input type="file" id="k-foto" accept="image/*">
      <button onclick="addKisrak()">Ekle</button>
      <div id="kisrak-msg"></div>
    </div>

    <div class="card" data-sec="kisrak">
      <h2>Kısraklar Listesi</h2>
      <div id="kisrak-list"></div>
    </div>

    <div class="card" data-sec="rapor">
      <h2>Aygır Analiz Raporu - Bölümler</h2>
      <div id="rapor-list"></div>
      <button onclick="raporYeni()">+ Yeni Bölüm</button>
    </div>

    <div class="card" data-sec="rapor" id="rapor-edit-card">
      <h2 id="r-form-baslik">Bölüm Düzenle</h2>
      <input type="hidden" id="r-id">
      <div class="row">
        <div><label>Sıra</label><input type="number" id="r-sira"></div>
        <div><label>Bölüm no</label><input type="text" id="r-no" placeholder="örn. 05"></div>
      </div>
      <label>Etiket</label><input type="text" id="r-etiket" placeholder="örn. BEŞ KUŞAK PEDİGRİ">
      <label>Başlık</label><input type="text" id="r-baslik">
      <label>Alt başlık</label><input type="text" id="r-alt">
      <label>Sitede yeri</label><select id="r-yer"></select>
      <label>Metin</label>
      <textarea id="r-metin" style="min-height:320px; font-family:monospace; font-size:13px;"></textarea>
      <div class="row">
        <button onclick="raporKaydet()">Kaydet</button>
        <button class="secondary" onclick="raporOnizle()">Önizle</button>
      </div>
      <div id="rapor-msg"></div>
      <div id="r-onizleme" style="display:none"></div>
      <div class="yardim" style="margin-top:12px">
        <b>Yazım kuralları</b><br>
        <code>## Başlık</code> → ara başlık<br>
        <code>!! 16 / 32 | Yarış galibiyeti</code> → büyük rakam kutusu<br>
        <code>Kum | 14 / 25 | %56</code> → alt alta yazılan bu satırlar tablo olur (ilk satır tablo başlığı)<br>
        <code>- madde</code> → madde işareti · <code>~ Kaynaklar [1]</code> → küçük kaynak notu<br>
        <code>**kelime**</code> → kalın · boş satır → yeni paragraf<br>
        <code>[gizli] </code> satırın başına yazılırsa o satır sitede görünmez, panelde durur.
      </div>
    </div>

    <div class="card" data-sec="rapor">
      <h2>Rapor PDF</h2>
      <div id="r-pdf-durum" class="ipucu"></div>
      <input type="file" id="r-pdf-dosya" accept="application/pdf">
      <div class="row">
        <button onclick="raporPdfYukle()">PDF Yükle</button>
        <button class="secondary" onclick="raporPdfKaldir()">PDF'i Kaldır</button>
      </div>
      <div id="rapor-pdf-msg"></div>
    </div>

    <div class="card" data-sec="canli">
      <h2>👀 Kimler panelde?</h2>
      <div class="ipucu">🟢 şu an açık (son 2 dk) · 🟡 son 10 dk · ⚪ çevrimdışı. Bir kişiye dokununca sadece onun hareketleri gelir.</div>
      <div id="canli-kisiler"></div>
    </div>
    <div class="card" data-sec="canli">
      <h2 id="canli-baslik">🔴 Canlı akış — herkes</h2>
      <div class="canli-ust">
        <button class="secondary" onclick="canliKisiSec(null)">Herkes</button>
        <input type="date" id="canli-gun" onchange="canliGunSec()" style="max-width:170px">
        <button class="secondary" onclick="canliBugun()">Canlıya dön</button>
      </div>
      <div class="ipucu" id="canli-durum"></div>
      <div class="akis" id="canli-akis"></div>
    </div>

    <div class="card" data-sec="hesap">
      <h2>👤 Hesabım</h2>
      <div id="hesap-bilgi" class="ipucu"></div>
      <div class="yardim" style="margin:8px 0 12px">📲 <b>Telefonun ana ekranına ekle</b> (logolu, uygulama gibi açılır)<br>
        <b>iPhone:</b> Safari'de bu sayfayı aç → alttaki <b>Paylaş</b> (kare ve yukarı ok) → <b>Ana Ekrana Ekle</b> → Ekle. İlk açılışta bir kez kullanıcı adı ve şifreyle giriş yapılır.<br>
        <b>Android:</b> Chrome'da sağ üstteki ⋮ → <b>Ana ekrana ekle</b>.</div>
      <div id="hesap-sifre-kutu">
        <label>Eski şifre</label><input type="password" id="h-eski" autocomplete="current-password">
        <label>Yeni şifre (en az 6 karakter)</label><input type="password" id="h-yeni" autocomplete="new-password">
        <button onclick="sifreDegistir()">Şifremi Değiştir</button>
        <div id="hesap-msg"></div>
      </div>
    </div>

    <div class="card" data-sec="ai">
      <h2>🤖 Şahlı AI</h2>
      <div class="ipucu">Panelin kullanımını, raporu ve Büyükdünya ile ilgili bilgileri sorabilirsin. Örn: "Galeriye nasıl fotoğraf eklerim?"</div>
      <div class="ai-kutu" id="ai-kutu"></div>
      <textarea id="ai-soru" style="min-height:60px" placeholder="Sorunu yaz..."></textarea>
      <div class="row">
        <button onclick="aiGonder()" id="ai-btn">Gönder</button>
        <button class="secondary" onclick="aiTemizle()">Sohbeti Temizle</button>
      </div>
    </div>

    <div class="card" data-sec="talep">
      <h2>Gelen Talepler</h2>
      <div id="talep-list"></div>
    </div>

    <div class="card" data-sec="talep">
      <h2>WhatsApp Tıklamaları</h2>
      <div id="wa-stats">Yükleniyor...</div>
    </div>

  </div>
  </div>
</div>

<div class="lb" id="lb" onclick="this.classList.remove('acik')"><b>✕</b><img id="lb-img" alt=""></div>
<script>
document.addEventListener("click", function (e) {
  const t = e.target;
  if (t.tagName !== "IMG" || !t.closest(".wrap") || t.closest(".odak")) return;
  document.getElementById("lb-img").src = t.currentSrc || t.src;
  document.getElementById("lb").classList.add("acik");
});
function showSec(sec, gecmistenMi) {
  if (!gecmistenMi && sec !== SEKME && BEN) { try { history.pushState({ bd: 1, sec: sec }, "", "#" + sec); } catch (e) {} }
  document.querySelectorAll(".card[data-sec]").forEach(function (c) { c.classList.toggle("hide", c.dataset.sec !== sec); });
  document.querySelectorAll(".side a[data-sec]").forEach(function (a) { a.classList.toggle("active", a.dataset.sec === sec); });
  const w = document.querySelector(".layout .wrap"); if (w) w.scrollTop = 0;
  try { localStorage.setItem("panelSec", sec); } catch (e) {}
  SEKME = sec; nabiz();
  if (sec === "canli") canliBaslat(); else canliDurdur();
}

function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.className = "msg " + (ok ? "ok" : "err");
  el.textContent = text;
  setTimeout(() => { el.textContent = ""; }, 4000);
}

async function login() {
  const password = document.getElementById("login-password").value;
  const kadi = document.getElementById("login-kadi").value.trim();
  const govde = kadi ? { kadi: kadi, sifre: password } : { password: password };
  const r = await fetch("/panel/login", { method: "POST", body: JSON.stringify(govde), headers: { "Content-Type": "application/json" } });
  if (r.ok) {
    if (await panelAc()) { korumaKur(); anaEkranTarifi(); }
  } else {
    let m = "Şifre hatalı"; try { m = (await r.json()).error || m; } catch (e) {}
    showMsg("login-msg", m, false);
  }
}

async function loadAll() {
  let ilk = "yaris";
  try { ilk = localStorage.getItem("panelSec") || "yaris"; } catch (e) {}
  showSec(ilk);
  const p = await (await fetch("/api/profile")).json();
  document.getElementById("p-toplam").value = p.toplam_yaris;
  document.getElementById("p-birincilik").value = p.birincilik;
  document.getElementById("p-grup").value = p.grup_galibiyeti;
  document.getElementById("p-kv").value = p.kv_galibiyeti;
  loadNews();
  loadYarisGecmisi();
  loadGallery();
  loadKisrak();
  loadTalepler();
  loadWaStats();
  loadSiteIcerik();
  loadSiteAyarlar();
  loadRapor();
}

async function loadSiteIcerik() {
  const d = await (await fetch("/api/site-icerik")).json();
  document.getElementById("si-eyebrow").value = d.hero_eyebrow || "";
  document.getElementById("si-tagline").value = d.hero_tagline || "";
  document.getElementById("si-hbaslik").value = d.hakkinda_baslik || "";
  document.getElementById("si-hkunye").value = d.hakkinda_kunye || "";
  document.getElementById("si-hmetin").value = d.hakkinda_metin || "";
}

async function saveSiteIcerik() {
  const body = {
    hero_eyebrow: document.getElementById("si-eyebrow").value,
    hero_tagline: document.getElementById("si-tagline").value,
    hakkinda_baslik: document.getElementById("si-hbaslik").value,
    hakkinda_kunye: document.getElementById("si-hkunye").value,
    hakkinda_metin: document.getElementById("si-hmetin").value,
  };
  const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  showMsg("site-icerik-msg", r.ok ? "Kaydedildi" : "Hata oluştu", r.ok);
}

function absUrl(u) {
  if (!u) return "";
  return /^https?:\\/\\//.test(u) ? u : "/" + u.replace(/^\\/+/, "");
}

async function loadSiteAyarlar() {
  const d = await (await fetch("/api/site-icerik")).json();
  document.getElementById("sa-wano").value = d.whatsapp_no || "";
  document.getElementById("sa-talep").value = d.talep_aciklama || "";
  document.getElementById("sa-faciklama").value = d.footer_aciklama || "";
  document.getElementById("sa-ftelif").value = d.footer_telif || "";
  const previews = {
    "sa-logo-prev": d.logo_img,
    "sa-pedigree-prev": d.pedigree_img,
    "sa-iletisim-prev": d.iletisim_img,
    "sa-perf-prev": d.perf_img,
    "sa-slide1-prev": d.hero_slide1,
    "sa-slide2-prev": d.hero_slide2,
    "sa-slide3-prev": d.hero_slide3,
    "sa-slide4-prev": d.hero_slide4,
    "sa-slide5-prev": d.hero_slide5,
  };
  for (const [id, url] of Object.entries(previews)) {
    const el = document.getElementById(id);
    el.innerHTML = url ? '<img src="' + absUrl(url) + '" style="max-width:100%; max-height:100px; display:block; margin-bottom:6px; border-radius:6px;">' : '';
  }
  document.getElementById("sa-video-prev").innerHTML = d.hero_video ? '<video src="' + absUrl(d.hero_video) + '" muted controls playsinline style="max-width:100%;max-height:160px;border-radius:6px"></video>' : "Video yok — açılışta fotoğraflar sırayla gösterilir.";
  document.getElementById("sa-video-ses").checked = d.hero_video_ses !== "0";
  window._heroPos = {};
  for (let n = 1; n <= 5; n++) {
    const url = d["hero_slide" + n];
    const el = document.getElementById("sa-slide" + n + "-prev");
    window._heroPos[n] = d["hero_pos" + n] || "50% 50%";
    if (!url) continue;
    el.innerHTML = '<div class="odak" data-n="' + n + '"><img src="' + absUrl(url) + '"><i></i></div>';
    odakNokta(n);
    el.firstChild.addEventListener("click", function (ev) {
      const r = this.getBoundingClientRect();
      const x = Math.round(((ev.clientX - r.left) / r.width) * 100);
      const y = Math.round(((ev.clientY - r.top) / r.height) * 100);
      window._heroPos[n] = Math.max(0, Math.min(100, x)) + "% " + Math.max(0, Math.min(100, y)) + "%";
      odakNokta(n);
    });
  }
  window._saCurrent = d;
}

function odakNokta(n) {
  const kap = document.querySelector('.odak[data-n="' + n + '"]');
  if (!kap) return;
  let p = (window._heroPos[n] || "50% 50%").split(" ");
  if (p[0] === "center") p = ["50%", "50%"];
  kap.querySelector("i").style.left = p[0];
  kap.querySelector("i").style.top = p[1] || "50%";
}

async function videoKaldir() {
  if (!confirm("Açılış videosu kaldırılsın mı? Yerine fotoğraflar gösterilir.")) return;
  const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify({ hero_video: "", hero_video_poster: "" }), headers: { "Content-Type": "application/json" } });
  showMsg("site-ayarlar-msg", r.ok ? "Video kaldırıldı" : "Hata oluştu", r.ok);
  if (r.ok) loadSiteAyarlar();
}

async function clearLogo() {
  if (!confirm("Logo kaldırılsın mı? Header'da sadece yazı görünecek.")) return;
  const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify({ logo_img: "" }), headers: { "Content-Type": "application/json" } });
  showMsg("site-ayarlar-msg", r.ok ? "Logo kaldırıldı" : "Hata oluştu", r.ok);
  if (r.ok) loadSiteAyarlar();
}

async function saveSiteAyarlar() {
  try {
    const body = {
      whatsapp_no: document.getElementById("sa-wano").value.replace(/\\D/g, ""),
      talep_aciklama: document.getElementById("sa-talep").value,
      footer_aciklama: document.getElementById("sa-faciklama").value,
      footer_telif: document.getElementById("sa-ftelif").value,
    };
    const fileMap = {
      logo_img: "sa-logo-dosya",
      pedigree_img: "sa-pedigree-dosya",
      iletisim_img: "sa-iletisim-dosya",
      perf_img: "sa-perf-dosya",
      hero_slide1: "sa-slide1-dosya",
      hero_slide2: "sa-slide2-dosya",
      hero_slide3: "sa-slide3-dosya",
      hero_slide4: "sa-slide4-dosya",
      hero_slide5: "sa-slide5-dosya",
    };
    for (const [key, inputId] of Object.entries(fileMap)) {
      const input = document.getElementById(inputId);
      if (input.files[0]) {
        const f = key === "logo_img" ? await resizeImageFile(input.files[0], 300, 150) : await resizeToWebp(input.files[0], 2000, 2000, 0.85);
        body[key] = await uploadFile(f);
      } else if (window._saCurrent && window._saCurrent[key]) {
        body[key] = window._saCurrent[key];
      }
    }
    for (let n = 1; n <= 5; n++) {
      if (document.getElementById("sa-slide" + n + "-dosya").files[0]) body["hero_pos" + n] = "oto";
      else if (window._heroPos && window._heroPos[n]) body["hero_pos" + n] = window._heroPos[n];
    }
    if (document.getElementById("sa-perf-dosya").files[0]) body.perf_pos = "oto";
    const vd = document.getElementById("sa-video-dosya").files[0];
    if (vd) {
      if (vd.size > 60 * 1024 * 1024) throw new Error("Video çok büyük (en çok 60 MB)");
      showMsg("site-ayarlar-msg", "Video yükleniyor…", true);
      body.hero_video = await uploadFile(vd);
      body.hero_video_poster = "";
    }
    body.hero_video_ses = document.getElementById("sa-video-ses").checked ? "1" : "0";
    const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("site-ayarlar-msg", r.ok ? "Kaydedildi" : "Hata oluştu", r.ok);
    if (r.ok) loadSiteAyarlar();
  } catch (e) { showMsg("site-ayarlar-msg", e.message, false); }
}

let RAPOR = [], RAPOR_YER = {};
async function loadRapor() {
  const r = await fetch("/api/rapor");
  if (!r.ok) return;
  const d = await r.json();
  RAPOR = d.bolumler || []; RAPOR_YER = d.yerler || {};
  const sel = document.getElementById("r-yer");
  sel.innerHTML = Object.keys(RAPOR_YER).map(function (k) { return '<option value="' + k + '">' + RAPOR_YER[k].ad + '</option>'; }).join("");
  const el = document.getElementById("rapor-list");
  el.innerHTML = RAPOR.map(function (b) {
    const yer = (RAPOR_YER[b.yer] || {}).ad || b.yer;
    return '<div class="rb-item"><div><strong>' + escH(b.no) + ' · ' + escH(b.baslik) + '</strong><small>' + escH(b.etiket) + ' — ' + escH(yer) + '</small></div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0"><button onclick="raporDuzenle(' + b.id + ')">Düzenle</button><button class="danger" onclick="raporSil(' + b.id + ')">Sil</button></div></div>';
  }).join("") || "<p>Henüz bölüm yok.</p>";
  const s = await (await fetch("/api/site-icerik")).json();
  window._raporPdf = s.rapor_pdf || "";
  document.getElementById("r-pdf-durum").innerHTML = window._raporPdf ? 'Yüklü PDF: <a href="' + window._raporPdf + '" target="_blank">aç</a>' : "Henüz PDF yüklenmedi.";
  if (!document.getElementById("r-id").value && RAPOR.length) raporDuzenle(RAPOR[0].id, true);
}
function escH(t) { const d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; }
function raporDuzenle(id, sessiz) {
  const b = RAPOR.find(function (x) { return x.id === id; });
  if (!b) return;
  document.getElementById("r-id").value = b.id;
  document.getElementById("r-sira").value = b.sira;
  document.getElementById("r-no").value = b.no || "";
  document.getElementById("r-etiket").value = b.etiket || "";
  document.getElementById("r-baslik").value = b.baslik || "";
  document.getElementById("r-alt").value = b.alt || "";
  document.getElementById("r-yer").value = b.yer || "gizli";
  document.getElementById("r-metin").value = b.metin || "";
  document.getElementById("r-form-baslik").textContent = "Bölüm Düzenle: " + (b.no || "") + " " + (b.baslik || "");
  document.getElementById("r-onizleme").style.display = "none";
  if (!sessiz) document.getElementById("rapor-edit-card").scrollIntoView({ behavior: "smooth" });
}
function raporYeni() {
  document.getElementById("r-id").value = "";
  ["r-no", "r-etiket", "r-baslik", "r-alt", "r-metin"].forEach(function (i) { document.getElementById(i).value = ""; });
  document.getElementById("r-sira").value = (RAPOR.length ? Math.max.apply(null, RAPOR.map(function (b) { return b.sira; })) : 0) + 1;
  document.getElementById("r-yer").value = "gizli";
  document.getElementById("r-form-baslik").textContent = "Yeni Bölüm";
  document.getElementById("rapor-edit-card").scrollIntoView({ behavior: "smooth" });
}
async function raporKaydet() {
  const id = document.getElementById("r-id").value;
  const body = {
    sira: document.getElementById("r-sira").value, no: document.getElementById("r-no").value,
    etiket: document.getElementById("r-etiket").value, baslik: document.getElementById("r-baslik").value,
    alt: document.getElementById("r-alt").value, yer: document.getElementById("r-yer").value,
    metin: document.getElementById("r-metin").value,
  };
  const r = await fetch(id ? "/api/rapor/" + id : "/api/rapor", { method: id ? "PUT" : "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  showMsg("rapor-msg", r.ok ? "Kaydedildi (sitede en geç 1 dakikada görünür)" : "Hata oluştu", r.ok);
  if (r.ok) { if (!id) document.getElementById("r-id").value = ""; loadRapor(); }
}
async function raporSil(id) {
  if (!confirm("Bu bölüm silinsin mi?")) return;
  await fetch("/api/rapor/" + id, { method: "DELETE" });
  document.getElementById("r-id").value = "";
  loadRapor();
}
async function raporOnizle() {
  const r = await fetch("/api/rapor-onizle", { method: "POST", body: JSON.stringify({ metin: document.getElementById("r-metin").value }), headers: { "Content-Type": "application/json" } });
  const d = await r.json();
  const el = document.getElementById("r-onizleme");
  el.innerHTML = "<b>Sitede böyle görünecek:</b>" + d.html; el.style.display = "block";
}
async function raporPdfYukle() {
  const f = document.getElementById("r-pdf-dosya").files[0];
  if (!f) { showMsg("rapor-pdf-msg", "PDF seçin", false); return; }
  try {
    const url = await uploadFile(f);
    const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify({ rapor_pdf: url }), headers: { "Content-Type": "application/json" } });
    showMsg("rapor-pdf-msg", r.ok ? "PDF yüklendi" : "Hata oluştu", r.ok);
    document.getElementById("r-pdf-dosya").value = "";
    loadRapor();
  } catch (e) { showMsg("rapor-pdf-msg", e.message, false); }
}
async function raporPdfKaldir() {
  if (!confirm("Sitedeki PDF indirme düğmesi kaldırılsın mı?")) return;
  await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify({ rapor_pdf: "" }), headers: { "Content-Type": "application/json" } });
  loadRapor();
}

let AI_GECMIS = [];
try { AI_GECMIS = JSON.parse(localStorage.getItem("sahliAi") || "[]"); } catch (e) {}
function aiCiz() {
  const k = document.getElementById("ai-kutu");
  if (!AI_GECMIS.length) { k.innerHTML = '<div class="ai-m o">Merhaba! Ben Şahlı AI. Paneli nasıl kullanacağını, raporu ya da Büyükdünya ile ilgili merak ettiğini sorabilirsin.</div>'; return; }
  k.innerHTML = AI_GECMIS.map(function (m) { return '<div class="ai-m ' + (m.role === "user" ? "sen" : "o") + '">' + escH(m.content) + '</div>'; }).join("");
  k.scrollTop = k.scrollHeight;
}
async function aiGonder() {
  const t = document.getElementById("ai-soru");
  const soru = t.value.trim(); if (!soru) return;
  const onceki = AI_GECMIS.slice(-8);
  AI_GECMIS.push({ role: "user", content: soru }); t.value = ""; aiCiz();
  const btn = document.getElementById("ai-btn"); btn.disabled = true; btn.textContent = "Düşünüyor...";
  try {
    const r = await fetch("/api/sahli-ai", { method: "POST", body: JSON.stringify({ mesaj: soru, gecmis: onceki }), headers: { "Content-Type": "application/json" } });
    const d = await r.json();
    AI_GECMIS.push({ role: "assistant", content: d.cevap || d.error || "Cevap alınamadı." });
  } catch (e) { AI_GECMIS.push({ role: "assistant", content: "Bağlantı hatası, tekrar dener misin?" }); }
  AI_GECMIS = AI_GECMIS.slice(-30);
  try { localStorage.setItem("sahliAi", JSON.stringify(AI_GECMIS)); } catch (e) {}
  btn.disabled = false; btn.textContent = "Gönder"; aiCiz();
}
function aiTemizle() { AI_GECMIS = []; try { localStorage.removeItem("sahliAi"); } catch (e) {} aiCiz(); }
document.addEventListener("DOMContentLoaded", aiCiz);
setTimeout(aiCiz, 0);

async function loadWaStats() {
  const r = await fetch("/api/wa-click-count");
  if (!r.ok) return;
  const d = await r.json();
  document.getElementById("wa-stats").innerHTML =
    "<strong>" + d.toplam + "</strong> toplam tıklama &middot; <strong>" + d.bugun + "</strong> bugün";
}

async function saveProfile() {
  const body = {
    toplam_yaris: Number(document.getElementById("p-toplam").value),
    birincilik: Number(document.getElementById("p-birincilik").value),
    grup_galibiyeti: Number(document.getElementById("p-grup").value),
    kv_galibiyeti: Number(document.getElementById("p-kv").value),
  };
  const r = await fetch("/api/profile", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  showMsg("profile-msg", r.ok ? "Kaydedildi" : "Hata oluştu", r.ok);
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error("Yükleme başarısız");
  const data = await r.json();
  return data.url;
}

// Panelden yüklenen görseli, orijinal boyutu ne olursa olsun belirtilen
// maksimum genişlik/yükseklik içine sığacak şekilde otomatik küçültür.
function resizeImageFile(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.9);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Galeri gibi çok sayıda görselin yükleneceği yerlerde: orijinal boyut/format
// ne olursa olsun belirtilen maksimum ölçüye küçültüp WebP'ye çevirir.
function resizeToWebp(file, maxW, maxH, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const isWebp = blob.type === "image/webp";
          const ext = isWebp ? ".webp" : ".jpg";
          resolve(new File([blob], file.name.replace(/\\.[^.]+$/, "") + ext, { type: blob.type || "image/jpeg" }));
        }, "image/webp", quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function addNews() {
  try {
    let foto_url = "";
    const fotoInput = document.getElementById("n-foto");
    if (fotoInput.files[0]) foto_url = await uploadFile(fotoInput.files[0]);
    const body = {
      tarih: document.getElementById("n-tarih").value,
      baslik: document.getElementById("n-baslik").value,
      icerik: document.getElementById("n-icerik").value,
      foto_url,
    };
    const r = await fetch("/api/news", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("news-msg", r.ok ? "Eklendi" : "Hata oluştu", r.ok);
    if (r.ok) {
      document.getElementById("n-tarih").value = "";
      document.getElementById("n-baslik").value = "";
      document.getElementById("n-icerik").value = "";
      fotoInput.value = "";
      loadNews();
    }
  } catch (e) { showMsg("news-msg", e.message, false); }
}

async function loadNews() {
  const items = await (await fetch("/api/news")).json();
  const el = document.getElementById("news-list");
  el.innerHTML = items.map(n => \`
    <div class="item">
      \${n.foto_url ? '<img src="' + n.foto_url + '">' : ''}
      <strong>\${n.tarih}</strong> — \${n.baslik}<br>
      <small>\${n.icerik}</small><br>
      <button class="danger" onclick="deleteNews(\${n.id})">Sil</button>
    </div>\`).join("") || "<p>Henüz haber yok.</p>";
}

async function deleteNews(id) {
  if (!confirm("Silinsin mi?")) return;
  await fetch("/api/news/" + id, { method: "DELETE" });
  loadNews();
}

async function addYarisGecmisi() {
  try {
    const body = {
      tarih: document.getElementById("yg-tarih").value,
      hipodrom: document.getElementById("yg-hipodrom").value,
      mesafe: document.getElementById("yg-mesafe").value,
      sonuc: document.getElementById("yg-sonuc").value,
      aciklama: document.getElementById("yg-aciklama").value,
    };
    const r = await fetch("/api/yaris-gecmisi", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("yaris-gecmisi-msg", r.ok ? "Eklendi" : "Hata oluştu", r.ok);
    if (r.ok) {
      document.getElementById("yg-tarih").value = "";
      document.getElementById("yg-hipodrom").value = "";
      document.getElementById("yg-mesafe").value = "";
      document.getElementById("yg-sonuc").value = "";
      document.getElementById("yg-aciklama").value = "";
      loadYarisGecmisi();
    }
  } catch (e) { showMsg("yaris-gecmisi-msg", e.message, false); }
}

async function loadYarisGecmisi() {
  const items = await (await fetch("/api/yaris-gecmisi")).json();
  const el = document.getElementById("yaris-gecmisi-list");
  el.innerHTML = items.map(y => \`
    <div class="item">
      <strong>\${y.tarih}</strong> — \${y.hipodrom}\${y.mesafe ? ' · ' + y.mesafe : ''}<br>
      <small>\${y.sonuc}\${y.aciklama ? ' — ' + y.aciklama : ''}</small><br>
      <button class="danger" onclick="deleteYarisGecmisi(\${y.id})">Sil</button>
    </div>\`).join("") || "<p>Henüz yarış geçmişi yok.</p>";
}

async function deleteYarisGecmisi(id) {
  if (!confirm("Silinsin mi?")) return;
  await fetch("/api/yaris-gecmisi/" + id, { method: "DELETE" });
  loadYarisGecmisi();
}

async function addGallery() {
  try {
    const fileInput = document.getElementById("g-dosya");
    if (!fileInput.files.length) { showMsg("gallery-msg", "Dosya seçin", false); return; }
    const tip = document.getElementById("g-tip").value;
    const baslik = document.getElementById("g-baslik").value;
    let basarili = 0;
    for (const dosya of fileInput.files) {
      const f = tip === "foto" ? await resizeToWebp(dosya, 1600, 1600, 0.82) : dosya;
      const url = await uploadFile(f);
      const body = { tip, url, baslik };
      const r = await fetch("/api/gallery", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
      if (r.ok) basarili++;
    }
    showMsg("gallery-msg", basarili + " dosya eklendi", basarili > 0);
    if (basarili > 0) {
      fileInput.value = "";
      document.getElementById("g-baslik").value = "";
      loadGallery();
    }
  } catch (e) { showMsg("gallery-msg", e.message, false); }
}

async function loadGallery() {
  const items = await (await fetch("/api/gallery")).json();
  const el = document.getElementById("gallery-list");
  window._galOdak = {};
  el.innerHTML = (items.length ? '<button class="secondary" style="margin:0 0 12px" onclick="atiBul(this)">🐎 Bütün resimlerde atı otomatik bul</button>' : "") + (items.map(function (g) {
    window._galOdak[g.id] = g.odak || "50% 50%";
    const resim = g.tip === "video" ? '<video src="' + g.url + '" controls></video>'
      : '<img src="' + g.url + '" id="gimg-' + g.id + '">'
        + '<div class="ipucu" style="margin-top:6px">Sitede böyle görünür:</div><div class="kirp"><img src="' + g.url + '" id="gkirp-' + g.id + '" style="object-position:' + (g.odak || "50% 50%") + '"></div>';
    return '<div class="item" id="gitem-' + g.id + '">' + resim + (g.baslik ? '<div>' + escH(g.baslik) + '</div>' : '')
      + '<div class="row" style="flex:none">' + (g.tip === "video" ? "" : '<button class="secondary" onclick="galOdakAc(' + g.id + ')">🎯 Odağı ayarla</button>')
      + '<button class="danger" onclick="deleteGallery(' + g.id + ')">Sil</button></div></div>';
  }).join("") || "<p>Henüz içerik yok.</p>");
}
// 🎯 Elle odak: resim seçme kutusuna döner, dokunulan yer kaydedilir
function galOdakAc(id) {
  const img = document.getElementById("gimg-" + id); if (!img) return;
  const kap = document.createElement("div"); kap.className = "odak"; kap.innerHTML = '<img src="' + img.src + '"><i></i>';
  img.replaceWith(kap);
  const ipucu = document.createElement("div"); ipucu.className = "ipucu"; ipucu.textContent = "Atın üstüne dokunun — sitede o kısım ortada görünür.";
  kap.after(ipucu);
  const nokta = function () { const p = (window._galOdak[id] || "50% 50%").split(" "); kap.querySelector("i").style.left = p[0]; kap.querySelector("i").style.top = p[1]; };
  nokta();
  kap.addEventListener("click", async function (e) {
    const r = kap.querySelector("img").getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) / r.width * 100), y = Math.round((e.clientY - r.top) / r.height * 100);
    const o = Math.max(0, Math.min(100, x)) + "% " + Math.max(0, Math.min(100, y)) + "%";
    window._galOdak[id] = o; nokta();
    document.getElementById("gkirp-" + id).style.objectPosition = o;
    await fetch("/api/odak", { method: "POST", body: JSON.stringify({ tablo: "gallery", id: id, odak: o }), headers: { "Content-Type": "application/json" } });
  });
}
async function atiBul(btn) {
  btn.disabled = true; const eski = btn.textContent; btn.textContent = "⏳ Resimlere bakılıyor (1-2 dk)…";
  try {
    const r = await fetch("/api/odak-bul", { method: "POST" });
    const d = await r.json().catch(function () { return {}; });
    alert(r.ok ? ("Bitti: " + d.bulunan + " / " + d.toplam + " resimde odak ayarlandı (galeri, açılış resimleri, haber ve kısrak resimleri).") : "Olmadı, tekrar deneyin");
  } finally { btn.disabled = false; btn.textContent = eski; loadGallery(); loadSiteAyarlar(); }
}

async function deleteGallery(id) {
  if (!confirm("Silinsin mi?")) return;
  await fetch("/api/gallery/" + id, { method: "DELETE" });
  loadGallery();
}

async function addKisrak() {
  try {
    let foto_url = "";
    const fotoInput = document.getElementById("k-foto");
    if (fotoInput.files[0]) foto_url = await uploadFile(fotoInput.files[0]);
    const body = {
      kisrak_adi: document.getElementById("k-adi").value,
      sahip_adi: document.getElementById("k-sahip").value,
      aciklama: document.getElementById("k-aciklama").value,
      tay_bilgisi: document.getElementById("k-tay").value,
      foto_url,
    };
    const r = await fetch("/api/kisrak", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("kisrak-msg", r.ok ? "Eklendi" : "Hata oluştu", r.ok);
    if (r.ok) {
      document.getElementById("k-adi").value = "";
      document.getElementById("k-sahip").value = "";
      document.getElementById("k-aciklama").value = "";
      document.getElementById("k-tay").value = "";
      fotoInput.value = "";
      loadKisrak();
    }
  } catch (e) { showMsg("kisrak-msg", e.message, false); }
}

async function loadKisrak() {
  const items = await (await fetch("/api/kisrak")).json();
  const el = document.getElementById("kisrak-list");
  el.innerHTML = items.map(k => \`
    <div class="item">
      \${k.foto_url ? '<img src="' + k.foto_url + '">' : ''}
      <strong>\${k.kisrak_adi}</strong>\${k.sahip_adi ? ' — ' + k.sahip_adi : ''}<br>
      <small>\${k.aciklama || ''}</small><br>
      <button class="danger" onclick="deleteKisrak(\${k.id})">Sil</button>
    </div>\`).join("") || "<p>Henüz kısrak yok.</p>";
}

async function deleteKisrak(id) {
  if (!confirm("Silinsin mi?")) return;
  await fetch("/api/kisrak/" + id, { method: "DELETE" });
  loadKisrak();
}

async function loadTalepler() {
  const items = await (await fetch("/api/talepler")).json();
  const el = document.getElementById("talep-list");
  el.innerHTML = items.map(t => \`
    <div class="item">
      <strong>\${t.ad_soyad}</strong> — \${t.telefon}<br>
      \${t.kisrak_bilgisi ? '<small>Kısrak: ' + t.kisrak_bilgisi + '</small><br>' : ''}
      \${t.mesaj ? '<small>' + t.mesaj + '</small><br>' : ''}
      <small style="color:#888">\${t.created_at || ''}</small><br>
      <button class="danger" onclick="deleteTalep(\${t.id})">Sil</button>
    </div>\`).join("") || "<p>Henüz talep yok.</p>";
}

async function deleteTalep(id) {
  if (!confirm("Silinsin mi?")) return;
  await fetch("/api/talepler/" + id, { method: "DELETE" });
  loadTalepler();
}

// Oturum zaten açıksa doğrudan paneli göster
// ===== 14.11.2026: kişiye özel giriş, nabız, dokunuş kaydı, Canlı İzleme =====
let BEN = null, SEKME = "", TIK_KUYRUK = [], CANLI_ZAMAN = null, CANLI_KID = null, CANLI_SON = 0, CANLI_GUN = "";
const SEKME_AD = { yaris: "Yarış", metin: "Metinler", ayar: "Site Ayarları", haber: "Haberler", galeri: "Galeri", kisrak: "Kısraklar", rapor: "Rapor", talep: "Talepler", ai: "Şahlı AI", canli: "Canlı İzle", hesap: "Hesabım" };
// Her panel isteğine hangi bölümde olunduğunu ekle (işlem kaydında görünür)
const _ilkFetch = window.fetch.bind(window);
window.fetch = function (adres, ayar) {
  try {
    if (typeof adres === "string" && adres.indexOf("/api/") === 0) {
      ayar = ayar || {}; const h = new Headers(ayar.headers || {}); h.set("x-panel-sekme", SEKME || ""); ayar.headers = h;
    }
  } catch (e) {}
  return _ilkFetch(adres, ayar).then(function (r) {
    // Oturum kapanmışsa (başka cihazda şifre değişti, süre doldu…) "başarısız" yerine giriş ekranı gelsin
    if (r.status === 401 && BEN && typeof adres === "string" && adres.indexOf("/api/") === 0) oturumDustu();
    return r;
  });
};
function oturumDustu() {
  BEN = null; canliDurdur();
  document.getElementById("panel").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  showMsg("login-msg", "Oturum kapandı, lütfen yeniden giriş yapın", false);
}
async function panelAc() {
  const r = await fetch("/api/ben");
  if (!r.ok) return false;
  BEN = await r.json();
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("panel").classList.remove("hidden");
  document.getElementById("ust-kim").textContent = "👤 " + (BEN.ad || BEN.kadi);
  document.getElementById("destek-serit").classList.toggle("hidden", BEN.yol !== "merkez");
  document.getElementById("panel").classList.toggle("destekli", BEN.yol === "merkez");
  document.getElementById("nav-canli").classList.toggle("dev-yok", !BEN.dev);
  document.getElementById("hesap-bilgi").textContent = "Giriş yapan: " + (BEN.ad || "") + (BEN.kadi ? " (" + BEN.kadi + ")" : "") + (BEN.dev ? " · Developer" : " · Yönetici");
  document.getElementById("hesap-sifre-kutu").classList.toggle("hidden", !(BEN.id > 0));
  loadAll();
  return true;
}
function nabiz() { if (BEN) fetch("/api/nabiz", { method: "POST", body: JSON.stringify({ sekme: SEKME }) }).catch(function () {}); }
setInterval(function () { if (!document.hidden) nabiz(); }, 60000);
document.addEventListener("visibilitychange", function () { if (!document.hidden) nabiz(); });
// Dokunuş kaydı: sadece düğme / bağlantı yazısı (yazılan metin, şifre ASLA)
document.addEventListener("click", function (e) {
  if (!BEN) return;
  const el = e.target.closest("button, a, .kisi, img");
  if (!el || el.closest("#canli-akis") || el.closest(".side")) return; // menü dokunuşu zaten "ekranını açtı" olarak yazılır
  let t = el.tagName === "IMG" ? "🖼 resme dokundu" : (el.innerText || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
  if (!t) return;
  TIK_KUYRUK.push({ z: Date.now(), s: SEKME, t: t.slice(0, 80) });
}, true);
setInterval(function () {
  if (!TIK_KUYRUK.length) return;
  const l = TIK_KUYRUK.splice(0, 30);
  fetch("/api/tik", { method: "POST", body: JSON.stringify({ liste: l }) }).catch(function () {});
}, 1200);

function saatYaz(ms) { const d = new Date(ms); return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Istanbul" }); }
function gunYaz(ms) { return new Date(ms).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Istanbul" }); }
function ne(h) {
  if (h.tur === "ekran") return ["📄", "<b>" + esc(SEKME_AD[h.sekme] || h.sekme) + "</b> ekranını açtı"];
  if (h.tur === "tik") return ["👆", "dokundu: " + esc(h.detay) + (h.sekme ? " <small style='color:#999'>(" + esc(SEKME_AD[h.sekme] || h.sekme) + ")</small>" : "")];
  if (h.tur === "islem") return ["✅", "<b>" + esc(h.detay) + "</b>"];
  if (h.tur === "giris") return ["🔑", esc(h.detay)];
  if (h.tur === "cikis") return ["🚪", esc(h.detay)];
  return ["•", esc(h.detay)];
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function canliBaslat() { canliDurdur(); CANLI_SON = 0; canliYukle(); CANLI_ZAMAN = setInterval(function () { if (!document.hidden && !CANLI_GUN) canliYukle(); }, 3000); }
function canliDurdur() { if (CANLI_ZAMAN) clearInterval(CANLI_ZAMAN); CANLI_ZAMAN = null; }
function canliKisiSec(kid) { CANLI_KID = kid; CANLI_SON = 0; document.getElementById("canli-akis").innerHTML = ""; canliYukle(); }
function canliGunSec() { CANLI_GUN = document.getElementById("canli-gun").value; CANLI_SON = 0; document.getElementById("canli-akis").innerHTML = ""; canliYukle(); }
function canliBugun() { CANLI_GUN = ""; document.getElementById("canli-gun").value = ""; CANLI_SON = 0; document.getElementById("canli-akis").innerHTML = ""; canliYukle(); }
async function canliYukle() {
  let q = "/api/canli?son=" + (CANLI_GUN ? 0 : CANLI_SON);
  if (CANLI_KID !== null) q += "&kid=" + CANLI_KID;
  if (CANLI_GUN) q += "&gun=" + CANLI_GUN;
  const r = await fetch(q); if (!r.ok) return;
  const d = await r.json();
  // Kişiler
  const simdi = d.simdi;
  document.getElementById("canli-kisiler").innerHTML = d.kisiler.map(function (k) {
    const once = k.son ? Math.round((simdi - k.son) / 60000) : null;
    const zaman = once === null ? "hiç girmedi" : once < 1 ? "şu an" : once < 60 ? once + " dk önce" : once < 1440 ? Math.round(once / 60) + " saat önce" : gunYaz(k.son);
    const nerede = k.durum !== "kirmizi" && k.sekme ? " · " + (SEKME_AD[k.sekme] || k.sekme) : "";
    return "<div class='kisi" + (CANLI_KID === k.id ? " sec" : "") + "' onclick='canliKisiSec(" + k.id + ")'><span class='nokta " + k.durum + "'></span><div style='flex:1'><b>" + esc(k.ad || k.kadi) + "</b>" + (k.merkez ? " 🛟" : "") + "<small>" + zaman + nerede + (k.cihaz ? " · " + esc(k.cihaz) : "") + "</small></div></div>";
  }).join("");
  const kisi = d.kisiler.find(function (k) { return k.id === CANLI_KID; });
  document.getElementById("canli-baslik").textContent = (CANLI_GUN ? "📼 Geçmiş — " : "🔴 Canlı akış — ") + (kisi ? (kisi.ad || kisi.kadi) : "herkes");
  document.getElementById("canli-durum").textContent = CANLI_GUN ? (CANLI_GUN + " günü, en yeni üstte") : "3 saniyede bir yenilenir · son: " + saatYaz(simdi);
  // Akış
  const kutu = document.getElementById("canli-akis");
  const satir = function (h, yeni) { const n = ne(h); return "<div" + (yeni ? " class='yeni'" : "") + "><span class='zm'>" + (CANLI_GUN ? "" : (gunYaz(h.zaman) + " ")) + saatYaz(h.zaman) + "</span><span class='tr'>" + n[0] + "</span>" + (CANLI_KID === null ? "<b>" + esc(h.ad || "?") + "</b> · " : "") + n[1] + "</div>"; };
  if (CANLI_GUN || !CANLI_SON) kutu.innerHTML = d.akis.length ? d.akis.map(function (h) { return satir(h, false); }).join("") : "<div style='color:#888'>Kayıt yok.</div>";
  else if (d.akis.length) kutu.insertAdjacentHTML("afterbegin", d.akis.map(function (h) { return satir(h, true); }).join(""));
  if (d.akis.length && !CANLI_GUN) CANLI_SON = Math.max(CANLI_SON, d.akis[0].id);
}
async function sifreDegistir() {
  const r = await fetch("/api/sifre", { method: "POST", body: JSON.stringify({ eski: document.getElementById("h-eski").value, yeni: document.getElementById("h-yeni").value }) });
  let d = {}; try { d = await r.json(); } catch (e) {}
  showMsg("hesap-msg", r.ok ? "Şifre değişti (diğer cihazlardaki oturumlar kapandı)" : (d.error || "Olmadı"), r.ok);
  if (r.ok) { document.getElementById("h-eski").value = ""; document.getElementById("h-yeni").value = ""; }
}

// ===== Geri tuşu (14.11.2026, Serdar: "geri tuşuna basınca panelden çıkıyor") =====
// Her bölüm geçişi tarayıcı geçmişine yazılır. Geri → önce açık büyük resim kapanır, sonra önceki bölüm.
// En başta panelden çıkılmaz (koruma kaydı); çıkmak için üstteki Çıkış düğmesi.
let KOK_KORUMA_GEREK = true;
function korumaKur() { try { history.replaceState({ bd: 1, kok: 1 }, "", location.pathname); history.pushState({ bd: 1, sec: SEKME }, "", "#" + SEKME); } catch (e) {} KOK_KORUMA_GEREK = false; }
document.addEventListener("click", function () { if (BEN && KOK_KORUMA_GEREK) korumaKur(); }, true);
window.addEventListener("popstate", function (e) {
  if (!BEN) return;
  const lb = document.getElementById("lb");
  if (lb && lb.classList.contains("acik")) { lb.classList.remove("acik"); try { history.pushState({ bd: 1, sec: SEKME }, "", "#" + SEKME); } catch (x) {} return; }
  const st = e.state || {};
  if (st.kok || !st.sec) {
    try { history.pushState({ bd: 1, sec: SEKME }, "", "#" + SEKME); } catch (x) {}
    const t = document.createElement("div"); t.textContent = "Panelden çıkmak için üstteki Çıkış düğmesini kullanın";
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#333;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:4000";
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2500);
    return;
  }
  showSec(st.sec, true);
});
window.addEventListener("beforeunload", function (e) { if (BEN && !CIKIYOR) { e.preventDefault(); e.returnValue = ""; } });
let CIKIYOR = false;
document.addEventListener("click", function (e) { const a = e.target.closest("a.ust-cik"); if (a) CIKIYOR = true; }, true);

// 📲 Ana ekrana ekle tarifi (iPhone'da Safari'den açılınca, uygulama olarak eklenmemişse bir kez gösterilir)
function anaEkranTarifi() {
  try {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const eklenmis = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (!ios || eklenmis || localStorage.getItem("anaEkranTarif") === "kapat") return;
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:10px;right:10px;bottom:12px;z-index:3500;background:#0d1b3d;color:#fff;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.55;box-shadow:0 6px 24px rgba(0,0,0,.35)";
    d.innerHTML = '<b style="color:#e2c06a">📲 Paneli telefona uygulama gibi ekleyin</b><br>1) Alttaki <b>Paylaş</b> düğmesine dokunun (kare ve yukarı ok)<br>2) <b>Ana Ekrana Ekle</b> → <b>Ekle</b><br>3) Ana ekrandaki <b>Büyükdünya</b> ikonundan açın, bir kez giriş yapın.'
      + '<div style="text-align:right;margin-top:8px"><button style="margin:0;background:#c9a24a;color:#0d1b3d;font-weight:bold">Tamam</button></div>';
    d.querySelector("button").onclick = function () { localStorage.setItem("anaEkranTarif", "kapat"); d.remove(); };
    document.body.appendChild(d);
  } catch (e) {}
}

// Oturum zaten açıksa doğrudan paneli göster
panelAc().then(function (ok) { if (ok) korumaKur(); anaEkranTarifi(); });
</script>
</body>
</html>`;

const ANA_ISLEYICI = {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // --- Panel giriş / çıkış (14.11.2026: kişiye özel; ortak şifre = acil durum) ---
    if (path === "/panel/login" && request.method === "POST") {
      await semaHazirla(env);
      let g = {}; try { g = await request.json(); } catch (e) {}
      const ip = request.headers.get("cf-connecting-ip") || "-";
      const kadi = String(g.kadi || "").trim().toLowerCase();
      const simdi = Date.now();
      const kilitler = ["ip:" + ip].concat(kadi ? ["k:" + kadi] : []);
      for (const a of kilitler) {
        const r = await env.DB.prepare("SELECT sayi, bitis FROM giris_kilidi WHERE anahtar=?").bind(a).first();
        if (r && r.bitis > simdi && r.sayi >= (a.startsWith("ip:") ? 5 : 10)) return json({ error: "Çok fazla yanlış deneme. 15 dakika sonra yeniden deneyin." }, 429);
      }
      let kid = null;
      if (kadi) {
        const u = await env.DB.prepare("SELECT id, sifre FROM panel_kullanici WHERE kadi=? COLLATE NOCASE AND aktif=1").bind(kadi).first();
        if (u && await sifreDogrula(String(g.sifre || ""), u.sifre)) kid = u.id;
      } else if (g.password && env.PANEL_PASSWORD && bdEsit(String(g.password), env.PANEL_PASSWORD)) kid = 0;
      if (kid === null) {
        for (const a of kilitler) await env.DB.prepare("INSERT INTO giris_kilidi (anahtar, sayi, bitis) VALUES (?, 1, ?) ON CONFLICT(anahtar) DO UPDATE SET sayi = CASE WHEN bitis < ? THEN 1 ELSE sayi + 1 END, bitis = ?").bind(a, simdi + 900000, simdi, simdi + 900000).run();
        return json({ error: kadi ? "Kullanıcı adı veya şifre hatalı" : "Şifre hatalı" }, 401);
      }
      for (const a of kilitler) await env.DB.prepare("DELETE FROM giris_kilidi WHERE anahtar=?").bind(a).run();
      const cerez = await oturumAc(env, request, kid, kid === 0 ? "acil" : "sifre");
      const k = kid === 0 ? { id: 0 } : { id: kid };
      k.oturum = (await sha256Hex(cerez.split(";")[0].slice(7))); await hareketYaz(env, k, "giris", "", kid === 0 ? "Acil şifreyle giriş" : "Giriş yaptı");
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": cerez } });
    }
    if (path === "/merkez-giris" && request.method === "GET") {
      const y = await merkezBiletDogrula(env, url.searchParams.get("b"));
      if (y.hata) return htmlCevap("Merkez girişi olmadı", y.hata, 403);
      const u = await env.DB.prepare("SELECT id FROM panel_kullanici WHERE rol='gelistirici' AND aktif=1 ORDER BY (kadi='serdar') DESC, id LIMIT 1").first();
      const cerez = await oturumAc(env, request, u ? u.id : 0, "merkez");
      await hareketYaz(env, { id: u ? u.id : 0, oturum: await sha256Hex(cerez.split(";")[0].slice(7)) }, "giris", "", "Merkez'den giriş");
      return new Response(null, { status: 302, headers: { Location: "/panel", "Set-Cookie": cerez, "Cache-Control": "no-store" } });
    }
    if (path === "/panel/logout") {
      const k = await kimlikAl(request, env);
      if (k) { await hareketYaz(env, k, "cikis", "", "Çıkış yaptı"); await env.DB.prepare("UPDATE panel_oturum SET kapandi=1 WHERE ozet=?").bind(k.oturum).run(); }
      return new Response(null, {
        status: 302,
        headers: { Location: "/panel", "Set-Cookie": "oturum=; Path=/; Max-Age=0" },
      });
    }
    // Ana ekrana ekleme (iPhone / Android): uygulama gibi açılır, logolu ikon
    if (path === "/panel/manifest.json") {
      return new Response(JSON.stringify({
        name: "Büyükdünya Yönetim Paneli", short_name: "Büyükdünya", start_url: "/panel", scope: "/", display: "standalone",
        background_color: "#0d1b3d", theme_color: "#47952a", lang: "tr",
        icons: [
          { src: "/panel-ikon/ikon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/panel-ikon/ikon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/panel-ikon/ikon-maskeli-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      }), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (path === "/panel") {
      return new Response(PANEL_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }

    // --- API ---
    if (path.startsWith("/api/")) {
      const authed = await requireAuth(request, env);

      // --- 14.11.2026: kimlik, nabız, dokunuş, canlı izleme, kendi şifresi ---
      if (path === "/api/ben" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        return json({ id: authed.id, ad: authed.ad, kadi: authed.kadi, rol: authed.rol, dev: authed.dev, yol: authed.yol });
      }
      if (path === "/api/nabiz" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        let g = {}; try { g = await request.json(); } catch (e) {}
        const sekme = String(g.sekme || "").slice(0, 30);
        await env.DB.prepare("UPDATE panel_oturum SET son_gorulme=?, sekme=? WHERE ozet=?").bind(Date.now(), sekme, authed.oturum).run();
        if (sekme && sekme !== authed.sekme) await hareketYaz(env, authed, "ekran", sekme, "");
        return json({ ok: true });
      }
      if (path === "/api/tik" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        let g = {}; try { g = await request.json(); } catch (e) {}
        const l = Array.isArray(g.liste) ? g.liste.slice(0, 30) : [];
        if (l.length) await env.DB.batch(l.map((t) => env.DB.prepare("INSERT INTO panel_hareket (zaman, kullanici_id, oturum, tur, sekme, detay) VALUES (?,?,?,?,?,?)")
          .bind(Math.min(Date.now(), Number(t.z) || Date.now()), authed.id, (authed.oturum || "").slice(0, 12), "tik", String(t.s || "").slice(0, 30), String(t.t || "").slice(0, 80))));
        return json({ ok: true });
      }
      if (path === "/api/canli" && request.method === "GET") {
        if (!authed || !authed.dev) return json({ error: "unauthorized" }, 401);
        const kid = url.searchParams.get("kid"), son = Number(url.searchParams.get("son")) || 0, gun = url.searchParams.get("gun") || "";
        let w = " WHERE h.id > ?", b = [son];
        if (kid !== null && kid !== "") { w += " AND h.kullanici_id = ?"; b.push(Number(kid)); }
        if (/^\d{4}-\d{2}-\d{2}$/.test(gun)) { const bas = Date.parse(gun + "T00:00:00+03:00"); w += " AND h.zaman >= ? AND h.zaman < ?"; b.push(bas, bas + 86400000); }
        const { results } = await env.DB.prepare("SELECT h.*, COALESCE(u.ad, CASE WHEN h.kullanici_id=0 THEN 'Acil giriş' END) AS ad FROM panel_hareket h LEFT JOIN panel_kullanici u ON u.id = h.kullanici_id" + w + " ORDER BY h.id DESC LIMIT " + (son ? 200 : 300)).bind(...b).all();
        return json({ kisiler: await canliKisiler(env), akis: results || [], simdi: Date.now() });
      }
      if (path === "/api/sifre" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        if (!(authed.id > 0)) return json({ error: "Acil girişte şifre değiştirilmez" }, 400);
        let g = {}; try { g = await request.json(); } catch (e) {}
        const yeni = String(g.yeni || "");
        if (yeni.length < 6) return json({ error: "Yeni şifre en az 6 karakter olmalı" }, 400);
        const u = await env.DB.prepare("SELECT sifre FROM panel_kullanici WHERE id=?").bind(authed.id).first();
        if (!u || !(await sifreDogrula(String(g.eski || ""), u.sifre))) return json({ error: "Eski şifre hatalı" }, 400);
        await env.DB.prepare("UPDATE panel_kullanici SET sifre=? WHERE id=?").bind(await sifreOzetle(yeni), authed.id).run();
        await env.DB.prepare("UPDATE panel_oturum SET kapandi=1 WHERE kullanici_id=? AND ozet<>?").bind(authed.id, authed.oturum).run();
        return json({ ok: true });
      }

      if (path === "/api/profile" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const row = await env.DB.prepare("SELECT * FROM profile WHERE id=1").first();
        return json(row);
      }
      if (path === "/api/profile" && request.method === "PUT") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          "UPDATE profile SET toplam_yaris=?, birincilik=?, grup_galibiyeti=?, kv_galibiyeti=? WHERE id=1"
        ).bind(b.toplam_yaris, b.birincilik, b.grup_galibiyeti, b.kv_galibiyeti).run();
        return json({ ok: true });
      }

      if (path === "/api/news" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY id DESC").all();
        return json(results);
      }
      if (path === "/api/news" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          "INSERT INTO news (tarih, baslik, icerik, foto_url) VALUES (?, ?, ?, ?)"
        ).bind(b.tarih || "", b.baslik || "", b.icerik || "", b.foto_url || "").run();
        return json({ ok: true });
      }
      const newsMatch = path.match(/^\/api\/news\/(\d+)$/);
      if (newsMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM news WHERE id=?").bind(newsMatch[1]).run();
        return json({ ok: true });
      }

      if (path === "/api/yaris-gecmisi" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM yaris_gecmisi ORDER BY sira DESC, id DESC").all();
        return json(results);
      }
      if (path === "/api/yaris-gecmisi" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          "INSERT INTO yaris_gecmisi (tarih, hipodrom, mesafe, sonuc, aciklama) VALUES (?, ?, ?, ?, ?)"
        ).bind(b.tarih || "", b.hipodrom || "", b.mesafe || "", b.sonuc || "", b.aciklama || "").run();
        return json({ ok: true });
      }
      const ygMatch = path.match(/^\/api\/yaris-gecmisi\/(\d+)$/);
      if (ygMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM yaris_gecmisi WHERE id=?").bind(ygMatch[1]).run();
        return json({ ok: true });
      }

      if (path === "/api/gallery" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM gallery ORDER BY id DESC").all();
        return json(results);
      }
      if (path === "/api/gallery" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await odakSemaHazirla(env);
        const odak = (b.tip || "foto") === "foto" ? await atOdakBul(env, b.url) : null;
        await env.DB.prepare(
          "INSERT INTO gallery (tip, url, baslik, odak) VALUES (?, ?, ?, ?)"
        ).bind(b.tip || "foto", b.url || "", b.baslik || "", odak).run();
        return json({ ok: true, odak });
      }
      if (path === "/api/odak" && request.method === "POST") {
        // elle odak: {tablo: gallery|news|kisraklar, id, odak:"x% y%"}
        if (!authed) return json({ error: "unauthorized" }, 401);
        await odakSemaHazirla(env);
        const b = await request.json();
        if (!["gallery", "news", "kisraklar"].includes(b.tablo) || !/^\d{1,3}% \d{1,3}%$/.test(String(b.odak || ""))) return json({ error: "geçersiz" }, 400);
        await env.DB.prepare("UPDATE " + b.tablo + " SET odak=? WHERE id=?").bind(b.odak, Number(b.id) || 0).run();
        return json({ ok: true });
      }
      if (path === "/api/odak-bul" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        return json({ ok: true, ...(await hepsiniOdakla(env)) });
      }
      const galMatch = path.match(/^\/api\/gallery\/(\d+)$/);
      if (galMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM gallery WHERE id=?").bind(galMatch[1]).run();
        return json({ ok: true });
      }

      if (path === "/api/kisrak" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM kisraklar ORDER BY id DESC").all();
        return json(results);
      }
      if (path === "/api/kisrak" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          "INSERT INTO kisraklar (kisrak_adi, sahip_adi, aciklama, tay_bilgisi, foto_url) VALUES (?, ?, ?, ?, ?)"
        ).bind(b.kisrak_adi || "", b.sahip_adi || "", b.aciklama || "", b.tay_bilgisi || "", b.foto_url || "").run();
        return json({ ok: true });
      }
      const kisrakMatch = path.match(/^\/api\/kisrak\/(\d+)$/);
      if (kisrakMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM kisraklar WHERE id=?").bind(kisrakMatch[1]).run();
        return json({ ok: true });
      }

      if (path === "/api/talep-gonder" && request.method === "POST") {
        const b = await request.json();
        if (!b.ad_soyad || !b.telefon) return json({ error: "ad soyad ve telefon gerekli" }, 400);
        await env.DB.prepare(
          "INSERT INTO talepler (ad_soyad, telefon, kisrak_bilgisi, mesaj) VALUES (?, ?, ?, ?)"
        ).bind(b.ad_soyad, b.telefon, b.kisrak_bilgisi || "", b.mesaj || "").run();
        return json({ ok: true });
      }
      if (path === "/api/talepler" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM talepler ORDER BY id DESC").all();
        return json(results);
      }
      const talepMatch = path.match(/^\/api\/talepler\/(\d+)$/);
      if (talepMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM talepler WHERE id=?").bind(talepMatch[1]).run();
        return json({ ok: true });
      }

      if (path === "/api/site-icerik" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        return json(await getSiteIcerik(env));
      }
      if (path === "/api/site-icerik" && request.method === "PUT") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        for (const k of [
          "hero_eyebrow", "hero_tagline", "hakkinda_baslik", "hakkinda_kunye", "hakkinda_metin",
          "whatsapp_no", "talep_aciklama", "footer_aciklama", "footer_telif",
          "logo_img", "pedigree_img", "iletisim_img",
          "hero_slide1", "hero_slide2", "hero_slide3", "hero_slide4", "hero_slide5",
          "hero_pos1", "hero_pos2", "hero_pos3", "hero_pos4", "hero_pos5", "perf_img", "perf_pos", "rapor_pdf",
          "hero_video", "hero_video_poster", "hero_video_ses",
        ]) {
          // "oto" = yeni resim yüklendi, atın yerini yapay zekâ bulsun
          if (b[k] === "oto") {
            const kaynak = k === "perf_pos" ? b.perf_img : b["hero_slide" + k.slice(-1)];
            b[k] = (kaynak && await atOdakBul(env, kaynak)) || "50% 50%";
          }
          if (typeof b[k] === "string") {
            await env.DB.prepare("INSERT INTO site_icerik (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger=excluded.deger").bind(k, b[k]).run();
          }
        }
        return json({ ok: true });
      }

      if (path === "/api/wa-click" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        await env.DB.prepare("INSERT INTO wa_tiklama (kaynak) VALUES (?)").bind(b.kaynak || "bilinmiyor").run();
        return json({ ok: true });
      }
      if (path === "/api/wa-click-count" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const row = await env.DB.prepare("SELECT COUNT(*) as toplam FROM wa_tiklama").first();
        const today = await env.DB.prepare("SELECT COUNT(*) as bugun FROM wa_tiklama WHERE date(created_at)=date('now')").first();
        return json({ toplam: row.toplam, bugun: today.bugun });
      }

      if (path === "/api/upload" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const form = await request.formData();
        const file = form.get("file");
        if (!file) return json({ error: "dosya yok" }, 400);
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        // Dosya adı: yükleme tarihi ve saati (Türkiye saati), örn. panel/2026-11-14_22-35-01.webp
        const tr = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
        const stamp = tr.slice(0, 10) + "_" + tr.slice(11, 19).replace(/:/g, "-");
        let key = `panel/${stamp}.${ext}`;
        for (let n = 2; await env.ASSETS.head(key); n++) key = `panel/${stamp}-${n}.${ext}`;
        await env.ASSETS.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });
        return json({ url: `${SITE_URL}/medya/${key}` });
      }

      // --- Analiz Raporu ---
      if (path === "/api/rapor" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        return json({ bolumler: await raporBolumleri(env), yerler: RAPOR_YERLER });
      }
      if (path === "/api/rapor" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare("INSERT INTO rapor_bolum (sira, yer, no, etiket, baslik, alt, metin) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(Number(b.sira) || 0, b.yer || "gizli", b.no || "", b.etiket || "", b.baslik || "", b.alt || "", b.metin || "").run();
        return json({ ok: true });
      }
      const raporMatch = path.match(/^\/api\/rapor\/(\d+)$/);
      if (raporMatch && request.method === "PUT") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare("UPDATE rapor_bolum SET sira=?, yer=?, no=?, etiket=?, baslik=?, alt=?, metin=? WHERE id=?")
          .bind(Number(b.sira) || 0, b.yer || "gizli", b.no || "", b.etiket || "", b.baslik || "", b.alt || "", b.metin || "", raporMatch[1]).run();
        return json({ ok: true });
      }
      if (raporMatch && request.method === "DELETE") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        await env.DB.prepare("DELETE FROM rapor_bolum WHERE id=?").bind(raporMatch[1]).run();
        return json({ ok: true });
      }
      if (path === "/api/rapor-onizle" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        return json({ html: raporMetinHtml(b.metin || "", false) });
      }

      // --- Şahlı AI ---
      if (path === "/api/sahli-ai" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        const soru = String(b.mesaj || "").slice(0, 2000);
        if (!soru.trim()) return json({ error: "boş mesaj" }, 400);
        const gecmis = (Array.isArray(b.gecmis) ? b.gecmis : []).slice(-8)
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
        const sistem = "GÜNCEL BİLGİLER (sitenin veritabanından, at ve rapor soruları için):\n" + await sahliBaglam(env) + "\n\n==========\n" + SAHLI_REHBER;
        try {
          const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [{ role: "system", content: sistem }, ...gecmis, { role: "user", content: soru }],
            max_tokens: 900, temperature: 0.3,
          });
          return json({ cevap: (r && (r.response || (r.result && r.result.response))) || "Cevap alınamadı." });
        } catch (e) {
          return json({ error: "Şahlı AI şu an cevap veremedi: " + (e.message || e) }, 500);
        }
      }

      return json({ error: "not found" }, 404);
    }

    // --- SEO ---
    if (path === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (path === "/sitemap.xml") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>`;
      return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
    }

    // --- Yüklenen dosyalar (R2) kendi adresimizden: /medya/... ---
    if (path.startsWith("/medya/")) {
      const key = decodeURIComponent(path.slice(7));
      const obj = await env.ASSETS.get(key);
      if (!obj) return new Response("404 Not Found", { status: 404 });
      const h = new Headers();
      obj.writeHttpMetadata(h);
      h.set("etag", obj.httpEtag);
      h.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { headers: h });
    }

    // --- Public site ---
    if (path === "/" || path === "") path = "/index.html";
    if (path === "/index.html") return servePublicPage(path, env);
    return serveStaticAsset(path);
  },
};

// 14.11.2026 — Sarmalayıcı: panelden yapılan başarılı her yazma isteği "işlem" olarak kaydedilir (Canlı İzleme).
// Gövde/şifre/dosya içeriği YAZILMAZ; sadece ne yapıldığı (ör. "Haber kaydedildi").
const ISLEM_DISI = new Set(["/api/nabiz", "/api/tik", "/api/rapor-onizle", "/api/talep-gonder", "/api/wa-click"]);
export default {
  async fetch(request, env, ctx) {
    const cevap = await ANA_ISLEYICI.fetch(request, env, ctx);
    try {
      const u = new URL(request.url);
      if (u.pathname.startsWith("/api/") && request.method !== "GET" && cevap.status < 400 && !ISLEM_DISI.has(u.pathname)) {
        const k = ISTEK_KIMLIK.get(request);
        if (k) {
          const sekme = (request.headers.get("x-panel-sekme") || "").slice(0, 30);
          const is = hareketYaz(env, k, "islem", sekme, islemAdi(request.method, u.pathname));
          if (ctx && ctx.waitUntil) ctx.waitUntil(is); else await is;
        }
      }
    } catch (e) {}
    return cevap;
  },
};
