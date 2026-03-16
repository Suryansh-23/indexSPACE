/**
 * Validation utility tests -- unit tests for validateBeliefVector.
 *
 * These tests verify that the SDK-side validation catches malformed belief
 * vectors before they reach the network layer, providing clear error messages
 * for common mistakes.
 */

import { describe, it, expect } from 'vitest';
import { validateBeliefVector } from '../packages/core/src/validation.js';

describe('validateBeliefVector', () => {
  it('accepts a valid belief vector', () => {
    expect(() => validateBeliefVector([0.2, 0.3, 0.5], 2)).not.toThrow();
  });

  it('throws on wrong length', () => {
    expect(() => validateBeliefVector([0.5, 0.5], 5)).toThrow('length 2');
    expect(() => validateBeliefVector([0.5, 0.5], 5)).toThrow('K+1 = 6');
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

  it('edge case: K=0 with single-element vector passes', () => {
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

  it('edge case: empty vector with K=0 throws (expects length 1, not 0)', () => {
    expect(() => validateBeliefVector([], 0)).toThrow('length 0');
    expect(() => validateBeliefVector([], 0)).toThrow('K+1 = 1');
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
