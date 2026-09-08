/*
 * quiz.js — penyusun soal figural beserta pilihan A-E dan pembahasannya.
 *
 * Empat submateri, mengikuti bab 3.2.3 Figural pada modul:
 *
 *   kesesuaian     gambar acuan di kiri, pilih opsi yang POLA DAN SUSUNAN
 *                  UNSURNYA sama — yaitu hasil putaran murni gambar acuan
 *   ketidaksamaan  lima gambar, pilih SATU yang berbeda dari empat lainnya
 *   analogi        A : B = C : ?  — kenali perubahan dari A ke B, terapkan ke C
 *   serial         empat kotak berurutan, tebak kotak kelima
 *
 * JAMINAN KEBENARAN. Semua bertumpu pada satu fungsi: `Figure.sudutPutarKe()`
 * menjawab secara pasti apakah dua bentuk terhubung oleh putaran (lihat
 * figure.js — daftar sudut calonnya lengkap secara geometri, bukan hasil
 * penyisiran yang bisa terlewat).
 *
 *   1. Kunci "kesesuaian" DIBUAT sebagai putaran gambar acuan, jadi benar
 *      menurut definisinya.
 *   2. Setiap calon pengecoh diuji terhadap gambar acuan. Kalau ternyata masih
 *      terhubung oleh putaran, calon itu dibuang karena SEBENARNYA BENAR.
 *   3. Antar pilihan juga diuji: tidak boleh ada dua yang terhubung putaran,
 *      sebab di kertas keduanya akan tampak sebagai gambar yang sama.
 *   4. `audit()` memeriksa ulang soal yang sudah jadi lewat geometrinya sendiri,
 *      tanpa melihat catatan cara pembuatannya. Kalau sampai ada lebih dari
 *      satu pilihan yang sah, peringatannya muncul di atas lembar soal.
 *
 * PENCERMINAN BUKAN KESESUAIAN. Bayangan cermin selalu dihitung SALAH — itulah
 * pengecoh paling penting pada submateri ini. Karena itu setiap bentuk yang
 * dipakai wajib kiral (dijamin `families.js`); bentuk yang tidak kiral membuat
 * pengecoh cermin ikut benar dan soalnya berkunci ganda.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./figure.js'), require('./families.js'), require('./rng.js'));
  } else {
    root.Quiz = factory(root.Figure, root.Families, root.Rng);
  }
})(typeof self !== 'undefined' ? self : this, function (F, Fam, Rng) {
  'use strict';

  var TIPE = [
    { id: 'kesesuaian', nama: 'Kesesuaian', label: 'Figural — Kesesuaian' },
    { id: 'ketidaksamaan', nama: 'Ketidaksamaan', label: 'Figural — Ketidaksamaan' },
    { id: 'analogi', nama: 'Analogi', label: 'Figural — Analogi' },
    { id: 'serial', nama: 'Serial', label: 'Figural — Serial (The Next Box)' }
  ];

  var TINGKAT = [
    { id: 'mudah', nama: 'Mudah' },
    { id: 'sedang', nama: 'Sedang' },
    { id: 'sulit', nama: 'Sulit' }
  ];

  var PERINTAH = {
    kesesuaian: 'Pilihlah satu gambar pada opsi yang memiliki pola dan susunan unsur yang sama dengan gambar di kiri.',
    ketidaksamaan: 'Tentukanlah satu gambar yang memiliki perbedaan tertentu dengan keempat gambar lainnya.',
    analogi: 'Perhatikan hubungan gambar pertama terhadap gambar kedua, lalu terapkan hubungan yang sama pada gambar ketiga.',
    serial: 'Perhatikan pola pada keempat kotak berikut, lalu tentukan gambar yang tepat untuk kotak berikutnya.'
  };

  /**
   * Sudut yang boleh dipakai, per tingkat kesulitan.
   * Kelipatan 90 derajat paling mudah dilihat; kelipatan 45 yang ganjil
   * (45, 135, 225, 315) paling sulit karena tidak ada sisi yang tetap mendatar.
   */
  var SUDUT = {
    mudah: [90, 180, 270],
    sedang: [45, 90, 135, 180, 225, 270, 315],
    sulit: [45, 135, 225, 315]
  };

  var AMBANG = {
    // Beda bentuk pengecoh terhadap kunci, setelah diputar sepas mungkin.
    // Di bawah batas bawah kedua gambar nyaris kembar dan soalnya berubah jadi
    // adu ketelitian mengukur, bukan adu mengenali pola. Di atas batas atas
    // pengecohnya mencolok dan langsung tercoret tanpa berpikir.
    bedaMin: 0.045,
    bedaMaks: 0.42,
    // Pengecoh boleh sedikit lebih halus pada tingkat sulit dan harus lebih
    // mencolok pada tingkat mudah.
    bedaMinSulit: 0.030,
    bedaMinMudah: 0.075,
    coba: 60          // percobaan mencari satu pengecoh sebelum menyerah
  };

  // ------------------------------------------------------------------ bantu

  function huruf(i) { return String.fromCharCode(65 + i); }

  function namaUnsur(fig, idx) {
    var u = fig.unsur[idx];
    if (!u) return 'salah satu unsur';
    if (u.nama) {
      // Kalau ada dua unsur bernama sama, sebutkan nomor urutnya agar tidak rancu.
      var sama = fig.unsur.filter(function (v) { return v.nama === u.nama; });
      if (sama.length > 1) {
        var ke = 0;
        for (var i = 0; i <= idx; i++) if (fig.unsur[i].nama === u.nama) ke++;
        return u.nama + ' ke-' + ke;
      }
      return u.nama;
    }
    return u.jenis === 'bulat' ? 'titik' : 'garis';
  }

  function arahPutar(d) {
    d = F.norm360(d);
    return d + ' derajat searah jarum jam';
  }

  /**
   * Putaran yang BERTANDA, dipakai deret serial.
   *
   * Langkah deret bisa bernilai negatif. Menormalkannya ke 0-360 memang tetap
   * benar (-45 sama dengan 315 searah jarum jam), tetapi lalu berbeda dengan
   * kalimat pola di bawahnya yang menyebut "45 derajat berlawanan arah jarum
   * jam" — pembaca melihat dua angka berbeda untuk satu langkah yang sama.
   */
  function arahPutarBertanda(d) {
    return Math.abs(d) + ' derajat ' + (d >= 0 ? 'searah' : 'berlawanan arah') + ' jarum jam';
  }

  /** Batas bawah beda bentuk sesuai tingkat kesulitan. */
  function bedaMin(tingkat) {
    if (tingkat === 'sulit') return AMBANG.bedaMinSulit;
    if (tingkat === 'mudah') return AMBANG.bedaMinMudah;
    return AMBANG.bedaMin;
  }

  /**
   * Pengecoh tidak perlu lolos seluruh penyaring bentuk — ia memang sengaja
   * cacat — tetapi tetap harus TERBACA. Yang diperiksa hanya keterbacaannya.
   */
  function layakPengecoh(fig) {
    if (!fig || fig.unsur.length < 2) return false;
    var jang = F.jangkauan(fig);
    if (!(jang > 1)) return false;
    if (F.ruasTerpendek(fig) < Fam.AMBANG.ruas * jang * 0.8) return false;
    for (var i = 0; i < fig.unsur.length; i++) {
      for (var j = i + 1; j < fig.unsur.length; j++) {
        if (F.bedaUnsur(fig.unsur[i], fig.unsur[j]) < Fam.AMBANG.rapat * jang * 0.8) return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------------- cacat

  /*
   * Setiap pembuat cacat menerima (bentuk, pengacak) dan mengembalikan
   *   { fig, jenis, alasan }
   * atau null bila tidak bisa diterapkan pada bentuk itu. `alasan` ditulis
   * dari SIFAT GEOMETRI hasilnya, bukan dari nama strateginya, supaya
   * pembahasannya menyebut sesuatu yang benar-benar bisa ditelusuri di gambar.
   */

  function cacatCermin(fig) {
    return {
      fig: F.pusatkan(F.cermin(fig)),
      jenis: 'cermin',
      alasan: 'gambarnya merupakan BAYANGAN CERMIN dari gambar acuan, bukan hasil putaran. ' +
        'Diputar ke sudut mana pun, susunan unsurnya tidak akan pernah bertumpuk tepat ' +
        'dengan gambar acuan karena urutan unsurnya berbalik arah.'
    };
  }

  function cacatPutarUnsur(fig, a) {
    var idx = a.bulat(0, fig.unsur.length - 1);
    var d = a.pilih([40, 55, 70, 90, 110, 130]) * a.tanda();
    return {
      fig: F.pusatkan(F.putarUnsur(fig, idx, d)),
      jenis: 'putarUnsur', idx: idx,
      alasan: 'letak ' + namaUnsur(fig, idx) + ' berpindah terhadap unsur lain — ' +
        'hanya unsur itu yang bergeser mengelilingi pusat, sedangkan pada putaran ' +
        'seluruh unsur bergerak bersama-sama sehingga kedudukan relatifnya tetap.'
    };
  }

  function cacatPutarSendiri(fig, a) {
    var calon = [];
    fig.unsur.forEach(function (u, i) { if (u.jenis === 'garis') calon.push(i); });
    if (!calon.length) return null;
    var idx = a.pilih(calon);
    var d = a.pilih([30, 45, 60, 75, 90]) * a.tanda();
    return {
      fig: F.pusatkan(F.putarUnsurSendiri(fig, idx, d)),
      jenis: 'putarSendiri', idx: idx,
      alasan: 'arah ' + namaUnsur(fig, idx) + ' berubah sedangkan letaknya tetap. ' +
        'Pada putaran yang benar, sudut antara unsur ini dan unsur lain harus tidak berubah.'
    };
  }

  function cacatSkalaUnsur(fig, a) {
    var idx = a.bulat(0, fig.unsur.length - 1);
    var s = a.pilih([0.62, 0.72, 1.28, 1.4]);
    return {
      fig: F.pusatkan(F.skalaUnsur(fig, idx, s)),
      jenis: 'skalaUnsur', idx: idx,
      alasan: 'ukuran ' + namaUnsur(fig, idx) + ' ' + (s < 1 ? 'mengecil' : 'membesar') +
        ' terhadap unsur lain. Putaran tidak mengubah ukuran apa pun, jadi perbandingan ' +
        'ukuran antar unsur seharusnya tetap sama persis.'
    };
  }

  /**
   * Hilangkan satu unsur — tetapi TIDAK BOLEH unsur yang menjadi rangka gambar.
   *
   * Membuang unsur yang mendominasi (misalnya segienam luar pada keluarga
   * `datar`, yang sendirian memuat sebagian besar garis) menyisakan beberapa
   * coretan lepas yang tidak lagi terbaca sebagai gambar sekeluarga dengan
   * kuncinya — penjawab mencoretnya sekilas tanpa membandingkan pola apa pun.
   * Karena itu yang boleh dibuang hanya unsur yang panjang garisnya di bawah
   * 40% panjang seluruh gambar, yaitu penanda, bukan rangkanya.
   */
  function cacatHapusUnsur(fig, a) {
    if (fig.unsur.length < 3) return null;
    var total = F.panjangTotal(fig);
    var calon = [];
    fig.unsur.forEach(function (u, i) {
      if (F.panjangUnsur(u) <= total * 0.40) calon.push(i);
    });
    if (!calon.length) return null;
    var idx = a.pilih(calon);
    var u = fig.unsur.slice();
    var nama = namaUnsur(fig, idx);
    u.splice(idx, 1);
    return {
      fig: F.pusatkan({ unsur: u, keluarga: fig.keluarga, benih: fig.benih }),
      jenis: 'hapusUnsur', idx: idx,
      alasan: nama + ' hilang, sehingga jumlah unsurnya berkurang satu. ' +
        'Putaran tidak menambah maupun mengurangi unsur.'
    };
  }

  function cacatTambahUnsur(fig, a) {
    var idx = a.bulat(0, fig.unsur.length - 1);
    var tiru = F.salinUnsur(fig.unsur[idx]);
    var d = a.pilih([70, 100, 130, 160, 200]) * a.tanda();
    var tmp = F.putarUnsur({ unsur: [tiru] }, 0, d);
    var u = fig.unsur.concat([tmp.unsur[0]]);
    return {
      fig: F.pusatkan({ unsur: u, keluarga: fig.keluarga, benih: fig.benih }),
      jenis: 'tambahUnsur', idx: idx,
      alasan: 'ada satu unsur TAMBAHAN berupa salinan ' + namaUnsur(fig, idx) +
        ', sehingga jumlah unsurnya lebih banyak satu daripada gambar acuan.'
    };
  }

  function cacatIsiUnsur(fig, a) {
    var calon = [];
    fig.unsur.forEach(function (u, i) {
      if (u.jenis === 'bulat' || (u.jenis === 'garis' && u.tutup)) calon.push(i);
    });
    if (!calon.length) return null;
    var idx = a.pilih(calon);
    var h = F.salin(fig);
    var kosong = !h.unsur[idx].isi;
    h.unsur[idx].isi = kosong ? '#111' : null;
    return {
      fig: h, jenis: 'isiUnsur', idx: idx,
      alasan: namaUnsur(fig, idx) + ' berubah dari ' + (kosong ? 'kosong menjadi terisi hitam' :
        'terisi hitam menjadi kosong') + '. Putaran tidak mengubah isi sebuah unsur.'
    };
  }

  function cacatGeserUnsur(fig, a) {
    var idx = a.bulat(0, fig.unsur.length - 1);
    var jang = F.jangkauan(fig);
    var d = jang * a.antara(0.16, 0.30), ar = a.antara(0, 360) * Math.PI / 180;
    var h = F.salin(fig);
    var u = h.unsur[idx], dx = d * Math.cos(ar), dy = d * Math.sin(ar);
    if (u.jenis === 'bulat') u.pusat = [u.pusat[0] + dx, u.pusat[1] + dy];
    else u.titik = u.titik.map(function (p) { return [p[0] + dx, p[1] + dy]; });
    return {
      fig: F.pusatkan(h), jenis: 'geserUnsur', idx: idx,
      alasan: 'letak ' + namaUnsur(fig, idx) + ' bergeser menjauh dari kedudukan semula ' +
        'terhadap unsur lain, padahal putaran mempertahankan jarak antar unsur.'
    };
  }

  function cacatCerminUnsur(fig, a) {
    var calon = [];
    fig.unsur.forEach(function (u, i) { if (u.jenis === 'garis' && u.titik.length > 2) calon.push(i); });
    if (!calon.length) return null;
    var idx = a.pilih(calon);
    var h = F.salin(fig);
    var u = h.unsur[idx], p = F.pusatUnsur(u);
    u.titik = u.titik.map(function (t) { return [2 * p[0] - t[0], t[1]]; }).reverse();
    return {
      fig: F.pusatkan(h), jenis: 'cerminUnsur', idx: idx,
      alasan: 'hanya ' + namaUnsur(fig, idx) + ' yang tercermin, sedangkan unsur lain tidak. ' +
        'Akibatnya sudut terbuka unsur itu menghadap ke arah yang berlawanan.'
    };
  }

  var CACAT = {
    cermin: cacatCermin,
    putarUnsur: cacatPutarUnsur,
    putarSendiri: cacatPutarSendiri,
    skalaUnsur: cacatSkalaUnsur,
    hapusUnsur: cacatHapusUnsur,
    tambahUnsur: cacatTambahUnsur,
    isiUnsur: cacatIsiUnsur,
    geserUnsur: cacatGeserUnsur,
    cerminUnsur: cacatCerminUnsur
  };

  /**
   * Urutan prioritas strategi cacat menurut tingkat kesulitan.
   * Tingkat kesulitan TIDAK mengubah apa yang dijamin benar — ia hanya
   * menentukan strategi mana yang dicoba lebih dulu.
   */
  var PRIORITAS = {
    mudah: ['hapusUnsur', 'tambahUnsur', 'skalaUnsur', 'cermin', 'geserUnsur',
      'putarUnsur', 'isiUnsur', 'putarSendiri', 'cerminUnsur'],
    sedang: ['cermin', 'putarUnsur', 'skalaUnsur', 'geserUnsur', 'isiUnsur',
      'hapusUnsur', 'putarSendiri', 'tambahUnsur', 'cerminUnsur'],
    sulit: ['putarSendiri', 'cerminUnsur', 'isiUnsur', 'putarUnsur', 'geserUnsur',
      'cermin', 'skalaUnsur', 'tambahUnsur', 'hapusUnsur']
  };

  // -------------------------------------------------------- pemilih pengecoh

  /**
   * Cari satu pengecoh yang DIJAMIN bukan hasil putaran `acuan`.
   *
   * @param {object} acuan bentuk yang harus dihindari
   * @param {Array}  sudahAda bentuk pilihan lain yang sudah dipakai
   * @param {object} a pengacak
   * @param {string} tingkat
   * @param {object} opsi { hindariJenis: Array, wajibSama: bool }
   */
  function cariPengecoh(acuan, sudahAda, a, tingkat, opsi) {
    opsi = opsi || {};
    var urut = PRIORITAS[tingkat] || PRIORITAS.sedang;
    var minBeda = bedaMin(tingkat);
    var terpakai = opsi.hindariJenis || [];
    var alasanTerpakai = opsi.hindariAlasan || [];

    for (var c = 0; c < AMBANG.coba; c++) {
      // Dua putaran pertama mengikuti prioritas tingkat kesulitan; sesudah itu
      // strategi apa pun boleh, supaya soal tidak gagal hanya karena strategi
      // favorit tingkat itu kebetulan tidak cocok untuk bentuk ini.
      var daftar = c < urut.length * 2 ? urut : a.kocok(urut);
      var nama = daftar[c % daftar.length];
      if (c < AMBANG.coba * 0.67 && terpakai.indexOf(nama) >= 0) continue;

      var hasil = CACAT[nama](acuan, a);
      if (!hasil) continue;

      /*
       * Dua pengecoh tidak boleh berbagi KALIMAT ALASAN yang sama.
       *
       * Keduanya bisa saja berbeda secara geometri — misalnya bingkai terluar
       * yang sama diperbesar 1,28 kali pada satu opsi dan 1,4 kali pada opsi
       * lain — tetapi pembahasannya lalu menuliskan kalimat yang identik untuk
       * dua huruf berbeda, dan pembaca menyangka ada salah cetak. Alasan yang
       * sudah dipakai ditolak sejak awal; kalau ternyata mentok, `buat()` akan
       * mengulang soalnya dengan benih berikutnya.
       */
      if (alasanTerpakai.indexOf(hasil.alasan) >= 0) continue;

      // Urutan pemeriksaan sengaja dari yang termurah ke yang termahal.
      // `adalahRotasi` biasanya berhenti seketika di saringan tanda bentuk,
      // sedangkan `bedaBentuk` menyisir puluhan sudut — memanggilnya lebih dulu
      // membuang waktu pada calon yang toh akan ditolak.

      // (1) Jaminan pokok: pengecoh tidak boleh terhubung putaran dengan acuan.
      if (F.adalahRotasi(hasil.fig, acuan)) continue;

      // (2) Tidak boleh kembar dengan pilihan yang sudah ada.
      var kembar = false;
      for (var i = 0; i < sudahAda.length; i++) {
        if (F.adalahRotasi(hasil.fig, sudahAda[i])) { kembar = true; break; }
      }
      if (kembar) continue;

      // (3) Harus tetap terbaca meski sengaja cacat.
      if (!layakPengecoh(hasil.fig)) continue;

      // (4) Bedanya harus terlihat mata, tetapi tidak mencolok berlebihan.
      // Ambang khas tingkat kesulitan dilonggarkan ke ambang dasar pada
      // sepertiga percobaan terakhir: lebih baik satu pengecoh yang sedikit
      // lebih halus daripada gagal menyusun soalnya sama sekali.
      var ambangKini = c < AMBANG.coba * 0.67 ? minBeda : AMBANG.bedaMinSulit;
      var beda = F.bedaBentuk(hasil.fig, acuan);
      if (beda < ambangKini || beda > AMBANG.bedaMaks) continue;

      hasil.beda = beda;
      hasil.longgar = ambangKini < minBeda;
      return hasil;
    }
    return null;
  }

  /**
   * Sudut tampil yang BERBEDA-BEDA untuk tiap pilihan.
   *
   * Tingkat mudah hanya punya tiga sudut (90, 180, 270), padahal soal
   * ketidaksamaan butuh lima sudut sekaligus. Kekurangannya ditambal sudut
   * antara, dan kesamaannya diperiksa satu per satu — dua pilihan yang sudut
   * tampilnya sama akan tercetak sebagai gambar identik.
   */
  function sudutTampil(a, n, tingkat) {
    var kolam = SUDUT[tingkat] || SUDUT.sedang;
    var semua = a.kocok(kolam);
    var sisip = [30, 60, 120, 150, 210, 240, 300, 330, 15, 75, 105, 165];
    var k = 0;
    while (semua.length < n && k < sisip.length) {
      var d = F.norm360(sisip[k++]);
      if (semua.indexOf(d) < 0) semua.push(d);
    }
    return semua.slice(0, n);
  }

  // ------------------------------------------------------------- kesesuaian

  function buatKesesuaian(dasar, a, tingkat) {
    var kolam = SUDUT[tingkat] || SUDUT.sedang;
    var sudutKunci = a.pilih(kolam);
    var kunci = F.putar(dasar, sudutKunci);

    var pilihan = [{
      fig: kunci, benar: true, sudut: sudutKunci,
      alasan: 'seluruh pola diputar ' + arahPutar(sudutKunci) +
        ' tanpa satu unsur pun berubah bentuk, ukuran, maupun kedudukan relatifnya.'
    }];
    var dipakai = [kunci], jenisDipakai = [], alasanDipakai = [];
    var sudutLain = sudutTampil(a, 8, tingkat);

    for (var i = 0; i < 4; i++) {
      var p = cariPengecoh(dasar, dipakai, a, tingkat,
        { hindariJenis: jenisDipakai, hindariAlasan: alasanDipakai });
      if (!p) return null;
      var tampil = sudutLain[i % sudutLain.length];
      var fig = F.putar(p.fig, tampil);
      pilihan.push({ fig: fig, benar: false, jenis: p.jenis, beda: p.beda, alasan: p.alasan });
      dipakai.push(fig);
      jenisDipakai.push(p.jenis);
      alasanDipakai.push(p.alasan);
    }

    return {
      dasar: dasar, pilihan: pilihan, sudutKunci: sudutKunci,
      soalGambar: [{ fig: dasar, label: '' }]
    };
  }

  // ---------------------------------------------------------- ketidaksamaan

  function buatKetidaksamaan(dasar, a, tingkat) {
    var sudut = sudutTampil(a, 5, tingkat);
    var p = cariPengecoh(dasar, [], a, tingkat, {});
    if (!p) return null;

    var pilihan = [];
    for (var i = 0; i < 4; i++) {
      pilihan.push({
        fig: F.putar(dasar, sudut[i]), benar: false, sudut: sudut[i],
        alasan: 'gambar ini sama dengan tiga gambar lain, hanya diputar ' + arahPutar(sudut[i]) + '.'
      });
    }
    pilihan.push({
      fig: F.putar(p.fig, sudut[4]), benar: true, jenis: p.jenis, beda: p.beda,
      alasan: p.alasan
    });

    return {
      dasar: dasar, pilihan: pilihan, cacat: p,
      soalGambar: []
    };
  }

  // ----------------------------------------------------------------- analogi

  /**
   * Hubungan A ke B pada soal analogi. Semuanya isometri (putaran, atau
   * putaran yang digabung pencerminan) supaya hubungannya bisa dinyatakan
   * dengan satu kalimat yang tegas dan diperiksa ulang secara geometri.
   */
  function hubunganAnalogi(a, tingkat) {
    var kolam = SUDUT[tingkat] || SUDUT.sedang;
    var d = a.pilih(kolam);
    if (a.untung(tingkat === 'sulit' ? 0.4 : 0.25)) {
      return {
        jenis: 'cerminPutar', sudut: d,
        terap: function (f) { return F.pusatkan(F.putar(F.cermin(f), d)); },
        kalimat: 'gambar dicerminkan lebih dulu, lalu diputar ' + arahPutar(d)
      };
    }
    return {
      jenis: 'putar', sudut: d,
      terap: function (f) { return F.putar(f, d); },
      kalimat: 'gambar diputar ' + arahPutar(d)
    };
  }

  function buatAnalogi(dasar, a, tingkat, benih) {
    var hub = hubunganAnalogi(a, tingkat);
    // Gambar kedua pada soal berasal dari keluarga yang sama supaya yang
    // menonjol adalah PERUBAHANNYA, bukan perbedaan jenis gambarnya.
    var kedua = Fam.bangkitkan(dasar.keluarga, (benih >>> 0) ^ 0x2545f491);
    if (F.adalahRotasi(kedua, dasar)) return null;

    var kunci = hub.terap(kedua);
    var pilihan = [{
      fig: kunci, benar: true,
      alasan: 'gambar ketiga dikenai perubahan yang sama persis dengan perubahan gambar ' +
        'pertama menjadi gambar kedua, yaitu ' + hub.kalimat + '.'
    }];
    var dipakai = [kunci];

    // Pengecoh pertama: perubahan yang salah arah atau salah besar sudutnya.
    var kolam = (SUDUT[tingkat] || SUDUT.sedang).filter(function (d) {
      return F.norm360(d) !== F.norm360(hub.sudut);
    });
    var sudutSalah = a.kocok(kolam);
    for (var i = 0; i < sudutSalah.length && pilihan.length < 3; i++) {
      var salah = hub.jenis === 'cerminPutar'
        ? F.pusatkan(F.putar(F.cermin(kedua), sudutSalah[i]))
        : F.putar(kedua, sudutSalah[i]);
      if (adaKembar(salah, dipakai)) continue;
      pilihan.push({
        fig: salah, benar: false, jenis: 'sudutSalah',
        alasan: 'perubahannya searah tetapi besar putarannya keliru: gambar ini diputar ' +
          arahPutar(sudutSalah[i]) + ', padahal hubungan pada pasangan pertama menuntut ' +
          arahPutar(hub.sudut) + '.'
      });
      dipakai.push(salah);
    }

    // Pengecoh kedua: benar sudutnya, tetapi tercermin (atau tidak tercermin).
    var lawan = hub.jenis === 'cerminPutar'
      ? F.putar(kedua, hub.sudut)
      : F.pusatkan(F.putar(F.cermin(kedua), hub.sudut));
    if (!adaKembar(lawan, dipakai)) {
      pilihan.push({
        fig: lawan, benar: false, jenis: 'cerminSalah',
        alasan: 'besar putarannya tepat, tetapi ' + (hub.jenis === 'cerminPutar'
          ? 'gambarnya TIDAK dicerminkan, padahal pasangan pertama memperlihatkan pencerminan'
          : 'gambarnya IKUT DICERMINKAN, padahal pasangan pertama hanya memperlihatkan putaran') + '.'
      });
      dipakai.push(lawan);
    }

    // Sisanya: hasil yang benar sudutnya tetapi salah satu unsurnya cacat.
    var alasanDipakai = [];
    while (pilihan.length < 5) {
      var p = cariPengecoh(kunci, dipakai, a, tingkat, { hindariAlasan: alasanDipakai });
      if (!p) return null;
      pilihan.push({
        fig: p.fig, benar: false, jenis: p.jenis, beda: p.beda,
        alasan: 'arah putarannya sudah benar, tetapi ' + p.alasan
      });
      dipakai.push(p.fig);
      alasanDipakai.push(p.alasan);
    }

    return {
      dasar: dasar, pilihan: pilihan, hubungan: hub, kedua: kedua,
      soalGambar: [
        { fig: dasar, label: 'A' },
        { fig: hub.terap(dasar), label: 'B' },
        { fig: kedua, label: 'C' }
      ]
    };
  }

  function adaKembar(fig, daftar) {
    for (var i = 0; i < daftar.length; i++) if (F.samaPersis(fig, daftar[i])) return true;
    return false;
  }

  // ------------------------------------------------------------------ serial

  /**
   * Deret gambar: tiap langkah memutar seluruh pola sebesar delta, dan boleh
   * disertai satu titik tambahan serta pergantian isi titik. Ketiga aturan itu
   * meniru contoh pada modul ("diputar 45 derajat searah jarum jam",
   * "bertambah 1", "urutan ganjil pusatnya hitam").
   */
  function buatSerial(dasar, a, tingkat, benih) {
    var delta = a.pilih(tingkat === 'mudah' ? [45, 90] : [30, 45, 60, 90]);
    if (a.untung(0.35)) delta = -delta;
    var tumbuh = a.untung(tingkat === 'mudah' ? 0.45 : 0.65);
    var selang = tumbuh && a.untung(0.5);
    var jang = F.jangkauan(dasar);
    var jariTitik = jang * 0.10, jariCincin = jang * 1.12;

    /** Suku ke-k (k mulai dari 0). */
    function suku(k, opsi) {
      opsi = opsi || {};
      var n = tumbuh ? k + 1 + (opsi.tambahJumlah || 0) : 0;
      var u = dasar.unsur.slice();
      for (var i = 0; i < n; i++) {
        var ar = (-90 + i * 52) * Math.PI / 180;
        var isi = selang
          ? (((i + (opsi.balikIsi ? 1 : 0)) % 2 === 0) ? '#111' : null)
          : '#111';
        u.push({
          jenis: 'bulat', jari: jariTitik, isi: isi, tebal: 1, nama: 'titik penanda',
          pusat: [jariCincin * Math.cos(ar), jariCincin * Math.sin(ar)]
        });
      }
      var f = F.pusatkan({ unsur: u, keluarga: dasar.keluarga, benih: dasar.benih });
      var putaran = delta * (k + (opsi.tambahPutaran || 0));
      return F.putar(f, putaran);
    }

    var deret = [suku(0), suku(1), suku(2), suku(3)];
    var kunci = suku(4);
    var pilihan = [{
      fig: kunci, benar: true,
      alasan: 'kotak kelima meneruskan ketiga aturan sekaligus: pola diputar ' +
        arahPutarBertanda(delta) + ' dari kotak keempat' +
        (tumbuh ? ', jumlah titik penandanya menjadi lima' : '') +
        (selang ? ', dan isi titiknya tetap berselang-seling hitam dan kosong' : '') + '.'
    }];
    var dipakai = [kunci];

    var calon = [];
    // Salah besar putarannya.
    calon.push({
      fig: suku(4, { tambahPutaran: -1 }), jenis: 'kurangPutar',
      alasan: 'putarannya kurang satu langkah — gambar ini masih pada sudut kotak keempat, ' +
        'padahal setiap kotak bertambah ' + Math.abs(delta) + ' derajat.'
    });
    calon.push({
      fig: suku(4, { tambahPutaran: 1 }), jenis: 'lebihPutar',
      alasan: 'putarannya kelebihan satu langkah, yaitu ' + Math.abs(delta * 2) +
        ' derajat dari kotak keempat, bukan ' + Math.abs(delta) + ' derajat.'
    });
    if (tumbuh) {
      calon.push({
        fig: suku(4, { tambahJumlah: -1 }), jenis: 'kurangJumlah',
        alasan: 'jumlah titik penandanya berhenti di empat, padahal deretnya bertambah satu ' +
          'titik pada setiap kotak sehingga kotak kelima seharusnya berisi lima titik.'
      });
      calon.push({
        fig: suku(4, { tambahJumlah: 1 }), jenis: 'lebihJumlah',
        alasan: 'titik penandanya berjumlah enam — bertambah dua sekaligus dari kotak keempat, ' +
          'padahal pertambahannya satu per kotak.'
      });
    }
    if (selang) {
      calon.push({
        fig: suku(4, { balikIsi: true }), jenis: 'isiSalah',
        alasan: 'urutan isi titiknya terbalik: yang seharusnya hitam menjadi kosong dan sebaliknya.'
      });
    }
    calon.push({
      fig: F.pusatkan(F.cermin(kunci)), jenis: 'cermin',
      alasan: 'gambarnya merupakan bayangan cermin dari lanjutan yang benar; deret ini hanya ' +
        'berputar, tidak pernah tercermin.'
    });

    calon = a.kocok(calon);
    for (var i = 0; i < calon.length && pilihan.length < 5; i++) {
      if (!layakPengecoh(calon[i].fig) || adaKembar(calon[i].fig, dipakai)) continue;
      pilihan.push({ fig: calon[i].fig, benar: false, jenis: calon[i].jenis, alasan: calon[i].alasan });
      dipakai.push(calon[i].fig);
    }
    var alasanDipakai = pilihan.map(function (p) { return p.alasan; });
    while (pilihan.length < 5) {
      var p = cariPengecoh(kunci, dipakai, a, tingkat, { hindariAlasan: alasanDipakai });
      if (!p) return null;
      pilihan.push({ fig: p.fig, benar: false, jenis: p.jenis, beda: p.beda, alasan: p.alasan });
      dipakai.push(p.fig);
      alasanDipakai.push(p.alasan);
    }

    return {
      dasar: dasar, pilihan: pilihan,
      pola: { delta: delta, tumbuh: tumbuh, selang: selang },
      soalGambar: deret.map(function (f, i) { return { fig: f, label: String(i + 1) }; })
    };
  }

  // ------------------------------------------------------------------- buat

  /**
   * Susun satu soal utuh.
   *
   * @param {object} opsi { tipe, keluarga, tingkat, benih }
   * @returns {object|null} soal, atau null bila gagal setelah beberapa percobaan
   */
  function buat(opsi) {
    opsi = opsi || {};
    var tipe = opsi.tipe || 'kesesuaian';
    var tingkat = opsi.tingkat || 'sedang';
    var keluarga = opsi.keluarga || 'campur';
    var benih = (opsi.benih >>> 0) || 1;

    for (var c = 0; c < 10; c++) {
      var benihKini = (benih + c * 0x27d4eb2f) >>> 0;
      var a = Rng.alat(benihKini ^ 0x1b873593);
      var dasar = Fam.bangkitkan(keluarga, benihKini);
      var inti = null;
      if (tipe === 'kesesuaian') inti = buatKesesuaian(dasar, a, tingkat);
      else if (tipe === 'ketidaksamaan') inti = buatKetidaksamaan(dasar, a, tingkat);
      else if (tipe === 'analogi') inti = buatAnalogi(dasar, a, tingkat, benihKini);
      else if (tipe === 'serial') inti = buatSerial(dasar, a, tingkat, benihKini);
      if (!inti) continue;

      var urut = a.kocok(inti.pilihan.map(function (p, i) { return i; }));
      var pilihan = urut.map(function (i) { return inti.pilihan[i]; });
      var idx = -1;
      pilihan.forEach(function (p, i) { if (p.benar) idx = i; });

      var soal = {
        tipe: tipe, tingkat: tingkat, keluarga: dasar.keluarga, benih: benihKini,
        perintah: PERINTAH[tipe],
        dasar: inti.dasar, soalGambar: inti.soalGambar,
        pilihan: pilihan, jawabanIndex: idx, jawabanHuruf: huruf(idx),
        sudutKunci: inti.sudutKunci, hubungan: inti.hubungan, pola: inti.pola,
        cacat: inti.cacat
      };
      soal.peringatan = audit(soal);
      soal.pembahasan = pembahasan(soal);
      if (!soal.peringatan.length) return soal;
    }
    return null;
  }

  // ------------------------------------------------------------------ audit

  /**
   * Periksa ulang soal yang sudah jadi, LEWAT GEOMETRINYA SENDIRI.
   *
   * Sengaja tidak melihat catatan cara pembuatannya: pemeriksa yang memakai
   * catatan yang sama dengan penyusunnya hanya akan mengulangi asumsi yang
   * sama. Fungsi ini menghitung ulang siapa yang sah dari bentuknya saja.
   *
   * @returns {Array<string>} daftar peringatan; kosong berarti soal sehat
   */
  function audit(soal) {
    var pesan = [];
    var pilihan = soal.pilihan;

    /*
     * Tidak boleh ada dua pilihan yang di kertas tampak sebagai gambar sama —
     * tetapi ARTI "sama" berbeda menurut tipe soalnya.
     *
     * Pada `kesesuaian`, dua opsi yang terhubung putaran adalah cacat: keduanya
     * pola yang sama, hanya beda sudut, jadi penjawab melihat satu gambar
     * tercetak dua kali.
     *
     * Pada `ketidaksamaan` justru sebaliknya — EMPAT opsinya memang harus
     * terhubung putaran, itulah inti soalnya. Yang cacat hanyalah dua opsi yang
     * digambar pada sudut yang sama persis, karena keduanya lalu tercetak
     * sebagai gambar identik dan penjawab kehilangan satu pembanding.
     */
    var seruaRotasi = soal.tipe === 'kesesuaian';
    for (var i = 0; i < pilihan.length; i++) {
      for (var j = i + 1; j < pilihan.length; j++) {
        var kembar = seruaRotasi
          ? F.adalahRotasi(pilihan[i].fig, pilihan[j].fig)
          : F.samaPersis(pilihan[i].fig, pilihan[j].fig);
        if (kembar) {
          pesan.push('Opsi ' + huruf(i) + ' dan ' + huruf(j) + ' tampak sebagai gambar yang sama.');
        }
        // Dua opsi boleh mirip, tetapi pembahasannya tidak boleh menuliskan
        // kalimat alasan yang sama persis untuk dua huruf berbeda.
        if (pilihan[i].alasan && pilihan[i].alasan === pilihan[j].alasan) {
          pesan.push('Opsi ' + huruf(i) + ' dan ' + huruf(j) + ' memakai kalimat alasan yang sama.');
        }
      }
    }

    if (soal.tipe === 'kesesuaian') {
      var sah = [];
      pilihan.forEach(function (p, k) { if (F.adalahRotasi(p.fig, soal.dasar)) sah.push(huruf(k)); });
      if (sah.length !== 1) {
        pesan.push('Ada ' + sah.length + ' opsi yang merupakan putaran gambar acuan (' +
          (sah.join(', ') || 'tidak ada') + '); seharusnya tepat satu.');
      } else if (sah[0] !== soal.jawabanHuruf) {
        pesan.push('Kunci tercatat ' + soal.jawabanHuruf + ' tetapi yang sah adalah ' + sah[0] + '.');
      }
    } else if (soal.tipe === 'ketidaksamaan') {
      // Yang benar adalah satu-satunya gambar yang TIDAK sekelompok dengan yang lain.
      var kelompok = [];
      pilihan.forEach(function (p, k) {
        var n = 0;
        pilihan.forEach(function (q, m) { if (m !== k && F.adalahRotasi(p.fig, q.fig)) n++; });
        kelompok.push(n);
      });
      var sendiri = [];
      kelompok.forEach(function (n, k) { if (n === 0) sendiri.push(huruf(k)); });
      if (sendiri.length !== 1) {
        pesan.push('Ada ' + sendiri.length + ' gambar yang berbeda sendiri (' +
          (sendiri.join(', ') || 'tidak ada') + '); seharusnya tepat satu.');
      } else if (sendiri[0] !== soal.jawabanHuruf) {
        pesan.push('Kunci tercatat ' + soal.jawabanHuruf + ' tetapi yang berbeda sendiri adalah ' + sendiri[0] + '.');
      }
      var seharusnya = pilihan.length - 2;
      for (var k = 0; k < kelompok.length; k++) {
        if (huruf(k) === soal.jawabanHuruf) continue;
        if (kelompok[k] !== seharusnya) {
          pesan.push('Opsi ' + huruf(k) + ' hanya sekelompok dengan ' + kelompok[k] +
            ' gambar lain, seharusnya ' + seharusnya + '.');
          break;
        }
      }
    } else {
      // Analogi & serial: kuncinya satu gambar tertentu, jadi yang diperiksa
      // adalah tidak adanya pilihan lain yang persis sama dengannya.
      var kunci = pilihan[soal.jawabanIndex];
      var sama = 0;
      pilihan.forEach(function (p, m) {
        if (m !== soal.jawabanIndex && F.samaPersis(p.fig, kunci.fig)) sama++;
      });
      if (sama) pesan.push('Ada ' + sama + ' opsi lain yang gambarnya sama persis dengan kunci.');
    }
    return pesan;
  }

  // ------------------------------------------------------------- pembahasan

  var KONSEP = {
    kesesuaian: 'Konsep yang digunakan: mengenali gambar yang sama lewat putaran.',
    ketidaksamaan: 'Konsep yang digunakan: analisis satu gambar yang berbeda.',
    analogi: 'Konsep yang digunakan: analisis hubungan antar gambar.',
    serial: 'Konsep soal Figural Serial yaitu melihat pola hubungan dalam bentuk gambar.'
  };

  var KUNCIKATA = {
    kesesuaian: 'Kata kunci: figural kesesuaian, rotasi, susunan unsur tetap.',
    ketidaksamaan: 'Kata kunci: ketidaksamaan gambar, perbedaan posisi.',
    analogi: 'Kata kunci: figural analogi, hubungan pasangan gambar.',
    serial: 'Kata kunci: figural serial, pola putaran dan pertambahan unsur.'
  };

  /**
   * Uraian pembahasan: mengapa kuncinya BENAR lebih dulu, baru mengapa yang
   * lain salah. Menyebut pengecohnya saja tidak mengajarkan cara membaca soal.
   */
  function pembahasan(soal) {
    var out = [KONSEP[soal.tipe], KUNCIKATA[soal.tipe]];
    var kunci = soal.pilihan[soal.jawabanIndex];

    if (soal.tipe === 'kesesuaian') {
      out.push('Transformasi pada gambar tersebut diperoleh dengan memutar seluruh pola sebesar ' +
        arahPutar(soal.sudutKunci) + '. Pada proses ini bentuk dan jumlah setiap unsur tetap sama; ' +
        'yang berubah hanya arah serta letaknya akibat perputaran.');
      out.push('Jika gambar awal dijadikan acuan, setiap bagian pola berpindah secara konsisten ' +
        'mengikuti pusat rotasi. Hubungan posisi antar unsur tetap terjaga sehingga tidak terjadi ' +
        'pencerminan, penambahan, ataupun pengurangan unsur.');
      out.push('Jadi jawaban yang benar adalah opsi ' + soal.jawabanHuruf + '.');
    } else if (soal.tipe === 'ketidaksamaan') {
      out.push('Empat gambar lainnya adalah pola yang sama persis, hanya ditampilkan pada sudut ' +
        'putar yang berbeda-beda. Diputar seperlunya, keempatnya akan bertumpuk tepat satu sama lain.');
      out.push('Opsi ' + soal.jawabanHuruf + ' tidak bisa ditumpangkan pada keempatnya karena ' +
        kunci.alasan);
      out.push('Jadi gambar yang berbeda adalah opsi ' + soal.jawabanHuruf + '.');
    } else if (soal.tipe === 'analogi') {
      out.push('Berdasarkan pasangan gambar yang diketahui, hubungan gambar A ke gambar B adalah: ' +
        soal.hubungan.kalimat + '. Bentuk dan jumlah unsurnya tidak berubah — yang berubah hanya ' +
        'arah dan letaknya.');
      out.push('Dengan mengaplikasikan hubungan yang sama pada gambar C, diperoleh gambar pada opsi ' +
        soal.jawabanHuruf + '.');
    } else {
      var p = soal.pola;
      out.push('Kita perhatikan keseluruhan gambar dari kotak ke kotak. Aturan yang berlaku:');
      out.push('- seluruh objek diputar ' + Math.abs(p.delta) + ' derajat ' +
        (p.delta > 0 ? 'searah' : 'berlawanan arah') + ' jarum jam pada setiap kotak;');
      if (p.tumbuh) out.push('- jumlah titik penandanya bertambah satu pada setiap kotak, yaitu 1, 2, 3, 4, lalu 5;');
      if (p.selang) out.push('- isi titiknya berselang-seling: hitam, kosong, hitam, dan seterusnya.');
      out.push('Meneruskan ketiga aturan itu ke kotak kelima, gambar yang tepat adalah opsi ' +
        soal.jawabanHuruf + '.');
      out.push('Tips: perhatikan posisi setiap objeknya, bukan hanya bentuk keseluruhannya.');
    }

    out.push('Mengapa opsi lain salah:');
    soal.pilihan.forEach(function (o, i) {
      if (i === soal.jawabanIndex) return;
      out.push(huruf(i) + '. ' + (o.alasan || 'susunan unsurnya tidak sesuai.'));
    });
    return out;
  }

  // -------------------------------------------------------------------- sidik

  /**
   * Sidik satu soal utuh: gambar pertanyaannya DAN kumpulan pilihannya.
   *
   * Sidik pilihan diurutkan lebih dulu, jadi dua soal yang isinya sama dan
   * hanya berbeda urutan huruf tetap dikenali kembar. Angkanya dibulatkan
   * kasar supaya beda sepersejuta akibat pembulatan tidak dianggap soal lain.
   */
  function sidikBentuk(fig) {
    return fig.unsur.map(function (u) {
      if (u.jenis === 'bulat') {
        return 'b' + Math.round(u.pusat[0]) + ',' + Math.round(u.pusat[1]) + ',' +
          Math.round(u.jari) + (u.isi ? 'i' : 'k');
      }
      return 'g' + (u.tutup ? 't' : 'b') + (u.kepala || 0) +
        u.titik.map(function (p) { return Math.round(p[0]) + '.' + Math.round(p[1]); }).join('_');
    }).sort().join(';');
  }

  function sidik(soal) {
    return soal.tipe + '@' +
      soal.soalGambar.map(function (g) { return sidikBentuk(g.fig); }).join('#') + '@' +
      soal.pilihan.map(function (p) { return sidikBentuk(p.fig); }).sort().join('|');
  }

  return {
    TIPE: TIPE, TINGKAT: TINGKAT, SUDUT: SUDUT, AMBANG: AMBANG,
    PERINTAH: PERINTAH, CACAT: CACAT, PRIORITAS: PRIORITAS,
    buat: buat, audit: audit, pembahasan: pembahasan,
    sidik: sidik, sidikBentuk: sidikBentuk,
    cariPengecoh: cariPengecoh, layakPengecoh: layakPengecoh,
    huruf: huruf, namaUnsur: namaUnsur, arahPutar: arahPutar,
    arahPutarBertanda: arahPutarBertanda
  };
});
