---
title: "Architecture"
sidebar_position: 2
description: "Layer model (L0-L3), category organization, and package dependency structure of the SDK."
---

# Architecture

The functionSPACE SDK is designed around two orthogonal organisational principles: **Layers** determine abstraction level, while **Categories** determine functional domain. This separation allows developers to work at their preferred level of control while maintaining clear boundaries between different types of operations.

### Layer Model

The SDK uses a layered architecture where higher layers compose lower layers. Developers can enter at any layer depending on their needs. Those wanting full control work at L1, while those preferring convenience work at L2 or L3.

#### When to Use Each Layer

**L1: Full Control** Use L1 when you need precise control over every parameter, are building novel interfaces not anticipated by convenience functions, or want to minimise abstraction overhead. L1 functions are unopinionated, they do exactly what you specify, nothing more.

**L2: Common Patterns** Use L2 for typical development workflows. These functions encode best practices and sensible defaults while remaining overridable. Most applications will primarily use L2 functions.

**L3: User Intent** Use L3 when building end-user interfaces where the developer thinks in terms of user goals rather than protocol mechanics. L3 functions may read live state, make multiple internal calls, and orchestrate complex workflows. They are opinionated by design.


| Layer | Name | Description | Example |
| --- | --- | --- | --- |
| L0 | Pure Math | Protocol-agnostic mathematical operations and validation. No awareness of markets or positions. | `evaluateDensityCurve()`, `computeStatistics()`, `validateBeliefVector()` |
| L1 | Core | Direct protocol interactions with full parameter control. Unopinionated and explicit. | `buy()`, `queryMarketState()`, `generateBelief()` |
| L2 | Convenience | Higher-level wrappers with sensible defaults. Named concepts that map to common use cases. | `generateGaussian()`, `previewPayoutCurve()`, `previewSell()` |
| L3 | Intent | Domain-specific functions driven by user intent. May reference live market state and orchestrate across categories. | Composed workflows, multi-step operations |





### Category Organisation

Categories group functions by what they do, independent of their abstraction layer. A category can contain functions at L1, L2, and L3.


| Category | What It Does | Examples | Notes |
| --- | --- | --- | --- |
| **Transactions** | State-changing operations | `buy()`, `sell()` | Require authentication |
| **Positions** | Pure computation; transforms inputs into protocol-ready formats | `generateGaussian()`, `generateRange()`, `generateBelief()` | No network calls; human interface to compose beliefs |
| **Previews** | Computes hypothetical outcomes without modifying state | `previewPayoutCurve()`, `previewSell()` | Read current state, simulate results |
| **Queries** | Reads and interprets current server state | `queryMarketState()`, `queryMarketPositions()`, `queryConsensusSummary()` | Server reads |
| **Discovery** | Find and filter markets | `discoverMarkets()` | List available markets |
| **Validation** | Input correctness checks before network calls | `validateBeliefVector()` | Read-only, no network |


#### Category Behaviour Patterns

**Transactions** are the only category that modifies server state. They require authentication. All other categories are read-only or pure computation.

**Position** generators are entirely local -- they transform human-readable parameters into valid belief vectors without any network calls. Their output feeds into Transactions and Previews.

**Previews** read current state and compute hypothetical outcomes. They answer "what if" questions: what happens if I buy, what do I receive if I sell, what is my payout at outcome X. They never modify state.

**Queries** read current server state directly. They return facts about markets and positions as they exist now.

**Discovery** functions list available markets from the server, enabling filtering and browsing.

**Validation** functions check input correctness before network calls. `validateBeliefVector()` verifies length, finite values, non-negative values, and sum constraints before sending to the server.



### Package Architecture

```
+-------------------------------------------------------+
|                  @functionspace/ui (L3)                |
|  Charts, Trade Inputs, Market Displays, Auth Widgets  |
|  Composes React hooks internally                      |
+---------------------------+---------------------------+
                            |
                            | depends on
                            v
+-------------------------------------------------------+
|               @functionspace/react (L2)               |
|  useMarket, usePositions, useAuth, useChartZoom, ...  |
|  FunctionSpaceProvider, Theme System                  |
+---------------------------+---------------------------+
                            |
                            | depends on
                            v
+-------------------------------------------------------+
|               @functionspace/core (L1)                |
|  API Client, Auth, Trading, Math, Queries, Discovery  |
|  Pure TypeScript -- zero framework dependencies       |
+-------------------------------------------------------+
```

Data flows upward from the API through these layers:

```
API Response
    |
    v
Core functions (queryMarketState, buy, sell, generators)
    |
    v
React hooks (useMarket, usePositions -- add loading/error/refetch)
    |
    v
UI components (ConsensusChart, TradePanel -- render to DOM)
    |
    v
User interaction
```

### Example Data Flow

The following illustrates how a payout-targeted trade crosses multiple categories and layers.

This is one of many complex scenarios that the SDK abstracts away, developers simply pass the user input and the system will convert it to a viable belief vector ready for submission.

The diagram shows a concrete example of layer interaction when a developer wants to create a position targeting a minimum payout. This workflow crosses multiple categories (Positions, Previews, Transactions) and multiple layers (L1, L2, L3).

**Starting Point: Developer Intent (Layer 3)** The developer specifies a goal: "I want at least $X payout if the outcome falls between L and H." This enters at the Payout Design row, Layer 3. The L3 function does not directly generate shapes or submit transactions -- it orchestrates lower layers to achieve the goal.

**Shape Construction (Layers 2 to 1)** The L3 Payout Design function calls the L2 "Range shape" generate to request an appropriate belief shape covering the target range. The L2 generators in turn calls L1 "Raw Shape generation" to produce the actual Bernstein coefficients. This is the Belief row flowing from L3 to L2 to L1.

**Settlement Preview (Layer 2)** The Preview row shows how the system validates the proposed position. L2 "Settlement values between L-H" computes what payout this shape would produce at various outcomes within the target range. This requires market state, which comes from the Cache.

**Iterative Refinement Loop** The grey arrow labeled "Return Iterative Values (Confirm Validity)" shows the feedback loop. Preview results return to Payout Design for validation. If the computed payout doesn't meet the target, L3 adjusts parameters (typically collateral amount) and repeats the preview. This continues until the goal is met or determined impossible.

**Transaction Submission (Layer 1)** Once a valid configuration is found, the flow descends to Core layer. The arrow labeled "If Values Are Acceptable" leads to "Submit Buy" at L1, which submits the position to the server.

**Cache Integration** The Cache box at top provides market state to the preview calculations without requiring fresh server reads on each iteration. This makes the iterative refinement process performant.

