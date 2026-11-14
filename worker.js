const REPO_RAW = "https://raw.githubusercontent.com/Ntlextr/buyukdunya-com/main";
const R2_PUBLIC = "https://pub-421f02705d5c4bdb9780cbb61f25ccb1.r2.dev";
const CF_BEACON_TOKEN = "1480748608ed4e08af7b7519412db4a8";
const SITE_URL = "https://buyukdunya.com";
const SEO_DESCRIPTION = "BÜYÜKDÜNYA - 2027 aşım sezonunda sizlerle, damızlık yarış aygırı. Yarış rekorları, pedigree, galeri ve kısrak eşleştirme talebi.";

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

async function isAuthed(request, env) {
  const token = getCookie(request, "session");
  if (!token) return false;
  const expected = await signToken(env.PANEL_PASSWORD);
  return token === expected;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function requireAuth(request, env) {
  return isAuthed(request, env);
}

async function renderNewsHtml(env) {
  const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY sira DESC, id DESC").all();
  if (!results || results.length === 0) {
    return `<div class="bos-icerik">Henüz bir haber eklenmedi.</div>`;
  }
  return results.map((n) => `
    <div class="gelisme-kart">
      ${n.foto_url ? `<img src="${esc(n.foto_url)}" alt="">` : ""}
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
      : `<img src="${esc(g.url)}" alt="${esc(g.baslik)}">`;
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
      ${k.foto_url ? `<img src="${esc(k.foto_url)}" alt="">` : ""}
      <div class="kisrak-adi">${esc(k.kisrak_adi)}</div>
      ${k.sahip_adi ? `<span class="kisrak-sahip">${esc(k.sahip_adi)}</span>` : ""}
      <div class="kisrak-aciklama">${esc(k.aciklama).replace(/\n/g, "<br>")}</div>
      ${k.tay_bilgisi ? `<div class="kisrak-tay">${esc(k.tay_bilgisi)}</div>` : ""}
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
<meta property="og:title" content="BÜYÜKDÜNYA - Damızlık Yarış Aygırı">
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

  const [news, gallery, stats, kisrak, icerik] = await Promise.all([
    renderNewsHtml(env), renderGalleryHtml(env), renderStatsHtml(env), renderKisrakHtml(env), getSiteIcerik(env),
  ]);

  html = html.replace(/<!--NEWS_START-->[\s\S]*?<!--NEWS_END-->/, news);
  html = html.replace(/<!--GALLERY_START-->[\s\S]*?<!--GALLERY_END-->/, gallery);
  html = html.replace(/<!--STATS_START-->[\s\S]*?<!--STATS_END-->/, stats);
  html = html.replace(/<!--KISRAK_START-->[\s\S]*?<!--KISRAK_END-->/, kisrak);
  html = html.replace(/<!--HERO_EYEBROW_START-->[\s\S]*?<!--HERO_EYEBROW_END-->/, esc(icerik.hero_eyebrow || ""));
  html = html.replace(/<!--HERO_TAGLINE_START-->[\s\S]*?<!--HERO_TAGLINE_END-->/, esc(icerik.hero_tagline || ""));
  html = html.replace(/<!--HAKKINDA_BASLIK_START-->[\s\S]*?<!--HAKKINDA_BASLIK_END-->/, esc(icerik.hakkinda_baslik || ""));
  html = html.replace(/<!--HAKKINDA_METIN_START-->[\s\S]*?<!--HAKKINDA_METIN_END-->/, esc(icerik.hakkinda_metin || ""));

  // Tüm site genelinde tek noktadan yönetilen değerler (token tabanlı değişim)
  const waNo = icerik.whatsapp_no || "905324082999";
  const tokenMap = {
    "{{WA_NO}}": waNo,
    "{{WA_NO_DISPLAY}}": formatPhoneTR(waNo),
    "{{PEDIGREE_IMG}}": icerik.pedigree_img || "pedigree2.jpg",
    "{{ILETISIM_IMG}}": icerik.iletisim_img || "aygirlar/images/buyuk.jpg",
    "{{HERO_SLIDE_1}}": icerik.hero_slide1 || "aygirlar/images/slider2.jpg",
    "{{HERO_SLIDE_2}}": icerik.hero_slide2 || "aygirlar/images/slider3.jpg",
    "{{HERO_SLIDE_3}}": icerik.hero_slide3 || "aygirlar/images/slider4.jpg",
    "{{HERO_SLIDE_4}}": icerik.hero_slide4 || "aygirlar/images/slider5.jpg",
    "{{HERO_SLIDE_5}}": icerik.hero_slide5 || "aygirlar/images/slider6.jpg",
    "{{TALEP_ACIKLAMA}}": esc(icerik.talep_aciklama || ""),
    "{{FOOTER_ACIKLAMA}}": esc(icerik.footer_aciklama || ""),
    "{{FOOTER_TELIF}}": esc(icerik.footer_telif || ""),
  };
  for (const [token, val] of Object.entries(tokenMap)) {
    html = html.split(token).join(val);
  }

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

const PANEL_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Büyükdünya - Yönetim Paneli</title>
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
</style>
</head>
<body>

<div id="login-screen" class="card">
  <h2>Panel Girişi</h2>
  <label>Şifre</label>
  <input type="password" id="login-password">
  <button onclick="login()">Giriş Yap</button>
  <div id="login-msg"></div>
</div>

<div id="panel" class="hidden">
  <header><h1>Büyükdünya - Yönetim Paneli</h1></header>
  <div class="wrap">

    <div class="card">
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

    <div class="card">
      <h2>Site Metinleri</h2>
      <label>Hero üst yazı (küçük başlık)</label>
      <input type="text" id="si-eyebrow">
      <label>Hero alt yazı (tanıtım cümlesi)</label>
      <textarea id="si-tagline"></textarea>
      <label>Hakkında - kalın başlık</label>
      <input type="text" id="si-hbaslik">
      <label>Hakkında - açıklama metni</label>
      <textarea id="si-hmetin"></textarea>
      <button onclick="saveSiteIcerik()">Kaydet</button>
      <div id="site-icerik-msg"></div>
    </div>

    <div class="card">
      <h2>Site Ayarları (WhatsApp, Footer, Görseller)</h2>
      <label>WhatsApp / Telefon numarası</label>
      <input type="text" id="sa-wano" placeholder="05XX XXX XX XX">
      <label>Talep Formu üstündeki açıklama</label>
      <textarea id="sa-talep"></textarea>
      <label>Footer açıklama paragrafı</label>
      <textarea id="sa-faciklama"></textarea>
      <label>Footer telif (copyright) yazısı</label>
      <input type="text" id="sa-ftelif">

      <label>Pedigree görseli</label>
      <div id="sa-pedigree-prev"></div>
      <input type="file" id="sa-pedigree-dosya" accept="image/*">

      <label>İletişim görseli</label>
      <div id="sa-iletisim-prev"></div>
      <input type="file" id="sa-iletisim-dosya" accept="image/*">

      <label>Hero kayan slayt görselleri (5 adet)</label>
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

    <div class="card">
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

    <div class="card">
      <h2>Haberler Listesi</h2>
      <div id="news-list"></div>
    </div>

    <div class="card">
      <h2>Galeriye Ekle</h2>
      <label>Tür</label>
      <select id="g-tip"><option value="foto">Fotoğraf</option><option value="video">Video</option></select>
      <label>Dosya</label>
      <input type="file" id="g-dosya" accept="image/*,video/*">
      <label>Başlık (opsiyonel)</label>
      <input type="text" id="g-baslik">
      <button onclick="addGallery()">Ekle</button>
      <div id="gallery-msg"></div>
    </div>

    <div class="card">
      <h2>Galeri Listesi</h2>
      <div id="gallery-list"></div>
    </div>

    <div class="card">
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

    <div class="card">
      <h2>Kısraklar Listesi</h2>
      <div id="kisrak-list"></div>
    </div>

    <div class="card">
      <h2>Gelen Talepler</h2>
      <div id="talep-list"></div>
    </div>

    <div class="card">
      <h2>WhatsApp Tıklamaları</h2>
      <div id="wa-stats">Yükleniyor...</div>
    </div>

  </div>
</div>

<script>
function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.className = "msg " + (ok ? "ok" : "err");
  el.textContent = text;
  setTimeout(() => { el.textContent = ""; }, 4000);
}

async function login() {
  const password = document.getElementById("login-password").value;
  const r = await fetch("/panel/login", { method: "POST", body: JSON.stringify({ password }), headers: { "Content-Type": "application/json" } });
  if (r.ok) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("panel").classList.remove("hidden");
    loadAll();
  } else {
    showMsg("login-msg", "Şifre hatalı", false);
  }
}

async function loadAll() {
  const p = await (await fetch("/api/profile")).json();
  document.getElementById("p-toplam").value = p.toplam_yaris;
  document.getElementById("p-birincilik").value = p.birincilik;
  document.getElementById("p-grup").value = p.grup_galibiyeti;
  document.getElementById("p-kv").value = p.kv_galibiyeti;
  loadNews();
  loadGallery();
  loadKisrak();
  loadTalepler();
  loadWaStats();
  loadSiteIcerik();
  loadSiteAyarlar();
}

async function loadSiteIcerik() {
  const d = await (await fetch("/api/site-icerik")).json();
  document.getElementById("si-eyebrow").value = d.hero_eyebrow || "";
  document.getElementById("si-tagline").value = d.hero_tagline || "";
  document.getElementById("si-hbaslik").value = d.hakkinda_baslik || "";
  document.getElementById("si-hmetin").value = d.hakkinda_metin || "";
}

async function saveSiteIcerik() {
  const body = {
    hero_eyebrow: document.getElementById("si-eyebrow").value,
    hero_tagline: document.getElementById("si-tagline").value,
    hakkinda_baslik: document.getElementById("si-hbaslik").value,
    hakkinda_metin: document.getElementById("si-hmetin").value,
  };
  const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  showMsg("site-icerik-msg", r.ok ? "Kaydedildi" : "Hata oluştu", r.ok);
}

function absUrl(u) {
  if (!u) return "";
  return /^https?:\/\//.test(u) ? u : "/" + u.replace(/^\/+/, "");
}

async function loadSiteAyarlar() {
  const d = await (await fetch("/api/site-icerik")).json();
  document.getElementById("sa-wano").value = d.whatsapp_no || "";
  document.getElementById("sa-talep").value = d.talep_aciklama || "";
  document.getElementById("sa-faciklama").value = d.footer_aciklama || "";
  document.getElementById("sa-ftelif").value = d.footer_telif || "";
  const previews = {
    "sa-pedigree-prev": d.pedigree_img,
    "sa-iletisim-prev": d.iletisim_img,
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
  window._saCurrent = d;
}

async function saveSiteAyarlar() {
  try {
    const body = {
      whatsapp_no: document.getElementById("sa-wano").value.replace(/\D/g, ""),
      talep_aciklama: document.getElementById("sa-talep").value,
      footer_aciklama: document.getElementById("sa-faciklama").value,
      footer_telif: document.getElementById("sa-ftelif").value,
    };
    const fileMap = {
      pedigree_img: "sa-pedigree-dosya",
      iletisim_img: "sa-iletisim-dosya",
      hero_slide1: "sa-slide1-dosya",
      hero_slide2: "sa-slide2-dosya",
      hero_slide3: "sa-slide3-dosya",
      hero_slide4: "sa-slide4-dosya",
      hero_slide5: "sa-slide5-dosya",
    };
    for (const [key, inputId] of Object.entries(fileMap)) {
      const input = document.getElementById(inputId);
      if (input.files[0]) {
        body[key] = await uploadFile(input.files[0]);
      } else if (window._saCurrent && window._saCurrent[key]) {
        body[key] = window._saCurrent[key];
      }
    }
    const r = await fetch("/api/site-icerik", { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("site-ayarlar-msg", r.ok ? "Kaydedildi" : "Hata oluştu", r.ok);
    if (r.ok) loadSiteAyarlar();
  } catch (e) { showMsg("site-ayarlar-msg", e.message, false); }
}

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

async function addGallery() {
  try {
    const fileInput = document.getElementById("g-dosya");
    if (!fileInput.files[0]) { showMsg("gallery-msg", "Dosya seçin", false); return; }
    const url = await uploadFile(fileInput.files[0]);
    const body = {
      tip: document.getElementById("g-tip").value,
      url,
      baslik: document.getElementById("g-baslik").value,
    };
    const r = await fetch("/api/gallery", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    showMsg("gallery-msg", r.ok ? "Eklendi" : "Hata oluştu", r.ok);
    if (r.ok) {
      fileInput.value = "";
      document.getElementById("g-baslik").value = "";
      loadGallery();
    }
  } catch (e) { showMsg("gallery-msg", e.message, false); }
}

async function loadGallery() {
  const items = await (await fetch("/api/gallery")).json();
  const el = document.getElementById("gallery-list");
  el.innerHTML = items.map(g => \`
    <div class="item">
      \${g.tip === 'video' ? '<video src="' + g.url + '" controls></video>' : '<img src="' + g.url + '">'}
      \${g.baslik || ''}<br>
      <button class="danger" onclick="deleteGallery(\${g.id})">Sil</button>
    </div>\`).join("") || "<p>Henüz içerik yok.</p>";
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
(async () => {
  const r = await fetch("/api/profile");
  if (r.ok) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("panel").classList.remove("hidden");
    loadAll();
  }
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // --- Panel login/logout ---
    if (path === "/panel/login" && request.method === "POST") {
      const { password } = await request.json();
      if (password === env.PANEL_PASSWORD) {
        const token = await signToken(env.PANEL_PASSWORD);
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
          },
        });
      }
      return json({ error: "Şifre hatalı" }, 401);
    }
    if (path === "/panel/logout") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/panel", "Set-Cookie": "session=; Path=/; Max-Age=0" },
      });
    }
    if (path === "/panel") {
      return new Response(PANEL_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // --- API ---
    if (path.startsWith("/api/")) {
      const authed = await requireAuth(request, env);

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

      if (path === "/api/gallery" && request.method === "GET") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT * FROM gallery ORDER BY id DESC").all();
        return json(results);
      }
      if (path === "/api/gallery" && request.method === "POST") {
        if (!authed) return json({ error: "unauthorized" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          "INSERT INTO gallery (tip, url, baslik) VALUES (?, ?, ?)"
        ).bind(b.tip || "foto", b.url || "", b.baslik || "").run();
        return json({ ok: true });
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
          "hero_eyebrow", "hero_tagline", "hakkinda_baslik", "hakkinda_metin",
          "whatsapp_no", "talep_aciklama", "footer_aciklama", "footer_telif",
          "pedigree_img", "iletisim_img",
          "hero_slide1", "hero_slide2", "hero_slide3", "hero_slide4", "hero_slide5",
        ]) {
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
        const key = `panel/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await env.ASSETS.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });
        return json({ url: `${R2_PUBLIC}/${key}` });
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

    // --- Public site ---
    if (path === "/" || path === "") path = "/index.html";
    if (path === "/index.html") return servePublicPage(path, env);
    if (path === "/test1") return servePublicPage("/index_test1.html", env);
    return serveStaticAsset(path);
  },
};
