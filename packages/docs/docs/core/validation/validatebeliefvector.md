---
title: "validateBeliefVector"
sidebar_position: 1
description: "Validate a belief vector (length, finite values, non-negative, sums to numBuckets+2) before API submission."
---

# validateBeliefVector

**`validateBeliefVector(vector, numBuckets)`**

**Layer:** L0. Validates a belief vector before submission to the API. Throws a descriptive SDK-side error if the vector is invalid. Called internally by `buy()` and `previewPayoutCurve()` before any network request is made.

```typescript
function validateBeliefVector(vector: number[], numBuckets: number): void
```

**Parameters:**

| Parameter    | Type       | Description                                                                                |
| ------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `vector`     | `number[]` | The belief vector to validate. Must have length `numBuckets + 2`.                          |
| `numBuckets` | `number`   | Number of outcome buckets (from `market.config.numBuckets`). Vector length must be `numBuckets + 2`. |

**Throws:**

`validateBeliefVector` performs four checks in order and throws on the first failure:

| Check                | Error message                                                                    | When it fires                              |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Length mismatch      | `"Belief vector length X does not match expected numBuckets+2 = Y"`              | `vector.length !== numBuckets + 2`         |
| Non-finite values    | `"Belief vector contains non-finite values (NaN or Infinity)"`      | Any element is `NaN` or `Infinity`                 |
| Negative values      | `"Belief vector contains negative values"`                          | Any element is less than 0                         |
| Sum != numBuckets+2  | `"Belief vector does not sum to numBuckets+2 (sum = X)"`           | Sum of elements deviates from numBuckets+2 by proportional tolerance |

All four checks run client-side, before any network request. This provides fast feedback and avoids wasting a round-trip on obviously invalid input.

**Example:**

```typescript
import { validateBeliefVector, generateGaussian, queryMarketState } from '@functionspace/core';

const market = await queryMarketState(client, 42);
const { numBuckets, lowerBound, upperBound } = market.config;
const belief = generateGaussian(75, 5, numBuckets, lowerBound, upperBound);

// Explicit validation (optional -- buy() and previewPayoutCurve() call this internally)
validateBeliefVector(belief, numBuckets);
```
