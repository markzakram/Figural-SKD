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
