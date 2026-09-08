/*
 * docx.js — penyusun berkas Word (.docx) tanpa pustaka luar.
 *
 * Sebuah .docx adalah arsip ZIP berisi XML. Karena itu berkasnya disusun dua
 * lapis: penulis ZIP di bawah (header lokal, direktori pusat, EOCD, CRC-32),
 * dan penyusun WordprocessingML di atasnya.
 *
 * Susunannya sengaja MENGIKUTI PDF: halaman 28800 x 16200 twip (20 x 11,25 inci,
 * 16:9 — persis 1440 x 810 pt milik PDF) dan empat halaman per soal. Dengan
 * begitu berkas Word dan PDF dari bank soal yang sama terbaca serupa.
 *
 * Judulnya memakai GAYA JUDUL sungguhan (Heading 1/2/3), bukan sekadar teks
 * tebal, sehingga Google Docs dan Word menampilkan daftar isi/kerangka dokumen:
 *   No. N        -> Heading 1
 *   Jawaban: X   -> Heading 2
 *   Pembahasan:  -> Heading 3
 *
 * Berbeda dari PDF yang teksnya harus Latin-1, Word menyimpan teks sebagai UTF-8
 * sehingga panah "->" dan tanda kali tetap tertulis sebagaimana adanya.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Docx = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var enc = new TextEncoder();

  // Satuan Word: twip (1/1440 inci) untuk halaman, EMU (1/914400 inci) untuk gambar.
  // Ukuran halaman disamakan dengan PDF: 1440 x 810 pt = 28800 x 16200 twip.
  var HAL_LEBAR = 28800, HAL_TINGGI = 16200;
  var TEPI_X = 1620, TEPI_Y = 1080;              // 81 pt dan 54 pt, seperti PDF
  var TWIP_KE_EMU = 635;
  var ISI_LEBAR_TWIP = HAL_LEBAR - TEPI_X * 2;
  var ISI_TINGGI_TWIP = HAL_TINGGI - TEPI_Y * 2;
  var ISI_LEBAR = ISI_LEBAR_TWIP * TWIP_KE_EMU;
  var ISI_TINGGI = ISI_TINGGI_TWIP * TWIP_KE_EMU;

  // Halaman pembahasan dibagi dua seperti PDF: gambar di kiri, uraian di kanan.
  var KOL_GAMBAR = 10080, KOL_TEKS = ISI_LEBAR_TWIP - KOL_GAMBAR;

  var WARNA_TINGKAT = { Mudah: '2E7D32', Sedang: 'B36B00', Sulit: 'B32620' };

  // ---------------------------------------------------------------- ZIP

  var TABEL_CRC = null;
  function crc32(u8) {
    if (!TABEL_CRC) {
      TABEL_CRC = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        TABEL_CRC[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = TABEL_CRC[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Deflate mentah (metode ZIP 8) lewat CompressionStream bawaan peramban.
   * Kalau tidak tersedia, isinya disimpan apa adanya (metode 0) — berkasnya
   * tetap sah, hanya lebih besar. Gambar PNG sudah termampat sehingga
   * selisihnya kecil.
   */
  function kempis(u8) {
    if (typeof CompressionStream !== 'function') return Promise.resolve(null);
    try {
      var aliran = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Response(aliran).arrayBuffer()
        .then(function (buf) { return new Uint8Array(buf); })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  function penulisBiner() {
    var bagian = [], panjang = 0;
    function dorong(u8) { bagian.push(u8); panjang += u8.length; }
    return {
      get panjang() { return panjang; },
      u16: function (v) { dorong(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF])); },
      u32: function (v) {
        dorong(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]));
      },
      data: dorong,
      gabung: function () { return bagian; }
    };
  }

  /**
   * Susun arsip ZIP dari daftar { nama, data:Uint8Array }.
   * Waktu berkas dipatok tetap supaya keluaran dapat diulang persis.
   */
  function zip(berkas) {
    var WAKTU = 0, TANGGAL = ((2024 - 1980) << 9) | (1 << 5) | 1;   // 1 Januari 2024
    return Promise.all(berkas.map(function (f) {
      return kempis(f.data).then(function (padat) {
        var pakai = padat && padat.length < f.data.length;
        return {
          nama: enc.encode(f.nama),
          mentah: f.data,
          isi: pakai ? padat : f.data,
          metode: pakai ? 8 : 0,
          crc: crc32(f.data)
        };
      });
    })).then(function (entri) {
      var w = penulisBiner();

      entri.forEach(function (e) {
        e.offset = w.panjang;
        w.u32(0x04034B50);
        w.u16(20);            // versi minimum
        w.u16(0x0800);        // nama berkas UTF-8
        w.u16(e.metode);
        w.u16(WAKTU); w.u16(TANGGAL);
        w.u32(e.crc);
        w.u32(e.isi.length);
        w.u32(e.mentah.length);
        w.u16(e.nama.length);
        w.u16(0);
        w.data(e.nama);
        w.data(e.isi);
      });

      var awalPusat = w.panjang;
      entri.forEach(function (e) {
        w.u32(0x02014B50);
        w.u16(20); w.u16(20);
        w.u16(0x0800);
        w.u16(e.metode);
        w.u16(WAKTU); w.u16(TANGGAL);
        w.u32(e.crc);
        w.u32(e.isi.length);
        w.u32(e.mentah.length);
        w.u16(e.nama.length);
        w.u16(0); w.u16(0); w.u16(0);
        w.u16(0); w.u32(0);
        w.u32(e.offset);
        w.data(e.nama);
      });
      var ukuranPusat = w.panjang - awalPusat;

      w.u32(0x06054B50);
      w.u16(0); w.u16(0);
      w.u16(entri.length); w.u16(entri.length);
      w.u32(ukuranPusat); w.u32(awalPusat);
      w.u16(0);

      return new Blob(w.gabung(), {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    });
  }

  // ---------------------------------------------------------------- WordprocessingML

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Ukuran piksel sebuah PNG: petak IHDR menyimpan lebar pada byte 16-19 dan
   * tinggi pada byte 20-23 (setelah tanda tangan 8 byte dan kepala petak 8 byte).
   */
  function ukuranPng(u8) {
    var v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    return { lebar: v.getUint32(16), tinggi: v.getUint32(20) };
  }

  /** Skalakan gambar agar muat dalam kotak yang tersedia, nisbahnya terjaga. */
  function pasGambar(lebarPx, tinggiPx, maksLebar, maksTinggi) {
    var k = Math.min(maksLebar / lebarPx, maksTinggi / tinggiPx);
    return { cx: Math.round(lebarPx * k), cy: Math.round(tinggiPx * k) };
  }

  function rPr(o) {
    return '<w:rPr>' +
      (o.tebal ? '<w:b/><w:bCs/>' : '') +
      (o.warna ? '<w:color w:val="' + o.warna + '"/>' : '') +
      (o.ukuran ? '<w:sz w:val="' + Math.round(o.ukuran * 2) + '"/>' +
                  '<w:szCs w:val="' + Math.round(o.ukuran * 2) + '"/>' : '') +
      '</w:rPr>';
  }

  /**
   * @param teks isi paragraf
   * @param o    { gaya (Heading1/2/3), ukuran (pt), tebal, warna (RRGGBB),
   *               rata, jarakSebelum, jarakSesudah (twip) }
   */
  function paragraf(teks, o) {
    o = o || {};
    var pPr = '<w:pPr>' +
      (o.gaya ? '<w:pStyle w:val="' + o.gaya + '"/>' : '') +
      (o.rata ? '<w:jc w:val="' + o.rata + '"/>' : '') +
      '<w:spacing' +
      (o.jarakSebelum ? ' w:before="' + o.jarakSebelum + '"' : '') +
      ' w:after="' + (o.jarakSesudah == null ? 120 : o.jarakSesudah) + '"/>' +
      '</w:pPr>';
    if (teks === '') return '<w:p>' + pPr + '</w:p>';
    return '<w:p>' + pPr + '<w:r>' + rPr(o) +
      '<w:t xml:space="preserve">' + esc(teks) + '</w:t></w:r></w:p>';
  }

  function pemisahHalaman() {
    return '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  /** Paragraf berisi satu gambar sebaris (inline), rata tengah. */
  function paragrafGambar(idGambar, rid, cx, cy, nama) {
    return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + idGambar + '" name="' + esc(nama) + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic>' +
      '<pic:nvPicPr><pic:cNvPr id="' + idGambar + '" name="' + esc(nama) + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }

  /**
   * Tabel dua kolom tanpa garis: gambar di kiri, uraian di kanan — susunan yang
   * sama dengan halaman pembahasan pada PDF. Tabel dipakai (bukan gambar
   * mengambang) karena hasilnya tetap utuh ketika berkasnya dibuka di Google Docs
   * dan ketika teksnya nanti disunting.
   */
  function tabelDuaKolom(isiKiri, isiKanan) {
    function sel(lebar, isi) {
      return '<w:tc><w:tcPr><w:tcW w:w="' + lebar + '" w:type="dxa"/>' +
        '<w:tcMar><w:left w:w="0" w:type="dxa"/><w:right w:w="240" w:type="dxa"/></w:tcMar>' +
        '<w:vAlign w:val="center"/></w:tcPr>' +
        (isi || '<w:p/>') + '</w:tc>';
    }
    return '<w:tbl><w:tblPr>' +
      '<w:tblW w:w="' + (KOL_GAMBAR + KOL_TEKS) + '" w:type="dxa"/>' +
      '<w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) {
        return '<w:' + s + ' w:val="none" w:sz="0" w:space="0" w:color="auto"/>';
      }).join('') +
      '</w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar>' +
      '</w:tblPr>' +
      '<w:tblGrid><w:gridCol w:w="' + KOL_GAMBAR + '"/><w:gridCol w:w="' + KOL_TEKS + '"/></w:tblGrid>' +
      '<w:tr>' + sel(KOL_GAMBAR, isiKiri) + sel(KOL_TEKS, isiKanan) + '</w:tr>' +
      '</w:tbl>';
  }

  var KEPALA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  function berkasContentTypes() {
    return KEPALA_XML +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>';
  }

  function berkasRels() {
    return KEPALA_XML +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
  }

  function berkasRelsDokumen(gambar) {
    return KEPALA_XML +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      gambar.map(function (g) {
        return '<Relationship Id="' + g.rid +
          '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' +
          g.nama + '"/>';
      }).join('') +
      '</Relationships>';
  }

  /**
   * Gaya dokumen. Heading 1/2/3 wajib punya `w:name` baku ("heading 1", ...)
   * dan `w:outlineLvl`; itulah yang dibaca Google Docs dan Word untuk menyusun
   * kerangka dokumen. Ukurannya disamakan dengan PDF: 45 pt, 30 pt, 22 pt.
   */
  function berkasStyles() {
    function judul(id, nama, tingkat, ukuran, sebelum) {
      return '<w:style w:type="paragraph" w:styleId="' + id + '">' +
        '<w:name w:val="' + nama + '"/>' +
        '<w:basedOn w:val="Normal"/>' +
        '<w:next w:val="Normal"/>' +
        '<w:uiPriority w:val="9"/><w:qFormat/>' +
        '<w:pPr><w:keepNext/><w:spacing w:before="' + sebelum + '" w:after="120"/>' +
        '<w:outlineLvl w:val="' + tingkat + '"/></w:pPr>' +
        '<w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>' +
        '<w:b/><w:bCs/><w:color w:val="1B2130"/>' +
        '<w:sz w:val="' + ukuran * 2 + '"/><w:szCs w:val="' + ukuran * 2 + '"/></w:rPr>' +
        '</w:style>';
    }
    return KEPALA_XML +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>' +
      '<w:sz w:val="40"/><w:szCs w:val="40"/><w:lang w:val="id-ID"/>' +
      '</w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
      '</w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">' +
      '<w:name w:val="Normal"/><w:qFormat/></w:style>' +
      judul('Heading1', 'heading 1', 0, 45, 0) +
      judul('Heading2', 'heading 2', 1, 30, 0) +
      judul('Heading3', 'heading 3', 2, 22, 160) +
      '</w:styles>';
  }

  function berkasDokumen(isi) {
    return KEPALA_XML +
      '<w:document ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<w:body>' + isi +
      '<w:sectPr>' +
      '<w:pgSz w:w="' + HAL_LEBAR + '" w:h="' + HAL_TINGGI + '" w:orient="landscape"/>' +
      '<w:pgMar w:top="' + TEPI_Y + '" w:right="' + TEPI_X + '" w:bottom="' + TEPI_Y +
      '" w:left="' + TEPI_X + '" w:header="720" w:footer="720" w:gutter="0"/>' +
      '</w:sectPr>' +
      '</w:body></w:document>';
  }

  // ---------------------------------------------------------------- API

  /**
   * @param {Array} soal daftar soal:
   *        { no, tipe, tingkat, jawaban, pembahasan:[string],
   *          gambarSoal, gambarPilihan, gambarPembahasan }
   *        gambar* = Uint8Array berisi PNG (boleh null)
   * @param {object} opsi { judul }
   * @returns {Promise<Blob>}
   */
  function buat(soal, opsi) {
    opsi = opsi || {};
    var gambar = [], isi = [];

    /** Daftarkan satu PNG, kembalikan paragraf gambarnya. */
    function sisipkan(png, maksLebar, maksTinggi, nama) {
      if (!png || !png.length) return '';
      var uk = ukuranPng(png);
      var no = gambar.length + 1;
      var rid = 'rId' + (no + 10);        // rId1 dipakai styles.xml
      gambar.push({ rid: rid, nama: 'gambar' + no + '.png', data: png });
      var d = pasGambar(uk.lebar, uk.tinggi, maksLebar, maksTinggi);
      return paragrafGambar(no, rid, d.cx, d.cy, nama);
    }

    if (opsi.judul) {
      isi.push(paragraf(opsi.judul, { ukuran: 32, tebal: true, rata: 'center', jarakSesudah: 240 }));
      isi.push(pemisahHalaman());
    }

    soal.forEach(function (s, i) {
      if (i) isi.push(pemisahHalaman());

      /* --- halaman 1: judul --- */
      isi.push(paragraf('No. ' + s.no, { gaya: 'Heading1', jarakSebelum: 2400, jarakSesudah: 200 }));
      if (s.tipe) isi.push(paragraf(s.tipe, { ukuran: 27, warna: '3F4655', jarakSesudah: 160 }));
      if (s.tingkat) {
        isi.push(paragraf('Tingkat Kesulitan: ' + s.tingkat,
          { ukuran: 27, tebal: true, warna: WARNA_TINGKAT[s.tingkat] || WARNA_TINGKAT.Sedang }));
      }

      /* --- halaman 2: gambar soal, digabung dengan pilihannya bila ada --- */
      isi.push(pemisahHalaman());
      if (s.gambarGabung) {
        // Kesesuaian: acuan dan kelima opsinya muat pada satu halaman.
        isi.push(sisipkan(s.gambarGabung, ISI_LEBAR, ISI_TINGGI * 0.88, 'Soal ' + s.no));
      } else {
        isi.push(sisipkan(s.gambarSoal, ISI_LEBAR, ISI_TINGGI * 0.88, 'Soal ' + s.no));
        /* --- halaman 3: pilihan A-E --- */
        isi.push(pemisahHalaman());
        isi.push(sisipkan(s.gambarPilihan, ISI_LEBAR, ISI_TINGGI * 0.88, 'Pilihan soal ' + s.no));
      }

      /* --- halaman 4: kunci & pembahasan --- */
      isi.push(pemisahHalaman());
      isi.push(paragraf('Jawaban: ' + s.jawaban, { gaya: 'Heading2', jarakSesudah: 160 }));
      isi.push(paragraf('Pembahasan:', { gaya: 'Heading3', jarakSesudah: 200 }));
      var kiri = sisipkan(s.gambarPembahasan,
        (KOL_GAMBAR - 240) * TWIP_KE_EMU, ISI_TINGGI * 0.62, 'Pembahasan soal ' + s.no);
      // Ukuran huruf mengikuti pilihan PDF (lihat Pdf.ukuranPembahasan): pembahasan
      // yang panjang mengecil sendiri sehingga tetap muat pada satu halaman.
      var pt = s.ptTeks || 20;
      var kanan = (s.pembahasan || []).map(function (p) {
        return paragraf(p, { ukuran: pt, jarakSesudah: Math.round(pt * 7) });
      }).join('');
      if (kiri) isi.push(tabelDuaKolom(kiri, kanan));
      else isi.push(kanan);
      // paragraf penutup: Word menolak berkas yang badannya berakhir dengan tabel
      isi.push(paragraf('', { jarakSesudah: 0 }));
    });

    var berkas = [
      { nama: '[Content_Types].xml', data: enc.encode(berkasContentTypes()) },
      { nama: '_rels/.rels', data: enc.encode(berkasRels()) },
      { nama: 'word/_rels/document.xml.rels', data: enc.encode(berkasRelsDokumen(gambar)) },
      { nama: 'word/styles.xml', data: enc.encode(berkasStyles()) },
      { nama: 'word/document.xml', data: enc.encode(berkasDokumen(isi.join(''))) }
    ];
    gambar.forEach(function (g) {
      berkas.push({ nama: 'word/media/' + g.nama, data: g.data });
    });
    return zip(berkas);
  }

  return { buat: buat, zip: zip, crc32: crc32, ukuranPng: ukuranPng };
});
