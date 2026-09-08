# Generator Soal Figural (Kesesuaian, Ketidaksamaan, Analogi, Serial)

Aplikasi web untuk membuat soal penalaran figural bertipe *"pilihlah satu gambar pada
opsi yang memiliki pola dan susunan unsur yang sama dengan gambar di kiri"* beserta
tiga submateri kerabatnya. Pengguna memilih submateri dan keluarga bentuk, lalu
program otomatis menghasilkan:

- gambar soalnya,
- pilihan jawaban **A–E** (1 benar, 4 pengecoh yang dijamin salah),
- **kunci jawaban** beserta pembahasan yang menyebut satu beda konkret untuk tiap pengecoh.

Mengikuti bentuk soal pada modul *JadiSekdin — Riset dan Kurikulum Sekolah Kedinasan
2026*, bab 3.2.3 Figural.

## Menjalankan

Tidak perlu instalasi, server, atau koneksi internet. Cukup buka **`index.html`**
dengan peramban (Chrome, Edge, atau Firefox). Seluruh tampilan dirancang muat dalam
satu layar tanpa perlu digulir.

## Empat submateri

| Submateri | Soal | Pilihan A–E | Yang benar |
|---|---|---|---|
| **Kesesuaian** | satu gambar acuan | lima gambar | yang merupakan **putaran murni** gambar acuan |
| **Ketidaksamaan** | — (kelima gambarnya adalah soalnya) | lima gambar | yang **bukan** putaran keempat lainnya |
| **Analogi** | A : B :: C : ? | lima gambar | hasil menerapkan perubahan A→B pada C |
| **Serial** | empat kotak berurutan | lima gambar | kotak kelima yang meneruskan polanya |

Tingkat kesulitan (mudah/sedang/sulit) berlaku untuk keempatnya.

## Delapan keluarga bentuk

Bentuknya **dibangkitkan, bukan digambar manual**, dari sebuah nomor benih.

| Keluarga | Cara dibuat | Hasilnya |
|---|---|---|
| **Garis bersarang** | 3–5 bingkai persegi panjang terbuka, ukurannya bertingkat, masing-masing pada sudutnya sendiri; kadang ditambah satu titik di pusat | bingkai yang sudut-sudutnya saling menyilang — bentuk yang persis dipakai contoh soal pada modul |
| **Bangun datar + penanda** | segitiga/persegi/segilima/segienam beraturan, ditambah 2–4 penanda: titik isi atau kosong, tali busur, jari-jari, takik tepi, segitiga kecil, panah dalam | bangun datar yang "diberi tanda" pada tempat tertentu |
| **Kisi titik & penghubung** | kisi 3×3 atau 4×4; 4–6 titiknya dihubungkan satu jalur (kadang tertutup), sisanya jadi titik isi/kosong lepas | jalur bersudut dengan titik-titik penyerta |
| **Panah, sirip & kait** | 3–5 batang memancar dari pusat, sebagian bersiku, ujungnya mata panah / kait / polos; kadang berinti segitiga, persegi, atau lingkaran | susunan panah yang arahnya harus dibaca |
| **Pita zigzag menyilang** | 2–3 garis patah panjang (3–5 titik) yang melintasi gambar pada sudut berbeda, kadang ditambah satu titik | yang ditelusuri arah lipatan tiap pita, bukan urutan besar-kecilnya |
| **Tulang & gigi sisir** | satu tulang punggung dengan 3–5 gigi yang panjang dan kemiringannya berbeda-beda, sesekali satu gigi menyeberang sisi | bentuk seperti sisir; panjang gigi yang tidak seragam itulah yang membuatnya kiral |
| **Blok bertumpuk** | 2–4 segi empat tertutup pada sudut dan letak berbeda yang bertindihan sebagian | berbeda dari bersarang: yang dibaca letak tumpukannya |
| **Lingkaran & tali silang** | satu lingkaran besar, 3–4 tali busur berujung di kelilingnya, plus 1–2 titik di dalam | satu-satunya keluarga bergaris lengkung, jadi sekilas langsung berbeda dari tujuh lainnya |

Kedelapan keluarga **dicentang berganda**: centang sebanyak yang diinginkan, dan soal
hanya dibuat dari keluarga yang tercentang, dipakai bergantian. Satu keluarga selalu
harus tersisa — daftar kosong tidak punya arti, dan generator toh akan jatuh kembali ke
seluruh keluarga sehingga pengguna melihat bentuk yang tidak ia minta.

`Families.bangkitkan()` menerima tiga bentuk masukan supaya pemanggil lama tetap jalan:
satu nama keluarga (`'sarang'`), kata `'campur'`, atau daftar (`['sarang','panah']`).
Id yang tidak dikenal dibuang, dan daftar yang jadi kosong berarti seluruh keluarga —
generator tidak boleh berhenti bekerja hanya karena simpanan peramban memuat nama
keluarga dari versi yang lebih lama.

Diuji pada empat kombinasi × 200 bentuk: **0 keluarga menyelinap** ke luar daftar yang
diminta, dan **0 keluarga yang diminta tidak pernah muncul**. Saat kedelapannya
dicentang, sebarannya 9,5%–16,5% — merata dalam batas kewajaran acak.

## Jaminan kebenaran

Seluruh generator bertumpu pada satu fungsi, `Figure.sudutPutarKe()`, yang menjawab
**secara pasti** apakah dua bentuk terhubung oleh putaran.

