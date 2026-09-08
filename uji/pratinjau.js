/*
 * uji/pratinjau.js — membuat satu berkas HTML berisi contoh soal dari setiap
 * kombinasi tipe dan keluarga bentuk, supaya hasil gambarnya bisa diperiksa
 * dengan mata, bukan hanya lewat angka.
 *
 * Jalankan:  node uji/pratinjau.js [berkas] [benih] [tipe] [keluarga]
 *
 * `tipe` dan `keluarga` boleh diisi "semua". Menyaring salah satunya berguna
 * karena halaman berisi keempat tipe untuk keempat keluarga menjadi sangat
 * panjang (sekitar 30.000 piksel) dan peramban lambat menggambarnya.
 */
var Fam = require('../js/families.js');
var Q = require('../js/quiz.js');
var Sheet = require('../js/sheet.js');
var fs = require('fs');
var path = require('path');

var keluar = process.argv[2] || path.join(__dirname, 'pratinjau.html');
var benihAwal = parseInt(process.argv[3], 10) || 12000;
var pilihTipe = process.argv[4] && process.argv[4] !== 'semua' ? process.argv[4] : null;
var pilihKel = process.argv[5] && process.argv[5] !== 'semua' ? process.argv[5] : null;

var bagian = [];
var n = 0, gagal = 0;

Q.TIPE.forEach(function (tp) {
  if (pilihTipe && tp.id !== pilihTipe) { n += Fam.KELUARGA.length * 3; return; }
  bagian.push('<h2>' + tp.nama + '</h2>');
  Fam.KELUARGA.forEach(function (kl) {
    if (pilihKel && kl.id !== pilihKel) { n += 3; return; }
    bagian.push('<h3>' + kl.nama + '</h3><div class="baris">');
    ['mudah', 'sedang', 'sulit'].forEach(function (tk) {
      var s = Q.buat({ tipe: tp.id, tingkat: tk, keluarga: kl.id, benih: benihAwal + (n++) * 101 });
      if (!s) { gagal++; bagian.push('<div class="kartu">gagal dibuat</div>'); return; }
      bagian.push('<div class="kartu">' +
        '<div class="cap">' + tk + ' — kunci ' + s.jawabanHuruf +
        (s.peringatan.length ? ' <b class="bad">' + s.peringatan.length + ' peringatan</b>' : '') + '</div>' +
        Sheet.lembar(s, { tampilKunci: true, sisi: 108, lebar: 560 }) +
        '<details><summary>pembahasan</summary><ol>' +
        s.pembahasan.map(function (p) { return '<li>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>'; }).join('') +
        '</ol></details>' +
        '<div class="cap">gambar pembahasan</div>' + Sheet.gambarPembahasan(s, { sisi: 120 }) +
        '</div>');
    });
    bagian.push('</div>');
  });
});

var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
  '<title>Pratinjau soal figural</title><style>' +
  'body{font:13px/1.5 "Segoe UI",system-ui,Arial,sans-serif;background:#f4f6fa;color:#1b2130;margin:20px}' +
  'h2{margin:26px 0 6px;font-size:17px}h3{margin:14px 0 6px;font-size:13px;color:#667089;' +
  'text-transform:uppercase;letter-spacing:.04em}' +
  '.baris{display:flex;gap:14px;flex-wrap:wrap}' +
  '.kartu{background:#fff;border:1px solid #dfe4ee;border-radius:9px;padding:10px;max-width:640px}' +
  '.cap{font-size:11px;color:#667089;margin-bottom:4px}.bad{color:#c0392b}' +
  'svg{display:block;max-width:100%}details{font-size:11px;color:#3a4256;margin-top:6px}' +
  'ol{margin:4px 0 0 16px;padding:0}li{margin:2px 0}' +
  '</style></head><body><h1>Pratinjau soal figural</h1>' +
  '<p>' + n + ' soal, ' + gagal + ' gagal dibuat.</p>' + bagian.join('') + '</body></html>';

fs.writeFileSync(keluar, html, 'utf8');
console.log('Ditulis: ' + keluar + '  (' + n + ' soal, ' + gagal + ' gagal)');
