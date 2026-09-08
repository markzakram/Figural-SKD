/*
 * rng.js — pengacak berbenih (seeded).
 *
 * Seluruh bentuk soal dibangkitkan dari sebuah nomor benih. Benih yang sama
 * SELALU menghasilkan bentuk yang sama, sehingga sebuah soal bisa dibuat ulang
 * persis dari nomornya saja — penting untuk menelusuri soal yang bermasalah dan
 * untuk menguji ulang hasil generator tanpa menyimpan gambarnya.
 *
 * Memakai mulberry32: satu kata keadaan 32 bit, periode 2^32, sebaran seragam
 * yang lebih dari cukup untuk memilih sudut dan unsur gambar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Rng = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Aduk benih sebelum dipakai.
   *
   * Soal dibuat sepaket dengan benih berurutan (1000, 1001, 1002, ...), dan
   * keluaran PERTAMA mulberry32 untuk benih berurutan masih berkorelasi. Itu
   * terasa nyata: keluaran pertama dipakai memilih keluarga bentuk, dan tanpa
   * pengadukan sebaran keluarganya melenceng jauh (148 : 63 dari 400 bentuk,
   * padahal seharusnya sekitar 100 : 100). Pengaduk finalizer splitmix32
   * memutus korelasi itu, lalu tiga keluaran pertama tetap dibuang sebagai
   * pemanasan.
   */
  function adukBenih(x) {
    x = (x >>> 0) + 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    return (x ^ (x >>> 15)) >>> 0;
  }

  /**
   * @param {number} benih bilangan bulat apa pun
   * @returns {function():number} pengacak 0 <= x < 1
   */
  function buat(benih) {
    var a = adukBenih(benih) || 0x9e3779b9;
    var r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r(); r(); r();
    return r;
  }

  /** Pembungkus dengan pemilih yang sering dipakai. */
  function alat(benih) {
    var r = buat(benih);
    var a = {
      acak: r,
      /** bilangan pecahan pada [lo, hi) */
      antara: function (lo, hi) { return lo + r() * (hi - lo); },
      /** bilangan bulat pada [lo, hi] */
      bulat: function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); },
      /** satu anggota daftar */
      pilih: function (daftar) { return daftar[Math.floor(r() * daftar.length)]; },
      /** benar dengan peluang p */
      untung: function (p) { return r() < p; },
      /** -1 atau 1 */
      tanda: function () { return r() < 0.5 ? -1 : 1; },
      /** salinan daftar yang urutannya diacak (Fisher-Yates) */
      kocok: function (daftar) {
        var d = daftar.slice();
        for (var i = d.length - 1; i > 0; i--) {
          var j = Math.floor(r() * (i + 1));
          var t = d[i]; d[i] = d[j]; d[j] = t;
        }
        return d;
      },
      /** ambil n anggota berbeda dari daftar */
      ambil: function (daftar, n) { return a.kocok(daftar).slice(0, n); }
    };
    return a;
  }

  /** Benih acak sungguhan — dipakai tombol "Acak bentuk". */
  function benihBaru() {
    return (Math.floor(Math.random() * 0xffffffff) >>> 0);
  }

  return { buat: buat, alat: alat, benihBaru: benihBaru, adukBenih: adukBenih };
});
