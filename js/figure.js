/*
 * figure.js — model gambar figural, transformasinya, dan pembandingnya.
 *
 * SEBUAH BENTUK adalah kumpulan "unsur" pada bidang berkoordinat layar
 * (x ke kanan, y ke BAWAH — sama seperti SVG). Karena y menghadap ke bawah,
 * matriks putar [[cos,-sin],[sin,cos]] menghasilkan putaran SEARAH JARUM JAM
 * di layar; seluruh berkas ini memakai derajat searah jarum jam, sama seperti
 * bahasa pembahasan soal ("memutar seluruh pola 225 derajat searah jarum jam").
 *
 * Dua jenis unsur saja, sengaja sedikit supaya setiap unsur bisa dibandingkan
 * secara pasti:
 *
 *   { jenis:'garis', titik:[[x,y],..], tutup:bool, isi:string|null,
 *     kepala:0|1|2, tebal:number }
 *   { jenis:'bulat', pusat:[x,y], jari:number, isi:string|null, tebal:number }
 *
 * `kepala` menandai ujung ruas terakhir: 0 polos, 1 mata panah, 2 kait. Bentuk
 * kepala diturunkan dari arah ruas terakhir, jadi ia ikut berputar dengan
 * sendirinya dan tidak perlu disimpan sebagai titik tersendiri.
 *
 * PEMUSATAN. Semua perbandingan memutar bentuk terhadap TITIK ASAL, jadi dua
 * bentuk hanya sebanding bila keduanya dipusatkan dengan cara yang sama.
 * `pusatkan()` memakai centroid awan titik hasil pencuplikan rapat sepanjang
 * seluruh unsur. Centroid semacam itu ikut berputar bersama bentuknya
 * (ekuivarian), sehingga memusatkan lalu memutar sama saja dengan memutar lalu
 * memusatkan. Kotak pembatas TIDAK dipakai: kotak pembatas berubah tak beraturan
 * saat bentuk diputar, dan bentuk yang sama bisa berakhir di dua pusat berbeda.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Figure = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EPS = 1e-9;
  // Toleransi padanan titik. Bentuk digambar pada kotak ~100 satuan dan galat
  // pembulatan setelah beberapa kali putar hanya sekitar 1e-13, jadi 1e-4
  // longgar ribuan kali lipat terhadap galat namun tetap jauh lebih rapat
  // daripada beda terkecil yang sengaja dibuat.
  var TOL = 1e-4;

  function derajat(rad) { return rad * 180 / Math.PI; }
  function radian(deg) { return deg * Math.PI / 180; }
  function norm360(d) { d = d % 360; return d < 0 ? d + 360 : d; }

  // ------------------------------------------------------------------ dasar

  function salinTitik(t) { return [t[0], t[1]]; }

  /**
   * Salinan sebuah unsur.
   *
   * `nama` ikut terbawa supaya pembahasan bisa menyebut unsurnya dengan kata
   * ("bingkai terluar", "titik hitam") alih-alih nomor urut. Nama itu murni
   * keterangan: tidak satu pun pembanding di berkas ini melihatnya, jadi dua
   * unsur bernama beda tetap dinyatakan sama bila goresannya sama.
   */
  function salinUnsur(u) {
    if (u.jenis === 'bulat') {
      return {
        jenis: 'bulat', pusat: salinTitik(u.pusat), jari: u.jari,
        isi: u.isi || null, tebal: u.tebal || 1, nama: u.nama || null
      };
    }
    return {
      jenis: 'garis', titik: u.titik.map(salinTitik), tutup: !!u.tutup,
      isi: u.isi || null, kepala: u.kepala || 0, tebal: u.tebal || 1,
      nama: u.nama || null
    };
  }

  function salin(fig) {
    return { unsur: fig.unsur.map(salinUnsur), keluarga: fig.keluarga, benih: fig.benih };
  }

  function buat(unsur, keluarga, benih) {
    return pusatkan({ unsur: unsur.map(salinUnsur), keluarga: keluarga || '-', benih: benih || 0 });
  }

  // ------------------------------------------------------------- transformasi

  /** Putar bentuk sebesar `deg` SEARAH JARUM JAM terhadap titik asal. */
  function putar(fig, deg) {
    var a = radian(deg), c = Math.cos(a), s = Math.sin(a);
    return petakan(fig, function (p) {
      return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
    });
  }

  /**
   * Cerminkan terhadap sumbu tegak (x menjadi -x).
   *
   * Urutan titik ikut DIBALIK supaya arah keliling poligon tidak berubah tanda;
   * ini tidak mengubah gambarnya sama sekali (poligon yang sama, ditelusuri
   * arah sebaliknya) tetapi membuat unsur hasil cermin tetap sekeluarga dengan
   * asalnya saat diperiksa `unsurSama`, yang memang mengizinkan pembalikan.
   */
  function cermin(fig) {
    var h = petakan(fig, function (p) { return [-p[0], p[1]]; });
    h.unsur.forEach(function (u) { if (u.jenis === 'garis') u.titik.reverse(); });
    return h;
  }

  function skala(fig, s) {
    var h = petakan(fig, function (p) { return [p[0] * s, p[1] * s]; });
    h.unsur.forEach(function (u) { if (u.jenis === 'bulat') u.jari *= Math.abs(s); });
    return h;
  }

  function geser(fig, dx, dy) {
    return petakan(fig, function (p) { return [p[0] + dx, p[1] + dy]; });
  }

  /** Terapkan fungsi titik ke seluruh unsur; jari-jari lingkaran tidak disentuh. */
  function petakan(fig, f) {
    var h = salin(fig);
    h.unsur.forEach(function (u) {
      if (u.jenis === 'bulat') u.pusat = f(u.pusat);
      else u.titik = u.titik.map(f);
    });
    return h;
  }

  /** Putar SATU unsur saja terhadap titik asal bentuk — bahan pengecoh. */
  function putarUnsur(fig, idx, deg) {
    var a = radian(deg), c = Math.cos(a), s = Math.sin(a);
    var h = salin(fig);
    var u = h.unsur[idx];
    var f = function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
    if (u.jenis === 'bulat') u.pusat = f(u.pusat); else u.titik = u.titik.map(f);
    return h;
  }

  /** Putar satu unsur terhadap pusatnya sendiri — letaknya tetap, arahnya berubah. */
  function putarUnsurSendiri(fig, idx, deg) {
    var h = salin(fig);
    var u = h.unsur[idx];
    if (u.jenis === 'bulat') return h;            // lingkaran tidak berubah oleh putaran
    var p = pusatUnsur(u);
    var a = radian(deg), c = Math.cos(a), s = Math.sin(a);
    u.titik = u.titik.map(function (t) {
      var x = t[0] - p[0], y = t[1] - p[1];
      return [p[0] + x * c - y * s, p[1] + x * s + y * c];
    });
    return h;
  }

  /** Skala satu unsur terhadap pusatnya sendiri. */
  function skalaUnsur(fig, idx, s) {
    var h = salin(fig);
    var u = h.unsur[idx];
    var p = pusatUnsur(u);
    if (u.jenis === 'bulat') { u.jari *= s; return h; }
    u.titik = u.titik.map(function (t) {
      return [p[0] + (t[0] - p[0]) * s, p[1] + (t[1] - p[1]) * s];
    });
    return h;
  }

  function pusatUnsur(u) {
    if (u.jenis === 'bulat') return salinTitik(u.pusat);
    var sx = 0, sy = 0;
    u.titik.forEach(function (t) { sx += t[0]; sy += t[1]; });
    return [sx / u.titik.length, sy / u.titik.length];
  }

  // ------------------------------------------------------ pencuplikan & ukuran

  /**
   * Awan titik rapat sepanjang seluruh unsur.
   *
   * Dipakai untuk memusatkan bentuk dan mengukur beda bentuk. Jarak antar titik
   * cuplikan tetap (bukan jumlah titik yang tetap) supaya unsur panjang
   * menyumbang lebih banyak titik daripada unsur pendek — bobotnya jadi sepadan
   * dengan panjang garis yang benar-benar terlihat mata.
   */
  function sampel(fig, langkah) {
    langkah = langkah || 2;
    var out = [];
    fig.unsur.forEach(function (u) {
      if (u.jenis === 'bulat') {
        var n = Math.max(8, Math.round(2 * Math.PI * u.jari / langkah));
        for (var i = 0; i < n; i++) {
          var a = 2 * Math.PI * i / n;
          out.push([u.pusat[0] + u.jari * Math.cos(a), u.pusat[1] + u.jari * Math.sin(a)]);
        }
        return;
      }
      var t = u.titik, m = t.length;
      var batas = u.tutup ? m : m - 1;
      for (var k = 0; k < batas; k++) {
        var p = t[k], q = t[(k + 1) % m];
        var d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        var n2 = Math.max(1, Math.round(d / langkah));
        for (var j = 0; j < n2; j++) {
          var f = j / n2;
          out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
        }
      }
      if (!u.tutup) out.push(salinTitik(t[m - 1]));
    });
    return out;
  }

  /** Semua titik sudut (untuk lingkaran: pusatnya). */
  function simpul(fig) {
    var out = [];
    fig.unsur.forEach(function (u, i) {
      if (u.jenis === 'bulat') out.push({ p: u.pusat, u: i });
      else u.titik.forEach(function (t) { out.push({ p: t, u: i }); });
    });
    return out;
  }

  function pusatkan(fig) {
    var s = sampel(fig, 1.5);
    if (!s.length) return fig;
    var sx = 0, sy = 0;
    s.forEach(function (p) { sx += p[0]; sy += p[1]; });
    return geser(fig, -sx / s.length, -sy / s.length);
  }

  function kotak(fig) {
    var s = sampel(fig, 1.5);
    if (!s.length) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    s.forEach(function (p) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  /** Jari-jari terjauh dari titik asal — ukuran yang tidak berubah saat diputar. */
  function jangkauan(fig) {
    var maks = 0;
    sampel(fig, 1.5).forEach(function (p) {
      var r = Math.hypot(p[0], p[1]);
      if (r > maks) maks = r;
    });
    return maks;
  }

  /** Panjang seluruh garis — juga tetap saat diputar. */
  function panjangTotal(fig) {
    var jml = 0;
    fig.unsur.forEach(function (u) { jml += panjangUnsur(u); });
    return jml;
  }

  function panjangUnsur(u) {
    if (u.jenis === 'bulat') return 2 * Math.PI * u.jari;
    var t = u.titik, m = t.length, jml = 0;
    var batas = u.tutup ? m : m - 1;
    for (var k = 0; k < batas; k++) {
      var p = t[k], q = t[(k + 1) % m];
      jml += Math.hypot(q[0] - p[0], q[1] - p[1]);
    }
    return jml;
  }

  /** Ruas terpendek pada seluruh bentuk — penjaga agar tak ada detail sehalus rambut. */
  function ruasTerpendek(fig) {
    var min = Infinity;
    fig.unsur.forEach(function (u) {
      if (u.jenis === 'bulat') { min = Math.min(min, 2 * u.jari); return; }
      var t = u.titik, m = t.length;
      var batas = u.tutup ? m : m - 1;
      for (var k = 0; k < batas; k++) {
        var p = t[k], q = t[(k + 1) % m];
        min = Math.min(min, Math.hypot(q[0] - p[0], q[1] - p[1]));
      }
    });
    return min === Infinity ? 0 : min;
  }

  // ------------------------------------------------------------ perbandingan

  /**
   * Tanda pengenal unsur yang TIDAK berubah saat bentuk diputar.
   * Dipakai untuk memasangkan unsur sebelum sudut putarnya dicoba.
   */
  function tandaUnsur(u) {
    if (u.jenis === 'bulat') {
      return 'b|' + (u.isi ? 'i' : 'k') + '|' + u.jari.toFixed(3);
    }
    return 'g|' + (u.tutup ? 't' : 'b') + '|' + (u.isi ? 'i' : 'k') + '|' + (u.kepala || 0) +
      '|' + u.titik.length + '|' + panjangUnsur(u).toFixed(3);
  }

  function tandaBentuk(fig) {
    return fig.unsur.map(tandaUnsur).sort().join(';');
  }

  function titikSama(a, b, tol) {
    return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
  }

  function deretSama(a, b, tol) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!titikSama(a[i], b[i], tol)) return false;
    return true;
  }

  /**
   * Apakah dua unsur menggambar goresan yang sama persis?
   *
   * Bukan sekadar membandingkan deret titik apa adanya: sebuah garis yang
   * ditelusuri dari ujung yang lain MENGGAMBAR goresan yang sama, dan sebuah
   * poligon tertutup yang dimulai dari simpul lain juga sama. Karena itu
   * pembandingnya mengizinkan pembalikan arah (garis terbuka) dan pergeseran
   * siklik ke segala arah (poligon tertutup). Kalau ini diabaikan, dua pilihan
   * jawaban yang di kertas tampak identik bisa lolos sebagai "berbeda".
   */
  function unsurSama(a, b, tol) {
    if (a.jenis !== b.jenis) return false;
    if (a.jenis === 'bulat') {
      return Math.abs(a.jari - b.jari) <= tol && !!a.isi === !!b.isi &&
        titikSama(a.pusat, b.pusat, tol);
    }
    if (!!a.tutup !== !!b.tutup || !!a.isi !== !!b.isi) return false;
    if ((a.kepala || 0) !== (b.kepala || 0)) return false;
    if (a.titik.length !== b.titik.length) return false;

    if (!a.tutup) {
      // Garis berkepala punya ujung yang berbeda arti, jadi arahnya tak boleh dibalik.
      if (a.kepala) return deretSama(a.titik, b.titik, tol);
      return deretSama(a.titik, b.titik, tol) ||
        deretSama(a.titik, b.titik.slice().reverse(), tol);
    }
    var n = a.titik.length;
    for (var arah = 0; arah < 2; arah++) {
      var bb = arah ? b.titik.slice().reverse() : b.titik;
      for (var g = 0; g < n; g++) {
        var geserSiklik = bb.slice(g).concat(bb.slice(0, g));
        if (deretSama(a.titik, geserSiklik, tol)) return true;
      }
    }
    return false;
  }

  /**
   * Apakah A dan B menggambar bentuk yang sama persis (tanpa diputar lagi)?
   *
   * Unsur dipasangkan sebagai HIMPUNAN GANDA: unsur ke-1 A boleh berpadanan
   * dengan unsur ke-3 B. Penelusuran balik dipakai karena satu unsur bisa punya
   * beberapa calon padanan, dan pilihan serakah bisa buntu padahal padanan
   * lengkapnya sebenarnya ada.
   */
  function samaPersis(A, B, tol) {
    tol = tol || TOL;
    var a = A.unsur, b = B.unsur;
    if (a.length !== b.length) return false;
    var dipakai = new Array(b.length);
    function coba(i) {
      if (i === a.length) return true;
      for (var j = 0; j < b.length; j++) {
        if (dipakai[j]) continue;
        if (!unsurSama(a[i], b[j], tol)) continue;
        dipakai[j] = true;
        if (coba(i + 1)) return true;
        dipakai[j] = false;
      }
      return false;
    }
    return coba(0);
  }

  /**
   * Sudut-sudut yang MUNGKIN memetakan A ke B.
   *
   * Sebuah putaran mempertahankan jarak titik ke pusat. Karena itu simpul
   * terjauh A pasti jatuh pada salah satu simpul terjauh B, dan sudut putarnya
   * tinggal selisih arah keduanya. Daftar calon yang dihasilkan berukuran
   * paling banyak sejumlah simpul terjauh B — biasanya 1 sampai 8 — sehingga
   * pengujiannya pasti dan cepat, bukan penyisiran sudut yang bisa terlewat.
   */
  function calonSudut(A, B, tol) {
    var sa = simpul(A), sb = simpul(B);
    if (!sa.length || !sb.length) return [0];
    var rA = 0;
    sa.forEach(function (s) { rA = Math.max(rA, Math.hypot(s.p[0], s.p[1])); });
    if (rA < 1e-6) return [0];               // semua simpul di pusat: putaran tak berarti
    var acuan = null;
    for (var i = 0; i < sa.length; i++) {
      var r = Math.hypot(sa[i].p[0], sa[i].p[1]);
      if (r > rA - tol) { acuan = sa[i].p; break; }
    }
    var out = [];
    var sudutA = Math.atan2(acuan[1], acuan[0]);
    sb.forEach(function (s) {
      var r = Math.hypot(s.p[0], s.p[1]);
      if (Math.abs(r - rA) > tol) return;
      out.push(norm360(derajat(Math.atan2(s.p[1], s.p[0]) - sudutA)));
    });
    return out;
  }

  /**
   * Apakah B adalah hasil PUTARAN dari A?
   *
   * Inilah penjamin seluruh generator: sebuah pengecoh baru boleh dipakai kalau
   * fungsi ini menjawab "tidak" terhadap kunci jawabannya. Jawabannya pasti,
   * bukan perkiraan — daftar sudut calonnya lengkap secara geometri (lihat
   * `calonSudut`) dan setiap calon diuji sampai ke titiknya.
   *
   * @returns {number|null} sudut putar searah jarum jam bila ada, null bila tidak
   */
  function sudutPutarKe(A, B, tol) {
    tol = tol || TOL;
    if (A.unsur.length !== B.unsur.length) return null;
    if (tandaBentuk(A) !== tandaBentuk(B)) return null;      // saringan cepat
    var calon = calonSudut(A, B, Math.max(tol, 1e-6));
    for (var i = 0; i < calon.length; i++) {
      if (samaPersis(putar(A, calon[i]), B, tol)) return rapikanSudut(calon[i]);
    }
    return null;
  }

  /**
   * Bulatkan sudut yang meleset sepersejuta derajat akibat pembulatan.
   * Tanpa ini pembahasan bisa menulis "diputar 359,99999999999994 derajat"
   * untuk bentuk yang sebenarnya tidak diputar sama sekali.
   */
  function rapikanSudut(d) {
    var n = norm360(d);
    var bulat = Math.round(n);
    if (Math.abs(n - bulat) < 1e-4) n = bulat;
    return norm360(n);
  }

  function adalahRotasi(A, B, tol) { return sudutPutarKe(A, B, tol) !== null; }

  /** Orde simetri putar: 1 = tidak simetri, 4 = sama tiap 90 derajat, dan seterusnya. */
  function ordeSimetri(fig, tol) {
    tol = tol || TOL;
    var calon = calonSudut(fig, fig, Math.max(tol, 1e-6));
    var kecil = 360;
    calon.forEach(function (d) {
      var n = norm360(d);
      if (n <= 1e-6 || n >= 360 - 1e-6) return;
      if (n < kecil && samaPersis(putar(fig, n), fig, tol)) kecil = n;
    });
    if (kecil >= 360 - 1e-6) return 1;
    return Math.max(1, Math.round(360 / kecil));
  }

  /**
   * Kiral = tidak bisa ditumpangkan pada bayangan cerminnya lewat putaran saja.
   * Bentuk yang TIDAK kiral tak bisa dipakai: pengecoh hasil pencerminan padanya
   * ternyata sama dengan kuncinya, sehingga soalnya berkunci ganda.
   */
  function kiral(fig, tol) {
    return !adalahRotasi(cermin(fig), fig, tol);
  }

  // -------------------------------------------------------------- beda bentuk

  /**
   * Beda dua bentuk SETELAH diputar sepas mungkin, dalam satuan jangkauan bentuk.
   *
   * Penjawab boleh memutar gambar di kepalanya, jadi beda yang pantas diukur
   * adalah beda yang TERSISA setelah putaran terbaik. Ukurannya jarak chamfer
   * dua arah (rerata jarak tiap titik cuplikan ke titik terdekat pada bentuk
   * lawan, dihitung bolak-balik) — tahan terhadap unsur yang bergeser sedikit
   * dan tidak menuntut jumlah titik yang sama.
   *
   * Sudut diayak kasar dulu setiap 6 derajat, lalu dirapatkan 1 derajat di
   * sekitar yang terbaik; dengan cuplikan renggang biayanya tetap kecil padahal
   * fungsi ini dipanggil untuk setiap pengecoh.
   */
  /**
   * Cuplikan dengan JUMLAH TITIK dibatasi.
   *
   * `sampel()` memakai jarak antar titik yang tetap, jadi bentuk berkeliling
   * panjang menghasilkan ratusan titik dan biaya chamfer (yang kuadratik)
   * meledak. Di sini langkahnya dihitung mundur dari panjang total supaya
   * jumlah titiknya tidak pernah melewati `maks`, berapa pun besar bentuknya.
   */
  function sampelBatas(fig, maks) {
    var pj = panjangTotal(fig);
    return sampel(fig, Math.max(2, pj / maks));
  }

  function bedaBentuk(A, B) {
    var a = sampelBatas(A, 44), b = sampelBatas(B, 44);
    if (!a.length || !b.length) return 1;
    var ukuran = Math.max(jangkauan(A), jangkauan(B), 1e-6);

    function jarakPada(deg) {
      var r = radian(deg), c = Math.cos(r), s = Math.sin(r);
      var ap = new Array(a.length);
      for (var i = 0; i < a.length; i++) {
        ap[i] = [a[i][0] * c - a[i][1] * s, a[i][0] * s + a[i][1] * c];
      }
      return (chamfer(ap, b) + chamfer(b, ap)) / 2;
    }

    var terbaik = Infinity, sudutTerbaik = 0, d, v;
    for (d = 0; d < 360; d += 6) {
      v = jarakPada(d);
      if (v < terbaik) { terbaik = v; sudutTerbaik = d; }
    }
    for (d = sudutTerbaik - 5; d <= sudutTerbaik + 5; d++) {
      v = jarakPada(d);
      if (v < terbaik) terbaik = v;
    }
    return terbaik / ukuran;
  }

  function chamfer(p, q) {
    var jml = 0;
    for (var i = 0; i < p.length; i++) {
      var min = Infinity, x = p[i][0], y = p[i][1];
      for (var j = 0; j < q.length; j++) {
        var dx = x - q[j][0], dy = y - q[j][1];
        var d = dx * dx + dy * dy;
        if (d < min) min = d;
      }
      jml += Math.sqrt(min);
    }
    return jml / p.length;
  }

  /** Jarak chamfer dua arah antara dua unsur, dalam satuan mutlak. */
  function bedaUnsur(u1, u2) {
    var a = sampelBatas({ unsur: [u1] }, 30), b = sampelBatas({ unsur: [u2] }, 30);
    if (!a.length || !b.length) return Infinity;
    return (chamfer(a, b) + chamfer(b, a)) / 2;
  }

  return {
    TOL: TOL, EPS: EPS,
    buat: buat, salin: salin, salinUnsur: salinUnsur,
    putar: putar, cermin: cermin, skala: skala, geser: geser, petakan: petakan,
    putarUnsur: putarUnsur, putarUnsurSendiri: putarUnsurSendiri, skalaUnsur: skalaUnsur,
    pusatUnsur: pusatUnsur, pusatkan: pusatkan,
    sampel: sampel, sampelBatas: sampelBatas, simpul: simpul, kotak: kotak, jangkauan: jangkauan,
    panjangTotal: panjangTotal, panjangUnsur: panjangUnsur, ruasTerpendek: ruasTerpendek,
    tandaUnsur: tandaUnsur, tandaBentuk: tandaBentuk,
    unsurSama: unsurSama, samaPersis: samaPersis, calonSudut: calonSudut,
    sudutPutarKe: sudutPutarKe, adalahRotasi: adalahRotasi, rapikanSudut: rapikanSudut,
    ordeSimetri: ordeSimetri, kiral: kiral,
    bedaBentuk: bedaBentuk, bedaUnsur: bedaUnsur,
    norm360: norm360, derajat: derajat, radian: radian
  };
});
