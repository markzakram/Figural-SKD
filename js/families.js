/*
 * families.js — pembangkit bentuk figural, delapan keluarga.
 *
 *   sarang  bingkai bersarang: beberapa persegi/persegi panjang terbuka yang
 *           saling bertumpuk pada sudut berbeda (seperti contoh soal di modul)
 *   datar   bangun datar beraturan + unsur penanda di dalam atau di tepinya
 *   kisi    titik-titik kisi yang dihubungkan garis, plus titik isi/kosong
 *   panah   batang berujung mata panah atau kait yang memancar dari pusat
 *   zigzag  dua sampai tiga garis patah panjang yang saling menyilang
 *   sisir   satu tulang punggung dengan gigi yang panjangnya berbeda-beda
 *   blok    segi empat tertutup yang bertindihan sebagian
 *   silang  lingkaran besar dengan tali busur dan titik di dalamnya
 *
 * Bentuknya DIBANGKITKAN, bukan digambar satu per satu, dari sebuah nomor benih.
 * Benih yang sama selalu menghasilkan bentuk yang sama.
 *
 * KELUARGA BISA DIPILIH BERGANDA. `bangkitkan()` menerima satu nama keluarga,
 * kata 'campur', atau DAFTAR nama — lihat `daftarKeluarga()`. Pengguna
 * mencentang keluarga yang diinginkan dan soal hanya lahir dari daftar itu.
 *
 * SEMUA HASIL ACAK MELEWATI SATU PENYARING YANG SAMA sebelum dipakai. Dua
 * syarat pertamanya bukan soal keindahan melainkan syarat agar soalnya SAH:
 *
 *   1. orde simetri putar harus 1. Bentuk yang sama saat diputar 90 derajat
 *      membuat "diputar berapa derajat" tidak punya jawaban tunggal, dan dua
 *      pengecoh yang sudutnya berselisih 90 derajat akan tampak kembar.
 *   2. bentuknya harus kiral. Kalau bayangan cerminnya bisa ditumpangkan lewat
 *      putaran saja, pengecoh hasil pencerminan sebenarnya BENAR — soalnya
 *      berkunci ganda. Syarat ini sendiri hanya menolak 0,3% bentuk mentah;
 *      yang menolak 10,2% adalah syarat berikutnya, bahwa cerminnya harus
 *      BERBEDA CUKUP JAUH — kiral secara matematis belum berarti terlihat beda.
 *
 * Sisanya menjaga keterbacaan: tidak ada ruas sehalus rambut, tidak ada dua
 * unsur yang saling menempel sehingga terbaca satu garis tebal, tidak ada
 * bentuk yang gepeng seperti bilah, dan cerminnya harus BERBEDA CUKUP JAUH
 * supaya pengecoh cermin tidak menjadi kembaran yang harus diukur penggaris.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./figure.js'), require('./rng.js'));
  } else {
    root.Families = factory(root.Figure, root.Rng);
  }
})(typeof self !== 'undefined' ? self : this, function (F, Rng) {
  'use strict';

  var R = 46;                 // jangkauan baku: semua bentuk dipaskan ke jari-jari ini
  var COBA_MAKS = 24;         // percobaan acak sebelum jatuh ke bentuk cadangan

  var KELUARGA = [
    { id: 'sarang', nama: 'Garis bersarang' },
    { id: 'datar', nama: 'Bangun datar + penanda' },
    { id: 'kisi', nama: 'Kisi titik & penghubung' },
    { id: 'panah', nama: 'Panah, sirip & kait' },
    { id: 'zigzag', nama: 'Pita zigzag menyilang' },
    { id: 'sisir', nama: 'Tulang & gigi sisir' },
    { id: 'blok', nama: 'Blok bertumpuk' },
    { id: 'silang', nama: 'Lingkaran & tali silang' }
  ];

  var AMBANG = {
    ruas: 0.13,        // ruas terpendek : jangkauan
    pipih: 0.5,        // sisi pendek : sisi panjang kotak pembatas
    rapat: 0.11,       // jarak terdekat antar dua unsur : jangkauan
    tintaMin: 3.4,     // panjang garis total : jangkauan
    tintaMaks: 26,
    bedaCermin: 0.045  // beda bentuk terhadap bayangan cerminnya
  };

  // ------------------------------------------------------------- alat gambar

  function titik(x, y) { return [x, y]; }

  function putarTitik(p, deg) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  }

  function garis(pts, opsi) {
    opsi = opsi || {};
    return {
      jenis: 'garis', titik: pts, tutup: !!opsi.tutup, isi: opsi.isi || null,
      kepala: opsi.kepala || 0, tebal: opsi.tebal || 1, nama: opsi.nama || null
    };
  }

  function bulat(pusat, jari, isi, nama) {
    return { jenis: 'bulat', pusat: pusat, jari: jari, isi: isi || null, tebal: 1, nama: nama || null };
  }

  /**
   * Bingkai persegi panjang yang sebagian sisinya dibuang.
   * `varian` menentukan berapa banyak sisi yang digambar:
   *   L = dua sisi, C = tiga sisi, G = empat sisi bercelah, K = tertutup penuh.
   */
  function bingkai(a, b, varian) {
    var s = [titik(-a, b), titik(-a, -b), titik(a, -b), titik(a, b)];
    if (varian === 'L') return garis(s.slice(0, 3));
    if (varian === 'C') return garis(s);
    if (varian === 'K') return garis(s, { tutup: true });
    // G: keliling penuh lalu berhenti sebelum menutup, menyisakan celah kecil
    return garis(s.concat([titik(-a + a * 0.55, b)]));
  }

  function poligonBeraturan(n, jari, sudutAwal) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (sudutAwal + i * 360 / n) * Math.PI / 180;
      out.push(titik(jari * Math.cos(a), jari * Math.sin(a)));
    }
    return out;
  }

  function geserUnsur(u, dx, dy) {
    if (u.jenis === 'bulat') { u.pusat = [u.pusat[0] + dx, u.pusat[1] + dy]; return u; }
    u.titik = u.titik.map(function (p) { return [p[0] + dx, p[1] + dy]; });
    return u;
  }

  function putarUnsurLokal(u, deg) {
    if (u.jenis === 'bulat') { u.pusat = putarTitik(u.pusat, deg); return u; }
    u.titik = u.titik.map(function (p) { return putarTitik(p, deg); });
    return u;
  }

  // ------------------------------------------------------------ keluarga A: sarang

  /**
   * Bingkai bersarang — keluarga yang paling mirip contoh soal pada modul:
   * tiga sampai lima persegi panjang terbuka, ukurannya bertingkat, masing-masing
   * pada sudut sendiri sehingga sudut-sudutnya saling menyilang.
   */
  function sarang(a) {
    var n = a.bulat(3, 5);
    var varian = ['L', 'C', 'C', 'G', 'G'];
    var unsur = [];
    // Sudut tiap bingkai dijaga berjarak: kalau dua bingkai hampir sejajar,
    // garisnya berhimpit dan gambarnya terbaca sebagai satu garis tebal.
    var sudut = [], pakai = a.antara(0, 360);
    for (var i = 0; i < n; i++) {
      sudut.push(pakai);
      pakai += a.antara(22, 62) * (a.untung(0.75) ? 1 : -1);
    }
    for (i = 0; i < n; i++) {
      var s = 0.40 + 0.60 * (i / (n - 1));
      var lebar = R * s * a.antara(0.80, 1.0);
      var tinggi = R * s * a.antara(0.68, 1.0);
      var u = bingkai(lebar, tinggi, a.pilih(varian));
      putarUnsurLokal(u, sudut[i]);
      var d = R * a.antara(0, 0.09), ar = a.antara(0, 360);
      geserUnsur(u, d * Math.cos(ar * Math.PI / 180), d * Math.sin(ar * Math.PI / 180));
      u.nama = i === 0 ? 'bingkai terdalam' : (i === n - 1 ? 'bingkai terluar' : 'bingkai tengah');
      unsur.push(u);
    }
    // Sesekali sebuah titik di dalam bingkai terdalam sebagai penanda tambahan.
    if (a.untung(0.35)) {
      unsur.push(bulat(titik(a.antara(-8, 8), a.antara(-8, 8)), a.antara(3, 5),
        a.untung(0.6) ? '#111' : null, 'titik pusat'));
    }
    return unsur;
  }

  // ------------------------------------------------------------- keluarga B: datar

  /** Bangun datar beraturan dengan dua sampai empat penanda. */
  function datar(a) {
    var sisi = a.pilih([3, 4, 5, 6]);
    var awal = a.antara(0, 360);
    var jari = R * a.antara(0.88, 1.0);
    var sudut = poligonBeraturan(sisi, jari, awal);
    var unsur = [garis(sudut, { tutup: true, nama: 'bangun luar' })];

    var tengah = [];
    for (var i = 0; i < sisi; i++) {
      var q = sudut[(i + 1) % sisi];
      tengah.push(titik((sudut[i][0] + q[0]) / 2, (sudut[i][1] + q[1]) / 2));
    }

    var jenisPenanda = a.kocok(['titik', 'tali', 'jari', 'takik', 'segitiga', 'panah']);
    var n = a.bulat(2, 4);
    for (var k = 0; k < n; k++) {
      var j = jenisPenanda[k % jenisPenanda.length];
      var iv = a.bulat(0, sisi - 1), it = a.bulat(0, sisi - 1);
      if (j === 'titik') {
        var arah = a.untung(0.5) ? sudut[iv] : tengah[it];
        var f = a.antara(0.34, 0.62);
        unsur.push(bulat(titik(arah[0] * f, arah[1] * f), jari * a.antara(0.09, 0.14),
          a.untung(0.55) ? '#111' : null, 'titik penanda'));
      } else if (j === 'tali' && sisi >= 4) {
        var lain = (iv + a.bulat(2, sisi - 2)) % sisi;
        unsur.push(garis([sudut[iv], sudut[lain]], { nama: 'tali busur' }));
      } else if (j === 'jari') {
        var ujung = a.untung(0.5) ? sudut[iv] : tengah[it];
        unsur.push(garis([titik(0, 0), titik(ujung[0] * a.antara(0.82, 1.0), ujung[1] * a.antara(0.82, 1.0))],
          { nama: 'jari-jari' }));
      } else if (j === 'takik') {
        var m = tengah[it];
        var pj = Math.hypot(m[0], m[1]) || 1;
        var nx = m[0] / pj, ny = m[1] / pj, t = jari * 0.18;
        unsur.push(garis([titik(m[0] - nx * t, m[1] - ny * t), titik(m[0] + nx * t, m[1] + ny * t)],
          { nama: 'takik tepi' }));
      } else if (j === 'segitiga') {
        var pus = titik(sudut[iv][0] * 0.5, sudut[iv][1] * 0.5);
        var kecil = poligonBeraturan(3, jari * a.antara(0.20, 0.30), a.antara(0, 360));
        unsur.push(garis(kecil.map(function (p) { return titik(p[0] + pus[0], p[1] + pus[1]); }),
          { tutup: true, nama: 'segitiga kecil' }));
      } else {
        var uj = tengah[it];
        unsur.push(garis([titik(0, 0), titik(uj[0] * a.antara(0.62, 0.85), uj[1] * a.antara(0.62, 0.85))],
          { kepala: 1, nama: 'panah dalam' }));
      }
    }
    return unsur;
  }

  // -------------------------------------------------------------- keluarga C: kisi

  /** Titik-titik kisi yang dihubungkan satu jalur, plus titik isi/kosong lepas. */
  function kisi(a) {
    var n = a.pilih([3, 3, 4]);
    var jarak = (2 * R * 0.86) / (n - 1);
    var sisa = [], i, j;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        sisa.push(titik(-R * 0.86 + j * jarak, -R * 0.86 + i * jarak));
      }
    }
    sisa = a.kocok(sisa);

    var panjang = a.bulat(4, Math.min(6, sisa.length - 2));
    var jalur = sisa.splice(0, panjang);
    // Jalur diurutkan menyerupai keliling supaya garisnya tidak saling menimpa
    // berkali-kali dan bentuknya masih bisa ditelusuri mata.
    var pusat = jalur.reduce(function (s, p) { return [s[0] + p[0] / jalur.length, s[1] + p[1] / jalur.length]; }, [0, 0]);
    jalur.sort(function (p, q) {
      return Math.atan2(p[1] - pusat[1], p[0] - pusat[0]) - Math.atan2(q[1] - pusat[1], q[0] - pusat[0]);
    });
    var tutup = a.untung(0.35);
    var unsur = [garis(jalur, { tutup: tutup, nama: tutup ? 'jalur tertutup' : 'jalur penghubung' })];

    var jmlTitik = a.bulat(1, 3);
    for (i = 0; i < jmlTitik && sisa.length; i++) {
      unsur.push(bulat(sisa.shift(), jarak * a.antara(0.16, 0.24),
        a.untung(0.55) ? '#111' : null, 'titik kisi'));
    }
    if (a.untung(0.45) && sisa.length >= 2) {
      unsur.push(garis([sisa[0], sisa[1]], { nama: 'ruas lepas' }));
    }
    return unsur;
  }

  // ------------------------------------------------------------- keluarga D: panah

  /** Batang memancar dari pusat, berujung mata panah, kait, atau polos. */
  function panah(a) {
    var n = a.bulat(3, 5);
    var unsur = [];
    var mulai = a.antara(0, 360), langkah = 360 / n;
    for (var i = 0; i < n; i++) {
      var arah = mulai + i * langkah + a.antara(-langkah * 0.28, langkah * 0.28);
      var pj = R * a.antara(0.55, 1.0);
      var pangkal = R * a.antara(0, 0.18);
      var p0 = putarTitik(titik(pangkal, 0), arah);
      var p1 = putarTitik(titik(pj, 0), arah);
      var pts = [p0, p1];
      if (a.untung(0.35)) {                       // batang bersiku
        var tekuk = arah + a.antara(30, 70) * a.tanda();
        var pt = putarTitik(titik(pj * a.antara(0.5, 0.7), 0), arah);
        pts = [p0, pt, putarTitik(titik(pj * a.antara(0.42, 0.62), 0), tekuk)];
        // ujung siku dihitung dari pangkal tekukan, bukan dari pusat
        pts[2] = [pt[0] + pts[2][0], pt[1] + pts[2][1]];
      }
      var kepala = a.pilih([0, 1, 1, 2]);
      unsur.push(garis(pts, {
        kepala: kepala,
        nama: kepala === 1 ? 'batang berpanah' : (kepala === 2 ? 'batang berkait' : 'batang polos')
      }));
    }
    if (a.untung(0.55)) {
      var bentukPusat = a.pilih(['segitiga', 'persegi', 'bulat']);
      if (bentukPusat === 'bulat') {
        unsur.push(bulat(titik(0, 0), R * a.antara(0.11, 0.17), a.untung(0.5) ? '#111' : null, 'inti bulat'));
      } else {
        var sisi = bentukPusat === 'segitiga' ? 3 : 4;
        unsur.push(garis(poligonBeraturan(sisi, R * a.antara(0.15, 0.22), a.antara(0, 360)),
          { tutup: true, nama: 'inti ' + bentukPusat }));
      }
    }
    return unsur;
  }

  // ----------------------------------------------------------- keluarga E: zigzag

  /**
   * Pita zigzag — dua sampai tiga garis patah panjang yang saling menyilang.
   *
   * Berbeda dari `sarang` yang bingkainya bersarang rapi, di sini garisnya
   * memanjang melintasi gambar sehingga yang harus ditelusuri adalah arah
   * lipatan tiap pita, bukan urutan besar-kecilnya.
   */
  function zigzag(a) {
    var n = a.bulat(2, 3);
    var unsur = [];
    var arah = a.antara(0, 360);
    for (var i = 0; i < n; i++) {
      var m = a.bulat(3, 5);
      var panjang = R * a.antara(1.1, 1.7);
      var amplitudo = R * a.antara(0.16, 0.34);
      var pts = [];
      for (var k = 0; k < m; k++) {
        var t = -panjang / 2 + panjang * (k / (m - 1));
        pts.push(titik(t, (k % 2 ? 1 : -1) * amplitudo * a.antara(0.7, 1.0)));
      }
      var u = garis(pts, { nama: i === 0 ? 'pita utama' : 'pita silang' });
      putarUnsurLokal(u, arah + i * a.antara(48, 96) * (a.untung(0.7) ? 1 : -1));
      var d = R * a.antara(0, 0.22), ar = a.antara(0, 360) * Math.PI / 180;
      geserUnsur(u, d * Math.cos(ar), d * Math.sin(ar));
      unsur.push(u);
    }
    if (a.untung(0.5)) {
      unsur.push(bulat(titik(a.antara(-14, 14), a.antara(-14, 14)), R * a.antara(0.09, 0.14),
        a.untung(0.55) ? '#111' : null, 'titik penanda'));
    }
    return unsur;
  }

  // ------------------------------------------------------------ keluarga F: sisir

  /**
   * Tulang & gigi sisir — satu tulang punggung dengan 3-5 gigi yang panjangnya
   * berbeda-beda pada satu sisi. Panjang gigi yang tidak seragam itulah yang
   * membuat bentuknya kiral dan arahnya harus dibaca.
   */
  function sisir(a) {
    var arah = a.antara(0, 360);
    var panjang = R * a.antara(1.25, 1.7);
    var tulang = garis([titik(-panjang / 2, 0), titik(panjang / 2, 0)], { nama: 'tulang' });
    var unsur = [tulang];

    var n = a.bulat(3, 5);
    var sisi = a.tanda();
    for (var i = 0; i < n; i++) {
      var t = -panjang / 2 + panjang * ((i + a.antara(0.35, 0.75)) / n);
      var tinggi = R * a.antara(0.32, 0.78) * sisi;
      // Sesekali satu gigi menyeberang ke sisi lain supaya sisirnya tidak
      // pernah menjadi bentuk yang simetri terhadap tulangnya.
      if (i > 0 && a.untung(0.22)) tinggi = -tinggi * a.antara(0.5, 0.85);
      var condong = a.antara(-0.35, 0.35) * Math.abs(tinggi);
      unsur.push(garis([titik(t, 0), titik(t + condong, tinggi)], { nama: 'gigi' }));
    }
    if (a.untung(0.45)) {
      unsur.push(bulat(titik(panjang / 2 * a.antara(0.7, 0.95), 0), R * a.antara(0.09, 0.13),
        a.untung(0.5) ? '#111' : null, 'titik ujung'));
    }
    unsur.forEach(function (u) { putarUnsurLokal(u, arah); });
    return unsur;
  }

  // ------------------------------------------------------------- keluarga G: blok

  /**
   * Blok bertumpuk — dua sampai empat segi empat tertutup pada sudut dan letak
   * berbeda yang saling bertindihan sebagian. Berbeda dari `sarang`, blok di
   * sini tidak bersarang: yang dibaca adalah letak tumpukannya.
   */
  function blok(a) {
    var n = a.bulat(2, 4);
    var unsur = [];
    for (var i = 0; i < n; i++) {
      var lebar = R * a.antara(0.34, 0.62);
      var tinggi = R * a.antara(0.30, 0.62);
      var u = garis([
        titik(-lebar, -tinggi), titik(lebar, -tinggi),
        titik(lebar, tinggi), titik(-lebar, tinggi)
      ], { tutup: true, nama: 'blok' });
      putarUnsurLokal(u, a.antara(0, 360));
      var d = R * a.antara(0.24, 0.62), ar = (a.antara(0, 360) + i * 360 / n) * Math.PI / 180;
      geserUnsur(u, d * Math.cos(ar), d * Math.sin(ar));
      unsur.push(u);
    }
    if (a.untung(0.55)) {
      var ar2 = a.antara(0, 360) * Math.PI / 180, d2 = R * a.antara(0.2, 0.5);
      unsur.push(bulat(titik(d2 * Math.cos(ar2), d2 * Math.sin(ar2)), R * a.antara(0.10, 0.16),
        a.untung(0.5) ? '#111' : null, 'titik penanda'));
    }
    return unsur;
  }

  // ---------------------------------------------------------- keluarga H: silang

  /**
   * Lingkaran & tali silang — satu lingkaran besar dengan 3-4 tali busur yang
   * ujungnya di keliling, plus titik di dalamnya.
   *
   * Lingkarannya sendiri simetri sempurna sehingga tidak menyumbang apa pun
   * pada arah; seluruh arah datang dari tali dan titiknya. Keluarga ini satu-
   * satunya yang bergaris lengkung, jadi sekilas langsung berbeda dari tujuh
   * keluarga lain.
   */
  function silang(a) {
    var jari = R * a.antara(0.88, 1.0);
    var unsur = [bulat(titik(0, 0), jari, null, 'lingkaran luar')];
    var n = a.bulat(3, 4);
    var sudut = [];
    for (var i = 0; i < n * 2; i++) sudut.push(a.antara(0, 360));

    for (i = 0; i < n; i++) {
      var a1 = sudut[i * 2] * Math.PI / 180, a2 = sudut[i * 2 + 1] * Math.PI / 180;
      // Tali yang kedua ujungnya berdekatan hanya menjadi guratan pendek di
      // tepi; jaraknya dipaksa minimal 50 derajat.
      if (Math.abs(sudut[i * 2] - sudut[i * 2 + 1]) % 360 < 50) a2 += Math.PI * a.antara(0.35, 0.9);
      unsur.push(garis([
        titik(jari * Math.cos(a1), jari * Math.sin(a1)),
        titik(jari * Math.cos(a2), jari * Math.sin(a2))
      ], { nama: 'tali busur' }));
    }
    var m = a.bulat(1, 2);
    for (i = 0; i < m; i++) {
      var ar = a.antara(0, 360) * Math.PI / 180, d = jari * a.antara(0.25, 0.6);
      unsur.push(bulat(titik(d * Math.cos(ar), d * Math.sin(ar)), jari * a.antara(0.09, 0.14),
        a.untung(0.55) ? '#111' : null, 'titik dalam'));
    }
    return unsur;
  }

  var PEMBANGKIT = {
    sarang: sarang, datar: datar, kisi: kisi, panah: panah,
    zigzag: zigzag, sisir: sisir, blok: blok, silang: silang
  };

  // ---------------------------------------------------------------- penyaring

  /**
   * Ukur sebuah bentuk mentah. Mengembalikan daftar alasan penolakan; kosong
   * berarti bentuknya layak dipakai.
   */
  function periksa(fig) {
    var gagal = [];
    var jang = F.jangkauan(fig);
    if (!(jang > 1)) return ['bentuk kosong'];

    if (fig.unsur.length < 2) gagal.push('unsurnya terlalu sedikit');
    if (F.ordeSimetri(fig) !== 1) gagal.push('simetri putar: sudutnya tidak tunggal');
    if (!F.kiral(fig)) gagal.push('tidak kiral: pengecoh cermin akan ikut benar');
    if (F.ruasTerpendek(fig) < AMBANG.ruas * jang) gagal.push('ada ruas sehalus rambut');

    var k = F.kotak(fig);
    var pipih = Math.min(k.w, k.h) / Math.max(k.w, k.h, 1e-6);
    if (pipih < AMBANG.pipih) gagal.push('bentuknya gepeng seperti bilah');

    var tinta = F.panjangTotal(fig) / jang;
    if (tinta < AMBANG.tintaMin) gagal.push('garisnya terlalu sedikit');
    if (tinta > AMBANG.tintaMaks) gagal.push('garisnya terlalu padat');

    for (var i = 0; i < fig.unsur.length; i++) {
      for (var j = i + 1; j < fig.unsur.length; j++) {
        if (F.bedaUnsur(fig.unsur[i], fig.unsur[j]) < AMBANG.rapat * jang) {
          gagal.push('dua unsur berhimpit dan terbaca satu garis');
          i = fig.unsur.length;
          break;
        }
      }
    }
    if (F.bedaBentuk(F.cermin(fig), fig) < AMBANG.bedaCermin) {
      gagal.push('cerminnya nyaris kembar: pengecoh cermin jadi adu ketelitian');
    }
    return gagal;
  }

  /** Paskan bentuk ke jangkauan baku supaya semua soal tampil sebesar yang sama. */
  function normalkan(fig) {
    var jang = F.jangkauan(fig);
    if (jang < 1e-6) return fig;
    return F.pusatkan(F.skala(fig, R / jang));
  }

  /**
   * Bentuk cadangan: bingkai bersarang tiga lapis pada sudut yang sudah
   * dipastikan lolos penyaring. Dipakai kalau 24 percobaan acak gagal semua —
   * sejauh diukur belum pernah terjadi, tetapi generator tidak boleh
   * mengembalikan bentuk yang tidak sah hanya karena sedang sial.
   */
  function cadangan(benih) {
    var u = [
      putarUnsurLokal(bingkai(R * 0.40, R * 0.32, 'C'), 12),
      putarUnsurLokal(bingkai(R * 0.66, R * 0.54, 'G'), 47),
      putarUnsurLokal(bingkai(R * 0.94, R * 0.80, 'C'), 96)
    ];
    u[0].nama = 'bingkai terdalam';
    u[1].nama = 'bingkai tengah';
    u[2].nama = 'bingkai terluar';
    return normalkan(F.buat(u, 'sarang', benih));
  }

  /**
   * Baku-kan pilihan keluarga menjadi DAFTAR id yang boleh dipakai.
   *
   * Menerima tiga bentuk masukan supaya pemanggil lama tetap jalan:
   *   'sarang'                 satu keluarga saja
   *   'campur' / tak dikenal   seluruh keluarga
   *   ['sarang','panah']       hanya yang dicentang pengguna
   *
   * Id yang tidak dikenal dibuang; kalau daftarnya jadi kosong, seluruh
   * keluarga dipakai. Generator tidak boleh berhenti bekerja hanya karena
   * simpanan peramban memuat nama keluarga dari versi yang lebih lama.
   */
  function daftarKeluarga(keluarga) {
    var semua = KELUARGA.map(function (k) { return k.id; });
    if (Array.isArray(keluarga)) {
      var sah = keluarga.filter(function (id) { return !!PEMBANGKIT[id]; });
      return sah.length ? sah : semua;
    }
    if (PEMBANGKIT[keluarga]) return [keluarga];
    return semua;
  }

  /**
   * Bangkitkan satu bentuk yang PASTI lolos penyaring.
   *
   * Keluarganya diundi SEKALI di luar gelung percobaan, lalu percobaan ulang
   * tetap di keluarga itu. Kalau undiannya diulang tiap percobaan, keluarga
   * yang lebih sering ditolak penyaring akan tergantikan keluarga lain dan
   * sebarannya melenceng — terukur 129 kisi berbanding 60 datar dari 400 soal,
   * karena bentuk `datar` rata-rata butuh 1,4 percobaan sedangkan `kisi` hanya
   * 0,14. Dengan undian di luar gelung, sebarannya kembali merata.
   *
   * @param {string} keluarga id keluarga, atau 'campur'
   * @param {number} benih
   * @returns {object} bentuk, dengan properti tambahan `keluarga`, `benih`, `coba`
   */
  function bangkitkan(keluarga, benih) {
    var boleh = daftarKeluarga(keluarga);
    var id = boleh.length === 1
      ? boleh[0]
      : Rng.alat((benih >>> 0) ^ 0x5bf03635).pilih(boleh);
    for (var c = 0; c < COBA_MAKS; c++) {
      var a = Rng.alat((benih >>> 0) + c * 0x9e3779b1);
      var fig = normalkan(F.buat(PEMBANGKIT[id](a), id, benih));
      if (!periksa(fig).length) { fig.coba = c + 1; return fig; }
    }
    var f = cadangan(benih);
    f.coba = COBA_MAKS + 1;
    return f;
  }

  /**
   * Bentuk MENTAH, tanpa melewati penyaring.
   *
   * Dipakai pemeriksaan mandiri untuk mengukur syarat mana yang paling sering
   * menggigit; `bangkitkan()` membuang bentuk yang gagal sehingga dari luar
   * sebab penolakannya tidak bisa dilihat sama sekali. JANGAN dipakai membuat
   * soal — hasilnya belum tentu sah.
   */
  function mentah(keluarga, benih) {
    var a = Rng.alat(benih);
    var boleh = daftarKeluarga(keluarga);
    var id = boleh.length === 1 ? boleh[0] : a.pilih(boleh);
    return normalkan(F.buat(PEMBANGKIT[id](a), id, benih));
  }

  return {
    R: R, KELUARGA: KELUARGA, AMBANG: AMBANG, COBA_MAKS: COBA_MAKS,
    bangkitkan: bangkitkan, periksa: periksa, normalkan: normalkan,
    daftarKeluarga: daftarKeluarga,
    mentah: mentah, cadangan: cadangan, poligonBeraturan: poligonBeraturan,
    garis: garis, bulat: bulat, bingkai: bingkai
  };
});
