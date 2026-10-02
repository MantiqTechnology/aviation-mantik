# Planning dokumentasi backend demo Go

Status: usulan scope dan outline dokumentasi, belum spesifikasi implementasi final.
Tanggal: 2 Oktober 2026.
Target pembaca: developer backend Go, developer frontend Nuxt, dan reviewer demo.
Target module: `github.com/MantiqTechnology/AMA-System`.
Target toolchain dari pengguna: `go 1.26.4`; ketersediaan toolchain dan kompatibilitas versi dependency perlu diperiksa saat bootstrap.

Paket spesifikasi hasil planning ini tersedia di [backend-demo/README.md](backend-demo/README.md). File ini tetap menjadi catatan keputusan awal dan alternatif scope.

## 1. Tujuan dan batas pekerjaan

Membuat acuan untuk backend demo Go yang menyimpan transaksi dan menjalankan aturan bisnis penting dari backend saat ini. Keberhasilan diukur dengan satu walkthrough operasional yang konsisten dari flight sampai closure dan draft invoice, bukan jumlah modul yang dipindahkan.

Dokumen ini adalah rencana pembuatan dokumentasi: keputusan awal, prioritas, outline setiap dokumen, urutan pengerjaan, dan acceptance criteria. OpenAPI lengkap, DDL final, contoh request seluruh endpoint, serta runbook yang sudah terbukti dijalankan ditulis pada tahap berikutnya berdasarkan outline ini.

Asumsi: frontend Nuxt tetap digunakan; demo satu operator, satu instance API, satu PostgreSQL; data fiktif; pemindahan backend bertahap. Scope minimum dimulai dari Flight Order yang sudah di-seed. Flight Request conversion dan ticketing tidak menjadi syarat demo pertama.

## 2. Temuan kode yang menjadi dasar

| Bukti di repository                                                                            | Implikasi planning                                                                                                               |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `server/api/` berisi 669 file route saat inspeksi                                              | Jangan melakukan port seluruh endpoint satu per satu.                                                                            |
| `server/services/flight-operations.service.ts`                                                 | Flight lifecycle, readiness, manifest, fuel, station, handoff, dan closure saling bergantung.                                    |
| `server/db/client.ts`                                                                          | Backend aktif yang diperiksa memakai SQLite melalui better-sqlite3/Drizzle; migrasi Go/PostgreSQL memerlukan pemetaan eksplisit. |
| `server/db/postgres/migrations/0001_neon_v2_baseline.sql`                                      | Tersedia baseline PostgreSQL sebagai referensi; jangan mengambil seluruh skema sebagai scope demo otomatis.                      |
| `shared/contracts/flight-operations.ts`, `shared/contracts/api.ts`                             | DTO dan envelope menjadi titik awal kontrak frontend.                                                                            |
| `server/utils/api-response.ts`                                                                 | Pertahankan `ok`, `data`/`error`, dan `meta.requestId`/`demoMode`.                                                               |
| `server/api/auth/login.post.ts`, `server/middleware/01-demo-auth.ts`, `shared/types/roles.ts`  | Sudah ada login session, permission, dan pembatasan origin; role bukan sekadar tampilan UI.                                      |
| `server/api/flight-operations/flights/[id]/actions/depart.post.ts`                             | Departure memeriksa permission, station access, dan readiness ulang.                                                             |
| `server/api/flight-operations/flights/[id]/actions/close.post.ts`                              | Closure adalah command dengan persyaratan, bukan update status bebas.                                                            |
| `server/features/finance/invoices/service.ts`                                                  | Invoice merupakan dependensi workflow flight yang perlu dipilih sebagian.                                                        |
| `docs/demo-scenarios.md`, `tests/api/flight-operations.test.ts`, `tests/api/ticketing.test.ts` | Runbook dan tes menyediakan kandidat skenario dan aturan yang harus ditelusuri.                                                  |

Daftar ini hasil inspeksi terarah, bukan audit seluruh 669 handler. Referensi kontrak lama sudah dihapus karena contoh auth-nya masih mencantumkan role switching, sedangkan handler yang diperiksa menggunakan login. Kontrak final harus mengikuti handler, schema, service, dan pemanggil frontend yang aktif.

## 3. Apa yang memang perlu menjadi API

Gunakan API untuk operasi yang menyimpan state bersama, menjaga konsistensi lintas modul, membatasi akses, atau menghitung hasil dari transaksi tersimpan. Layout, navigasi, formatting angka/tanggal, chart configuration, dan konten presentasi statis tetap di frontend.

