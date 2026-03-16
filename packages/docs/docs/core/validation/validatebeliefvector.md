---
title: "validateBeliefVector"
sidebar_position: 1
description: "Validate a belief vector (length, finite values, non-negative, sums to 1) before API submission."
---

# validateBeliefVector

**`validateBeliefVector(vector, K)`**

**Layer:** L0. Validates a belief vector before submission to the API. Throws a descriptive SDK-side error if the vector is invalid. Called internally by `buy()` and `previewPayoutCurve()` before any network request is made.

```typescript
function validateBeliefVector(vector: number[], K: number): void
```

**Parameters:**

| Parameter | Type       | Description                                                                 |
| --------- | ---------- | --------------------------------------------------------------------------- |
| `vector`  | `number[]` | The belief vector to validate. Must have length `K + 1`.                    |
| `K`       | `number`   | Number of outcome buckets (from `market.config.K`). Vector length must be `K + 1`. |

**Throws:**

`validateBeliefVector` performs four checks in order and throws on the first failure:

| Check                | Error message                                                        | When it fires                                      |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Length mismatch      | `"Belief vector length X does not match expected K+1 = Y"`          | `vector.length !== K + 1`                          |
| Non-finite values    | `"Belief vector contains non-finite values (NaN or Infinity)"`      | Any element is `NaN` or `Infinity`                 |
| Negative values      | `"Belief vector contains negative values"`                          | Any element is less than 0                         |
| Sum != 1.0           | `"Belief vector does not sum to 1.0 (sum = X)"`                    | Sum of elements deviates from 1.0 by >= 1e-6       |

All four checks run client-side, before any network request. This provides fast feedback and avoids wasting a round-trip on obviously invalid input.

**Example:**

```typescript
import { validateBeliefVector, generateGaussian, queryMarketState } from '@functionspace/core';

const market = await queryMarketState(client, 42);
const { K, L, H } = market.config;
const belief = generateGaussian(75, 5, K, L, H);

// Explicit validation (optional -- buy() and previewPayoutCurve() call this internally)
validateBeliefVector(belief, K);
```
