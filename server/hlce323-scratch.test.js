// THROWAWAY (HLCE-323). Deliberately fails so we can prove that a PR with a
// failing REQUIRED check cannot merge, rather than assuming branch protection
// works. Deleted with its branch immediately afterwards.
import { describe, it, expect } from 'vitest';

describe('HLCE-323 negative control', () => {
  it('fails on purpose to prove the required check gates the merge', () => {
    expect(1).toBe(2);
  });
});