**Jawabannya pasti, bukan hasil penyisiran.** Sebuah putaran mempertahankan jarak
tiap titik ke pusat. Karena itu simpul terjauh bentuk A pasti jatuh pada salah satu
simpul terjauh bentuk B, dan sudut putarnya tinggal selisih arah keduanya. Daftar
sudut calon yang lahir dari aturan itu **lengkap secara geometri** — biasanya hanya
1 sampai 8 sudut — lalu tiap calon diuji sampai ke titiknya. Penyisiran sudut selangkah
demi selangkah tidak dipakai karena bisa melewatkan sudut yang tepat di antara langkah.

Dari situ empat jaminan disusun:

1. Kunci "kesesuaian" **dibuat** sebagai putaran gambar acuan, jadi benar menurut
   definisinya.
2. Setiap calon pengecoh **diuji terhadap gambar acuan**. Kalau ternyata masih
   terhubung putaran, calon itu dibuang karena sebenarnya BENAR.
3. Antar pilihan juga diuji: tidak boleh ada dua yang terhubung putaran, sebab di
   kertas keduanya akan tampak sebagai gambar yang sama.
4. `Quiz.audit()` memeriksa ulang soal yang sudah jadi **lewat geometrinya sendiri**,
   tanpa melihat catatan cara pembuatannya. Kalau sampai ada lebih dari satu pilihan
   yang sah, peringatannya muncul di atas lembar soal dan soal itu dibuat ulang.

### Pemeriksaan nomor 2 bukan hiasan

Diukur pada 300 percobaan per strategi: **1,7% calon dari strategi "putar unsur
terhadap pusatnya sendiri" ternyata masih merupakan putaran gambar acuan.** Penyebabnya
unsur yang simetri sendirian — persegi yang diputar 90° terhadap pusatnya kembali ke
bentuk semula, sehingga gambarnya tidak berubah sama sekali. Kedelapan strategi lain
menghasilkan 0 kasus. Seluruh 1,7% itu tertangkap dan dibuang; tanpa pemeriksaan
tersebut, satu dari enam puluh soal akan berkunci ganda.

### Pencerminan selalu dihitung salah

Bayangan cermin **bukan** kesesuaian — itulah pengecoh terpenting pada submateri ini.
Supaya jaminan itu berlaku, setiap bentuk yang dipakai wajib **kiral**: tidak bisa
ditumpangkan pada bayangan cerminnya lewat putaran saja. Bentuk yang tidak kiral
membuat pengecoh cermin ikut benar dan soalnya berkunci ganda.

Kiral saja ternyata belum cukup. Diukur pada 1.200 bentuk mentah, syarat kiral hanya
menolak **0,3%** — sedangkan syarat berikutnya, *cerminnya harus berbeda cukup jauh*,
menolak **10,2%** dan menjadi sebab penolakan terbanyak dari seluruh penyaring.
Bentuk-bentuk itu memang kiral secara matematis, tetapi bayangan cerminnya nyaris
menumpuk pada aslinya; pengecoh cermin darinya berubah menjadi adu ketelitian
mengukur, bukan adu mengenali pola.

## Penyaring bentuk

Semua hasil acak melewati **satu penyaring yang sama** sebelum dipakai. Dua syarat
pertamanya bukan soal keindahan melainkan syarat agar soalnya sah:

| Syarat | Batas | Yang dicegah |
|---|---|---|
| orde simetri putar | harus **1** | bentuk yang sama saat diputar 90° membuat "diputar berapa derajat" tak berjawab tunggal, dan dua pengecoh berselisih 90° tampak kembar |
| kiral | wajib | pengecoh hasil pencerminan ternyata ikut benar |
| ruas terpendek : jangkauan | ≥ 0,13 | detail sehalus rambut yang tak terbaca di kertas |
| sisi pendek : sisi panjang kotak pembatas | ≥ 0,50 | bentuk gepeng yang terbaca seperti bilah |
| jarak terdekat antar dua unsur : jangkauan | ≥ 0,11 | dua unsur berhimpit dan terbaca sebagai satu garis tebal |
| panjang garis total : jangkauan | 3,4 – 26 | gambar yang terlalu kosong atau terlalu padat |
| beda terhadap bayangan cerminnya | ≥ 0,045 | cermin yang nyaris kembar, sehingga pengecoh cermin jadi adu ketelitian mengukur |

Diukur pada 400 bentuk acak: seluruhnya berorde simetri 1 dan kiral, rata-rata butuh
**1,27 percobaan** sampai lolos, dan **tidak satu pun** jatuh ke bentuk cadangan.
Biayanya 2,6 ms per bentuk.

Tingkat penolakan berbeda antar keluarga (per 60 bentuk yang jadi): zigzag 1,05
percobaan, kisi 1,10, blok 1,12, sisir 1,18, silang 1,20, sarang 1,52, panah 1,60,
datar 2,22.

### Syarat mana yang benar-benar menggigit

Diukur pada 1.200 bentuk **mentah** (sebelum disaring); 21,7% ditolak:

| Syarat | Menolak |
|---|---|
| cerminnya nyaris kembar | 10,2% |
| dua unsur berhimpit | 6,9% |
| garisnya terlalu sedikit | 3,8% |
| ada ruas sehalus rambut | 2,0% |
| bentuknya gepeng | 0,7% |
| tidak kiral | 0,3% |
| orde simetri bukan 1 | 0,1% |

