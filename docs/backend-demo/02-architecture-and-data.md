# Arsitektur dan model data P0

## Alur request

Browser → Nuxt same-origin proxy → Go chi router → session/permission middleware → handler JSON → service domain → pgx transaction/repository → PostgreSQL. Service mengembalikan DTO; handler membungkusnya dalam envelope API. Semua command yang mengubah flight, audit, support, atau invoice memakai satu transaksi PostgreSQL. Dashboard membaca state kanonis dan tidak menyimpan status flight kedua.

Susunan paket: `cmd/api`, `cmd/demo`, `internal/config`, `internal/httpapi`, `internal/auth`, `internal/flight`, `internal/support`, `internal/invoice`, `internal/dashboard`, `internal/database`, dan `migrations`. Wiring manual di `cmd/api`; satu pool pgx; dependency diberikan lewat constructor sederhana. Endpoint health boleh memeriksa koneksi database, tetapi tidak membocorkan DSN atau data pengguna.

## Entitas dan relasi minimum

| Tabel rencana                                            | Isi minimum / constraint                                                                                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo_actors`, `demo_sessions`                           | actor, role, station scope, password hash; token session disimpan sebagai hash, expired dan revoked.                                                     |
| `stations`, `routes`, `aircraft`, `crews`, `customers`   | lookup seeded; FK dari flight, tanpa CRUD master data P0.                                                                                                |
| `flight_operations`                                      | ID string PK, nomor unik, tanggal/rute/customer/aircraft/crew, status, versi, readiness revision, actual times, estimated revenue minor units, currency. |
| `flight_readiness_checks`, `flight_approvals`            | code/status/evidence/revision, actor approval, snapshot hash dan invalidation.                                                                           |
| `flight_manifests`, `flight_manifest_passengers`         | satu manifest jenis passenger per flight; status, version, passenger seed.                                                                               |
| `flight_fuel_requests`                                   | flight/station, quantity, status, measured uplift, actor/time, version.                                                                                  |
| `flight_station_services`, `flight_station_costs`        | completion/verification, vendor/evidence reference, actual amount, approval, version.                                                                    |
| `flight_maintenance_handoffs`, `flight_finance_handoffs` | approved maintenance untuk aircraft yang sama; finance handoff untuk station cost approved.                                                              |
| `invoices`, `invoice_lines`                              | `flight_operation_id` unik; customer, currency, amount, status `draft`, source snapshot.                                                                 |
| `flight_audit_events`, `flight_action_commands`          | actor/action/request ID/before-after/waktu; idempotency key unik dan hasil command.                                                                      |

Nama tabel final boleh mengikuti skema sumber jika mengurangi pemetaan; relasi di atas wajib. Indeks pada semua FK dan filter dashboard/list; unique pada nomor flight, manifest `(flight_id,type)`, invoice `flight_operation_id`, serta idempotency key. Constraint amount `>= 0` untuk nilai yang tidak boleh negatif; FK enforced. Gunakan `text` untuk ID lama, `timestamptz` untuk waktu, `date` untuk flight date, dan `bigint` untuk uang minor units. Quantity fuel boleh `numeric` dengan skala yang ditentukan migration, tidak float untuk nilai biaya.

## Transaksi dan concurrency

Lock baris flight (`SELECT ... FOR UPDATE`) sebelum lifecycle command. Verifikasi versi, permission domain, state, readiness, dan support terkini dalam transaksi yang sama. Increment versi, tulis audit, dan simpan hasil idempotency sebelum commit. Untuk closure, buat invoice draft dan invoice lines dalam transaksi flight yang sama; unique index `invoices.flight_operation_id` melindungi retry bersamaan. Jika key yang sama dipakai untuk perintah lain, kembalikan 409. Jika request memakai versi basi, kembalikan 409 dengan versi terkini dan petunjuk refresh.

Perubahan support yang memengaruhi readiness menaikkan `readiness_revision` dan membatalkan approval/snapshot terkait. Departure menghitung ulang gate kritis walaupun layar sebelumnya menyatakan siap. Jangan membuat write async untuk data yang menentukan gate P0.

## Seed dan migrasi

Goose migration membuat skema kosong. `cmd/demo seed` memasukkan lookup, actor, dan tiga flight dengan fixed seed date; `cmd/demo reset` hanya berjalan bila `DEMO_MODE=true` dan database target teridentifikasi sebagai database demo. Reset menghancurkan data target dan harus menjadi perintah eksplisit. Upsert atau truncate dalam transaksi agar pengulangan menghasilkan ID yang sama. API startup hanya memverifikasi migration tersedia; tidak menjalankan reset.

## Auth dan operasional minimum

Login menghasilkan token acak 32 byte; browser menerima cookie HttpOnly, SameSite=Lax, Secure saat HTTPS, Path=/; database hanya menyimpan hash SHA-256 token. Password actor seed menggunakan Argon2id atau bcrypt bila library ditambahkan pada implementasi; parameter hash dan versi library ditetapkan pada bootstrap setelah verifikasi toolchain. Session punya expiry dan logout menghapus/revoke token. Mutasi memeriksa Origin same-origin dan permission/station scope, membatasi body, serta log tidak memuat password/token. Gunakan request ID, log terstruktur `slog`, timeout server, dan graceful shutdown.

Nuxt proxy mengalihkan hanya route P0. Seluruh write flight/support/invoice P0 menuju Go; layar modul yang belum dipindahkan disembunyikan atau dipisah dari walkthrough. Saat migrasi, tidak ada sinkronisasi dua database untuk Flight Order.
