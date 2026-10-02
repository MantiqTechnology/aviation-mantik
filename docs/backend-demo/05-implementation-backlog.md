# Backlog implementasi backend Go

Setiap tahap menghasilkan kode, dokumen yang diperbarui, dan bukti uji. Stage A harus selesai sebelum menambahkan route Go agar DTO tidak ditebak dari nama endpoint saja.

| Tahap                  | Tugas                                                                                                                                                                 | Exit criteria                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A — kontrak            | Audit pemanggil UI P0, tetapkan field DTO/filter/dashboard, cek semua gate yang dipakai seed, lalu buat OpenAPI dari [referensi API](03-api-reference.md).            | Setiap kontrol aktif punya handler target, field, role, dan fixture; tidak ada route `TODO` yang tampak di UI. |
| B — fondasi            | Buat module Go, chi router, pgxpool, Goose migration, config, envelope/error, request ID, health, slog, graceful shutdown, session demo dan permission/station scope. | `go test ./...` dan smoke login/session/logout berjalan pada database baru.                                    |
| C — flight/readiness   | Port lookup, list/detail, approval snapshot, submit/evaluate/accept/approve/schedule.                                                                                 | Flight blocked ditolak dan approval lama menjadi tidak berlaku setelah perubahan evidence.                     |
| D — support/movement   | Port manifest non-DG, fuel, station service/cost, maintenance handoff, finance handoff, check-in/depart/land.                                                         | Gate departure gagal saat evidence hilang dan lolos setelah perbaikan; semua aksi tercatat.                    |
| E — closure/read model | Port pending closure/close, invoice draft, audit, dashboard.                                                                                                          | Satu invoice per flight termasuk retry/concurrency; dashboard cocok dengan detail.                             |
| F — integrasi          | Atur proxy Nuxt untuk P0, sembunyikan aksi non-P0, seed/reset CLI, walkthrough UI.                                                                                    | Satu sesi demo end-to-end tanpa database flight ganda.                                                         |

Urutan dependensi: B → C → D → E → F; A mendahului semuanya. A mencatat keputusan field minimal pada OpenAPI; jika UI membutuhkan create/edit flight atau dokumen/upload, masukkan task tambahan sebelum F dan revisi keputusan scope. Jangan memasukkan P1 secara diam-diam.

Pembagian PR yang disarankan mengikuti tahap B–F. Setiap PR menyertakan migration/tes yang relevan dan tidak mengubah baseline SQLite lama. Cabang Go dapat berada di direktori layanan baru agar proxy Nuxt bisa diaktifkan bertahap.
