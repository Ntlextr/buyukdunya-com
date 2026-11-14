// Şahlı Grup Panel — arayüz (tek sayfa). worker.js içe aktarır.
export const PANEL_HTML = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Şahlı Grup Panel</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#13221a">
<link rel="apple-touch-icon" href="/ikon-180.png">
<link rel="icon" href="/ikon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Şahlı Grup">
<style>
:root{--koyu:#13221a;--altin:#c9a24b;--krem:#f6f3ec;--yazi:#1f2a24;--soluk:#6b746e;--kart:#fff;--cizgi:#e6e0d2}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--krem);color:var(--yazi)}
header{position:sticky;top:0;z-index:5;background:var(--koyu);color:#fff;display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top))}
header img{width:38px;height:38px;border-radius:9px}
header .ad{font-weight:700;letter-spacing:.3px}
header .alt{font-size:11px;color:#cfc5a8}
header .sag{margin-left:auto;display:flex;gap:6px;align-items:center}
header button,header a.cik{background:transparent;color:#fff;border:1px solid #ffffff40;border-radius:8px;padding:6px 10px;font-size:13px;text-decoration:none;cursor:pointer}
nav{display:flex;gap:6px;padding:10px 14px 0;overflow-x:auto}
nav button{border:1px solid var(--cizgi);background:#fff;border-radius:20px;padding:7px 14px;font-size:14px;white-space:nowrap;cursor:pointer;color:var(--yazi)}
nav button.secili{background:var(--koyu);color:#fff;border-color:var(--koyu)}
main{max-width:1100px;margin:0 auto;padding:14px}
.selam{margin:4px 0 14px}.selam h1{font-size:21px;margin:0 0 4px}.selam p{margin:0;color:var(--soluk);font-size:14px}
.kartlar{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.kart{background:var(--kart);border:1px solid var(--cizgi);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.kart .bas{padding:14px 16px;color:#fff;display:flex;align-items:center;gap:10px}
.kart .bas .ik{font-size:26px}.kart .bas h2{margin:0;font-size:17px}.kart .bas small{opacity:.8;font-size:12px}
.lux .bas{background:linear-gradient(135deg,#2b2b2e,#6d5a35)}
.bd .bas{background:linear-gradient(135deg,#0d1b3d,#2a4a8a)}
.oto .bas{background:linear-gradient(135deg,#3a3a3a,#8a1c1c)}
.sayilar{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--cizgi)}
.sayi{background:#fff;padding:11px 14px}.sayi b{display:block;font-size:19px}.sayi span{font-size:12px;color:var(--soluk)}
.sayi.gen{grid-column:1/-1}
.kart .govde{padding:12px 16px;font-size:13px;color:var(--soluk);flex:1}
.kart .govde ul{margin:6px 0 0;padding-left:18px}
.dugmeler{display:flex;gap:8px;padding:12px 16px 16px;flex-wrap:wrap}
.btn{flex:1;min-width:120px;text-align:center;border-radius:10px;padding:11px 12px;font-size:14px;font-weight:600;border:0;cursor:pointer;text-decoration:none}
.btn.ana{background:var(--koyu);color:#fff}.btn.ikinci{background:#fff;color:var(--yazi);border:1px solid var(--cizgi)}
.btn:disabled{opacity:.5}
.hazir{display:inline-block;background:#fff3d6;color:#7a5a12;border-radius:20px;padding:4px 10px;font-size:12px;margin-top:6px}
.bolum{display:none}.bolum.acik{display:block}
.kutu{background:#fff;border:1px solid var(--cizgi);border-radius:14px;padding:16px;margin-bottom:14px}
.kutu h3{margin:0 0 10px;font-size:16px}
label{display:block;font-size:13px;color:var(--soluk);margin:10px 0 4px}
input{width:100%;padding:11px 12px;border:1px solid var(--cizgi);border-radius:10px;font-size:16px}
#girisEkran{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--koyu)}
#girisEkran .kutu{width:100%;max-width:360px;text-align:center}
#girisEkran img{width:84px;height:84px;border-radius:18px}
.hata{color:#b3261e;font-size:13px;min-height:18px;margin-top:8px}
.not{font-size:12px;color:var(--soluk)}
.serit{background:#fff3d6;color:#7a5a12;font-size:13px;padding:7px 14px;text-align:center}
.kisi{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--cizgi);font-size:14px}
.nokta{width:10px;height:10px;border-radius:50%}.yesil{background:#2e9d50}.sari{background:#e0a800}.kirmizi{background:#c9c9c9}
.akis div{font-size:13px;padding:6px 0;border-bottom:1px dashed var(--cizgi)}
.akis time{color:var(--soluk);margin-right:6px}
#pencere{position:fixed;inset:0;background:#0008;display:none;align-items:center;justify-content:center;z-index:20;padding:20px}
#pencere .kutu{max-width:380px;width:100%}
@media (max-width:420px){.kartlar{grid-template-columns:1fr}header .alt{display:none}}
</style></head><body>
<div id="girisEkran" style="display:none"><div class="kutu">
<img src="/ikon-192.png" alt=""><h2 style="margin:10px 0 2px">Şahlı Grup Panel</h2><p class="not">Bütün işletmeleriniz tek ekranda</p>
<form id="girisForm"><label>Kullanıcı adı</label><input id="gKadi" autocomplete="username" autocapitalize="none">
<label>Şifre</label><input id="gSifre" type="password" autocomplete="current-password">
<button class="btn ana" style="width:100%;margin-top:14px">Giriş</button><div class="hata" id="gHata"></div></form></div></div>

<div id="uygulama" style="display:none">
<header><img src="/ikon-192.png" alt=""><div><div class="ad">Şahlı Grup Panel</div><div class="alt" id="ustKim"></div></div>
<div class="sag"><a class="cik" href="/cikis" id="cikisBag">Çıkış</a></div></header>
<div class="serit" id="destekSerit" style="display:none">🛟 Seray Tekno Destek (Developer) olarak girdiniz</div>
<nav id="menu"><button data-git="ana" class="secili">🏢 İşletmeler</button><button data-git="canli" id="navCanli" style="display:none">👀 Canlı İzle</button><button data-git="hesap">👤 Hesabım</button></nav>
<main>
<section class="bolum acik" id="b-ana">
<div class="selam"><h1 id="selam">Hoş geldiniz</h1><p id="tarih"></p></div>
<div class="kartlar">
<div class="kart lux"><div class="bas"><span class="ik">💆‍♀️</span><div><h2>Luxury Beauty Center</h2><small>Kadıköy · güzellik merkezi</small></div></div>
<div class="sayilar" id="luxSay"><div class="sayi gen"><span>Yükleniyor…</span></div></div>
<div class="dugmeler"><button class="btn ana" data-gir="luxury">🔑 Panele gir</button><a class="btn ikinci" target="_blank" rel="noopener" href="https://luxurybeauty-js.serdarcirak.workers.dev/">🌐 Siteyi aç</a></div></div>
<div class="kart bd"><div class="bas"><span class="ik">🐎</span><div><h2>Şahlı Harası – BÜYÜKDÜNYA</h2><small>buyukdunya.com</small></div></div>
<div class="sayilar" id="bdSay"><div class="sayi gen"><span>Yükleniyor…</span></div></div>
<div class="govde" id="bdSon"></div>
<div class="dugmeler"><button class="btn ana" data-gir="buyukdunya">🔑 Panele gir</button><a class="btn ikinci" target="_blank" rel="noopener" href="https://buyukdunya.com/">🌐 Siteyi aç</a></div></div>
<div class="kart oto"><div class="bas"><span class="ik">🚗</span><div><h2>Şahlı Otomotiv</h2><small>sahliotomotiv.com</small></div></div>
<div class="govde">Site ve panel hazırlanıyor.<br><span class="hazir">⏳ Yakında</span></div>
<div class="dugmeler"><button class="btn ikinci" disabled>Hazırlanıyor</button></div></div>
</div></section>

<section class="bolum" id="b-canli">
<div class="kutu"><h3>Kim panelde?</h3><div id="kisiler"></div></div>
<div class="kutu"><h3>Canlı akış <span class="not" id="canliNot"></span></h3>
<div style="display:flex;gap:8px;margin-bottom:8px"><select id="cKisi" style="flex:1;padding:8px;border-radius:8px"></select><input type="date" id="cGun" style="flex:1;padding:8px;font-size:14px"></div>
<div class="akis" id="akis"></div></div></section>

<section class="bolum" id="b-hesap">
<div class="kutu"><h3>Şifremi değiştir</h3>
<label>Eski şifre</label><input type="password" id="hEski" autocomplete="current-password">
<label>Yeni şifre (en az 6 karakter)</label><input type="password" id="hYeni" autocomplete="new-password">
<button class="btn ana" style="margin-top:12px;width:100%" id="hKaydet">Kaydet</button><div class="hata" id="hHata"></div></div>
<div class="kutu"><h3>📱 Telefonun ana ekranına ekle</h3>
<p class="not"><b>iPhone (Safari):</b> alttaki Paylaş düğmesine (kare + yukarı ok) dokunun → <b>Ana Ekrana Ekle</b> → <b>Ekle</b>. Ekranınızda "Şahlı Grup" simgesi çıkar.</p>
<p class="not"><b>Android (Chrome):</b> sağ üstteki ⋮ → <b>Ana ekrana ekle</b>.</p></div>
<p class="not" style="text-align:center">Şahlı Grup Panel {{SURUM}} · Developed by <a href="https://www.seraytekno.com" target="_blank" rel="noopener">Seray Tekno Yazılım</a></p>
</section>
</main></div>

<div id="pencere"><div class="kutu"><div id="pIcerik"></div><button class="btn ana" style="width:100%;margin-top:12px" id="pKapat">Tamam</button></div></div>

<script>
const $=s=>document.querySelector(s);
let BEN=null,SEKME="ana",CIKIYOR=false,CANLI_T=null,SON_ID=0,TIK=[];
const tl=n=>(Number(n)||0).toLocaleString("tr-TR",{maximumFractionDigits:0})+" ₺";
const SEKAD={ana:"İşletmeler",canli:"Canlı İzle",hesap:"Hesabım"};const ka=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function api(y,g){const r=await fetch(y,{method:g?"POST":"GET",headers:{"x-panel-sekme":SEKME,...(g?{"Content-Type":"application/json"}:{})},body:g?JSON.stringify(g):undefined});
 if(r.status===401){oturumDustu();throw new Error("oturum");} const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.hata||"Hata"); return j;}
function oturumDustu(){$("#uygulama").style.display="none";$("#girisEkran").style.display="flex";}
function pencere(h){$("#pIcerik").innerHTML=h;$("#pencere").style.display="flex";}
$("#pKapat").onclick=()=>{$("#pencere").style.display="none";};

$("#girisForm").onsubmit=async e=>{e.preventDefault();$("#gHata").textContent="";
 const r=await fetch("/giris",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kadi:$("#gKadi").value,sifre:$("#gSifre").value})});
 const j=await r.json().catch(()=>({})); if(!r.ok){$("#gHata").textContent=j.hata||"Giriş olmadı";return;} basla();};

function git(ad,gecmis){SEKME=ad;document.querySelectorAll(".bolum").forEach(b=>b.classList.toggle("acik",b.id==="b-"+ad));
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("secili",b.dataset.git===ad));
 if(gecmis!==false) history.pushState({s:ad},"","#"+ad);
 if(ad==="canli") canliBasla(); else canliDur(); if(ad==="ana") ozetYukle(); nabiz();}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>git(b.dataset.git));

// Geri tuşu: panelden çıkılmasın
function korumaKur(){history.replaceState({kok:1},"",location.pathname);history.pushState({s:"ana"},"","#ana");}
addEventListener("popstate",e=>{if($("#pencere").style.display==="flex"){$("#pencere").style.display="none";history.pushState({s:SEKME},"","#"+SEKME);return;}
 if(e.state&&e.state.s){git(e.state.s,false);return;} if(SEKME!=="ana"){git("ana");return;} history.pushState({s:"ana"},"","#ana");});
addEventListener("beforeunload",e=>{if(!CIKIYOR&&BEN){e.preventDefault();e.returnValue="";}});
$("#cikisBag").onclick=()=>{CIKIYOR=true;};

async function basla(){
 try{BEN=await api("/api/ben");}catch(e){return;}
 $("#girisEkran").style.display="none";$("#uygulama").style.display="block";
 $("#ustKim").textContent=BEN.ad+" · "+BEN.surum;
 $("#destekSerit").style.display=BEN.yol==="merkez"?"block":"none";
 $("#navCanli").style.display=BEN.dev?"":"none";
 const s=new Date().getHours(); $("#selam").textContent=(s<11?"Günaydın":s<18?"İyi günler":"İyi akşamlar")+", "+BEN.ad;
 $("#tarih").textContent=new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 korumaKur();git("ana",false);setInterval(nabiz,60000);setInterval(()=>{if(SEKME==="ana")ozetYukle();},120000);iphoneTarif();}

async function ozetYukle(){try{const o=await api("/api/ozet");const L=o.luxury,B=o.buyukdunya;
 $("#luxSay").innerHTML=L.hata?'<div class="sayi gen"><span>'+ka(L.hata)+'</span></div>':
  '<div class="sayi"><b>'+L.randevu+'</b><span>Bugünkü randevu ('+L.randevu_tamam+' tamamlandı)</span></div>'+
  '<div class="sayi"><b>'+tl(L.tahsilat_bugun)+'</b><span>Bugün tahsilat ('+L.tahsilat_bugun_adet+')</span></div>'+
  '<div class="sayi"><b>'+tl(L.satis_bugun)+'</b><span>Bugün satış ('+L.satis_bugun_adet+')</span></div>'+
  '<div class="sayi"><b>'+tl(L.tahsilat_ay)+'</b><span>Bu ay tahsilat</span></div>'+
  '<div class="sayi"><b>'+tl(L.acik_bakiye)+'</b><span>Müşterilerde açık bakiye</span></div>'+
  '<div class="sayi"><b>'+L.yeni_talep+'</b><span>Siteden yeni talep</span></div>';
 $("#bdSay").innerHTML=B.hata?'<div class="sayi gen"><span>'+ka(B.hata)+'</span></div>':
  '<div class="sayi"><b>'+B.talep_7+'</b><span>Son 7 gün kısrak talebi</span></div>'+
  '<div class="sayi"><b>'+B.talep+'</b><span>Toplam talep</span></div>'+
  '<div class="sayi"><b>'+B.wa_bugun+'</b><span>Bugün WhatsApp tıklaması</span></div>'+
  '<div class="sayi"><b>'+B.wa+'</b><span>Toplam WhatsApp tıklaması</span></div>';
 $("#bdSon").innerHTML=(B.son_talepler&&B.son_talepler.length)?'<b>Son talepler</b><ul>'+B.son_talepler.map(t=>'<li>'+ka(t.ad_soyad)+(t.kisrak_bilgisi?' — '+ka(String(t.kisrak_bilgisi).slice(0,40)):'')+'</li>').join("")+'</ul>':'';
}catch(e){}}

document.querySelectorAll("[data-gir]").forEach(b=>b.onclick=async()=>{const w=window.open("about:blank","_blank");b.disabled=true;
 try{const j=await api("/api/gir",{hedef:b.dataset.gir}); if(w) w.location=j.adres; else location.href=j.adres;}
 catch(e){if(w)w.close(); if(e.message!=="oturum") pencere("<p>"+ka(e.message)+"</p>");} b.disabled=false;});

$("#hKaydet").onclick=async()=>{$("#hHata").textContent="";try{await api("/api/sifre",{eski:$("#hEski").value,yeni:$("#hYeni").value});
 $("#hEski").value=$("#hYeni").value="";pencere("<p>✅ Şifreniz değişti.</p>");}catch(e){$("#hHata").textContent=e.message;}};

// Nabız ve dokunuş kaydı
function nabiz(){if(BEN) api("/api/nabiz",{sekme:SEKME}).catch(()=>{});}
document.addEventListener("click",e=>{const el=e.target.closest("button,a");if(!el||!BEN)return;TIK.push({z:Date.now(),s:SEKME,t:(el.textContent||"").trim().slice(0,60)});});
setInterval(()=>{if(TIK.length&&BEN){const l=TIK.splice(0,30);api("/api/tik",{liste:l}).catch(()=>{});}},1500);

// Canlı izle (Developer)
function canliDur(){if(CANLI_T){clearInterval(CANLI_T);CANLI_T=null;}}
function canliBasla(){SON_ID=0;$("#akis").innerHTML="";canliCek();canliDur();CANLI_T=setInterval(canliCek,3000);}
$("#cKisi").onchange=$("#cGun").onchange=()=>{SON_ID=0;$("#akis").innerHTML="";canliCek();};
async function canliCek(){try{const q=new URLSearchParams({son:SON_ID,kid:$("#cKisi").value||"",gun:$("#cGun").value||""});
 const j=await api("/api/canli?"+q);const sec=$("#cKisi").value;
 $("#cKisi").innerHTML='<option value="">Herkes</option>'+j.kisiler.map(k=>'<option value="'+k.id+'">'+ka(k.ad)+'</option>').join("");$("#cKisi").value=sec;
 $("#kisiler").innerHTML=j.kisiler.map(k=>'<div class="kisi"><span class="nokta '+k.durum+'"></span><b>'+ka(k.ad)+'</b><span class="not">'+(k.son?new Date(k.son).toLocaleString("tr-TR"):"hiç girmedi")+(k.cihaz?" · "+ka(k.cihaz):"")+(k.sekme?" · "+ka(SEKAD[k.sekme]||k.sekme):"")+(k.merkez?" · Merkez":"")+'</span></div>').join("");
 if(j.akis.length){SON_ID=Math.max(SON_ID,...j.akis.map(a=>a.id));
  const h=j.akis.map(a=>'<div><time>'+new Date(a.zaman).toLocaleString("tr-TR")+'</time><b>'+ka(a.ad||"?")+'</b> · '+({ekran:"📄 ekran",tik:"👆",islem:"✏️",giris:"🔓",cikis:"🔒"}[a.tur]||a.tur)+' '+ka(SEKAD[a.sekme]||a.sekme||"")+' '+ka(a.detay||"")+'</div>').join("");
  $("#akis").insertAdjacentHTML("afterbegin",h);}
 $("#canliNot").textContent="· 3 sn'de bir yenilenir";}catch(e){}}

function iphoneTarif(){const ios=/iPhone|iPad/.test(navigator.userAgent),ekli=navigator.standalone||matchMedia("(display-mode: standalone)").matches;
 if(!ios||ekli)return;try{if(localStorage.getItem("sgTarif"))return;localStorage.setItem("sgTarif","1");}catch(e){}
 pencere('<h3>📱 Ana ekrana ekleyin</h3><p class="not">Alttaki <b>Paylaş</b> düğmesine (kare + yukarı ok) dokunun → <b>Ana Ekrana Ekle</b> → <b>Ekle</b>. Sonra paneli uygulama gibi açarsınız.</p>');}

(async()=>{try{const r=await fetch("/api/ben");if(r.ok){basla();return;}}catch(e){} oturumDustu();})();
</script></body></html>`;
