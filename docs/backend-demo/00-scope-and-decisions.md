# Scope dan keputusan backend demo Go

## Target

Developer backend Go membangun demo satu operator yang menunjukkan satu Flight Order charter non-DG dari data seed menuju `CLOSED` dan satu invoice `draft`. Frontend Nuxt memakai endpoint Go untuk seluruh layar dalam walkthrough. Reviewer dapat mengulang walkthrough sesudah reset data melalui CLI.

## P0

- Demo login, session, logout; permission dan station scope dihitung server.
- Lookup minimal untuk station, route, aircraft, crew, dan customer; flight list/detail; dashboard flight control.
- Submit, evaluate, accept readiness, approve, schedule, open/close check-in, mark ready, depart, land, pending closure, close.
- Data dan aksi support minimum untuk manifest penumpang non-DG, fuel, station service/cost, maintenance coordination, dan finance handoff. Jika seed sudah memasok evidence yang benar, API baca tetap diperlukan agar blocker dapat dijelaskan.
- Audit/history dan draft invoice. Tidak ada endpoint reset publik.

Pilih satu flight charter seed sebagai happy path. Sediakan flight kedua dengan readiness blocker dan ketiga dengan station cost yang belum selesai. Customer dan estimasi revenue pada flight charter harus terisi supaya closure punya dasar invoice. Semua support record memakai `flightOperationId` yang sama. Dua flight exception tidak perlu bisa diselesaikan penuh lewat UI jika penggunaannya sebatas menunjukkan penolakan; dokumentasi demo harus menyatakan itu.

## Di luar P0

Flight Request conversion, ticketing, cargo DG, refund, pembayaran, full MRO, procurement, HRIS/payroll, SMS, asset, accounting ledger, real-time tracking, integrasi SSO/IoT/Kafka/ClickHouse, dan file upload. Integrasi accounting fulfillment yang dijalankan service lama saat closure **dikecualikan dari parity P0**. Status invoice tetap `draft`; jurnal, AR, dan pengakuan revenue tidak dibuat. UI tidak boleh menampilkan hasil accounting seolah berasal dari Go.

Jika layar flight terpilih membutuhkan route di luar P0, sembunyikan kontrol tersebut dalam mode demo Go atau tuntaskan route dan datanya sebelum mengaktifkan kontrol. Satu domain write mempunyai satu pemilik; jangan menyimpan perubahan flight di SQLite lama sementara support-nya di PostgreSQL Go.

## Keputusan stack

Module `github.com/MantiqTechnology/AMA-System`; target toolchain `go 1.26.4` dari pengguna. HTTP memakai `net/http` dan chi, PostgreSQL memakai pgxpool, migration SQL memakai Goose. `log/slog`, `encoding/json`, `os`, dan `crypto/rand` menangani kebutuhan dasar tanpa Fx, Viper, Zap, OIDC, Cerbos, OpenTelemetry SDK, atau broker. `go.mod` akhir hanya menambah library setelah kompilasi dan tes membuktikan kebutuhan. Versi yang diberikan pengguna adalah kandidat, bukan bukti kompatibilitas toolchain di mesin ini.

## Keputusan integrasi

Pertahankan prefix `/api` dan envelope `ok/data/error/meta`. Nuxt meneruskan route P0 ke Go melalui proxy same-origin. Browser memakai cookie demo yang HttpOnly; role dan station berasal dari session server. Seed/reset adalah CLI terpisah; restart API tidak menghapus data. Waktu penyimpanan UTC dan format API RFC3339; nilai uang integer minor units dengan currency.

## Kriteria sukses

Walkthrough mencapai `CLOSED`; satu invoice draft terhubung ke flight; dashboard dan audit memperlihatkan state yang sama. Permission/station salah ditolak. Blocker readiness/departure/closure menghasilkan pesan yang dapat ditindaklanjuti. Retry closure tidak menggandakan invoice. Seed dan reset menghasilkan skenario deterministik.
