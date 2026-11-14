# Aturan tutur

`../kinship.ts` tetap menjadi API publik untuk pemanggil yang sudah ada.

## Mengubah sapaan atau aturan

Edit hanya file tradisi yang dituju:

- `traditions/mandailing.ts`: Mandailing / Angkola.
- `traditions/batak.ts`: Batak Toba.
- `traditions/indonesia.ts`: Bahasa Indonesia.
- `traditions/jawa.ts`: Jawa.

Masing-masing file memiliki seluruh aturan dan kosakatanya sendiri. Tidak ada pewarisan,
spread, atau impor dari tradisi lain. Kemiripan aturan Mandailing dan Batak sengaja tetap
terpisah agar perubahan salah satunya tidak mengubah yang lain. `types.ts` hanya menetapkan
kontrak aturan dan helper pemilihan gender, bukan kosakata bersama.

Untuk menambah tradisi, buat file yang memenuhi `Tradition`, lalu daftarkan di `registry.ts`.
`TuturMode` dan pilihan popup otomatis mengikuti registry. Tambahkan ekspektasi di tes.

## Mesin relasi

- `graph.ts`: indeks orang, orang tua, anak, saudara, pasangan, dan jarak BFS.
- `resolve.ts`: pencarian jalur, prioritas hubungan, dan cache hasil per fokus/mode.
- `labels.ts`: klasifikasi jalur menjadi peran, lalu memanggil aturan tradisi terpilih.
- `age.ts`: perbandingan umur, termasuk tanggal lahir parsial.

Graf dan jarak BFS digunakan kembali ketika fokus/mode berubah. Cache memakai identitas
`FamilyData` melalui `WeakMap`; perubahan data harus menghasilkan objek baru, sesuai store.
Cache hasil label tetap dibatasi 16 kombinasi fokus/mode per keluarga. Urutan kandidat dan
prioritas jalur lama dipertahankan agar refactor tidak mengubah hasil sapaan.

Jalankan `npm run test:kinship`, `npm run test:focus`, `npm run test:relationships`, dan
`npm run test:layout`. Tes kinship memeriksa isolasi tradisi serta penggunaan ulang cache.