Syarat orde simetri itu contoh bagus: selama generatornya hanya punya empat keluarga,
ia **tidak pernah sekali pun** menolak bentuk, dan tampak seperti aturan yang mubazir.
Begitu empat keluarga baru ditambahkan, ia langsung menangkap kasusnya. Aturan yang
menjaga sifat pokok memang layak dipertahankan meski jarang berbunyi.

`Families.mentah()` disediakan khusus untuk pengukuran ini; `bangkitkan()` membuang
bentuk yang gagal sehingga dari luar sebab penolakannya tidak terlihat sama sekali.

### Keluarganya diundi sekali, di luar gelung percobaan

Kalau keluarga diundi ulang pada setiap percobaan, keluarga yang lebih sering ditolak
penyaring akan tergantikan keluarga lain dan sebarannya melenceng — terukur **129
banding 60** dari 400 soal, karena bentuk `datar` rata-rata butuh 1,4 percobaan
terbuang sedangkan `kisi` hanya 0,14. Undian dipindahkan ke luar gelung dan sebarannya
kembali merata.

### Benih berurutan perlu diaduk

Soal dibuat sepaket dengan benih berurutan (1000, 1001, 1002, …), dan keluaran
**pertama** mulberry32 untuk benih berurutan masih berkorelasi — padahal keluaran
pertama itulah yang dipakai memilih keluarga bentuk. Benihnya kini diaduk dulu dengan
finalizer splitmix32 dan tiga keluaran pertama dibuang sebagai pemanasan. Diperiksa
pada 20.000 benih berurutan: 4953 / 4927 / 5015 / 5105 — merata.

## Pengecoh

Sepuluh strategi, masing-masing menghasilkan satu **beda yang bisa ditelusuri di
gambar**:

| Strategi | Kesalahan yang ditampilkan |
|---|---|
| `cermin` | seluruh gambar adalah bayangan cermin |
| `putarUnsur` | satu unsur berpindah tempat mengelilingi pusat |
| `putarSendiri` | satu unsur berubah arah, letaknya tetap |
| `skalaUnsur` | satu unsur membesar atau mengecil terhadap unsur lain |
| `hapusUnsur` | satu unsur hilang |
| `tambahUnsur` | ada satu unsur tambahan berupa salinan |
| `isiUnsur` | satu unsur berubah dari terisi ke kosong atau sebaliknya |
| `geserUnsur` | satu unsur bergeser dari kedudukannya |
| `cerminUnsur` | hanya satu unsur yang tercermin |
| `putarTumpu` | satu unsur berubah sudutnya sambil tetap menempel di tempat yang sama |

Tingkat kesulitan **tidak mengubah apa yang dijamin benar** — ia mengubah strategi mana
yang dipakai, urutan prioritasnya, dan besar sudut putarnya (mudah: kelipatan 90°;
sedang: kelipatan 45°; sulit: 45/135/225/315°, yang tidak menyisakan satu pun sisi
mendatar).

### Tingkat sulit: kelima opsi memakai potongan yang sama persis

Kelima opsi bisa saja "berbeda" tanpa satu pun penjawab perlu membayangkan putaran.
Kalau sebuah pengecoh punya unsur lebih banyak, unsur yang ukurannya berubah, atau
titik yang tadinya hitam menjadi kosong, ia bisa dicoret **sekilas** — cukup menghitung
atau membandingkan ukuran. Soalnya berhenti menguji penalaran ruang.

Karena itu kesembilan strategi dibagi dua menurut apakah ia mengubah **profil** bentuk,
yaitu segala hal yang terbaca tanpa memutar gambar sedikit pun: daftar unsurnya (jenis,
tertutup atau tidak, terisi atau kosong, berkepala atau tidak, jumlah titik, panjang
garis) dan jangkauannya. Semuanya tidak berubah saat gambar diputar.

| | strategi | mengubah daftar unsur |
|---|---|---|
| **kaku** | cermin, putarTumpu, putarUnsur, putarSendiri, geserUnsur, cerminUnsur | **0%** |
| longgar | skalaUnsur, hapusUnsur, tambahUnsur, isiUnsur | **100%** |

Angka itu diukur, bukan diasumsikan: 400 percobaan per strategi.

Pada tingkat **sulit** hanya strategi kaku yang dipakai, dan tiap pengecoh masih diuji
lagi secara geometri — profilnya wajib sama dengan gambar acuan (jangkauan boleh beda
paling banyak 6%). Diperiksa pada 128 soal sulit: **640 dari 640 opsi** berprofil sama.

### Daftar unsur yang sama pun belum cukup

Daftar unsur dan jangkauan yang sama ternyata masih menyisakan jalan pintas. Sebuah
pengecoh bisa memakai potongan yang sama persis namun **hubungan antar potongannya**
berubah — dan hubungan itu pun terbaca sekilas:

- tali busur yang semula menempel di dua sudut segienam kini **menyembul keluar** sisinya;
- lima batang yang semula bertemu di satu titik kini **tidak bertemu lagi**.

Keduanya tidak menuntut penjawab memutar apa pun. Karena itu profil diperluas dengan
**struktur hubungan**, yang juga tidak berubah saat gambar diputar:

| | yang diukur |
|---|---|
| **simpul** | berapa daerah terpisah tempat dua unsur BERSAMBUNG DI UJUNG |
| **wadah** | `d` seluruhnya di dalam, `l` seluruhnya di luar, `s` menyembul separuh |

