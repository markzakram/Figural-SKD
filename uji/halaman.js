/*
 * uji/halaman.js — pratinjau HALAMAN PDF, bukan sekadar gambarnya.
 *
 * Jalankan:  node uji/halaman.js [berkas] [benih]
 *
 * Setiap gambar ditempatkan pada kotak 1440x810 memakai perhitungan pemaskan
 * yang SAMA PERSIS dengan `pdf.js` (margin 81 pt, sisa tepi 70 pt untuk halaman
 * soal dan 90 pt untuk halaman pilihan). Dengan begitu terlihat apakah gambar
 * tercetak terlalu kecil atau melebar keluar batas — hal yang tidak kelihatan
 * kalau yang diperiksa hanya gambarnya sendiri di luar halaman.
 */
var Q = require('../js/quiz.js');
var Sheet = require('../js/sheet.js');
var fs = require('fs');
var path = require('path');

var keluar = process.argv[2] || path.join(__dirname, 'halaman.html');
var benih = parseInt(process.argv[3], 10) || 31000;

var LEBAR = 1440, TINGGI = 810, MARGIN = 81;

/** Ukuran tampil gambar pada halaman — salinan aturan `halamanGambar` di pdf.js. */
function pas(w, h, sisaTepi) {
  var rasio = w / h;
  var cw = LEBAR - 2 * MARGIN;
  var ch = cw / rasio;
  var maks = TINGGI - 2 * sisaTepi;
  if (ch > maks) { ch = maks; cw = ch * rasio; }
  return { w: cw, h: ch };
}

/** Ukuran intrinsik sebuah dokumen SVG. */
function ukuranSvg(svg) {
  var m = svg.match(/width="([\d.]+)"\s+height="([\d.]+)"/);
  return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
}

function halaman(isi, ket) {
  return '<div class="hal"><div class="ket">' + ket + '</div>' + isi + '</div>';
}

var bagian = [];
Q.TIPE.forEach(function (tp, i) {
  var s = Q.buat({ tipe: tp.id, tingkat: 'sedang', keluarga: 'campur', benih: benih + i * 977 });
  if (!s) { bagian.push('<h2>' + tp.nama + ' — gagal dibuat</h2>'); return; }

  bagian.push('<h2>' + tp.nama + ' — kunci ' + s.jawabanHuruf + ', benih ' + s.benih + '</h2>');

  // 1. judul
  bagian.push(halaman(
    '<div class="judul"><div class="no">No. ' + (i + 1) + '</div>' +
    '<div class="tipe">' + tp.label + '</div>' +
    '<div class="tingkat">Tingkat Kesulitan: Sedang</div></div>',
    'halaman 1 — judul'));

  /*
   * Kesesuaian mencetak acuan dan kelima opsinya pada SATU halaman, jadi
   * soalnya hanya tiga halaman. Submateri lain tetap memisahkan halaman soal
   * dan halaman pilihan.
   */
  var lembarGambar = s.tipe === 'kesesuaian'
    ? [['gambarGabung', 70, 'halaman 2 — soal + pilihan A-E']]
    : [['gambarSoal', 70, 'halaman 2 — gambar soal'],
      ['gambarPilihan', 90, 'halaman 3 — pilihan A-E']];

  lembarGambar.forEach(function (par) {
    var svg = Sheet[par[0]](s, { sisi: 150 });
    var u = ukuranSvg(svg);
    var p = pas(u.w, u.h, par[1]);
    bagian.push(halaman('<div class="gbr" style="width:' + p.w.toFixed(1) + 'px;height:' +
      p.h.toFixed(1) + 'px">' + svg + '</div>', par[2] +
      ' — gambar ' + p.w.toFixed(0) + 'x' + p.h.toFixed(0) + ' pt'));
  });

  // 4. kunci & pembahasan: gambar 480 pt di kiri, teks di kanan mulai x=640
  var gp = Sheet.gambarPembahasan(s, { sisi: 170 });
  var ug = ukuranSvg(gp);
  var gw = 480, gh = gw / (ug.w / ug.h), maxH = TINGGI - 200;
  if (gh > maxH) { gh = maxH; gw = gh * (ug.w / ug.h); }
  bagian.push(halaman(
    '<div class="bahas-gbr" style="left:' + (100 + (480 - gw) / 2).toFixed(1) + 'px;width:' +
    gw.toFixed(1) + 'px;height:' + gh.toFixed(1) + 'px">' + gp + '</div>' +
    '<div class="bahas-teks"><h3>Jawaban: ' + s.jawabanHuruf + '</h3><h4>Pembahasan:</h4>' +
    s.pembahasan.map(function (t) {
      return '<p>' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>';
    }).join('') + '</div>',
    (s.tipe === 'kesesuaian' ? 'halaman 3' : 'halaman 4') + ' — kunci & pembahasan'));
});

var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
  '<title>Pratinjau halaman PDF</title><style>' +
  'body{font:13px/1.5 "Segoe UI",system-ui,Arial,sans-serif;background:#59607a;color:#1b2130;margin:18px}' +
  'h1,h2{color:#fff}h2{font-size:15px;margin:22px 0 8px}' +
  '.hal{position:relative;width:1440px;height:810px;background:#fff;margin:0 0 12px;' +
  'box-shadow:0 6px 20px rgba(0,0,0,.3);display:grid;place-items:center;transform-origin:top left;' +
  'transform:scale(.52)}' +
  '.hal+.hal{margin-top:-380px}' +
  '.ket{position:absolute;top:8px;right:14px;font-size:15px;color:#9aa3b8}' +
  '.gbr svg{display:block;width:100%;height:100%}' +
  '.judul{position:absolute;left:135px;top:50%;transform:translateY(-50%)}' +
  '.no{font:700 45px Helvetica,Arial,sans-serif}' +
  '.tipe{font:700 27px Helvetica,Arial,sans-serif;color:#404859;margin-top:22px}' +
  '.tingkat{font:700 27px Helvetica,Arial,sans-serif;color:#b36b00;margin-top:14px}' +
  '.bahas-gbr{position:absolute;top:50%;transform:translateY(-50%)}' +
  '.bahas-gbr svg{display:block;width:100%;height:100%}' +
  '.bahas-teks{position:absolute;left:640px;top:70px;width:700px;font:16px/1.45 Helvetica,Arial,sans-serif}' +
  '.bahas-teks h3{font-size:30px;margin:0 0 12px}.bahas-teks h4{font-size:22px;margin:0 0 8px}' +
  '.bahas-teks p{margin:0 0 8px}' +
  '</style></head><body><h1 style="color:#fff">Pratinjau halaman PDF (1440x810, skala 52%)</h1>' +
  bagian.join('') + '<div style="height:420px"></div></body></html>';

fs.writeFileSync(keluar, html, 'utf8');
console.log('Ditulis: ' + keluar);
