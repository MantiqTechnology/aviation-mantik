# Referensi API P0

Ini kontrak target untuk Go. Endpoint yang berasal dari Nitro mempertahankan method/path; field DTO yang belum dipakai layar P0 boleh dipangkas hanya setelah audit consumer pada [peta sumber](01-source-to-go-map.md). Setiap response sukses berbentuk `{ "ok": true, "data": ..., "meta": { "requestId": "...", "demoMode": true } }`; gagal berbentuk `{ "ok": false, "error": { "code": "...", "message": "...", "details": ... }, "meta": { "requestId": "...", "demoMode": true } }`. Request ID dikirim juga di header `X-Request-ID`; angka `count` hanya untuk data array. Semua endpoint selain login meminta cookie session.

## Auth dan baca

| Method dan path                                             | Input                                                               | Output `data`                      | Akses                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `POST /api/auth/login`                                      | username, password sesuai `shared/contracts/auth.ts`                | demo session tanpa token mentah    | publik; throttle                                                  |
| `GET /api/auth/session`                                     | cookie                                                              | demo session                       | login                                                             |
| `POST /api/auth/logout`                                     | cookie                                                              | `{signedOut:true}`                 | login                                                             |
| `GET /api/flight-operations/lookups`                        | —                                                                   | subset `FlightOperationLookupsDto` | login                                                             |
| `GET /api/flight-operations/flights`                        | filter dari `listFlightOperationsQuerySchema` yang dipakai layar P0 | `FlightOperationOverviewDto`       | `flight.read`, station filtered                                   |
| `GET /api/flight-operations/flights/{id}`                   | ID string                                                           | `FlightOperationDetailDto` subset  | `flight.read`, actor filtered; `Cache-Control: private, no-store` |
| `GET /api/flight-operations/flights/{id}/manifest`          | ID string                                                           | manifest workspace                 | `flight.manifest.view`                                            |
| `GET /api/flight-operations/flights/{id}/operational-audit` | ID string                                                           | audit events                       | `readiness.view`, station scope                                   |
| `GET /api/flight-operations/dashboard`                      | filter dari `operationalDashboardQuerySchema` yang dipakai UI       | flight control dashboard           | `flight.read`, station filtered                                   |
| `GET /api/invoices`, `GET /api/invoices/{id}`               | filter/ID                                                           | invoice summary/detail             | `finance.invoice.read`                                            |

## Flight command

Semua path di tabel relatif ke `/api/flight-operations/flights/{id}/actions/` dan memakai `POST`. Jangan implementasikan satu handler `{action}` tanpa allowlist; setiap action memiliki body, permission, dan gate berbeda.

| Action                                         | Body                                                           | Permission / scope                                                                                          | Hasil                               |
| ---------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `submit`, `evaluate`                           | kosong                                                         | `flight.readiness.evaluate`, origin                                                                         | jalankan readiness; detail flight   |
| `accept-readiness`                             | `{expectedVersion,readinessRevision,note}`                     | `flight.readiness.approve`                                                                                  | persetujuan OCC; detail flight      |
| `approve`                                      | `{expectedVersion,readinessRevision,note}`                     | `flight.approve`                                                                                            | persetujuan Director; detail flight |
| `schedule`, `open-check-in`, `pending-closure` | `{expectedVersion,idempotencyKey,note?}`                       | `flight.schedule` untuk dua pertama; `flight.movement.update` untuk pending closure; station sesuai handler | status baru; detail flight          |
| `close-check-in`                               | `{expectedUpdatedAt,note?}`                                    | `flight.checkin.close`                                                                                      | status baru; detail flight          |
| `mark-ready-for-departure`                     | `{expectedUpdatedAt,note?}`                                    | `flight.departure.ready`                                                                                    | status baru; detail flight          |
| `depart`                                       | `{actualAt,stationId?,note?,expectedVersion?,idempotencyKey?}` | `flight.departure.execute`, origin                                                                          | actual departure dan `IN_PROGRESS`  |
| `land`                                         | body sama dengan depart                                        | `flight.movement.update`, destination                                                                       | actual arrival dan `LANDED`         |
| `close`                                        | kosong                                                         | `flight.closure.execute`                                                                                    | `CLOSED`, invoice draft, audit      |