Persilangan di tengah garis sengaja **tidak** dihitung. Dua tali busur yang berpotongan
di dalam lingkaran memang berbeda polanya, tetapi menghitung persilangan semacam itu
menuntut penelusuran satu per satu — sama beratnya dengan membayangkan putaran, jadi ia
bukan jalan pintas yang perlu ditutup. Waktu persilangan sempat ikut dihitung, keluarga
`silang` nyaris tak bisa dipakai pada tingkat sulit: hanya 11 dari 40 bentuk yang
sanggup memberi empat pengecoh.

### Pengecoh yang memutar unsur pada tumpuannya

Syarat struktur itu menutup hampir semua strategi lama — memutar sebuah unsur terhadap
pusat gambar justru merusak sambungannya. Karena itu ditambahkan strategi `putarTumpu`,
yang memilih **titik putar sedemikian rupa sehingga sambungannya bertahan**:

1. titik tumpu, yaitu pusat daerah tempat unsur ini menyentuh unsur lain — lima batang
   yang bertemu di satu pusat tetap bertemu di sana;
2. pusat unsur tertutup yang **disentuh atau mewadahinya** — tali busur yang diputar
   terhadap pusat lingkaran, kedua ujungnya tetap di keliling;
3. pusat gambar, untuk unsur yang memang tidak menyentuh apa pun.

Wadah bersudut mendapat perlakuan khusus: sudut putarnya dibatasi **kelipatan 360/n**,
sebab memutar tali busur sembarang derajat terhadap pusat segienam melemparkan ujungnya
keluar sisi — jarak sudut ke pusat lebih jauh daripada jarak sisi ke pusat. Kelipatan
360/n memetakan sudut ke sudut, sehingga talinya berpindah menghubungkan **pasangan
sudut lain**: persis variasi yang wajar.

Yang tersisa berbeda hanyalah sudut antar unsur, dan itu hanya bisa dibandingkan dengan
menumpangkan kedua gambar di kepala. Seluruh delapan keluarga kini sanggup menyusun soal
sulit: **320 dari 320**.

### Struktur hubungan harus benar-benar kebal putaran

Kalau ukuran yang dipakai menyaring itu sendiri bergoyang saat gambar diputar, kunci
jawabannya sendiri bisa dinyatakan berstruktur beda dari acuannya dan soalnya gagal
disusun. Tiga sumbernya ditemukan lewat pengujian, semuanya bermuara pada satu hal:
**titik cuplikan lingkaran dibuat pada sudut mutlak**, sehingga tidak ikut berputar
bersama gambarnya.

| Sumber | Perbaikan |
|---|---|
| jarak diukur ke titik cuplikan lawan | jarak dihitung tepat ke goresannya (titik ke ruas, titik ke lingkaran) |
| sisi yang dicuplik kebetulan lingkaran | yang dicuplik selalu sisi yang bukan lingkaran; sepasang lingkaran tak punya ujung, jadi simpulnya nol |
| pecahan "di dalam" dicuplik dari lingkaran | untuk lingkaran dihitung tepat dari jari-jari dan jaraknya |

Satu lagi bukan soal pencuplikan melainkan **uji setajam pisau**: ujung tali busur duduk
tepat di keliling lingkarannya, dan di situ "di dalam atau di luar" ditentukan galat
pembulatan. Dengan cuplikan 15 titik, kedua ujung itu sendirian bernilai 13% — cukup
untuk melempar pecahannya melewati ambang 0,9, sehingga tali yang sama terbaca
"seluruhnya di dalam" pada satu sudut dan "menyembul keluar" pada sudut lain. Titik yang
persis di tepi kini dihitung sebagai di dalam, dan itu pula yang dilihat mata: tali itu
BERAKHIR di keliling, bukan melewatinya.

Diperiksa pada **2.560 uji** (8 keluarga × 40 bentuk × 7 sudut putar + pencerminan):
0 menyimpang. Sebelum keempat perbaikan itu, 116 menyimpang.

Pada **mudah** dan **sedang**, pengecoh yang mudah dicoret justru yang diinginkan —
itulah yang membedakan ketiga tingkat. Diperiksa pada 64 soal mudah: 62 di antaranya
memang punya minimal satu pengecoh semacam itu.

Pemeriksaannya dilakukan dari geometri, bukan dari daftar `CACAT_KAKU`. Kalau kelak ada
strategi baru yang keliru digolongkan kaku, aturan itu tetap menangkapnya.

### Yang dibuang: unsur rangka

Membuang unsur yang mendominasi gambar — misalnya segienam luar pada keluarga `datar`,
yang sendirian memuat sebagian besar garisnya — menyisakan beberapa coretan lepas yang
tidak lagi terbaca sebagai gambar sekeluarga dengan kuncinya; penjawab mencoretnya
sekilas tanpa membandingkan pola apa pun. Karena itu yang boleh dibuang hanya unsur
yang panjang garisnya **di bawah 40%** panjang seluruh gambar, yaitu penandanya, bukan
rangkanya.

### Beda pengecoh ditahan di dua sisi

Beda diukur setelah kedua gambar **diputar sepas mungkin** — penjawab boleh memutar
gambar di kepalanya, jadi yang pantas diukur adalah beda yang tersisa sesudah putaran
terbaik. Ukurannya jarak chamfer dua arah, dinyatakan dalam satuan jangkauan bentuk.

| | batas | alasan |
|---|---|---|
| bawah | 0,030 (sulit) – 0,075 (mudah) | di bawah itu kedua gambar nyaris kembar dan soalnya berubah jadi adu ketelitian mengukur, bukan adu mengenali pola |
| atas | 0,42 | di atas itu pengecohnya mencolok dan langsung tercoret tanpa berpikir |

