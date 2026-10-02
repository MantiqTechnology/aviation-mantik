# Verifikasi implementasi P0

Status saat dokumen dibuat: rencana uji; belum ada binary Go atau hasil eksekusi. Setiap check di bawah menjadi syarat sebelum menyatakan port selesai.

| Area       | Tes dan hasil yang diharapkan                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain  | `go version`, `go mod tidy`, `go test ./...`, build binary, Goose up/down pada DB kosong sukses; versi Go/dependency tercatat.          |
| Seed       | Reset dua kali menghasilkan ID dan referensi sama; startup API tidak menghapus data.                                                    |
| Auth       | Login valid, salah, expired, logout, Origin salah; 401/403 sesuai kontrak; cookie dan token tidak bocor ke log.                         |
| Permission | OCC/Director/Station/Maintenance/Finance hanya dapat aksi yang diberikan; station lain ditolak.                                         |
| Readiness  | Blocker aircraft/crew/evidence terlihat; approval creator sendiri ditolak; perubahan support membuat snapshot approval basi.            |
| Lifecycle  | State salah ditolak 409; body/versi salah 400/422/409; departure melakukan revalidasi server.                                           |
| Support    | Manifest final, fuel actual uplift, station cost + handoff, maintenance aircraft match membentuk closure readiness sesuai service.      |
| Closure    | Biaya draft memblokir; approval/handoff membuka gate; dua request close bersamaan menghasilkan satu invoice dan satu set line/snapshot. |
| Read model | Detail, dashboard, audit, invoice menunjuk `flightOperationId` dan status/amount yang sama.                                             |
| Frontend   | Browser melalui proxy menjalankan walkthrough dengan semua kontrol aktif; tak ada panggilan P0 yang jatuh ke SQLite lama.               |

Tes unit memakai `testing` untuk state/permission/gate; HTTP memakai `httptest`; integration memakai PostgreSQL test yang diisolasi; UI smoke memakai Playwright yang sudah ada atau skenario baru khusus port. Catat hasil command, tanggal, database, jumlah test, dan batas parity di PR. Test suite legacy Nuxt tetap berguna untuk membandingkan perilaku, tetapi bukan syarat untuk menyatakan seluruh produk sudah dipindahkan.

Sebelum menutup tahap A, buat matriks requirement → route → service rule → test case untuk setiap baris [referensi API](03-api-reference.md). Spec OpenAPI harus divalidasi dan contoh request/respons dijalankan pada API Go setelah route tersedia; dokumen ini sendiri belum membuktikan kompatibilitas runtime.
