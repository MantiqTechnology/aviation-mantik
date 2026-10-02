import { $fetch } from '@nuxt/test-utils/e2e';

// These API suites exercise business workflows using the explicitly enabled
// test-only role cookie. Individual requests can still override the actor.
export function demoApiFetch<T>(url: string, options?: Parameters<typeof $fetch>[1]) {
  const headers = new Headers(options?.headers);
  const role = url.startsWith('/api/ticketing/refund-requests')
    ? 'Director'
    : url.startsWith('/api/finance/') || url.startsWith('/api/invoices')
      ? 'Finance Reviewer'
      : url.startsWith('/api/flight-operations/maintenance')
        ? 'Maintenance Manager'
        : 'OCC';
  if (!headers.has('cookie')) headers.set('cookie', `mantik_demo_role=${encodeURIComponent(role)}`);
  return $fetch<T>(url, { ...options, headers });
}