Terukur pada 1.165 pengecoh: terkecil 0,030, median 0,077, terbesar 0,184.

### Tidak ada dua pengecoh yang beralasan sama

Dua pengecoh bisa saja berbeda secara geometri namun **berbagi kalimat alasan yang
sama** — misalnya bingkai terluar yang sama diperbesar 1,28 kali pada satu opsi dan
1,4 kali pada opsi lain. Pembahasannya lalu menuliskan kalimat identik untuk dua huruf
berbeda dan pembaca menyangka ada salah cetak. Alasan yang sudah dipakai kini ditolak
sejak awal, dan `audit()` ikut memeriksanya. Diperiksa pada 192 soal: 0 pasang.

## Pembahasan

Dibuka dengan alasan pilihan yang **BENAR**, baru menyusul alasan tiap pengecoh —
menyebut pengecohnya saja tidak mengajarkan cara membaca soalnya. Kalimatnya
dihitung dari geometri, bukan dari nama strateginya:

> Transformasi pada gambar tersebut diperoleh dengan memutar seluruh pola sebesar 225
> derajat searah jarum jam. Pada proses ini bentuk dan jumlah setiap unsur tetap sama;
> yang berubah hanya arah serta letaknya akibat perputaran.
>
> Mengapa opsi lain salah:
> A. gambarnya merupakan BAYANGAN CERMIN dari gambar acuan, bukan hasil putaran…
> B. letak bingkai terluar berpindah terhadap unsur lain — hanya unsur itu yang
> bergeser mengelilingi pusat, sedangkan pada putaran seluruh unsur bergerak
> bersama-sama sehingga kedudukan relatifnya tetap.

Unsurnya disebut dengan kata ("bingkai terluar", "titik penanda", "batang berpanah"),
bukan nomor urut. Nama itu murni keterangan: tidak satu pun pembanding melihatnya,
jadi dua unsur bernama beda tetap dinyatakan sama bila goresannya sama.

### Gambar pembahasan kesesuaian: tiga baris

Kalimat "diputar 225 derajat" hanya bisa dipercaya, tidak bisa diperiksa: pada gambar
garis polos tidak ada apa pun yang bisa ditelusuri mata dari gambar acuan ke kuncinya.
Karena itu halaman pembahasan kesesuaian memuat tiga baris.

**1. Padanan unsur.** Gambar acuan bersanding dengan opsi kunci, dan unsur yang
bersesuaian diberi **warna dan nomor yang sama** pada keduanya. Pembaca cukup mengikuti
satu warna untuk melihat ke mana unsur itu berpindah — dan melihat sendiri bahwa
semuanya berpindah bersama-sama. Padanannya tidak perlu dicari-cari: `Figure.putar()`
mempertahankan urutan unsur, jadi unsur ke-*i* pada acuan pasti unsur ke-*i* pada
kuncinya.

Nada warnanya sengaja **tua**, kebalikan dari generator jaring-jaring yang mewarnai
bidang dengan nada muda. Di sini yang diwarnai adalah garis setebal satu sampai dua
piksel, dan warna muda pada garis setipis itu hilang saat dicetak.

Bulatan nomor diletakkan **di luar** unsurnya dengan garis penunjuk pendek yang
berujung di dalam unsur tersebut. Ditaruh di dalam, bulatan sebesar itu menutupi garis
yang justru harus dibaca. Penempatnya mencoba dua belas arah di sekeliling pusat unsur
dan memilih yang paling jauh dari garis mana pun DAN dari bulatan yang sudah terpasang
— tanpa itu dua nomor bisa memperebutkan celah yang sama pada gambar yang padat.

**2. Tahap putaran.** Gambar acuan ditampilkan pada tiga sudut antara sampai tiba di
sudut kuncinya (0° → 105° → 210° → 315°, misalnya), bingkai terakhir bertanda
"= opsi A". Putarannya jadi bisa **dilihat terjadi**, bukan sekadar dibaca angkanya.

**3. Peta pengecoh.** Kelima opsi kecil-kecil, unsur yang cacat diwarnai **merah** dan
digemukkan, kuncinya berbingkai hijau. Pembahasan menulis "letak bingkai terluar
berpindah"; tanpa peta ini pembaca harus mencari sendiri bingkai mana yang dimaksud di
antara lima gambar yang mirip.

Ketiga baris menumpuk ke bawah, dan itu justru pas dengan halaman PDF-nya yang
menyediakan kolom gambar selebar 480 pt namun setinggi 610 pt. Skalanya dihitung ulang
per baris menurut ukuran kotaknya sendiri — memakai satu skala untuk semua baris
membuat gambar tumpah keluar kotak pada baris yang kotaknya lebih kecil. Perbandingan
antar opsi tetap adil karena yang penting satu skala **di dalam** satu baris.

Ketiga submateri lain memakai susunan yang lebih ringkas: gambar acuannya bersanding
dengan opsi kunci, dengan sudut atau langkah polanya tertulis di antara keduanya.

## Skala dipakai bersama

Skala satu soal dihitung **sekali** dari seluruh bentuk yang muncul padanya — gambar
acuan maupun kelima pilihan — lalu dipakai di semua kotaknya. Kalau tiap kotak
dipaskan sendiri-sendiri, pengecoh yang unsurnya dihapus akan ikut membesar memenuhi
kotaknya, dan penjawab bisa menebaknya dari ukuran gambar saja tanpa membaca polanya.

