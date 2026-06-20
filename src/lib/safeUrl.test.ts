// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { safeExternalHref } from './safeUrl';

describe('safeExternalHref', () => {
  describe('dangerous schemes are rejected (these pass today and must keep passing)', () => {
    it('rejects javascript: URLs', () => {
      expect(safeExternalHref('javascript:alert(1)')).toBeNull();
    });

    it('rejects data: URLs', () => {
      expect(safeExternalHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('rejects vbscript: URLs', () => {
      expect(safeExternalHref('vbscript:msgbox(1)')).toBeNull();
    });

    it('rejects file: URLs', () => {
      expect(safeExternalHref('file:///etc/passwd')).toBeNull();
    });

    it('rejects whitespace-padded javascript: URLs', () => {
      // leading/trailing whitespace is trimmed, then the scheme is still rejected
      expect(safeExternalHref('   javascript:alert(1)   ')).toBeNull();
    });

    it('rejects mixed-case JaVaScRiPt: URLs', () => {
      expect(safeExternalHref('JaVaScRiPt:alert(1)')).toBeNull();
    });
  });

  describe('invalid / empty input', () => {
    it('returns null for non-string input', () => {
      expect(safeExternalHref(null)).toBeNull();
      expect(safeExternalHref(undefined)).toBeNull();
      expect(safeExternalHref(42)).toBeNull();
      expect(safeExternalHref({})).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(safeExternalHref('')).toBeNull();
    });

    it('returns null for a string containing a space (caught by the guard regex)', () => {
      // The "/[ -]/" guard at safeUrl.ts:6 rejects any string containing a
      // character in the range U+0020 (space) .. U+002D (hyphen), so a value
      // with an embedded space is rejected before URL parsing is attempted.
      expect(safeExternalHref('http://exa mple.com')).toBeNull();
    });
  });

  describe('safe http/https URLs are normalized', () => {
    it('normalizes a plain https URL', () => {
      expect(safeExternalHref('https://example.com')).toBe('https://example.com/');
    });

    it('normalizes a plain http URL', () => {
      expect(safeExternalHref('http://example.com')).toBe('http://example.com/');
    });

    it('preserves path and query on an https URL', () => {
      expect(safeExternalHref('https://example.com/foo?bar=baz')).toBe(
        'https://example.com/foo?bar=baz'
      );
    });
  });

  describe('KNOWN BUG (tracked in HLCE-228/251) — DO NOT FIX, asserting CURRENT behavior', () => {
    // BUG #1: the guard regex /[ -]/ at safeUrl.ts:6 is a character RANGE
    // from U+0020 (space) to U+002D (hyphen). It therefore rejects any URL
    // whose hostname/path contains a hyphen, even though hyphenated hosts are
    // perfectly valid. A hyphenated host like my-app.example.com SHOULD return
    // a normalized URL, but the current buggy regex makes it return null.
    it('BUG: rejects a valid hyphenated host instead of normalizing it', () => {
      expect(safeExternalHref('https://my-app.example.com')).toBeNull();
    });

    // BUG #2: the same guard does NOT match a TAB character (U+0009), so a
    // tab-obfuscated dangerous scheme slips past the whitespace guard. The
    // URL constructor then strips the embedded tab and parses it as a real
    // javascript:/data: scheme — the SAFE_SCHEMES check still catches THIS
    // particular payload, so it returns null, but the guard itself is proven
    // not to catch tabs by the hyphen case above. To document the tab blind
    // spot directly, a tab embedded inside an otherwise-safe https URL is NOT
    // rejected by the /[ -]/ guard; the URL parser strips it and we get a
    // normalized https URL back (the guard never saw the tab).
    it('BUG: tab inside an https URL is not caught by the guard; URL parser strips it', () => {
      expect(safeExternalHref('https://example\t.com')).toBe('https://example.com/');
    });
  });
});