| Prioritas | Kapabilitas                                                                                                               | Mengapa masuk / batas                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P0        | Login, session, logout, permission dan station scope                                                                      | Identitas actor dan pembatasan command harus diputuskan server.                                                                             |
| P0        | Lookup aircraft, crew, station, route, customer                                                                           | Read-only untuk flight dan validasi; tidak perlu CRUD seluruh master data.                                                                  |
| P0        | List/detail Flight Order dan lifecycle command                                                                            | Flight menjadi parent kanonis semua transaksi terkait. Mulai dari data seed; create/edit ditambahkan hanya jika walkthrough membutuhkannya. |
| P0        | Readiness dan blocker recovery                                                                                            | Server menghitung apakah flight bisa dilanjutkan dan alasan penolakannya.                                                                   |
| P0        | Manifest, fuel, station service/cost, maintenance coordination, finance handoff                                           | Subset wajib untuk memenuhi gate departure dan closure. Semua prerequisite yang diwajibkan harus punya cara penyelesaian dalam demo.        |
| P0        | Closure, draft invoice, history/audit                                                                                     | Menunjukkan hasil alur end-to-end dan mencegah invoice ganda.                                                                               |
| P0        | Satu dashboard ringkasan                                                                                                  | Angka berasal dari state flight dan transaksi yang sama.                                                                                    |
| P0        | Seed/reset via CLI                                                                                                        | Demo dapat diulang; reset tidak perlu endpoint publik.                                                                                      |
| P1        | Flight Request submit/decision/convert                                                                                    | Dibangun sesudah P0; convert harus mengembalikan flight yang sama ketika diulang.                                                           |
| P1        | Passenger booking, check-in, sinkronisasi manifest                                                                        | Tambahkan jika walkthrough mencakup penjualan; kapasitas/seat perlu transaksi.                                                              |
| P1        | Invoice approval dan record payment sederhana                                                                             | Diperlukan bila demo harus sampai pembayaran; bukan syarat draft invoice P0.                                                                |
| P1        | Upload evidence lokal dan tracking simulasi                                                                               | Hanya jika layar presentasi membutuhkannya; tracking tetap berlabel simulasi.                                                               |
| Ditunda   | Cargo DG/refund/reschedule lengkap, full MRO, inventory procurement, HRIS/payroll, SMS, asset management, full accounting | Besar dan tidak wajib bagi alur inti yang dipilih.                                                                                          |
| Ditunda   | IoT real-time, Kafka, ClickHouse, SSO, policy engine, integrasi eksternal                                                 | Infrastruktur tambahan tanpa kebutuhan demo awal yang jelas.                                                                                |

P0 tetap harus kecil: satu rute flight charter non-DG, lookup seed, satu set station service, satu fuel request, satu manifest sederhana, satu biaya aktual, satu maintenance handoff, satu finance handoff. Tidak membuka seluruh variasi bisnis dalam setiap domain.

Pilih subset aturan secara eksplisit. Readiness berbasis data seed harus tetap memeriksa aircraft/crew eligibility, capacity, manifest, fuel, station evidence, serta permission. Full MRO dapat ditunda dengan memakai maintenance coordination yang jelas cakupannya. Jika gate dokumen diwajibkan, sediakan dokumen seed dan endpoint metadata/verification yang cukup; jangan menghilangkan blocker secara diam-diam demi demo.

## 4. Stack minimal yang diusulkan

Satu aplikasi Go dengan handler, service, repository, dan satu PostgreSQL. HTTP JSON sinkron; wiring dependency manual; SQL langsung; transaksi database untuk command penting.

| Kebutuhan         | Pilihan awal                                    | Alasan                                                                  |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| HTTP              | `net/http` + `github.com/go-chi/chi/v5`         | Mudah memetakan route lama dan middleware.                              |
| Database          | `github.com/jackc/pgx/v5` dengan pgxpool        | Sesuai stack pengguna, tanpa ORM.                                       |
| Migration         | `github.com/pressly/goose/v3`                   | Migration SQL eksplisit dan CLI terpisah dari startup API.              |
| Logging           | Standard library `log/slog`                     | Cukup untuk JSON log dan request ID.                                    |
| Config            | `os.LookupEnv` + struct                         | Tidak memerlukan Viper.                                                 |
| JSON/validation   | `encoding/json` + validasi struct/domain manual | Validasi required, enum, relasi, waktu, dan batas nilai eksplisit.      |
| ID/session token  | `crypto/rand`, ID string                        | Tetap menerima ID string seed lama; UUID library belum wajib.           |
| Test              | `testing`, `httptest`, PostgreSQL khusus test   | Testcontainers/testify hanya jika ada kebutuhan nyata.                  |
| API specification | File OpenAPI YAML                               | Penulisan kontrak tidak mengharuskan runtime validator/code generation. |