Semua kotak pada satu soal juga **berukuran sama besar**. Sempat dicoba kotak soal
yang lebih besar daripada kotak pilihan, tetapi karena skalanya harus mengikuti kotak
terkecil, gambar acuan lalu tampil kekecilan di tengah kotaknya yang lapang.

Halaman "gambar soal" dan halaman "pilihan A–E" adalah dua halaman PDF terpisah yang
masing-masing diperbesar sampai memenuhi lebar kertas. Kanvas keduanya **disamakan
lebarnya** supaya faktor pembesarannya ikut sama — tanpa itu gambar acuan tercetak
lebih besar daripada opsinya, padahal keduanya harus dibandingkan langsung.

## Format PDF

Mengikuti format PDF generator *diagrammatical*: halaman **1440 × 810 pt**
(20 × 11,25 inci, 16:9).

1. **Judul** — nomor soal, submateri, dan tingkat kesulitan (berwarna).
2. **Gambar soal** — gambar acuan, pasangan analogi, atau deret serial.
3. **Pilihan A–E**.
4. **Kunci & pembahasan** — gambar di kiri, uraian di kanan.

### Kesesuaian: soal dan pilihannya pada satu halaman

Gambar acuan kesesuaian hanya satu kotak, jadi ia muat berdampingan dengan kelima
opsinya — dan itu lebih baik daripada dua halaman terpisah: penjawab bisa
membandingkan acuan dengan opsinya tanpa membalik halaman. Susunannya mengikuti bentuk
lembar soal yang lazim:

- gambar acuan berdiri sendiri dalam kotaknya di kiri;
- kelima opsi berjajar di dalam **satu** bingkai di kanan;
- huruf **A** sampai **E** tercetak tebal di bawah masing-masing.

Opsi sengaja tidak diberi bingkai sendiri-sendiri. Bingkai per opsi membuat mata
membanding-bandingkan kotaknya dan bukan gambarnya, padahal yang harus dibaca justru
pola di dalamnya.

Akibatnya soal kesesuaian memakai **tiga halaman**, bukan empat — paket 100 soal turun
dari 400 menjadi 300 halaman. Ketiga submateri lain tetap empat halaman, sebab gambar
soalnya sendiri sudah selebar empat sampai lima kotak. `pdf.js` dan `docx.js` memilih
susunannya dari ada-tidaknya `gambarGabung` pada soal, jadi keduanya tidak perlu tahu
submateri apa yang sedang dicetak.

Lembar di layar tetap bersusun ke bawah (acuan di atas, opsi di bawah) karena panel
tengahnya sempit; begitu pula cetakan A4, yang porsinya lebih pas bersusun.

Ukuran huruf pembahasan **dicoba dari 20 pt turun ke 13 pt** dan yang dipakai adalah
yang terbesar yang masih muat; kalau satu kolom tetap kurang, teksnya dipecah menjadi
dua kolom.

PDF disusun langsung tanpa pustaka luar: gambar disisipkan sebagai XObject
`DeviceGray` bila hitam-putih (datanya sepertiga) atau `DeviceRGB` bila berwarna,
dipadatkan dengan `CompressionStream` bawaan peramban, dan teksnya memakai Helvetica
bawaan pembaca PDF sehingga tidak perlu disematkan.

### Halaman soal ketidaksamaan tidak lagi kembar

Submateri ketidaksamaan tidak punya gambar soal tersendiri — yang dibandingkan adalah
kelima gambarnya sendiri. Semula halaman 2 dan halaman 3 sama-sama menggambar kelima
kotak berhuruf, sehingga kedua halaman PDF itu menjadi gambar yang **identik byte demi
byte** (ketahuan dari dua berkas PNG berukuran sama persis di dalam .docx-nya).
Sekarang halaman 2 menggambarnya **tanpa huruf** sebagai pertanyaan, dan halaman 3
dengan huruf A–E sebagai opsi.

## Format Word (.docx)

Tombol **Unduh Word** menghasilkan berkas yang bisa langsung disunting. Susunannya
**mengikuti PDF** — halaman 1440 × 810 pt (28800 × 16200 twip) dan empat halaman per
soal. Judulnya memakai **gaya judul sungguhan** (`No. N` → Heading 1, `Jawaban: X` →
Heading 2, `Pembahasan:` → Heading 3) sehingga Google Docs dan Word menampilkan
kerangka dokumen di panel samping.

Penyusunnya ditulis sendiri: penulis ZIP di bawah (header lokal, direktori pusat,
EOCD, CRC-32, deflate mentah lewat `CompressionStream`) dan penyusun WordprocessingML
di atasnya. Gambar disematkan sebagai PNG dengan ukuran tampil dalam EMU.

## Tidak ada soal yang benar-benar kembar

Saat membuat banyak soal sekaligus, tiap soal disidik dari **gambar pertanyaannya DAN
kumpulan pilihannya**. Sidik pilihan diurutkan lebih dulu, jadi dua soal yang isinya
sama dan hanya berbeda urutan huruf tetap dikenali kembar. Yang kembar dibuat ulang
(paling banyak 12 kali). Diuji pada 120 soal kesesuaian berbenih berurutan: 0 kembar.

## Alur pemakaian

1. **Pilih submateri.** Kesesuaian, Ketidaksamaan, Analogi, atau Serial.
2. **Centang keluarga bentuk** (boleh lebih dari satu) dan pilih tingkat kesulitan.
   Tombol *Pilih semua* mengembalikan kedelapannya sekaligus.
