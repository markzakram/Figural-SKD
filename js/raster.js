/*
 * raster.js — mengubah SVG menjadi piksel untuk disisipkan ke PDF, dan menyimpan berkas.
 * Semua lewat canvas bawaan peramban, tanpa pustaka luar.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Raster = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function svgKeDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function muatGambar(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('gambar gagal dimuat')); };
      img.src = src;
    });
  }

  var kanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

  /**
   * Piksel mentah sebuah SVG.
   * Gambar soal sering hitam-putih; kalau begitu dikirim sebagai satu kanal abu-abu
   * saja — hasilnya tetap persis sama tetapi datanya sepertiga dibanding RGB.
   * @returns {{lebar:number, tinggi:number, data:Uint8Array, kanal:1|3}}
   */
  function svgKePiksel(svg, skala) {
    skala = skala || 2;
    return muatGambar(svgKeDataUrl(svg)).then(function (img) {
      var w = Math.max(1, Math.round((img.width || 300) * skala));
      var h = Math.max(1, Math.round((img.height || 200) * skala));
      kanvas.width = w;
      kanvas.height = h;
      var ctx = kanvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      var rgba = ctx.getImageData(0, 0, w, h).data;
      var n = w * h, i, j;

      var abuSaja = true;
      for (i = 0, j = 0; j < n; i += 4, j++) {
        if (rgba[i] !== rgba[i + 1] || rgba[i + 1] !== rgba[i + 2]) { abuSaja = false; break; }
      }

      var data;
      if (abuSaja) {
        data = new Uint8Array(n);
        for (i = 0, j = 0; j < n; i += 4, j++) data[j] = rgba[i];
        return { lebar: w, tinggi: h, data: data, kanal: 1 };
      }
      data = new Uint8Array(n * 3);
      for (i = 0, j = 0; j < n * 3; i += 4, j += 3) {
        data[j] = rgba[i]; data[j + 1] = rgba[i + 1]; data[j + 2] = rgba[i + 2];
      }
      return { lebar: w, tinggi: h, data: data, kanal: 3 };
    });
  }

  function svgKePngBytes(svg, skala) {
    skala = skala || 2;
    return muatGambar(svgKeDataUrl(svg)).then(function (img) {
      var w = Math.max(1, Math.round(img.width * skala));
      var h = Math.max(1, Math.round(img.height * skala));
      kanvas.width = w; kanvas.height = h;
      var ctx = kanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      var url = kanvas.toDataURL('image/png');
      var bin = atob(url.slice(url.indexOf(',') + 1));
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    });
  }

  function unduhBlob(blob, namaFile) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  return {
    svgKeDataUrl: svgKeDataUrl, muatGambar: muatGambar,
    svgKePiksel: svgKePiksel, svgKePngBytes: svgKePngBytes, unduhBlob: unduhBlob
  };
});
