---
title: "filterVisibleData"
sidebar_position: 4
description: "Filter a data array to items whose X value falls within a given domain range."
---

# filterVisibleData

**`filterVisibleData(data, xKey, domain)`**

**Layer:** L0. Filters a data array to items whose `xKey` value falls within the given domain (inclusive). Generic over any object type.

```typescript
function filterVisibleData<T>(
  data: T[],
  xKey: keyof T & string,
  domain: [number, number],
): T[]
```
