# Aturan workflow flight charter

## State yang dipakai P0

`DRAFT → PENDING_READINESS → READY_FOR_OCC_REVIEW → READY_FOR_APPROVAL → APPROVED → SCHEDULED → CHECK_IN_OPEN → CHECK_IN_CLOSED → READY_FOR_DEPARTURE → IN_PROGRESS → LANDED → PENDING_CLOSURE → CLOSED`. Hasil evaluasi gagal menjadi `BLOCKED`, kemudian dievaluasi kembali setelah evidence diperbaiki. Cancel/divert/reopen/reapproval di luar P0; jika perubahan setelah approval membatalkan snapshot, command berikutnya ditolak sampai approval diperbarui menurut service sumber.

| Langkah              | Gate minimum dan alasan penolakan                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submit/evaluate      | Route, aircraft, crew, schedule/capacity, readiness checks, dan evidence planning dihitung server; hasil menyertakan blocker.                                                                                                                                                                                                     |
| Accept readiness     | Flight ready; actor bukan creator; `readinessRevision` dan `expectedVersion` masih cocok; simpan snapshot/hash.                                                                                                                                                                                                                   |
| Approve              | Acceptance OCC masih berlaku, approver berbeda sesuai separation of duties, snapshot tidak berubah.                                                                                                                                                                                                                               |
| Schedule/check-in    | State sebelumnya benar dan versi cocok; origin station benar.                                                                                                                                                                                                                                                                     |
| Close check-in       | Manifest dan aktual penumpang konsisten; `expectedUpdatedAt` cocok.                                                                                                                                                                                                                                                               |
| Ready/depart         | Critical readiness dihitung ulang pada saat command. Fuel, manifest, station dan aircraft/crew yang berubah dapat menolak departure.                                                                                                                                                                                              |
| Land/pending closure | Actual time valid, destination station sesuai actor.                                                                                                                                                                                                                                                                              |
| Close                | Actual departure/arrival terisi; semua manifest `APPROVED`/`LOCKED`; minimal satu fuel `UPLIFTED`/`POSTED`; semua station service `VERIFIED`/`CONFIRMED`; setiap cost non-void `APPROVED` dengan finance handoff `READY`/`POSTED`; maintenance handoff approved untuk aircraft flight; customer dan estimated/actual revenue ada. |

Daftar closure di atas diturunkan dari `FlightOperationsService.closureReadiness`. Rincian departure assurance yang lebih luas di service lama perlu dipilih sesuai seed P0; jangan menandai gate yang belum dievaluasi sebagai `PASS`. Seed non-DG memungkinkan DG dinyatakan `NOT_APPLICABLE` dengan alasan, bukan menghilangkan check secara diam-diam.

## Aktor

Demo Admin untuk reset/administrasi seed; OCC untuk submit/evaluate/accept; Director untuk final approval; Station Admin dengan scope origin/destination untuk fuel dan movement/station evidence; Maintenance Manager untuk handoff; Finance Reviewer untuk station cost approval. Permission spesifik mengikuti tabel API, bukan nama role di UI. Actor yang membuat approval tidak boleh menjadi approver jika aturan sumber melarang; uji ini pada service dan HTTP.

## Efek data

Setiap transisi menulis status, version, audit event dan request ID dalam transaksi. Perubahan pada evidence penting menaikkan readiness revision dan dapat membatalkan approval. Station cost yang approved menghasilkan finance handoff; handoff tersebut harus siap sebelum closure. Closure membuat invoice draft, lines dan snapshot tepat satu kali per flight; `CLOSED` yang diulang mengembalikan flight/invoice yang sudah ada. Accounting ledger dan payment tidak dibuat dalam P0.

## Blocker yang bisa didemokan

- Flight dengan crew/aircraft tidak layak gagal readiness; perbaikan memakai data/evidence seeded yang sudah ditentukan, atau contoh tetap berhenti pada penolakan.
- Flight dengan station cost `DRAFT` gagal closure dengan daftar item yang hilang. Station Admin submit, Finance Reviewer approve, lalu retry closure berhasil bila handoff siap.
- Actor station lain mendapat 403 sebelum mutasi.
- Versi lama mendapat 409; layar mengambil detail baru sebelum mengulang.