Dependensi aplikasi minimum: chi dan pgx. Goose menjadi tooling migration; pilih versi dari daftar pengguna sebagai kandidat lalu verifikasi toolchain, resolusi module, build, dan test pada bootstrap. Jangan menyalin semua direct maupun indirect dependency dari stack besar; indirect dependency dikelola melalui `go mod tidy`.

Tidak perlu Fx, Zap, Cerbos, OIDC/OAuth, Kafka/franz-go, ClickHouse, OpenTelemetry SDK/exporter, Prometheus SDK, Moby, JSON Schema engine, atau OpenAPI middleware pada tahap pertama. Menambah salah satunya memerlukan kebutuhan dan acceptance criteria yang konkret.

Struktur awal yang direncanakan:

```text
cmd/api/                 entrypoint HTTP
cmd/demo/                seed dan reset database demo
internal/config/         konfigurasi
internal/httpapi/        router, middleware, envelope
internal/auth/           demo session dan permission
internal/flight/         lifecycle dan readiness
internal/support/        manifest/fuel/station/handoff subset
internal/invoice/        draft invoice
internal/dashboard/      aggregate read model
internal/database/       pool dan transaksi
migrations/              SQL
docs/backend-demo/       dokumentasi implementasi berikutnya
```

## 5. Rencana kontrak API

Pertahankan prefix `/api` dan bentuk envelope agar frontend tidak perlu migrasi total sekaligus. Kelompok berikut kandidat, bukan janji seluruh handler sudah dipetakan:

| Kelompok          | Route yang sudah diperiksa / pola kandidat                                                                                      | Tahap                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Auth              | `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`                                                        | P0                          |
| Lookup            | `GET /api/flight-operations/lookups`                                                                                            | P0                          |
| Flight            | `GET /api/flight-operations/flights`, `GET /api/flight-operations/flights/{id}`                                                 | P0                          |
| Lifecycle         | `POST /api/flight-operations/flights/{id}/actions/{action}`                                                                     | P0; daftar action eksplisit |
| Audit/manifest    | `GET /api/flight-operations/flights/{id}/operational-audit`, `GET .../{id}/manifest`                                            | P0                          |
| Support           | Route lama di `fuel`, `manifests`, `station-services`, `station-costs`, `maintenance`; handoff perlu pemetaan handler/pemanggil | P0 subset                   |
| Invoice           | `GET /api/invoices`, `GET /api/invoices/{id}`                                                                                   | P0                          |
| Dashboard         | `GET /api/flight-operations/dashboard` atau `GET /api/dashboard/operations`, sesuai layar terpilih                              | P0, pilih satu kontrak      |
| Flight Request    | Route lama `requests`; conversion perlu ditelusuri dari service/pemanggil                                                       | P1                          |
| Ticketing/payment | Route lama passenger-tickets/check-in/invoice record-payment                                                                    | P1                          |

Lifecycle normal yang ditemukan di service:

```text
DRAFT → PENDING_READINESS → READY_FOR_OCC_REVIEW
→ READY_FOR_APPROVAL → APPROVED → SCHEDULED
→ CHECK_IN_OPEN → CHECK_IN_CLOSED → READY_FOR_DEPARTURE
→ IN_PROGRESS → LANDED → PENDING_CLOSURE → CLOSED
```

`BLOCKED` adalah cabang readiness. Cancel, divert, reopen, dan reapproval ditunda kecuali dipilih untuk skenario exception. Jangan mengekspos generic status patch. Dokumentasikan mapping state → action → permission → prerequisite → hasil; state ini bukan izin untuk mengasumsikan setiap transition cukup satu endpoint.

Kontrak akhir tiap endpoint wajib memuat: method/path, operation ID, actor/permission/station scope, parameter, body, response DTO dan envelope, status HTTP, error domain, aturan transaksi, perilaku retry, serta consumer frontend. Bedakan 400 malformed JSON, 401 unauthenticated, 403 forbidden, 404 missing, 409 state/concurrency conflict, 422 validation, dan 500 unexpected error.

## 6. Paket dokumentasi yang akan dibuat

Semua file berikut adalah deliverable yang direncanakan, belum dibuat oleh planning ini. Pisahkan explanation, reference, how-to, dan tutorial agar pembaca tidak harus mencari langkah setup di dalam pembahasan arsitektur.

