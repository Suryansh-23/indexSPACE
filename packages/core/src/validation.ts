/**
 * Validate a belief vector before submission.
 * Throws a descriptive SDK-side error on invalid input.
 *
 * Checks (in order):
 * 1. Length matches numBuckets+2 (market's num_buckets + 2)
 * 2. All elements are finite (no NaN or Infinity)
 * 3. All elements non-negative
 * 4. Elements sum to numBuckets+2 within proportional tolerance
 */
export function validateBeliefVector(vector: number[], numBuckets: number): void {
  if (vector.length !== numBuckets + 2) {
    throw new Error(
      `Belief vector length ${vector.length} does not match expected numBuckets+2 = ${numBuckets + 2}`,
    );
  }

  if (vector.some(v => !Number.isFinite(v))) {
    throw new Error('Belief vector contains non-finite values (NaN or Infinity)');
  }

  if (vector.some(v => v < 0)) {
    throw new Error('Belief vector contains negative values');
  }

  const sum = vector.reduce((a, b) => a + b, 0);
  if (Math.abs(sum / (numBuckets + 2) - 1) >= 1e-6) {
    throw new Error(`Belief vector does not sum to ${numBuckets + 2} (sum = ${sum})`);
  }
}
