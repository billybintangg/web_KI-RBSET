# web_KI-RBSET

## Menjalankan

Gunakan Node.js dan `npm ci`. Struktur `api/analytics.js` memerlukan hosting yang menjalankan fungsi Node.js, misalnya Vercel. Untuk pengujian lokal dengan Vercel CLI gunakan `npx vercel dev`. Server statis Python atau GitHub Pages tidak menjalankan endpoint ini.

## Konfigurasi analytics di server

Pasang variabel berikut melalui pengaturan environment hosting; jangan masukkan nilainya ke HTML atau Git:

- `GA_PROPERTY_ID`: ID numerik properti GA4, bukan Measurement ID berawalan G-.
- `GA_CLIENT_EMAIL`: email service account.
- `GA_PRIVATE_KEY_BASE64`: private key PEM dari service account yang dienkode Base64.

Aktifkan Google Analytics Data API di proyek Google Cloud service account. Tambahkan email service account sebagai Viewer pada properti GA4 yang sama. Setelah mengubah environment hosting, deploy ulang. Jangan kirim private key melalui percakapan.

Panduan resmi: https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart

## Arti data

Kartu dan daftar negara menggunakan `/api/analytics`, metrik `totalUsers`, periode 1 Januari 2026 sampai hari ini. Total pengguna diambil tanpa dimensi negara agar pengguna lintas negara tidak dijumlahkan berulang. Persentase negara memakai jumlah hitungan negara sebagai pembagi. Negara tak diketahui ditampilkan tetapi tidak dihitung sebagai negara teridentifikasi.

Peta tetap laporan Looker Studio terpisah. Samakan properti, metrik Total users, periode, dan filter di laporan tersebut jika ingin membandingkan angkanya. Label tidak lagi mengklaim realtime. API dapat di-cache satu jam.

## Pengujian

Jalankan `npm test`: pengujian menggunakan respons Google Analytics tiruan, bukan akun asli.

Pada hosting sebenarnya, buka `/api/analytics`: respons 200 harus berisi `totalUsers`, `totalCountries`, dan `countries`. Respons 503 menunjukkan konfigurasi wajib belum lengkap; 502 menunjukkan permintaan Google Analytics gagal. Periksa akses properti, API, kredensial, dan log server tanpa membagikan secret.

Uji halaman di desktop dan ponsel. Pastikan data tampil, kondisi kosong menampilkan nol, serta tombol Try again berfungsi setelah gangguan pulih. Pengujian browser dan koneksi akun GA asli masih harus dilakukan.
