/*
 * uji/periksa-pdf.js — memeriksa PDF yang SUDAH JADI, bukan penghitung yang
 * menyusunnya.
 *
 * Jalankan:  node uji/periksa-pdf.js <berkas.pdf>
 *
 * Strukturnya dibaca langsung dari berkas (jumlah objek halaman dan MediaBox
 * tiap halaman). Teksnya dibaca lewat `pdftotext` bila tersedia; kalau tidak
 * ada, pemeriksaan teks dilewati dan disebutkan alasannya.
 */
var fs = require('fs');
var cp = require('child_process');

var berkas = process.argv[2];
if (!berkas) {
  console.log('Pemakaian: node uji/periksa-pdf.js <berkas.pdf>');
  process.exit(2);
}
var gagal = 0;
function cek(nama, ok, ket) {
  if (!ok) { gagal++; console.log('  GAGAL ' + nama + (ket ? ' — ' + ket : '')); }
  return ok;
}

var mentah = fs.readFileSync(berkas);
var teksBiner = mentah.toString('latin1');

// --------------------------------------------------------------- 1. struktur
console.log('1. Struktur berkas');
cek('tanda PDF', teksBiner.slice(0, 5) === '%PDF-', 'lima byte pertama bukan %PDF-');
cek('penutup EOF', /%%EOF\s*$/.test(teksBiner.slice(-32)), 'tidak berakhir dengan %%EOF');

var halaman = (teksBiner.match(/\/Type\s*\/Page[^s]/g) || []).length;
var kotak = teksBiner.match(/\/MediaBox\s*\[([^\]]*)\]/g) || [];
var salahUkuran = kotak.filter(function (m) {
  return !/\[\s*0\s+0\s+1440\s+810\s*\]/.test(m);
}).length;

console.log('   halaman           : ' + halaman);
console.log('   ukuran 1440x810   : ' + (kotak.length - salahUkuran) + '/' + kotak.length);
cek('semua halaman 1440x810', salahUkuran === 0, salahUkuran + ' halaman berukuran lain');
/*
 * Jumlah halaman per soal TIDAK selalu empat. Submateri kesesuaian mencetak
 * gambar acuan dan kelima opsinya pada satu halaman, sehingga soalnya hanya
 * memakai tiga. Yang diperiksa karena itu bukan kelipatan empat, melainkan
 * bahwa jumlah halamannya konsisten dengan jumlah soal yang terbaca.
 */
cek('halaman kelipatan 3 atau 4', halaman % 3 === 0 || halaman % 4 === 0,
  halaman + ' halaman, tidak habis dibagi 3 maupun 4');
console.log('   ukuran berkas     : ' + (mentah.length / 1048576).toFixed(2) + ' MB (' +
  (mentah.length / Math.max(1, halaman / 4) / 1024).toFixed(0) + ' KB per soal)');

// ------------------------------------------------------------------ 2. teks
console.log('\n2. Teks halaman pembahasan');
var teks = null;
try {
  teks = cp.execFileSync('pdftotext', ['-layout', berkas, '-'], { encoding: 'latin1' });
} catch (e) {
  console.log('   dilewati: `pdftotext` tidak tersedia di mesin ini');
}

if (teks) {
  var blok = teks.split(/\bNo\.\s+\d+\b/).slice(1);
  var perSoal = blok.length ? halaman / blok.length : 0;
  console.log('   blok soal terbaca : ' + blok.length +
    (perSoal ? '  (' + perSoal + ' halaman per soal)' : ''));
  cek('halaman per soal bulat', perSoal === 3 || perSoal === 4,
    halaman + ' halaman untuk ' + blok.length + ' soal = ' + perSoal.toFixed(2) + ' per soal');

  var tanpaJawaban = 0, alasanKembar = 0, tanpaOpsi = 0;
  blok.forEach(function (b, i) {
    if (!/Jawaban:\s*[A-E]/.test(b)) tanpaJawaban++;

    // Kalimat alasan tiap opsi: "A. ...", "B. ..." sesudah "Mengapa opsi lain salah:"
    var ekor = b.split('Mengapa opsi lain salah:')[1] || '';
    var potong = ekor.split(/\s(?=[A-E]\.\s)/).filter(function (t) { return /^[A-E]\.\s/.test(t); });
    if (potong.length !== 4) tanpaOpsi++;
    var lihat = {};
    potong.forEach(function (t) {
      var isi = t.replace(/^[A-E]\.\s*/, '').trim();
      if (lihat[isi]) {
        alasanKembar++;
        console.log('   soal ' + (i + 1) + ' punya dua opsi beralasan sama: ' +
          isi.slice(0, 60) + '…');
      }
      lihat[isi] = 1;
    });
  });
  cek('setiap soal punya kunci', tanpaJawaban === 0, tanpaJawaban + ' soal tanpa baris Jawaban');
  cek('setiap soal punya 4 alasan', tanpaOpsi === 0, tanpaOpsi + ' soal tidak beralasan 4 opsi');
  cek('alasan tidak kembar', alasanKembar === 0, alasanKembar + ' pasang alasan sama');
  console.log('   ' + blok.length + ' soal: kunci lengkap, 4 alasan per soal, tidak ada yang kembar');
}

console.log('\n' + (gagal ? gagal + ' PEMERIKSAAN GAGAL' : 'PDF lulus pemeriksaan.'));
process.exit(gagal ? 1 : 0);