3. **Acak bentuk.** Setiap bentuk lahir dari sebuah nomor benih; benih yang sama selalu
   menghasilkan bentuk yang sama, jadi soal bisa dibuat ulang persis dari nomornya.
   Panel kiri menampilkan daftar unsur penyusunnya dan ketujuh ukuran penyaringnya,
   supaya alasan sebuah bentuk diterima bisa ditelusuri sendiri.
4. **Buat soal.** Tombol A–E di bawah lembar soal bisa diklik untuk mengecek jawaban
   beserta alasannya.
5. **Buat sepaket dan unduh.** Isi *Jumlah* soal, pilih apakah submateri/bentuk/tingkat
   mengikuti pilihan di atas atau dicampur, tekan **Generate**, lalu **Unduh PDF**
   (siap cetak) atau **Unduh Word** (siap sunting).

Pilihan terakhir tersimpan otomatis di peramban.

## Kecepatan

| | |
|---|---|
| satu bentuk | 2,3 ms |
| satu soal (kesesuaian) | 20–25 ms |
| satu soal (tipe lain) | 4–7 ms |
| paket 100 soal campuran | 0,97 detik |
| penyusunan SVG 100 soal | 0,92 detik (11,5 KB SVG per soal) |
| PDF | ≈ 218 KB per soal (kesesuaian, 3 halaman) |

Soal kesesuaian paling mahal karena ia sendiri yang mencari empat pengecoh lewat
pengukuran beda bentuk; tipe lain sebagian pengecohnya sudah tertentu dari polanya.

## Struktur berkas

```
index.html          antarmuka (tata letak 3 kolom, satu layar)
css/style.css       tampilan + aturan cetak
js/rng.js           pengacak berbenih (mulberry32 + pengaduk splitmix32)
js/figure.js        model unsur, transformasi, dan PEMBANDING ROTASI yang pasti
js/families.js      delapan keluarga pembangkit bentuk (bisa dipilih berganda) + penyaring
js/render.js        penggambar SVG (unsur, kotak, deret kotak, bulatan bernomor)
js/sheet.js         tata letak lembar soal — dipakai bersama layar, PDF, dan Word
js/quiz.js          penyusun soal keempat submateri, pengecoh, audit, pembahasan
js/raster.js        SVG -> piksel (untuk PDF) dan penyimpan berkas
js/pdf.js           penyusun PDF 1440x810, 4 halaman per soal, tanpa pustaka luar
js/docx.js          penyusun .docx tanpa pustaka luar
js/app.js           perekat antarmuka
```

Berkas `rng.js`, `figure.js`, `families.js`, `render.js`, `sheet.js`, dan `quiz.js`
bisa dipakai ulang di Node.js (`require`) untuk membuat soal secara massal tanpa
antarmuka.

## Pemeriksaan mandiri

```bash
node uji/bentuk.js 400        # mesin bentuk, pembanding rotasi, struktur hubungan
```

```bash
node uji/soal.js 12           # soal jadi, diperiksa ulang dari geometrinya
```

```bash
node uji/periksa-pdf.js contoh-keluaran.pdf
```

`uji/bentuk.js` memeriksa mesin bentuknya: sudut putar terbaca kembali, penyaring
benar-benar menggigit, benih dapat diulang, struktur hubungan kebal putaran, dan
pilihan keluarga berganda dihormati.

`uji/soal.js` menjalankan sebelas pemeriksaan atas 864 soal dari seluruh kombinasi
submateri × tingkat × keluarga, semuanya **dihitung ulang dari bentuk tiap pilihan**,
bukan dari catatan penyusunnya:

1. seluruh kombinasi menghasilkan soal, tanpa peringatan;
2. kunci tunggal dan tercatat benar; tidak ada opsi kembar;
3. bayangan cermin tidak pernah ikut sah;
4. beda pengecoh berada dalam batas bawah dan atas;
5. sebaran huruf kunci merata (χ² = 3,56 pada 3.000 soal, 4 derajat bebas; ambang 9,49);
6. benih berurutan tidak menghasilkan soal kembar;
7. **analogi**: hubungan A→B diukur dari gambarnya sama persis dengan hubungan
   C→kunci, dan sama dengan sudut yang ditulis di pembahasan;
8. **serial**: keempat langkah antar kotak sebesar delta yang tercatat, diukur setelah
   titik penandanya dilepas;
9. tidak ada dua opsi yang kalimat alasannya sama;
10. pada tingkat **sulit**, kelima opsi kesesuaian dan ketidaksamaan berprofil sama —
    dan sebaliknya, tingkat mudah memang menyediakan pengecoh yang bisa dicoret
    sekilas, supaya ketiga tingkat itu benar-benar berbeda;
11. nomor benih yang dicatat benar-benar membuat ulang soal yang sama persis, dan
    sebaran keluarganya merata pada barisan benih yang dipakai batch.

### QC satu paket yang sudah diunduh

```bash
node uji/qc-paket.js uji/keluaran/benih-100.json uji/keluaran/soal-figural-100soal.pdf
```

Berbeda dari `uji/soal.js` yang membuat soal khusus untuk diuji, alat ini menguji paket
yang **benar-benar akan dipakai**: tiap soal dibuat ulang dari nomor benihnya, diaudit
dari geometrinya, lalu kunci yang **tercetak di PDF** dicocokkan dengan hasil audit itu —
pemeriksaan ujung ke ujung, dari benih sampai ke tinta di kertas.

