/*
 * uji/server.js — peladen berkas statis seadanya untuk memeriksa hasil di
 * peramban. Aplikasinya sendiri TIDAK membutuhkan peladen: index.html bisa
 * dibuka langsung dari disk. Berkas ini hanya alat bantu saat mengembangkan.
 *
 * Jalankan:  node uji/server.js [porta]
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var akar = path.join(__dirname, '..');
var porta = parseInt(process.argv[2], 10) || 8137;

var TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

http.createServer(function (req, res) {
  var rel = decodeURIComponent(req.url.split('?')[0]);

  /*
   * POST /simpan/<nama> menuliskan badan permintaan ke uji/keluaran/<nama>.
   *
   * Peramban tidak boleh menyimpan berkas ke disk saat dikendalikan otomatis,
   * padahal PDF dan .docx hanya bisa disusun DI DALAM peramban (keduanya
   * memakai canvas dan CompressionStream). Jalur ini dipakai untuk menyerahkan
   * hasilnya kembali agar bisa diperiksa dengan alat luar — bukan bagian dari
   * aplikasinya.
   */
  if (req.method === 'POST' && rel.indexOf('/simpan/') === 0) {
    var nama = path.basename(rel.slice('/simpan/'.length));
    var tujuan = path.join(akar, 'uji', 'keluaran', nama);
    var potong = [];
    req.on('data', function (c) { potong.push(c); });
    req.on('end', function () {
      fs.mkdirSync(path.dirname(tujuan), { recursive: true });
      var data = Buffer.concat(potong);
      fs.writeFileSync(tujuan, data);
      console.log('tersimpan ' + nama + ' (' + data.length + ' byte)');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(data.length));
    });
    return;
  }

  if (rel === '/') rel = '/index.html';
  var berkas = path.join(akar, rel);
  // Jangan pernah melayani berkas di luar akar proyek.
  if (berkas.indexOf(akar) !== 0) { res.writeHead(403); return res.end('terlarang'); }
  fs.readFile(berkas, function (err, data) {
    if (err) { res.writeHead(404); return res.end('tidak ada: ' + rel); }
    res.writeHead(200, { 'Content-Type': TIPE[path.extname(berkas)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(porta, function () {
  console.log('Peladen uji berjalan di http://localhost:' + porta + '/');
});
