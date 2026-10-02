import type Database from 'better-sqlite3';
import type { DemoSeedContext } from './context';

type Row = Record<string, string | number | null>;

// Metadata references are documented in docs/demo-scenarios.md. Schedules,
// staffing, prices and fleet registrations below are synthetic demo examples.
const stations = [
  [
    'KOE',
    'El Tari / Kupang',
    'WATT',
    'Kupang',
    'Nusa Tenggara Timur',
    'Asia/Makassar',
    -10.177778,
    123.663889
  ],
  [
    'RTI',
    'David Constantijn Saudale / Rote',
    'WATR',
    'Rote Ndao',
    'Nusa Tenggara Timur',
    'Asia/Makassar',
    -10.766964,
    123.074958
  ],
  ['AMQ', 'Pattimura / Ambon', 'WAPP', 'Ambon', 'Maluku', 'Asia/Jayapura', -3.7075, 128.089444],
  ['NDA', 'Bandaneira', 'WAPC', 'Banda', 'Maluku', 'Asia/Jayapura', -4.521667, 129.904722]
] as const;

const services = [
  {
    origin: 'KOE',
    destination: 'RTI',
    aircraft: 'PK-DMI',
    pic: 'Ruben Nalle',
    cop: 'Maria Koa',
    duration: 30,
    distance: 92,
    fare: 650000,
    offset: '+08:00'
  },
  {
    origin: 'AMQ',
    destination: 'NDA',
    aircraft: 'PK-DMJ',
    pic: 'Daniel Latumahina',
    cop: 'Ruth Latu',
    duration: 55,
    distance: 221,
    fare: 1100000,
    offset: '+09:00'
  }
] as const;

function insert(sqlite: Database.Database, table: string, row: Row) {
  const columns = Object.keys(row);
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    )
    .run(...Object.values(row));
}

function copy(sqlite: Database.Database, table: string, sourceId: string, changes: Row) {
  const source = sqlite.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(sourceId) as
    Row | undefined;
  if (!source) throw new Error(`Regional seed requires ${table}.${sourceId}`);
  insert(sqlite, table, { ...source, ...changes });
}

