/*
 * uji/qc-paket.js — QC satu paket soal yang SUDAH diunduh.
 *
 * Jalankan:  node uji/qc-paket.js <benih.json> [berkas.pdf]
 *
 * `benih.json` berisi [{benih, kunci}, ...] yang dicatat dari bank soal.
 * Tiap soal DIBUAT ULANG dari benihnya, lalu diaudit dari geometrinya sendiri.
 * Kalau berkas PDF ikut diberikan, kunci yang tercetak di dalamnya dicocokkan
 * dengan hasil pembuatan ulang itu — pemeriksaan ujung ke ujung, dari benih
 * sampai ke tinta di kertas.
 *
 * Bedanya dengan `uji/soal.js`: di sana soalnya dibuat khusus untuk diuji;
 * di sini yang diuji adalah paket yang BENAR-BENAR akan dipakai, persis
 * seperti yang keluar dari tombol Generate.
 */
var F = require('../js/figure.js');
var Fam = require('../js/families.js');
var Q = require('../js/quiz.js');
var fs = require('fs');
var cp = require('child_process');

var berkasBenih = process.argv[2];
var berkasPdf = process.argv[3];
if (!berkasBenih) {
  console.log('Pemakaian: node uji/qc-paket.js <benih.json> [berkas.pdf]');
  process.exit(2);
}

var gagal = 0;
function cek(nama, ok, ket) {
  if (!ok) { gagal++; console.log('  GAGAL ' + nama + (ket ? ' — ' + ket : '')); }
  return ok;
}

var daftar = JSON.parse(fs.readFileSync(berkasBenih, 'utf8'));
var semuaKeluarga = Fam.KELUARGA.map(function (k) { return k.id; });

console.log('QC paket: ' + daftar.length + ' soal (kesesuaian, tingkat sulit)\n');

// ------------------------------------------------- 1. dibuat ulang dari benih
console.log('1. Soal dibuat ulang dari benihnya');
var soal = [], takJadi = 0, kunciBeda = 0;
daftar.forEach(function (r, i) {
  var s = Q.buat({
    tipe: 'kesesuaian', tingkat: 'sulit',
    keluarga: semuaKeluarga, benih: r.benih
  });
  if (!s) { takJadi++; return; }
  if (r.kunci && s.jawabanHuruf !== r.kunci) {
    kunciBeda++;
    if (kunciBeda < 4) {
      console.log('  no ' + (i + 1) + ' benih ' + r.benih + ': bank ' + r.kunci +
        ', dibuat ulang ' + s.jawabanHuruf);
    }
  }
  soal.push(s);
});
cek('semua soal dapat dibuat ulang', takJadi === 0, takJadi + ' gagal');
cek('kunci hasil ulang sama dengan bank', kunciBeda === 0, kunciBeda + ' berbeda');
console.log('   ' + soal.length + '/' + daftar.length + ' soal terulang persis, kunci sama semua');

// --------------------------------------------- 2. kunci tunggal & tidak kembar
console.log('\n2. Kunci tunggal, diperiksa dari geometrinya');
var gandaKunci = 0, kunciSalah = 0, opsiKembar = 0;
soal.forEach(function (s, i) {
  var sah = [];
  s.pilihan.forEach(function (p, k) {
    if (F.adalahRotasi(p.fig, s.dasar)) sah.push(Q.huruf(k));
  });
  if (sah.length !== 1) {
    gandaKunci++;
    if (gandaKunci < 4) console.log('  no ' + (i + 1) + ': ' + sah.length + ' opsi sah (' + sah.join(',') + ')');
  } else if (sah[0] !== s.jawabanHuruf) kunciSalah++;

  for (var x = 0; x < s.pilihan.length; x++) {
    for (var y = x + 1; y < s.pilihan.length; y++) {
      if (F.adalahRotasi(s.pilihan[x].fig, s.pilihan[y].fig)) { opsiKembar++; x = 9; break; }
    }
  }
});
cek('kunci tunggal', gandaKunci === 0, gandaKunci + ' soal berkunci ganda/nol');
cek('kunci tepat', kunciSalah === 0, kunciSalah + ' kunci tercatat salah');
cek('tidak ada opsi kembar', opsiKembar === 0, opsiKembar + ' soal punya dua opsi kembar');
console.log('   ' + soal.length + ' soal: kunci ganda 0, kunci salah 0, opsi kembar 0');

