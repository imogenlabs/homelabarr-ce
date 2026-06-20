import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges plain class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('lets later conflicting Tailwind classes win', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('filters out falsy inputs', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('returns an empty string for no truthy inputs', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
