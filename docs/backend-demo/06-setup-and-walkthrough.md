# Setup dan walkthrough demo Go

Dokumen ini adalah resep target. Perintah final harus disesuaikan dengan nama binary dan diuji setelah tahap B–F ada; saat ini repository belum memiliki layanan Go P0.

## Setup target

1. Pasang toolchain Go sesuai `go.mod` akhir dan jalankan PostgreSQL lokal khusus demo.
2. Buat database demo dan set `DATABASE_URL`, `DEMO_MODE=true`, `DEMO_SEED_DATE`, serta alamat listen API pada `.env` lokal. Jangan commit password.
3. Jalankan Goose migration melalui command proyek; jalankan `cmd/demo seed` atau `reset` secara eksplisit.
4. Start API Go dan Nuxt dengan proxy `/api` P0 ke Go. Health harus menyatakan database siap.
5. Login dengan actor fiktif seed. Pastikan browser menerima cookie HttpOnly dan `/api/auth/session` mengembalikan actor/role/station yang benar.

## Walkthrough 10–15 menit

1. OCC membuka flight charter seed di daftar. Dashboard dan detail menampilkan flight ID dan status yang sama.
2. OCC submit/evaluate readiness. Jika flight P0 happy path butuh evidence, selesaikan dari kontrol support yang tersedia, lalu evaluate ulang. OCC menerima readiness.
3. Director menyetujui flight. Station Admin origin menjadwalkan, membuka/menutup check-in, memastikan manifest/fuel/station readiness, lalu menandai ready dan depart.
4. Station Admin destination mencatat landing. Maintenance Manager menyetujui handoff yang cocok dengan aircraft.
5. Station Admin menyelesaikan service dan mengajukan biaya aktual; Finance Reviewer menyetujui biaya. Pastikan finance handoff `READY`/`POSTED`.
6. Actor berizin memindah ke pending closure dan menutup flight. Detail, dashboard, audit, dan invoice menunjukkan status konsisten serta satu invoice draft.
7. Ulangi close: jumlah invoice tetap satu. Tunjukkan flight blocker dan upaya actor salah untuk membuktikan gate/permission.
8. Reset melalui CLI demo; jalankan lagi dan periksa ID/status awal identik.

Saat merekam atau mempresentasikan, jangan menyebut tracking simulasi sebagai data pesawat nyata. P0 tidak menunjukkan pembayaran atau jurnal accounting.
