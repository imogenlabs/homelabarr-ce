const SAFE_SCHEMES = new Set(['http:', 'https:']);

export function safeExternalHref(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const trimmed = input.trim();
  if (/[ -]/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed, window.location.origin);
  } catch {
    return null;
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return null;
  return url.toString();
}
