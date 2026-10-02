export function formatTicketingCurrency(amount: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatTicketingDateTime(value: string | null) {
  if (!value) return '-';
  const offset = /([+-]\d{2}:\d{2}|Z)$/u.exec(value)?.[1];
  const zones: Record<string, [string, string]> = {
    '+07:00': ['Asia/Jakarta', 'WIB'],
    '+08:00': ['Asia/Makassar', 'WITA'],
    '+09:00': ['Asia/Jayapura', 'WIT']
  };
  const [timeZone, label] = zones[offset ?? ''] ?? ['UTC', 'UTC'];
  const date = new Date(offset ? value : `${value}Z`);
  return `${new Intl.DateTimeFormat('id-ID', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)} ${label}`;
}