`idempotencyKey` untuk lifecycle command berisi 12–200 karakter; depart/land menerima 8–200 karakter bila disediakan, mengikuti kontrak lama. Dalam Go P0, frontend harus mengirim version/key untuk command yang mendukungnya. Untuk `close`, retry idempotent ditentukan dari state `CLOSED` dan unique invoice per flight.

## Support command

| Method dan path                                                      | Body/aturan ringkas                                                                                | Permission                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `POST /api/flight-operations/manifests/{manifestId}/actions/submit`  | `expectedVersion`, optional `emptyLoadReason`                                                      | `flight.manifest.submit`                         |
| `POST /api/flight-operations/manifests/{manifestId}/actions/approve` | `expectedVersion`                                                                                  | `flight.manifest.review`                         |
| `GET/POST /api/flight-operations/fuel`                               | list / `createFuelRequestBodySchema`; origin scope                                                 | read / `flight.fuel.update`                      |
| `POST /api/flight-operations/fuel/{id}/actions/{action}`             | action `approve`, `uplift`, `post`; body `expectedVersion`, `idempotencyKey`, jumlah sesuai action | `flight.fuel.update`, station scope              |
| `GET/POST /api/flight-operations/station-services`                   | list / `createStationServiceBodySchema`                                                            | read / `station.operation.update`, station scope |
| `POST /api/flight-operations/station-services/{id}/actions/complete` | `expectedVersion`, `completionRecord`, `evidenceReference`                                         | `station.operation.update`, station scope        |
| `POST /api/flight-operations/station-services/{id}/actions/verify`   | `expectedVersion`                                                                                  | `station.task.verify`, station scope             |
| `GET/POST /api/flight-operations/station-costs`                      | list / `createStationCostBodySchema`                                                               | read / `station.operation.update`, station scope |
| `PATCH /api/flight-operations/station-costs/{id}`                    | `expectedVersion`, actual amount/currency, vendor/evidence reference, description                  | `station.operation.update`, station scope        |
| `POST /api/flight-operations/station-costs/{id}/actions/submit`      | `expectedVersion`                                                                                  | `station.operation.update`, station scope        |
| `POST /api/flight-operations/station-costs/{id}/actions/approve`     | `expectedVersion`                                                                                  | `station.cost.approve`, station scope            |
| `GET/POST /api/flight-operations/maintenance`                        | list / `createMaintenanceHandoffBodySchema`                                                        | read / `maintenance.handoff.update`              |
| `POST /api/flight-operations/maintenance/{id}/actions/approve`       | kosong                                                                                             | `maintenance.handoff.update`                     |

Seed dapat memasok service/fuel/maintenance yang sudah ada, namun API baca dan mutasi yang tampil sebagai kontrol P0 harus mengikuti tabel ini. Finance handoff untuk station cost dibuat dari approval cost di service, bukan endpoint `/api/finance/handoffs` penuh. Jika UI membutuhkan station task atau manifest passenger create, tambahkan route sumber tersebut sebagai task P0 sebelum kontrol diaktifkan; jangan mengirim stub sukses.

## Error dan retry

`400` JSON rusak/tipe tak dapat dibaca; `401` tanpa session; `403` permission, station, atau origin salah; `404` ID tidak ditemukan atau disembunyikan oleh scope; `409` versi/state/idempotency konflik; `422` validasi atau prasyarat bisnis tidak lengkap; `500` error tak terduga tanpa detail internal. `error.details` untuk blocker berisi kode dan daftar item yang hilang. Error tidak mengubah state. Command yang dapat diulang mengembalikan hasil sebelumnya; key sama dengan command/actor lain menghasilkan 409. Timestamp API selalu RFC3339 UTC dan uang berupa integer minor units.

Contoh kontrak approval:

```json
{ "expectedVersion": 4, "readinessRevision": 2, "note": "Readiness reviewed by OCC" }
```

Contoh konflik:

```json
{
  "ok": false,
  "error": {
    "code": "FLIGHT_VERSION_CONFLICT",
    "message": "Flight changed; refresh before retrying.",
    "details": { "actualVersion": 5, "refreshRequired": true }
  },
  "meta": { "requestId": "req-example", "demoMode": true }
}
```