export function seedRegionalNetwork(sqlite: Database.Database, context: DemoSeedContext) {
  for (const [code, name, icao, city, province, timezone, latitude, longitude] of stations) {
    copy(sqlite, 'stations', 'st-djj', {
      id: `st-${code.toLowerCase()}`,
      station_code: code,
      station_name: name,
      iata_code: code,
      icao_code: icao,
      city,
      province,
      timezone,
      latitude,
      longitude,
      // Do not borrow operational facility claims from the Papua template.
      elevation_ft: null,
      surface_type: null,
      runway_length_m: null,
      runway_width_m: null,
      city_or_region: city,
      station_pic_name: `Station Desk ${code}`,
      station_pic_phone: null,
      operational_notes: 'Synthetic station record; confirm facilities before actual operations',
      has_fuel_service: 0,
      has_handling_service: 0,
      has_parking_service: 0
    });
  }

  for (const service of services) {
    const key = `${service.origin}-${service.destination}`.toLowerCase();
    const originId = `st-${service.origin.toLowerCase()}`;
    const destinationId = `st-${service.destination.toLowerCase()}`;
    const routeId = `route-${key}`;
    const aircraftId = `ac-${service.aircraft.toLowerCase()}`;
    const flightId = `fop-regional-${key}`;
    const rateId = `rate-passenger-${key}`;
    const picId = `crew-pic-${key}`;
    const copId = `crew-cop-${key}`;
    const departure = `${context.date(1)}T08:00:00.000${service.offset}`;
    const arrival = `${context.date(1)}T08:${service.duration}:00.000${service.offset}`;

    copy(sqlite, 'routes', 'route-djj-wmx', {
      id: routeId,
      route_code: key.toUpperCase(),
      origin_station_id: originId,
      destination_station_id: destinationId,
      estimated_duration_minutes: service.duration,
      distance_km: service.distance
    });
    copy(sqlite, 'aircraft', 'ac-pk-dmb', {
      id: aircraftId,
      registration_number: service.aircraft,
      serial_number: `208B-${service.aircraft}`,
      fleet_code: `CVN-${service.origin}`,
      base_station_id: originId,
      current_station_id: originId,
      image_url: '/branding/aircraft-placeholder.svg',
      serviceability_status: 'SERVICEABLE',
      default_capacity_profile_id: null,
      serviceability_note: 'Synthetic regional aircraft positioned at its departure station',
      fuel_profile_source: 'DEMO',
      last_maintenance_check_at: context.date(-7),
      next_maintenance_due_at: context.date(90),
      fuel_profile_reference:
        'Synthetic regional planning profile; validate against operator AFM/POH records'
    });

    for (const [sourceId, id, name, role] of [
      ['crew-pic-valid', picId, service.pic, 'PIC'],
      ['crew-cop-valid-2', copId, service.cop, 'COP']
    ]) {
      copy(sqlite, 'crews', sourceId!, {
        id: id!,
        employee_code: `PRT-${role}-${service.origin}`,
        full_name: name!,
        base_station_id: originId,
        duty_station_id: originId,
        license_number: `LIC-${role}-${service.origin}`,
        readiness_note: 'Synthetic regional service crew',
        email: `${id}@operator.example`,
        phone: null
      });
      for (const table of [
        'personnel_licenses',
        'personnel_medical_certificates',
        'personnel_qualifications'
      ]) {
        const records = sqlite
          .prepare(`SELECT * FROM ${table} WHERE personnel_id = ?`)
          .all(sourceId) as Row[];
        for (const record of records) {
          insert(sqlite, table, {
            ...record,
            id: `${id}-${record.id}`,
            personnel_id: id!,
            document_id: null,
            ...(table === 'personnel_licenses'
              ? { license_number: `LIC-${role}-${service.origin}` }
              : {}),
            ...(table === 'personnel_medical_certificates'
              ? { certificate_number: `MED-${role}-${service.origin}` }
              : {})
          });
        }
      }
    }

    copy(sqlite, 'flight_capacity_profiles', 'cap-pilatus-djj-wmx-pax', {
      id: `fcp-${key}-passenger`,
      profile_code: `FCP_${key.toUpperCase().replaceAll('-', '_')}_PAX`,
      profile_name: `${service.origin}–${service.destination} passenger simulation`,
      aircraft_id: aircraftId,
      route_id: routeId,
      seat_capacity: 12,
      cargo_capacity_kg: 1400,
      reserved_seat_count: 0,
      reserved_cargo_kg: 0,
      capacity_note: 'Synthetic capacity; validate payload limits before actual operations'
    });
    sqlite
      .prepare('UPDATE aircraft SET default_capacity_profile_id = ? WHERE id = ?')
      .run(`fcp-${key}-passenger`, aircraftId);
    copy(sqlite, 'rate_cards', 'rate-passenger-djj-wmx', {
      id: rateId,
      rate_code: `PAX_${service.origin}_${service.destination}`,
      rate_name: `${service.origin}–${service.destination} simulation fare`,
      origin_station_id: originId,
      destination_station_id: destinationId,
      route_id: routeId,
      aircraft_type_id: aircraftId,
      base_rate: service.fare,
      effective_from: context.date(-16),
      effective_to: null,
      public_note: 'Illustrative fare for simulated bookings only'
    });
    insert(sqlite, 'rate_booking_channels', {
      id: `${rateId}-counter`,
      rate_card_id: rateId,
      booking_channel_code: 'COUNTER',
      effective_from: context.date(-16),
      created_at: context.now,
      updated_at: context.now
    });

    copy(sqlite, 'flight_operations', 'fop-ticketing-passenger', {
      id: flightId,
      flight_number: `PRT-${context.compactDate(1)}-${service.origin}`,
      order_number: `FO-${context.compactDate(1)}-${service.origin}`,
      route_id: routeId,
      aircraft_id: aircraftId,
      origin_station_id: originId,
      destination_station_id: destinationId,
      pilot_in_command_id: picId,
      co_pilot_id: copId,
      scheduled_departure_at: departure,
      scheduled_arrival_at: arrival,
      billing_type: 'PER_SEAT',
      estimated_revenue: service.fare * 12,
      request_source: 'Regional passenger simulation',
      remarks: 'Synthetic schedule for simulated regional bookings'
    });
    for (const [suffix, crewId, assignmentRole] of [
      ['pic', picId, 'pilot-in-command'],
      ['cop', copId, 'co-pilot']
    ]) {
      copy(sqlite, 'flight_crew_assignments', `fop-ticketing-passenger-crew-${suffix}`, {
        id: `${flightId}-crew-${suffix}`,
        flight_id: flightId,
        crew_id: crewId!,
        assignment_role_id: `crew-assignment-role-${assignmentRole}`
      });
    }
    for (const type of ['pax', 'cargo']) {
      copy(sqlite, 'flight_manifests', `fop-ticketing-passenger-manifest-${type}`, {
        id: `${flightId}-manifest-${type}`,
        flight_operation_id: flightId,
        status_id: 'manifest-status-draft',
        approved_by_user_id: null,
        approved_at: null,
        locked_at: null
      });
    }
    copy(sqlite, 'ticketing_sales', 'sale-passenger-primary', {
      id: `sale-${key}`,
      flight_operation_id: flightId
    });
    const ticketId = `PRT-TKT-${context.compactDate(1)}-${service.origin}`;
    copy(sqlite, 'passenger_tickets', `PRT-TKT-${context.compactDate(1)}-001`, {
      id: ticketId,
      flight_operation_id: flightId,
      passenger_name: `Passenger ${service.origin}`,
      document_number: `SIM-${service.origin}-001`,
      ticket_price: service.fare,
      total_amount: service.fare,
      tax_amount: 0,
      rate_card_id: rateId,
      agent_id: null
    });
    insert(sqlite, 'flight_manifest_passengers', {
      id: `ticket-sync-${ticketId}`,
      manifest_id: `${flightId}-manifest-pax`,
      passenger_ticket_id: ticketId,
      full_name: `Passenger ${service.origin}`,
      identity_type: 'KTP',
      identity_number: `SIM-${service.origin}-001`,
      weight_kg: 65,
      seat_number: '1A',
      baggage_weight_kg: 8,
      remarks: 'Simulated regional booking',
      created_at: context.now,
      updated_at: context.now
    });
  }
}
