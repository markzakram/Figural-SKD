/*
 * uji/soal.js — memeriksa soal yang sudah jadi, lewat geometrinya sendiri.
 *
 * Jalankan:  node uji/soal.js [jumlah per kombinasi]
 *
 * Pemeriksanya sengaja MANDIRI: ia tidak melihat catatan cara soal dibuat,
 * melainkan menghitung ulang dari bentuk tiap pilihan siapa yang sah. Kalau
 * penyusun soal dan pemeriksanya memakai catatan yang sama, keduanya hanya
 * akan mengulangi asumsi yang sama.
 */
var F = require('../js/figure.js');
var Fam = require('../js/families.js');
var Q = require('../js/quiz.js');

var N = parseInt(process.argv[2], 10) || 30;
var gagal = 0;

function cek(nama, ok, ket) {
  if (!ok) { gagal++; console.log('  GAGAL ' + nama + (ket ? ' — ' + ket : '')); }
  return ok;
}

var tipe = Q.TIPE.map(function (t) { return t.id; });
var tingkat = Q.TINGKAT.map(function (t) { return t.id; });
var keluarga = Fam.KELUARGA.map(function (k) { return k.id; }).concat(['campur']);

// ------------------------------------------------------- 1. seluruh kombinasi
console.log('1. Semua kombinasi tipe x tingkat x keluarga');
var total = 0, kosong = 0, peringatan = 0, t0 = Date.now();
var bedaSemua = [], sebaranKunci = {};
var perTipe = {};

