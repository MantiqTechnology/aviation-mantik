import { PRODUCT_BRANDING } from '#shared/branding';

export function useBranding() {
  return {
    ...PRODUCT_BRANDING,
    ...(useAppConfig().branding as Partial<typeof PRODUCT_BRANDING> | undefined)
  };
}