| Urutan / file                             | Jenis              | Outline wajib                                                                                                    | Syarat selesai                                                                                  |
| ----------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1. `00-scope-and-decisions.md`            | Explanation        | Sasaran demo, walkthrough P0, batas modul, P1, keputusan stack, asumsi, daftar keputusan terbuka                 | Setiap fitur memiliki alasan masuk/ditunda; semua gate P0 punya recovery path.                  |
| 2. `01-source-to-go-map.md`               | Reference          | Handler TS → schema/DTO → service/repository → tabel → consumer UI → modul Go; status parity                     | Semua endpoint yang dipakai walkthrough terpetakan; mock/statis diberi label.                   |
| 3. `02-architecture.md`                   | Explanation        | Komposisi aplikasi, request flow, transaksi, auth, same-origin routing, error/logging, shutdown                  | Tidak ada dependency enterprise tanpa kebutuhan.                                                |
| 4. `03-data-model.md`                     | Reference          | ERD/tabel subset, ID/FK, state/enum, uang/waktu, constraint/index, seed mapping, migration                       | Setiap write P0 memiliki tabel dan constraint yang jelas.                                       |
| 5. `04-api-reference.md` + `openapi.yaml` | Reference          | Kontrak lengkap endpoint P0, DTO, error, role, pagination/filter, examples, retry                                | Example cocok dengan schema; route dan consumer cocok dengan source map.                        |
| 6. `05-workflow-rules.md`                 | Reference          | Transition matrix, readiness, departure revalidation, station/manifest/fuel, closure, invoice, permission, audit | Happy path dan penolakan memiliki expected outcome eksplisit.                                   |
| 7. `06-implementation-backlog.md`         | How-to             | Task berurutan, dependency, sumber kode, deliverable, acceptance criteria, ukuran relatif                        | Setiap task bisa dikerjakan tanpa menebak aturan bisnis.                                        |
| 8. `07-local-setup.md`                    | How-to             | Toolchain, env, PostgreSQL, migration, seed, start, health, troubleshooting                                      | Langkah dicoba pada environment bersih; jangan menyatakan command belum diuji sebagai berhasil. |
| 9. `08-demo-walkthrough.md`               | Tutorial           | Persona, data awal, urutan aksi, blocker recovery, hasil dashboard/invoice, reset                                | Walkthrough P0 selesai dan dapat diulang dengan seed yang sama.                                 |
| 10. `09-verification.md`                  | Reference / How-to | Contract tests, service tests, integration/concurrency, UI smoke, traceability requirement → test                | Ada bukti hasil test dan batas parity yang belum dipenuhi.                                      |

Minimum sebelum mulai implementasi domain: dokumen 1–6 cukup jelas untuk satu walkthrough. Dokumen backlog mengikuti keputusan tersebut; setup/walkthrough/verification difinalkan setelah ada implementasi yang dapat dijalankan.

## 7. Isi penting data dan workflow

Rencanakan subset entitas: demo actors/sessions, station/route/aircraft/crew/customer, `flight_operations`, readiness facts/evidence, approval, manifest/items, fuel request, station service/cost, maintenance handoff, finance handoff, invoice, dan audit history. Nama/kolom final mengikuti source map, bukan daftar ini secara otomatis.

Aturan yang wajib dirinci dalam dokumentasi:

- Satu `flightOperationId` dipakai semua domain; tidak membuat parent flight kedua.
- ID string lama tetap dapat di-seed. Tabel baru tidak memaksa UUID bagi ID lama.
- Uang memakai integer minor units dan currency eksplisit; hindari float. Pemetaan nilai legacy harus mencatat unit dan pembulatan.
- Waktu disimpan UTC dan dikirim RFC3339; tanggal presentasi/seed dipisahkan dari jam aktual. Penentuan kedaluwarsa memakai clock yang konsisten.
- Readiness dihitung server dari state terkini; departure memeriksa ulang dalam transaksi command.
- Approval mengikuti actor dan permission, termasuk separation of duties bila aturan sumber mewajibkannya. Station Admin dibatasi station terkait.
- Closure memeriksa actual time dan seluruh support/handoff wajib. Invoice draft dibuat atomik dengan closure, maksimal satu per flight melalui unique constraint. Service lama juga menjalankan accounting fulfillment; spesifikasi Go harus menetapkan apakah efek ini dipertahankan dalam subset atau dinyatakan di luar parity demo.
- Command menggunakan row lock atau optimistic version; retry command tidak membuat audit/invoice ganda. Retry dengan payload berbeda harus didefinisikan sebagai konflik.
- Audit menyimpan actor, action, entitas, waktu, request ID, dan perubahan relevan bersama transaksi bisnis.
- Jika ticketing P1 aktif: booking dan update manifest dalam satu transaksi; seat unik dan capacity check harus aman terhadap request bersamaan.