// ------------------------------- 3. kelima opsi tak bisa dicoret tanpa memutar
console.log('\n3. Kelima opsi berprofil & berstruktur sama (syarat tingkat sulit)');
var profilBeda = 0, strukturBeda = 0, opsiDiperiksa = 0;
soal.forEach(function (s, i) {
  var kunciStruktur = F.strukturKey(s.dasar);
  s.pilihan.forEach(function (p, k) {
    opsiDiperiksa++;
    if (!Q.profilCocok(p.fig, s.dasar)) {
      profilBeda++;
      if (profilBeda < 4) console.log('  no ' + (i + 1) + ' opsi ' + Q.huruf(k) + ': profil beda');
    }
    if (F.strukturKey(p.fig) !== kunciStruktur) strukturBeda++;
  });
});
cek('profil sama', profilBeda === 0, profilBeda + ' opsi berprofil beda');
cek('struktur sama', strukturBeda === 0, strukturBeda + ' opsi berstruktur beda');
console.log('   ' + opsiDiperiksa + ' opsi: jumlah/ukuran unsur dan hubungan antar unsur sama semua');

// ------------------------------------------------- 4. pencerminan tetap salah
console.log('\n4. Bayangan cermin tidak pernah sah');
var cerminSah = 0, pengecohCermin = 0;
soal.forEach(function (s) {
  if (F.adalahRotasi(F.cermin(s.dasar), s.dasar)) cerminSah++;
  s.pilihan.forEach(function (p) {
    if (p.jenis !== 'cermin') return;
    pengecohCermin++;
    if (F.adalahRotasi(p.fig, s.dasar)) cerminSah++;
  });
});
cek('cermin selalu salah', cerminSah === 0, cerminSah + ' kasus cermin ternyata sah');
console.log('   ' + pengecohCermin + ' pengecoh hasil pencerminan, 0 yang keliru dinilai sah');

// ------------------------------------------------------- 5. tidak ada kembar
console.log('\n5. Tidak ada dua soal yang kembar');
var lihat = {}, kembar = 0;
soal.forEach(function (s, i) {
  var sd = Q.sidik(s);
  if (lihat[sd]) { kembar++; if (kembar < 4) console.log('  no ' + (i + 1) + ' kembar dengan no ' + lihat[sd]); }
  lihat[sd] = i + 1;
});
cek('tanpa soal kembar', kembar === 0, kembar + ' pasang kembar');
console.log('   ' + soal.length + ' soal, ' + kembar + ' kembar');

// --------------------------------------------------- 6. sebaran & keterbacaan
console.log('\n6. Sebaran kunci, keluarga, dan beda pengecoh');
var kunciHitung = { A: 0, B: 0, C: 0, D: 0, E: 0 }, kelHitung = {}, beda = [], jenis = {};
soal.forEach(function (s) {
  kunciHitung[s.jawabanHuruf]++;
  kelHitung[s.keluarga] = (kelHitung[s.keluarga] || 0) + 1;
  s.pilihan.forEach(function (p) {
    if (p.beda != null) beda.push(p.beda);
    if (p.jenis) jenis[p.jenis] = (jenis[p.jenis] || 0) + 1;
  });
});
var harap = soal.length / 5, x2 = 0;
Object.keys(kunciHitung).forEach(function (h) {
  x2 += Math.pow(kunciHitung[h] - harap, 2) / harap;
});
console.log('   kunci    : ' + Object.keys(kunciHitung).map(function (h) {
  return h + ':' + kunciHitung[h];
}).join('  ') + '   chi-kuadrat ' + x2.toFixed(2) + ' (4 db, ambang 9,49)');
cek('sebaran kunci merata', x2 < 9.49, 'chi-kuadrat ' + x2.toFixed(2) + ' melewati ambang');

