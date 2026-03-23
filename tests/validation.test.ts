/**
 * Validation utility tests -- unit tests for validateBeliefVector.
 *
 * These tests verify that the SDK-side validation catches malformed belief
 * vectors before they reach the network layer, providing clear error messages
 * for common mistakes.
 */

import { describe, it, expect } from 'vitest';
import { validateBeliefVector } from '../packages/core/src/validation.js';
import { validateUsername } from '../packages/core/src/index.js';

describe('validateBeliefVector', () => {
  it('accepts a valid belief vector', () => {
    expect(() => validateBeliefVector([0.2, 0.3, 0.5], 2)).not.toThrow();
  });

  it('throws on wrong length', () => {
    expect(() => validateBeliefVector([0.5, 0.5], 5)).toThrow('length 2');
    expect(() => validateBeliefVector([0.5, 0.5], 5)).toThrow('numBuckets+1 = 6');
  });

  it('throws when vector does not sum to 1.0', () => {
    expect(() => validateBeliefVector([0.5, 0.5, 0.5], 2)).toThrow(
      'does not sum to 1.0',
    );
  });

  it('throws on negative values', () => {
    expect(() => validateBeliefVector([-0.1, 0.6, 0.5], 2)).toThrow(
      'negative',
    );
  });

  it('edge case: numBuckets=0 with single-element vector passes', () => {
    expect(() => validateBeliefVector([1.0], 0)).not.toThrow();
  });

  it('edge case: sum within tolerance (0.9999999) passes', () => {
    // Build a vector that sums to 0.9999999 -- well within 1e-6 tolerance
    const vec = [0.3333333, 0.3333333, 0.3333333];
    // sum = 0.9999999, diff from 1.0 = 1e-7 < 1e-6
    expect(() => validateBeliefVector(vec, 2)).not.toThrow();
  });

  it('edge case: sum just outside tolerance (1.001) throws', () => {
    expect(() => validateBeliefVector([0.5, 0.5, 0.001], 2)).toThrow(
      'does not sum to 1.0',
    );
  });

  it('edge case: empty vector with numBuckets=0 throws (expects length 1, not 0)', () => {
    expect(() => validateBeliefVector([], 0)).toThrow('length 0');
    expect(() => validateBeliefVector([], 0)).toThrow('numBuckets+1 = 1');
  });

  it('throws on NaN values', () => {
    expect(() => validateBeliefVector([NaN, 0.5, 0.5], 2)).toThrow(
      'non-finite',
    );
  });

  it('throws on Infinity values', () => {
    expect(() => validateBeliefVector([Infinity, 0, 0], 2)).toThrow(
      'non-finite',
    );
  });
});

describe('validateUsername', () => {
  it('accepts a valid username', () => {
    expect(validateUsername('alice_123')).toEqual({ valid: true });
  });

  it('accepts username with dots and dashes', () => {
    expect(validateUsername('user.name-test')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 3/);
  });

  it('rejects too short (1-2 chars)', () => {
    expect(validateUsername('ab').valid).toBe(false);
  });

  it('accepts exactly 3 characters', () => {
    expect(validateUsername('abc').valid).toBe(true);
  });

  it('accepts exactly 32 characters', () => {
    expect(validateUsername('a'.repeat(32)).valid).toBe(true);
  });

  it('rejects 33+ characters', () => {
    const result = validateUsername('a'.repeat(33));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most 32/);
  });

  it('rejects spaces', () => {
    const result = validateUsername('user name');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Only letters/);
  });

  it('rejects special characters', () => {
    const result = validateUsername('user@name!');
    expect(result.valid).toBe(false);
  });

  it('trims whitespace before validating', () => {
    // '  abc  ' trims to 'abc' which is valid
    expect(validateUsername('  abc  ').valid).toBe(true);
  });

  it('whitespace-only string fails (trims to empty)', () => {
    expect(validateUsername('   ').valid).toBe(false);
  });
});
