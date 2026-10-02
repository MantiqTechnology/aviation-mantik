# Backend demo Go: paket spesifikasi flight charter

Paket ini adalah spesifikasi implementasi, bukan laporan backend Go yang sudah berjalan. Baca berurutan:

1. [Keputusan scope](00-scope-and-decisions.md) — alasan memilih alur demo dan batas parity.
2. [Peta kode sumber](01-source-to-go-map.md) — asal route, kontrak, aturan, dan consumer.
3. [Arsitektur dan data](02-architecture-and-data.md) — layanan Go, PostgreSQL, transaksi, seed, integrasi Nuxt.
4. [Referensi API](03-api-reference.md) — route dan bentuk permintaan/respons P0.
5. [Aturan workflow](04-workflow-rules.md) — transisi, gate, role, retry, dan efek closure.
6. [Backlog implementasi](05-implementation-backlog.md) — urutan tugas dan exit criteria.
7. [Setup dan walkthrough](06-setup-and-walkthrough.md) — resep lingkungan demo dan skenario.
8. [Verifikasi](07-verification.md) — tes penerimaan dan traceability.

[OpenAPI draft](openapi-draft.yaml) mencatat seluruh route kandidat P0. Schema `Payload` dan respons envelope masih placeholder; tahap A backlog wajib menggantinya dengan DTO yang sudah diaudit sebelum kontrak dipakai untuk code generation atau pengujian kontrak.

[Planning awal](../backend-demo-go-planning.md) mencatat pertimbangan dan backlog yang lebih luas. Kode Nuxt/TypeScript di repository ini adalah sumber rujukan perilaku saat spesifikasi ditulis. Jika kontrak frontend berubah sebelum port Go dimulai, perbarui peta sumber dan kontrak API bersama-sama.
