---
title: "generateEvenTicks"
sidebar_position: 5
---

# generateEvenTicks

**`generateEvenTicks(domain, count)`**

**Layer:** L0. Generates exactly `count` evenly-spaced tick values from `domain[0]` to `domain[1]`. Used for axis tick rendering when the default Recharts ticks don't align well with the zoomed domain. Edge cases: returns `[]` when `count < 1`, returns `[midpoint]` when `count === 1`.

```typescript
function generateEvenTicks(
  domain: [number, number],
  count: number,
): number[]
```
