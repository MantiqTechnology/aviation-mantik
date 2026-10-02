import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type DbClient } from '../../server/db/client';
import { resetDemoDatabase } from '../../server/db/reset-demo';
import { seedRegionalNetwork } from '../../server/db/seeds/regional-network';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { AgentRepository } from '../../server/features/commercial/agents/repository';
import { PassengerTicketRepository } from '../../server/features/ticketing/passenger/repository';
import { PassengerTicketService } from '../../server/features/ticketing/passenger/service';
import { TicketingSalesRepository } from '../../server/features/ticketing/sales/repository';
import { TicketingSalesService } from '../../server/features/ticketing/sales/service';
import { createPassengerTicketSchema } from '../../shared/features/ticketing/passenger';

let directory: string;
let client: DbClient;
const context = createDemoSeedContext('2026-12-31');

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'mantik-regional-'));
  const path = join(directory, 'network.sqlite');
  await resetDemoDatabase(path, { anchorDate: context.anchorDate, resetDocuments: false });
  client = createDbClient(path);
});

afterAll(async () => {
  client?.sqlite.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe('regional operator demo', () => {
  it('seeds both regions with local offsets and independent fleet and crew', () => {
    const flights = client.sqlite
      .prepare(
        `
      SELECT f.id, f.aircraft_id AS aircraftId, f.pilot_in_command_id AS picId,
             f.co_pilot_id AS copId, f.scheduled_departure_at AS departure,
             f.scheduled_arrival_at AS arrival, s.timezone
      FROM flight_operations f JOIN stations s ON s.id = f.origin_station_id
      WHERE f.id LIKE 'fop-regional-%' ORDER BY f.id
    `
      )
      .all() as {
      aircraftId: string;
      picId: string;
      copId: string;
      departure: string;
      arrival: string;
      timezone: string;
    }[];
    expect(flights).toHaveLength(2);
    expect(flights[0]).toMatchObject({
      departure: '2027-01-01T08:00:00.000+09:00',
      arrival: '2027-01-01T08:55:00.000+09:00',
      timezone: 'Asia/Jayapura'
    });
    expect(flights[1]).toMatchObject({
      departure: '2027-01-01T08:00:00.000+08:00',
      arrival: '2027-01-01T08:30:00.000+08:00',
      timezone: 'Asia/Makassar'
    });
    expect(new Set(flights.map((flight) => flight.aircraftId)).size).toBe(2);
    expect(new Set(flights.flatMap((flight) => [flight.picId, flight.copId])).size).toBe(4);
    expect(client.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('can reseed without duplicating regional tickets, crew or manifests', () => {
    const counts = () =>
      ['flight_operations', 'passenger_tickets', 'crews', 'flight_manifests'].map((table) =>
        client.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()
      );
    const before = counts();
    seedRegionalNetwork(client.sqlite, context);
    expect(counts()).toEqual(before);
  });

  it.each([
    ['koe', 'rti', 650000, 'PK-DMI'],
    ['amq', 'nda', 1100000, 'PK-DMJ']
  ])(
    'supports search, pricing, booking and manifest sync for %s–%s',
    async (origin, destination, fare, registration) => {
      const repository = new TicketingSalesRepository(client.sqlite);
      const sales = new TicketingSalesService(repository);
      const flightId = `fop-regional-${origin}-${destination}`;
      const flights = sales.availableFlights({
        serviceType: 'PASSENGER',
        originStationId: `st-${origin}`,
        destinationStationId: `st-${destination}`
      });
      expect(flights).toHaveLength(1);
      expect(flights[0]).toMatchObject({
        flightOperationId: flightId,
        aircraftRegistration: registration
      });
      const passengers = new PassengerTicketService(
        new PassengerTicketRepository(client.sqlite),
        repository,
        new AgentRepository(client.db, client.sqlite)
      );
      const input = createPassengerTicketSchema.parse({
        flightOperationId: flightId,
        passengerName: 'Regional Test Passenger',
        documentNumber: `SIM-TEST-${origin}`,
        seatNumber: '1B',
        passengerWeightKg: 65,
        baggageWeightKg: 5
      });
      const ticket = await passengers.create(input);
      expect(ticket.ticketPrice).toBe(fare);
      expect(ticket.totalAmount).toBe(fare);
      expect(passengers.occupiedSeats(flightId)).toEqual(expect.arrayContaining(['1A', '1B']));
      expect(
        client.sqlite
          .prepare(
            'SELECT manifest_id AS manifestId FROM flight_manifest_passengers WHERE passenger_ticket_id = ?'
          )
          .get(ticket.id)
      ).toEqual({ manifestId: `${flightId}-manifest-pax` });
      await expect(passengers.create(input)).rejects.toMatchObject({
        code: 'TICKETING_SEAT_OCCUPIED'
      });
    }
  );
});
