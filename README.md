# Kopi Tutug - Kasir

Aplikasi kasir untuk kafe: penjualan, menu dan stok, kas masuk/keluar, piutang, laporan, backup dan restore.

## Cara menjalankan

1. Buka folder ini di VS Code.
2. Pasang ekstensi **Live Server**, lalu klik kanan `index.html` dan pilih **Open with Live Server**.
   Bisa juga langsung klik dua kali `index.html` untuk membukanya di browser.
3. Masuk dengan PIN awal `1234`, lalu ganti PIN di menu Pengaturan.
4. Tambahkan menu di **Menu & Stok**, lalu mulai berjualan di **Penjualan**.

Jika kamu membuka versi sebelumnya dan masih ada menu atau transaksi contoh, buka **Pengaturan** lalu tekan **Hapus data contoh**.

Tidak perlu install apa pun. Font dan pustaka Excel (SheetJS) dimuat dari internet, jadi butuh koneksi saat dibuka. Tanpa internet, aplikasi tetap jalan kecuali tombol **Unduh Excel**.

## Struktur

- `index.html` : kerangka halaman
- `style.css`  : tampilan (warna dan font ada di token `:root` bagian atas)
- `app.js`     : seluruh logika aplikasi

## Penyimpanan data

Data disimpan di `localStorage` browser dan terikat ke alamat yang dipakai. Membuka lewat Live Server
(`127.0.0.1:5500`) dan lewat file langsung dianggap tempat penyimpanan yang berbeda. Pilih satu cara
dan konsisten. Unduh backup JSON dari menu **Backup & Restore** secara berkala.

## Yang bisa diubah dengan cepat

- Menu: tambahkan lewat menu **Menu & Stok** di dalam aplikasi (aplikasi mulai kosong)
- Warna: token di `:root` pada `style.css`
- Nama usaha, pajak, PIN, gambar QRIS: menu Pengaturan di dalam aplikasi

## Fitur penting

- **Konfirmasi:** setiap transaksi baru menampilkan ringkasan (item, total, uang diterima, kembalian) dan harus dikonfirmasi sebelum disimpan.
- **Uang diterima:** diketik sendiri, tanpa tombol pilihan cepat. Jumlah yang kurang dari total ditolak.
- **Open Bill:** pilih metode "Open Bill" di Penjualan untuk menyimpan pesanan yang dibayar belakangan. Kelola di menu Open Bill: tambah item, bayar, atau batalkan. Omzet dan kas baru tercatat saat open bill dibayar.
- **Unduh Excel:** di menu Laporan, satu file berisi sheet Ringkasan, Penjualan, Rincian Item, Kas, Open Bill, dan Stok untuk periode yang dipilih.

## Reseller

- Menu **Reseller** di sidebar: isinya sama seperti Penjualan, tapi ada minimal ambil dan diskon grosir. Riwayatnya terpisah dari penjualan biasa.
- Aturan diatur di **Pengaturan > Aturan Reseller**: minimal ambil (default 10 item), diskon jika lebih dari (default 20 item), jenis diskon (persen atau rupiah per item) dan besarnya.
- Jumlah dihitung dari total semua item dalam satu transaksi. Di bawah minimal, transaksi ditolak.
- Excel laporan punya kolom Tipe (Reseller/Eceran) dan Diskon.

## Cetak struk thermal

- Pengaturan > Printer Thermal: pilih lebar kertas 58 mm atau 80 mm, tekan **Hubungkan Bluetooth**, lalu **Cetak tes**.
- Tombol **Cetak** di struk punya tiga cara: Bluetooth langsung (printer BLE, Chrome/Edge), aplikasi RawBT (Android), atau cetak lewat browser.
- Bluetooth langsung butuh HTTPS (Vercel sudah HTTPS) dan tidak jalan di iPhone/Safari.

## Tiga jalur penjualan: Eceran, Reseller, Distributor

- Sidebar punya grup **Reseller** dan **Distributor**, masing-masing berisi *Penjualan* dan *Menu & Stok* sendiri. Menu, harga, dan stok tiap jalur terpisah dari penjualan biasa.
- Harga di tiap Menu & Stok adalah harga jalur itu. Isi juga **harga grosir** (berlaku jika total item lebih dari batas) dan **minimal beli** per menu, semuanya kamu yang tentukan.
- Minimal ambil umum dan batas harga grosir diatur di Pengaturan (Aturan Reseller dan Aturan Distributor).
- Riwayat, struk, dan kolom Tipe di Excel membedakan ketiga jalur.

## Hapus menu

Di Menu & Stok ada tombol **Hapus** untuk menghapus menu permanen (beda dengan Arsipkan). Riwayat transaksi lama tetap menyimpan nama dan harganya.

## Pasang sebagai aplikasi di HP

Buka alamat Vercel di Chrome Android, menu titik tiga, **Install app / Tambahkan ke layar utama**. Di iPhone: Safari, Bagikan, **Tambah ke Layar Utama**. Ikon bawaan ada di folder `icons/` (ganti dengan logomu, ukuran 192 dan 512 px).
