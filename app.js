// Öğretmen Ekranı — iskelet (Adım 4). Salt-okunur: sunucuya yalnız GET ile okuma isteği gider.
(function () {
  'use strict';
  var A = window.OGR_AYAR;
  var K = { okul: 'ogr_okul', kod: 'ogr_kod', cihaz: 'ogr_cihaz', onb: 'ogr_onbellek', tema: 'ogr_tema' };
  var MESAJ = {
    okul: 'Okul kodu hatalı. Tekrar dene.',
    kod: 'Kişisel kod hatalı. Tekrar dene.',
    bekle: 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar dene.',
    ag: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    sunucu: 'Sunucu şu an yanıt vermiyor. Biraz sonra tekrar dene.',
    gecersiz: 'Kodun artık geçerli değil. Okuldan yeni kod iste.'
  };
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  // ---- güvenli depolama (özel gezinti vb. durumlarda hata verirse bellekte tutar)
  var bellek = {};
  function oku(k) { try { var v = localStorage.getItem(k); return v === null ? (bellek[k] || null) : v; } catch (e) { return bellek[k] || null; } }
  function yaz(k, v) { bellek[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function sil(k) { delete bellek[k]; try { localStorage.removeItem(k); } catch (e) {} }

  function cihazNo() {
    var c = oku(K.cihaz);
    if (c && /^[A-Za-z0-9_-]{8,40}$/.test(c)) return c;
    var h = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', s = '';
    try { var b = new Uint8Array(20); crypto.getRandomValues(b); for (var i = 0; i < 20; i++) s += h[b[i] % h.length]; }
    catch (e) { for (var j = 0; j < 20; j++) s += h[Math.floor(Math.random() * h.length)]; }
    yaz(K.cihaz, s); return s;
  }

  // ---- küçük DOM yardımcıları (içerik daima textContent ile yazılır)
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ikon(d) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.appendChild(p); return s;
  }
  var IK_DISLI = 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z';
  var IK_YENILE = 'M21 12a9 9 0 11-3-6.7M21 4v5h-5';
  var kok = document.getElementById('uyg');

  function bugunStr() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function saatStr(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function ilkAd(ad) { return String(ad || '').trim().split(/\s+/)[0] || ''; }
  function norm(s) { return String(s || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' '); }

  // ---- tema
  function temaUygula() {
    var t = oku(K.tema), r = document.documentElement;
    if (t === 'acik') r.setAttribute('data-th', 'light'); else if (t === 'koyu') r.setAttribute('data-th', 'dark'); else r.removeAttribute('data-th');
  }

  // ---- ağ: yalnız GET, 15 sn zaman aşımı
  function cagri(p) {
    var q = Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
    var ac = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ac) ac.abort(); }, 15000);
    return fetch(A.UC + '?' + q, { signal: ac ? ac.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(t); return (j && typeof j === 'object') ? j : { ok: false, hata: 'sunucu' }; })
      .catch(function () { clearTimeout(t); return { ok: false, hata: 'ag' }; });
  }

  // ================= KİLİT EKRANI =================
  var kilit = null;
  function kilitGoster(adim, okulKodu, ilkMesaj) {
    kok.textContent = '';
    kilit = { adim: adim, okul: okulKodu || '', deger: '', mesaj: ilkMesaj || '', mesgul: false };
    kilitCiz();
  }
  function kilitCiz() {
    var K6 = kilit.adim === 'okul' ? 6 : 4;
    kok.textContent = '';
    var w = el('div', 'lock' + (kilit.mesgul ? ' busy' : ''));
    var im = el('img'); im.src = 'ikon/logo.png'; im.alt = ''; w.appendChild(im);
    w.appendChild(el('h1', '', kilit.adim === 'okul' ? 'Okul kodunu gir' : 'Kişisel kodunu gir'));
    w.appendChild(el('p', 'sub', kilit.adim === 'okul'
      ? 'Okul yönetiminden aldığın 6 haneli kodu yaz.'
      : 'Sana özel verilen 4 haneli kodu yaz. Bu cihaza bağlanır, her açılışta sorulmaz.'));
    var kutu = el('div', 'cod'); kutu.setAttribute('aria-label', 'Girilen kod');
    for (var i = 0; i < K6; i++) {
      var c = el('i', i === kilit.deger.length ? 'f' : '', i < kilit.deger.length ? '•' : '');
      kutu.appendChild(c);
    }
    w.appendChild(kutu);
    var er = el('div', 'er', kilit.mesgul ? 'Kontrol ediliyor…' : kilit.mesaj); er.setAttribute('role', 'alert'); w.appendChild(er);
    if (kilit.adim === 'kod') {
      var g = el('button', 'geri', '← Okul kodunu değiştir'); g.type = 'button';
      g.onclick = function () { kilitGoster('okul'); }; w.appendChild(g);
    }
    var kp = el('div', 'kp');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Sil'].forEach(function (t) {
      if (t === '') { kp.appendChild(el('span')); return; }
      var b = el('button', t === 'Sil' ? 'gh' : '', t); b.type = 'button';
      b.setAttribute('data-k', t);
      b.onclick = function () { tus(t); };
      kp.appendChild(b);
    });
    w.appendChild(kp);
    kok.appendChild(w);
  }
  function tus(t) {
    if (!kilit || kilit.mesgul) return;
    var K6 = kilit.adim === 'okul' ? 6 : 4;
    if (t === 'Sil') kilit.deger = kilit.deger.slice(0, -1);
    else if (/^\d$/.test(t) && kilit.deger.length < K6) kilit.deger += t;
    kilit.mesaj = '';
    if (kilit.deger.length === K6) { gonder(); return; }
    kilitCiz();
  }
  function gonder() {
    var adim = kilit.adim, deger = kilit.deger;
    kilit.mesgul = true; kilitCiz();
    var p = { okul: adim === 'okul' ? deger : kilit.okul, cihaz: cihazNo() };
    if (adim === 'kod') p.kod = deger;
    cagri(p).then(function (j) {
      if (adim === 'okul') {
        if (j.ok && j.asama === 'kisisel') return kilitGoster('kod', deger);
        return kilitGoster('okul', '', j.hata === 'giris' ? MESAJ.okul : (MESAJ[j.hata] || MESAJ.sunucu));
      }
      if (j.ok && (j.yayinDurumu === 'acik' || j.yayinDurumu === 'durduruldu')) {
        yaz(K.okul, kilit.okul); yaz(K.kod, deger);
        yaz(K.onb, JSON.stringify({ t: Date.now(), y: j }));
        sonYenileme = Date.now();
        return anaGoster();
      }
      if (j.hata === 'giris') return kilitGoster('kod', kilit.okul, MESAJ.kod);
      return kilitGoster('kod', kilit.okul, MESAJ[j.hata] || MESAJ.sunucu);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!kilit || !document.querySelector('.lock')) return;
    if (/^\d$/.test(e.key)) tus(e.key); else if (e.key === 'Backspace') tus('Sil');
  });

  // ================= ANA EKRAN =================
  var durum = { yenileniyor: false, ag: 'ok', not: '' }; // ag: ok | cevrimdisi | bekle
  var sonYenileme = 0;
  function onbellek() { try { var o = JSON.parse(oku(K.onb) || 'null'); return (o && o.y) ? o : null; } catch (e) { return null; } }
  function eskiMi(o) {
    if (!o) return true;
    var yas = Date.now() - o.t;
    return yas > A.ESKI_SAAT * 3600 * 1000 || yas < -5 * 60 * 1000; // saat geriye alınmışsa da güvenme
  }
  var ayarAcik = false;

  function anaGoster() { kilit = null; ayarAcik = false; anaCiz(); }

  function anaCiz() {
    if (kilit) return;
    var o = onbellek(), y = o && o.y, eski = eskiMi(o);
    var yeniKok = el('div', 'scr');
    var d = new Date(), h = d.getHours();

    var top = el('div', 'top');
    var bar = el('div', 'bar');
    var lg = el('div', 'lg'); var im = el('img'); im.src = 'ikon/logo.png'; im.alt = ''; lg.appendChild(im); bar.appendChild(lg);
    var bm = el('div'); bm.appendChild(el('b', '', (y && y.okul) || 'Öğretmen Ekranı'));
    bm.appendChild(el('span', 'o', (y && y.kisi && y.kisi.ad) || '')); bar.appendChild(bm);
    var r = el('div', 'r');
    var by = el('button', 'ib'); by.type = 'button'; by.setAttribute('aria-label', 'Yenile'); by.appendChild(ikon(IK_YENILE)); by.onclick = function () { yenile(true); }; r.appendChild(by);
    var ba = el('button', 'ib'); ba.type = 'button'; ba.setAttribute('aria-label', 'Ayarlar'); ba.appendChild(ikon(IK_DISLI)); ba.onclick = function () { ayarAcik = true; anaCiz(); }; r.appendChild(ba);
    bar.appendChild(r); top.appendChild(bar);
    var ad = ilkAd(y && y.kisi && y.kisi.ad);
    top.appendChild(el('div', 'tz', (h < 11 ? 'Günaydın' : (h < 18 ? 'İyi günler' : 'İyi akşamlar')) + (ad ? ', ' + ad : '')));
    top.appendChild(el('div', 'tzs', GUN[d.getDay()] + ', ' + d.getDate() + ' ' + AY[d.getMonth()]));
    yeniKok.appendChild(top);

    // güncelleme durumu
    var st = el('div', 'stamp' + (durum.ag !== 'ok' ? ' off' : ''));
    st.appendChild(el('i'));
    var yazi = 'Henüz güncellenmedi';
    if (o) yazi = (durum.ag === 'cevrimdisi' ? 'Çevrimdışı · son bilgi ' : (durum.ag === 'bekle' ? 'Çok sık yenilendi · son bilgi ' : 'Güncellendi ')) + saatStr(o.t);
    if (durum.yenileniyor) yazi = 'Yenileniyor…';
    st.appendChild(el('span', '', yazi));
    yeniKok.appendChild(st);

    if (!y) {
      yeniKok.appendChild(el('div', 'note', durum.yenileniyor ? 'Bilgiler getiriliyor…' : 'Bilgiler alınamadı. İnternet bağlantısını kontrol edip yenile.'));
    } else if (eski) {
      var n = el('div', 'note warn'); n.appendChild(el('b', '', 'Bilgiler eski olduğu için gizlendi'));
      n.appendChild(document.createTextNode('Son güncelleme ' + A.ESKI_SAAT + ' saatten önce. İnternete bağlanınca otomatik yenilenir.')); yeniKok.appendChild(n);
    } else if (y.yayinDurumu !== 'acik') {
      var n2 = el('div', 'note'); n2.appendChild(el('b', '', 'Yayın şu an kapalı'));
      n2.appendChild(document.createTextNode('Okul yönetimi açtığında bilgiler burada görünecek.')); yeniKok.appendChild(n2);
    } else {
      iceriCiz(yeniKok, y);
    }
    kok.textContent = ''; kok.appendChild(yeniKok);
    if (ayarAcik) ayarCiz();
  }

  function iceriCiz(kap, y) {
    var ortak = y.ortak || {}, gosterilen = 0;
    var nb = ortak.nobetciler;
    if (nb && nb.d) {
      gosterilen++;
      var s = el('div', 'sec'); var h2 = el('h2', ''); h2.appendChild(document.createTextNode('Bugünün nöbetçileri'));
      s.appendChild(h2);
      var liste = Array.isArray(nb.d.liste) ? nb.d.liste : [];
      if (nb.d.tarih !== bugunStr()) {
        kap.appendChild(s);
        kap.appendChild(el('div', 'note', 'Bugünün nöbet listesi henüz yayınlanmadı.'));
      } else if (!liste.length) {
        kap.appendChild(s);
        kap.appendChild(el('div', 'note', 'Bugün için nöbetçi görünmüyor.'));
      } else {
        h2.appendChild(el('span', '', liste.length + ' kişi'));
        var rows = el('div', 'rows'), ben = norm(y.kisi && y.kisi.ad);
        liste.forEach(function (k) {
          var rw = el('div', 'rw' + (ben && norm(k.ad) === ben ? ' me' : ''));
          var a = el('div', 'a'); a.appendChild(el('b', '', String(k.ad || ''))); rw.appendChild(a);
          rw.appendChild(el('div', 'z', String(k.yer || ''))); rows.appendChild(rw);
        });
        s.appendChild(rows); kap.appendChild(s);
      }
    }
    gosterilen += duyuruCiz(kap, y);
    if (!gosterilen) kap.appendChild(el('div', 'note', 'Henüz yayınlanmış bilgi yok. Okul yönetimi paylaştıkça burada görünecek.'));
  }


  // ---- Duyurular (okul yönetiminin öğretmenlere AYRICA yazdıkları; yönetim notlarıyla ilgisi yok) ----
  var TUR_AD = { duyuru: 'Duyuru', etkinlik: 'Etkinlik', hatirlatma: 'Hatırlatma' };
  function trTarih(t) { return /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? (t.slice(8, 10) + '.' + t.slice(5, 7) + '.' + t.slice(0, 4)) : ''; }
  function duyuruCiz(kap, y) {
    var l = Array.isArray(y.duyurular) ? y.duyurular.filter(function (d) { return d && d.baslik; }) : [];
    if (!l.length) return 0;
    l = l.map(function (d, i) { return { d: d, i: i }; }).sort(function (a, b) {
      var x = a.d.tarih || '9999', z = b.d.tarih || '9999';
      return x < z ? -1 : (x > z ? 1 : a.i - b.i);
    }).map(function (o) { return o.d; });
    var s = el('div', 'sec'); var h2 = el('h2', ''); h2.appendChild(document.createTextNode('Duyurular')); h2.appendChild(el('span', '', l.length + ' duyuru'));
    s.appendChild(h2);
    var bg = bugunStr();
    l.forEach(function (d) {
      var k = el('div', 'dy' + (d.tarih === bg ? ' bugun' : ''));
      var ust = el('div', 'dyu'); ust.appendChild(el('span', 'tr', TUR_AD[d.tur] || 'Duyuru'));
      var zm = [d.tarih === bg ? 'Bugün' : trTarih(d.tarih), /^\d{2}:\d{2}$/.test(d.saat || '') ? d.saat : ''].filter(Boolean).join(' · ');
      if (zm) ust.appendChild(el('span', 'zm', zm));
      k.appendChild(ust); k.appendChild(el('b', '', String(d.baslik)));
      if (d.metin) k.appendChild(el('p', '', String(d.metin)));
      s.appendChild(k);
    });
    kap.appendChild(s); return 1;
  }

  function ayarCiz() {
    var o = onbellek(), y = o && o.y;
    var g = el('div', 'shade'); g.onclick = function () { ayarAcik = false; anaCiz(); };
    var sh = el('div', 'sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Ayarlar');
    sh.appendChild(el('h3', '', 'Ayarlar'));
    function kv(a, b) { var r = el('div', 'kv'); r.appendChild(el('span', '', a)); r.appendChild(el('b', '', b)); sh.appendChild(r); }
    kv('Öğretmen', (y && y.kisi && y.kisi.ad) || '—');
    kv('Okul', (y && y.okul) || '—');
    kv('Son güncelleme', o ? saatStr(o.t) : '—');
    kv('Uygulama sürümü', A.SURUM);
    sh.appendChild(el('div', 'lbl', 'Görünüm'));
    var seg = el('div', 'seg'), t = oku(K.tema) || 'oto';
    [['oto', 'Otomatik'], ['acik', 'Açık'], ['koyu', 'Koyu']].forEach(function (x) {
      var b = el('button', t === x[0] ? 'on' : '', x[1]); b.type = 'button';
      b.onclick = function () { if (x[0] === 'oto') sil(K.tema); else yaz(K.tema, x[0]); temaUygula(); anaCiz(); };
      seg.appendChild(b);
    });
    sh.appendChild(seg);
    var kap = el('button', 'kapat', 'Kapat'); kap.type = 'button'; kap.onclick = function () { ayarAcik = false; anaCiz(); }; sh.appendChild(kap);
    var cik = el('button', 'out', 'Bu cihazdan çık'); cik.type = 'button';
    cik.onclick = function () {
      if (cik.getAttribute('data-onay') !== '1') { cik.setAttribute('data-onay', '1'); cik.textContent = 'Emin misin? Tekrar dokun'; return; }
      sil(K.okul); sil(K.kod); sil(K.onb); kilitGoster('okul');
    };
    sh.appendChild(cik);
    kok.appendChild(g); kok.appendChild(sh);
  }

  // ================= YENİLEME =================
  function yenile(elle) {
    var okul = oku(K.okul), kod = oku(K.kod);
    if (!okul || !kod || durum.yenileniyor) return;
    durum.yenileniyor = true; if (elle) anaCiz();
    cagri({ okul: okul, kod: kod, cihaz: cihazNo() }).then(function (j) {
      durum.yenileniyor = false; sonYenileme = Date.now();
      if (j.ok && (j.yayinDurumu === 'acik' || j.yayinDurumu === 'durduruldu')) {
        var onceki = onbellek();
        if (!j.kisi && onceki && onceki.y && onceki.y.kisi) { j.kisi = onceki.y.kisi; j.okul = onceki.y.okul; }
        yaz(K.onb, JSON.stringify({ t: Date.now(), y: j })); durum.ag = 'ok';
      } else if (j.hata === 'giris') {
        sil(K.okul); sil(K.kod); sil(K.onb); return kilitGoster('okul', '', MESAJ.gecersiz);
      } else if (j.hata === 'bekle') durum.ag = 'bekle';
      else durum.ag = 'cevrimdisi';
      anaCiz();
    });
  }
  function zamanlayici() {
    if (document.hidden || kilit) return;
    if (Date.now() - sonYenileme > A.YENILE_DK * 60000) yenile(false); else if (!ayarAcik) anaCiz();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !kilit && Date.now() - sonYenileme > 60000) yenile(false); });
  window.addEventListener('online', function () { if (!kilit) yenile(false); });
  window.addEventListener('offline', function () { durum.ag = 'cevrimdisi'; if (!kilit && !ayarAcik) anaCiz(); });
  setInterval(zamanlayici, 60000);

  // ================= BAŞLAT =================
  temaUygula();
  if (oku(K.okul) && oku(K.kod)) { anaGoster(); yenile(false); } else kilitGoster('okul');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
