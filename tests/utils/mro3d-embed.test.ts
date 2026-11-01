import { describe, expect, it } from 'vitest';
import { resolveMro3dEmbedUrl } from '../../app/utils/mro3dEmbed';

describe('MRO 3D public embed URL', () => {
  it('accepts HTTPS embed endpoints and explicit local development', () => {
    expect(resolveMro3dEmbedUrl('https://airplane-mro-3d.vercel.app/embed')).toBe(
      'https://airplane-mro-3d.vercel.app/embed'
    );
    expect(resolveMro3dEmbedUrl('http://127.0.0.1:3100/embed', true)).toBe(
      'http://127.0.0.1:3100/embed'
    );
    expect(resolveMro3dEmbedUrl('http://127.0.0.1:3100/embed')).toBeNull();
  });
  it.each([
    '',
    undefined,
    'javascript:alert(1)',
    '//remote/embed',
    'https://remote/',
    'https://user:secret@remote/embed',
    'https://remote/embed?token=secret',
    'https://remote/embed#secret',
    'http://remote/embed'
  ])('rejects unsafe or unconfigured URL %s', (value) => {
    expect(resolveMro3dEmbedUrl(value, true)).toBeNull();
  });
});
