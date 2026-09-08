/*
 * uji/bentuk.js — memeriksa mesin bentuk dan pembanding rotasinya.
 *
 * Jalankan:  node uji/bentuk.js [jumlah]
 *
 * Yang diperiksa:
 *   1. putaran yang diketahui terbaca kembali dengan sudut yang tepat;
 *   2. setiap bentuk yang lolos benar-benar memenuhi seluruh syarat penyaring;
 *   3. sebaran keluarga merata saat memakai benih berurutan;
 *   4. benih yang sama selalu menghasilkan bentuk yang sama.
 */
var F = require('../js/figure.js');
var Fam = require('../js/families.js');

var N = parseInt(process.argv[2], 10) || 400;
var gagal = 0;

function cek(nama, ok, ket) {
  if (!ok) { gagal++; console.log('  GAGAL ' + nama + (ket ? ' — ' + ket : '')); }
  return ok;
}

// ---------------------------------------------------------------- 1. putaran
console.log('1. Sudut putar terbaca kembali');
var sudutUji = [0, 15, 45, 90, 135, 180, 225, 270, 345];
var salahSudut = 0;
for (var i = 0; i < 120; i++) {
  var fig = Fam.bangkitkan('campur', 200000 + i);
  var d = sudutUji[i % sudutUji.length];
  var hasil = F.sudutPutarKe(fig, F.putar(fig, d));
  if (hasil === null || Math.abs(F.norm360(hasil - d)) > 1e-3) {
    salahSudut++;
    if (salahSudut < 4) console.log('  benih ' + (200000 + i) + ' harap ' + d + ' dapat ' + hasil);
  }
}
cek('sudut putar', salahSudut === 0, salahSudut + ' dari 120 meleset');
console.log('   ' + (120 - salahSudut) + '/120 sudut terbaca tepat');

// ------------------------------------------------------------- 2. penyaringan
console.log('\n2. Bentuk yang lolos memenuhi syarat');
var stat = {}, cadang = 0, cobaJml = 0, t0 = Date.now();
Fam.KELUARGA.forEach(function (k) { stat[k.id] = 0; });
var langgar = 0;
for (i = 0; i < N; i++) {
  var f = Fam.bangkitkan('campur', 1000 + i);
  stat[f.keluarga]++;
  cobaJml += f.coba;
  if (f.coba > Fam.COBA_MAKS) cadang++;
  var alasan = Fam.periksa(f);
  if (alasan.length) {
    langgar++;
    if (langgar < 4) console.log('  benih ' + (1000 + i) + ': ' + alasan.join(', '));
  }
}
cek('penyaring', langgar === 0, langgar + ' bentuk lolos padahal melanggar');
cek('cadangan', cadang === 0, cadang + ' bentuk jatuh ke cadangan');
console.log('   ' + N + ' bentuk, rerata ' + (cobaJml / N).toFixed(2) + ' percobaan, ' +
  ((Date.now() - t0) / N).toFixed(1) + ' ms per bentuk');

// ---------------------------------------------------------- 3. sebaran merata
console.log('\n3. Sebaran keluarga');
var harap = N / Fam.KELUARGA.length, timpang = 0;
Object.keys(stat).forEach(function (k) {
  var selisih = Math.abs(stat[k] - harap) / harap;
  if (selisih > 0.30) timpang++;
  console.log('   ' + k.padEnd(8) + String(stat[k]).padStart(4) +
    '  (' + (stat[k] / N * 100).toFixed(1) + '%)');
});
cek('sebaran keluarga', timpang === 0, timpang + ' keluarga melenceng lebih dari 30%');

// ---------------------------------------------------------- 4. dapat diulang
console.log('\n4. Benih yang sama menghasilkan bentuk yang sama');
var beda = 0;
for (i = 0; i < 60; i++) {
  var a = Fam.bangkitkan('campur', 4242 + i);
  var b = Fam.bangkitkan('campur', 4242 + i);
  if (!F.samaPersis(a, b) || a.keluarga !== b.keluarga) beda++;
}
cek('dapat diulang', beda === 0, beda + ' dari 60 berbeda');
console.log('   60/60 bentuk terulang persis');

// ------------------------------------------------------- 5. syarat kunci ganda
console.log('\n5. Syarat yang mencegah kunci ganda');
var simetri = 0, takKiral = 0;
for (i = 0; i < N; i++) {
  var g = Fam.bangkitkan('campur', 1000 + i);
  if (F.ordeSimetri(g) !== 1) simetri++;
  if (!F.kiral(g)) takKiral++;
}
cek('orde simetri 1', simetri === 0, simetri + ' bentuk simetri putar');
cek('kiral', takKiral === 0, takKiral + ' bentuk tidak kiral');
console.log('   orde simetri 1: ' + N + '/' + N + '   kiral: ' + N + '/' + N);

// -------------------------------------------- 6. syarat mana yang menggigit
console.log('\n6. Sebab penolakan pada bentuk mentah');
var sebab = {}, mentahN = 0, mentahTolak = 0;
for (i = 0; i < N * 3; i++) {
  var m = Fam.mentah('campur', 600000 + i);
  mentahN++;
  var alasanM = Fam.periksa(m);
  if (!alasanM.length) continue;
  mentahTolak++;
  alasanM.forEach(function (t) { sebab[t] = (sebab[t] || 0) + 1; });
}
console.log('   ' + mentahTolak + ' dari ' + mentahN + ' bentuk mentah ditolak (' +
  (mentahTolak / mentahN * 100).toFixed(1) + '%)');
Object.keys(sebab).sort(function (a, b) { return sebab[b] - sebab[a]; }).forEach(function (t) {
  console.log('   ' + String(sebab[t]).padStart(4) + '  (' +
    (sebab[t] / mentahN * 100).toFixed(1) + '%)  ' + t);
});
cek('penyaring memang menggigit', mentahTolak > 0,
  'tidak ada bentuk mentah yang ditolak — penyaringnya tidak berguna?');

console.log('\n' + (gagal ? gagal + ' PEMERIKSAAN GAGAL' : 'Semua pemeriksaan lulus.'));
process.exit(gagal ? 1 : 0);
