---
title: "Fiat OnRamps"
sidebar_position: 2
description: "Integrating fiat onramp providers (MoonPay, Transak, Coinbase Pay) for in-app USDC purchase."
---

# Fiat OnRamps

**Purpose:** Enable users to go from bank account to trading without leaving the app.

**The Problem:** A new user wants to participate. They have dollars in their bank account but no USDC. Steps 1-4 of acquiring crypto happen outside our app—we lose the user.

**Our Solution:** Integration points for fiat onramp providers that keep users in-app.

**Flow:**

```
User wants to buy $50 position but has no USDC
    ↓
App detects insufficient balance
    ↓
App opens onramp widget (MoonPay, Transak, etc.)
    ↓
User completes purchase in widget (KYC, payment)
    ↓
USDC arrives in user's wallet
    ↓
App detects balance change
    ↓
User continues with trade
```

**Available Guides:**

| Provider         | Features                                  | Description                      |
| ---------------- | ----------------------------------------- | -------------------------------- |
| **MoonPay**      | Wide crypto support, many payment methods | Most popular option              |
| **Transak**      | Global coverage, local payment methods    | Best for international users     |
| **Coinbase Pay** | Coinbase account holders                  | Best for existing Coinbase users |

**SDK Helpers:**

```typescript
import { checkBalance, suggestOnrampAmount } from '@functionspace/core';

// Check if user has enough
const balance = await checkBalance(address, collateralToken);
if (balance < requiredAmount) {
  const suggestion = suggestOnrampAmount(requiredAmount, balance);
  // Show onramp with suggested amount
}
```
