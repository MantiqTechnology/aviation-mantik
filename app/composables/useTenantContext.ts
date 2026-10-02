export function useTenantContext() {
  return {
    activeTenant: {
      id: 'TENANT-PRT-DEMO',
      code: 'PRT',
      mode: 'SINGLE_TENANT' as const
    }
  };
}
