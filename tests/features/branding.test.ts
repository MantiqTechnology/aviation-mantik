import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBranding } from '../../app/composables/useBranding';
import { PRODUCT_BRANDING } from '#shared/branding';

describe('branding configuration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('provides product defaults when app config has no branding', () => {
    vi.stubGlobal('useAppConfig', () => ({}));
    expect(useBranding()).toEqual(PRODUCT_BRANDING);
    expect(useBranding().productName).toBe('Mantik Aviation');
  });

  it('keeps defaults when branding is partially configured', () => {
    vi.stubGlobal('useAppConfig', () => ({ branding: { operatorName: 'Example Operator' } }));
    expect(useBranding()).toEqual({ ...PRODUCT_BRANDING, operatorName: 'Example Operator' });
  });
});
