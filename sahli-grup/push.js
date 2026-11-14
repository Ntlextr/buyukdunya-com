// Şahlı Grup Panel — Web Push (telefon bildirimi), 15.11.2026
// Serdar: "Luxury'de Güven'e atılan mesajlar Şahlı panele düşsün, Güven'e bildirim çıksın" → kilitli telefonda da.
// Dış kütüphane YOK; WebCrypto ile:
//  - VAPID (RFC 8292): ES256 imzalı JWT. Özel anahtar Secret VAPID_OZEL (JWK JSON); açık anahtar JWK'nin x,y'sinden.
//  - Şifreleme (RFC 8291 + RFC 8188, aes128gcm): ECDH (geçici anahtar) + HKDF + AES-128-GCM, tek kayıt.
// iPhone: iOS 16.4+ ve panel ANA EKRANA eklenmiş olmalı; Android Chrome her durumda.
const enc = (s) => new TextEncoder().encode(s);
export function b64u(bayt) { let s = ""; const a = new Uint8Array(bayt); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function b64uBayt(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const h = atob(s), a = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) a[i] = h.charCodeAt(i); return a; }
function birlestir(...p) { const n = p.reduce((t, x) => t + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; }

// VAPID açık anahtarı (65 bayt, 0x04 || x || y) — tarayıcının subscribe() çağrısına verilir
export function vapidAcik(env) {
  const j = JSON.parse(env.VAPID_OZEL);
  return b64u(birlestir(new Uint8Array([4]), b64uBayt(j.x), b64uBayt(j.y)));
}

async function vapidBaslik(env, endpoint) {
  const j = JSON.parse(env.VAPID_OZEL);
  const anahtar = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: j.x, y: j.y, d: j.d, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const u = new URL(endpoint);
  const g = b64u(enc(JSON.stringify({ typ: "JWT", alg: "ES256" }))) + "." + b64u(enc(JSON.stringify({ aud: u.protocol + "//" + u.host, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:bilgi@seraytekno.com" })));
  const im = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, anahtar, enc(g));
  return "vapid t=" + g + "." + b64u(im) + ", k=" + vapidAcik(env);
}

async function hkdf(salt, ikm, info, bit) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bit));
}

// RFC 8291: yükü aboneliğin anahtarlarıyla şifreler → aes128gcm gövdesi
export async function pushSifrele(p256dh, auth, yuk) {
  const uaAcik = b64uBayt(p256dh), sir = b64uBayt(auth);
  const uaKey = await crypto.subtle.importKey("raw", uaAcik, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const gecici = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asAcik = new Uint8Array(await crypto.subtle.exportKey("raw", gecici.publicKey));
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, gecici.privateKey, 256));
  const ikm = await hkdf(sir, ecdh, birlestir(enc("WebPush: info\0"), uaAcik, asAcik), 256);
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(tuz, ikm, enc("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await hkdf(tuz, ikm, enc("Content-Encoding: nonce\0"), 96);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sifreli = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, birlestir(enc(yuk), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return birlestir(tuz, rs, new Uint8Array([asAcik.length]), asAcik, sifreli);
}

// Tek aboneliğe gönderir → { durum, sil } (404/410 = abonelik ölmüş, silinmeli)
export async function pushGonder(env, abone, veri, fetchFn = fetch) {
  const govde = await pushSifrele(abone.p256dh, abone.auth, JSON.stringify(veri));
  const r = await fetchFn(abone.endpoint, {
    method: "POST",
    headers: { Authorization: await vapidBaslik(env, abone.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
    body: govde,
  });
  return { durum: r.status, sil: r.status === 404 || r.status === 410 };
}

// Servis çalışanı (sadece bildirim; ÖNBELLEK YOK — sayfa her zaman sunucudan gelir)
export const SW_JS = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { metin: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.baslik || 'Şahlı Grup Panel', {
    body: d.metin || '', icon: '/ikon-192.png', badge: '/ikon-192.png', tag: d.etiket || 'sahli', renotify: true,
    data: { url: d.url || '/' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hedef = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) { if ('focus' in c) { c.navigate(hedef).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(hedef);
  }));
});
`;
