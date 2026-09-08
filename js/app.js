/*
 * app.js — perekat antarmuka: pemilih submateri, pemilih keluarga bentuk,
 * pratinjau bentuk, lembar soal, bank soal, dan tombol unduh.
 *
 * Semua penyusunan gambar dikerjakan `sheet.js`, semua penjaminan kebenaran
 * oleh `quiz.js`. Berkas ini hanya menghubungkan keduanya dengan tombol.
 */
(function () {
  'use strict';

  var SIMPAN = 'generator-figural-v1';
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    tipe: 'kesesuaian',
    keluarga: 'campur',
    tingkat: 'sedang',
    benih: 1001,
    bentuk: null,
    soal: null,
    bank: []
  };

  // ---------------------------------------------------------------- simpanan

  function simpan() {
    try {
      localStorage.setItem(SIMPAN, JSON.stringify({
        tipe: state.tipe, keluarga: state.keluarga, tingkat: state.tingkat,
        benih: state.benih, tampilKunci: $('tampil-kunci').checked,
        jumlah: $('batch-jumlah').value,
        batchTipe: $('batch-tipe').value,
        batchKeluarga: $('batch-keluarga').value,
        batchTingkat: $('batch-tingkat').value
      }));
    } catch (e) { /* mode penyamaran: abaikan */ }
  }

  function muat() {
    try {
      var d = JSON.parse(localStorage.getItem(SIMPAN) || '{}');
      if (d.tipe) state.tipe = d.tipe;
      if (d.keluarga) state.keluarga = d.keluarga;
      if (d.tingkat) state.tingkat = d.tingkat;
      if (d.benih != null) state.benih = d.benih;
      if (d.tampilKunci) $('tampil-kunci').checked = true;
      if (d.jumlah) $('batch-jumlah').value = d.jumlah;
      if (d.batchTipe) $('batch-tipe').value = d.batchTipe;
      if (d.batchKeluarga) $('batch-keluarga').value = d.batchKeluarga;
      if (d.batchTingkat) $('batch-tingkat').value = d.batchTingkat;
    } catch (e) { /* abaikan simpanan yang rusak */ }
  }

  // ------------------------------------------------------------- pemilih

  function bangunPemilih() {
    var tp = $('tipe-picker');
    tp.innerHTML = '';
    Quiz.TIPE.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost' + (t.id === state.tipe ? ' active' : '');
      b.textContent = t.nama;
      b.dataset.id = t.id;
      b.addEventListener('click', function () {
        state.tipe = t.id;
        bangunPemilih();
        tampilPerintah();
        buatSoal();
        simpan();
      });
      tp.appendChild(b);
    });

    var kp = $('keluarga-picker');
    kp.innerHTML = '';
    var daftar = Families.KELUARGA.concat([{ id: 'campur', nama: 'Campur' }]);
    daftar.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost' + (k.id === state.keluarga ? ' active' : '');
      b.textContent = k.nama;
      b.dataset.id = k.id;
      b.addEventListener('click', function () {
        state.keluarga = k.id;
        bangunPemilih();
        segarkanBentuk();
        buatSoal();
        simpan();
      });
      kp.appendChild(b);
    });
  }

  function tampilPerintah() {
    $('tipe-perintah').textContent = Quiz.PERINTAH[state.tipe] || '';
  }

  // -------------------------------------------------------- pratinjau bentuk

  function segarkanBentuk() {
    state.bentuk = Families.bangkitkan(state.keluarga, state.benih);
    gambarBentuk();
  }

  function gambarBentuk() {
    var f = state.bentuk;
    if (!f) return;
    var k = Render.kotak(f, 190, { tebal: 2 });
    $('bentuk-view').innerHTML = Render.doc(k.svg, 190, 190, { background: '#ffffff' });

    // daftar unsur, masing-masing digambar sendiri pada skala bentuk induknya
    var skala = Render.skalaBersama([f], 22, 0.06);
    var list = $('unsur-list');
    list.innerHTML = '';
    f.unsur.forEach(function (u, i) {
      var mini = Render.kotak({ unsur: [u] }, 22, { skala: skala, tebal: 0.9, bingkai: false });
      var row = document.createElement('div');
      row.className = 'unsur-row';
      row.innerHTML = '<span class="mini">' + Render.doc(mini.svg, 22, 22, { background: '#fff' }) + '</span>' +
        '<span><b>' + Render.esc(Quiz.namaUnsur(f, i)) + '</b></span>' +
        '<span>' + (u.jenis === 'bulat' ? 'lingkaran' : u.titik.length + ' titik') +
        (u.isi ? ', terisi' : '') + '</span>';
      list.appendChild(row);
    });
    $('unsur-count').textContent = f.unsur.length;

    ukurBentuk(f);
  }

  /** Tampilkan ukuran yang dipakai penyaring, supaya bisa ditelusuri sendiri. */
  function ukurBentuk(f) {
    var jang = Figure.jangkauan(f);
    var kotak = Figure.kotak(f);
    var baris = [
      ['Keluarga', Families.KELUARGA.filter(function (k) { return k.id === f.keluarga; })
        .map(function (k) { return k.nama; })[0] || f.keluarga, null],
      ['Percobaan sampai lolos', f.coba, null],
      ['Orde simetri putar', Figure.ordeSimetri(f), Figure.ordeSimetri(f) === 1],
      ['Kiral (cermin berbeda)', Figure.kiral(f) ? 'ya' : 'tidak', Figure.kiral(f)],
      ['Ruas terpendek : jangkauan', (Figure.ruasTerpendek(f) / jang).toFixed(2),
        Figure.ruasTerpendek(f) / jang >= Families.AMBANG.ruas],
      ['Kotak pembatas (pipih)',
        (Math.min(kotak.w, kotak.h) / Math.max(kotak.w, kotak.h)).toFixed(2),
        Math.min(kotak.w, kotak.h) / Math.max(kotak.w, kotak.h) >= Families.AMBANG.pipih],
      ['Beda terhadap cerminnya', Figure.bedaBentuk(Figure.cermin(f), f).toFixed(3),
        Figure.bedaBentuk(Figure.cermin(f), f) >= Families.AMBANG.bedaCermin]
    ];
    var dl = $('ukur');
    dl.innerHTML = '';
    baris.forEach(function (r) {
      var dt = document.createElement('dt');
      dt.textContent = r[0];
      var dd = document.createElement('dd');
      dd.textContent = r[1];
      if (r[2] === true) dd.className = 'ok';
      if (r[2] === false) dd.className = 'bad';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    var alasan = Families.periksa(f);
    var st = $('bentuk-status');
    st.textContent = alasan.length
      ? 'Bentuk ini tidak lolos penyaring: ' + alasan.join('; ')
      : 'Bentuk lolos seluruh syarat penyaring.';
    st.style.color = alasan.length ? 'var(--bad)' : 'var(--muted)';
  }

  // ------------------------------------------------------------------- soal

  function buatSoal() {
    state.tingkat = $('tingkat').value;
    var s = Quiz.buat({
      tipe: state.tipe, keluarga: state.keluarga,
      tingkat: state.tingkat, benih: state.benih
    });
    state.soal = s;

    if (!s) {
      $('lembar').innerHTML = '';
      $('peringatan').innerHTML = '<p class="note">Soal gagal disusun untuk bentuk ini. ' +
        'Tekan <b>Acak bentuk</b> untuk mencoba bentuk lain.</p>';
      $('jawab').hidden = true;
      $('bahas').hidden = true;
      $('soal-aksi').hidden = true;
      return;
    }

    // Bentuk dasar soal bisa berbeda dari pratinjau bila `Quiz.buat` sempat
    // mengulang dengan benih berikutnya; pratinjau disamakan agar tidak
    // menampilkan bentuk yang tidak dipakai soalnya.
    state.bentuk = s.dasar;
    state.bentuk.coba = state.bentuk.coba || 1;
    gambarBentuk();

    gambarLembar();
    tampilPeringatan(s);
    siapkanJawab(s);
    tampilPembahasan(s);
    $('soal-aksi').hidden = false;
  }

  function gambarLembar() {
    var s = state.soal;
    if (!s) return;
    $('lembar').innerHTML = Sheet.lembar(s, {
      tampilKunci: $('tampil-kunci').checked,
      sisi: 116, lebar: 560
    });
  }

  function tampilPeringatan(s) {
    var kotak = $('peringatan');
    if (!s.peringatan.length) { kotak.innerHTML = ''; return; }
    kotak.innerHTML = '<p class="note"><b>Periksa soal ini:</b> ' +
      s.peringatan.map(Render.esc).join(' ') + '</p>';
  }

  function siapkanJawab(s) {
    var wadah = $('tombol-jawab');
    wadah.innerHTML = '';
    $('umpan').textContent = '';
    $('umpan').className = 'feedback';
    $('ungkap').textContent = '';
    s.pilihan.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost opt-btn';
      b.textContent = Quiz.huruf(i);
      b.addEventListener('click', function () { jawab(i, b); });
      wadah.appendChild(b);
    });
    $('jawab').hidden = false;
  }

  function jawab(i, tombol) {
    var s = state.soal;
    var benar = i === s.jawabanIndex;
    tombol.classList.add(benar ? 'right' : 'wrong');
    $('umpan').textContent = benar ? 'Benar.' : 'Belum tepat.';
    $('umpan').className = 'feedback ' + (benar ? 'ok' : 'bad');
    $('ungkap').textContent = benar
      ? 'Opsi ' + s.jawabanHuruf + ': ' + s.pilihan[s.jawabanIndex].alasan
      : 'Opsi ' + Quiz.huruf(i) + ' salah karena ' + s.pilihan[i].alasan;
  }

  function tampilPembahasan(s) {
    var ol = $('bahas-isi');
    ol.innerHTML = '';
    s.pembahasan.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ol.appendChild(li);
    });
    $('bahas').hidden = false;
  }

  // -------------------------------------------------------------- bank soal

  /** Ubah satu soal menjadi butir bank berikut seluruh gambarnya. */
  function keButirBank(s) {
    var tipe = Quiz.TIPE.filter(function (t) { return t.id === s.tipe; })[0];
    var tingkat = Quiz.TINGKAT.filter(function (t) { return t.id === s.tingkat; })[0];
    return {
      soal: s,
      lembarSvg: Sheet.lembar(s, { tampilKunci: false, sisi: 108, lebar: 520 }),
      soalSvg: Sheet.gambarSoal(s, { sisi: 150 }),
      pilihanSvg: Sheet.gambarPilihan(s, { sisi: 150 }),
      pembahasanSvg: Sheet.gambarPembahasan(s, { sisi: 170 }),
      huruf: s.jawabanHuruf,
      tipe: tipe ? tipe.label : s.tipe,
      tingkat: tingkat ? tingkat.nama : '',
      keluarga: s.keluarga,
      benih: s.benih,
      pembahasan: s.pembahasan,
      sidik: Quiz.sidik(s)
    };
  }

  function tambahKeBank(s, diam) {
    s = s || state.soal;
    if (!s) return;
    state.bank.push(keButirBank(s));
    if (!diam) gambarBank();
  }

  function gambarBank() {
    var wadah = $('bank');
    wadah.innerHTML = '';
    state.bank.forEach(function (b, i) {
      var el = document.createElement('div');
      el.className = 'bank-item';
      el.innerHTML = '<div>' + b.lembarSvg + '</div>' +
        '<div class="bank-meta">No. ' + (i + 1) +
        '<br><span class="bank-tipe">' + Render.esc(b.tipe) + '</span>' +
        '<br>' + Render.esc(b.tingkat) +
        '<br>benih ' + b.benih +
        '<br><span class="bank-key">Kunci: ' + b.huruf + '</span></div>';
      wadah.appendChild(el);
    });
    $('bank-count').textContent = state.bank.length;
  }

  function statusBatch(teks, buruk) {
    var el = $('batch-status');
    el.textContent = teks;
    el.className = 'status-line' + (buruk ? ' error' : '');
  }

  function jeda() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /**
   * Buat sepaket soal.
   *
   * Setiap nomor memakai benih sendiri, dan soal yang sidiknya sudah pernah
   * muncul dibuat ulang dengan benih berikutnya (paling banyak 12 kali).
   * Sidiknya mencakup gambar soal DAN kumpulan pilihannya yang diurutkan,
   * jadi dua soal yang isinya sama dan hanya berbeda urutan huruf tetap
   * dikenali kembar.
   */
  async function buatBatch() {
    var jumlah = Math.max(1, Math.min(200, parseInt($('batch-jumlah').value, 10) || 10));
    var pilihTipe = $('batch-tipe').value;
    var pilihKel = $('batch-keluarga').value;
    var pilihTingkat = $('batch-tingkat').value;
    var semuaTipe = Quiz.TIPE.map(function (t) { return t.id; });
    var semuaTingkat = Quiz.TINGKAT.map(function (t) { return t.id; });

    var bar = $('batch-progress');
    bar.hidden = false; bar.max = jumlah; bar.value = 0;
    $('btn-batch').disabled = true;

    var sudah = {};
    state.bank.forEach(function (b) { sudah[b.sidik] = 1; });

    var benih = (state.benih >>> 0) || 1;
    var dibuat = 0, ulang = 0, gagal = 0;

    try {
      for (var i = 0; i < jumlah; i++) {
        var tipe = pilihTipe === 'campur' ? semuaTipe[i % semuaTipe.length] : state.tipe;
        var kel = pilihKel === 'campur' ? 'campur' : state.keluarga;
        var tingkat = pilihTingkat === 'campur'
          ? semuaTingkat[i % semuaTingkat.length] : $('tingkat').value;

        var s = null;
        for (var c = 0; c < 12; c++) {
          benih = (benih + 0x9e3779b1) >>> 0;
          var calon = Quiz.buat({ tipe: tipe, keluarga: kel, tingkat: tingkat, benih: benih });
          if (!calon) continue;
          if (sudah[Quiz.sidik(calon)]) { ulang++; continue; }
          s = calon;
          break;
        }
        if (!s) { gagal++; continue; }

        sudah[Quiz.sidik(s)] = 1;
        tambahKeBank(s, true);
        dibuat++;
        bar.value = i + 1;
        statusBatch('Menyusun soal ' + (i + 1) + '/' + jumlah + '…');
        if (i % 4 === 3) await jeda();
      }
      gambarBank();
      var pesan = dibuat + ' soal ditambahkan (bank kini ' + state.bank.length + ' soal).';
      if (ulang) pesan += ' ' + ulang + ' soal kembar dibuat ulang.';
      if (gagal) pesan += ' ' + gagal + ' nomor gagal disusun.';
      statusBatch(pesan, gagal > 0);
    } catch (e) {
      statusBatch('Gagal membuat paket: ' + e.message, true);
    } finally {
      bar.hidden = true;
      $('btn-batch').disabled = false;
    }
  }

  // ---------------------------------------------------------------- ekspor

  function namaBerkas(ext) {
    return 'soal-figural-' + state.bank.length + 'soal.' + ext;
  }

  /** Susun daftar soal untuk pdf.js / docx.js beserta gambar pikselnya. */
  async function siapkanEkspor(kePng) {
    var bar = $('batch-progress');
    bar.hidden = false; bar.max = state.bank.length; bar.value = 0;
    var ubah = kePng ? Raster.svgKePngBytes : Raster.svgKePiksel;
    var out = [];
    for (var i = 0; i < state.bank.length; i++) {
      var b = state.bank[i];
      var butir = {
        no: i + 1,
        tipe: b.tipe,
        tingkat: b.tingkat,
        jawaban: b.huruf,
        pembahasan: b.pembahasan,
        gambarSoal: await ubah(b.soalSvg, 2),
        gambarPilihan: await ubah(b.pilihanSvg, 2),
        gambarPembahasan: b.pembahasanSvg ? await ubah(b.pembahasanSvg, 2) : null
      };
      // Ukuran huruf disamakan dengan yang dipilih PDF supaya berkas Word dan
      // PDF dari bank yang sama terbaca serupa.
      if (kePng) {
        butir.ptTeks = Pdf.ukuranPembahasan({ jawaban: b.huruf, pembahasan: b.pembahasan }, 774);
      }
      out.push(butir);
      bar.value = i + 1;
      statusBatch('Menyiapkan halaman ' + (i + 1) + '/' + state.bank.length + '…');
      if (i % 3 === 2) await jeda();
    }
    return out;
  }

  async function unduhPDF() {
    if (!state.bank.length) { statusBatch('Bank soal masih kosong — tekan Generate dulu.', true); return; }
    $('btn-pdf').disabled = true;
    try {
      var soal = await siapkanEkspor(false);
      statusBatch('Memampatkan PDF…');
      var blob = await Pdf.buat(soal, {});
      Raster.unduhBlob(blob, namaBerkas('pdf'));
      statusBatch('PDF siap: ' + (state.bank.length * 4) + ' halaman dari ' + state.bank.length +
        ' soal (' + (blob.size / 1048576).toFixed(1) + ' MB).');
    } catch (e) {
      statusBatch('Ekspor PDF gagal: ' + e.message, true);
    } finally {
      $('batch-progress').hidden = true;
      $('btn-pdf').disabled = false;
    }
  }

  async function unduhDOCX() {
    if (!state.bank.length) { statusBatch('Bank soal masih kosong — tekan Generate dulu.', true); return; }
    $('btn-docx').disabled = true;
    try {
      var soal = await siapkanEkspor(true);
      statusBatch('Memampatkan berkas Word…');
      var blob = await Docx.buat(soal, {});
      Raster.unduhBlob(blob, namaBerkas('docx'));
      statusBatch('Word siap: ' + (state.bank.length * 4) + ' halaman dari ' + state.bank.length +
        ' soal (' + (blob.size / 1048576).toFixed(1) + ' MB).');
    } catch (e) {
      statusBatch('Ekspor Word gagal: ' + e.message, true);
    } finally {
      $('batch-progress').hidden = true;
      $('btn-docx').disabled = false;
    }
  }

  /** Cetak bank soal sebagai lembar A4 biasa, kunci jawaban di halaman terakhir. */
  function cetak() {
    if (!state.bank.length) { statusBatch('Bank soal masih kosong.', true); return; }
    var bagian = state.bank.map(function (b, i) {
      return '<div class="print-q"><p><b>' + (i + 1) + '.</b> ' +
        Render.esc(b.soal.perintah) + '</p>' + b.lembarSvg + '</div>';
    });
    bagian.push('<div class="print-key"><h2>Kunci jawaban</h2><table>' +
      state.bank.map(function (b, i) {
        return '<tr><td>' + (i + 1) + '. <b>' + b.huruf + '</b></td><td>' +
          Render.esc(b.tipe) + '</td></tr>';
      }).join('') + '</table></div>');
    $('print-area').innerHTML = bagian.join('');
    window.print();
  }

  function unduhPNG() {
    if (!state.soal) return;
    var svg = Sheet.lembar(state.soal, { tampilKunci: $('tampil-kunci').checked, sisi: 150 });
    Raster.svgKePngBytes(svg, 2).then(function (g) {
      Raster.unduhBlob(new Blob([g.data], { type: 'image/png' }),
        'soal-figural-' + state.soal.benih + '.png');
    }).catch(function () {
      Raster.unduhBlob(new Blob([svg], { type: 'image/svg+xml' }),
        'soal-figural-' + state.soal.benih + '.svg');
    });
  }

  function unduhSVG() {
    if (!state.soal) return;
    var svg = Sheet.lembar(state.soal, { tampilKunci: $('tampil-kunci').checked, sisi: 150 });
    Raster.unduhBlob(new Blob([svg], { type: 'image/svg+xml' }),
      'soal-figural-' + state.soal.benih + '.svg');
  }

  // ------------------------------------------------------------------- awal

  function init() {
    muat();
    $('tingkat').value = state.tingkat;
    $('benih').value = state.benih;

    bangunPemilih();
    tampilPerintah();
    segarkanBentuk();
    buatSoal();
    gambarBank();

    $('btn-help').addEventListener('click', function () {
      $('help').hidden = !$('help').hidden;
    });
    $('tingkat').addEventListener('change', function () {
      state.tingkat = $('tingkat').value;
      buatSoal();
      simpan();
    });
    $('benih').addEventListener('change', function () {
      state.benih = (parseInt($('benih').value, 10) || 0) >>> 0;
      segarkanBentuk();
      buatSoal();
      simpan();
    });
    $('btn-acak-bentuk').addEventListener('click', function () {
      state.benih = Rng.benihBaru();
      $('benih').value = state.benih;
      segarkanBentuk();
      buatSoal();
      simpan();
    });
    $('btn-buat').addEventListener('click', function () { buatSoal(); });
    $('btn-soal-baru').addEventListener('click', function () {
      state.benih = Rng.benihBaru();
      $('benih').value = state.benih;
      segarkanBentuk();
      buatSoal();
      simpan();
    });
    $('tampil-kunci').addEventListener('change', function () {
      gambarLembar();
      simpan();
    });
    $('btn-tambah').addEventListener('click', function () { tambahKeBank(); });
    $('btn-batch').addEventListener('click', buatBatch);
    $('btn-pdf').addEventListener('click', unduhPDF);
    $('btn-docx').addEventListener('click', unduhDOCX);
    $('btn-cetak').addEventListener('click', cetak);
    $('btn-png').addEventListener('click', unduhPNG);
    $('btn-svg').addEventListener('click', unduhSVG);
    $('btn-kosongkan').addEventListener('click', function () {
      state.bank = [];
      gambarBank();
      statusBatch('Bank soal dikosongkan.');
    });
    ['batch-jumlah', 'batch-tipe', 'batch-keluarga', 'batch-tingkat'].forEach(function (id) {
      $(id).addEventListener('change', simpan);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
