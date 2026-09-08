/*
 * sheet.js — menyusun soal menjadi gambar SVG siap pakai.
 *
 * Satu tempat untuk seluruh tata letak, dipakai bersama oleh layar, PDF, dan
 * Word. Kalau tiap keluaran menyusun tata letaknya sendiri, gambar di layar
 * dan gambar di kertas akan pelan-pelan berbeda.
 *
 * Empat gambar per soal, sejajar dengan empat halaman PDF-nya:
 *
 *   gambarSoal       gambar acuan / pasangan analogi / deret serial
 *   gambarPilihan    lima kotak A-E
 *   gambarPembahasan gambar acuan bersanding dengan kunci, plus penunjuk
 *   lembar           soal dan pilihan dalam satu gambar (untuk layar & cetak)
 *
 * SKALA SELALU DIPAKAI BERSAMA. Skala satu soal dihitung sekali dari SELURUH
 * bentuk yang muncul padanya — gambar acuan maupun kelima pilihan — lalu
 * dipakai di keempat gambar itu. Dengan begitu sebuah unsur yang dihapus
 * benar-benar terlihat hilang, bukan tersamar oleh gambar yang ikut membesar
 * memenuhi kotaknya.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./figure.js'), require('./render.js'), require('./quiz.js'));
  } else {
    root.Sheet = factory(root.Figure, root.Render, root.Quiz);
  }
})(typeof self !== 'undefined' ? self : this, function (F, R, Q) {
  'use strict';

  var PAD = 18;

  /** Semua bentuk yang muncul pada sebuah soal. */
  function semuaBentuk(soal) {
    var out = soal.soalGambar.map(function (g) { return g.fig; });
    return out.concat(soal.pilihan.map(function (p) { return p.fig; }));
  }

  /**
   * Skala bersama satu soal, dihitung dari SELURUH bentuk yang muncul padanya.
   *
   * Semua kotak pada satu soal berukuran sama besar. Sempat dicoba kotak soal
   * yang lebih besar daripada kotak pilihan, tetapi karena skalanya harus
   * mengikuti kotak terkecil, gambar acuan lalu tampil kekecilan di tengah
   * kotaknya yang lapang — seolah gambar acuan berbeda ukuran dari opsinya,
   * padahal justru kesamaan itu yang harus dibandingkan penjawab.
   */
  function skalaSoal(soal, sisi) {
    return R.skalaBersama(semuaBentuk(soal), sisi, 0.10);
  }

  // ------------------------------------------------------------ gambar soal

  /**
   * Bagian pertanyaan: bentuknya berbeda menurut tipe soal.
   *   kesesuaian     satu kotak acuan
   *   ketidaksamaan  tidak ada gambar soal (semuanya ada di pilihan)
   *   analogi        A -> B  ::  C -> ?
   *   serial         empat kotak berurutan lalu kotak tanda tanya
   */
  function blokSoal(soal, sisi, skala) {
    var o = { skala: skala, jarak: Math.round(sisi * 0.16) };

    if (soal.tipe === 'ketidaksamaan') return null;

    if (soal.tipe === 'kesesuaian') {
      var k = R.kotak(soal.soalGambar[0].fig, sisi, { skala: skala });
      return { svg: k.svg, width: k.width, height: k.height };
    }

    if (soal.tipe === 'serial') {
      var d = R.deret(soal.soalGambar.map(function (g) {
        return { fig: g.fig, label: g.label };
      }), sisi, o);
      var jarak = o.jarak;
      var tanya = R.kotakTanya(sisi);
      var x = d.width + jarak;
      var bagian = [d.svg,
        '<g transform="translate(' + R.num(x) + ',0)">' + tanya.svg + '</g>',
        R.text('5', x + sisi / 2, sisi + Math.max(11, Math.round(sisi * 0.17)) + 4,
          { size: Math.max(11, Math.round(sisi * 0.17)), weight: 700, anchor: 'middle' })];
      return { svg: bagian.join(''), width: x + sisi, height: d.height };
    }

    // analogi: A -> B  ::  C -> ?
    var g = soal.soalGambar;
    var jarakKecil = Math.round(sisi * 0.30);
    var jarakBesar = Math.round(sisi * 0.42);
    var uk = Math.max(11, Math.round(sisi * 0.17));
    var kotakA = R.kotak(g[0].fig, sisi, { skala: skala });
    var kotakB = R.kotak(g[1].fig, sisi, { skala: skala });
    var kotakC = R.kotak(g[2].fig, sisi, { skala: skala });
    var tanyaD = R.kotakTanya(sisi);

    var xs = [0];
    xs.push(xs[0] + sisi + jarakKecil);                    // B
    xs.push(xs[1] + sisi + jarakBesar);                    // C
    xs.push(xs[2] + sisi + jarakKecil);                    // ?
    var isi = [];
    [[kotakA, 'A'], [kotakB, 'B'], [kotakC, 'C'], [tanyaD, '?']].forEach(function (par, i) {
      isi.push('<g transform="translate(' + R.num(xs[i]) + ',0)">' + par[0].svg + '</g>');
      isi.push(R.text(par[1], xs[i] + sisi / 2, sisi + uk + 4,
        { size: uk, weight: 700, anchor: 'middle' }));
    });
    isi.push(R.panah(xs[0] + sisi + jarakKecil * 0.16, sisi / 2, jarakKecil * 0.68));
    isi.push(R.panah(xs[2] + sisi + jarakKecil * 0.16, sisi / 2, jarakKecil * 0.68));
    isi.push(R.text('::', xs[1] + sisi + jarakBesar / 2, sisi / 2 + uk * 0.4,
      { size: Math.round(uk * 1.5), weight: 700, anchor: 'middle', fill: '#8a93a6' }));

    return { svg: isi.join(''), width: xs[3] + sisi, height: sisi + uk + 8 };
  }

  /**
   * Deretan pilihan A-E.
   * `tanpaLabel` menghilangkan hurufnya — dipakai halaman soal `ketidaksamaan`,
   * yang menampilkan kelima gambar sebagai pertanyaan, bukan sebagai opsi.
   */
  function blokPilihan(soal, sisi, skala, opsi) {
    opsi = opsi || {};
    return R.deret(soal.pilihan.map(function (p, i) {
      return {
        fig: p.fig,
        label: opsi.tanpaLabel ? '' : Q.huruf(i) + '.',
        sorot: opsi.tampilKunci && i === soal.jawabanIndex
      };
    }), sisi, { skala: skala, jarak: Math.round(sisi * 0.18) });
  }

  // ---------------------------------------------------------- gambar berkas

  function bungkus(bagian, w, h) {
    return R.doc('<g transform="translate(' + PAD + ',' + PAD + ')">' + bagian + '</g>',
      w + PAD * 2, h + PAD * 2, { background: '#ffffff' });
  }

  /**
   * Bungkus yang dilebarkan sampai `lebarPenuh`, isinya ditaruh di tengah.
   *
   * Halaman "gambar soal" dan halaman "pilihan A-E" adalah dua halaman PDF
   * terpisah, dan tiap halaman diperbesar sampai memenuhi lebar kertasnya.
   * Kalau gambar soal jauh lebih sempit daripada deret pilihan, ia akan
   * diperbesar lebih banyak dan gambar acuan tercetak lebih besar daripada
   * opsinya — padahal keduanya harus dibandingkan langsung. Menyamakan lebar
   * kanvas kedua gambar membuat faktor pembesarannya ikut sama.
   */
  function bungkusPenuh(bagian, w, h, lebarPenuh) {
    var lebar = Math.max(w, lebarPenuh || 0);
    var geserX = PAD + (lebar - w) / 2;
    return R.doc('<g transform="translate(' + R.num(geserX) + ',' + PAD + ')">' + bagian + '</g>',
      lebar + PAD * 2, h + PAD * 2, { background: '#ffffff' });
  }

  /** Halaman "gambar soal" pada PDF. */
  function gambarSoal(soal, opsi) {
    opsi = opsi || {};
    var sisi = opsi.sisi || 150;
    var skala = skalaSoal(soal, sisi);
    var b = blokSoal(soal, sisi, skala);
    if (!b) {
      /*
       * Ketidaksamaan tidak punya gambar soal tersendiri: yang harus
       * dibandingkan adalah kelima gambarnya sendiri. Di sini kelimanya
       * digambar TANPA huruf, sedangkan halaman berikutnya menampilkannya
       * dengan huruf A-E. Kalau keduanya sama-sama berhuruf, kedua halaman
       * PDF itu menjadi gambar yang identik byte demi byte — satu halaman
       * penuh yang tidak menambah apa pun.
       */
      b = blokPilihan(soal, sisi, skala, { tanpaLabel: true });
    }
    return bungkusPenuh(b.svg, b.width, b.height, blokPilihan(soal, sisi, skala, {}).width);
  }

  /** Halaman "pilihan A-E" pada PDF. */
  function gambarPilihan(soal, opsi) {
    opsi = opsi || {};
    var sisi = opsi.sisi || 150;
    var skala = skalaSoal(soal, sisi);
    var b = blokPilihan(soal, sisi, skala, opsi);
    return bungkusPenuh(b.svg, b.width, b.height, b.width);
  }

  // ------------------------------------------------------ gambar pembahasan

  var MERAH = '#c0392b';

  /**
   * Baris 1 — gambar acuan bersanding dengan kunci, unsur yang bersesuaian
   * diberi WARNA DAN NOMOR yang sama.
   *
   * Tanpa penanda ini, kalimat "diputar 225 derajat" hanya bisa dipercaya,
   * tidak bisa diperiksa: pada gambar garis polos tidak ada apa pun yang bisa
   * ditelusuri mata dari gambar acuan ke gambar kuncinya. Dengan warna dan
   * nomor, pembaca cukup mengikuti satu warna untuk melihat ke mana unsur itu
   * berpindah — dan melihat sendiri bahwa semuanya berpindah bersama-sama.
   *
   * Kuncinya adalah `F.putar()` mempertahankan URUTAN unsur, jadi unsur ke-i
   * pada gambar acuan pasti unsur ke-i pada kuncinya. Padanannya tidak perlu
   * dicari-cari.
   */
  function barisPadanan(soal, sisi, skala, uk) {
    var acuan = soal.dasar;
    var kunci = soal.pilihan[soal.jawabanIndex].fig;
    var warna = acuan.unsur.map(function (u, i) { return R.paletUnsur(i); });
    var nomor = acuan.unsur.map(function (u, i) { return i + 1; });

    var kiri = R.kotak(acuan, sisi, { skala: skala, warna: warna, nomor: nomor });
    var kanan = R.kotak(kunci, sisi, {
      skala: skala, warna: warna, nomor: nomor, sorot: true
    });

    var jarak = Math.round(sisi * 0.46);
    var atas = uk + 6;
    var xKanan = sisi + jarak;
    var isi = [];
    isi.push(R.text('Gambar acuan', sisi / 2, uk, { size: uk, weight: 700, anchor: 'middle', fill: '#334' }));
    isi.push('<g transform="translate(0,' + atas + ')">' + kiri.svg + '</g>');
    isi.push(R.text('Opsi ' + soal.jawabanHuruf + ' (kunci)', xKanan + sisi / 2, uk,
      { size: uk, weight: 700, anchor: 'middle', fill: '#334' }));
    isi.push('<g transform="translate(' + R.num(xKanan) + ',' + atas + ')">' + kanan.svg + '</g>');
    isi.push(R.panah(sisi + jarak * 0.16, atas + sisi / 2, jarak * 0.68));
    isi.push(R.text(F.norm360(soal.sudutKunci) + '°', sisi + jarak / 2, atas + sisi / 2 - uk * 0.75,
      { size: Math.round(uk * 1.05), weight: 700, anchor: 'middle', fill: '#12805c' }));
    return { svg: isi.join(''), width: xKanan + sisi, height: atas + sisi };
  }

  /**
   * Baris 2 — tahapan putaran.
   *
   * Gambar acuan ditampilkan pada tiga sudut antara sampai tiba di sudut
   * kuncinya, sehingga "225 derajat searah jarum jam" bisa DILIHAT terjadi,
   * bukan sekadar dibaca angkanya. Bingkai terakhir adalah gambar yang sama
   * persis dengan opsi kuncinya.
   */
  function barisTahap(soal, sisi, skala, uk) {
    var langkah = 3;
    var total = F.norm360(soal.sudutKunci);
    var warna = soal.dasar.unsur.map(function (u, i) { return R.paletUnsur(i); });
    var jarak = Math.round(sisi * 0.24);
    var isi = [];
    for (var k = 0; k <= langkah; k++) {
      var d = total * k / langkah;
      var akhir = k === langkah;
      var kk = R.kotak(F.putar(soal.dasar, d), sisi, {
        skala: skala, warna: warna, tebal: Math.max(1, sisi * 0.014),
        warnaTepi: akhir ? '#12805c' : null
      });
      var x = k * (sisi + jarak);
      isi.push('<g transform="translate(' + R.num(x) + ',0)">' + kk.svg + '</g>');
      isi.push(R.text(akhir ? Math.round(d) + '° = opsi ' + soal.jawabanHuruf : Math.round(d) + '°',
        x + sisi / 2, sisi + uk + 2,
        { size: uk, weight: akhir ? 700 : 400, anchor: 'middle', fill: akhir ? '#12805c' : '#667089' }));
      if (!akhir) {
        isi.push(R.panah(x + sisi + jarak * 0.14, sisi / 2, jarak * 0.72, { tebal: 1.6 }));
      }
    }
    var lebar = (langkah + 1) * sisi + langkah * jarak;
    return { svg: isi.join(''), width: lebar, height: sisi + uk + 6 };
  }

  /**
   * Baris 3 — peta pengecoh: kelima opsi kecil-kecil, unsur yang cacat
   * diwarnai MERAH dan digemukkan.
   *
   * Pembahasan menulis "letak bingkai terluar berpindah"; tanpa peta ini
   * pembaca harus mencari sendiri bingkai mana yang dimaksud di antara lima
   * gambar yang mirip. `sorot` bernilai -1 untuk cacat yang mengenai seluruh
   * gambar (pencerminan) dan null bila memang tak ada yang bisa ditunjuk
   * (unsurnya justru hilang).
   */
  function barisPeta(soal, sisi, skala, uk) {
    var jarak = Math.round(sisi * 0.20);
    var isi = [];
    soal.pilihan.forEach(function (p, i) {
      var n = p.fig.unsur.length;
      var warna = new Array(n), tebalUnsur = new Array(n);
      if (!p.benar && p.sorot != null) {
        for (var j = 0; j < n; j++) {
          var kena = p.sorot === -1 || p.sorot === j;
          warna[j] = kena ? MERAH : '#9aa3b8';
          tebalUnsur[j] = kena ? 1.7 : 1;
        }
      }
      // Bingkai merah dipasang pada SEMUA opsi yang salah, termasuk yang
      // cacatnya berupa unsur yang hilang dan karena itu tidak punya unsur
      // untuk ditandai — kalau tidak, opsi itu tampak seperti kunci kedua.
      var kk = R.kotak(p.fig, sisi, {
        skala: skala, warna: warna, tebalUnsur: tebalUnsur,
        sorot: p.benar, warnaTepi: p.benar ? null : MERAH
      });
      var x = i * (sisi + jarak);
      isi.push('<g transform="translate(' + R.num(x) + ',0)">' + kk.svg + '</g>');
      isi.push(R.text(Q.huruf(i) + (p.benar ? ' ✓' : ''), x + sisi / 2, sisi + uk + 2, {
        size: uk, weight: 700, anchor: 'middle', fill: p.benar ? '#12805c' : MERAH
      }));
    });
    return {
      svg: isi.join(''),
      width: 5 * sisi + 4 * jarak,
      height: sisi + uk + 6
    };
  }

  /**
   * Halaman pembahasan: gambar acuan bersanding dengan opsi kunci.
   *
   * Kedua gambar diberi keterangan supaya pembaca tahu mana yang mana, dan
   * pada tipe kesesuaian dituliskan pula sudut putarnya di antara keduanya —
   * itulah bukti yang bisa ditelusuri sendiri di gambar.
   */
  function gambarPembahasan(soal, opsi) {
    opsi = opsi || {};
    var sisi = opsi.sisi || 170;
    var skala = skalaSoal(soal, sisi);
    var uk = Math.max(11, Math.round(sisi * 0.115));
    var jarak = Math.round(sisi * 0.46);
    var atas = uk + 8;

    /*
     * Kesesuaian mendapat tiga baris sekaligus, karena di situlah seluruh
     * pertanyaannya: MENGAPA kunci itu benar. Baris pertama memasangkan
     * unsurnya lewat warna dan nomor, baris kedua memperlihatkan putarannya
     * berlangsung, baris ketiga menunjuk unsur yang cacat pada tiap pengecoh.
     * Susunannya menumpuk ke bawah, dan itu justru pas dengan halaman PDF-nya
     * yang menyediakan kolom gambar selebar 480 pt namun setinggi 610 pt.
     */
    if (soal.tipe === 'kesesuaian' && opsi.ringkas !== true) {
      /*
       * Skala dihitung ULANG untuk tiap baris menurut ukuran kotaknya sendiri.
       * Memakai satu skala untuk semua baris — seperti yang dilakukan di dalam
       * satu baris — membuat gambar tumpah keluar kotak pada baris yang
       * kotaknya lebih kecil. Perbandingan antar opsi tetap adil karena yang
       * penting adalah SATU skala di dalam satu baris, bukan antar baris.
       */
      var sisi1 = Math.round(sisi * 0.92);
      var sisi2 = Math.round(sisi * 0.52);
      var sisi3 = Math.round(sisi * 0.44);
      var uk2 = Math.max(9, Math.round(uk * 0.85));

      var baris = [
        { judul: null, blok: barisPadanan(soal, sisi1, skalaSoal(soal, sisi1), uk) },
        { judul: 'Tahap putaran', blok: barisTahap(soal, sisi2, skalaSoal(soal, sisi2), uk2) },
        { judul: 'Unsur yang keliru pada tiap opsi', blok: barisPeta(soal, sisi3, skalaSoal(soal, sisi3), uk2) }
      ];
      var lebar = Math.max.apply(null, baris.map(function (r) { return r.blok.width; }));
      var isi3 = [], y3 = 0;

      baris.forEach(function (r) {
        if (r.judul) {
          y3 += Math.round(uk * 1.9);
          isi3.push(R.text(r.judul, 0, y3, { size: uk, weight: 700, fill: '#334' }));
          y3 += Math.round(uk * 0.7);
        }
        isi3.push('<g transform="translate(' + R.num((lebar - r.blok.width) / 2) + ',' +
          R.num(y3) + ')">' + r.blok.svg + '</g>');
        y3 += r.blok.height;
      });

      return bungkus(isi3.join(''), lebar, y3);
    }

    var kiriFig, kiriLabel;
    if (soal.tipe === 'kesesuaian') {
      kiriFig = soal.dasar; kiriLabel = 'Gambar acuan';
    } else if (soal.tipe === 'ketidaksamaan') {
      kiriFig = soal.pilihan.filter(function (p, i) { return i !== soal.jawabanIndex; })[0].fig;
      kiriLabel = 'Pola yang dipakai empat gambar';
    } else if (soal.tipe === 'analogi') {
      kiriFig = soal.soalGambar[2].fig; kiriLabel = 'Gambar C pada soal';
    } else {
      kiriFig = soal.soalGambar[soal.soalGambar.length - 1].fig; kiriLabel = 'Kotak keempat';
    }

    var kanan = soal.pilihan[soal.jawabanIndex].fig;
    var kananLabel = 'Opsi ' + soal.jawabanHuruf + ' (kunci)';

    var kk = R.kotak(kiriFig, sisi, { skala: skala });
    var kn = R.kotak(kanan, sisi, { skala: skala, sorot: true });
    var xKanan = sisi + jarak;
    var isi = [];

    isi.push(R.text(kiriLabel, sisi / 2, uk, { size: uk, weight: 700, anchor: 'middle', fill: '#334' }));
    isi.push('<g transform="translate(0,' + atas + ')">' + kk.svg + '</g>');
    isi.push(R.text(kananLabel, xKanan + sisi / 2, uk, { size: uk, weight: 700, anchor: 'middle', fill: '#334' }));
    isi.push('<g transform="translate(' + R.num(xKanan) + ',' + atas + ')">' + kn.svg + '</g>');
    isi.push(R.panah(sisi + jarak * 0.18, atas + sisi / 2, jarak * 0.64));

    var ket = keteranganPanah(soal);
    if (ket) {
      isi.push(R.text(ket, sisi + jarak / 2, atas + sisi / 2 - uk * 0.9,
        { size: Math.round(uk * 0.92), weight: 700, anchor: 'middle', fill: '#12805c' }));
    }
    return bungkus(isi.join(''), xKanan + sisi, atas + sisi);
  }

  function keteranganPanah(soal) {
    if (soal.tipe === 'kesesuaian') return F.norm360(soal.sudutKunci) + '°';
    if (soal.tipe === 'analogi') return soal.hubungan.jenis === 'cerminPutar'
      ? 'cermin + ' + F.norm360(soal.hubungan.sudut) + '°'
      : F.norm360(soal.hubungan.sudut) + '°';
    if (soal.tipe === 'serial') return (soal.pola.delta > 0 ? '+' : '') + soal.pola.delta + '°';
    return 'berbeda';
  }

  /**
   * Lembar soal utuh — perintah, gambar soal, lalu pilihan A-E.
   * Dipakai di layar dan pada cetakan A4.
   */
  function lembar(soal, opsi) {
    opsi = opsi || {};
    var sisi = opsi.sisi || 120;
    var skala = skalaSoal(soal, sisi);
    var ukJudul = opsi.ukuranJudul || 13;
    var lebarTeks = opsi.lebar || 620;

    var bagian = [], y = 0;
    if (opsi.perintah !== false) {
      var baris = penggalTeks(soal.perintah, Math.floor(lebarTeks / (ukJudul * 0.52)));
      baris.forEach(function (t) {
        y += ukJudul + 3;
        bagian.push(R.text(t, 0, y, { size: ukJudul, fill: '#2a3245' }));
      });
      y += 12;
    }

    var bs = blokSoal(soal, sisi, skala);
    var bp = blokPilihan(soal, sisi, skala, opsi);
    var lebar = Math.max(bp.width, bs ? bs.width : 0, lebarTeks);

    if (bs) {
      bagian.push('<g transform="translate(' + R.num((lebar - bs.width) / 2) + ',' + R.num(y) + ')">' +
        bs.svg + '</g>');
      y += bs.height + Math.round(sisi * 0.22);
    }
    bagian.push('<g transform="translate(' + R.num((lebar - bp.width) / 2) + ',' + R.num(y) + ')">' +
      bp.svg + '</g>');
    y += bp.height;

    if (opsi.tampilKunci) {
      y += 22;
      bagian.push(R.text('Kunci jawaban: ' + soal.jawabanHuruf, 0, y,
        { size: 13, weight: 700, fill: '#12805c' }));
    }
    return bungkus(bagian.join(''), lebar, y);
  }

  /** Pemenggal teks sederhana menurut jumlah huruf per baris. */
  function penggalTeks(teks, perBaris) {
    var kata = String(teks || '').split(/\s+/).filter(Boolean);
    var out = [], kini = '';
    kata.forEach(function (k) {
      var coba = kini ? kini + ' ' + k : k;
      if (kini && coba.length > perBaris) { out.push(kini); kini = k; }
      else kini = coba;
    });
    if (kini) out.push(kini);
    return out.length ? out : [''];
  }

  return {
    PAD: PAD,
    gambarSoal: gambarSoal, gambarPilihan: gambarPilihan,
    gambarPembahasan: gambarPembahasan, lembar: lembar,
    blokSoal: blokSoal, blokPilihan: blokPilihan,
    skalaSoal: skalaSoal, semuaBentuk: semuaBentuk, penggalTeks: penggalTeks
  };
});
