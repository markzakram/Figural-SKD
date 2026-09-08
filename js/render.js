/*
 * render.js — penggambar SVG untuk bentuk figural dan lembar soalnya.
 *
 * Tanpa pustaka luar supaya berkasnya bisa dibuka langsung dari disk (file://).
 *
 * Satu bentuk digambar ke dalam KOTAK BUJUR SANGKAR. Bentuk sudah dipusatkan
 * pada titik asal oleh figure.js, jadi menggambarnya tinggal memindahkan titik
 * asal ke tengah kotak lalu mengalikan koordinatnya dengan satu bilangan skala.
 *
 * SKALA DIPAKAI BERSAMA. Semua kotak pada satu soal digambar pada skala yang
 * SAMA, dihitung dari bentuk yang jangkauannya terbesar. Kalau tiap kotak
 * dipaskan sendiri-sendiri, pengecoh yang unsurnya dihapus akan ikut membesar
 * memenuhi kotaknya, dan penjawab bisa menebaknya dari ukuran gambar saja tanpa
 * membaca polanya sama sekali.
 *
 * Mata panah dan kait digambar dari ARAH RUAS TERAKHIR, jadi keduanya ikut
 * berputar dengan sendirinya tanpa perlu disimpan sebagai titik tersendiri.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./figure.js'));
  } else {
    root.Render = factory(root.Figure);
  }
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';

  var TINTA = '#111111';
  var uid = 0;

  function num(v) { return Math.round(v * 1000) / 1000; }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function pts(list) {
    return list.map(function (p) { return num(p[0]) + ',' + num(p[1]); }).join(' ');
  }

  // ---------------------------------------------------------------- unsur

  /**
   * Mata panah / kait pada ujung ruas terakhir sebuah garis.
   * @param {Array} p titik sebelum ujung
   * @param {Array} q titik ujung
   */
  function ujung(p, q, jenis, skala, tebal, warna) {
    var dx = q[0] - p[0], dy = q[1] - p[1];
    var pj = Math.hypot(dx, dy) || 1;
    var ux = dx / pj, uy = dy / pj;
    var nx = -uy, ny = ux;
    var c = warna || TINTA;

    if (jenis === 1) {                       // mata panah tertutup
      var pjK = Math.max(4, skala * 0.075), lb = pjK * 0.52;
      var a = [q[0] - ux * pjK + nx * lb, q[1] - uy * pjK + ny * lb];
      var b = [q[0] - ux * pjK - nx * lb, q[1] - uy * pjK - ny * lb];
      return '<polygon points="' + pts([q, a, b]) + '" fill="' + c + '"/>';
    }
    // kait: ruas pendek melintang pada ujungnya
    var pjH = Math.max(4, skala * 0.085);
    var k = [q[0] + (nx - ux * 0.35) * pjH, q[1] + (ny - uy * 0.35) * pjH];
    return '<polyline points="' + pts([q, k]) + '" fill="none" stroke="' + c +
      '" stroke-width="' + num(tebal) + '" stroke-linecap="round"/>';
  }

  /**
   * Satu unsur, sudah dalam koordinat layar.
   * `warna` mewarnai unsur itu saja — dipakai gambar pembahasan untuk menandai
   * unsur yang bersesuaian antara gambar acuan dan kuncinya.
   */
  function unsur(u, skala, tebal, warna) {
    var t = tebal * (u.tebal || 1);
    var c = warna || TINTA;
    if (u.jenis === 'bulat') {
      return '<circle cx="' + num(u.pusat[0]) + '" cy="' + num(u.pusat[1]) +
        '" r="' + num(u.jari) + '" fill="' + (u.isi ? c : 'none') +
        '" stroke="' + c + '" stroke-width="' + num(t) + '"/>';
    }
    var isi = u.isi ? c : 'none';
    var bagian = [];
    if (u.tutup) {
      bagian.push('<polygon points="' + pts(u.titik) + '" fill="' + isi +
        '" stroke="' + c + '" stroke-width="' + num(t) +
        '" stroke-linejoin="round"/>');
    } else {
      bagian.push('<polyline points="' + pts(u.titik) + '" fill="' + isi +
        '" stroke="' + c + '" stroke-width="' + num(t) +
        '" stroke-linejoin="round" stroke-linecap="round"/>');
    }
    if (u.kepala && u.titik.length >= 2) {
      bagian.push(ujung(u.titik[u.titik.length - 2], u.titik[u.titik.length - 1],
        u.kepala, skala, t, warna));
    }
    return bagian.join('');
  }

  /**
   * Warna penanda unsur pada gambar pembahasan.
   *
   * Nadanya sengaja TUA, kebalikan dari generator jaring-jaring yang mewarnai
   * bidang dengan nada muda. Di sini yang diwarnai adalah GARIS setebal satu
   * sampai dua piksel; warna muda pada garis setipis itu hilang saat dicetak.
   */
  var PALET = ['#c0392b', '#1f6fd0', '#12805c', '#8e44ad', '#b8860b', '#0e7c86',
    '#d35400', '#5b4bc4'];

  function paletUnsur(i) { return PALET[i % PALET.length]; }

  // ---------------------------------------------------------------- kotak

  /**
   * Skala bersama untuk sekumpulan bentuk: dihitung dari yang paling menjangkau,
   * supaya bentuk terbesar sekalipun tetap muat di dalam kotaknya.
   *
   * @param {Array} daftar bentuk
   * @param {number} sisi panjang sisi kotak dalam piksel
   * @param {number} pad sisa tepi (0..0,4)
   */
  function skalaBersama(daftar, sisi, pad) {
    var maks = 0;
    daftar.forEach(function (f) { if (f) maks = Math.max(maks, F.jangkauan(f)); });
    if (maks < 1e-6) return 1;
    return (sisi * (0.5 - (pad == null ? 0.10 : pad))) / maks;
  }

  /**
   * Letakkan bulatan bernomor DI LUAR unsurnya, dengan garis penunjuk pendek
   * yang berujung di dalam unsur tersebut.
   *
   * Ditaruh di dalam, bulatan sebesar itu menutupi garis yang justru harus
   * dibaca. Penempatnya mencoba dua belas arah di sekeliling pusat unsur dan
   * memilih yang paling jauh dari garis mana pun DAN dari bulatan yang sudah
   * terpasang — tanpa itu dua nomor bisa memperebutkan celah yang sama pada
   * gambar yang padat.
   *
   * @param {Array} unsurLayar unsur yang sudah berkoordinat layar
   * @param {Array} nomor      nomor per unsur (null = tidak dinomori)
   * @param {Array} warna      warna per unsur
   * @param {number} sisi      sisi kotak
   */
  function nomorUnsur(unsurLayar, nomor, warna, sisi) {
    var jariBulatan = Math.max(6, sisi * 0.052);
    var batas = sisi / 2 - jariBulatan - 1;
    // Semua titik tinta, dipakai menghitung seberapa "ramai" sebuah calon letak.
    var tinta = F.sampelBatas({ unsur: unsurLayar }, 90);
    var terpasang = [];
    var bagian = [];

    unsurLayar.forEach(function (u, i) {
      if (nomor[i] == null) return;
      var pusat = F.pusatUnsur(u);
      var titikU = F.sampelBatas({ unsur: [u] }, 24);
      // Jari-jari unsur itu sendiri: sejauh mana ia terbentang dari pusatnya.
      var jariU = 0;
      titikU.forEach(function (p) {
        jariU = Math.max(jariU, Math.hypot(p[0] - pusat[0], p[1] - pusat[1]));
      });

      var terbaik = null, nilaiTerbaik = -Infinity;
      for (var k = 0; k < 12; k++) {
        var a = k * Math.PI / 6;
        var r = jariU + jariBulatan * 1.5;
        var c = [pusat[0] + r * Math.cos(a), pusat[1] + r * Math.sin(a)];
        // Harus tetap di dalam kotak.
        if (Math.abs(c[0]) > batas || Math.abs(c[1]) > batas) continue;
        var nilai = Infinity;
        tinta.forEach(function (p) {
          nilai = Math.min(nilai, Math.hypot(p[0] - c[0], p[1] - c[1]));
        });
        terpasang.forEach(function (p) {
          // Bulatan yang sudah ada jadi rintangan yang lebih berat daripada garis.
          nilai = Math.min(nilai, Math.hypot(p[0] - c[0], p[1] - c[1]) - jariBulatan);
        });
        if (nilai > nilaiTerbaik) { nilaiTerbaik = nilai; terbaik = c; }
      }
      if (!terbaik) terbaik = [pusat[0], pusat[1] - jariU - jariBulatan * 1.5];
      terpasang.push(terbaik);

      // Garis penunjuk ke titik unsur yang terdekat dengan bulatannya.
      var dekat = titikU[0], jarakDekat = Infinity;
      titikU.forEach(function (p) {
        var d = Math.hypot(p[0] - terbaik[0], p[1] - terbaik[1]);
        if (d < jarakDekat) { jarakDekat = d; dekat = p; }
      });
      var w = warna[i] || TINTA;
      bagian.push('<line x1="' + num(terbaik[0]) + '" y1="' + num(terbaik[1]) +
        '" x2="' + num(dekat[0]) + '" y2="' + num(dekat[1]) +
        '" stroke="' + w + '" stroke-width="0.9" stroke-dasharray="2 2"/>');
      bagian.push('<circle cx="' + num(terbaik[0]) + '" cy="' + num(terbaik[1]) +
        '" r="' + num(jariBulatan) + '" fill="#ffffff" stroke="' + w + '" stroke-width="1.3"/>');
      bagian.push(text(String(nomor[i]), terbaik[0], terbaik[1] + jariBulatan * 0.36, {
        size: Math.round(jariBulatan * 1.25), weight: 700, anchor: 'middle', fill: w
      }));
    });
    return bagian.join('');
  }

  /**
   * Gambar satu bentuk di dalam kotak bujur sangkar bergaris tepi.
   *
   * @param {object} fig bentuk (sudah terpusat pada titik asal)
   * @param {number} sisi panjang sisi kotak
   * @param {object} o
   *   skala, tebal, bingkai, latar
   *   sorot       true = bingkai kotak hijau (menandai kunci)
   *   warnaTepi   warna bingkai kotak, mengalahkan `sorot`
   *   warna       daftar warna per unsur (null = hitam)
   *   nomor       daftar nomor per unsur (null = tidak dinomori)
   *   tebalUnsur  daftar pengali tebal garis per unsur
   * @returns {{svg:string, width:number, height:number}}
   */
  function kotak(fig, sisi, o) {
    o = o || {};
    var s = o.skala || skalaBersama([fig], sisi, o.pad);
    var tebal = o.tebal || Math.max(1.1, sisi * 0.013);
    var warna = o.warna || [];
    var bagian = [];

    if (o.bingkai !== false) {
      var tepi = o.warnaTepi || (o.sorot ? '#12805c' : '#c9d0de');
      bagian.push('<rect x="0.5" y="0.5" width="' + num(sisi - 1) + '" height="' + num(sisi - 1) +
        '" rx="' + num(sisi * 0.03) + '" fill="' + (o.latar || '#ffffff') +
        '" stroke="' + tepi + '" stroke-width="' +
        ((o.sorot || o.warnaTepi) ? 2.5 : 1) + '"/>');
    }

    // Setiap unsur diskalakan lebih dulu, lalu digambar pada koordinat layar.
    var unsurLayar = fig ? fig.unsur.map(function (u) {
      var v = F.salinUnsur(u);
      if (v.jenis === 'bulat') {
        v.pusat = [v.pusat[0] * s, v.pusat[1] * s];
        v.jari = v.jari * s;
      } else {
        v.titik = v.titik.map(function (p) { return [p[0] * s, p[1] * s]; });
      }
      return v;
    }) : [];

    var isi = unsurLayar.map(function (v, i) {
      var t = tebal * ((o.tebalUnsur && o.tebalUnsur[i]) || 1);
      return unsur(v, sisi, t, warna[i]);
    }).join('');

    if (o.nomor) isi += nomorUnsur(unsurLayar, o.nomor, warna, sisi);

    bagian.push('<g transform="translate(' + num(sisi / 2) + ',' + num(sisi / 2) + ')">' + isi + '</g>');
    return { svg: bagian.join(''), width: sisi, height: sisi };
  }

  // ------------------------------------------------------------ deret kotak

  /**
   * Sederet kotak mendatar dengan label di bawah masing-masing.
   *
   * @param {Array} daftar [{fig, label, sorot}]
   * @param {number} sisi
   * @param {object} o { skala, jarak, ukuranLabel, tebal }
   */
  function deret(daftar, sisi, o) {
    o = o || {};
    var jarak = o.jarak == null ? Math.round(sisi * 0.16) : o.jarak;
    var adaLabel = daftar.some(function (d) { return d.label; });
    var uk = o.ukuranLabel || Math.max(11, Math.round(sisi * 0.17));
    var s = o.skala || skalaBersama(daftar.map(function (d) { return d.fig; }), sisi, o.pad);
    var bagian = [];

    daftar.forEach(function (d, i) {
      var x = i * (sisi + jarak);
      var k = kotak(d.fig, sisi, { skala: s, tebal: o.tebal, sorot: d.sorot, bingkai: o.bingkai });
      bagian.push('<g transform="translate(' + num(x) + ',0)">' + k.svg + '</g>');
      if (d.label) {
        bagian.push(text(d.label, x + sisi / 2, sisi + uk + 4,
          { size: uk, weight: 700, anchor: 'middle' }));
      }
    });

    return {
      svg: bagian.join(''),
      width: daftar.length * sisi + Math.max(0, daftar.length - 1) * jarak,
      height: sisi + (adaLabel ? uk + 8 : 0),
      skala: s
    };
  }

  /** Tanda tanya besar — kotak yang harus ditebak pada soal analogi & serial. */
  function kotakTanya(sisi, o) {
    o = o || {};
    var bagian = ['<rect x="0.5" y="0.5" width="' + num(sisi - 1) + '" height="' + num(sisi - 1) +
      '" rx="' + num(sisi * 0.03) + '" fill="#f7f9fd" stroke="#9aa5bb" ' +
      'stroke-width="1" stroke-dasharray="6 5"/>'];
    bagian.push(text('?', sisi / 2, sisi / 2 + sisi * 0.19,
      { size: Math.round(sisi * 0.52), weight: 700, anchor: 'middle', fill: '#8a93a6' }));
    return { svg: bagian.join(''), width: sisi, height: sisi };
  }

  // ----------------------------------------------------------------- teks

  function text(str, x, y, o) {
    o = o || {};
    return '<text x="' + num(x) + '" y="' + num(y) + '" fill="' + (o.fill || TINTA) +
      '" font-size="' + (o.size || 16) + '" font-family="' +
      (o.family || 'Arial, Helvetica, sans-serif') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') +
      ' text-anchor="' + (o.anchor || 'start') + '">' + esc(str) + '</text>';
  }

  /** Bungkus jadi dokumen SVG utuh. */
  function doc(inner, w, h, o) {
    o = o || {};
    var bg = o.background ? '<rect width="100%" height="100%" fill="' + o.background + '"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + num(w) + '" height="' + num(h) +
      '" viewBox="0 0 ' + num(w) + ' ' + num(h) + '">' + bg + inner + '</svg>';
  }

  function panah(x, y, panjang, o) {
    o = o || {};
    var w = o.tebal || 2.4, warna = o.fill || '#8a93a6';
    var kepala = Math.max(6, panjang * 0.34);
    return '<g><line x1="' + num(x) + '" y1="' + num(y) + '" x2="' + num(x + panjang - kepala) +
      '" y2="' + num(y) + '" stroke="' + warna + '" stroke-width="' + w + '"/>' +
      '<polygon points="' + pts([[x + panjang, y], [x + panjang - kepala, y - kepala * 0.42],
        [x + panjang - kepala, y + kepala * 0.42]]) + '" fill="' + warna + '"/></g>';
  }

  function id() { return 'r' + (++uid); }

  return {
    TINTA: TINTA,
    num: num, esc: esc, pts: pts, text: text, doc: doc, panah: panah, id: id,
    unsur: unsur, kotak: kotak, deret: deret, kotakTanya: kotakTanya,
    PALET: PALET, paletUnsur: paletUnsur, nomorUnsur: nomorUnsur,
    skalaBersama: skalaBersama
  };
});