Hasil pada satu paket 100 soal kesesuaian tingkat sulit:

| Yang diperiksa | Hasil |
|---|---|
| soal terulang persis dari benihnya | 100/100 |
| kunci tunggal, tercatat benar, tanpa opsi kembar | 100/100 |
| kelima opsi berprofil & berstruktur sama | 500/500 opsi |
| pengecoh pencerminan yang keliru dinilai sah | 0 dari 100 |
| soal kembar | 0 |
| sebaran kunci A–E | χ² 7,20 (4 db, ambang 9,49) |
| kunci yang tercetak di PDF cocok dengan geometrinya | 100/100 |
| sudut putar di pembahasan cocok dengan yang terukur | 100/100 |
| halaman PDF berukuran 1440 × 810 | 300/300 |

Waktunya: 2,7 detik untuk menyusun 100 soal, sekitar 13 detik untuk merakit PDF-nya
(16,0 MB, 300 halaman). Berkas Word-nya 24,2 MB dengan 200 gambar tersemat, dibaca
pembaca ZIP .NET tanpa galat.

### Dua cacat yang ditemukan QC ini

Keduanya tidak terlihat oleh `uji/soal.js`, karena hanya muncul pada alur batch yang
sesungguhnya:

**Sebaran keluarga melenceng.** Pada paket pertama, `silang` hanya muncul 3 kali dari
100 — seharusnya sekitar 12. Sebabnya `Quiz.buat()` mengundi ulang keluarga pada setiap
percobaan, sehingga keluarga yang lebih sering gagal menyusun pengecoh tergantikan
keluarga lain; `silang` berhasil pada percobaan pertama hanya 58% berbanding 99% milik
`zigzag`. Ini bias yang sama persis dengan yang sudah diperbaiki di `families.js`, muncul
lagi satu tingkat di atasnya. Keluarga kini diundi **sekali di luar gelung percobaan**.

**Benih yang dicatat tidak membuat ulang soalnya.** Setelah perbaikan di atas, nomor
benih yang tercetak di bank soal ternyata benih PERCOBAAN, bukan benih awal — dan sejak
keluarga diundi dari benih awal, benih percobaan tidak lagi cukup untuk memanggil soal
yang sama: 19 dari 100 soal terulang berbeda. Yang dicatat kini **benih awal**, satu
angka yang menentukan seluruh rangkaiannya. Diperiksa `uji/soal.js` nomor 11: 96/96
soal terulang persis, dan sebaran keluarganya χ² 8,67 (ambang 14,07).

Alat bantu lain:

```bash
node uji/pratinjau.js [berkas] [benih] [tipe] [keluarga]   # contoh soal dalam HTML
node uji/halaman.js                                        # pratinjau HALAMAN PDF
node uji/server.js 8137                                    # peladen berkas statis
```

`uji/halaman.js` menempatkan tiap gambar pada kotak 1440 × 810 memakai perhitungan
pemaskan yang sama persis dengan `pdf.js`, sehingga terlihat apakah gambar tercetak
terlalu kecil atau melebar keluar batas — hal yang tidak kelihatan kalau yang diperiksa
hanya gambarnya sendiri di luar halaman.

## Yang diperiksa pada berkas jadinya

Berkas keluarannya diperiksa dengan alat di luar penyusunnya sendiri:

| Yang diperiksa | Hasil |
|---|---|
| PDF terbaca `pdftotext` | ya, 8 blok soal utuh |
| jumlah halaman | 32 dari 8 soal (empat per soal) |
| ukuran halaman | 32/32 berukuran 1440 × 810 pt |
| kunci per soal | 8/8 punya baris `Jawaban:` |
| alasan per soal | 8/8 punya empat alasan, 0 pasang yang kembar |
| .docx dibaca pembaca ZIP .NET | 29 entri, tanpa galat |
| gambar tersemat | 24 (tiga per soal), 0 pasang berukuran sama |

Contohnya tersedia di folder ini:

| Berkas | Isi |
|---|---|
| `contoh-keluaran.pdf` | 8 soal campuran, 32 halaman |
| `contoh-keluaran.docx` | 8 soal yang sama dalam format Word |
| `contoh-keluaran.html` | 96 soal — keempat submateri × kedelapan keluarga × ketiga tingkat, lengkap dengan pembahasan dan gambar pembahasannya |

Ketiganya ikut berubah setiap kali generatornya diubah, jadi jangan dijadikan acuan
tanpa dibuat ulang: `node uji/pratinjau.js contoh-keluaran.html 12000` untuk yang HTML,
dan tombol *Unduh PDF* / *Unduh Word* untuk keduanya.

## Catatan

- Bentuk dipakai **hitam-putih**. Warna tidak menambah apa pun pada soal jenis ini dan
  gambar hitam-putih membuat berkas PDF-nya sepertiga lebih kecil.
- Relasi "sesuai" adalah **rotasi murni**. Pencerminan selalu salah — mengubahnya
  berarti pengecoh cermin tidak bisa dipakai lagi dan seluruh strategi pengecohnya
  harus disusun ulang.
- Bentuk cadangan (bingkai bersarang tiga lapis) disiapkan kalau 24 percobaan acak
  gagal semua. Sejauh diukur pada 400 bentuk belum pernah terpakai, tetapi generator
  tidak boleh mengembalikan bentuk yang tidak sah hanya karena sedang sial.