## 8. Integrasi frontend dan session

Usulkan same-origin: Nuxt meneruskan route yang sudah dipindahkan ke Go melalui proxy eksplisit. Route lain tetap di backend lama selama transisi. Satu kelompok domain mempunyai satu pemilik write; jangan menggunakan dua backend untuk menulis state flight yang sama.

Saat P0 Go menjadi pemilik flight, semua support, closure, invoice, dan dashboard walkthrough harus membaca database Go yang sama. Backend lama di luar scope tidak boleh ditampilkan seolah terintegrasi; nonaktifkan navigasi yang tidak ikut demo atau tandai sebagai preview terpisah.

Session demo: opaque token dari `crypto/rand`, cookie HttpOnly, SameSite, Secure saat HTTPS, expiry dan logout; role/station berasal dari session server. Gunakan password hash standard library yang tersedia pada toolchain terpilih dan akun fiktif seed. Dokumen implementasi harus menentukan algoritme dan parameter; jangan menyimpan password plaintext sebagai solusi auth. Origin/CSRF policy pada mutasi, batas body, timeout, login throttle sederhana, serta redaksi token/password dalam log ikut kontrak minimum.

## 9. Tahapan implementasi yang akan dijabarkan

| Tahap | Pekerjaan                                                           | Exit criteria                                                                        |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A     | Finalisasi walkthrough dan dokumen scope/source map                 | Daftar route dan gate P0 lengkap; UI consumer diketahui.                             |
| B     | Bootstrap Go, config, pool, migration, seed, envelope, health, auth | Build/test dasar, login/session/logout, seed repeatable.                             |
| C     | Flight read, lookup, readiness, lifecycle sebelum departure         | Flight blocked ditolak; recovery menghasilkan state yang benar.                      |
| D     | Support subset dan departure/landing                                | Semua gate dapat diselesaikan lewat UI/API; departure ditolak jika evidence berubah. |
| E     | Closure, invoice, audit, dashboard                                  | Retry tidak menggandakan invoice; dashboard sesuai transaksi.                        |
| F     | Proxy Nuxt dan walkthrough terintegrasi                             | Satu demo P0 selesai tanpa state terpecah.                                           |
| G     | Tambahan P1 terpilih                                                | Flight Request atau ticketing/payment hanya setelah P0 lolos.                        |

Ukuran awal: A kecil, B sedang, C besar, D besar, E sedang, F sedang. Estimasi hari baru dibuat setelah source map dan DTO scope selesai; kompleksitas readiness/support lebih menentukan daripada jumlah route.

## 10. Acceptance criteria demo

1. Seed menyediakan flight siap diproses, flight terblokir, dan flight dengan biaya draft yang memblokir closure; referensi antarentitas valid.
2. OCC, Director, Station Admin, Maintenance Manager, dan Finance Reviewer menjalankan action yang sesuai; akses role/station yang salah ditolak.
3. Happy path mencapai CLOSED dan menghasilkan tepat satu draft invoice.
4. Departure dengan readiness tidak valid dan closure dengan biaya/evidence belum lengkap ditolak dengan blocker yang dapat ditindaklanjuti.
5. Request bersamaan/retry tidak menghasilkan transisi ganda atau invoice ganda; ticketing concurrency diuji jika P1 diaktifkan.
6. Dashboard, detail flight, invoice, dan history membaca state yang sama.
7. Restart API mempertahankan data; reset hanya tindakan CLI eksplisit pada database demo. Tidak menyalin auto-reset saat startup dari demo lama.
8. Kontrak OpenAPI dan consumer frontend terpilih cocok; route di luar scope terdokumentasi.
9. Verification meliputi unit workflow, HTTP contract, integration PostgreSQL, dan satu walkthrough UI. Tidak perlu menjalankan seluruh suite legacy sebagai syarat port subset.

## 11. Keputusan yang perlu dituntaskan pada spesifikasi

Default usulan: P0 charter non-DG dari flight seed, PostgreSQL, same-origin proxy, session demo, seed/reset eksplisit, maintenance coordination, dan invoice draft saja.

Sebelum kontrak final: tentukan layar yang dipresentasikan, detail gate readiness wajib, DTO yang benar-benar dikonsumsi layar, kebutuhan create/edit flight, kebutuhan dokumen/upload, serta apakah Flight Request/ticketing/payment masuk sesi pertama. Jawaban ini mempersempit implementasi; tidak membenarkan port otomatis seluruh modul.

Langkah berikutnya adalah review scope dan outline di dokumen ini, lalu menulis paket spesifikasi 1–6. Backend Go belum diimplementasikan dalam pekerjaan planning ini.
