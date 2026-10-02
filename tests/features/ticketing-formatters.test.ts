import { describe, expect, it } from 'vitest';
import { formatTicketingDateTime } from '../../app/features/ticketing/formatters';

describe('station-local ticketing times', () => {
  it.each(['Asia/Jakarta', 'UTC', 'America/New_York'])(
    'preserves WITA and WIT departures for a viewer in %s',
    (viewerTimezone) => {
      const previousTimezone = process.env.TZ;
      process.env.TZ = viewerTimezone;
      try {
        expect(formatTicketingDateTime('2027-01-01T08:00:00.000+08:00')).toMatch(/08[.:]00 WITA$/u);
        expect(formatTicketingDateTime('2027-01-01T08:00:00.000+09:00')).toMatch(/08[.:]00 WIT$/u);
        expect(formatTicketingDateTime('2027-01-01T00:15:00.000+08:00')).toMatch(
          /^1 Jan 2027.*00[.:]15 WITA$/u
        );
        expect(formatTicketingDateTime(null)).toBe('-');
      } finally {
        if (previousTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = previousTimezone;
      }
    }
  );
});
