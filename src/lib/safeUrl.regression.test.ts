// @vitest-environment jsdom
//
// HLCE-227 (AC5) — permanent named security-invariant regression guard for the
// external-link sanitizer. Distinct from src/lib/safeUrl.test.ts: that file is the
// general behavior suite; THIS file is the locked invariant that survives refactors.
//
// INVARIANT (the control that must never be removed): safeExternalHref()
//   1. rejects dangerous URL schemes (javascript:, data:, vbscript:, file:),
//      including mixed-case and whitespace-padded variants, and
//   2. rejects strings carrying embedded control characters or spaces (TAB, LF, CR,
//      NUL, DEL, and the rest of U+0000-U+0020 plus U+007F) BEFORE parsing, since
//      those are used to smuggle a dangerous scheme past a naive guard
//      (e.g. "java\tscript:..."), and
//   3. ALLOWS valid http/https URLs including hyphenated hosts (the fix from
//      HLCE-228, which replaced the broken /[ -]/ RANGE that ate hyphens), and
//   4. returns null for non-string / empty input.
//
// ASSERT-ONLY: if the scheme allowlist or the control-char guard is removed from
// safeUrl.ts, the corresponding cases below flip to failing. Control-char inputs
// are written with \uXXXX / \t / \n / \r escapes (never raw bytes).

import { describe, it, expect } from 'vitest';
import { safeExternalHref } from './safeUrl';

describe('safeExternalHref security invariant (HLCE-227 AC5)', () => {
  describe('INVARIANT 1: dangerous schemes are blocked', () => {
    it.each([
      ['javascript:', 'javascript:alert(1)'],
      ['data:', 'data:text/html,<script>alert(1)</script>'],
      ['vbscript:', 'vbscript:msgbox(1)'],
      ['file:', 'file:///etc/passwd'],
    ])('blocks %s scheme', (_label, input) => {
      expect(safeExternalHref(input)).toBeNull();
    });

    it.each([
      ['mixed-case JaVaScRiPt:', 'JaVaScRiPt:alert(1)'],
      ['upper DATA:', 'DATA:text/html,x'],
      ['mixed VbScRiPt:', 'VbScRiPt:msgbox(1)'],
      ['upper FILE:', 'FILE:///etc/passwd'],
    ])('blocks %s (case-insensitive scheme match)', (_label, input) => {
      expect(safeExternalHref(input)).toBeNull();
    });

    it.each([
      ['leading+trailing whitespace', '   javascript:alert(1)   '],
      ['leading tab+spaces', ' \t javascript:alert(1)'],
    ])('blocks whitespace-padded dangerous scheme (%s)', (_label, input) => {
      expect(safeExternalHref(input)).toBeNull();
    });
  });

  describe('INVARIANT 2: embedded control characters / spaces are blocked before parsing', () => {
    it.each([
      ['TAB (\\t)', 'https://example\t.com'],
      ['newline (\\n)', 'https://example\n.com'],
      ['carriage return (\\r)', 'https://example\r.com'],
      ['NUL (\\u0000)', 'https://example\u0000.com'],
      ['DEL (\\u007F)', 'https://example\u007F.com'],
      ['vertical tab (\\u000B)', 'https://example\u000B.com'],
      ['form feed (\\u000C)', 'https://example\u000C.com'],
      ['embedded space', 'http://exa mple.com'],
    ])('blocks an embedded %s', (_label, input) => {
      expect(safeExternalHref(input)).toBeNull();
    });

    it('blocks a control-char-obfuscated javascript: scheme (java\\tscript:)', () => {
      expect(safeExternalHref('java\tscript:alert(1)')).toBeNull();
    });

    it('blocks a newline-obfuscated javascript: scheme', () => {
      expect(safeExternalHref('java\nscript:alert(1)')).toBeNull();
    });
  });

  describe('INVARIANT 3: valid http/https URLs are allowed and normalized', () => {
    it('normalizes a plain https URL', () => {
      expect(safeExternalHref('https://example.com')).toBe('https://example.com/');
    });

    it('normalizes a plain http URL', () => {
      expect(safeExternalHref('http://example.com')).toBe('http://example.com/');
    });

    it('preserves path and query', () => {
      expect(safeExternalHref('https://example.com/foo?bar=baz')).toBe(
        'https://example.com/foo?bar=baz'
      );
    });

    it('allows a hyphenated host (the HLCE-228 fix — the old /[ -]/ range ate hyphens)', () => {
      expect(safeExternalHref('https://my-app.example.com')).toBe('https://my-app.example.com/');
    });

    it('allows hyphens in the path', () => {
      expect(safeExternalHref('https://example.com/my-cool-page')).toBe(
        'https://example.com/my-cool-page'
      );
    });
  });

  describe('INVARIANT 4: null for non-string / empty input', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['number', 42],
      ['object', {}],
      ['array', []],
      ['boolean', true],
    ])('returns null for %s input', (_label, input) => {
      expect(safeExternalHref(input)).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(safeExternalHref('')).toBeNull();
    });
  });
});
