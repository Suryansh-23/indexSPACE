---
title: "Developer Monetization"
sidebar_position: 1
description: "SDK-level fee wrapping that lets developers earn revenue from trades in their apps."
---

# Developer Monetization



**Purpose:** Enable developers to earn revenue from trades executed through their applications without building custom fee infrastructure.

**The Problem:** A developer builds a trading interface on functionSPACE. Users trade through their app. Currently, the developer captures zero value from this activity unless they build custom fee-splitting logic.

**Our Solution:** SDK-level fee wrapping that intercepts transactions and splits collateral between the market and the developer.

**How It Works:**

When a user commits 100 USDC to a position:

* **Without fee wrapper:** 100 USDC → market pool
* **With fee wrapper (2% inclusive):** 98 USDC → market pool, 2 USDC → developer wallet
* **With fee wrapper (2% additive):** 100 USDC → market pool, 2 USDC charged separately → developer wallet

**Configuration Options:**

| Option       | Description                          | Values                        |
| ------------ | ------------------------------------ | ----------------------------- |
| `devAddress` | Wallet address for fee receipt       | Ethereum address              |
| `feePercent` | Percentage of transaction to capture | 0-5% (protocol may cap)       |
| `feeType`    | How fee is calculated                | `'inclusive'` or `'additive'` |
| `feeScope`   | Which actions incur fees             | `'buy'`, `'sell'`, `'all'`    |

**What This Unlocks:**

* Sustainable business model for app developers
* Incentive to build quality interfaces
* Distribution network for functionSPACE
* Analytics on which apps drive volume
