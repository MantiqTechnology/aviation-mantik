/** Public viewer URL only: never pass session tokens into the remote document. */
export function resolveMro3dEmbedUrl(value: unknown, development = false): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const localHttp =
      development &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localHttp) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/embed' && url.pathname !== '/embed/') return null;
    return url.href;
  } catch {
    return null;
  }
}