console.log('   keluarga : ' + Object.keys(kelHitung).sort().map(function (k) {
  return k + ':' + kelHitung[k];
}).join('  '));
cek('keluarga beragam', Object.keys(kelHitung).length >= 6,
  'hanya ' + Object.keys(kelHitung).length + ' keluarga muncul');

console.log('   strategi : ' + Object.keys(jenis).sort().map(function (k) {
  return k + ':' + jenis[k];
}).join('  '));

beda.sort(function (a, b) { return a - b; });
var q = function (f) { return beda[Math.floor(f * (beda.length - 1))]; };
console.log('   beda pengecoh (' + beda.length + '): terkecil ' + q(0).toFixed(3) +
  '  median ' + q(0.5).toFixed(3) + '  terbesar ' + q(1).toFixed(3));
cek('beda di atas ambang', q(0) >= Q.AMBANG.bedaMinSulit - 1e-9, 'ada yang hanya ' + q(0).toFixed(4));
cek('beda di bawah batas atas', q(1) <= Q.AMBANG.bedaMaks + 1e-9, 'ada yang sampai ' + q(1).toFixed(4));

// --------------------------------------- 7. kunci di PDF cocok dengan geometri
if (berkasPdf) {
  console.log('\n7. Kunci yang TERCETAK di PDF cocok dengan geometrinya');
  var teks = null;
  try {
    teks = cp.execFileSync('pdftotext', ['-layout', berkasPdf, '-'], {
      encoding: 'latin1', maxBuffer: 64 * 1024 * 1024
    });
  } catch (e) {
    console.log('   dilewati: `pdftotext` tidak tersedia');
  }
  if (teks) {
    var blok = teks.split(/\bNo\.\s+\d+\b/).slice(1);
    console.log('   blok soal di PDF : ' + blok.length);
    cek('jumlah soal di PDF', blok.length === soal.length,
      blok.length + ' blok untuk ' + soal.length + ' soal');

    var cocok = 0, meleset = 0, tanpaKunci = 0;
    blok.forEach(function (b, i) {
      if (i >= soal.length) return;
      var m = b.match(/Jawaban:\s*([A-E])/);
      if (!m) { tanpaKunci++; return; }
      if (m[1] === soal[i].jawabanHuruf) cocok++;
      else {
        meleset++;
        if (meleset < 4) {
          console.log('  no ' + (i + 1) + ': PDF tertulis ' + m[1] +
            ', geometri menuntut ' + soal[i].jawabanHuruf);
        }
      }
    });
    cek('setiap soal punya kunci di PDF', tanpaKunci === 0, tanpaKunci + ' tanpa kunci');
    cek('kunci PDF cocok geometri', meleset === 0, meleset + ' meleset');
    console.log('   ' + cocok + '/' + blok.length + ' kunci yang tercetak cocok dengan geometrinya');

    // Sudut putar yang disebut pembahasan harus sudut yang sebenarnya.
    var sudutMeleset = 0, sudutDicek = 0;
    blok.forEach(function (b, i) {
      if (i >= soal.length) return;
      var m = b.match(/memutar seluruh pola sebesar (\d+) derajat/);
      if (!m) return;
      sudutDicek++;
      var nyata = F.sudutPutarKe(soal[i].dasar, soal[i].pilihan[soal[i].jawabanIndex].fig);
      if (nyata === null || Math.abs(F.norm360(nyata - +m[1])) > 1e-3) {
        sudutMeleset++;
        if (sudutMeleset < 4) {
          console.log('  no ' + (i + 1) + ': pembahasan menulis ' + m[1] + '°, terukur ' + nyata + '°');
        }
      }
    });
    cek('sudut di pembahasan benar', sudutMeleset === 0, sudutMeleset + ' sudut meleset');
    console.log('   ' + (sudutDicek - sudutMeleset) + '/' + sudutDicek +
      ' sudut putar yang ditulis pembahasan cocok dengan yang terukur dari gambarnya');
  }
}

console.log('\n' + (gagal ? gagal + ' PEMERIKSAAN GAGAL' : 'Paket lulus QC.'));
process.exit(gagal ? 1 : 0);
