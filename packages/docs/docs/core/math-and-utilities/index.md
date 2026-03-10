---
title: "Math & Utilities"
sidebar_position: 1
---

# Math & Utilities

Pure math functions with no network dependency. All are L0 (Pure Math) unless noted. These operate on coefficient vectors (belief vectors, consensus vectors, alpha vectors) and return computed results. They have no awareness of markets, clients, or React.

The `coefficients` parameter in these functions accepts any normalized probability vector, meaning you can pass `market.consensus`, a belief vector from `generateBelief`, or `position.belief`. They all share the same shape: a `number[]` of length `K + 1` summing to 1.
