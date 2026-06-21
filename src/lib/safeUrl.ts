const SAFE_SCHEMES = new Set(['http:', 'https:']);

export function safeExternalHref(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const trimmed = input.trim();
  // Reject any embedded whitespace or control character (space, tab, newline,
  // the rest of the C0 range, and DEL) — these are used to obfuscate dangerous
  // schemes past a naive guard. The range U+0000–U+0020 covers space and all C0
  // controls; U+007F is DEL. Hyphen (U+002D) sits outside the range, so valid
  // hyphenated hosts (my-app.example.com) pass through.
  // eslint-disable-next-line no-control-regex -- matching control chars is the point
  if (/[\u0000-\u0020\u007F]/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed, window.location.origin);
  } catch {
    return null;
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return null;
  return url.toString();
}