tipe.forEach(function (tp) {
  perTipe[tp] = { n: 0, gagal: 0, peringatan: 0, waktu: 0 };
  tingkat.forEach(function (tk) {
    keluarga.forEach(function (kl) {
      for (var i = 0; i < N; i++) {
        var benih = 700000 + total * 17 + i;
        var w0 = Date.now();
        var s = Q.buat({ tipe: tp, tingkat: tk, keluarga: kl, benih: benih });
        perTipe[tp].waktu += Date.now() - w0;
        total++;
        if (!s) {
          kosong++; perTipe[tp].gagal++;
          if (kosong < 4) console.log('  kosong: ' + tp + '/' + tk + '/' + kl + ' benih ' + benih);
          continue;
        }
        perTipe[tp].n++;
        if (s.peringatan.length) {
          peringatan++; perTipe[tp].peringatan++;
          if (peringatan < 4) console.log('  peringatan ' + tp + ' benih ' + benih + ': ' + s.peringatan[0]);
        }
        sebaranKunci[s.jawabanHuruf] = (sebaranKunci[s.jawabanHuruf] || 0) + 1;
        s.pilihan.forEach(function (p) { if (p.beda != null) bedaSemua.push(p.beda); });
      }
    });
  });
});
cek('soal selalu jadi', kosong === 0, kosong + ' dari ' + total + ' gagal dibuat');
cek('tanpa peringatan', peringatan === 0, peringatan + ' soal membawa peringatan');
console.log('   ' + total + ' soal dibuat dalam ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
tipe.forEach(function (tp) {
  var p = perTipe[tp];
  console.log('   ' + tp.padEnd(14) + String(p.n).padStart(4) + ' soal, ' +
    (p.waktu / Math.max(1, p.n)).toFixed(0) + ' ms/soal, gagal ' + p.gagal + ', peringatan ' + p.peringatan);
});

// -------------------------------------------------- 2. kunci tunggal (mandiri)
console.log('\n2. Kunci tunggal, diperiksa ulang dari geometri');
var gandaKesesuaian = 0, salahKunci = 0, kembarOpsi = 0, dicek = 0;
tipe.forEach(function (tp) {
  for (var i = 0; i < N * 8; i++) {
    var s = Q.buat({ tipe: tp, tingkat: tingkat[i % 3], keluarga: 'campur', benih: 810000 + i * 13 });
    if (!s) continue;
    dicek++;

    // (a) Tidak ada dua pilihan yang tampak sebagai gambar sama.
    //     Pada `ketidaksamaan` empat opsi memang sengaja saling berputaran —
    //     yang cacat di situ hanyalah dua opsi yang digambar pada sudut sama
    //     persis, sebab keduanya lalu tercetak sebagai gambar identik.
    var seruaRotasi = tp === 'kesesuaian';
    for (var x = 0; x < s.pilihan.length; x++) {
      for (var y = x + 1; y < s.pilihan.length; y++) {
        var sama = seruaRotasi
          ? F.adalahRotasi(s.pilihan[x].fig, s.pilihan[y].fig)
          : F.samaPersis(s.pilihan[x].fig, s.pilihan[y].fig);
        if (sama) { kembarOpsi++; x = 9; break; }
      }
    }

    // (b) untuk kesesuaian: tepat satu pilihan yang merupakan putaran acuan
    if (tp === 'kesesuaian') {
      var sah = [];
      s.pilihan.forEach(function (p, k) {
        if (F.adalahRotasi(p.fig, s.dasar)) sah.push(Q.huruf(k));
      });
      if (sah.length !== 1) gandaKesesuaian++;
      else if (sah[0] !== s.jawabanHuruf) salahKunci++;
    }

    // (c) untuk ketidaksamaan: tepat satu yang tidak sekelompok
    if (tp === 'ketidaksamaan') {
      var sendiri = [];
      s.pilihan.forEach(function (p, k) {
        var n = 0;
        s.pilihan.forEach(function (q, m) { if (m !== k && F.adalahRotasi(p.fig, q.fig)) n++; });
        if (n === 0) sendiri.push(Q.huruf(k));
      });
      if (sendiri.length !== 1) gandaKesesuaian++;
      else if (sendiri[0] !== s.jawabanHuruf) salahKunci++;
    }
  }
});
cek('kunci tunggal', gandaKesesuaian === 0, gandaKesesuaian + ' soal berkunci ganda/nol');
cek('kunci tepat', salahKunci === 0, salahKunci + ' soal kuncinya tercatat salah');
cek('tidak ada opsi kembar', kembarOpsi === 0, kembarOpsi + ' soal punya dua opsi kembar');
console.log('   ' + dicek + ' soal diperiksa ulang: kunci ganda ' + gandaKesesuaian +
  ', kunci salah ' + salahKunci + ', opsi kembar ' + kembarOpsi);

// ----------------------------------------------------- 3. pencerminan = salah
console.log('\n3. Bayangan cermin tidak pernah ikut benar');
var cerminBenar = 0, ujiCermin = 0, pengecohCermin = 0, cerminLolos = 0;
for (var i = 0; i < N * 12; i++) {
  var s = Q.buat({ tipe: 'kesesuaian', tingkat: tingkat[i % 3], keluarga: 'campur', benih: 920000 + i * 7 });
  if (!s) continue;
  ujiCermin++;

  // (a) Bayangan cermin gambar acuan tidak boleh merupakan putaran acuan itu
  //     sendiri — kalau iya, pengecoh cermin ternyata BENAR dan soalnya
  //     berkunci ganda. Inilah gunanya syarat kiral pada penyaring bentuk.
  if (F.adalahRotasi(F.cermin(s.dasar), s.dasar)) cerminBenar++;

  // (b) Setiap pengecoh yang memang dibuat dengan mencerminkan harus benar-benar
  //     dinilai salah oleh geometrinya, bukan hanya oleh catatan pembuatnya.
  s.pilihan.forEach(function (p) {
    if (p.jenis !== 'cermin') return;
    pengecohCermin++;
    if (F.adalahRotasi(p.fig, s.dasar)) cerminLolos++;
  });
}
cek('cermin acuan selalu salah', cerminBenar === 0, cerminBenar + ' bentuk cerminnya ikut benar');
cek('pengecoh cermin dinilai salah', cerminLolos === 0, cerminLolos + ' pengecoh cermin ternyata sah');
console.log('   ' + ujiCermin + ' soal, ' + pengecohCermin + ' pengecoh hasil pencerminan: ' +
  cerminLolos + ' yang keliru dinilai sah');

// ------------------------------------------------------------ 4. beda pengecoh
console.log('\n4. Pengecoh tidak kembar dan tidak mencolok');
bedaSemua.sort(function (a, b) { return a - b; });
if (bedaSemua.length) {
  var q = function (p) { return bedaSemua[Math.floor(p * (bedaSemua.length - 1))]; };
  console.log('   beda pengecoh terhadap kunci (' + bedaSemua.length + ' pengecoh):');
  console.log('   terkecil ' + q(0).toFixed(3) + '   median ' + q(0.5).toFixed(3) +
    '   terbesar ' + q(1).toFixed(3));
  cek('beda di atas ambang', q(0) >= Q.AMBANG.bedaMinSulit - 1e-9,
    'ada pengecoh berbeda hanya ' + q(0).toFixed(4));
  cek('beda di bawah batas atas', q(1) <= Q.AMBANG.bedaMaks + 1e-9,
    'ada pengecoh berbeda sampai ' + q(1).toFixed(4));
}

// ------------------------------------------------------- 5. sebaran kunci A-E
console.log('\n5. Sebaran huruf kunci');
var hurufSemua = ['A', 'B', 'C', 'D', 'E'];
// Pembaginya jumlah soal yang BENAR-BENAR jadi, bukan jumlah percobaan:
// memakai `total` membuat sebaran tampak melenceng padahal hanya kekurangan
// soal yang gagal dibuat.
var jadi = hurufSemua.reduce(function (n, h) { return n + (sebaranKunci[h] || 0); }, 0);
var harap = jadi / 5, timpang = 0;
console.log('   ' + hurufSemua.map(function (h) {
  var n = sebaranKunci[h] || 0;
  if (Math.abs(n - harap) / harap > 0.25) timpang++;
  return h + ':' + n;
}).join('  '));
cek('sebaran kunci merata', timpang === 0, timpang + ' huruf melenceng lebih dari 25%');

// --------------------------------------------------------- 6. tidak ada kembar
console.log('\n6. Soal berbeda benih tidak menghasilkan soal kembar');
var lihat = {}, kembarSoal = 0, dibuat = 0;
for (i = 0; i < N * 10; i++) {
  var s2 = Q.buat({ tipe: 'kesesuaian', tingkat: 'sedang', keluarga: 'campur', benih: 330000 + i });
  if (!s2) continue;
  dibuat++;
  var sd = Q.sidik(s2);
  if (lihat[sd]) kembarSoal++;
  lihat[sd] = 1;
}
cek('tanpa soal kembar', kembarSoal === 0, kembarSoal + ' dari ' + dibuat + ' soal kembar');
console.log('   ' + dibuat + ' soal, ' + kembarSoal + ' kembar');

// ------------------------------------------- 7. hubungan analogi benar-benar sama
console.log('\n7. Analogi: hubungan A->B sama persis dengan hubungan C->kunci');
var analogiSalah = 0, analogiCek = 0, analogiTakSesuaiTeks = 0;
for (i = 0; i < N * 8; i++) {
  var sa = Q.buat({ tipe: 'analogi', tingkat: tingkat[i % 3], keluarga: 'campur', benih: 450000 + i * 11 });
  if (!sa) continue;
  analogiCek++;
  var A = sa.soalGambar[0].fig, B = sa.soalGambar[1].fig, C = sa.soalGambar[2].fig;
  var D = sa.pilihan[sa.jawabanIndex].fig;

  // Diukur dari gambarnya sendiri: pada hubungan berpencerminan, B adalah
  // putaran dari cermin A; pada hubungan putaran murni, B putaran dari A.
  var pakaiCermin = sa.hubungan.jenis === 'cerminPutar';
  var sudutAB = F.sudutPutarKe(pakaiCermin ? F.pusatkan(F.cermin(A)) : A, B);
  var sudutCD = F.sudutPutarKe(pakaiCermin ? F.pusatkan(F.cermin(C)) : C, D);

  if (sudutAB === null || sudutCD === null ||
      Math.abs(F.norm360(sudutAB - sudutCD)) > 1e-3) {
    analogiSalah++;
    if (analogiSalah < 4) {
      console.log('  benih ' + (450000 + i * 11) + ': A->B ' + sudutAB + ', C->kunci ' + sudutCD);
    }
  }
  // Sudut yang diukur harus pula sama dengan yang ditulis di pembahasan.
  if (sudutAB !== null && Math.abs(F.norm360(sudutAB - sa.hubungan.sudut)) > 1e-3) analogiTakSesuaiTeks++;
}
cek('hubungan analogi konsisten', analogiSalah === 0, analogiSalah + ' dari ' + analogiCek + ' tidak sama');
cek('sudut analogi sesuai pembahasan', analogiTakSesuaiTeks === 0,
  analogiTakSesuaiTeks + ' sudut berbeda dari yang ditulis');
console.log('   ' + analogiCek + ' soal analogi: hubungan dan sudutnya cocok seluruhnya');

// --------------------------------------------- 8. langkah deret serial tetap
console.log('\n8. Serial: setiap kotak berjarak satu langkah putaran yang sama');
var serialSalah = 0, serialCek = 0;

/** Bentuk tanpa titik penanda — bagian yang hanya berputar, tidak bertambah. */
function tanpaPenanda(fig) {
  return F.pusatkan({
    unsur: fig.unsur.filter(function (u) { return u.nama !== 'titik penanda'; })
  });
}

for (i = 0; i < N * 8; i++) {
  var ss = Q.buat({ tipe: 'serial', tingkat: tingkat[i % 3], keluarga: 'campur', benih: 560000 + i * 11 });
  if (!ss) continue;
  serialCek++;
  var kotak = ss.soalGambar.map(function (g) { return tanpaPenanda(g.fig); });
  kotak.push(tanpaPenanda(ss.pilihan[ss.jawabanIndex].fig));
  var bedaLangkah = 0;
  for (var t = 1; t < kotak.length; t++) {
    var d = F.sudutPutarKe(kotak[t - 1], kotak[t]);
    if (d === null || Math.abs(F.norm360(d - ss.pola.delta)) > 1e-3) bedaLangkah++;
  }
  if (bedaLangkah) {
    serialSalah++;
    if (serialSalah < 4) {
      console.log('  benih ' + (560000 + i * 11) + ': ' + bedaLangkah +
        ' langkah menyimpang dari delta ' + ss.pola.delta);
    }
  }
}
cek('langkah serial tetap', serialSalah === 0, serialSalah + ' dari ' + serialCek + ' menyimpang');
console.log('   ' + serialCek + ' soal serial: keempat langkahnya sebesar delta yang tercatat');

// -------------------------------- 9. tiap pengecoh menyebut alasan sendiri
console.log('\n9. Tidak ada dua opsi yang alasannya sama');
var alasanKembar = 0, alasanKosong = 0, alasanCek = 0;
tipe.forEach(function (tp) {
  for (var i = 0; i < N * 4; i++) {
    var sx = Q.buat({ tipe: tp, tingkat: tingkat[i % 3], keluarga: 'campur', benih: 640000 + i * 19 });
    if (!sx) continue;
    alasanCek++;
    var lihat = {};
    sx.pilihan.forEach(function (p) {
      if (!p.alasan) { alasanKosong++; return; }
      if (lihat[p.alasan]) alasanKembar++;
      lihat[p.alasan] = 1;
    });
  }
});
cek('alasan tidak kembar', alasanKembar === 0, alasanKembar + ' pasang opsi beralasan sama');
cek('alasan selalu ada', alasanKosong === 0, alasanKosong + ' opsi tanpa alasan');
console.log('   ' + alasanCek + ' soal: setiap opsi menyebut satu beda yang khas');

// ---------------------- 10. kelima opsi memakai potongan yang sama persis
console.log('\n10. Tingkat SULIT: kelima opsi berprofil sama');
var profilBeda = 0, profilCek = 0, opsiCek = 0;
['kesesuaian', 'ketidaksamaan'].forEach(function (tp) {
  for (var i = 0; i < N * 8; i++) {
    var sp = Q.buat({ tipe: tp, tingkat: 'sulit', keluarga: 'campur', benih: 150000 + i * 23 });
    if (!sp) continue;
    profilCek++;
    // Acuannya gambar soal untuk kesesuaian, atau salah satu gambar "yang sama"
    // untuk ketidaksamaan.
    var acuan = tp === 'kesesuaian'
      ? sp.dasar
      : sp.pilihan[sp.jawabanIndex === 0 ? 1 : 0].fig;
    sp.pilihan.forEach(function (p, k) {
      opsiCek++;
      if (Q.profilCocok(p.fig, acuan)) return;
      profilBeda++;
      if (profilBeda < 4) {
        console.log('  ' + tp + ' benih ' + sp.benih + ' opsi ' + Q.huruf(k) +
          ': unsur ' + p.fig.unsur.length + ' vs ' + acuan.unsur.length +
          ', jangkauan ' + F.jangkauan(p.fig).toFixed(1) + ' vs ' + F.jangkauan(acuan).toFixed(1));
      }
    });
  }
});
cek('profil kelima opsi sama', profilBeda === 0,
  profilBeda + ' opsi berbeda jumlah/ukuran unsurnya — bisa dicoret tanpa memutar');
console.log('   ' + profilCek + ' soal sulit, ' + opsiCek +
  ' opsi: semuanya memakai potongan yang sama persis dengan acuannya');

// Sebaliknya, tingkat mudah MEMANG harus memakai pengecoh yang mudah dicoret;
// kalau tidak, ketiga tingkat kesulitan menghasilkan soal yang sama saja.
var mudahLonggar = 0, mudahCek = 0;
for (i = 0; i < N * 8; i++) {
  var sm = Q.buat({ tipe: 'kesesuaian', tingkat: 'mudah', keluarga: 'campur', benih: 170000 + i * 23 });
  if (!sm) continue;
  mudahCek++;
  var adaLonggar = sm.pilihan.some(function (p) {
    return !p.benar && !Q.profilCocok(p.fig, sm.dasar);
  });
  if (adaLonggar) mudahLonggar++;
}
cek('tingkat mudah memang lebih longgar', mudahLonggar > mudahCek * 0.5,
  'hanya ' + mudahLonggar + ' dari ' + mudahCek + ' soal mudah yang punya pengecoh mencolok');
console.log('   ' + mudahLonggar + ' dari ' + mudahCek +
  ' soal mudah punya minimal satu pengecoh yang bisa dicoret sekilas');

console.log('\n' + (gagal ? gagal + ' PEMERIKSAAN GAGAL' : 'Semua pemeriksaan lulus.'));
process.exit(gagal ? 1 : 0);
